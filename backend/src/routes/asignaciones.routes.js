const express = require('express');
const router = express.Router();
const asignacionesController = require('../controllers/asignaciones.controller');
const { validarSesion: verificarToken } = require('../middlewares/auth');

// =====================================================
// RUTAS DE ASIGNACIONES DE LOTES
// =====================================================

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// Obtener asignaciones de un calendario
router.get('/calendario/:id_calendario', asignacionesController.getAsignacionesByCalendario);

// Obtener asignaciones (reservas) de un lote de stock
router.get('/stock/:id_stock_vacuna', asignacionesController.getAsignacionesByStock);

// Crear nueva asignación
router.post('/', asignacionesController.asignarLote);

// Liberar todos los lotes de un calendario
router.delete('/calendario/:id_calendario', asignacionesController.liberarLotesCalendario);

// Eliminar una asignación específica
router.delete('/:id_asignacion', asignacionesController.eliminarAsignacion);

// Recalcular stock_reservado de todos los lotes
router.post('/recalcular-reservas', asignacionesController.recalcularReservas);

module.exports = router;
