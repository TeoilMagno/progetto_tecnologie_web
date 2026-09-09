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
router.get('/login/federated/google', (req, res, next) => {
  console.log('\n--- 1. INIZIO LOGIN GOOGLE ---');
  console.log('Query returnTo frontend:', req.query.returnTo);
  
  saveReturnTo(req);
  req.session.isInitialized = true;
  
  req.session.save((err) => {
    if (err) {
      console.error('--- ERRORE SALVATAGGIO SESSIONE:', err);
      return next(err);
    }
    console.log('--- 2. SESSIONE SALVATA. ID:', req.sessionID);
    console.log('--- 3. CHIAMO PASSPORT AUTHENTICATE ---');
    passport.authenticate('google')(req, res, next);
  });
});

router.get('/oauth2/redirect/google', (req, res, next) => {
  console.log('\n--- 4. HIT CALLBACK GOOGLE ---');
  const redirectTo = req.session.returnTo || '/';
  console.log('Session ID al ritorno:', req.sessionID);
  console.log('RedirectTo estratto:', redirectTo);

  passport.authenticate('google', (err, user, info) => {
    console.log('--- 5. DENTRO PASSPORT CALLBACK ---');
    if (err) console.error('Errore Passport:', err);
    if (!user) console.log('Utente non trovato, info:', info);
    else console.log('Utente autenticato con successo:', user.username || user._id);

    if (err) return next(err);
    if (!user) {
       console.log('--- 6. FAIL: REDIRECT FORZATO A /LOGIN ---');
       return res.redirect('/login');
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('Errore logIn:', err);
        return next(err);
      }
      delete req.session.returnTo;
      console.log('--- 7. SUCCESS: REDIRECT A:', redirectTo);
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// ─── GitHub ───────────────────────────────────────────────────────────────
// Standard passport per il login con GitHub
router.get('/login/federated/github', (req, res, next) => {
  saveReturnTo(req);
  req.session.isInitialized = true;
  
  req.session.save((err) => {
    if (err) return next(err);
    passport.authenticate('github')(req, res, next);
  });
});

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

    let redirectTo = req.body?.next;

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