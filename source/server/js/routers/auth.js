const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const path = require('path');
const { User } = require('../models/users');
const router = express.Router();

// ─── Pagine ───────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'login.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'signup.html'));
});

// ─── Local login ──────────────────────────────────────────────────────────
router.post('/login/password', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// ─── Local signup ─────────────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  try {
    const salt = crypto.randomBytes(16); // simile al nonce
    crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', async (err, hash) => { // crittazione della password
      if (err) return next(err);

      const user = await User.create({
        username: req.body.username,
        password: hash,
        salt: salt
      });

      req.login(user, err => { // gestisce direttamente l'accesso serializzando l'utente nella sessione
        if (err) return next(err);
        res.redirect('/');
      });
    });
  } catch (err) { next(err); }
});

// ─── Google ───────────────────────────────────────────────────────────────
// Standard passport per il login con Google
router.get('/login/federated/google', passport.authenticate('google'));
router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// ─── Facebook ─────────────────────────────────────────────────────────────
// Standard passport per il login con FaceBook
router.get('/login/federated/facebook', passport.authenticate('facebook'));
router.get('/oauth2/redirect/facebook', passport.authenticate('facebook', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// ─── Logout ───────────────────────────────────────────────────────────────
router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);

    const redirectTo = req.body.next || '/'; // controlliamo se e' stata inviata una pagina di destinazione specifica (es. /login)
    if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) { // evita redirect forzati verso siti esterni
      redirectTo = '/';
    }
    res.redirect(redirectTo);
  });
});

module.exports = router;