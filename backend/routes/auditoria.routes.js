const express = require('express');
const router = express.Router();
const controller = require('../controllers/auditoria.controller');
const { validarSesion } = require('../middlewares/auth');

// Rutas para auditoría (todas requieren autenticación)
router.get('/', validarSesion, controller.getAuditoriaAcciones);
router.get('/resumen-usuarios', validarSesion, controller.getAuditoriaResumenUsuarios);
router.get('/historial-cambios', validarSesion, controller.getHistorialCambios);
router.get('/:id', validarSesion, controller.getAuditoriaAccion);

module.exports = router;
