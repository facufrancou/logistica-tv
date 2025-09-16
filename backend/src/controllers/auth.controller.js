// controllers/auth.controller.js
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos' });
    }

    // Buscar usuario con Prisma
    const usuario = await prisma.usuario.findFirst({
      where: { email },
      include: { rol: true }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña
    const match = await bcrypt.compare(password, usuario.password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Guardar usuario en sesión (misma estructura que backend original)
    req.session.usuario = {
      id_usuario: Number(usuario.id_usuario),
      nombre: usuario.nombre,
      email: usuario.email,
      rol_id: Number(usuario.rol_id),
    };

    res.json({ 
      mensaje: 'Login exitoso', 
      usuario: req.session.usuario 
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ mensaje: 'Sesión cerrada' });
  });
};

exports.usuarioAutenticado = (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  res.json({ usuario: req.session.usuario });
};
