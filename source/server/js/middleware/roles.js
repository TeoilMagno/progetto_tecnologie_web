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