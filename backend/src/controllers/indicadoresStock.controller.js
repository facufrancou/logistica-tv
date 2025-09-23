const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

async function calcularStockNecesarioPorPlan(idPlan, cantidadAnimales = null) {
  // Obtener el plan con sus productos
  const plan = await prisma.planVacunal.findUnique({
    where: { id_plan: parseInt(idPlan) },
    include: {
      productos_plan: {
        include: {
          producto: {
            select: {
              id_producto: true,
              nombre: true,
              stock: true,
              stock_minimo: true
            }
          }
        }
      }
    }
  });

  if (!plan) {
    throw new Error('Plan vacunal no encontrado');
  }

  const stockNecesario = [];

  for (const planProducto of plan.productos_plan) {
    // Calcular stock necesario basado en cantidad de animales
    let stockTotal = 0;
    
    if (cantidadAnimales) {
      // Si tenemos cantidad de animales, calculamos exacto
      const semanas = (planProducto.semana_fin || planProducto.semana_inicio) - planProducto.semana_inicio + 1;
      stockTotal = cantidadAnimales * planProducto.dosis_por_semana * semanas;
    } else {
      // Si no, usamos la cantidad total del plan
      stockTotal = planProducto.cantidad_total;
    }

    stockNecesario.push({
      id_producto: planProducto.id_producto,
      producto: planProducto.producto,
      stock_necesario: stockTotal,
      dosis_por_animal: planProducto.dosis_por_semana,
      semana_inicio: planProducto.semana_inicio,
      semana_fin: planProducto.semana_fin
    });
  }

  return stockNecesario;
}

async function calcularStockReservado(idProducto) {
  const reservas = await prisma.reservaStock.aggregate({
    where: {
      id_producto: parseInt(idProducto),
      estado_reserva: 'activa'
    },
    _sum: {
      cantidad_reservada: true
    }
  });

  return reservas._sum.cantidad_reservada || 0;
}

function determinarEstadoStock(stockDisponible, stockNecesario, stockMinimo = 0) {
  if (stockDisponible >= stockNecesario && stockDisponible > stockMinimo) {
    return 'suficiente';
  } else if (stockDisponible >= stockNecesario && stockDisponible <= stockMinimo) {
    return 'bajo';
  } else if (stockDisponible < stockNecesario && stockDisponible > 0) {
    return 'insuficiente';
  } else {
    return 'critico';
  }
}

// ===== CONTROLADORES PRINCIPALES =====

/**
 * Calcular indicadores de stock para un plan específico
 */
exports.calcularIndicadoresPlan = async (req, res) => {
  const { id_plan } = req.params;
  const { cantidad_animales } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Calcular stock necesario
      const stockNecesario = await calcularStockNecesarioPorPlan(id_plan, cantidad_animales);
      
      const indicadores = [];

      for (const item of stockNecesario) {
        // Obtener stock actual
        const producto = await tx.producto.findUnique({
          where: { id_producto: item.id_producto },
          select: { stock: true, stock_minimo: true, nombre: true }
        });

        // Calcular stock reservado
        const stockReservado = await calcularStockReservado(item.id_producto);
        
        // Calcular stock disponible
        const stockDisponible = producto.stock - stockReservado;
        
        // Determinar estado
        const estadoStock = determinarEstadoStock(
          stockDisponible, 
          item.stock_necesario, 
          producto.stock_minimo
        );

        // Crear o actualizar indicador
        const indicador = await tx.indicadorStockPlan.upsert({
          where: {
            id_plan_vacunal_id_producto: {
              id_plan_vacunal: parseInt(id_plan),
              id_producto: item.id_producto
            }
          },
          update: {
            stock_necesario: item.stock_necesario,
            stock_reservado: stockReservado,
            stock_disponible: stockDisponible,
            stock_minimo: producto.stock_minimo,
            fecha_calculo: new Date(),
            estado_stock: estadoStock,
            observaciones: cantidad_animales ? 
              `Calculado para ${cantidad_animales} animales` : 
              'Calculado según plan base'
          },
          create: {
            id_plan_vacunal: parseInt(id_plan),
            id_producto: item.id_producto,
            stock_necesario: item.stock_necesario,
            stock_reservado: stockReservado,
            stock_disponible: stockDisponible,
            stock_minimo: producto.stock_minimo,
            fecha_calculo: new Date(),
            estado_stock: estadoStock,
            observaciones: cantidad_animales ? 
              `Calculado para ${cantidad_animales} animales` : 
              'Calculado según plan base'
          }
        });

        indicadores.push({
          ...indicador,
          producto: {
            nombre: producto.nombre,
            stock_actual: producto.stock
          },
          diferencia_stock: stockDisponible - item.stock_necesario,
          porcentaje_cobertura: item.stock_necesario > 0 ? 
            Math.round((stockDisponible / item.stock_necesario) * 100) : 100
        });
      }

      return indicadores;
    });

    res.json({
      success: true,
      message: 'Indicadores de stock calculados exitosamente',
      data: {
        id_plan: parseInt(id_plan),
        cantidad_animales: cantidad_animales || null,
        fecha_calculo: new Date(),
        indicadores: resultado,
        resumen: {
          total_productos: resultado.length,
          productos_suficientes: resultado.filter(i => i.estado_stock === 'suficiente').length,
          productos_bajos: resultado.filter(i => i.estado_stock === 'bajo').length,
          productos_insuficientes: resultado.filter(i => i.estado_stock === 'insuficiente').length,
          productos_criticos: resultado.filter(i => i.estado_stock === 'critico').length
        }
      }
    });

  } catch (error) {
    console.error('Error al calcular indicadores de stock:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al calcular los indicadores de stock'
    });
  }
};

/**
 * Obtener indicadores de stock existentes para un plan
 */
exports.obtenerIndicadoresPlan = async (req, res) => {
  const { id_plan } = req.params;

  try {
    const indicadores = await prisma.indicadorStockPlan.findMany({
      where: { id_plan_vacunal: parseInt(id_plan) },
      include: {
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            descripcion: true,
            stock: true,
            stock_minimo: true,
            tipo_producto: true
          }
        },
        plan_vacunal: {
          select: {
            nombre: true,
            descripcion: true
          }
        }
      },
      orderBy: {
        estado_stock: 'desc' // Críticos primero
      }
    });

    if (indicadores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron indicadores para este plan. Ejecute el cálculo primero.'
      });
    }

    // Enriquecer datos con cálculos adicionales
    const indicadoresEnriquecidos = indicadores.map(indicador => ({
      ...indicador,
      diferencia_stock: indicador.stock_disponible - indicador.stock_necesario,
      porcentaje_cobertura: indicador.stock_necesario > 0 ? 
        Math.round((indicador.stock_disponible / indicador.stock_necesario) * 100) : 100,
      dias_desde_calculo: Math.floor((new Date() - indicador.fecha_calculo) / (1000 * 60 * 60 * 24)),
      requiere_actualizacion: Math.floor((new Date() - indicador.fecha_calculo) / (1000 * 60 * 60 * 24)) > 7
    }));

    res.json({
      success: true,
      data: {
        plan: indicadores[0].plan_vacunal,
        fecha_ultimo_calculo: indicadores[0].fecha_calculo,
        indicadores: indicadoresEnriquecidos,
        resumen: {
          total_productos: indicadores.length,
          productos_suficientes: indicadores.filter(i => i.estado_stock === 'suficiente').length,
          productos_bajos: indicadores.filter(i => i.estado_stock === 'bajo').length,
          productos_insuficientes: indicadores.filter(i => i.estado_stock === 'insuficiente').length,
          productos_criticos: indicadores.filter(i => i.estado_stock === 'critico').length,
          stock_total_necesario: indicadores.reduce((sum, i) => sum + i.stock_necesario, 0),
          stock_total_disponible: indicadores.reduce((sum, i) => sum + i.stock_disponible, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener indicadores de stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los indicadores de stock'
    });
  }
};

/**
 * Obtener alertas de stock crítico/bajo
 */
exports.obtenerAlertasStock = async (req, res) => {
  const { tipo_alerta } = req.query; // 'critico', 'bajo', 'insuficiente'

  try {
    let where = {};
    
    if (tipo_alerta && ['critico', 'bajo', 'insuficiente', 'suficiente'].includes(tipo_alerta)) {
      where.estado_stock = tipo_alerta;
    } else {
      // Por defecto, solo alertas problemáticas
      where.estado_stock = {
        in: ['critico', 'bajo', 'insuficiente']
      };
    }

    const alertas = await prisma.indicadorStockPlan.findMany({
      where,
      include: {
        producto: {
          select: {
            nombre: true,
            tipo_producto: true,
            stock: true,
            stock_minimo: true
          }
        },
        plan_vacunal: {
          select: {
            nombre: true,
            estado: true
          }
        }
      },
      orderBy: [
        { estado_stock: 'desc' },
        { fecha_calculo: 'desc' }
      ]
    });

    // Agrupar por nivel de prioridad
    const alertasPorPrioridad = {
      criticas: alertas.filter(a => a.estado_stock === 'critico'),
      altas: alertas.filter(a => a.estado_stock === 'insuficiente'),
      medias: alertas.filter(a => a.estado_stock === 'bajo'),
      informativas: alertas.filter(a => a.estado_stock === 'suficiente')
    };

    res.json({
      success: true,
      data: {
        total_alertas: alertas.length,
        por_prioridad: {
          criticas: alertasPorPrioridad.criticas.length,
          altas: alertasPorPrioridad.altas.length,
          medias: alertasPorPrioridad.medias.length,
          informativas: alertasPorPrioridad.informativas.length
        },
        alertas: alertas.map(alerta => ({
          id_indicador: alerta.id_indicador,
          plan: alerta.plan_vacunal.nombre,
          producto: alerta.producto.nombre,
          tipo_producto: alerta.producto.tipo_producto,
          estado_stock: alerta.estado_stock,
          stock_necesario: alerta.stock_necesario,
          stock_disponible: alerta.stock_disponible,
          diferencia: alerta.stock_disponible - alerta.stock_necesario,
          fecha_calculo: alerta.fecha_calculo,
          prioridad: alerta.estado_stock === 'critico' ? 'CRÍTICA' :
                    alerta.estado_stock === 'insuficiente' ? 'ALTA' :
                    alerta.estado_stock === 'bajo' ? 'MEDIA' : 'BAJA',
          mensaje: alerta.estado_stock === 'critico' ? 
            `¡Sin stock disponible para ${alerta.producto.nombre}!` :
            alerta.estado_stock === 'insuficiente' ? 
            `Stock insuficiente para ${alerta.producto.nombre} (faltan ${alerta.stock_necesario - alerta.stock_disponible} unidades)` :
            `Stock bajo para ${alerta.producto.nombre}`
        }))
      }
    });

  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las alertas de stock'
    });
  }
};

/**
 * Proyectar necesidades de stock para múltiples cotizaciones
 */
exports.proyectarNecesidadesStock = async (req, res) => {
  const { fecha_desde, fecha_hasta, incluir_cotizaciones_activas = true } = req.query;

  try {
    // Construir filtro de fechas
    const where = {};
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_inicio_plan = {};
      if (fecha_desde) where.fecha_inicio_plan.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_inicio_plan.lte = new Date(fecha_hasta);
    }

    if (incluir_cotizaciones_activas === 'true') {
      where.estado = {
        in: ['en_proceso', 'confirmada', 'activa']
      };
    }

    // Obtener cotizaciones en el período
    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: {
                  select: {
                    id_producto: true,
                    nombre: true,
                    tipo_producto: true,
                    stock: true,
                    stock_minimo: true
                  }
                }
              }
            }
          }
        },
        cliente: {
          select: { nombre: true }
        }
      }
    });

    // Agrupar necesidades por producto
    const necesidadesPorProducto = new Map();

    for (const cotizacion of cotizaciones) {
      for (const planProducto of cotizacion.plan.productos_plan) {
        const idProducto = planProducto.id_producto;
        const cantidadAnimales = cotizacion.cantidad_animales || 1;
        
        // Calcular stock necesario para esta cotización
        const semanaInicio = planProducto.semana_inicio || 1;
        const semanaFin = planProducto.semana_fin || semanaInicio;
        const semanas = semanaFin - semanaInicio + 1;
        const dosisPorSemana = planProducto.dosis_por_semana || 1;
        const stockNecesario = cantidadAnimales * dosisPorSemana * semanas;

        if (!necesidadesPorProducto.has(idProducto)) {
          necesidadesPorProducto.set(idProducto, {
            producto: planProducto.producto,
            total_necesario: 0,
            cotizaciones: [],
            stock_actual: planProducto.producto.stock || 0,
            stock_minimo: planProducto.producto.stock_minimo || 0
          });
        }

        const necesidad = necesidadesPorProducto.get(idProducto);
        necesidad.total_necesario += stockNecesario;
        necesidad.cotizaciones.push({
          id_cotizacion: cotizacion.id_cotizacion,
          numero_cotizacion: cotizacion.numero_cotizacion,
          cliente: cotizacion.cliente?.nombre || 'Cliente no disponible',
          fecha_inicio: cotizacion.fecha_inicio_plan,
          cantidad_animales: cantidadAnimales,
          stock_necesario: stockNecesario
        });
      }
    }

    // Convertir a array y agregar análisis
    const proyeccion = Array.from(necesidadesPorProducto.values()).map(necesidad => {
      const stockReservado = 0; // TODO: Calcular reservas reales
      const stockDisponible = necesidad.stock_actual - stockReservado;
      const diferencia = stockDisponible - necesidad.total_necesario;
      
      return {
        ...necesidad,
        stock_disponible: stockDisponible,
        diferencia_stock: diferencia,
        estado_proyeccion: diferencia >= 0 ? 'suficiente' : 'insuficiente',
        porcentaje_cobertura: necesidad.total_necesario > 0 ? 
          Math.round((stockDisponible / necesidad.total_necesario) * 100) : 100,
        cantidad_faltante: diferencia < 0 ? Math.abs(diferencia) : 0,
        recomendacion: diferencia < 0 ? 
          `Comprar ${Math.abs(diferencia)} unidades` : 
          diferencia < necesidad.stock_minimo ? 
          'Revisar niveles mínimos' : 
          'Stock suficiente'
      };
    });

    // Ordenar por criticidad
    proyeccion.sort((a, b) => {
      if (a.estado_proyeccion !== b.estado_proyeccion) {
        return a.estado_proyeccion === 'insuficiente' ? -1 : 1;
      }
      return a.diferencia_stock - b.diferencia_stock;
    });

    res.json({
      success: true,
      data: {
        periodo: {
          fecha_desde: fecha_desde || 'Sin límite',
          fecha_hasta: fecha_hasta || 'Sin límite'
        },
        resumen: {
          total_cotizaciones: cotizaciones.length,
          total_productos: proyeccion.length,
          productos_suficientes: proyeccion.filter(p => p.estado_proyeccion === 'suficiente').length,
          productos_insuficientes: proyeccion.filter(p => p.estado_proyeccion === 'insuficiente').length,
          total_faltante: proyeccion.reduce((sum, p) => sum + p.cantidad_faltante, 0)
        },
        proyeccion
      }
    });

  } catch (error) {
    console.error('Error al proyectar necesidades de stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar la proyección de stock'
    });
  }
};

/**
 * Dashboard de indicadores generales
 */
exports.obtenerDashboardStock = async (req, res) => {
  try {
    const [
      totalIndicadores,
      indicadoresPorEstado,
      alertasCriticas,
      planesActivos,
      stockBajo
    ] = await Promise.all([
      prisma.indicadorStockPlan.count(),
      prisma.indicadorStockPlan.groupBy({
        by: ['estado_stock'],
        _count: { id_indicador: true }
      }),
      prisma.indicadorStockPlan.count({
        where: { estado_stock: 'critico' }
      }),
      prisma.planVacunal.count({
        where: { estado: 'activo' }
      }),
      prisma.producto.count({
        where: {
          stock: { lte: prisma.producto.fields.stock_minimo }
        }
      })
    ]);

    // Productos más críticos
    const productosCriticos = await prisma.indicadorStockPlan.findMany({
      where: {
        estado_stock: { in: ['critico', 'insuficiente'] }
      },
      include: {
        producto: {
          select: { nombre: true, tipo_producto: true }
        },
        plan_vacunal: {
          select: { nombre: true }
        }
      },
      orderBy: {
        stock_disponible: 'asc'
      },
      take: 10
    });

    res.json({
      success: true,
      data: {
        resumen: {
          total_indicadores: totalIndicadores,
          alertas_criticas: alertasCriticas,
          planes_activos: planesActivos,
          productos_stock_bajo: stockBajo
        },
        distribucion_stock: indicadoresPorEstado.reduce((acc, item) => {
          acc[item.estado_stock] = item._count.id_indicador;
          return acc;
        }, {}),
        productos_criticos: productosCriticos.map(item => ({
          producto: item.producto.nombre,
          plan: item.plan_vacunal.nombre,
          estado: item.estado_stock,
          stock_necesario: item.stock_necesario,
          stock_disponible: item.stock_disponible,
          diferencia: item.stock_disponible - item.stock_necesario
        })),
        ultima_actualizacion: new Date()
      }
    });

  } catch (error) {
    console.error('Error al obtener dashboard de stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el dashboard de stock'
    });
  }
};

/**
 * GET /indicadores-stock/planes
 * Obtener indicadores de stock para múltiples planes
 */
exports.obtenerIndicadoresPlanes = async (req, res) => {
  try {
    // Versión simplificada para test
    const indicadores = await prisma.indicadorStockPlan.findMany({
      take: 10,
      orderBy: {
        fecha_calculo: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        indicadores: indicadores,
        total: indicadores.length
      }
    });

  } catch (error) {
    console.error('Error al obtener indicadores de planes:', error);
    res.status(500).json({
      success: false,
      message: `Error al obtener los indicadores de planes: ${error.message}`
    });
  }
};

/**
 * GET /indicadores-stock/resumen
 * Obtener resumen general de indicadores de stock
 */
exports.obtenerResumenGeneral = async (req, res) => {
  try {
    // Contar indicadores por estado
    const indicadoresPorEstado = await prisma.indicadorStockPlan.groupBy({
      by: ['estado_stock'],
      _count: {
        id_indicador: true
      }
    });

    // Obtener estadísticas generales
    const totalIndicadores = await prisma.indicadorStockPlan.count();
    const alertasCriticas = await prisma.indicadorStockPlan.count({
      where: { estado_stock: 'critico' }
    });
    const stockBajo = await prisma.indicadorStockPlan.count({
      where: { estado_stock: 'bajo' }
    });

    // Obtener planes activos con indicadores
    const planesConIndicadores = await prisma.indicadorStockPlan.groupBy({
      by: ['id_plan_vacunal'],
      _count: {
        id_indicador: true
      }
    });

    res.json({
      success: true,
      data: {
        total_indicadores: totalIndicadores,
        alertas_criticas: alertasCriticas,
        stock_bajo: stockBajo,
        planes_con_indicadores: planesConIndicadores.length,
        distribucion_por_estado: indicadoresPorEstado.reduce((acc, item) => {
          acc[item.estado_stock] = item._count.id_indicador;
          return acc;
        }, {}),
        ultima_actualizacion: new Date()
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen general:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen general'
    });
  }
};

module.exports = exports;