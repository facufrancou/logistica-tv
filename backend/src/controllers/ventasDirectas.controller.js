const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

function generarNumeroVenta() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `VD-${year}${month}${day}-${random}`;
}

async function validarStockParaVenta(productos, tx = prisma) {
  const validaciones = [];
  
  for (const item of productos) {
    const producto = await tx.producto.findUnique({
      where: { id_producto: item.id_producto },
      select: { 
        stock: true, 
        nombre: true, 
        requiere_control_stock: true,
        precio_unitario: true
      }
    });

    if (!producto) {
      throw new Error(`Producto con ID ${item.id_producto} no encontrado`);
    }

    if (producto.requiere_control_stock && producto.stock < item.cantidad) {
      throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`);
    }

    validaciones.push({
      ...item,
      precio_unitario: item.precio_unitario || producto.precio_unitario,
      nombre_producto: producto.nombre
    });
  }

  return validaciones;
}

async function calcularTotalVenta(productos) {
  return productos.reduce((total, producto) => {
    return total + (producto.precio_unitario * producto.cantidad);
  }, 0);
}

// ===== CONTROLADORES PRINCIPALES =====

/**
 * Crear una nueva venta directa
 */
exports.crearVentaDirecta = async (req, res) => {
  const { id_cliente, productos, observaciones } = req.body;

  try {
    // Validaciones básicas
    if (!id_cliente) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido'
      });
    }

    if (!productos || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un producto'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que el cliente existe
      const cliente = await tx.cliente.findUnique({
        where: { id_cliente: parseInt(id_cliente) },
        select: { id_cliente: true, nombre: true, bloqueado: true }
      });

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      if (cliente.bloqueado) {
        throw new Error('El cliente está bloqueado y no puede realizar compras');
      }

      // Validar stock y precios
      const productosValidados = await validarStockParaVenta(productos, tx);
      
      // Calcular total
      const precioTotal = await calcularTotalVenta(productosValidados);

      // Generar número de venta único
      let numeroVenta;
      let numeroExiste = true;
      
      while (numeroExiste) {
        numeroVenta = generarNumeroVenta();
        const existente = await tx.ventaDirecta.findUnique({
          where: { numero_venta: numeroVenta }
        });
        numeroExiste = !!existente;
      }

      // Crear la venta directa
      const ventaDirecta = await tx.ventaDirecta.create({
        data: {
          numero_venta: numeroVenta,
          id_cliente: parseInt(id_cliente),
          fecha_venta: new Date(),
          precio_total: precioTotal,
          estado_venta: 'pendiente',
          observaciones,
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear detalles de la venta
      const detallesData = productosValidados.map(producto => ({
        id_venta_directa: ventaDirecta.id_venta_directa,
        id_producto: producto.id_producto,
        cantidad: producto.cantidad,
        precio_unitario: producto.precio_unitario,
        subtotal: producto.precio_unitario * producto.cantidad,
        observaciones: producto.observaciones || null
      }));

      await tx.detalleVentaDirecta.createMany({
        data: detallesData
      });

      return { ventaDirecta, detalles: detallesData };
    });

    res.status(201).json({
      success: true,
      message: 'Venta directa creada exitosamente',
      data: {
        id_venta_directa: resultado.ventaDirecta.id_venta_directa,
        numero_venta: resultado.ventaDirecta.numero_venta,
        precio_total: resultado.ventaDirecta.precio_total,
        cantidad_productos: resultado.detalles.length
      }
    });

  } catch (error) {
    console.error('Error al crear venta directa:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear la venta directa'
    });
  }
};

/**
 * Obtener todas las ventas directas con filtros
 */
exports.obtenerVentasDirectas = async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    estado_venta, 
    id_cliente,
    fecha_desde,
    fecha_hasta 
  } = req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir filtros
    const where = {};
    
    if (estado_venta) where.estado_venta = estado_venta;
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_venta = {};
      if (fecha_desde) where.fecha_venta.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_venta.lte = new Date(fecha_hasta);
    }

    // Obtener ventas con paginación
    const [ventas, total] = await Promise.all([
      prisma.ventaDirecta.findMany({
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
          detalle_venta: {
            include: {
              producto: {
                select: {
                  id_producto: true,
                  nombre: true,
                  tipo_producto: true
                }
              }
            }
          },
          remitos: {
            select: {
              id_remito: true,
              numero_remito: true,
              estado_remito: true
            }
          }
        },
        orderBy: {
          fecha_venta: 'desc'
        }
      }),
      prisma.ventaDirecta.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        ventas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener ventas directas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de ventas directas'
    });
  }
};

/**
 * Obtener una venta directa por ID
 */
exports.obtenerVentaDirectaPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const ventaDirecta = await prisma.ventaDirecta.findUnique({
      where: { id_venta_directa: parseInt(id) },
      include: {
        cliente: true,
        detalle_venta: {
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
                descripcion: true,
                tipo_producto: true,
                stock: true
              }
            }
          }
        },
        remitos: {
          include: {
            detalle_remito: true
          }
        }
      }
    });

    if (!ventaDirecta) {
      return res.status(404).json({
        success: false,
        message: 'Venta directa no encontrada'
      });
    }

    res.json({
      success: true,
      data: ventaDirecta
    });

  } catch (error) {
    console.error('Error al obtener venta directa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la venta directa'
    });
  }
};

/**
 * Actualizar estado de una venta directa
 */
exports.actualizarEstadoVenta = async (req, res) => {
  const { id } = req.params;
  const { estado_venta, observaciones } = req.body;

  try {
    // Validar estado
    const estadosValidos = ['pendiente', 'confirmada', 'preparando', 'entregada', 'cancelada'];
    if (!estadosValidos.includes(estado_venta)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de venta no válido'
      });
    }

    const updateData = {
      estado_venta,
      updated_at: new Date()
    };

    if (observaciones) updateData.observaciones = observaciones;

    const ventaDirecta = await prisma.ventaDirecta.update({
      where: { id_venta_directa: parseInt(id) },
      data: updateData,
      include: {
        cliente: {
          select: { nombre: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Estado de la venta actualizado exitosamente',
      data: {
        id_venta_directa: ventaDirecta.id_venta_directa,
        numero_venta: ventaDirecta.numero_venta,
        estado_venta: ventaDirecta.estado_venta,
        cliente: ventaDirecta.cliente.nombre
      }
    });

  } catch (error) {
    console.error('Error al actualizar estado de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de la venta'
    });
  }
};

/**
 * Confirmar entrega y descontar stock
 */
exports.confirmarEntregaVenta = async (req, res) => {
  const { id } = req.params;
  const { observaciones_entrega } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener la venta directa
      const ventaDirecta = await tx.ventaDirecta.findUnique({
        where: { id_venta_directa: parseInt(id) },
        include: {
          detalle_venta: {
            include: {
              producto: true
            }
          }
        }
      });

      if (!ventaDirecta) {
        throw new Error('Venta directa no encontrada');
      }

      if (ventaDirecta.estado_venta === 'entregada') {
        throw new Error('Esta venta ya fue entregada');
      }

      if (ventaDirecta.estado_venta === 'cancelada') {
        throw new Error('No se puede entregar una venta cancelada');
      }

      // Validar stock actual antes de descontar
      for (const detalle of ventaDirecta.detalle_venta) {
        const producto = detalle.producto;
        if (producto.requiere_control_stock && producto.stock < detalle.cantidad) {
          throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Necesario: ${detalle.cantidad}`);
        }
      }

      // Descontar stock de cada producto
      for (const detalle of ventaDirecta.detalle_venta) {
        await tx.producto.update({
          where: { id_producto: detalle.id_producto },
          data: {
            stock: {
              decrement: detalle.cantidad
            }
          }
        });

        // Registrar movimiento de stock
        await tx.movimientoStock.create({
          data: {
            id_producto: detalle.id_producto,
            tipo_movimiento: 'salida',
            cantidad: detalle.cantidad,
            motivo: `Venta directa entregada - ${ventaDirecta.numero_venta}`,
            stock_anterior: detalle.producto.stock,
            stock_nuevo: detalle.producto.stock - detalle.cantidad,
            observaciones: observaciones_entrega || `Entrega venta directa ${ventaDirecta.numero_venta}`
          }
        });
      }

      // Actualizar estado de la venta
      const ventaActualizada = await tx.ventaDirecta.update({
        where: { id_venta_directa: parseInt(id) },
        data: {
          estado_venta: 'entregada',
          observaciones: observaciones_entrega ? 
            `${ventaDirecta.observaciones || ''}\nEntrega: ${observaciones_entrega}` :
            ventaDirecta.observaciones
        }
      });

      return ventaActualizada;
    });

    res.json({
      success: true,
      message: 'Entrega confirmada exitosamente',
      data: {
        id_venta_directa: resultado.id_venta_directa,
        numero_venta: resultado.numero_venta,
        estado_venta: resultado.estado_venta
      }
    });

  } catch (error) {
    console.error('Error al confirmar entrega:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al confirmar la entrega'
    });
  }
};

/**
 * Obtener ventas directas por cliente
 */
exports.obtenerVentasPorCliente = async (req, res) => {
  const { id_cliente } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [ventas, total] = await Promise.all([
      prisma.ventaDirecta.findMany({
        where: { id_cliente: parseInt(id_cliente) },
        skip,
        take: parseInt(limit),
        include: {
          detalle_venta: {
            include: {
              producto: {
                select: {
                  nombre: true,
                  tipo_producto: true
                }
              }
            }
          },
          remitos: {
            select: {
              numero_remito: true,
              estado_remito: true
            }
          }
        },
        orderBy: {
          fecha_venta: 'desc'
        }
      }),
      prisma.ventaDirecta.count({
        where: { id_cliente: parseInt(id_cliente) }
      })
    ]);

    res.json({
      success: true,
      data: {
        ventas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener ventas del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las ventas del cliente'
    });
  }
};

/**
 * Cancelar una venta directa
 */
exports.cancelarVenta = async (req, res) => {
  const { id } = req.params;
  const { motivo_cancelacion } = req.body;

  try {
    const ventaDirecta = await prisma.ventaDirecta.findUnique({
      where: { id_venta_directa: parseInt(id) },
      select: { estado_venta: true, numero_venta: true }
    });

    if (!ventaDirecta) {
      return res.status(404).json({
        success: false,
        message: 'Venta directa no encontrada'
      });
    }

    if (ventaDirecta.estado_venta === 'entregada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una venta ya entregada'
      });
    }

    if (ventaDirecta.estado_venta === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya está cancelada'
      });
    }

    const ventaActualizada = await prisma.ventaDirecta.update({
      where: { id_venta_directa: parseInt(id) },
      data: {
        estado_venta: 'cancelada',
        observaciones: motivo_cancelacion ? 
          `Cancelada: ${motivo_cancelacion}` : 
          'Venta cancelada'
      }
    });

    res.json({
      success: true,
      message: 'Venta cancelada exitosamente',
      data: {
        id_venta_directa: ventaActualizada.id_venta_directa,
        numero_venta: ventaActualizada.numero_venta,
        estado_venta: ventaActualizada.estado_venta
      }
    });

  } catch (error) {
    console.error('Error al cancelar venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la venta'
    });
  }
};

/**
 * Obtener productos disponibles para venta directa
 */
exports.obtenerProductosDisponibles = async (req, res) => {
  const { search, tipo_producto } = req.query;

  try {
    const where = {
      stock: { gt: 0 } // Solo productos con stock disponible
    };

    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { descripcion: { contains: search } }
      ];
    }

    if (tipo_producto) {
      where.tipo_producto = tipo_producto;
    }

    const productos = await prisma.producto.findMany({
      where,
      select: {
        id_producto: true,
        nombre: true,
        descripcion: true,
        tipo_producto: true,
        precio_unitario: true,
        stock: true,
        stock_minimo: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    res.json({
      success: true,
      data: productos.map(producto => ({
        ...producto,
        stock_disponible: producto.stock,
        alerta_stock_bajo: producto.stock <= (producto.stock_minimo || 0)
      }))
    });

  } catch (error) {
    console.error('Error al obtener productos disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los productos disponibles'
    });
  }
};

/**
 * Obtener estadísticas de ventas directas
 */
exports.obtenerEstadisticasVentas = async (req, res) => {
  try {
    const [
      totalVentas,
      ventasPendientes,
      ventasEntregadas,
      ventasPorMes,
      topProductos
    ] = await Promise.all([
      prisma.ventaDirecta.count(),
      prisma.ventaDirecta.count({ where: { estado_venta: 'pendiente' } }),
      prisma.ventaDirecta.count({ where: { estado_venta: 'entregada' } }),
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(fecha_venta, '%Y-%m') as mes,
          COUNT(*) as cantidad,
          SUM(precio_total) as total_ventas
        FROM ventas_directas 
        WHERE fecha_venta >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m')
        ORDER BY mes
      `,
      prisma.$queryRaw`
        SELECT 
          p.nombre,
          SUM(dvd.cantidad) as cantidad_vendida,
          SUM(dvd.subtotal) as total_vendido
        FROM detalle_ventas_directas dvd
        JOIN productos p ON dvd.id_producto = p.id_producto
        JOIN ventas_directas vd ON dvd.id_venta_directa = vd.id_venta_directa
        WHERE vd.estado_venta = 'entregada'
          AND vd.fecha_venta >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY p.id_producto, p.nombre
        ORDER BY cantidad_vendida DESC
        LIMIT 10
      `
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          total: totalVentas,
          pendientes: ventasPendientes,
          entregadas: ventasEntregadas,
          en_proceso: totalVentas - ventasPendientes - ventasEntregadas
        },
        por_mes: ventasPorMes,
        productos_mas_vendidos: topProductos
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas'
    });
  }
};

module.exports = exports;