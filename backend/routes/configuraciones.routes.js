const express = require('express');
const router = express.Router();
const controller = require('../controllers/configuraciones.controller');
const { validarSesion } = require('../middlewares/auth');

// Rutas para configuraciones del sistema
router.get('/', validarSesion, controller.getConfiguraciones);
router.get('/:clave', validarSesion, controller.getConfiguracion);
router.put('/:clave', validarSesion, controller.updateConfiguracion);
router.delete('/:clave', validarSesion, controller.deleteConfiguracion);

module.exports = router;
