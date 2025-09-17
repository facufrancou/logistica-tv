const express = require('express');
const router = express.Router();
const liquidacionesController = require('../controllers/liquidaciones.controller');
const { validarSesion } = require('../middlewares/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(validarSesion);

// ===== RUTAS PARA CLASIFICACIÓN FISCAL =====

/**
 * GET /api/liquidaciones/cotizacion/:id_cotizacion/items
 * Obtener items de cotización pendientes de clasificación fiscal
 */
router.get('/cotizacion/:id_cotizacion/items', 
  liquidacionesController.getItemsPendientesClasificacion
);

/**
 * PUT /api/liquidaciones/item/:id_detalle_cotizacion/clasificar
 * Clasificar un item como Vía 1 (blanco) o Vía 2 (negro)
 */
router.put('/item/:id_detalle_cotizacion/clasificar', 
  liquidacionesController.clasificarItem
);

/**
 * PUT /api/liquidaciones/items/clasificar-multiples
 * Clasificar múltiples items de una vez
 */
router.put('/items/clasificar-multiples', 
  liquidacionesController.clasificarMultiplesItems
);

// ===== RUTAS PARA RESÚMENES DE LIQUIDACIÓN =====

/**
 * POST /api/liquidaciones/cotizacion/:id_cotizacion/resumen
 * Generar resumen de liquidación para una cotización
 */
router.post('/cotizacion/:id_cotizacion/resumen', 
  liquidacionesController.generarResumenLiquidacion
);

/**
 * GET /api/liquidaciones/cotizacion/:id_cotizacion/resumen
 * Obtener resumen de liquidación de una cotización
 */
router.get('/cotizacion/:id_cotizacion/resumen', 
  liquidacionesController.getResumenLiquidacion
);

/**
 * GET /api/liquidaciones/resumenes
 * Listar todos los resúmenes de liquidación con filtros
 * Query params: page, limit, fecha_desde, fecha_hasta, id_cliente
 */
router.get('/resumenes', 
  liquidacionesController.getResumenesLiquidacion
);

/**
 * GET /api/liquidaciones/estadisticas
 * Obtener estadísticas generales de liquidaciones
 * Query params: fecha_desde, fecha_hasta
 */
router.get('/estadisticas', 
  liquidacionesController.getEstadisticasLiquidaciones
);

module.exports = router;