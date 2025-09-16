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

// Calcular precio total de un plan
router.get('/planes/:id/calcular-precio', validarSesion, planesVacunalesController.calcularPrecioPlan);

// ===== RUTAS PARA LISTAS DE PRECIOS =====

// Obtener todas las listas de precios
router.get('/listas-precios', validarSesion, planesVacunalesController.getListasPrecios);

// Crear una nueva lista de precios
router.post('/listas-precios', validarSesion, planesVacunalesController.createListaPrecio);

// Actualizar una lista de precios
router.put('/listas-precios/:id', validarSesion, planesVacunalesController.updateListaPrecio);

// ===== RUTAS PARA PRECIOS POR LISTA =====

// Obtener precios por lista
router.get('/precios-por-lista', validarSesion, planesVacunalesController.getPreciosPorLista);

// Establecer precio por lista para un producto
router.post('/precios-por-lista', validarSesion, planesVacunalesController.setPrecioPorLista);

module.exports = router;
