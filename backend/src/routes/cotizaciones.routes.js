const express = require('express');
const router = express.Router();
const cotizacionesController = require('../controllers/cotizaciones.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA COTIZACIONES =====

// Obtener todas las cotizaciones
router.get('/cotizaciones', validarSesion, cotizacionesController.getCotizaciones);

// Obtener una cotización por ID
router.get('/cotizaciones/:id', validarSesion, cotizacionesController.getCotizacionById);

// Crear una nueva cotización
router.post('/cotizaciones', validarSesion, cotizacionesController.createCotizacion);

// Actualizar estado de cotización
router.put('/cotizaciones/:id/estado', validarSesion, cotizacionesController.updateEstadoCotizacion);

// ===== RUTAS PARA CALENDARIO DE VACUNACIÓN =====

// Obtener calendario de vacunación de una cotización
router.get('/cotizaciones/:id/calendario', validarSesion, cotizacionesController.getCalendarioVacunacion);

// Actualizar estado de una dosis específica
router.put('/calendario/:id_calendario/estado', validarSesion, cotizacionesController.actualizarEstadoDosis);

// Regenerar calendario de vacunación
router.post('/cotizaciones/:id/regenerar-calendario', validarSesion, cotizacionesController.regenerarCalendario);

module.exports = router;
