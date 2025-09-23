const express = require('express');
const router = express.Router();
const indicadoresStockController = require('../controllers/indicadoresStock.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA INDICADORES DE STOCK =====

/**
 * POST /indicadores-stock/plan/:id_plan/calcular
 * Calcular indicadores de stock para un plan específico
 */
router.post('/plan/:id_plan/calcular', validarSesion, indicadoresStockController.calcularIndicadoresPlan);

/**
 * GET /indicadores-stock/plan/:id_plan
 * Obtener indicadores de stock existentes para un plan
 */
router.get('/plan/:id_plan', validarSesion, indicadoresStockController.obtenerIndicadoresPlan);

/**
 * GET /indicadores-stock/alertas
 * Obtener alertas de stock crítico/bajo
 * Query params: tipo_alerta (critico, bajo, insuficiente)
 */
router.get('/alertas', validarSesion, indicadoresStockController.obtenerAlertasStock);

/**
 * GET /indicadores-stock/proyeccion
 * Proyectar necesidades de stock para múltiples cotizaciones
 * Query params: fecha_desde, fecha_hasta, incluir_cotizaciones_activas
 */
router.get('/proyeccion', validarSesion, indicadoresStockController.proyectarNecesidadesStock);

/**
 * GET /indicadores-stock/dashboard
 * Dashboard de indicadores generales
 */
router.get('/dashboard', validarSesion, indicadoresStockController.obtenerDashboardStock);

/**
 * GET /indicadores-stock/planes
 * Obtener indicadores de stock para múltiples planes
 * Query params: id_plan, estado_stock, fecha_desde, fecha_hasta
 */
router.get('/planes', validarSesion, indicadoresStockController.obtenerIndicadoresPlanes);

/**
 * GET /indicadores-stock/resumen
 * Obtener resumen general de indicadores de stock
 */
router.get('/resumen', validarSesion, indicadoresStockController.obtenerResumenGeneral);

module.exports = router;