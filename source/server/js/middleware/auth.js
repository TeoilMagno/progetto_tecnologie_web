const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oidc");
const GitHubStrategy = require('passport-github2').Strategy;
const crypto = require("crypto");
const { User, FederatedCredential } = require("../models/users");

// ─── Serialize / Deserialize ───────────────────────────────────────────────
/*
  cb := callback, feedback sulla verifica di passport
  cb(err)           -> errore tecnico (es. DB non raggiungibile) → Passport lancia un 500
  cb(null, false)   -> credenziali errate → Passport reindirizza a failureRedirect
  cb(null, user)    -> tutto ok → Passport serializza l'utente e va a successRedirect
*/
passport.serializeUser((user, cb) => cb(null, user._id));

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await User.findById(id);
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

// ─── Local Strategy ────────────────────────────────────────────────────────
passport.use(
  new LocalStrategy(async (username, password, cb) => {
    try {
      const user = await User.findOne({ username });
      if (!user) return cb(null, false, { message: "username_not_found" });

      crypto.pbkdf2(password, user.salt, 310000, 32, "sha256", (err, hash) => {
        if (err) return cb(err);
        if (!crypto.timingSafeEqual(hash, user.password))
          return cb(null, false, { message: "incorrect_password" });
        return cb(null, user);
      });
    } catch (err) {
      cb(err);
    }
  })
);

// ─── Google Strategy ───────────────────────────────────────────────────────
/*
  Le FederatedCredentials sono un ponte tra le credenziali del provider (Google, FaceBook)
  e i profili salvati con profile._id su MongoDB
  FederatedCredential
  ┌─────────────────────────────────────────────────────┐
  │ user_id  → _id dell'utente su MongoDB               │
  │ provider → "https://accounts.google.com"            │
  │ subject  → "1234567890" (l'id univoco di Google)    │
  └─────────────────────────────────────────────────────┘
*/
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/oauth2/redirect/google",
      scope: ["profile"],
    },
    async (issuer, profile, cb) => {
      try {
        const cred = await FederatedCredential.findOne({
          provider: issuer,
          subject: profile.id,
        });
        if (!cred) { // e' un utente nuovo, lo creo
          const user = await User.create({ name: profile.displayName });
          await FederatedCredential.create({
            user_id: user._id,
            provider: issuer,
            subject: profile.id,
          });
          return cb(null, user);
        } // utente gia' registrato
        const user = await User.findById(cred.user_id);
        if (!user) return cb(null, false);
        return cb(null, user);
      } catch (err) {
        cb(err);
      }
    }
  )
);

// ─── GitHub Strategy ─────────────────────────────────────────────────────
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/oauth2/redirect/github"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      const providerName = "https://github.com"; 
      
      // Cerchiamo se esiste già un ponte (credenziale) per questo ID GitHub
      const cred = await FederatedCredential.findOne({
        provider: providerName,
        subject: profile.id,
      });

      if (!cred) { 
        // L'utente è nuovo: su GitHub displayName può essere vuoto, quindi cadiamo in piedi con l'username
        const userName = profile.displayName || profile.username;
        const user = await User.create({ username: userName, role: 'visitor', curator_status: 'none' }); 
        
        await FederatedCredential.create({
          user_id: user._id,
          provider: providerName,
          subject: profile.id,
        });
        return done(null, user);
      } 
      
      // L'utente è già registrato, lo cerchiamo nel nostro DB
      const user = await User.findById(cred.user_id);
      if (!user) return done(null, false);
      
      return done(null, user);
    } catch (err) {
      done(err);
    }
  }
));

module.exports = passport;
