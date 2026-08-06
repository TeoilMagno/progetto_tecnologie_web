exports.isCurator = (req, res, next) => {
  if (req.user?.role === 'curator' || req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Accesso negato: solo i curatori possono modificare i contenuti.' });
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.redirect('/login');
};

// Middleware per le pagine HTML: se non è curatore, caricamento della pagina 403
exports.isCuratorPage = (req, res, next) => {
  if (req.user?.role === 'curator' || req.user?.role === 'admin') {
    return next(); 
  }

  const path = require('path');
  res.status(403).sendFile(path.join(__dirname, '..', '..', 'html', '403.html'));
};

// Middleware per pagine HTML: se non loggato, manda al login
exports.isLoggedInPage = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); 
  }
  
  res.redirect('/login?msg=login_required'); // teniamo traccia di quando il redirect al login e' forzato
};

exports.isMuseumOwner = async (req, res, next) => {
  if (req.user.role === 'admin') { // gli admin hanno accesso a tutto
    return next();
  }

  const museumId = req.body.museumId ||  req.params.id;

  if (!museumId) {
    return res.status(400).json({ error: "ID museo non specificato per la verifica permessi" });
  }

  const managed = req.user.managed_museums || [];
  const isOwner = managed.some(id => id.toString() === museumId.toString());

  if (isOwner) next();
  
  return res.status(403).json({ error: "Non sei autorizzato a gestire questo museo" });
};