const express = require('express');
const router = express.Router();
const controller = require('../controllers/productos.controller');
const { validarSesion } = require('../middlewares/auth');

router.get('/', validarSesion, controller.getProductos);
router.post('/', validarSesion, controller.createProducto);
router.put('/:id', validarSesion, controller.updateProducto);

module.exports = router;
