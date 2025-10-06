const express = require('express');
const router = express.Router();
const stockVacunasController = require('../controllers/stockVacunas.controller');
const { validarSesion } = require('../middlewares/auth');

// Rutas de stock de vacunas
router.get('/', validarSesion, stockVacunasController.getStockVacunas);
router.get('/alertas', validarSesion, stockVacunasController.getAlertas);
router.get('/vacuna/:id_vacuna', validarSesion, stockVacunasController.getStockByVacuna);
router.get('/:id/movimientos', validarSesion, stockVacunasController.getMovimientosStockVacuna);
router.post('/', validarSesion, stockVacunasController.createStockVacuna);
router.put('/:id', validarSesion, stockVacunasController.updateStockVacuna);

module.exports = router;