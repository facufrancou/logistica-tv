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

// ===== RUTAS PARA CONTROL DE ENTREGAS =====

// Marcar entrega de dosis
router.post('/calendario/:id_calendario/entregar', validarSesion, cotizacionesController.marcarEntregaDosis);

// Obtener control de entregas de una cotización
router.get('/:id/control-entregas', validarSesion, cotizacionesController.getControlEntregas);

// Ajustar stock de calendario por cambios externos
router.put('/:id/calendario/:calendarioId/ajustar-stock', validarSesion, cotizacionesController.ajustarStockCalendario);

// Finalizar plan vacunal (limpiar stock)
router.post('/:id/finalizar-plan', validarSesion, cotizacionesController.finalizarPlan);

// Obtener estado general del plan
router.get('/:id/estado-plan', validarSesion, cotizacionesController.getEstadoPlan);

// ===== NUEVAS FUNCIONALIDADES SPRINT 7 =====

// Actualizar cantidad de animales
router.put('/:id/cantidad-animales', validarSesion, cotizacionesController.actualizarCantidadAnimales);

// Editar fecha programada en calendario
router.put('/:id_cotizacion/calendario/:id_calendario/fecha', validarSesion, cotizacionesController.editarFechaCalendario);

// Desdoblar una dosis del calendario
router.post('/:id_cotizacion/calendario/:id_calendario/desdoblar', validarSesion, cotizacionesController.desdoblarDosis);

// Obtener desdoblamientos de una dosis
router.get('/calendario/:id_calendario/desdoblamientos', validarSesion, cotizacionesController.obtenerDesdoblamientos);

// Eliminar un desdoblamiento
router.delete('/calendario/:id_calendario/desdoblamiento', validarSesion, cotizacionesController.eliminarDesdoblamiento);

module.exports = router;
