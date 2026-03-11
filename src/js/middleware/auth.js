exports.isCurator = (req, res, next) => {
  // Supponendo di usare express-session o un JWT
  if (req.session && req.session.user && req.session.user.role === 'curator') {
    return next();
  }
  return res.status(403).json({ error: "Accesso negato: solo i curatori possono modificare i contenuti." });
};