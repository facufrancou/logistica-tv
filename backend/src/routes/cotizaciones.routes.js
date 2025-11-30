const express = require('express');
const router = express.Router();
const cotizacionesController = require('../controllers/cotizaciones.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA COTIZACIONES =====

// IMPORTANTE: Rutas específicas ANTES de rutas con parámetros dinámicos
// Obtener stocks disponibles para una vacuna específica (DEBE IR ANTES DE /:id)
router.get('/stocks-disponibles', validarSesion, cotizacionesController.getStocksDisponibles);

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

// ===== RUTAS PARA REASIGNACIÓN DE LOTES =====

// Asignar lote manualmente a un elemento del calendario
router.put('/calendario/:id_calendario/asignar-lote', validarSesion, cotizacionesController.asignarLoteManual);

// Reasignar lote automáticamente cuando el original no está disponible
router.post('/calendario/:id_calendario/reasignar-lote', validarSesion, cotizacionesController.reasignarLoteAutomatico);

// Asignar múltiples lotes para una aplicación
router.post('/calendario/:id_calendario/asignar-multilote', validarSesion, cotizacionesController.asignarMultiplesLotes);

// Asignar múltiples lotes manualmente seleccionados por el usuario
router.post('/calendario/:id_calendario/asignar-multilote-manual', validarSesion, cotizacionesController.asignarMultiplesLotesManual);

// Obtener todos los lotes asignados a un calendario (incluyendo multi-lotes)
router.get('/calendario/:id_calendario/lotes-asignados', validarSesion, cotizacionesController.getLotesAsignadosCalendario);

// Reasignar todos los lotes de una cotización
router.post('/:id/reasignar-todos-lotes', validarSesion, cotizacionesController.reasignarTodosLotesCotizacion);

// Verificar estado de todos los lotes asignados en una cotización
router.get('/:id/verificar-lotes', validarSesion, cotizacionesController.verificarEstadoLotes);

// ===== RUTAS PARA LIBERACIÓN DE LOTES =====

// Obtener resumen de lotes asignados en una cotización
router.get('/:id/resumen-lotes', validarSesion, cotizacionesController.getResumenLotes);

// Liberar todos los lotes de una cotización
router.post('/:id/liberar-todos-lotes', validarSesion, cotizacionesController.liberarTodosLotes);

// Liberar lote de una aplicación individual
router.post('/calendario/:id_calendario/liberar-lote', validarSesion, cotizacionesController.liberarLoteIndividual);

// Finalizar plan vacunal (limpiar stock)
router.post('/:id/finalizar-plan', validarSesion, cotizacionesController.finalizarPlan);

// Obtener estado general del plan
router.get('/:id/estado-plan', validarSesion, cotizacionesController.getEstadoPlan);

// ===== NUEVAS FUNCIONALIDADES SPRINT 7 =====

// Actualizar cantidad de animales
router.put('/:id/cantidad-animales', validarSesion, cotizacionesController.actualizarCantidadAnimales);

// Editar fecha programada en calendario
router.put('/:id_cotizacion/calendario/:id_calendario/fecha', validarSesion, cotizacionesController.editarFechaCalendario);

// Editar día del plan en calendario (recalcula fecha automáticamente)
router.put('/:id_cotizacion/calendario/:id_calendario/dia-plan', validarSesion, cotizacionesController.editarDiaPlan);

// Desdoblar una dosis del calendario
router.post('/:id_cotizacion/calendario/:id_calendario/desdoblar', validarSesion, cotizacionesController.desdoblarDosis);

// Obtener desdoblamientos de una dosis
router.get('/calendario/:id_calendario/desdoblamientos', validarSesion, cotizacionesController.obtenerDesdoblamientos);

// Eliminar un desdoblamiento
router.delete('/calendario/:id_calendario/desdoblamiento', validarSesion, cotizacionesController.eliminarDesdoblamiento);

// Generar remito PDF de entrega
router.get('/calendario/:id_calendario/remito', validarSesion, cotizacionesController.generarRemitoPDF);
router.post('/calendario/:id_calendario/remito', validarSesion, cotizacionesController.generarRemitoPDF);

// Generar orden de compra para vacunas sin lote
router.get('/:id/orden-compra', validarSesion, cotizacionesController.generarOrdenCompra);

module.exports = router;
