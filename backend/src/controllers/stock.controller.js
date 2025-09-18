const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

async function registrarMovimientoStock(
  idProducto, 
  tipoMovimiento, 
  cantidad, 
  motivo, 
  observaciones = null, 
  idCotizacion = null, 
  idUsuario = null
) {
  const producto = await prisma.producto.findUnique({
    where: { id_producto: idProducto }
  });

  if (!producto) {
    throw new Error('Producto no encontrado');
  }

  const stockAnterior = producto.stock || 0;
  const stockReservadoAnterior = producto.stock_reservado || 0;
  let stockPosterior = stockAnterior;
  let stockReservadoPosterior = stockReservadoAnterior;

  // Calcular nuevo stock según tipo de movimiento
  switch (tipoMovimiento) {
    case 'ingreso':
    case 'ajuste_positivo':
      stockPosterior = stockAnterior + cantidad;
      // stock_reservado no cambia
      break;
    case 'egreso':
    case 'ajuste_negativo':
      stockPosterior = stockAnterior - cantidad;
      // stock_reservado no cambia
      break;
    case 'reserva':
      // Para reservas: stock total NO cambia, solo aumenta stock_reservado
      stockPosterior = stockAnterior; // El stock total permanece igual
      stockReservadoPosterior = stockReservadoAnterior + cantidad;
      break;
    case 'liberacion_reserva':
      // Para liberación de reservas: stock total NO cambia, solo disminuye stock_reservado
      stockPosterior = stockAnterior; // El stock total permanece igual
      stockReservadoPosterior = Math.max(0, stockReservadoAnterior - cantidad);
      break;
    default:
      throw new Error('Tipo de movimiento no válido');
  }

  // Validar que el stock no quede negativo (excepto para ajustes y reservas)
  if (stockPosterior < 0 && !tipoMovimiento.includes('ajuste') && tipoMovimiento !== 'reserva' && tipoMovimiento !== 'liberacion_reserva') {
    throw new Error('Stock insuficiente para realizar el movimiento');
  }

  // Validar que hay suficiente stock disponible para reservar
  if (tipoMovimiento === 'reserva') {
    const stockDisponible = stockAnterior - stockReservadoAnterior;
    if (stockDisponible < cantidad) {
      throw new Error(`Stock insuficiente para reservar. Disponible: ${stockDisponible}, requerido: ${cantidad}`);
    }
  }

  // Crear movimiento y actualizar stock en transacción
  const resultado = await prisma.$transaction(async (tx) => {
    // Registrar movimiento
    const movimiento = await tx.movimientoStock.create({
      data: {
        id_producto: idProducto,
        tipo_movimiento: tipoMovimiento,
        cantidad: cantidad,
        stock_anterior: stockAnterior,
        stock_posterior: Math.max(0, stockPosterior),
        motivo: motivo,
        observaciones: observaciones,
        id_cotizacion: idCotizacion,
        id_usuario: idUsuario
      }
    });

    // Actualizar stock del producto
    await tx.producto.update({
      where: { id_producto: idProducto },
      data: {
        stock: Math.max(0, stockPosterior),
        stock_reservado: Math.max(0, stockReservadoPosterior),
        updated_at: new Date()
      }
    });

    return movimiento;
  });

  return resultado;
}

async function actualizarStockReservado(idProducto, cantidadCambio) {
  const producto = await prisma.producto.findUnique({
    where: { id_producto: idProducto }
  });

  if (!producto) {
    throw new Error('Producto no encontrado');
  }

  const nuevoStockReservado = Math.max(0, (producto.stock_reservado || 0) + cantidadCambio);

  await prisma.producto.update({
    where: { id_producto: idProducto },
    data: {
      stock_reservado: nuevoStockReservado,
      updated_at: new Date()
    }
  });

  return nuevoStockReservado;
}

// ===== ENDPOINTS PRINCIPALES =====

exports.getMovimientosStock = async (req, res) => {
  try {
    const { 
      id_producto, 
      tipo_movimiento, 
      fecha_desde, 
      fecha_hasta,
      id_cotizacion 
    } = req.query;
    
    let whereClause = {};
    
    if (id_producto) {
      whereClause.id_producto = parseInt(id_producto);
    }
    
    if (tipo_movimiento) {
      whereClause.tipo_movimiento = tipo_movimiento;
    }
    
    if (id_cotizacion) {
      whereClause.id_cotizacion = parseInt(id_cotizacion);
    }
    
    if (fecha_desde && fecha_hasta) {
      whereClause.created_at = {
        gte: new Date(fecha_desde + 'T00:00:00.000Z'),
        lte: new Date(fecha_hasta + 'T23:59:59.999Z')
      };
    }

    const movimientos = await prisma.movimientoStock.findMany({
      where: whereClause,
      include: {
        producto: {
          select: {
            nombre: true,
            descripcion: true
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        },
        cotizacion: {
          select: {
            numero_cotizacion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Formatear respuesta
    const movimientosFormatted = movimientos.map(mov => ({
      ...mov,
      id_movimiento: Number(mov.id_movimiento),
      id_producto: Number(mov.id_producto),
      nombre_producto: mov.producto.nombre,
      usuario_nombre: mov.usuario?.nombre || null,
      numero_cotizacion: mov.cotizacion?.numero_cotizacion || null,
      cliente_nombre: mov.cotizacion?.cliente?.nombre || null
    }));

    res.json(movimientosFormatted);
  } catch (error) {
    console.error('Error al obtener movimientos de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.registrarMovimiento = async (req, res) => {
  try {
    const { 
      id_producto, 
      tipo_movimiento, 
      cantidad, 
      motivo, 
      observaciones 
    } = req.body;

    // Validaciones
    if (!id_producto || !tipo_movimiento || !cantidad || !motivo) {
      return res.status(400).json({ 
        error: 'Producto, tipo de movimiento, cantidad y motivo son obligatorios' 
      });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser mayor a cero' 
      });
    }

    const tiposValidos = ['ingreso', 'egreso', 'ajuste_positivo', 'ajuste_negativo'];
    if (!tiposValidos.includes(tipo_movimiento)) {
      return res.status(400).json({ 
        error: 'Tipo de movimiento no válido' 
      });
    }

    // Registrar movimiento
    const movimiento = await registrarMovimientoStock(
      parseInt(id_producto),
      tipo_movimiento,
      parseInt(cantidad),
      motivo,
      observaciones,
      null,
      req.user?.id_usuario || null
    );

    res.status(201).json({
      message: 'Movimiento de stock registrado exitosamente',
      movimiento: {
        ...movimiento,
        id_movimiento: Number(movimiento.id_movimiento),
        id_producto: Number(movimiento.id_producto)
      }
    });
  } catch (error) {
    console.error('Error al registrar movimiento de stock:', error);
    
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'Stock insuficiente para realizar el movimiento') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getEstadoStock = async (req, res) => {
  try {
    const { requiere_control_stock, tipo_producto } = req.query;
    
    // Construir filtros
    let whereClause = {};
    
    if (requiere_control_stock !== undefined) {
      whereClause.requiere_control_stock = requiere_control_stock === 'true';
    }
    
    if (tipo_producto) {
      whereClause.tipo_producto = tipo_producto;
    }

    // Obtener productos
    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: {
        id_producto: true,
        nombre: true,
        descripcion: true,
        stock: true,
        stock_minimo: true,
        requiere_control_stock: true,
        tipo_producto: true,
        proveedores: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Obtener todas las cotizaciones activas con sus detalles del PLAN ORIGINAL
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
        }
      },
      include: {
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: {
                  select: {
                    id_producto: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Calcular stock afectado por producto y estado usando datos del PLAN ORIGINAL
    const stockAfectadoPorProducto = {};
    
    cotizacionesActivas.forEach(cotizacion => {
      // Usar productos del plan original en lugar del detalle de cotización
      cotizacion.plan.productos_plan.forEach(planProducto => {
        const idProducto = planProducto.id_producto;
        const dosisNecesarias = planProducto.cantidad_total * planProducto.dosis_por_semana;
        
        if (!stockAfectadoPorProducto[idProducto]) {
          stockAfectadoPorProducto[idProducto] = {
            reservado: 0,    // en_proceso + enviada
            afectado: 0,     // aceptada
            faltante: 0      // cantidad que excede el stock disponible
          };
        }
        
        if (cotizacion.estado === 'en_proceso' || cotizacion.estado === 'enviada') {
          stockAfectadoPorProducto[idProducto].reservado += dosisNecesarias;
        } else if (cotizacion.estado === 'aceptada') {
          stockAfectadoPorProducto[idProducto].afectado += dosisNecesarias;
        }
      });
    });

    // Calcular stock disponible y faltante para cada producto
    const estadoStock = productos.map(producto => {
      const stock = producto.stock || 0;
      const stockMinimo = producto.stock_minimo || 0;
      const idProducto = producto.id_producto;
      
      const afectacion = stockAfectadoPorProducto[idProducto] || {
        reservado: 0,
        afectado: 0,
        faltante: 0
      };
      
      // Calcular totales
      const totalReservado = afectacion.reservado;
      const totalAfectado = afectacion.afectado;
      const totalComprometido = totalReservado + totalAfectado;
      
      // Calcular stock disponible
      const stockDisponible = Math.max(0, stock - totalComprometido);
      
      // Calcular faltante (solo si el stock total es insuficiente)
      let faltante = 0;
      if (totalComprometido > stock) {
        faltante = totalComprometido - stock;
      }
      
      // Determinar estado del stock
      let estado = 'normal';
      if (stock <= 0) {
        estado = 'critico';
      } else if (faltante > 0) {
        estado = 'critico';
      } else if (stock <= stockMinimo) {
        estado = stockDisponible <= 0 ? 'critico' : 'bajo';
      } else if (stockDisponible <= stockMinimo) {
        estado = 'bajo';
      }

      return {
        id_producto: Number(producto.id_producto),
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        stock: stock,
        stock_minimo: stockMinimo,
        stock_reservado: totalReservado,     // Para cotizaciones en proceso/enviadas
        stock_afectado: totalAfectado,       // Para cotizaciones aceptadas
        stock_disponible: stockDisponible,
        stock_faltante: faltante,            // Cantidad que excede el stock disponible
        estado_stock: estado,
        requiere_control_stock: producto.requiere_control_stock,
        tipo_producto: producto.tipo_producto,
        proveedor_nombre: producto.proveedores?.nombre || null
      };
    });

    res.json(estadoStock);
  } catch (error) {
    console.error('Error al obtener estado de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getAlertasStock = async (req, res) => {
  try {
    const { tipo_alerta, tipo_producto } = req.query;

    // Construir filtros
    let whereClause = {
      requiere_control_stock: true
    };
    
    if (tipo_producto) {
      whereClause.tipo_producto = tipo_producto;
    }

    // Obtener productos con stock bajo o sin stock
    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: {
        id_producto: true,
        nombre: true,
        descripcion: true,
        stock: true,
        stock_minimo: true,
        stock_reservado: true,
        tipo_producto: true,
        proveedores: {
          select: {
            nombre: true
          }
        }
      }
    });

    const alertas = [];

    productos.forEach(producto => {
      const stock = producto.stock || 0;
      const stockReservado = producto.stock_reservado || 0;
      const stockMinimo = producto.stock_minimo || 0;
      const stockDisponible = stock - stockReservado;

      // Alerta de stock bajo
      if (stock > 0 && stock <= stockMinimo) {
        alertas.push({
          id_producto: Number(producto.id_producto),
          nombre: producto.nombre,
          tipo_alerta: 'stock_bajo',
          mensaje: `Stock bajo: ${stock} unidades (mínimo: ${stockMinimo})`,
          severidad: 'warning',
          stock: stock,
          stock_minimo: stockMinimo,
          stock_disponible: stockDisponible,
          proveedor_nombre: producto.proveedores?.nombre || null
        });
      }

      // Alerta de sin stock
      if (stock <= 0) {
        alertas.push({
          id_producto: Number(producto.id_producto),
          nombre: producto.nombre,
          tipo_alerta: 'sin_stock',
          mensaje: `Sin stock disponible`,
          severidad: 'error',
          stock: stock,
          stock_minimo: stockMinimo,
          stock_disponible: stockDisponible,
          proveedor_nombre: producto.proveedores?.nombre || null
        });
      }

      // Alerta de stock totalmente reservado
      if (stock > 0 && stockDisponible <= 0) {
        alertas.push({
          id_producto: Number(producto.id_producto),
          nombre: producto.nombre,
          tipo_alerta: 'stock_reservado',
          mensaje: `Stock totalmente reservado: ${stockReservado} de ${stock} unidades`,
          severidad: 'warning',
          stock: stock,
          stock_reservado: stockReservado,
          stock_disponible: stockDisponible,
          proveedor_nombre: producto.proveedores?.nombre || null
        });
      }
    });

    // Filtrar por tipo de alerta si se especifica
    let alertasFiltradas = alertas;
    if (tipo_alerta) {
      alertasFiltradas = alertas.filter(alerta => alerta.tipo_alerta === tipo_alerta);
    }

    // Ordenar por severidad (error primero, luego warning)
    alertasFiltradas.sort((a, b) => {
      if (a.severidad === 'error' && b.severidad === 'warning') return -1;
      if (a.severidad === 'warning' && b.severidad === 'error') return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    res.json({
      total_alertas: alertasFiltradas.length,
      alertas_criticas: alertasFiltradas.filter(a => a.severidad === 'error').length,
      alertas_warning: alertasFiltradas.filter(a => a.severidad === 'warning').length,
      alertas: alertasFiltradas
    });
  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getReservasStock = async (req, res) => {
  try {
    const { 
      id_producto, 
      id_cotizacion, 
      estado_reserva 
    } = req.query;
    
    let whereClause = {};
    
    if (id_producto) {
      whereClause.id_producto = parseInt(id_producto);
    }
    
    if (id_cotizacion) {
      whereClause.id_cotizacion = parseInt(id_cotizacion);
    }
    
    if (estado_reserva) {
      whereClause.estado_reserva = estado_reserva;
    }

    const reservas = await prisma.reservaStock.findMany({
      where: whereClause,
      include: {
        producto: {
          select: {
            nombre: true,
            descripcion: true
          }
        },
        cotizacion: {
          select: {
            numero_cotizacion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Formatear respuesta
    const reservasFormatted = reservas.map(reserva => ({
      ...reserva,
      id_reserva: Number(reserva.id_reserva),
      id_producto: Number(reserva.id_producto),
      id_cotizacion: Number(reserva.id_cotizacion),
      nombre_producto: reserva.producto.nombre,
      numero_cotizacion: reserva.cotizacion.numero_cotizacion,
      cliente_nombre: reserva.cotizacion.cliente.nombre
    }));

    res.json(reservasFormatted);
  } catch (error) {
    console.error('Error al obtener reservas de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.reservarStock = async (req, res) => {
  try {
    const { 
      id_producto, 
      id_cotizacion, 
      cantidad_reservada, 
      fecha_vencimiento,
      motivo,
      observaciones 
    } = req.body;

    // Validaciones
    if (!id_producto || !id_cotizacion || !cantidad_reservada || !motivo) {
      return res.status(400).json({ 
        error: 'Producto, cotización, cantidad y motivo son obligatorios' 
      });
    }

    if (cantidad_reservada <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad a reservar debe ser mayor a cero' 
      });
    }

    // Verificar disponibilidad
    const producto = await prisma.producto.findUnique({
      where: { id_producto: parseInt(id_producto) }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
    
    if (stockDisponible < cantidad_reservada) {
      return res.status(400).json({ 
        error: `Stock insuficiente. Disponible: ${stockDisponible}, solicitado: ${cantidad_reservada}` 
      });
    }

    // Crear reserva y actualizar stock reservado en transacción
    const reserva = await prisma.$transaction(async (tx) => {
      // Crear reserva
      const nuevaReserva = await tx.reservaStock.create({
        data: {
          id_producto: parseInt(id_producto),
          id_cotizacion: parseInt(id_cotizacion),
          cantidad_reservada: parseInt(cantidad_reservada),
          fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
          motivo: motivo,
          observaciones: observaciones || '',
          created_by: req.user?.id_usuario || null
        }
      });

      // Actualizar stock reservado
      await actualizarStockReservado(parseInt(id_producto), parseInt(cantidad_reservada));

      // Registrar movimiento de stock
      await registrarMovimientoStock(
        parseInt(id_producto),
        'reserva',
        parseInt(cantidad_reservada),
        `Reserva para cotización: ${motivo}`,
        observaciones,
        parseInt(id_cotizacion),
        req.user?.id_usuario || null
      );

      return nuevaReserva;
    });

    res.status(201).json({
      message: 'Stock reservado exitosamente',
      reserva: {
        ...reserva,
        id_reserva: Number(reserva.id_reserva),
        id_producto: Number(reserva.id_producto),
        id_cotizacion: Number(reserva.id_cotizacion)
      }
    });
  } catch (error) {
    console.error('Error al reservar stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.liberarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, observaciones } = req.body;

    // Verificar que la reserva existe y está activa
    const reserva = await prisma.reservaStock.findUnique({
      where: { id_reserva: parseInt(id) }
    });

    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (reserva.estado_reserva !== 'activa') {
      return res.status(400).json({ 
        error: 'Solo se pueden liberar reservas activas' 
      });
    }

    // Liberar reserva en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar estado de reserva
      await tx.reservaStock.update({
        where: { id_reserva: parseInt(id) },
        data: {
          estado_reserva: 'liberada',
          fecha_liberacion: new Date(),
          observaciones: observaciones || reserva.observaciones,
          updated_by: req.user?.id_usuario || null,
          updated_at: new Date()
        }
      });

      // Actualizar stock reservado
      await actualizarStockReservado(reserva.id_producto, -reserva.cantidad_reservada);

      // Registrar movimiento de stock
      await registrarMovimientoStock(
        reserva.id_producto,
        'liberacion_reserva',
        reserva.cantidad_reservada,
        motivo || 'Liberación manual de reserva',
        observaciones,
        reserva.id_cotizacion,
        req.user?.id_usuario || null
      );
    });

    res.json({
      message: 'Reserva liberada exitosamente'
    });
  } catch (error) {
    console.error('Error al liberar reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.verificarDisponibilidadCotizacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener cotización con detalles
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        detalle_cotizacion: {
          include: {
            producto: {
              select: {
                nombre: true,
                stock: true,
                stock_reservado: true,
                requiere_control_stock: true
              }
            }
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const verificacion = [];
    let disponibilidadCompleta = true;

    for (const detalle of cotizacion.detalle_cotizacion) {
      const producto = detalle.producto;
      const cantidadRequerida = detalle.cantidad_total;
      
      if (producto.requiere_control_stock) {
        const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
        const disponible = stockDisponible >= cantidadRequerida;
        
        if (!disponible) {
          disponibilidadCompleta = false;
        }

        verificacion.push({
          id_producto: Number(detalle.id_producto),
          nombre_producto: producto.nombre,
          cantidad_requerida: cantidadRequerida,
          stock_actual: producto.stock || 0,
          stock_reservado: producto.stock_reservado || 0,
          stock_disponible: stockDisponible,
          disponible: disponible,
          faltante: disponible ? 0 : cantidadRequerida - stockDisponible
        });
      } else {
        verificacion.push({
          id_producto: Number(detalle.id_producto),
          nombre_producto: producto.nombre,
          cantidad_requerida: cantidadRequerida,
          stock_actual: 'N/A',
          stock_reservado: 'N/A',
          stock_disponible: 'N/A',
          disponible: true,
          faltante: 0,
          observaciones: 'Producto sin control de stock'
        });
      }
    }

    res.json({
      id_cotizacion: Number(cotizacion.id_cotizacion),
      numero_cotizacion: cotizacion.numero_cotizacion,
      disponibilidad_completa: disponibilidadCompleta,
      productos_verificados: verificacion.length,
      productos_disponibles: verificacion.filter(v => v.disponible).length,
      productos_faltantes: verificacion.filter(v => !v.disponible).length,
      detalle_verificacion: verificacion
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getResumenStock = async (req, res) => {
  try {
    const { idProducto } = req.params;

    const producto = await prisma.producto.findUnique({
      where: { id_producto: parseInt(idProducto) }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Obtener movimientos recientes (últimos 30 días)
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - 30);

    const movimientos = await prisma.movimientoStock.findMany({
      where: {
        id_producto: parseInt(idProducto),
        fecha_movimiento: {
          gte: fechaDesde
        }
      },
      orderBy: {
        fecha_movimiento: 'desc'
      },
      take: 10,
      include: {
        usuario: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      }
    });

    // Obtener reservas activas
    const reservasActivas = await prisma.reservaStock.findMany({
      where: {
        id_producto: parseInt(idProducto),
        estado_reserva: 'activa'
      },
      include: {
        cotizacion: {
          select: {
            numero_cotizacion: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        },
        usuario_creador: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      }
    });

    // Calcular estadísticas
    const stockActual = producto.stock || 0;
    const stockReservado = producto.stock_reservado || 0;
    const stockDisponible = stockActual - stockReservado;

    const movimientosEntrada = movimientos.filter(m => 
      ['entrada', 'ajuste_positivo', 'devolucion'].includes(m.tipo_movimiento)
    );
    const movimientosSalida = movimientos.filter(m => 
      ['salida', 'ajuste_negativo', 'reserva'].includes(m.tipo_movimiento)
    );

    const totalEntradas = movimientosEntrada.reduce((sum, m) => sum + m.cantidad, 0);
    const totalSalidas = movimientosSalida.reduce((sum, m) => sum + m.cantidad, 0);

    res.json({
      producto: {
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        requiere_control_stock: producto.requiere_control_stock,
        stock_minimo: producto.stock_minimo,
        stock_maximo: producto.stock_maximo
      },
      stock: {
        actual: stockActual,
        reservado: stockReservado,
        disponible: stockDisponible,
        porcentaje_disponible: stockActual > 0 ? ((stockDisponible / stockActual) * 100).toFixed(2) : 0
      },
      alertas: {
        stock_bajo: producto.stock_minimo && stockDisponible <= producto.stock_minimo,
        stock_critico: producto.stock_minimo && stockDisponible <= (producto.stock_minimo * 0.5),
        sobre_stock: producto.stock_maximo && stockActual >= producto.stock_maximo
      },
      movimientos_recientes: movimientos.map(m => ({
        id_movimiento: m.id_movimiento,
        tipo_movimiento: m.tipo_movimiento,
        cantidad: m.cantidad,
        stock_anterior: m.stock_anterior,
        stock_posterior: m.stock_posterior,
        motivo: m.motivo,
        fecha_movimiento: m.fecha_movimiento,
        usuario: m.usuario ? `${m.usuario.nombre} ${m.usuario.apellido}` : 'Sistema'
      })),
      reservas_activas: reservasActivas.map(r => ({
        id_reserva: r.id_reserva,
        cantidad_reservada: r.cantidad_reservada,
        fecha_reserva: r.fecha_reserva,
        motivo: r.motivo,
        cotizacion: r.cotizacion?.numero_cotizacion,
        cliente: r.cotizacion?.cliente?.nombre,
        usuario_creador: r.usuario_creador ? `${r.usuario_creador.nombre} ${r.usuario_creador.apellido}` : 'Sistema'
      })),
      estadisticas_periodo: {
        dias_analizados: 30,
        total_movimientos: movimientos.length,
        total_entradas: totalEntradas,
        total_salidas: totalSalidas,
        movimiento_neto: totalEntradas - totalSalidas,
        reservas_activas: reservasActivas.length,
        cantidad_total_reservada: reservasActivas.reduce((sum, r) => sum + r.cantidad_reservada, 0)
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
