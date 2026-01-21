const express = require('express');
const router = express.Router();
const documentosController = require('../controllers/documentos.controller');
const { validarSesion } = require('../middlewares/auth');

// Aplicar autenticación a todas las rutas
router.use(validarSesion);

// ===== RUTAS DE CONSULTA =====

// Obtener todos los documentos impresos (con filtros y paginación)
router.get('/', documentosController.getDocumentos);

// Obtener estadísticas de documentos
router.get('/estadisticas', documentosController.getEstadisticas);

// Obtener estado de secuencias de numeración
router.get('/secuencias', documentosController.getSecuencias);

// Buscar documento por número
router.get('/buscar', documentosController.buscarPorNumero);

// Obtener documento por ID (incluye historial)
router.get('/:id', documentosController.getDocumentoById);

// Obtener historial de impresiones de un documento
router.get('/:id/historial', documentosController.getHistorialDocumento);

// Descargar PDF almacenado de un documento
router.get('/:id/pdf', documentosController.descargarPDF);

// Reimprimir documento desde snapshot (regenera el PDF)
router.get('/:id/reimprimir', documentosController.reimprimirDocumento);

// ===== RUTAS DE ACCIÓN =====

// Registrar visualización de documento
router.post('/:id/visualizacion', documentosController.registrarVisualizacion);

// Actualizar configuración de secuencia (solo admin)
router.patch('/secuencias/:tipo_documento', documentosController.actualizarSecuencia);

module.exports = router;
