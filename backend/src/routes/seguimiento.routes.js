const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimiento.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS DE APLICACIONES DE DOSIS =====

// Registrar nueva aplicación
router.post('/aplicaciones', validarSesion, seguimientoController.registrarAplicacion);

// Obtener historial de aplicaciones por cotización
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

// Dashboard completo de seguimiento por cotización
router.get('/dashboard/:idCotizacion', validarSesion, seguimientoController.getDashboardSeguimiento);

module.exports = router;
