const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// Middleware de autenticación (si existe)
// const authMiddleware = require('../middlewares/auth');
// router.use(authMiddleware);

/**
 * @route GET /dashboard/metricas-planes
 * @desc Obtener métricas de planes vacunales
 * @access Private
 */
router.get('/metricas-planes', dashboardController.getMetricasPlanes);

/**
 * @route GET /dashboard/metricas-operativas
 * @desc Obtener métricas operativas del sistema
 * @access Private
 */
router.get('/metricas-operativas', dashboardController.getMetricasOperativas);

/**
 * @route GET /dashboard/metricas-rendimiento
 * @desc Obtener métricas de rendimiento del sistema
 * @access Private
 */
router.get('/metricas-rendimiento', dashboardController.getMetricasRendimiento);

/**
 * @route GET /dashboard/resumen-ejecutivo
 * @desc Obtener resumen ejecutivo para la dirección
 * @access Private
 */
router.get('/resumen-ejecutivo', dashboardController.getResumenEjecutivo);

module.exports = router;
