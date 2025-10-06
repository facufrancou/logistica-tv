const express = require('express');
const router = express.Router();
const vacunasController = require('../controllers/vacunas.controller');
const { validarSesion } = require('../middlewares/auth');

// Rutas de vacunas
router.get('/', validarSesion, vacunasController.getVacunas);
router.get('/disponibles', validarSesion, vacunasController.getVacunasDisponibles);
router.get('/:id', validarSesion, vacunasController.getVacunaById);
router.post('/', validarSesion, vacunasController.createVacuna);
router.put('/:id', validarSesion, vacunasController.updateVacuna);
router.delete('/:id', validarSesion, vacunasController.deleteVacuna);

module.exports = router;