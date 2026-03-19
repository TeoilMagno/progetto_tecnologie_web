const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oidc");
const FacebookStrategy = require("passport-facebook");
const crypto = require("crypto");
const { User, FederatedCredential } = require("../models/user"); // aggiusta il path se necessario

// ─── Serialize / Deserialize ───────────────────────────────────────────────
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
      if (!user) return cb(null, false);

      crypto.pbkdf2(password, user.salt, 310000, 32, "sha256", (err, hash) => {
        if (err) return cb(err);
        if (!crypto.timingSafeEqual(hash, user.password))
          return cb(null, false);
        return cb(null, user);
      });
    } catch (err) {
      cb(err);
    }
  })
);

// ─── Google Strategy ───────────────────────────────────────────────────────
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
        if (!cred) {
          const user = await User.create({ name: profile.displayName });
          await FederatedCredential.create({
            user_id: user._id,
            provider: issuer,
            subject: profile.id,
          });
          return cb(null, user);
        }
        const user = await User.findById(cred.user_id);
        if (!user) return cb(null, false);
        return cb(null, user);
      } catch (err) {
        cb(err);
      }
    }
  )
);

// ─── Facebook Strategy ─────────────────────────────────────────────────────
// passport.use(
//   new FacebookStrategy(
//     {
//       clientID: process.env.FACEBOOK_APP_ID,
//       clientSecret: process.env.FACEBOOK_APP_SECRET,
//       callbackURL: "/oauth2/redirect/facebook",
//       profileFields: ["id", "displayName"],
//     },
//     // Facebook: firma diversa da Google — accessToken, refreshToken, profile, cb
//     async (accessToken, refreshToken, profile, cb) => {
//       try {
//         const issuer = "https://www.facebook.com";
//         const cred = await FederatedCredential.findOne({
//           provider: issuer,
//           subject: profile.id,
//         });
//         if (!cred) {
//           const user = await User.create({ name: profile.displayName });
//           await FederatedCredential.create({
//             user_id: user._id,
//             provider: issuer,
//             subject: profile.id,
//           });
//           return cb(null, user);
//         }
//         const user = await User.findById(cred.user_id);
//         if (!user) return cb(null, false);
//         return cb(null, user);
//       } catch (err) {
//         cb(err);
//       }
//     }
//   )
// );

module.exports = passport;