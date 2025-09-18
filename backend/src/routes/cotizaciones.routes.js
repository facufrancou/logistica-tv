const express = require('express');
const router = express.Router();
const cotizacionesController = require('../controllers/cotizaciones.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA COTIZACIONES =====

// Obtener todas las cotizaciones
router.get('/', validarSesion, cotizacionesController.getCotizaciones);

// Obtener una cotización por ID
router.get('/:id', validarSesion, cotizacionesController.getCotizacionById);

// Crear una nueva cotización
router.post('/', validarSesion, cotizacionesController.createCotizacion);

// Actualizar una cotización existente
router.put('/:id', validarSesion, cotizacionesController.updateCotizacion);

// Actualizar estado de cotización
router.put('/:id/estado', validarSesion, cotizacionesController.updateEstadoCotizacion);

// Eliminar cotización (soft delete)
router.delete('/:id', validarSesion, cotizacionesController.eliminarCotizacion);

// Reactivar cotización eliminada
router.put('/:id/reactivar', validarSesion, cotizacionesController.reactivarCotizacion);

// ===== RUTAS PARA CALENDARIO DE VACUNACIÓN =====

// Obtener calendario de vacunación de una cotización
router.get('/:id/calendario', validarSesion, cotizacionesController.getCalendarioVacunacion);

// Actualizar estado de una dosis específica
router.put('/calendario/:id_calendario/estado', validarSesion, cotizacionesController.actualizarEstadoDosis);

// Regenerar calendario de vacunación
router.post('/:id/regenerar-calendario', validarSesion, cotizacionesController.regenerarCalendario);

module.exports = router;
