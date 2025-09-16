const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS DE MOVIMIENTOS DE STOCK =====

// Obtener movimientos de stock con filtros
router.get('/movimientos', validarSesion, stockController.getMovimientosStock);

// Registrar nuevo movimiento de stock
router.post('/movimientos', validarSesion, stockController.registrarMovimiento);

// ===== RUTAS DE ESTADO DE STOCK =====

// Obtener estado actual de stock para todos los productos
router.get('/estado', validarSesion, stockController.getEstadoStock);

// Obtener alertas de stock bajo
router.get('/alertas', validarSesion, stockController.getAlertasStock);

// ===== RUTAS DE RESERVAS DE STOCK =====

// Obtener reservas de stock con filtros
router.get('/reservas', validarSesion, stockController.getReservasStock);

// Crear nueva reserva de stock
router.post('/reservas', validarSesion, stockController.reservarStock);

// Liberar reserva específica
router.put('/reservas/:id/liberar', validarSesion, stockController.liberarReserva);

// ===== RUTAS DE VERIFICACIÓN =====

// Verificar disponibilidad para una cotización
router.post('/verificar-disponibilidad', validarSesion, stockController.verificarDisponibilidadCotizacion);

// Obtener resumen de stock para un producto específico
router.get('/resumen/:idProducto', validarSesion, stockController.getResumenStock);

module.exports = router;
