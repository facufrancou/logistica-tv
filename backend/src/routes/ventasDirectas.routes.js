const express = require('express');
const router = express.Router();
const ventasDirectasController = require('../controllers/ventasDirectas.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA VENTAS DIRECTAS =====

/**
 * POST /ventas-directas
 * Crear una nueva venta directa
 */
router.post('/', validarSesion, ventasDirectasController.crearVentaDirecta);

/**
 * GET /ventas-directas
 * Obtener todas las ventas directas con filtros y paginación
 * Query params: page, limit, estado_venta, id_cliente, fecha_desde, fecha_hasta
 */
router.get('/', validarSesion, ventasDirectasController.obtenerVentasDirectas);

/**
 * GET /ventas-directas/:id
 * Obtener una venta directa específica por ID
 */
router.get('/:id', validarSesion, ventasDirectasController.obtenerVentaDirectaPorId);

/**
 * PUT /ventas-directas/:id/estado
 * Actualizar estado de una venta directa
 */
router.put('/:id/estado', validarSesion, ventasDirectasController.actualizarEstadoVenta);

/**
 * POST /ventas-directas/:id/confirmar-entrega
 * Confirmar entrega y descontar stock
 */
router.post('/:id/confirmar-entrega', validarSesion, ventasDirectasController.confirmarEntregaVenta);

/**
 * GET /ventas-directas/cliente/:id_cliente
 * Obtener ventas directas por cliente
 */
router.get('/cliente/:id_cliente', validarSesion, ventasDirectasController.obtenerVentasPorCliente);

/**
 * DELETE /ventas-directas/:id/cancelar
 * Cancelar una venta directa
 */
router.delete('/:id/cancelar', validarSesion, ventasDirectasController.cancelarVenta);

/**
 * GET /ventas-directas/productos/disponibles
 * Obtener productos disponibles para venta directa
 * Query params: search, tipo_producto
 */
router.get('/productos/disponibles', validarSesion, ventasDirectasController.obtenerProductosDisponibles);

/**
 * GET /ventas-directas/estadisticas/resumen
 * Obtener estadísticas generales de ventas directas
 */
router.get('/estadisticas/resumen', validarSesion, ventasDirectasController.obtenerEstadisticasVentas);

module.exports = router;