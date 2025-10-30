const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

function calcularPorcentajeCrecimiento(valorActual, valorAnterior) {
  if (valorAnterior === 0) return 0;
  return ((valorActual - valorAnterior) / valorAnterior) * 100;
}

function obtenerFechaComparacion(periodo = '30d') {
  const ahora = new Date();
  const fechaComparacion = new Date();
  
  switch (periodo) {
    case '7d':
      fechaComparacion.setDate(ahora.getDate() - 7);
      break;
    case '30d':
      fechaComparacion.setDate(ahora.getDate() - 30);
      break;
    case '90d':
      fechaComparacion.setDate(ahora.getDate() - 90);
      break;
    case '1y':
      fechaComparacion.setFullYear(ahora.getFullYear() - 1);
      break;
    default:
      fechaComparacion.setDate(ahora.getDate() - 30);
  }
  
  return fechaComparacion;
}

// ===== CONTROLADORES =====

// GET /dashboard/metricas-planes
const getMetricasPlanes = async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const fechaComparacion = obtenerFechaComparacion(periodo);

    // Métricas de planes vacunales
    const [
      totalPlanes,
      planesActivos,
      planesBorrador,
      planesRecientes
    ] = await Promise.all([
      prisma.planVacunal.count(),
      prisma.planVacunal.count({ where: { estado: 'activo' } }),
      prisma.planVacunal.count({ where: { estado: 'borrador' } }),
      prisma.planVacunal.count({
        where: {
          created_at: { gte: fechaComparacion }
        }
      })
    ]);

    // Métricas de cotizaciones
    const [
      totalCotizaciones,
      cotizacionesEnProceso,
      cotizacionesAceptadas,
      cotizacionesRecientes
    ] = await Promise.all([
      prisma.cotizacion.count(),
      prisma.cotizacion.count({ where: { estado: 'en_proceso' } }),
      prisma.cotizacion.count({ where: { estado: 'aceptada' } }),
      prisma.cotizacion.count({
        where: {
          created_at: { gte: fechaComparacion }
        }
      })
    ]);

    // Métricas financieras
    const [
      totalFacturado,
      totalCobrado,
      facturasRecientes
    ] = await Promise.all([
      prisma.factura.aggregate({
        _sum: { monto_total: true }
      }),
      prisma.factura.aggregate({
        _sum: { monto_pagado: true },
        where: { estado_factura: 'pagada' }
      }),
      prisma.factura.count({
        where: {
          created_at: { gte: fechaComparacion }
        }
      })
    ]);

    // Calcular tasas de conversión
    const tasaConversionCotizaciones = totalCotizaciones > 0 ? 
      (cotizacionesAceptadas / totalCotizaciones) * 100 : 0;

    const tasaCobranza = parseFloat(totalFacturado._sum.monto_total || 0) > 0 ? 
      (parseFloat(totalCobrado._sum.monto_pagado || 0) / parseFloat(totalFacturado._sum.monto_total || 0)) * 100 : 0;

    // Top 5 planes más utilizados
    const planesPopulares = await prisma.planVacunal.findMany({
      include: {
        cotizaciones: {
          select: { id_cotizacion: true }
        },
        _count: {
          select: { cotizaciones: true }
        }
      },
      orderBy: {
        cotizaciones: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Actividad reciente por día (últimos 30 días)
    const actividadDiaria = await prisma.cotizacion.groupBy({
      by: ['created_at'],
      where: {
        created_at: { gte: fechaComparacion }
      },
      _count: true,
      orderBy: { created_at: 'asc' }
    });

    const metricasPlanes = {
      resumen: {
        total_planes: totalPlanes,
        planes_activos: planesActivos,
        planes_borrador: planesBorrador,
        planes_recientes: planesRecientes,
        tasa_conversion_cotizaciones: Math.round(tasaConversionCotizaciones * 100) / 100
      },
      cotizaciones: {
        total: totalCotizaciones,
        en_proceso: cotizacionesEnProceso,
        aceptadas: cotizacionesAceptadas,
        recientes: cotizacionesRecientes
      },
      financiero: {
        total_facturado: parseFloat(totalFacturado._sum.monto_total || 0),
        total_cobrado: parseFloat(totalCobrado._sum.monto_pagado || 0),
        facturas_recientes: facturasRecientes,
        tasa_cobranza: Math.round(tasaCobranza * 100) / 100
      },
      planes_populares: planesPopulares.map(plan => ({
        id_plan: plan.id_plan,
        nombre: plan.nombre,
        cotizaciones_generadas: plan._count.cotizaciones,
        duracion_semanas: plan.duracion_semanas,
        precio_total: parseFloat(plan.precio_total || 0)
      })),
      actividad_diaria: actividadDiaria.map(item => ({
        fecha: item.created_at.toISOString().split('T')[0],
        cantidad_cotizaciones: item._count
      }))
    };

    res.json({
      success: true,
      data: metricasPlanes,
      periodo_analizado: periodo
    });

  } catch (error) {
    console.error('Error obteniendo métricas de planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /dashboard/metricas-operativas
const getMetricasOperativas = async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const fechaComparacion = obtenerFechaComparacion(periodo);

    // Métricas de stock
    const [
      productosStockBajo,
      totalMovimientosStock,
      alertasStock
    ] = await Promise.all([
      prisma.producto.count({
        where: {
          AND: [
            { requiere_control_stock: true },
            { stock: { lt: prisma.producto.fields.stock_minimo } }
          ]
        }
      }),
      prisma.movimientoStock.count({
        where: { created_at: { gte: fechaComparacion } }
      }),
      prisma.producto.findMany({
        where: {
          AND: [
            { requiere_control_stock: true },
            { stock: { lt: prisma.producto.fields.stock_minimo } }
          ]
        },
        select: {
          id_producto: true,
          nombre: true,
          stock: true,
          stock_minimo: true
        },
        take: 10
      })
    ]);

    // Métricas de seguimiento de dosis
    const [
      totalDosisAplicadas,
      dosisRecientes,
      retirosRecientes,
      cumplimientoPromedio
    ] = await Promise.all([
      prisma.aplicacionDosis.count(),
      prisma.aplicacionDosis.count({
        where: { created_at: { gte: fechaComparacion } }
      }),
      prisma.retiroCampo.count({
        where: { created_at: { gte: fechaComparacion } }
      }),
      prisma.seguimientoCumplimiento.aggregate({
        _avg: { porcentaje_cumplimiento: true },
        where: { created_at: { gte: fechaComparacion } }
      })
    ]);

    // Clientes más activos
    const clientesActivos = await prisma.cliente.findMany({
      include: {
        cotizaciones: {
          where: { created_at: { gte: fechaComparacion } },
          select: { id_cotizacion: true, precio_total: true }
        },
        _count: {
          select: { cotizaciones: true }
        }
      },
      orderBy: {
        cotizaciones: {
          _count: 'desc'
        }
      },
      take: 10
    });

    // Productos más demandados
    const productosDemandados = await prisma.producto.findMany({
      include: {
        detalle_cotizacion: {
          where: {
            cotizacion: {
              created_at: { gte: fechaComparacion }
            }
          },
          select: { cantidad_total: true }
        }
      },
      orderBy: {
        detalle_cotizacion: {
          _count: 'desc'
        }
      },
      take: 10
    });

    // Eficiencia de aplicación por semana
    const eficienciaAplicacion = await prisma.$queryRaw`
      SELECT 
        WEEK(fecha_aplicacion) as semana,
        COUNT(*) as total_aplicaciones,
        COUNT(CASE WHEN estado_aplicacion = 'exitosa' THEN 1 END) as aplicaciones_exitosas
      FROM aplicaciones_dosis 
      WHERE fecha_aplicacion >= ${fechaComparacion}
      GROUP BY WEEK(fecha_aplicacion)
      ORDER BY semana
    `;

    const metricasOperativas = {
      stock: {
        productos_stock_bajo: productosStockBajo,
        total_movimientos: totalMovimientosStock,
        alertas_activas: alertasStock.map(producto => ({
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          stock_actual: producto.stock,
          stock_minimo: producto.stock_minimo,
          diferencia: (producto.stock_minimo || 0) - (producto.stock || 0)
        }))
      },
      aplicaciones: {
        total_dosis_aplicadas: totalDosisAplicadas,
        dosis_recientes: dosisRecientes,
        retiros_recientes: retirosRecientes,
        cumplimiento_promedio: Math.round((parseFloat(cumplimientoPromedio._avg.porcentaje_cumplimiento || 0)) * 100) / 100
      },
      clientes_activos: clientesActivos.map(cliente => ({
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
        cotizaciones_periodo: cliente._count.cotizaciones,
        valor_total_periodo: cliente.cotizaciones.reduce((sum, cot) => sum + parseFloat(cot.precio_total), 0)
      })),
      productos_demandados: productosDemandados.map(producto => ({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        cantidad_demandada: producto.detalle_cotizacion.reduce((sum, det) => sum + det.cantidad_total, 0),
        frecuencia_uso: producto.detalle_cotizacion.length
      })),
      eficiencia_aplicacion: eficienciaAplicacion.map(item => ({
        semana: item.semana,
        total_aplicaciones: Number(item.total_aplicaciones),
        aplicaciones_exitosas: Number(item.aplicaciones_exitosas),
        tasa_exito: Number(item.total_aplicaciones) > 0 ? 
          (Number(item.aplicaciones_exitosas) / Number(item.total_aplicaciones)) * 100 : 0
      }))
    };

    res.json({
      success: true,
      data: metricasOperativas,
      periodo_analizado: periodo
    });

  } catch (error) {
    console.error('Error obteniendo métricas operativas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /dashboard/metricas-rendimiento
const getMetricasRendimiento = async (req, res) => {
  try {
    // Métricas de rendimiento del sistema
    const [
      tiempoPromedioCotizacion,
      tiempoPromedioFacturacion,
      consultasLentas,
      errorRate
    ] = await Promise.all([
      // Tiempo promedio desde creación hasta aceptación de cotización
      prisma.$queryRaw`
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, fecha_aceptacion)) as tiempo_promedio
        FROM cotizaciones 
        WHERE estado = 'aceptada' AND fecha_aceptacion IS NOT NULL
      `,
      
      // Tiempo promedio desde cotización hasta facturación
      prisma.$queryRaw`
        SELECT AVG(TIMESTAMPDIFF(HOUR, c.fecha_aceptacion, f.created_at)) as tiempo_promedio
        FROM cotizaciones c
        JOIN facturas f ON c.id_cotizacion = f.id_cotizacion
        WHERE c.estado = 'aceptada' AND c.fecha_aceptacion IS NOT NULL
      `,

      // Simulación de consultas lentas (en un sistema real vendrían de logs)
      Promise.resolve([
        { query: 'SELECT * FROM cotizaciones', tiempo_ms: 1250, frecuencia: 45 },
        { query: 'SELECT * FROM productos JOIN precios_por_lista', tiempo_ms: 890, frecuencia: 32 },
        { query: 'SELECT * FROM historial_precios', tiempo_ms: 750, frecuencia: 28 }
      ]),

      // Simulación de rate de errores
      Promise.resolve(2.3) // 2.3% de error rate
    ]);

    // Métricas de uso por endpoint (simuladas - en prod vendrían de logs)
    const metricsEndpoints = [
      { endpoint: '/cotizaciones', requests_dia: 1250, tiempo_promedio_ms: 340, errores: 12 },
      { endpoint: '/productos', requests_dia: 2100, tiempo_promedio_ms: 180, errores: 8 },
      { endpoint: '/facturas', requests_dia: 890, tiempo_promedio_ms: 420, errores: 15 },
      { endpoint: '/planes-vacunales', requests_dia: 650, tiempo_promedio_ms: 220, errores: 3 },
      { endpoint: '/stock', requests_dia: 430, tiempo_promedio_ms: 290, errores: 7 }
    ];

    // Métricas de base de datos
    const dbMetrics = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM productos) as total_productos,
        (SELECT COUNT(*) FROM cotizaciones) as total_cotizaciones,
        (SELECT COUNT(*) FROM facturas) as total_facturas,
        (SELECT COUNT(*) FROM historial_precios) as total_historial_precios
    `;

    // Calcular tamaño estimado de tablas principales
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
      FROM information_schema.TABLES 
      WHERE table_schema = 'sistema_pedidos'
      AND table_name IN ('productos', 'cotizaciones', 'facturas', 'historial_precios', 'aplicaciones_dosis')
      ORDER BY size_mb DESC
    `;

    const metricsRendimiento = {
      tiempos_proceso: {
        cotizacion_promedio_horas: Number(tiempoPromedioCotizacion[0]?.tiempo_promedio || 0),
        facturacion_promedio_horas: Number(tiempoPromedioFacturacion[0]?.tiempo_promedio || 0)
      },
      rendimiento_sistema: {
        error_rate_porcentaje: errorRate,
        consultas_lentas: consultasLentas,
        uptime_porcentaje: 99.8 // Simulado
      },
      metricas_endpoints: metricsEndpoints.map(endpoint => ({
        ...endpoint,
        error_rate: endpoint.requests_dia > 0 ? (endpoint.errores / endpoint.requests_dia) * 100 : 0
      })),
      metricas_database: {
        registros_totales: {
          productos: Number(dbMetrics[0]?.total_productos || 0),
          cotizaciones: Number(dbMetrics[0]?.total_cotizaciones || 0),
          facturas: Number(dbMetrics[0]?.total_facturas || 0),
          historial_precios: Number(dbMetrics[0]?.total_historial_precios || 0)
        },
        tamaño_tablas_mb: tableSizes.map(table => ({
          tabla: table.table_name,
          tamaño_mb: Number(table.size_mb)
        })),
        total_size_mb: tableSizes.reduce((sum, table) => sum + Number(table.size_mb), 0)
      },
      recomendaciones: [
        {
          tipo: 'optimizacion',
          descripcion: 'Considerar índice adicional en tabla cotizaciones para consultas por fecha',
          prioridad: 'media'
        },
        {
          tipo: 'limpieza',
          descripcion: 'Archivar registros de historial_precios mayores a 2 años',
          prioridad: 'baja'
        },
        {
          tipo: 'monitoreo',
          descripcion: 'Implementar alertas para consultas que superen 1000ms',
          prioridad: 'alta'
        }
      ]
    };

    res.json({
      success: true,
      data: metricsRendimiento
    });

  } catch (error) {
    console.error('Error obteniendo métricas de rendimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /dashboard/resumen-ejecutivo
const getResumenEjecutivo = async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const fechaComparacion = obtenerFechaComparacion(periodo);

    // Obtener datos del período actual y anterior para comparación
    const fechaPeriodoAnterior = new Date(fechaComparacion);
    const diferenciaDias = Math.abs(Date.now() - fechaComparacion.getTime()) / (1000 * 60 * 60 * 24);
    fechaPeriodoAnterior.setDate(fechaPeriodoAnterior.getDate() - diferenciaDias);

    const [
      cotizacionesActuales,
      cotizacionesAnteriores,
      facturacionActual,
      facturacionAnterior,
      clientesActivosActuales,
      clientesActivosAnteriores
    ] = await Promise.all([
      prisma.cotizacion.count({
        where: { created_at: { gte: fechaComparacion } }
      }),
      prisma.cotizacion.count({
        where: {
          created_at: {
            gte: fechaPeriodoAnterior,
            lt: fechaComparacion
          }
        }
      }),
      prisma.factura.aggregate({
        _sum: { monto_total: true },
        where: { created_at: { gte: fechaComparacion } }
      }),
      prisma.factura.aggregate({
        _sum: { monto_total: true },
        where: {
          created_at: {
            gte: fechaPeriodoAnterior,
            lt: fechaComparacion
          }
        }
      }),
      prisma.cliente.count({
        where: {
          cotizaciones: {
            some: {
              created_at: { gte: fechaComparacion }
            }
          }
        }
      }),
      prisma.cliente.count({
        where: {
          cotizaciones: {
            some: {
              created_at: {
                gte: fechaPeriodoAnterior,
                lt: fechaComparacion
              }
            }
          }
        }
      })
    ]);

    // Calcular crecimientos
    const crecimientoCotizaciones = calcularPorcentajeCrecimiento(cotizacionesActuales, cotizacionesAnteriores);
    const montoActual = parseFloat(facturacionActual._sum.monto_total || 0);
    const montoAnterior = parseFloat(facturacionAnterior._sum.monto_total || 0);
    const crecimientoFacturacion = calcularPorcentajeCrecimiento(montoActual, montoAnterior);
    const crecimientoClientes = calcularPorcentajeCrecimiento(clientesActivosActuales, clientesActivosAnteriores);

    // Top insights
    const insights = [
      {
        tipo: 'crecimiento',
        titulo: `Cotizaciones ${crecimientoCotizaciones >= 0 ? 'aumentaron' : 'disminuyeron'} ${Math.abs(crecimientoCotizaciones).toFixed(1)}%`,
        descripcion: `Se generaron ${cotizacionesActuales} cotizaciones en los últimos ${periodo}`,
        impacto: crecimientoCotizaciones >= 10 ? 'positivo' : crecimientoCotizaciones <= -10 ? 'negativo' : 'neutral'
      },
      {
        tipo: 'financiero',
        titulo: `Facturación ${crecimientoFacturacion >= 0 ? 'creció' : 'decreció'} ${Math.abs(crecimientoFacturacion).toFixed(1)}%`,
        descripcion: `Total facturado: $${montoActual.toLocaleString()}`,
        impacto: crecimientoFacturacion >= 5 ? 'positivo' : crecimientoFacturacion <= -5 ? 'negativo' : 'neutral'
      },
      {
        tipo: 'clientes',
        titulo: `${clientesActivosActuales} clientes activos`,
        descripcion: `${crecimientoClientes >= 0 ? 'Aumento' : 'Disminución'} del ${Math.abs(crecimientoClientes).toFixed(1)}% vs período anterior`,
        impacto: crecimientoClientes >= 0 ? 'positivo' : 'negativo'
      }
    ];

    const resumenEjecutivo = {
      metricas_clave: {
        cotizaciones: {
          valor_actual: cotizacionesActuales,
          valor_anterior: cotizacionesAnteriores,
          crecimiento_porcentaje: Math.round(crecimientoCotizaciones * 100) / 100
        },
        facturacion: {
          valor_actual: montoActual,
          valor_anterior: montoAnterior,
          crecimiento_porcentaje: Math.round(crecimientoFacturacion * 100) / 100
        },
        clientes_activos: {
          valor_actual: clientesActivosActuales,
          valor_anterior: clientesActivosAnteriores,
          crecimiento_porcentaje: Math.round(crecimientoClientes * 100) / 100
        }
      },
      insights_principales: insights,
      alertas: [
        ...(crecimientoCotizaciones < -20 ? [{
          tipo: 'critica',
          mensaje: 'Caída significativa en cotizaciones generadas',
          accion_recomendada: 'Revisar estrategia comercial y seguimiento de clientes'
        }] : []),
        ...(crecimientoFacturacion < -15 ? [{
          tipo: 'importante',
          mensaje: 'Reducción en facturación',
          accion_recomendada: 'Analizar causas y acelerar proceso de cobranza'
        }] : [])
      ],
      periodo_analizado: periodo
    };

    res.json({
      success: true,
      data: resumenEjecutivo
    });

  } catch (error) {
    console.error('Error generando resumen ejecutivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getMetricasPlanes,
  getMetricasOperativas,
  getMetricasRendimiento,
  getResumenEjecutivo
};
