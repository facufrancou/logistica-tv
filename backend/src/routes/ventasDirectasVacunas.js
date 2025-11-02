const express = require('express');
const router = express.Router();
const ventasDirectasVacunas = require('../controllers/ventasDirectasVacunas.controller');
const { validarSesion } = require('../middlewares/auth');

/**
 * @route GET /ventas-directas/stocks-disponibles
 * @description Obtiene los stocks de vacunas disponibles para venta directa
 * @access Private
 */
router.get('/stocks-disponibles', validarSesion, ventasDirectasVacunas.getStocksDisponibles);

/**
 * @route GET /ventas-directas/listas-precios
 * @description Obtiene las listas de precios disponibles
 * @access Private
 */
router.get('/listas-precios', validarSesion, ventasDirectasVacunas.getListasPrecios);

/**
 * @route POST /ventas-directas
 * @description Crea una nueva venta directa de vacunas
 * @access Private
 */
router.post('/', validarSesion, ventasDirectasVacunas.crearVentaDirecta);

/**
 * @route GET /ventas-directas
 * @description Obtiene listado de ventas directas con filtros
 * @access Private
 */
router.get('/', validarSesion, ventasDirectasVacunas.getVentasDirectas);

/**
 * @route GET /ventas-directas/:ventaId
 * @description Obtiene una venta directa específica por ID
 * @access Private
 */
router.get('/:ventaId', validarSesion, ventasDirectasVacunas.getVentaDirectaPorId);

/**
 * @route PUT /ventas-directas/:ventaId/estado
 * @description Actualiza el estado de una venta directa
 * @access Private
 */
router.put('/:ventaId/estado', validarSesion, ventasDirectasVacunas.actualizarEstadoVenta);

/**
 * @route POST /ventas-directas/:ventaId/remito-pdf
 * @description Genera y descarga el remito PDF de una venta directa
 * @access Private
 */
router.post('/:ventaId/remito-pdf', validarSesion, ventasDirectasVacunas.generarRemitoPdf);

/**
 * @route PUT /ventas-directas/:ventaId/confirmar
 * @description Confirma una venta directa (cambia estado a ENTREGADA)
 * @access Private
 */
router.put('/:ventaId/confirmar', validarSesion, ventasDirectasVacunas.confirmarVentaDirecta);

module.exports = router;