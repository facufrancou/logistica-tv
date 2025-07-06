const express = require('express');
const router = express.Router();
const controller = require('../controllers/proveedores.controller');
const { validarSesion } = require('../middlewares/auth');

router.get('/', validarSesion, controller.getProveedores);
router.post('/', validarSesion, controller.createProveedor);
router.put('/:id', validarSesion, controller.updateProveedor);
router.delete('/:id', validarSesion, controller.eliminarProveedor);
router.get('/:id/productos', validarSesion, controller.getProductosPorProveedor);


module.exports = router;
