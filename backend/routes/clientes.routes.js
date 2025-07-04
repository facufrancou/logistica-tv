const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');

router.get('/', controller.getClientes);
router.post('/', controller.createCliente);  
router.put('/:id', controller.updateCliente);

// NUEVOS ENDPOINTS: productos habilitados por cliente
router.get('/:id/productos-habilitados', controller.getProductosHabilitados);
router.put('/:id/productos-habilitados', controller.setProductosHabilitados);

module.exports = router;
