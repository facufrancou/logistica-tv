const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');
const { validarSesion, validarApiKey } = require('../middlewares/auth');


router.get('/proximos', validarApiKey, controller.getClientesConPedidosProximos); //  primero

router.get('/', validarSesion, controller.getClientes);
router.post('/', validarSesion, controller.createCliente);

router.get('/:id/productos-habilitados', validarSesion, controller.getProductosHabilitados);
router.put('/:id/productos-habilitados', validarSesion, controller.setProductosHabilitados);
router.put('/:id', validarSesion, controller.updateCliente); // último



module.exports = router;
