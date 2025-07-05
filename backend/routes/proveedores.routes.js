const express = require('express');
const router = express.Router();
const controller = require('../controllers/proveedores.controller');

router.get('/', controller.getProveedores);
router.post('/', controller.createProveedor);
router.put('/:id', controller.updateProveedor);
router.delete('/:id', controller.eliminarProveedor);

// Útil para reportes o filtrado
router.get('/:id/productos', controller.getProductosPorProveedor);

module.exports = router;
