const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oidc");
const GitHubStrategy = require('passport-github2').Strategy;
const crypto = require("crypto");
const { User, FederatedCredential } = require("../models/users");
const userController = require('../controllers/users');

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
passport.use(new LocalStrategy(async (username, password, cb) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return cb(null, false, { message: "username_not_found" });

    const isValid = await userController.verifyPassword(user, password);
    if (!isValid) return cb(null, false, { message: "incorrect_password" });
    return cb(null, user);
  } catch (err) {
    cb(err);
  }
}));

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
        const user = await userController.findOrCreateFederatedUser(
          issuer, profile.id, { name: profile.displayName }
        );
        if (!user) return cb(null, false);
        return cb(null, user);
      } catch (err) { cb(err); }
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
      const userName = profile.displayName || profile.username;
      const user = await userController.findOrCreateFederatedUser(
        "https://github.com", profile.id, { username: userName, role: 'visitor', curator_status: 'none' }
      );
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) { done(err); }
  }
));

module.exports = passport;
