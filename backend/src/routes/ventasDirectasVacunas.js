const express = require('express');
const router = express.Router();
const ventasDirectasVacunas = require('../controllers/ventasDirectasVacunas.controller');

/**
 * @route GET /api/ventas-directas/stocks-disponibles
 * @description Obtiene los stocks de vacunas disponibles para venta directa
 * @access Private
 */
router.get('/stocks-disponibles', ventasDirectasVacunas.getStocksDisponibles);

/**
 * @route GET /api/ventas-directas/listas-precios
 * @description Obtiene las listas de precios disponibles
 * @access Private
 */
router.get('/listas-precios', ventasDirectasVacunas.getListasPrecios);

/**
 * @route POST /api/ventas-directas
 * @description Crea una nueva venta directa de vacunas
 * @access Private
 */
router.post('/', ventasDirectasVacunas.crearVentaDirecta);

/**
 * @route GET /api/ventas-directas
 * @description Obtiene listado de ventas directas con filtros
 * @access Private
 */
router.get('/', ventasDirectasVacunas.getVentasDirectas);

/**
 * @route GET /api/ventas-directas/:ventaId
 * @description Obtiene una venta directa específica por ID
 * @access Private
 */
router.get('/:ventaId', ventasDirectasVacunas.getVentaDirectaPorId);

/**
 * @route PUT /api/ventas-directas/:ventaId/estado
 * @description Actualiza el estado de una venta directa
 * @access Private
 */
router.put('/:ventaId/estado', ventasDirectasVacunas.actualizarEstadoVenta);

/**
 * @route POST /api/ventas-directas/:ventaId/remito-pdf
 * @description Genera y descarga el remito PDF de una venta directa
 * @access Private
 */
router.post('/:ventaId/remito-pdf', ventasDirectasVacunas.generarRemitoPdf);

/**
 * @route PUT /api/ventas-directas/:ventaId/confirmar
 * @description Confirma una venta directa (cambia estado a ENTREGADA)
 * @access Private
 */
router.put('/:ventaId/confirmar', ventasDirectasVacunas.confirmarVentaDirecta);

module.exports = router;