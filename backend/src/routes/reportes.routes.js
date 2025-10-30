const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');

// Middleware de autenticación (si existe)
// const authMiddleware = require('../middlewares/auth');
// router.use(authMiddleware);

/**
 * @route GET /reportes/tendencias-precios
 * @desc Obtener tendencias de precios por producto y lista
 * @access Private
 */
router.get('/tendencias-precios', reportesController.getTendenciasPrecios);

/**
 * @route GET /reportes/analisis-listas-precios
 * @desc Análisis comparativo entre listas de precios
 * @access Private
 */
router.get('/analisis-listas-precios', reportesController.getAnalisisListasPrecios);

/**
 * @route GET /reportes/productos-rentabilidad
 * @desc Análisis de rentabilidad por producto
 * @access Private
 */
router.get('/productos-rentabilidad', reportesController.getProductosRentabilidad);

module.exports = router;
