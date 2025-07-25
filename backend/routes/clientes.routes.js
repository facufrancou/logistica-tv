const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');
const { validarSesion, validarApiKey } = require('../middlewares/auth');


router.get('/proximos', validarApiKey, controller.getClientesConPedidosProximos); //  primero

router.get('/', validarSesion, controller.getClientes);
router.get('/:id', validarSesion, controller.getClienteById);
router.post('/', validarSesion, controller.createCliente);

router.get('/:id/productos-habilitados', validarSesion, controller.getProductosHabilitados);
router.put('/:id/productos-habilitados', validarSesion, controller.setProductosHabilitados);
router.put('/:id', validarSesion, controller.updateCliente);
router.patch('/:id/estado', validarSesion, controller.updateClienteEstado); // nueva ruta para actualizar estado habilitado
router.patch('/:id/bloqueo', validarSesion, controller.updateClienteBloqueo); // nueva ruta para actualizar estado bloqueado



module.exports = router;
