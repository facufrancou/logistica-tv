const express = require('express');
const router = express.Router();
const remitosController = require('../controllers/remitos.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA REMITOS =====

/**
 * POST /remitos/cotizacion/:id_cotizacion
 * Crear remito desde una cotización
 */
router.post('/cotizacion/:id_cotizacion', validarSesion, remitosController.crearRemitoDesdeCotizacion);

/**
 * POST /remitos/calendario/:id_cotizacion
 * Crear remito automáticamente desde el calendario de vacunación
 */
router.post('/calendario/:id_cotizacion', validarSesion, remitosController.crearRemitoDesdeCalendario);

/**
 * POST /remitos/venta-directa/:id_venta_directa
 * Crear remito desde una venta directa
 */
router.post('/venta-directa/:id_venta_directa', validarSesion, remitosController.crearRemitoDesdeVentaDirecta);

/**
 * GET /remitos
 * Obtener todos los remitos con filtros y paginación
 * Query params: page, limit, estado_remito, tipo_remito, id_cliente, fecha_desde, fecha_hasta
 */
router.get('/', validarSesion, remitosController.obtenerRemitos);

/**
 * GET /remitos/:id
 * Obtener un remito específico por ID
 */
router.get('/:id', validarSesion, remitosController.obtenerRemitoPorId);

/**
 * PUT /remitos/:id/estado
 * Actualizar estado de un remito
 */
router.put('/:id/estado', validarSesion, remitosController.actualizarEstadoRemito);

/**
 * GET /remitos/cliente/:id_cliente
 * Obtener remitos por cliente
 */
router.get('/cliente/:id_cliente', validarSesion, remitosController.obtenerRemitosPorCliente);

/**
 * GET /remitos/:id/pdf
 * Generar PDF de un remito
 */
router.get('/:id/pdf', validarSesion, remitosController.generarPDFRemito);

/**
 * GET /remitos/estadisticas/resumen
 * Obtener estadísticas generales de remitos
 */
router.get('/estadisticas/resumen', validarSesion, remitosController.obtenerEstadisticasRemitos);

module.exports = router;