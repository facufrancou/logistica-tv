const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { validarSesion } = require('../middlewares/auth');

router.post('/login', controller.login); // Pública
router.post('/logout', validarSesion, controller.logout); // Protegida
router.get('/me', validarSesion, controller.usuarioAutenticado); // Protegida
router.get('/verify', validarSesion, controller.usuarioAutenticado); // Alias para verificar sesión

module.exports = router;
