const express = require('express');
const router = express.Router();
const controller = require('../controllers/pedidos.controller');
const { validarSesion } = require('../middlewares/auth');

// ✅ Rutas protegidas (solo para usuarios logueados)
router.get('/', validarSesion, controller.getPedidos);
router.patch('/:id/completar', validarSesion, controller.completarPedido);
router.delete('/:id', validarSesion, controller.eliminarPedido);
router.put('/:id', validarSesion, controller.actualizarPedido);
router.get('/:id', validarSesion, controller.getPedidoPorId);
router.get('/:id/repetir', validarSesion, controller.getPedidoParaRepetir);
router.get('/semanal', validarSesion, controller.getPedidosPorSemana);
router.get('/proximos', validarSesion, controller.getPedidosProximos);
router.get('/ultimo/:id_cliente', validarSesion, controller.getUltimoPedidoPorCliente);

// 🔓 Rutas públicas (para token por link o acceso externo)
router.post('/', controller.createPedido); // acepta token por query
router.get('/link/:id_cliente', controller.generarLinkPedido);
router.get('/token/:token', controller.validarTokenPedido);

module.exports = router;
