const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { validarSesion } = require('../middlewares/auth');

/**
 * @route GET /dashboard/metricas-planes
 * @desc Obtener métricas de planes vacunales
 * @access Private
 */
router.get('/metricas-planes', validarSesion, dashboardController.getMetricasPlanes);

/**
 * @route GET /dashboard/metricas-operativas
 * @desc Obtener métricas operativas del sistema
 * @access Private
 */
router.get('/metricas-operativas', validarSesion, dashboardController.getMetricasOperativas);

/**
 * @route GET /dashboard/metricas-rendimiento
 * @desc Obtener métricas de rendimiento del sistema
 * @access Private
 */
router.get('/metricas-rendimiento', validarSesion, dashboardController.getMetricasRendimiento);

/**
 * @route GET /dashboard/resumen-ejecutivo
 * @desc Obtener resumen ejecutivo para la dirección
 * @access Private
 */
router.get('/resumen-ejecutivo', validarSesion, dashboardController.getResumenEjecutivo);

/**
 * @route GET /dashboard/graficos-principales
 * @desc Obtener datos para gráficos del dashboard principal
 * @access Private
 */
router.get('/graficos-principales', validarSesion, dashboardController.getGraficosPrincipales);

module.exports = router;
