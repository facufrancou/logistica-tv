const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

function calcularTendencia(precios) {
  if (precios.length < 2) return 'estable';
  
  const primerPrecio = parseFloat(precios[precios.length - 1]);
  const ultimoPrecio = parseFloat(precios[0]);
  
  const diferencia = ((ultimoPrecio - primerPrecio) / primerPrecio) * 100;
  
  if (diferencia > 5) return 'al_alza';
  if (diferencia < -5) return 'a_la_baja';
  return 'estable';
}

function agruparPorPeriodo(datos, agrupacion = 'mes') {
  const grupos = {};
  
  datos.forEach(item => {
    const fecha = new Date(item.fecha_cambio);
    let periodo;
    
    switch (agrupacion) {
      case 'dia':
        periodo = fecha.toISOString().split('T')[0];
        break;
      case 'semana':
        const weekStart = new Date(fecha);
        weekStart.setDate(fecha.getDate() - fecha.getDay());
        periodo = weekStart.toISOString().split('T')[0];
        break;
      case 'mes':
      default:
        periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        break;
    }
    
    if (!grupos[periodo]) {
      grupos[periodo] = [];
    }
    grupos[periodo].push(item);
  });
  
  return grupos;
}

// ===== CONTROLADORES =====

// GET /reportes/tendencias-precios
const getTendenciasPrecios = async (req, res) => {
  try {
    const {
      id_lista_precio,
      id_producto,
      fecha_desde,
      fecha_hasta,
      agrupacion = 'mes',
      limite_productos = 20
    } = req.query;

    // Construir filtros
    const whereConditions = {};

    if (id_lista_precio) {
      whereConditions.id_lista_precio = parseInt(id_lista_precio);
    }

    if (id_producto) {
      whereConditions.id_producto = parseInt(id_producto);
    }

    if (fecha_desde || fecha_hasta) {
      whereConditions.fecha_cambio = {};
      if (fecha_desde) whereConditions.fecha_cambio.gte = new Date(fecha_desde);
      if (fecha_hasta) whereConditions.fecha_cambio.lte = new Date(fecha_hasta);
    }

    // Obtener datos del historial de precios
    const historialCompleto = await prisma.historialPrecio.findMany({
      where: whereConditions,
      include: {
        productos: {
          select: {
            id_producto: true,
            nombre: true,
            precio_unitario: true
          }
        },
        lista_precio: {
          select: {
            id_lista: true,
            tipo: true,
            nombre: true
          }
        }
      },
      orderBy: { fecha_cambio: 'desc' }
    });

    // Agrupar por producto
    const productosTendencias = {};
    
    historialCompleto.forEach(item => {
      const productoId = item.id_producto;
      
      if (!productosTendencias[productoId]) {
        productosTendencias[productoId] = {
          producto: item.productos,
          lista_precio: item.lista_precio,
          cambios: [],
          precios: []
        };
      }
      
      productosTendencias[productoId].cambios.push(item);
      productosTendencias[productoId].precios.push(parseFloat(item.precio_nuevo));
    });

    // Calcular tendencias por producto
    const tendenciasResumen = Object.values(productosTendencias)
      .slice(0, parseInt(limite_productos))
      .map(data => {
        const precios = data.precios;
        const cambios = data.cambios;
        
        const tendencia = calcularTendencia(precios);
        const precioActual = precios[0] || 0;
        const precioAnterior = precios[precios.length - 1] || 0;
        const cambioAbsoluto = precioActual - precioAnterior;
        const cambioRelativo = precioAnterior > 0 ? (cambioAbsoluto / precioAnterior) * 100 : 0;
        
        return {
          producto: data.producto,
          lista_precio: data.lista_precio,
          tendencia,
          precio_actual: precioActual,
          precio_inicial: precioAnterior,
          cambio_absoluto: cambioAbsoluto,
          cambio_relativo: Math.round(cambioRelativo * 100) / 100,
          cantidad_cambios: cambios.length,
          volatilidad: precios.length > 1 ? calcularVolatilidad(precios) : 0
        };
      });

    // Agrupar cambios por período
    const datosPorPeriodo = agruparPorPeriodo(historialCompleto, agrupacion);
    
    const tendenciasPorPeriodo = Object.keys(datosPorPeriodo)
      .sort()
      .map(periodo => {
        const cambiosDelPeriodo = datosPorPeriodo[periodo];
        const preciosDelPeriodo = cambiosDelPeriodo.map(c => parseFloat(c.precio_nuevo));
        
        return {
          periodo,
          cantidad_cambios: cambiosDelPeriodo.length,
          precio_promedio: preciosDelPeriodo.reduce((a, b) => a + b, 0) / preciosDelPeriodo.length,
          precio_maximo: Math.max(...preciosDelPeriodo),
          precio_minimo: Math.min(...preciosDelPeriodo),
          productos_afectados: new Set(cambiosDelPeriodo.map(c => c.id_producto)).size
        };
      });

    // Calcular métricas generales
    const metricas = {
      total_productos_analizados: Object.keys(productosTendencias).length,
      total_cambios_precio: historialCompleto.length,
      productos_al_alza: tendenciasResumen.filter(t => t.tendencia === 'al_alza').length,
      productos_a_la_baja: tendenciasResumen.filter(t => t.tendencia === 'a_la_baja').length,
      productos_estables: tendenciasResumen.filter(t => t.tendencia === 'estable').length
    };

    if (tendenciasResumen.length > 0) {
      const cambiosRelativos = tendenciasResumen.map(t => t.cambio_relativo);
      metricas.cambio_promedio = cambiosRelativos.reduce((a, b) => a + b, 0) / cambiosRelativos.length;
      metricas.volatilidad_promedio = tendenciasResumen.reduce((a, t) => a + t.volatilidad, 0) / tendenciasResumen.length;
    }

    res.json({
      success: true,
      data: {
        metricas,
        tendencias_por_producto: tendenciasResumen,
        tendencias_por_periodo: tendenciasPorPeriodo,
        parametros: {
          id_lista_precio,
          id_producto,
          fecha_desde,
          fecha_hasta,
          agrupacion,
          limite_productos: parseInt(limite_productos)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo tendencias de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para calcular volatilidad (desviación estándar)
function calcularVolatilidad(precios) {
  if (precios.length < 2) return 0;
  
  const promedio = precios.reduce((a, b) => a + b, 0) / precios.length;
  const varianza = precios.reduce((a, precio) => a + Math.pow(precio - promedio, 2), 0) / precios.length;
  
  return Math.sqrt(varianza);
}

// GET /reportes/analisis-listas-precios
const getAnalisisListasPrecios = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    // Obtener todas las listas de precios activas
    const listas = await prisma.listaPrecio.findMany({
      where: { activa: true },
      include: {
        precios_por_lista: {
          where: {
            activo: true
          },
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true
              }
            }
          }
        },
        historial_precios: {
          where: fecha_desde || fecha_hasta ? {
            fecha_cambio: {
              ...(fecha_desde && { gte: new Date(fecha_desde) }),
              ...(fecha_hasta && { lte: new Date(fecha_hasta) })
            }
          } : undefined,
          include: {
            productos: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    const analisisPorLista = listas.map(lista => {
      const precios = lista.precios_por_lista;
      const historial = lista.historial_precios;
      
      // Calcular estadísticas de precios actuales
      const montosActuales = precios.map(p => parseFloat(p.precio));
      const estadisticasActuales = {
        cantidad_productos: precios.length,
        precio_promedio: montosActuales.length > 0 ? montosActuales.reduce((a, b) => a + b, 0) / montosActuales.length : 0,
        precio_minimo: montosActuales.length > 0 ? Math.min(...montosActuales) : 0,
        precio_maximo: montosActuales.length > 0 ? Math.max(...montosActuales) : 0
      };

      // Analizar historial de cambios
      const cambiosRecientes = historial.slice(0, 10); // Últimos 10 cambios
      const tendenciaLista = historial.length > 1 ? calcularTendencia(historial.map(h => h.precio_nuevo)) : 'estable';

      return {
        lista: {
          id_lista: lista.id_lista,
          tipo: lista.tipo,
          nombre: lista.nombre,
          descripcion: lista.descripcion
        },
        estadisticas_actuales: estadisticasActuales,
        historial: {
          total_cambios: historial.length,
          cambios_recientes: cambiosRecientes.length,
          tendencia: tendenciaLista
        },
        productos_mas_volatiles: historial
          .reduce((productos, cambio) => {
            const productoNombre = cambio.productos.nombre;
            if (!productos[productoNombre]) {
              productos[productoNombre] = 0;
            }
            productos[productoNombre]++;
            return productos;
          }, {})
      };
    });

    // Comparativa entre listas
    const comparativa = {
      lista_mas_cara: null,
      lista_mas_barata: null,
      lista_mas_volatil: null
    };

    if (analisisPorLista.length > 0) {
      comparativa.lista_mas_cara = analisisPorLista.reduce((max, lista) => 
        lista.estadisticas_actuales.precio_promedio > max.estadisticas_actuales.precio_promedio ? lista : max
      );

      comparativa.lista_mas_barata = analisisPorLista.reduce((min, lista) => 
        lista.estadisticas_actuales.precio_promedio < min.estadisticas_actuales.precio_promedio ? lista : min
      );

      comparativa.lista_mas_volatil = analisisPorLista.reduce((max, lista) => 
        lista.historial.total_cambios > max.historial.total_cambios ? lista : max
      );
    }

    res.json({
      success: true,
      data: {
        analisis_por_lista: analisisPorLista,
        comparativa,
        resumen: {
          total_listas_activas: listas.length,
          total_productos_con_precio: analisisPorLista.reduce((total, lista) => total + lista.estadisticas_actuales.cantidad_productos, 0),
          total_cambios_periodo: analisisPorLista.reduce((total, lista) => total + lista.historial.total_cambios, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error en análisis de listas de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /reportes/productos-rentabilidad
const getProductosRentabilidad = async (req, res) => {
  try {
    const { limite = 50, orden = 'rentabilidad' } = req.query;

    // Obtener productos con información de cotizaciones y facturas
    const productos = await prisma.producto.findMany({
      include: {
        detalle_cotizacion: {
          include: {
            cotizacion: {
              include: {
                facturas: {
                  where: {
                    estado_factura: 'pagada'
                  }
                }
              }
            }
          }
        },
        historial_precios: {
          orderBy: { fecha_cambio: 'desc' },
          take: 5
        },
        precios_por_lista: {
          where: { activo: true },
          include: {
            lista: {
              select: {
                tipo: true,
                nombre: true
              }
            }
          }
        }
      },
      take: parseInt(limite)
    });

    const analisisRentabilidad = productos.map(producto => {
      // Calcular ingresos totales del producto
      const ingresosTotales = producto.detalle_cotizacion.reduce((total, detalle) => {
        const facturasPagadas = detalle.cotizacion.facturas;
        const ingresosCotizacion = facturasPagadas.reduce((sum, factura) => 
          sum + parseFloat(factura.monto_total), 0
        );
        return total + ingresosCotizacion;
      }, 0);

      // Calcular unidades vendidas
      const unidadesVendidas = producto.detalle_cotizacion.reduce((total, detalle) => 
        total + detalle.cantidad_total, 0
      );

      // Precio promedio de venta
      const precioPromedioVenta = unidadesVendidas > 0 ? ingresosTotales / unidadesVendidas : 0;

      // Rentabilidad bruta (asumiendo costo = 70% del precio de lista más bajo)
      const preciosMasBaratos = producto.precios_por_lista.map(p => parseFloat(p.precio));
      const costoEstimado = preciosMasBaratos.length > 0 ? Math.min(...preciosMasBaratos) * 0.7 : parseFloat(producto.precio_unitario) * 0.7;
      const rentabilidadUnitaria = precioPromedioVenta - costoEstimado;
      const margenRentabilidad = precioPromedioVenta > 0 ? (rentabilidadUnitaria / precioPromedioVenta) * 100 : 0;

      // Análisis de tendencia de precios
      const tendenciaPrecios = producto.historial_precios.length > 1 ? 
        calcularTendencia(producto.historial_precios.map(h => h.precio_nuevo)) : 'estable';

      return {
        producto: {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          precio_unitario: parseFloat(producto.precio_unitario)
        },
        metricas_rentabilidad: {
          ingresos_totales: Math.round(ingresosTotales * 100) / 100,
          unidades_vendidas: unidadesVendidas,
          precio_promedio_venta: Math.round(precioPromedioVenta * 100) / 100,
          costo_estimado: Math.round(costoEstimado * 100) / 100,
          rentabilidad_unitaria: Math.round(rentabilidadUnitaria * 100) / 100,
          margen_rentabilidad: Math.round(margenRentabilidad * 100) / 100
        },
        analisis_precios: {
          tendencia: tendenciaPrecios,
          cantidad_listas: producto.precios_por_lista.length,
          precio_minimo: preciosMasBaratos.length > 0 ? Math.min(...preciosMasBaratos) : 0,
          precio_maximo: preciosMasBaratos.length > 0 ? Math.max(...preciosMasBaratos) : 0,
          volatilidad_reciente: producto.historial_precios.length
        }
      };
    });

    // Ordenar según criterio solicitado
    const analisisOrdenado = analisisRentabilidad.sort((a, b) => {
      switch (orden) {
        case 'ingresos':
          return b.metricas_rentabilidad.ingresos_totales - a.metricas_rentabilidad.ingresos_totales;
        case 'margen':
          return b.metricas_rentabilidad.margen_rentabilidad - a.metricas_rentabilidad.margen_rentabilidad;
        case 'unidades':
          return b.metricas_rentabilidad.unidades_vendidas - a.metricas_rentabilidad.unidades_vendidas;
        case 'rentabilidad':
        default:
          return b.metricas_rentabilidad.rentabilidad_unitaria - a.metricas_rentabilidad.rentabilidad_unitaria;
      }
    });

    // Calcular métricas generales
    const metricasGenerales = {
      total_productos_analizados: analisisOrdenado.length,
      ingresos_totales: analisisOrdenado.reduce((sum, p) => sum + p.metricas_rentabilidad.ingresos_totales, 0),
      margen_promedio: analisisOrdenado.reduce((sum, p) => sum + p.metricas_rentabilidad.margen_rentabilidad, 0) / analisisOrdenado.length || 0,
      productos_rentables: analisisOrdenado.filter(p => p.metricas_rentabilidad.rentabilidad_unitaria > 0).length,
      productos_perdida: analisisOrdenado.filter(p => p.metricas_rentabilidad.rentabilidad_unitaria < 0).length
    };

    res.json({
      success: true,
      data: {
        metricas_generales: metricasGenerales,
        productos_rentabilidad: analisisOrdenado,
        parametros: {
          limite: parseInt(limite),
          orden
        }
      }
    });

  } catch (error) {
    console.error('Error en análisis de rentabilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getTendenciasPrecios,
  getAnalisisListasPrecios,
  getProductosRentabilidad
};
