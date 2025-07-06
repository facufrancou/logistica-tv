// controllers/auth.controller.js
const db = require('../db/connection');
const bcrypt = require('bcrypt');

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

  const query = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const usuario = results[0];
    const match = await bcrypt.compare(password, usuario.password);
    /* console.log({ passwordIngresada: password, hashEnDB: usuario.password, match }); */

    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Guardar usuario en sesión
    req.session.usuario = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      email: usuario.email,
      rol_id: usuario.rol_id,
    };

    res.json({ mensaje: 'Login exitoso', usuario: req.session.usuario });
  });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ mensaje: 'Sesión cerrada' });
  });
};

exports.usuarioAutenticado = (req, res) => {
  if (!req.session.usuario) return res.status(401).json({ error: 'No autenticado' });
  res.json(req.session.usuario);
};
