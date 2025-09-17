const express = require('express');
const router = express.Router();
const controller = require('../controllers/productos.controller');
const { validarSesion } = require('../middlewares/auth');

router.get('/', validarSesion, controller.getProductos);
router.get('/tipos', validarSesion, controller.getTiposProducto);
router.get('/vacunas', validarSesion, controller.getVacunas);
router.post('/', validarSesion, controller.createProducto);
router.put('/:id', validarSesion, controller.updateProducto);

// Sprint 6: Endpoints para gestión de precios y tracking
router.get('/historial-precios', validarSesion, controller.getHistorialPrecios);
router.post('/actualizar-precios-masivo', validarSesion, controller.actualizarPreciosMasivo);
router.get('/estadisticas-cambios', validarSesion, controller.getEstadisticasCambiosPrecios);
router.get('/cambios-anomalos', validarSesion, controller.detectarCambiosAnomalos);

module.exports = router;
