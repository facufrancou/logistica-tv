const express = require('express');
const router = express.Router();
const ordenesCompraController = require('../controllers/ordenesCompra.controller');
const { validarSesion } = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(validarSesion);

// ===== RUTAS DE CONSULTA =====

// Obtener todas las órdenes de compra (con filtros)
router.get('/', ordenesCompraController.getOrdenesCompra);

// Obtener proveedores para filtros
router.get('/proveedores', ordenesCompraController.getProveedoresOrden);

// Obtener cotizaciones disponibles para crear orden
router.get('/cotizaciones-disponibles', ordenesCompraController.getCotizacionesDisponibles);

// Obtener stock global de vacunas (para sugerencias)
router.get('/stock-global', ordenesCompraController.getStockGlobalVacunas);

// Generar sugerencia de orden desde cotización
router.get('/sugerencia-cotizacion/:id_cotizacion', ordenesCompraController.generarSugerenciaDesdesCotizacion);

// Obtener orden por ID
router.get('/:id', ordenesCompraController.getOrdenCompraById);

// Obtener datos para PDF (total o por proveedor)
router.get('/:id/pdf', ordenesCompraController.getOrdenParaPDF);

// Descargar PDF completo de orden de compra (uso interno)
router.get('/:id/pdf/descargar', ordenesCompraController.descargarOrdenCompraPDF);

// Descargar PDF de orden de compra por proveedor (para laboratorio)
router.get('/:id/pdf/proveedor/:id_proveedor', ordenesCompraController.descargarOrdenCompraProveedorPDF);

// ===== RUTAS DE CREACIÓN Y MODIFICACIÓN =====

// Crear nueva orden de compra
router.post('/', ordenesCompraController.createOrdenCompra);

// Actualizar orden de compra
router.put('/:id', ordenesCompraController.updateOrdenCompra);

// Cambiar estado de la orden
router.patch('/:id/estado', ordenesCompraController.cambiarEstadoOrden);

// Registrar ingreso de mercadería
router.post('/:id/ingreso', ordenesCompraController.registrarIngreso);

// Eliminar orden de compra
router.delete('/:id', ordenesCompraController.deleteOrdenCompra);

module.exports = router;
