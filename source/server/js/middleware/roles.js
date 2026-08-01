exports.isCurator = (req, res, next) => {
  if (req.user && req.user.role === 'curator') return next();
  return res.status(403).json({ error: 'Accesso negato: solo i curatori possono modificare i contenuti.' });
};

exports.isMuseum = (req, res, next) => {
  if (req.user && req.user.role === 'museum') return next();
  return res.status(403).json({ error: 'Accesso negato.' });
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.redirect('/login');
};

// Middleware per le pagine HTML: se non è curatore, caricamento della pagina 403
exports.isCuratorPage = (req, res, next) => {
  if (req.user && req.user.role === 'curator') {
    return next(); // Tutto ok, procedi verso la pagina richiesta
  }

  const path = require('path');
  res.status(403).sendFile(path.join(__dirname, '..', '..', 'html', '403.html'));
};

// Middleware per pagine HTML: se non loggato, manda al login
exports.isLoggedInPage = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next(); // L'utente c'è, procedi alla pagina
  }
  
  res.redirect('/login?msg=login_required'); // teniamo traccia di quando il redirect al login e' forzato
};