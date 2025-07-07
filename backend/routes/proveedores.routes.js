const express = require('express');
const router = express.Router();
const controller = require('../controllers/proveedores.controller');
const { validarSesion } = require('../middlewares/auth');

router.get('/', validarSesion, controller.getProveedores);
router.post('/', validarSesion, controller.createProveedor);

// rutas personalizadas antes que las de :id
router.get('/:id/productos', validarSesion, controller.getProductosPorProveedor);
router.put('/:id', validarSesion, controller.updateProveedor);
router.delete('/:id', validarSesion, controller.eliminarProveedor);



module.exports = router;
