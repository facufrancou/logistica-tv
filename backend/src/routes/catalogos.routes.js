const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogos.controller');
const { validarSesion } = require('../middlewares/auth');

// Rutas de patologías
router.get('/patologias', validarSesion, catalogosController.getPatologias);
router.post('/patologias', validarSesion, catalogosController.createPatologia);
router.put('/patologias/:id', validarSesion, catalogosController.updatePatologia);
router.delete('/patologias/:id', validarSesion, catalogosController.deletePatologia);

// Rutas de presentaciones
router.get('/presentaciones', validarSesion, catalogosController.getPresentaciones);
router.post('/presentaciones', validarSesion, catalogosController.createPresentacion);
router.put('/presentaciones/:id', validarSesion, catalogosController.updatePresentacion);
router.delete('/presentaciones/:id', validarSesion, catalogosController.deletePresentacion);

// Rutas de vías de aplicación
router.get('/vias-aplicacion', validarSesion, catalogosController.getViasAplicacion);
router.post('/vias-aplicacion', validarSesion, catalogosController.createViaAplicacion);
router.put('/vias-aplicacion/:id', validarSesion, catalogosController.updateViaAplicacion);
router.delete('/vias-aplicacion/:id', validarSesion, catalogosController.deleteViaAplicacion);

module.exports = router;