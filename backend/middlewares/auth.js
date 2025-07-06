exports.validarSesion = (req, res, next) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
};
