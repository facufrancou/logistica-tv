const express = require('express');
const router = express.Router();
const facturacionController = require('../controllers/facturacion.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA FACTURAS =====

// Generar nueva factura desde cotización
router.post('/facturas/generar', validarSesion, facturacionController.generarFactura);

// Obtener detalle completo de una factura
router.get('/facturas/:id/detalle', validarSesion, facturacionController.obtenerDetalleFactura);

// Listar todas las facturas con filtros
router.get('/facturas', validarSesion, facturacionController.listarFacturas);

// Cambiar estado de una factura
router.put('/facturas/:id/estado', validarSesion, facturacionController.cambiarEstadoFactura);

// ===== RUTAS PARA CONFIGURACIÓN DE FACTURACIÓN =====

// Configurar modalidad de facturación para una cotización
router.put('/cotizaciones/:id/configurar-facturacion', validarSesion, facturacionController.configurarFacturacion);

// ===== RUTAS PARA REPORTES FINANCIEROS =====

// Generar reporte financiero
router.get('/facturas/reportes/financiero', validarSesion, facturacionController.generarReporteFinanciero);

module.exports = router;
