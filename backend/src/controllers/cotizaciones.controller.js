const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

function generarNumeroCotizacion() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `COT-${year}${month}${day}-${random}`;
}

function calcularFechaProgramada(fechaInicio, numeroSemana) {
  const fecha = new Date(fechaInicio);
  fecha.setDate(fecha.getDate() + ((numeroSemana - 1) * 7));
  return fecha;
}

async function generarCalendarioVacunacion(cotizacionId, fechaInicio, productosDelPlan) {
  const calendarioItems = [];

  for (const planProducto of productosDelPlan) {
    const semanaInicio = planProducto.semana_inicio;
    const semanaFin = planProducto.semana_fin || semanaInicio;
    const dosisTotal = planProducto.cantidad_total;
    const dosisPorSemana = planProducto.dosis_por_semana;
    
    // Calcular cuántas semanas necesitamos para aplicar todas las dosis
    const semanasNecesarias = Math.ceil(dosisTotal / dosisPorSemana);
    const semanasFinal = Math.min(semanaFin, semanaInicio + semanasNecesarias - 1);

    for (let semana = semanaInicio; semana <= semanasFinal; semana++) {
      const dosisRestantes = dosisTotal - ((semana - semanaInicio) * dosisPorSemana);
      const dosisEnEstaSemana = Math.min(dosisPorSemana, dosisRestantes);

      if (dosisEnEstaSemana > 0) {
        calendarioItems.push({
          id_cotizacion: cotizacionId,
          id_producto: planProducto.id_producto,
          numero_semana: semana,
          fecha_programada: calcularFechaProgramada(fechaInicio, semana),
          cantidad_dosis: dosisEnEstaSemana,
          estado_dosis: 'pendiente'
        });
      }
    }
  }

  if (calendarioItems.length > 0) {
    await prisma.calendarioVacunacion.createMany({
      data: calendarioItems
    });
  }

  return calendarioItems;
}

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
  let stockPosterior = stockAnterior;

  // Calcular nuevo stock según tipo de movimiento
  switch (tipoMovimiento) {
    case 'reserva':
      // Para reservas, solo actualizamos el stock reservado, no el stock total
      const nuevoStockReservado = Math.max(0, (producto.stock_reservado || 0) + cantidad);
      
      await prisma.producto.update({
        where: { id_producto: idProducto },
        data: {
          stock_reservado: nuevoStockReservado,
          updated_at: new Date()
        }
      });

      stockPosterior = stockAnterior; // El stock total no cambia
      break;
    case 'liberacion_reserva':
      const stockReservadoReducido = Math.max(0, (producto.stock_reservado || 0) - cantidad);
      
      await prisma.producto.update({
        where: { id_producto: idProducto },
        data: {
          stock_reservado: stockReservadoReducido,
          updated_at: new Date()
        }
      });

      stockPosterior = stockAnterior; // El stock total no cambia
      break;
  }

  // Registrar movimiento
  const movimiento = await prisma.movimientoStock.create({
    data: {
      id_producto: idProducto,
      tipo_movimiento: tipoMovimiento,
      cantidad: cantidad,
      stock_anterior: stockAnterior,
      stock_posterior: stockPosterior,
      motivo: motivo,
      observaciones: observaciones,
      id_cotizacion: idCotizacion,
      id_usuario: idUsuario
    }
  });

  return movimiento;
}

async function reservarStockParaCotizacion(cotizacionId, detalleProductos, idUsuario) {
  const reservasCreadas = [];

  for (const detalle of detalleProductos) {
    const producto = await prisma.producto.findUnique({
      where: { id_producto: detalle.id_producto }
    });

    // Solo reservar si el producto requiere control de stock
    if (producto && producto.requiere_control_stock) {
      const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
      
      if (stockDisponible >= detalle.cantidad_total) {
        // Crear reserva
        const reserva = await prisma.reservaStock.create({
          data: {
            id_producto: detalle.id_producto,
            id_cotizacion: cotizacionId,
            cantidad_reservada: detalle.cantidad_total,
            motivo: 'Reserva automática por cotización aceptada',
            observaciones: `Reserva automática para ${detalle.cantidad_total} unidades`,
            created_by: idUsuario
          }
        });

        // Registrar movimiento de stock
        await registrarMovimientoStock(
          detalle.id_producto,
          'reserva',
          detalle.cantidad_total,
          'Reserva automática por cotización aceptada',
          `Cotización: ${cotizacionId}`,
          cotizacionId,
          idUsuario
        );

        reservasCreadas.push(reserva);
      } else {
        throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, requerido: ${detalle.cantidad_total}`);
      }
    }
  }

  return reservasCreadas;
}

// ===== ENDPOINTS PRINCIPALES =====

exports.getCotizaciones = async (req, res) => {
  try {
    const { 
      estado, 
      id_cliente, 
      fecha_desde, 
      fecha_hasta,
      numero_cotizacion 
    } = req.query;
    
    let whereClause = {};
    
    if (estado) {
      whereClause.estado = estado;
    }
    
    if (id_cliente) {
      whereClause.id_cliente = parseInt(id_cliente);
    }
    
    if (numero_cotizacion) {
      whereClause.numero_cotizacion = {
        contains: numero_cotizacion
      };
    }
    
    if (fecha_desde && fecha_hasta) {
      whereClause.created_at = {
        gte: new Date(fecha_desde + 'T00:00:00.000Z'),
        lte: new Date(fecha_hasta + 'T23:59:59.999Z')
      };
    }

    const cotizaciones = await prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            nombre: true,
            cuit: true,
            email: true
          }
        },
        plan: {
          select: {
            nombre: true,
            duracion_semanas: true
          }
        },
        lista_precio: {
          select: {
            tipo: true,
            nombre: true
          }
        },
        detalle_cotizacion: {
          include: {
            producto: {
              select: {
                nombre: true,
                descripcion: true
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
    const cotizacionesFormatted = cotizaciones.map(cotizacion => ({
      ...cotizacion,
      id_cotizacion: Number(cotizacion.id_cotizacion),
      id_cliente: Number(cotizacion.id_cliente),
      id_plan: Number(cotizacion.id_plan),
      precio_total: parseFloat(cotizacion.precio_total),
      cliente_nombre: cotizacion.cliente.nombre,
      cliente_cuit: cotizacion.cliente.cuit,
      plan_nombre: cotizacion.plan.nombre,
      plan_duracion: Number(cotizacion.plan.duracion_semanas),
      lista_precio_tipo: cotizacion.lista_precio?.tipo || null,
      productos: cotizacion.detalle_cotizacion.map(dc => ({
        id_producto: Number(dc.id_producto),
        nombre_producto: dc.producto.nombre,
        cantidad_total: dc.cantidad_total,
        precio_unitario: parseFloat(dc.precio_unitario),
        subtotal: parseFloat(dc.subtotal),
        semana_inicio: Number(dc.semana_inicio),
        semana_fin: dc.semana_fin ? Number(dc.semana_fin) : null
      }))
    }));

    res.json(cotizacionesFormatted);
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        cliente: true,
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: true
              }
            }
          }
        },
        lista_precio: true,
        detalle_cotizacion: {
          include: {
            producto: true
          }
        },
        calendario_vacunacion: {
          include: {
            producto: {
              select: {
                nombre: true
              }
            }
          },
          orderBy: [
            { numero_semana: 'asc' },
            { producto: { nombre: 'asc' } }
          ]
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Formatear respuesta completa
    const cotizacionFormatted = {
      ...cotizacion,
      id_cotizacion: Number(cotizacion.id_cotizacion),
      precio_total: parseFloat(cotizacion.precio_total),
      detalle_productos: cotizacion.detalle_cotizacion.map(dc => ({
        id_producto: Number(dc.id_producto),
        nombre_producto: dc.producto.nombre,
        descripcion_producto: dc.producto.descripcion,
        cantidad_total: dc.cantidad_total,
        precio_unitario: parseFloat(dc.precio_unitario),
        subtotal: parseFloat(dc.subtotal),
        semana_inicio: Number(dc.semana_inicio),
        semana_fin: dc.semana_fin ? Number(dc.semana_fin) : null,
        dosis_por_semana: dc.dosis_por_semana
      })),
      calendario: cotizacion.calendario_vacunacion.map(cv => ({
        id_calendario: Number(cv.id_calendario),
        id_producto: Number(cv.id_producto),
        nombre_producto: cv.producto.nombre,
        numero_semana: Number(cv.numero_semana),
        fecha_programada: cv.fecha_programada,
        cantidad_dosis: cv.cantidad_dosis,
        estado_dosis: cv.estado_dosis,
        fecha_aplicacion: cv.fecha_aplicacion,
        observaciones: cv.observaciones
      }))
    };

    res.json(cotizacionFormatted);
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.createCotizacion = async (req, res) => {
  try {
    const { 
      id_cliente, 
      id_plan, 
      fecha_inicio_plan,
      id_lista_precio,
      observaciones 
    } = req.body;

    // Validaciones
    if (!id_cliente || !id_plan || !fecha_inicio_plan) {
      return res.status(400).json({ 
        error: 'Cliente, plan y fecha de inicio son obligatorios' 
      });
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: parseInt(id_cliente) }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Verificar que el plan existe y está activo
    const plan = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id_plan) },
      include: {
        productos_plan: {
          include: {
            producto: {
              include: {
                precios_por_lista: {
                  where: {
                    activo: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan vacunal no encontrado' });
    }

    if (plan.estado !== 'activo') {
      return res.status(400).json({ 
        error: 'El plan debe estar activo para generar cotizaciones' 
      });
    }

    // Crear cotización con transacción
    const nuevaCotizacion = await prisma.$transaction(async (tx) => {
      // Generar número único de cotización
      let numeroCotizacion;
      let existeNumero = true;
      
      while (existeNumero) {
        numeroCotizacion = generarNumeroCotizacion();
        const cotizacionExistente = await tx.cotizacion.findUnique({
          where: { numero_cotizacion: numeroCotizacion }
        });
        existeNumero = !!cotizacionExistente;
      }

      // Calcular precios usando la lista especificada o la del plan
      const listaPrecios = id_lista_precio ? parseInt(id_lista_precio) : plan.id_lista_precio;
      let precioTotal = 0;
      const detalleProductos = [];

      for (const planProducto of plan.productos_plan) {
        let precioUnitario = parseFloat(planProducto.producto.precio_unitario);
        
        // Si hay lista de precios, usar ese precio
        if (listaPrecios) {
          const precioPorLista = planProducto.producto.precios_por_lista.find(
            precio => precio.id_lista === listaPrecios && precio.activo
          );
          if (precioPorLista) {
            precioUnitario = parseFloat(precioPorLista.precio);
          }
        }

        const subtotal = precioUnitario * planProducto.cantidad_total;
        precioTotal += subtotal;

        detalleProductos.push({
          id_producto: planProducto.id_producto,
          cantidad_total: planProducto.cantidad_total,
          precio_unitario: precioUnitario,
          subtotal: subtotal,
          semana_inicio: planProducto.semana_inicio,
          semana_fin: planProducto.semana_fin,
          dosis_por_semana: planProducto.dosis_por_semana,
          observaciones: planProducto.observaciones
        });
      }

      // Crear la cotización
      const cotizacion = await tx.cotizacion.create({
        data: {
          numero_cotizacion: numeroCotizacion,
          id_cliente: parseInt(id_cliente),
          id_plan: parseInt(id_plan),
          id_lista_precio: listaPrecios,
          fecha_inicio_plan: new Date(fecha_inicio_plan),
          precio_total: precioTotal,
          observaciones: observaciones || '',
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear detalle de cotización
      await tx.detalleCotizacion.createMany({
        data: detalleProductos.map(producto => ({
          id_cotizacion: cotizacion.id_cotizacion,
          ...producto
        }))
      });

      // Generar calendario de vacunación
      await generarCalendarioVacunacion(
        cotizacion.id_cotizacion,
        new Date(fecha_inicio_plan),
        plan.productos_plan
      );

      return cotizacion;
    });

    res.status(201).json({
      message: 'Cotización creada exitosamente',
      cotizacion: {
        ...nuevaCotizacion,
        id_cotizacion: Number(nuevaCotizacion.id_cotizacion),
        precio_total: parseFloat(nuevaCotizacion.precio_total)
      }
    });
  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateEstadoCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;
    const idUsuario = req.user?.id_usuario;

    if (!estado) {
      return res.status(400).json({ error: 'Estado es obligatorio' });
    }

    const estadosValidos = ['en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    // Verificar que la cotización existe e incluir detalles
    const cotizacionExistente = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        detalle_cotizacion: {
          include: {
            producto: true
          }
        },
        cliente: true
      }
    });

    if (!cotizacionExistente) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Validar transiciones de estado válidas
    const transicionesValidas = {
      'borrador': ['en_proceso', 'enviada', 'cancelada'],
      'en_proceso': ['enviada', 'aceptada', 'cancelada'],
      'enviada': ['aceptada', 'rechazada', 'cancelada'],
      'aceptada': ['cancelada'],
      'rechazada': ['en_proceso', 'enviada'],
      'cancelada': []
    };

    if (!transicionesValidas[cotizacionExistente.estado]?.includes(estado)) {
      return res.status(400).json({ 
        error: `Transición inválida de ${cotizacionExistente.estado} a ${estado}` 
      });
    }

    // Procesar lógicas específicas por estado
    let reservasCreadas = null;
    
    if (estado === 'aceptada' && cotizacionExistente.estado !== 'aceptada') {
      // Verificar disponibilidad de stock antes de aceptar
      for (const detalle of cotizacionExistente.detalle_cotizacion) {
        const producto = detalle.producto;
        if (producto.requiere_control_stock) {
          const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
          if (stockDisponible < detalle.cantidad_total) {
            return res.status(400).json({
              error: `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, requerido: ${detalle.cantidad_total}`
            });
          }
        }
      }

      // Crear reservas automáticas de stock
      try {
        reservasCreadas = await reservarStockParaCotizacion(
          cotizacionExistente.id_cotizacion, 
          cotizacionExistente.detalle_cotizacion,
          idUsuario
        );
      } catch (stockError) {
        return res.status(400).json({ error: stockError.message });
      }
    }

    if (estado === 'cancelada' && cotizacionExistente.estado === 'aceptada') {
      // Liberar reservas de stock existentes
      const reservasExistentes = await prisma.reservaStock.findMany({
        where: { 
          id_cotizacion: cotizacionExistente.id_cotizacion,
          estado_reserva: 'activa'
        }
      });

      for (const reserva of reservasExistentes) {
        await prisma.reservaStock.update({
          where: { id_reserva: reserva.id_reserva },
          data: { 
            estado_reserva: 'liberada',
            fecha_liberacion: new Date(),
            observaciones_liberacion: 'Liberada por cancelación de cotización'
          }
        });

        await registrarMovimientoStock(
          reserva.id_producto,
          'liberacion_reserva',
          reserva.cantidad_reservada,
          'Liberación por cancelación de cotización',
          `Cotización: ${cotizacionExistente.id_cotizacion}`,
          cotizacionExistente.id_cotizacion,
          idUsuario
        );
      }
    }

    // Actualizar estado con fechas automáticas
    const updateData = {
      estado,
      updated_by: idUsuario,
      updated_at: new Date()
    };

    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
    }

    if (estado === 'enviada' && cotizacionExistente.estado !== 'enviada') {
      updateData.fecha_envio = new Date();
    }

    if (estado === 'aceptada' && cotizacionExistente.estado !== 'aceptada') {
      updateData.fecha_aceptacion = new Date();
    }

    const cotizacionActualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: parseInt(id) },
      data: updateData,
      include: {
        cliente: true,
        plan_vacunal: true,
        detalle_cotizacion: {
          include: {
            producto: true
          }
        }
      }
    });

    const response = {
      message: 'Estado de cotización actualizado exitosamente',
      cotizacion: {
        ...cotizacionActualizada,
        id_cotizacion: Number(cotizacionActualizada.id_cotizacion),
        precio_total: parseFloat(cotizacionActualizada.precio_total)
      }
    };

    if (reservasCreadas && reservasCreadas.length > 0) {
      response.reservas_creadas = reservasCreadas.length;
      response.productos_reservados = reservasCreadas.map(r => ({
        id_producto: r.id_producto,
        cantidad_reservada: r.cantidad_reservada
      }));
    }

    res.json(response);

  } catch (error) {
    console.error('Error al actualizar estado de cotización:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getCalendarioVacunacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_desde, fecha_hasta, estado_dosis } = req.query;

    let whereClause = {
      id_cotizacion: parseInt(id)
    };

    if (fecha_desde && fecha_hasta) {
      whereClause.fecha_programada = {
        gte: new Date(fecha_desde),
        lte: new Date(fecha_hasta)
      };
    }

    if (estado_dosis) {
      whereClause.estado_dosis = estado_dosis;
    }

    const calendario = await prisma.calendarioVacunacion.findMany({
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
      orderBy: [
        { numero_semana: 'asc' },
        { fecha_programada: 'asc' }
      ]
    });

    const calendarioFormatted = calendario.map(item => ({
      ...item,
      id_calendario: Number(item.id_calendario),
      id_cotizacion: Number(item.id_cotizacion),
      id_producto: Number(item.id_producto),
      numero_semana: Number(item.numero_semana),
      nombre_producto: item.producto.nombre,
      descripcion_producto: item.producto.descripcion,
      numero_cotizacion: item.cotizacion.numero_cotizacion,
      cliente_nombre: item.cotizacion.cliente.nombre
    }));

    res.json(calendarioFormatted);
  } catch (error) {
    console.error('Error al obtener calendario de vacunación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarEstadoDosis = async (req, res) => {
  try {
    const { id_calendario } = req.params;
    const { estado_dosis, fecha_aplicacion, observaciones } = req.body;

    if (!estado_dosis) {
      return res.status(400).json({ error: 'Estado de dosis es obligatorio' });
    }

    const estadosValidosDosis = ['pendiente', 'programada', 'aplicada', 'omitida', 'reprogramada'];
    if (!estadosValidosDosis.includes(estado_dosis)) {
      return res.status(400).json({ error: 'Estado de dosis no válido' });
    }

    // Verificar que el calendario existe
    const calendarioExistente = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) }
    });

    if (!calendarioExistente) {
      return res.status(404).json({ error: 'Calendario de vacunación no encontrado' });
    }

    const updateData = {
      estado_dosis,
      updated_at: new Date()
    };

    if (fecha_aplicacion) {
      updateData.fecha_aplicacion = new Date(fecha_aplicacion);
    }

    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
    }

    // Si se marca como aplicada y no hay fecha, usar la actual
    if (estado_dosis === 'aplicada' && !fecha_aplicacion) {
      updateData.fecha_aplicacion = new Date();
    }

    const calendarioActualizado = await prisma.calendarioVacunacion.update({
      where: { id_calendario: parseInt(id_calendario) },
      data: updateData
    });

    res.json({
      message: 'Estado de dosis actualizado exitosamente',
      calendario: {
        ...calendarioActualizado,
        id_calendario: Number(calendarioActualizado.id_calendario),
        numero_semana: Number(calendarioActualizado.numero_semana)
      }
    });
  } catch (error) {
    console.error('Error al actualizar estado de dosis:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.regenerarCalendario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_fecha_inicio } = req.body;

    if (!nueva_fecha_inicio) {
      return res.status(400).json({ error: 'Nueva fecha de inicio es obligatoria' });
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        plan: {
          include: {
            productos_plan: true
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (cotizacion.estado === 'aceptada') {
      return res.status(400).json({ 
        error: 'No se puede regenerar el calendario de una cotización aceptada' 
      });
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar calendario existente
      await tx.calendarioVacunacion.deleteMany({
        where: { id_cotizacion: parseInt(id) }
      });

      // Actualizar fecha de inicio en la cotización
      await tx.cotizacion.update({
        where: { id_cotizacion: parseInt(id) },
        data: {
          fecha_inicio_plan: new Date(nueva_fecha_inicio),
          updated_at: new Date()
        }
      });

      // Regenerar calendario
      await generarCalendarioVacunacion(
        parseInt(id),
        new Date(nueva_fecha_inicio),
        cotizacion.plan.productos_plan
      );
    });

    res.json({
      message: 'Calendario de vacunación regenerado exitosamente'
    });
  } catch (error) {
    console.error('Error al regenerar calendario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
