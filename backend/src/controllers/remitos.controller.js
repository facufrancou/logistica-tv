const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

function generarNumeroRemito() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `REM-${year}${month}${day}-${random}`;
}

async function validarStock(productos, tx = prisma) {
  for (const item of productos) {
    const producto = await tx.producto.findUnique({
      where: { id_producto: item.id_producto },
      select: { stock: true, nombre: true, requiere_control_stock: true }
    });

    if (!producto) {
      throw new Error(`Producto con ID ${item.id_producto} no encontrado`);
    }

    if (producto.requiere_control_stock && producto.stock < item.cantidad_entregada) {
      throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${item.cantidad_entregada}`);
    }
  }
}

async function actualizarStock(productos, tx = prisma) {
  for (const item of productos) {
    await tx.producto.update({
      where: { id_producto: item.id_producto },
      data: {
        stock: {
          decrement: item.cantidad_entregada
        }
      }
    });

    // Registrar movimiento de stock
    await tx.movimientoStock.create({
      data: {
        id_producto: item.id_producto,
        tipo_movimiento: 'salida',
        cantidad: item.cantidad_entregada,
        motivo: `Entrega por remito`,
        stock_anterior: 0, // Se calculará en el trigger o mediante consulta
        stock_nuevo: 0,    // Se calculará en el trigger o mediante consulta
        observaciones: `Remito generado automaticamente`
      }
    });
  }
}

// ===== CONTROLADORES PRINCIPALES =====

/**
 * Crear un nuevo remito desde una cotización
 */
exports.crearRemitoDesdeCotizacion = async (req, res) => {
  const { id_cotizacion } = req.params;
  const { observaciones, productos } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que la cotización existe
      const cotizacion = await tx.cotizacion.findUnique({
        where: { id_cotizacion: parseInt(id_cotizacion) },
        include: {
          cliente: true,
          calendario_vacunacion: {
            include: { producto: true }
          }
        }
      });

      if (!cotizacion) {
        throw new Error('Cotización no encontrada');
      }

      // Validar que hay productos para entregar
      if (!productos || productos.length === 0) {
        throw new Error('Debe especificar al menos un producto para el remito');
      }

      // Validar stock disponible
      await validarStock(productos, tx);

      // Generar número de remito único
      let numeroRemito;
      let numeroExiste = true;
      
      while (numeroExiste) {
        numeroRemito = generarNumeroRemito();
        const existente = await tx.remito.findUnique({
          where: { numero_remito: numeroRemito }
        });
        numeroExiste = !!existente;
      }

      // Crear el remito
      const remito = await tx.remito.create({
        data: {
          numero_remito: numeroRemito,
          id_cotizacion: parseInt(id_cotizacion),
          id_cliente: cotizacion.id_cliente,
          fecha_emision: new Date(),
          tipo_remito: 'plan_vacunal',
          estado_remito: 'pendiente',
          precio_total: productos.reduce((total, p) => total + (p.precio_unitario || 0) * p.cantidad_entregada, 0),
          observaciones,
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear detalles del remito
      const detallesData = productos.map(producto => ({
        id_remito: remito.id_remito,
        id_producto: producto.id_producto,
        cantidad_entregada: producto.cantidad_entregada,
        precio_unitario: producto.precio_unitario || 0,
        subtotal: (producto.precio_unitario || 0) * producto.cantidad_entregada,
        lote_producto: producto.lote_producto || null,
        fecha_vencimiento: producto.fecha_vencimiento ? new Date(producto.fecha_vencimiento) : null,
        observaciones: producto.observaciones || null
      }));

      await tx.detalleRemito.createMany({
        data: detallesData
      });

      // Actualizar stock de productos
      await actualizarStock(productos, tx);

      return remito;
    });

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Remito creado exitosamente',
      data: {
        id_remito: resultado.id_remito,
        numero_remito: resultado.numero_remito,
        estado_remito: resultado.estado_remito
      }
    });

  } catch (error) {
    console.error('Error al crear remito desde cotización:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear el remito'
    });
  }
};

/**
 * Crear un remito automáticamente desde el calendario de vacunación
 */
exports.crearRemitoDesdeCalendario = async (req, res) => {
  const { id_cotizacion } = req.params;
  const { ids_calendario, observaciones } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que la cotización existe
      const cotizacion = await tx.cotizacion.findUnique({
        where: { id_cotizacion: parseInt(id_cotizacion) },
        include: {
          cliente: true
        }
      });

      if (!cotizacion) {
        throw new Error('Cotización no encontrada');
      }

      // Obtener elementos del calendario con información de stock
      const calendarioItems = await tx.calendarioVacunacion.findMany({
        where: {
          id_calendario: {
            in: ids_calendario.map(id => parseInt(id))
          },
          id_cotizacion: parseInt(id_cotizacion)
        },
        include: {
          producto: true,
          stock_vacuna: true
        }
      });

      if (calendarioItems.length === 0) {
        throw new Error('No se encontraron elementos del calendario válidos');
      }

      // Generar número de remito único
      let numeroRemito;
      let numeroExiste = true;
      
      while (numeroExiste) {
        numeroRemito = generarNumeroRemito();
        const existente = await tx.remito.findUnique({
          where: { numero_remito: numeroRemito }
        });
        numeroExiste = !!existente;
      }

      // Calcular precio total (si es necesario)
      const precioTotal = calendarioItems.reduce((total, item) => {
        const precio = item.producto?.precio_unitario || 0;
        return total + (precio * item.cantidad_dosis);
      }, 0);

      // Crear el remito
      const remito = await tx.remito.create({
        data: {
          numero_remito: numeroRemito,
          id_cotizacion: parseInt(id_cotizacion),
          id_cliente: cotizacion.id_cliente,
          fecha_emision: new Date(),
          tipo_remito: 'plan_vacunal',
          estado_remito: 'pendiente',
          precio_total: precioTotal,
          observaciones: observaciones || 'Remito generado automáticamente desde calendario de vacunación',
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear detalles del remito con información de lotes
      const detallesData = calendarioItems.map(item => {
        const stockInfo = item.stock_vacuna;
        return {
          id_remito: remito.id_remito,
          id_producto: item.id_producto,
          cantidad_entregada: item.cantidad_dosis,
          precio_unitario: item.producto?.precio_unitario || 0,
          subtotal: (item.producto?.precio_unitario || 0) * item.cantidad_dosis,
          lote_producto: stockInfo?.lote || item.lote_asignado || null,
          fecha_vencimiento: stockInfo?.fecha_vencimiento || item.fecha_vencimiento_lote || null,
          observaciones: `Semana ${item.numero_semana} - Fecha programada: ${item.fecha_programada.toISOString().split('T')[0]}`
        };
      });

      await tx.detalleRemito.createMany({
        data: detallesData
      });

      // Registrar movimientos de stock para cada lote
      for (const item of calendarioItems) {
        if (item.id_stock_vacuna) {
          await tx.movimientoStockVacuna.create({
            data: {
              id_stock_vacuna: item.id_stock_vacuna,
              tipo_movimiento: 'egreso',
              cantidad: item.cantidad_dosis,
              stock_anterior: item.stock_vacuna?.stock_reservado || 0,
              stock_posterior: Math.max(0, (item.stock_vacuna?.stock_reservado || 0) - item.cantidad_dosis),
              motivo: `Entrega por remito ${numeroRemito}`,
              observaciones: `Calendario ID: ${item.id_calendario}, Semana: ${item.numero_semana}`,
              id_cotizacion: parseInt(id_cotizacion),
              id_calendario: item.id_calendario
            }
          });

          // Actualizar stock reservado
          await tx.stockVacuna.update({
            where: { id_stock_vacuna: item.id_stock_vacuna },
            data: {
              stock_reservado: {
                decrement: item.cantidad_dosis
              }
            }
          });
        }
      }

      return {
        ...remito,
        detalles: detallesData,
        items_calendario: calendarioItems.length
      };
    });

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Remito creado exitosamente desde calendario',
      data: {
        id_remito: resultado.id_remito,
        numero_remito: resultado.numero_remito,
        estado_remito: resultado.estado_remito,
        items_procesados: resultado.items_calendario
      }
    });

  } catch (error) {
    console.error('Error al crear remito desde calendario:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear el remito'
    });
  }
};

/**
 * Crear un remito desde una venta directa
 */
exports.crearRemitoDesdeVentaDirecta = async (req, res) => {
  const { id_venta_directa } = req.params;
  const { observaciones } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que la venta directa existe
      const ventaDirecta = await tx.ventaDirecta.findUnique({
        where: { id_venta_directa: parseInt(id_venta_directa) },
        include: {
          cliente: true,
          detalle_venta: {
            include: { producto: true }
          }
        }
      });

      if (!ventaDirecta) {
        throw new Error('Venta directa no encontrada');
      }

      // Verificar que no tenga ya un remito
      const remitoExistente = await tx.remito.findFirst({
        where: { id_venta_directa: parseInt(id_venta_directa) }
      });

      if (remitoExistente) {
        throw new Error('Esta venta directa ya tiene un remito generado');
      }

      // Preparar productos para validación
      const productos = ventaDirecta.detalle_venta.map(detalle => ({
        id_producto: detalle.id_producto,
        cantidad_entregada: detalle.cantidad,
        precio_unitario: detalle.precio_unitario
      }));

      // Validar stock disponible
      await validarStock(productos, tx);

      // Generar número de remito único
      let numeroRemito;
      let numeroExiste = true;
      
      while (numeroExiste) {
        numeroRemito = generarNumeroRemito();
        const existente = await tx.remito.findUnique({
          where: { numero_remito: numeroRemito }
        });
        numeroExiste = !!existente;
      }

      // Crear el remito
      const remito = await tx.remito.create({
        data: {
          numero_remito: numeroRemito,
          id_venta_directa: parseInt(id_venta_directa),
          id_cliente: ventaDirecta.id_cliente,
          fecha_emision: new Date(),
          tipo_remito: 'venta_directa',
          estado_remito: 'pendiente',
          precio_total: ventaDirecta.precio_total,
          observaciones,
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear detalles del remito desde la venta directa
      const detallesData = ventaDirecta.detalle_venta.map(detalle => ({
        id_remito: remito.id_remito,
        id_producto: detalle.id_producto,
        cantidad_entregada: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        subtotal: detalle.subtotal,
        observaciones: detalle.observaciones
      }));

      await tx.detalleRemito.createMany({
        data: detallesData
      });

      // Actualizar stock de productos
      await actualizarStock(productos, tx);

      return remito;
    });

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Remito creado exitosamente desde venta directa',
      data: {
        id_remito: resultado.id_remito,
        numero_remito: resultado.numero_remito,
        estado_remito: resultado.estado_remito
      }
    });

  } catch (error) {
    console.error('Error al crear remito desde venta directa:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear el remito'
    });
  }
};

/**
 * Obtener todos los remitos con filtros
 */
exports.obtenerRemitos = async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    estado_remito, 
    tipo_remito, 
    id_cliente,
    fecha_desde,
    fecha_hasta 
  } = req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir filtros
    const where = {};
    
    if (estado_remito) where.estado_remito = estado_remito;
    if (tipo_remito) where.tipo_remito = tipo_remito;
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_emision = {};
      if (fecha_desde) where.fecha_emision.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_emision.lte = new Date(fecha_hasta);
    }

    // Obtener remitos con paginación
    const [remitos, total] = await Promise.all([
      prisma.remito.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              cuit: true
            }
          },
          cotizacion: {
            select: {
              id_cotizacion: true,
              numero_cotizacion: true
            }
          },
          venta_directa: {
            select: {
              id_venta_directa: true,
              numero_venta: true
            }
          },
          detalle_remito: {
            include: {
              producto: {
                select: {
                  id_producto: true,
                  nombre: true,
                  descripcion: true
                }
              }
            }
          }
        },
        orderBy: {
          fecha_emision: 'desc'
        }
      }),
      prisma.remito.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        remitos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener remitos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de remitos'
    });
  }
};

/**
 * Obtener un remito por ID
 */
exports.obtenerRemitoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const remito = await prisma.remito.findUnique({
      where: { id_remito: parseInt(id) },
      include: {
        cliente: true,
        cotizacion: {
          include: {
            plan: {
              select: {
                nombre: true,
                descripcion: true
              }
            }
          }
        },
        venta_directa: true,
        detalle_remito: {
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
                descripcion: true,
                tipo_producto: true
              }
            }
          }
        }
      }
    });

    if (!remito) {
      return res.status(404).json({
        success: false,
        message: 'Remito no encontrado'
      });
    }

    res.json({
      success: true,
      data: remito
    });

  } catch (error) {
    console.error('Error al obtener remito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el remito'
    });
  }
};

/**
 * Actualizar estado de un remito
 */
exports.actualizarEstadoRemito = async (req, res) => {
  const { id } = req.params;
  const { estado_remito, fecha_entrega, observaciones } = req.body;

  try {
    // Validar estado
    const estadosValidos = ['pendiente', 'preparando', 'listo_entrega', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado_remito)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de remito no válido'
      });
    }

    const updateData = {
      estado_remito,
      updated_at: new Date()
    };

    if (observaciones) updateData.observaciones = observaciones;
    if (fecha_entrega) updateData.fecha_entrega = new Date(fecha_entrega);

    const remito = await prisma.remito.update({
      where: { id_remito: parseInt(id) },
      data: updateData,
      include: {
        cliente: {
          select: { nombre: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Estado del remito actualizado exitosamente',
      data: {
        id_remito: remito.id_remito,
        numero_remito: remito.numero_remito,
        estado_remito: remito.estado_remito,
        cliente: remito.cliente.nombre
      }
    });

  } catch (error) {
    console.error('Error al actualizar estado del remito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del remito'
    });
  }
};

/**
 * Obtener remitos por cliente
 */
exports.obtenerRemitosPorCliente = async (req, res) => {
  const { id_cliente } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [remitos, total] = await Promise.all([
      prisma.remito.findMany({
        where: { id_cliente: parseInt(id_cliente) },
        skip,
        take: parseInt(limit),
        include: {
          cotizacion: {
            select: {
              numero_cotizacion: true,
              plan: {
                select: { nombre: true }
              }
            }
          },
          venta_directa: {
            select: { numero_venta: true }
          },
          detalle_remito: {
            include: {
              producto: {
                select: {
                  nombre: true,
                  tipo_producto: true
                }
              }
            }
          }
        },
        orderBy: {
          fecha_emision: 'desc'
        }
      }),
      prisma.remito.count({
        where: { id_cliente: parseInt(id_cliente) }
      })
    ]);

    res.json({
      success: true,
      data: {
        remitos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener remitos del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los remitos del cliente'
    });
  }
};

/**
 * Generar PDF del remito (placeholder - requerirá librería como puppeteer)
 */
exports.generarPDFRemito = async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener datos completos del remito
    const remito = await prisma.remito.findUnique({
      where: { id_remito: parseInt(id) },
      include: {
        cliente: true,
        cotizacion: {
          include: {
            plan: true
          }
        },
        venta_directa: true,
        detalle_remito: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!remito) {
      return res.status(404).json({
        success: false,
        message: 'Remito no encontrado'
      });
    }

    // TODO: Implementar generación de PDF con puppeteer o similar
    // Por ahora devolvemos los datos estructurados para el PDF
    res.json({
      success: true,
      message: 'Datos del remito para PDF',
      data: {
        remito,
        // Estructura para template PDF
        header: {
          empresa: 'Logística TV',
          titulo: 'REMITO',
          numero: remito.numero_remito,
          fecha: remito.fecha_emision
        },
        cliente: remito.cliente,
        detalle: remito.detalle_remito,
        totales: {
          cantidad_items: remito.detalle_remito.length,
          precio_total: remito.precio_total
        }
      }
    });

  } catch (error) {
    console.error('Error al generar PDF del remito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el PDF del remito'
    });
  }
};

/**
 * Obtener estadísticas de remitos
 */
exports.obtenerEstadisticasRemitos = async (req, res) => {
  try {
    const [
      totalRemitos,
      remitosPendientes,
      remitosEntregados,
      remitosPorTipo,
      remitosPorMes
    ] = await Promise.all([
      prisma.remito.count(),
      prisma.remito.count({ where: { estado_remito: 'pendiente' } }),
      prisma.remito.count({ where: { estado_remito: 'entregado' } }),
      prisma.remito.groupBy({
        by: ['tipo_remito'],
        _count: { id_remito: true }
      }),
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(fecha_emision, '%Y-%m') as mes,
          COUNT(*) as cantidad
        FROM remitos 
        WHERE fecha_emision >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(fecha_emision, '%Y-%m')
        ORDER BY mes
      `
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          total: totalRemitos,
          pendientes: remitosPendientes,
          entregados: remitosEntregados,
          en_proceso: totalRemitos - remitosPendientes - remitosEntregados
        },
        por_tipo: remitosPorTipo,
        por_mes: remitosPorMes
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de remitos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas'
    });
  }
};

module.exports = exports;