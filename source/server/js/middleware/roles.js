exports.isCurator = (req, res, next) => {
  if (req.user?.role === 'curator' || req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Accesso negato: solo i curatori possono modificare i contenuti.' });
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Devi effettuare il login per continuare.' });
};

exports.isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Accesso negato: solo gli admin possono modificare i contenuti.' });
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

// Middleware per le pagine HTML: se non è curatore, caricamento della pagina 403
exports.isAdminPage = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next(); 
  }

  const path = require('path');
  res.status(403).sendFile(path.join(__dirname, '..', '..', 'html', '403.html'));
};

// non c'e' il controllo sullo user perche' va abbinato a iscurator
exports.isMuseumOwner = async (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

  const museumId = req.body.museumId || req.params.id;

  if (!museumId) {
    return res.status(400).json({ error: "ID museo non specificato per la verifica permessi" });
  }

  try {
    // Ignoriamo la sessione e andiamo a prendere i dati VINTAGE DIRETTAMENTE DAL DB
    const { User } = require('../models/users'); 
    const freshUser = await User.findById(req.user._id);

    const managed = freshUser.managed_museums || [];
    const isOwner = managed.some(id => id.toString() === museumId.toString());

    if (isOwner) {
      return next();
    }
  
    return res.status(403).json({ error: "Non sei autorizzato a gestire questo museo" });
  } catch (error) {
    console.error("Errore verifica permessi proprietario: ", error);
    return res.status(500).json({ error: "Errore interno durante la verifica permessi" });
  }
};