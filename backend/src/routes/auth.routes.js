const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { validarSesion } = require('../middlewares/auth');

router.post('/login', controller.login); // Pública
router.post('/logout', validarSesion, controller.logout); // Protegida
router.get('/me', validarSesion, controller.usuarioAutenticado); // Protegida

module.exports = router;
