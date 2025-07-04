const express = require('express');
const router = express.Router();
const controller = require('../controllers/pedidos.controller');

router.get('/', controller.getPedidos);
router.post('/', controller.createPedido);
router.patch('/:id/completar', controller.completarPedido);
router.delete('/:id', controller.eliminarPedido);
router.get('/link/:id_cliente', controller.generarLinkPedido);
router.get('/token/:token', controller.validarTokenPedido);
router.put('/:id', controller.actualizarPedido);
router.get('/:id',controller.getPedidoPorId);
router.get('/:id/repetir', controller.getPedidoParaRepetir);
router.get('/ultimo/:id_cliente', controller.getUltimoPedidoPorCliente);







module.exports = router;
