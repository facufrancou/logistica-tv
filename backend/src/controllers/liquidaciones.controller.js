const prisma = require('../lib/prisma');
const PriceCalculator = require('../lib/priceCalculator');
const ExcelJS = require('exceljs');

/**
 * Controlador para gestionar liquidaciones y clasificación fiscal
 */

// ===== CLASIFICACIÓN FISCAL DE ITEMS =====

/**
 * Obtener items de cotización pendientes de clasificación fiscal
 */
exports.getItemsPendientesClasificacion = async (req, res) => {
  try {
    const { id_cotizacion } = req.params;

    if (!id_cotizacion) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      include: {
        cliente: {
          select: { nombre: true, cuit: true }
        },
        detalle_cotizacion: {
          include: {
            item_facturacion: true
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Formatear items con información de clasificación
    // Buscar vacunas para cada detalle (id_producto contiene id_vacuna en el sistema actual)
    const itemsConClasificacion = await Promise.all(
      cotizacion.detalle_cotizacion.map(async (detalle) => {
        // Intentar buscar vacuna primero (sistema actual usa id_producto para id_vacuna)
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: detalle.id_producto },
          include: {
            patologia: { select: { nombre: true } },
            presentacion: { select: { nombre: true } }
          }
        });

        const nombreItem = vacuna 
          ? `${vacuna.nombre} - ${vacuna.patologia.nombre}`
          : `Producto ID: ${detalle.id_producto}`;
        
        const descripcionItem = vacuna
          ? `Presentación: ${vacuna.presentacion.nombre}`
          : '';

        return {
          id_detalle_cotizacion: detalle.id_detalle_cotizacion,
          producto: {
            id: detalle.id_producto,
            nombre: nombreItem,
            descripcion: descripcionItem
          },
          cantidad_total: detalle.cantidad_total,
          precio_base_producto: parseFloat(detalle.precio_base_producto),
          precio_final_calculado: parseFloat(detalle.precio_final_calculado),
          subtotal: parseFloat(detalle.subtotal),
          porcentaje_aplicado: detalle.porcentaje_aplicado ? parseFloat(detalle.porcentaje_aplicado) : 0,
          facturacion_tipo: detalle.facturacion_tipo,
          item_facturacion: detalle.item_facturacion ? {
            tipo_facturacion: detalle.item_facturacion.tipo_facturacion,
            monto_negro: detalle.item_facturacion.monto_negro ? parseFloat(detalle.item_facturacion.monto_negro) : null,
            monto_blanco: detalle.item_facturacion.monto_blanco ? parseFloat(detalle.item_facturacion.monto_blanco) : null,
            fecha_clasificacion: detalle.item_facturacion.fecha_clasificacion
          } : null
        };
      })
    );

    res.json({
      cotizacion: {
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
        cliente: cotizacion.cliente,
        precio_total: parseFloat(cotizacion.precio_total),
        estado: cotizacion.estado
      },
      items: itemsConClasificacion
    });

  } catch (error) {
    console.error('Error al obtener items para clasificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Clasificar un item como Vía 2 (negro) o Vía 1 (blanco)
 */
exports.clasificarItem = async (req, res) => {
  try {
    const { id_detalle_cotizacion } = req.params;
    const { tipo_facturacion, monto_personalizado, observaciones } = req.body;

    // Validaciones
    if (!tipo_facturacion || !['negro', 'blanco'].includes(tipo_facturacion)) {
      return res.status(400).json({ 
        error: 'Tipo de facturación debe ser "blanco" (Vía 1) o "negro" (Vía 2)' 
      });
    }

    // Obtener detalle de cotización
    const detalleCotizacion = await prisma.detalleCotizacion.findUnique({
      where: { id_detalle_cotizacion: parseInt(id_detalle_cotizacion) }
    });

    if (!detalleCotizacion) {
      return res.status(404).json({ error: 'Item de cotización no encontrado' });
    }

    const subtotal = parseFloat(detalleCotizacion.subtotal);
    let montoNegro = 0;
    let montoBlanco = 0;

    // Calcular montos según tipo
    if (tipo_facturacion === 'negro') {
      montoNegro = monto_personalizado ? parseFloat(monto_personalizado) : subtotal;
    } else {
      montoBlanco = monto_personalizado ? parseFloat(monto_personalizado) : subtotal;
    }

    // Transacción para actualizar clasificación
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar el detalle de cotización
      await tx.detalleCotizacion.update({
        where: { id_detalle_cotizacion: parseInt(id_detalle_cotizacion) },
        data: { facturacion_tipo: tipo_facturacion }
      });

      // Crear o actualizar item de facturación
      const itemFacturacion = await tx.itemFacturacion.upsert({
        where: { id_detalle_cotizacion: parseInt(id_detalle_cotizacion) },
        update: {
          tipo_facturacion,
          monto_negro: montoNegro > 0 ? montoNegro : null,
          monto_blanco: montoBlanco > 0 ? montoBlanco : null,
          observaciones: observaciones || null,
          fecha_clasificacion: new Date(),
          clasificado_por: req.user?.id_usuario || null
        },
        create: {
          id_detalle_cotizacion: parseInt(id_detalle_cotizacion),
          tipo_facturacion,
          monto_negro: montoNegro > 0 ? montoNegro : null,
          monto_blanco: montoBlanco > 0 ? montoBlanco : null,
          observaciones: observaciones || null,
          clasificado_por: req.user?.id_usuario || null
        }
      });

      return itemFacturacion;
    });

    res.json({
      message: `Item clasificado como ${tipo_facturacion} exitosamente`,
      item_facturacion: {
        ...resultado,
        monto_negro: resultado.monto_negro ? parseFloat(resultado.monto_negro) : null,
        monto_blanco: resultado.monto_blanco ? parseFloat(resultado.monto_blanco) : null
      }
    });

  } catch (error) {
    console.error('Error al clasificar item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Clasificar múltiples items de una vez
 */
exports.clasificarMultiplesItems = async (req, res) => {
  try {
    const { items } = req.body; // Array de { id_detalle_cotizacion, tipo_facturacion, monto_personalizado }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de items' });
    }

    // Validar todos los items
    for (const item of items) {
      if (!item.id_detalle_cotizacion || !['negro', 'blanco'].includes(item.tipo_facturacion)) {
        return res.status(400).json({ 
          error: 'Cada item debe tener id_detalle_cotizacion y tipo_facturacion válido' 
        });
      }
    }

    const resultados = await prisma.$transaction(async (tx) => {
      const itemsActualizados = [];

      for (const item of items) {
        // Obtener detalle de cotización
        const detalleCotizacion = await tx.detalleCotizacion.findUnique({
          where: { id_detalle_cotizacion: parseInt(item.id_detalle_cotizacion) }
        });

        if (!detalleCotizacion) {
          throw new Error(`Item ${item.id_detalle_cotizacion} no encontrado`);
        }

        const subtotal = parseFloat(detalleCotizacion.subtotal);
        let montoNegro = 0;
        let montoBlanco = 0;

        if (item.tipo_facturacion === 'negro') {
          montoNegro = item.monto_personalizado ? parseFloat(item.monto_personalizado) : subtotal;
        } else {
          montoBlanco = item.monto_personalizado ? parseFloat(item.monto_personalizado) : subtotal;
        }

        // Actualizar detalle de cotización
        await tx.detalleCotizacion.update({
          where: { id_detalle_cotizacion: parseInt(item.id_detalle_cotizacion) },
          data: { facturacion_tipo: item.tipo_facturacion }
        });

        // Crear o actualizar item de facturación
        const itemFacturacion = await tx.itemFacturacion.upsert({
          where: { id_detalle_cotizacion: parseInt(item.id_detalle_cotizacion) },
          update: {
            tipo_facturacion: item.tipo_facturacion,
            monto_negro: montoNegro > 0 ? montoNegro : null,
            monto_blanco: montoBlanco > 0 ? montoBlanco : null,
            observaciones: item.observaciones || null,
            fecha_clasificacion: new Date(),
            clasificado_por: req.user?.id_usuario || null
          },
          create: {
            id_detalle_cotizacion: parseInt(item.id_detalle_cotizacion),
            tipo_facturacion: item.tipo_facturacion,
            monto_negro: montoNegro > 0 ? montoNegro : null,
            monto_blanco: montoBlanco > 0 ? montoBlanco : null,
            observaciones: item.observaciones || null,
            clasificado_por: req.user?.id_usuario || null
          }
        });

        itemsActualizados.push(itemFacturacion);
      }

      return itemsActualizados;
    });

    res.json({
      message: `${resultados.length} items clasificados exitosamente`,
      items_actualizados: resultados.length
    });

  } catch (error) {
    console.error('Error al clasificar múltiples items:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// ===== RESÚMENES DE LIQUIDACIÓN =====

/**
 * Generar resumen de liquidación para una cotización
 */
exports.generarResumenLiquidacion = async (req, res) => {
  try {
    const { id_cotizacion } = req.params;

    if (!id_cotizacion) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }

    // Obtener cotización con sus items clasificados
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      include: {
        cliente: {
          select: { nombre: true, cuit: true }
        },
        detalle_cotizacion: {
          include: {
            item_facturacion: true
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Verificar que todos los items están clasificados
    const itemsPendientes = cotizacion.detalle_cotizacion.filter(
      detalle => detalle.facturacion_tipo === 'pendiente'
    );

    if (itemsPendientes.length > 0) {
      return res.status(400).json({ 
        error: `Hay ${itemsPendientes.length} items pendientes de clasificación` 
      });
    }

    // Calcular totales
    let totalNegro = 0;
    let totalBlanco = 0;

    cotizacion.detalle_cotizacion.forEach(detalle => {
      if (detalle.item_facturacion) {
        if (detalle.item_facturacion.monto_negro) {
          totalNegro += parseFloat(detalle.item_facturacion.monto_negro);
        }
        if (detalle.item_facturacion.monto_blanco) {
          totalBlanco += parseFloat(detalle.item_facturacion.monto_blanco);
        }
      }
    });

    const totalGeneral = totalNegro + totalBlanco;
    const porcentajeNegro = totalGeneral > 0 ? (totalNegro / totalGeneral * 100) : 0;
    const porcentajeBlanco = totalGeneral > 0 ? (totalBlanco / totalGeneral * 100) : 0;

    // Crear o actualizar resumen de liquidación
    const resumen = await prisma.resumenLiquidacion.upsert({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      update: {
        total_negro: totalNegro,
        total_blanco: totalBlanco,
        total_general: totalGeneral,
        porcentaje_negro: porcentajeNegro,
        porcentaje_blanco: porcentajeBlanco,
        fecha_generacion: new Date(),
        generado_por: req.user?.id_usuario || null
      },
      create: {
        id_cotizacion: parseInt(id_cotizacion),
        total_negro: totalNegro,
        total_blanco: totalBlanco,
        total_general: totalGeneral,
        porcentaje_negro: porcentajeNegro,
        porcentaje_blanco: porcentajeBlanco,
        generado_por: req.user?.id_usuario || null
      }
    });

    res.json({
      message: 'Resumen de liquidación generado exitosamente',
      resumen: {
        ...resumen,
        total_negro: parseFloat(resumen.total_negro),
        total_blanco: parseFloat(resumen.total_blanco),
        total_general: parseFloat(resumen.total_general),
        porcentaje_negro: parseFloat(resumen.porcentaje_negro),
        porcentaje_blanco: parseFloat(resumen.porcentaje_blanco)
      },
      cotizacion: {
        numero_cotizacion: cotizacion.numero_cotizacion,
        cliente: cotizacion.cliente
      }
    });

  } catch (error) {
    console.error('Error al generar resumen de liquidación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener resumen de liquidación de una cotización
 */
exports.getResumenLiquidacion = async (req, res) => {
  try {
    const { id_cotizacion } = req.params;

    const resumen = await prisma.resumenLiquidacion.findUnique({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      include: {
        cotizacion: {
          include: {
            cliente: {
              select: { nombre: true, cuit: true }
            },
            detalle_cotizacion: {
              include: {
                item_facturacion: true
              }
            }
          }
        }
      }
    });

    if (!resumen) {
      return res.status(404).json({ error: 'Resumen de liquidación no encontrado' });
    }

    // Formatear detalle de items - Buscar vacunas para cada item
    const detalleItems = await Promise.all(
      resumen.cotizacion.detalle_cotizacion.map(async (detalle) => {
        // Buscar vacuna (id_producto contiene id_vacuna en el sistema actual)
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: detalle.id_producto },
          include: {
            patologia: { select: { nombre: true } }
          }
        });

        const nombreItem = vacuna 
          ? `${vacuna.nombre} - ${vacuna.patologia.nombre}`
          : `Producto ID: ${detalle.id_producto}`;

        return {
          producto: nombreItem,
          cantidad: detalle.cantidad_total,
          precio_unitario: parseFloat(detalle.precio_final_calculado),
          subtotal: parseFloat(detalle.subtotal),
          tipo_facturacion: detalle.facturacion_tipo,
          monto_negro: detalle.item_facturacion?.monto_negro ? parseFloat(detalle.item_facturacion.monto_negro) : 0,
          monto_blanco: detalle.item_facturacion?.monto_blanco ? parseFloat(detalle.item_facturacion.monto_blanco) : 0
        };
      })
    );

    res.json({
      resumen: {
        id_resumen: resumen.id_resumen,
        id_cotizacion: resumen.id_cotizacion,
        cotizacion: {
          id_cotizacion: resumen.cotizacion.id_cotizacion,
          numero_cotizacion: resumen.cotizacion.numero_cotizacion,
          cliente: resumen.cotizacion.cliente
        },
        totales: {
          total_negro: parseFloat(resumen.total_negro),
          total_blanco: parseFloat(resumen.total_blanco),
          total_general: parseFloat(resumen.total_general),
          porcentaje_negro: parseFloat(resumen.porcentaje_negro),
          porcentaje_blanco: parseFloat(resumen.porcentaje_blanco)
        },
        fecha_generacion: resumen.fecha_generacion,
        detalle_items: detalleItems
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen de liquidación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Listar todos los resúmenes de liquidación
 */
exports.getResumenesLiquidacion = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      fecha_desde, 
      fecha_hasta, 
      id_cliente,
      busqueda,
      numero_cotizacion
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_generacion = {};
      if (fecha_desde) where.fecha_generacion.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_generacion.lte = new Date(fecha_hasta);
    }

    // Filtrar por cliente (ID o nombre)
    if (id_cliente) {
      where.cotizacion = {
        id_cliente: parseInt(id_cliente)
      };
    } else if (busqueda) {
      where.cotizacion = {
        OR: [
          {
            numero_cotizacion: {
              contains: busqueda
            }
          },
          {
            cliente: {
              nombre: {
                contains: busqueda
              }
            }
          }
        ]
      };
    }

    // Filtrar por número de cotización específico
    if (numero_cotizacion) {
      where.cotizacion = {
        ...where.cotizacion,
        numero_cotizacion: {
          contains: numero_cotizacion
        }
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [resumenes, total] = await Promise.all([
      prisma.resumenLiquidacion.findMany({
        where,
        include: {
          cotizacion: {
            include: {
              cliente: {
                select: { nombre: true, cuit: true }
              },
              detalle_cotizacion: {
                include: {
                  item_facturacion: true
                }
              }
            }
          }
        },
        orderBy: { fecha_generacion: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.resumenLiquidacion.count({ where })
    ]);

    // Formatear resumenes con detalle de items
    const resumenesFormateados = await Promise.all(
      resumenes.map(async (resumen) => {
        // Formatear detalle de items - Buscar vacunas para cada item
        const detalleItems = await Promise.all(
          resumen.cotizacion.detalle_cotizacion.map(async (detalle) => {
            // Buscar vacuna (id_producto contiene id_vacuna en el sistema actual)
            const vacuna = await prisma.vacuna.findUnique({
              where: { id_vacuna: detalle.id_producto },
              include: {
                patologia: { select: { nombre: true } },
                presentacion: { select: { nombre: true } },
                proveedor: { select: { nombre: true } }
              }
            });

            const nombreItem = vacuna 
              ? `${vacuna.nombre} - ${vacuna.patologia.nombre}`
              : `Producto ID: ${detalle.id_producto}`;

            return {
              producto: nombreItem,
              nombre_producto: nombreItem,
              laboratorio: vacuna?.proveedor?.nombre || null,
              presentacion: vacuna?.presentacion?.nombre || null,
              cantidad: detalle.cantidad_total,
              precio_unitario: parseFloat(detalle.precio_final_calculado),
              subtotal: parseFloat(detalle.subtotal),
              tipo_facturacion: detalle.facturacion_tipo,
              monto_negro: detalle.item_facturacion?.monto_negro ? parseFloat(detalle.item_facturacion.monto_negro) : 0,
              monto_blanco: detalle.item_facturacion?.monto_blanco ? parseFloat(detalle.item_facturacion.monto_blanco) : 0
            };
          })
        );

        return {
          id_resumen: resumen.id_resumen,
          cotizacion: {
            id_cotizacion: resumen.cotizacion.id_cotizacion,
            numero_cotizacion: resumen.cotizacion.numero_cotizacion,
            cliente: resumen.cotizacion.cliente
          },
          totales: {
            total_negro: parseFloat(resumen.total_negro),
            total_blanco: parseFloat(resumen.total_blanco),
            total_general: parseFloat(resumen.total_general),
            porcentaje_negro: parseFloat(resumen.porcentaje_negro),
            porcentaje_blanco: parseFloat(resumen.porcentaje_blanco)
          },
          fecha_generacion: resumen.fecha_generacion,
          detalle_items: detalleItems
        };
      })
    );

    res.json({
      resumenes: resumenesFormateados,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error al obtener resúmenes de liquidación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener estadísticas generales de liquidaciones
 */
exports.getEstadisticasLiquidaciones = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    // Construir filtros de fecha
    const where = {};
    if (fecha_desde || fecha_hasta) {
      where.fecha_generacion = {};
      if (fecha_desde) where.fecha_generacion.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_generacion.lte = new Date(fecha_hasta);
    }

    // Obtener estadísticas agregadas
    const estadisticas = await prisma.resumenLiquidacion.aggregate({
      where,
      _sum: {
        total_negro: true,
        total_blanco: true,
        total_general: true
      },
      _avg: {
        porcentaje_negro: true,
        porcentaje_blanco: true
      },
      _count: true
    });

    // Obtener distribución por mes (últimos 12 meses)
    const distribucionMensual = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(fecha_generacion, '%Y-%m') as mes,
        SUM(total_negro) as total_negro_mes,
        SUM(total_blanco) as total_blanco_mes,
        COUNT(*) as cotizaciones_mes
      FROM resumenes_liquidacion 
      WHERE fecha_generacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fecha_generacion, '%Y-%m')
      ORDER BY mes DESC
    `;

    res.json({
      estadisticas_generales: {
        total_cotizaciones: estadisticas._count,
        total_negro_acumulado: parseFloat(estadisticas._sum.total_negro || 0),
        total_blanco_acumulado: parseFloat(estadisticas._sum.total_blanco || 0),
        total_general_acumulado: parseFloat(estadisticas._sum.total_general || 0),
        promedio_porcentaje_negro: parseFloat(estadisticas._avg.porcentaje_negro || 0),
        promedio_porcentaje_blanco: parseFloat(estadisticas._avg.porcentaje_blanco || 0)
      },
      distribucion_mensual: distribucionMensual.map(item => ({
        mes: item.mes,
        total_negro: parseFloat(item.total_negro_mes || 0),
        total_blanco: parseFloat(item.total_blanco_mes || 0),
        cotizaciones: parseInt(item.cotizaciones_mes)
      }))
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de liquidaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Exportar liquidaciones a Excel
 */
exports.exportarLiquidacionesExcel = async (req, res) => {
  try {
    const { 
      fecha_desde, 
      fecha_hasta, 
      id_cliente,
      busqueda,
      numero_cotizacion
    } = req.query;

    // Construir filtros (mismo que getResumenesLiquidacion)
    const where = {};
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_generacion = {};
      if (fecha_desde) where.fecha_generacion.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_generacion.lte = new Date(fecha_hasta);
    }

    if (id_cliente) {
      where.cotizacion = {
        id_cliente: parseInt(id_cliente)
      };
    } else if (busqueda) {
      where.cotizacion = {
        OR: [
          {
            numero_cotizacion: {
              contains: busqueda
            }
          },
          {
            cliente: {
              nombre: {
                contains: busqueda
              }
            }
          }
        ]
      };
    }

    if (numero_cotizacion) {
      where.cotizacion = {
        ...where.cotizacion,
        numero_cotizacion: {
          contains: numero_cotizacion
        }
      };
    }

    // Obtener todos los resumenes sin paginación
    const resumenes = await prisma.resumenLiquidacion.findMany({
      where,
      include: {
        cotizacion: {
          include: {
            cliente: {
              select: { nombre: true, cuit: true }
            },
            detalle_cotizacion: {
              include: {
                item_facturacion: true
              }
            }
          }
        }
      },
      orderBy: { fecha_generacion: 'desc' }
    });

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Gestión Logística TV';
    workbook.created = new Date();

    // Hoja 1: Resumen de Liquidaciones
    const sheetResumen = workbook.addWorksheet('Resumen Liquidaciones');
    
    // Configurar columnas del resumen
    sheetResumen.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Hora', key: 'hora', width: 10 },
      { header: 'Cotización', key: 'cotizacion', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'CUIT', key: 'cuit', width: 15 },
      { header: 'Vía 2 (Negro)', key: 'negro', width: 15 },
      { header: 'Vía 1 (Blanco)', key: 'blanco', width: 15 },
      { header: 'Total General', key: 'total', width: 15 },
      { header: '% Negro', key: 'porcentajeNegro', width: 10 },
      { header: '% Blanco', key: 'porcentajeBlanco', width: 10 }
    ];

    // Estilo del encabezado
    sheetResumen.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetResumen.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    sheetResumen.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Agregar datos del resumen
    let totalNegro = 0;
    let totalBlanco = 0;
    let totalGeneral = 0;

    resumenes.forEach(resumen => {
      const fecha = new Date(resumen.fecha_generacion);
      const negro = parseFloat(resumen.total_negro);
      const blanco = parseFloat(resumen.total_blanco);
      const total = parseFloat(resumen.total_general);

      totalNegro += negro;
      totalBlanco += blanco;
      totalGeneral += total;

      sheetResumen.addRow({
        fecha: fecha.toLocaleDateString('es-AR'),
        hora: fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        cotizacion: resumen.cotizacion.numero_cotizacion,
        cliente: resumen.cotizacion.cliente.nombre,
        cuit: resumen.cotizacion.cliente.cuit,
        negro: negro,
        blanco: blanco,
        total: total,
        porcentajeNegro: parseFloat(resumen.porcentaje_negro),
        porcentajeBlanco: parseFloat(resumen.porcentaje_blanco)
      });
    });

    // Agregar fila de totales
    const totalRow = sheetResumen.addRow({
      fecha: '',
      hora: '',
      cotizacion: '',
      cliente: '',
      cuit: 'TOTALES:',
      negro: totalNegro,
      blanco: totalBlanco,
      total: totalGeneral,
      porcentajeNegro: totalGeneral > 0 ? (totalNegro / totalGeneral * 100) : 0,
      porcentajeBlanco: totalGeneral > 0 ? (totalBlanco / totalGeneral * 100) : 0
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Formato de números para columnas de montos
    sheetResumen.getColumn('negro').numFmt = '$#,##0.00';
    sheetResumen.getColumn('blanco').numFmt = '$#,##0.00';
    sheetResumen.getColumn('total').numFmt = '$#,##0.00';
    sheetResumen.getColumn('porcentajeNegro').numFmt = '0.00"%"';
    sheetResumen.getColumn('porcentajeBlanco').numFmt = '0.00"%"';

    // Hoja 2: Detalle por Items (con separación por cotización)
    const sheetDetalle = workbook.addWorksheet('Detalle por Items');
    
    sheetDetalle.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Cotización', key: 'cotizacion', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Producto', key: 'producto', width: 40 },
      { header: 'Laboratorio', key: 'laboratorio', width: 20 },
      { header: 'Presentación', key: 'presentacion', width: 20 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Precio Unit.', key: 'precioUnit', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tipo Fact.', key: 'tipoFact', width: 12 },
      { header: 'Monto Negro', key: 'montoNegro', width: 15 },
      { header: 'Monto Blanco', key: 'montoBlanco', width: 15 }
    ];

    // Estilo del encabezado del detalle
    sheetDetalle.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetDetalle.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF009933' }
    };
    sheetDetalle.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    let filaActual = 2; // Comenzar después del encabezado

    // Agregar detalles de items separados por cotización
    for (const resumen of resumenes) {
      const fecha = new Date(resumen.fecha_generacion);
      
      // Agregar fila de separación con info de la cotización
      const filaSeparador = sheetDetalle.getRow(filaActual);
      filaSeparador.getCell(1).value = `COTIZACIÓN: ${resumen.cotizacion.numero_cotizacion}`;
      filaSeparador.getCell(3).value = `CLIENTE: ${resumen.cotizacion.cliente.nombre} (${resumen.cotizacion.cliente.cuit})`;
      filaSeparador.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      filaSeparador.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' }
      };
      filaSeparador.alignment = { vertical: 'middle', horizontal: 'left' };
      
      // Unir celdas para el separador
      sheetDetalle.mergeCells(filaActual, 1, filaActual, 2);
      sheetDetalle.mergeCells(filaActual, 3, filaActual, 12);
      filaActual++;

      // Agregar items de esta cotización
      let totalNegroLiq = 0;
      let totalBlancoLiq = 0;
      
      for (const detalle of resumen.cotizacion.detalle_cotizacion) {
        // Buscar vacuna
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: detalle.id_producto },
          include: {
            patologia: { select: { nombre: true } },
            presentacion: { select: { nombre: true } },
            proveedor: { select: { nombre: true } }
          }
        });

        const nombreItem = vacuna 
          ? `${vacuna.nombre} - ${vacuna.patologia.nombre}`
          : `Producto ID: ${detalle.id_producto}`;

        const montoNegro = detalle.item_facturacion?.monto_negro ? parseFloat(detalle.item_facturacion.monto_negro) : 0;
        const montoBlanco = detalle.item_facturacion?.monto_blanco ? parseFloat(detalle.item_facturacion.monto_blanco) : 0;

        totalNegroLiq += montoNegro;
        totalBlancoLiq += montoBlanco;

        sheetDetalle.addRow({
          fecha: fecha.toLocaleDateString('es-AR'),
          cotizacion: resumen.cotizacion.numero_cotizacion,
          cliente: resumen.cotizacion.cliente.nombre,
          producto: nombreItem,
          laboratorio: vacuna?.proveedor?.nombre || '-',
          presentacion: vacuna?.presentacion?.nombre || '-',
          cantidad: detalle.cantidad_total,
          precioUnit: parseFloat(detalle.precio_final_calculado),
          subtotal: parseFloat(detalle.subtotal),
          tipoFact: detalle.facturacion_tipo === 'negro' ? 'Vía 2' : 'Vía 1',
          montoNegro: montoNegro,
          montoBlanco: montoBlanco
        });
        filaActual++;
      }

      // Agregar fila de totales para esta cotización
      const filaTotales = sheetDetalle.getRow(filaActual);
      filaTotales.getCell(9).value = 'TOTALES:';
      filaTotales.getCell(10).value = '';
      filaTotales.getCell(11).value = totalNegroLiq;
      filaTotales.getCell(12).value = totalBlancoLiq;
      
      filaTotales.font = { bold: true };
      filaTotales.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      filaTotales.getCell(9).alignment = { horizontal: 'right' };
      filaTotales.getCell(11).numFmt = '$#,##0.00';
      filaTotales.getCell(12).numFmt = '$#,##0.00';
      filaActual++;

      // Fila vacía de separación entre cotizaciones
      filaActual++;
    }

    // Formato de números para columnas de montos del detalle
    sheetDetalle.getColumn('precioUnit').numFmt = '$#,##0.00';
    sheetDetalle.getColumn('subtotal').numFmt = '$#,##0.00';
    sheetDetalle.getColumn('montoNegro').numFmt = '$#,##0.00';
    sheetDetalle.getColumn('montoBlanco').numFmt = '$#,##0.00';

    // Generar nombre de archivo con fecha
    const nombreArchivo = `Liquidaciones_${fecha_desde ? fecha_desde : 'todas'}_${fecha_hasta ? fecha_hasta : new Date().toISOString().split('T')[0]}.xlsx`;

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

    // Escribir el archivo en la respuesta
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al exportar liquidaciones a Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al exportar liquidaciones' });
    }
  }
};

module.exports = exports;