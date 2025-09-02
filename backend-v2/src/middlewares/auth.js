function validarSesion  (req, res, next) {
  if (process.env.NODE_ENV === 'development') return next(); // Desactiva auth en desarrollo
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
};

function validarApiKey(req, res, next) {
  if (process.env.NODE_ENV === 'development') return next(); // Desactiva auth en desarrollo
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Falta token de autorización" });
  }

  const token = header.split(" ")[1];
  if (token !== process.env.N8N_API_KEY) {
    return res.status(403).json({ error: "API Key inválida" });
  }

  next();
}

module.exports = {
  validarSesion,
  validarApiKey
};
