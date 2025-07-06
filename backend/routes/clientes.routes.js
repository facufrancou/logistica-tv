const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');
const { validarSesion } = require('../middlewares/auth');

router.get('/', validarSesion, controller.getClientes);
router.post('/', validarSesion, controller.createCliente);
router.put('/:id', validarSesion, controller.updateCliente);
router.get('/:id/productos-habilitados', validarSesion, controller.getProductosHabilitados);
router.put('/:id/productos-habilitados', validarSesion, controller.setProductosHabilitados);

router.get('/proximos', validarSesion, controller.getClientesConPedidosProximos);



module.exports = router;
