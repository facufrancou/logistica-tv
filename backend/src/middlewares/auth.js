function validarSesion  (req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    // En desarrollo, crear un usuario mock para que los controladores funcionen
    req.user = {
      id_usuario: 1,
      nombre: 'Usuario Dev',
      email: 'dev@test.com',
      rol_id: 1
    };
    return next();
  }
  
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  // Pasar datos del usuario al request
  req.user = req.session.usuario;
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
