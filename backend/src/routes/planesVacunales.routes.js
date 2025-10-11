const express = require('express');
const router = express.Router();
const planesVacunalesController = require('../controllers/planesVacunales.controller');
const { validarSesion } = require('../middlewares/auth');

// ===== RUTAS PARA PLANES VACUNALES =====

// Obtener todos los planes vacunales
router.get('/planes', validarSesion, planesVacunalesController.getPlanes);

// Obtener un plan vacunal por ID
router.get('/planes/:id', validarSesion, planesVacunalesController.getPlanById);

// Crear un nuevo plan vacunal
router.post('/planes', validarSesion, planesVacunalesController.createPlan);

// Actualizar un plan vacunal
router.put('/planes/:id', validarSesion, planesVacunalesController.updatePlan);

// Eliminar un plan vacunal
router.delete('/planes/:id', validarSesion, planesVacunalesController.deletePlan);

// ===== RUTAS PARA LISTAS DE PRECIOS =====

// Obtener todas las listas de precios
router.get('/listas-precios', validarSesion, planesVacunalesController.getListasPrecios);

// Crear una nueva lista de precios
router.post('/listas-precios', validarSesion, planesVacunalesController.createListaPrecio);

// Actualizar una lista de precios
router.put('/listas-precios/:id', validarSesion, planesVacunalesController.updateListaPrecio);

// ===== RUTAS PARA VACUNAS EN PLANES =====

// Obtener vacunas disponibles para agregar a planes
router.get('/vacunas/disponibles', validarSesion, planesVacunalesController.getVacunasDisponibles);

// Agregar vacuna a un plan
router.post('/planes/:id_plan/vacunas', validarSesion, planesVacunalesController.agregarVacunaAPlan);

// Remover vacuna de un plan
router.delete('/planes/:id_plan/vacunas/:id_plan_vacuna', validarSesion, planesVacunalesController.removerVacunaDePlan);

module.exports = router;
