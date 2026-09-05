const express = require('express');
const passport = require('passport');
const path = require('path');
const router = express.Router();
const userController = require('../controllers/users'); 

// Funzione di supporto per salvare la pagina di provenienza sicura
function saveReturnTo(req) {
  if (req.query.returnTo && req.query.returnTo.startsWith('/')) {
    req.session.returnTo = req.query.returnTo;
  } else if (req.get('Referrer')) {
    try {
      const refererUrl = new URL(req.get('Referrer'));
      if (refererUrl.host === req.get('host') && !refererUrl.pathname.includes('/login') && !refererUrl.pathname.includes('/signup')) {
        req.session.returnTo = refererUrl.pathname + refererUrl.search;
      }
    } catch (e) {} // Ignora referer malformati
  }
}

// ─── Pagine ───────────────────────────────────────────────────────────────
router.get('/login', (req, res, next) => {  
  saveReturnTo(req);
  
  // FORZATURA: Scriviamo comunque un dato nella sessione per obbligare
  // express-session a generare e inviare il cookie connect.sid al browser,
  // anche se il Referer era assente o bloccato.
  req.session.isInitialized = true; 
  
  console.log('4. Session ReturnTo:', req.session.returnTo);
  console.log('5. SessionID (GET):', req.sessionID);
  
  req.session.save((err) => {
    if (err) console.error('Errore salvataggio sessione in GET:', err);
    console.log('6. Sessione salvata fisicamente. Invio HTML...');
    res.sendFile(path.join(__dirname, '..', '..', 'html', 'login.html'));
  });
});

router.get('/signup', (req, res, next) => {
  saveReturnTo(req);
  
  // Forza il salvataggio fisico della sessione prima di inviare la pagina
  req.session.save((err) => {
    if (err) return next(err);
    res.sendFile(path.join(__dirname, '..', '..', 'html', 'signup.html'));
  });
});

// ─── Local login ──────────────────────────────────────────────────────────
router.post('/login/password', (req, res, next) => {
  // SALVATAGGIO PREVENTIVO: Estraiamo il returnTo PRIMA che Passport rigeneri la sessione
  const redirectTo = req.session.returnTo || '/';

  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const errorType = info && info.message ? info.message : 'invalid_credentials';
      return res.redirect(`/login?error=${errorType}`);
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      
      delete req.session.returnTo; 
      // Usiamo la variabile salvata in memoria, immune alla rigenerazione
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// ─── Local signup ─────────────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  const redirectTo = req.session.returnTo || '/';
  try {
    const user = await userController.createLocalUser({
      username: req.body.username,
      password: req.body.password,
      requestedRole: req.body.requested_role
    });
    req.logIn(user, (err) => {
      if (err) return next(err);
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    });
  } catch (dbErr) {
    if (dbErr.code === 11000) return res.redirect('/signup?error=username_taken');
    return next(dbErr);
  }
});

// ─── Google ───────────────────────────────────────────────────────────────
// Standard passport per il login con Google
router.get('/login/federated/google', passport.authenticate('google'));
router.get('/oauth2/redirect/google', (req, res, next) => {
  // SALVATAGGIO PREVENTIVO: Estraiamo il returnTo PRIMA della rigenerazione
  const redirectTo = req.session.returnTo || '/';

  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login');
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// ─── GitHub ───────────────────────────────────────────────────────────────
// Standard passport per il login con GitHub
router.get('/login/federated/github', passport.authenticate('github'));
router.get('/oauth2/redirect/github', (req, res, next) => {
  // SALVATAGGIO PREVENTIVO
  const redirectTo = req.session.returnTo || '/';

  passport.authenticate('github', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login');
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// ─── Logout ───────────────────────────────────────────────────────────────
router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);

    let redirectTo = req.body.next;

    // Estrazione immediata della rotta dal Referrer se il frontend non la specifica
    if (!redirectTo && req.get('Referrer')) {
      try {
        const refererUrl = new URL(req.get('Referrer'));
        if (refererUrl.host === req.get('host')) {
          redirectTo = refererUrl.pathname + refererUrl.search;
        }
      } catch (e) {} // Fallback silenzioso in caso di URL alterati
    }

    // Sicurezza anti Open-Redirect e fallback nativo sulla home
    if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
      redirectTo = '/';
    }

    res.redirect(redirectTo);
  });
});

module.exports = router;