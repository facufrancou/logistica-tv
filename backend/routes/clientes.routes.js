const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');

router.get('/', controller.getClientes);
router.post('/', controller.createCliente);  
router.put('/:id', controller.updateCliente);  
module.exports = router;
