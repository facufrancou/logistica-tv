const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimiento.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS DE APLICACIONES DE DOSIS =====

// Obtener aplicaciones próximas (debe ir antes de /:id)
router.get('/aplicaciones/proximas', validarSesion, seguimientoController.getAplicacionesProximas);

// Obtener aplicaciones vencidas (debe ir antes de /:id)
router.get('/aplicaciones/vencidas', validarSesion, seguimientoController.getAplicacionesVencidas);

// Obtener aplicaciones con filtros (para dashboard general)
router.get('/aplicaciones', validarSesion, seguimientoController.getAplicaciones);

// Registrar nueva aplicación
router.post('/aplicaciones', validarSesion, seguimientoController.registrarAplicacion);

// Completar aplicación (debe ir antes de /:id)
router.post('/aplicaciones/:id/completar', validarSesion, seguimientoController.completarAplicacion);

// Recordatorios de aplicaciones (debe ir antes de /:id)
router.post('/aplicaciones/:aplicacionId/recordatorio', validarSesion, seguimientoController.crearRecordatorio);
router.delete('/aplicaciones/:aplicacionId/recordatorio', validarSesion, seguimientoController.eliminarRecordatorio);

// Obtener aplicación específica
router.get('/aplicaciones/:id', validarSesion, seguimientoController.getAplicacion);

// Actualizar aplicación
router.put('/aplicaciones/:id', validarSesion, seguimientoController.actualizarAplicacion);

// Eliminar aplicación
router.delete('/aplicaciones/:id', validarSesion, seguimientoController.eliminarAplicacion);

// Obtener historial de aplicaciones por cotización (debe ir al final para evitar conflictos)
router.get('/aplicaciones/:idCotizacion', validarSesion, seguimientoController.getAplicacionesPorCotizacion);

// ===== RUTAS DE RETIROS DE CAMPO =====

// Registrar nuevo retiro
router.post('/retiros', validarSesion, seguimientoController.registrarRetiro);

// Obtener retiros por cotización
router.get('/retiros/:idCotizacion', validarSesion, seguimientoController.getRetirosPorCotizacion);

// ===== RUTAS DE CUMPLIMIENTO =====

// Obtener reporte de cumplimiento
router.get('/cumplimiento/:idCotizacion', validarSesion, seguimientoController.getReporteCumplimiento);

// Evaluar y actualizar cumplimiento
router.post('/cumplimiento/evaluar', validarSesion, seguimientoController.evaluarCumplimiento);

// ===== RUTAS DE NOTIFICACIONES =====

// Obtener notificaciones pendientes
router.get('/notificaciones', validarSesion, seguimientoController.getNotificacionesPendientes);

// Marcar notificación como leída
router.put('/notificaciones/:id/marcar-leida', validarSesion, seguimientoController.marcarNotificacionLeida);

// Generar notificaciones automáticas (para tareas programadas)
router.post('/notificaciones/generar', validarSesion, seguimientoController.generarNotificaciones);

// ===== RUTAS DE DASHBOARD =====

// Dashboard general de seguimiento (con filtros opcionales)
router.get('/dashboard', validarSesion, seguimientoController.getDashboard);

// Dashboard completo de seguimiento por cotización
router.get('/dashboard/:idCotizacion', validarSesion, seguimientoController.getDashboardSeguimiento);

module.exports = router;
