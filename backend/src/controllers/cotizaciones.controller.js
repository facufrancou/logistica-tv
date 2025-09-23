const prisma = require('../lib/prisma');
const PriceCalculator = require('../lib/priceCalculator');
const pdfService = require('../services/pdfService');

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

async function generarCalendarioVacunacion(cotizacionId, fechaInicio, productosDelPlan, tx = prisma) {
  const calendarioItems = [];

  for (const planProducto of productosDelPlan) {
    const semanaInicio = planProducto.semana_inicio;
    const semanaFin = planProducto.semana_fin || semanaInicio;
    const dosisPorSemana = planProducto.dosis_por_semana;
    
    console.log(`Generando calendario - Producto: ${planProducto.producto?.nombre || 'N/A'}, Semana: ${semanaInicio}, Dosis: ${dosisPorSemana}`);

    // Para cada semana en el rango, crear una entrada con las dosis correspondientes
    for (let semana = semanaInicio; semana <= semanaFin; semana++) {
      if (dosisPorSemana > 0) {
        calendarioItems.push({
          id_cotizacion: cotizacionId,
          id_producto: planProducto.id_producto,
          numero_semana: semana,
          fecha_programada: calcularFechaProgramada(fechaInicio, semana),
          cantidad_dosis: dosisPorSemana, // Usar dosis_por_semana directamente
          estado_dosis: 'pendiente'
        });
      }
    }
  }

  if (calendarioItems.length > 0) {
    await tx.calendarioVacunacion.createMany({
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
    // Manejar tanto detalle_cotizacion como planProducto
    const idProducto = detalle.id_producto || detalle.producto?.id_producto;
    const cantidadTotal = detalle.cantidad_total;
    const dosisPorSemana = detalle.dosis_por_semana;
    
    const producto = await prisma.producto.findUnique({
      where: { id_producto: idProducto }
    });

    // Solo reservar si el producto requiere control de stock
    if (producto && producto.requiere_control_stock) {
      // CORRECCIÓN: Calcular la cantidad total de dosis correctamente
      // cantidad_total = semanas de tratamiento
      // dosis_por_semana = dosis necesarias por semana
      // Total de dosis = cantidad_total × dosis_por_semana
      const totalDosisRequeridas = cantidadTotal * dosisPorSemana;
      
      const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
      
      if (stockDisponible >= totalDosisRequeridas) {
        // Crear reserva
        const reserva = await prisma.reservaStock.create({
          data: {
            id_producto: idProducto,
            id_cotizacion: cotizacionId,
            cantidad_reservada: totalDosisRequeridas,
            motivo: 'Reserva automática por cotización aceptada',
            observaciones: `Reserva automática para ${totalDosisRequeridas} dosis (${cantidadTotal} semanas × ${dosisPorSemana} dosis/semana)`,
            created_by: idUsuario
          }
        });

        // Registrar movimiento de stock
        await registrarMovimientoStock(
          idProducto,
          'reserva',
          totalDosisRequeridas,
          'Reserva automática por cotización aceptada',
          `Cotización: ${cotizacionId} - ${totalDosisRequeridas} dosis (${cantidadTotal} semanas × ${dosisPorSemana} dosis/semana)`,
          cotizacionId,
          idUsuario
        );

        reservasCreadas.push(reserva);
      } else {
        throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, requerido: ${totalDosisRequeridas} dosis`);
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
            nombre: true,
            porcentaje_recargo: true
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
    
    // Validar que el ID existe y es un número válido
    if (!id) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }
    
    const idCotizacion = parseInt(id);
    if (isNaN(idCotizacion)) {
      return res.status(400).json({ error: 'ID de cotización debe ser un número válido' });
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: idCotizacion },
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

exports.updateCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacionData = req.body;
    const idUsuario = req.user?.id_usuario;

    console.log('=== UPDATE COTIZACIÓN ===');
    console.log('ID:', id);
    console.log('Data recibida:', cotizacionData);
    console.log('Usuario:', idUsuario);

    // Validar que el ID existe y es un número válido
    if (!id) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }

    const idCotizacion = parseInt(id);
    if (isNaN(idCotizacion)) {
      return res.status(400).json({ error: 'ID de cotización debe ser un número válido' });
    }

    // Verificar que la cotización existe
    const cotizacionExistente = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        detalle_cotizacion: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!cotizacionExistente) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Verificar que la cotización no esté eliminada
    if (cotizacionExistente.estado === 'eliminada') {
      return res.status(400).json({ 
        error: 'No se puede editar una cotización eliminada. Primero debe reactivarla.' 
      });
    }

    // Preparar datos para actualizar
    const updateData = {
      updated_at: new Date(),
      updated_by: idUsuario
    };

    // Campos que se pueden actualizar
    const camposActualizables = [
      'id_cliente',
      'id_plan', 
      'fecha_inicio_plan',
      'id_lista_precio',
      'observaciones',
      'modalidad_facturacion',
      'porcentaje_aplicado'
    ];

    // Solo agregar campos que están presentes en la request
    camposActualizables.forEach(campo => {
      if (cotizacionData.hasOwnProperty(campo) && cotizacionData[campo] !== undefined) {
        updateData[campo] = cotizacionData[campo];
      }
    });

    // Convertir IDs de string a número si es necesario
    if (updateData.id_cliente && typeof updateData.id_cliente === 'string') {
      updateData.id_cliente = parseInt(updateData.id_cliente);
    }
    if (updateData.id_plan && typeof updateData.id_plan === 'string') {
      updateData.id_plan = parseInt(updateData.id_plan);
    }
    if (updateData.id_lista_precio !== undefined) {
      if (updateData.id_lista_precio === null || updateData.id_lista_precio === '') {
        updateData.id_lista_precio = null;
      } else if (typeof updateData.id_lista_precio === 'string') {
        updateData.id_lista_precio = parseInt(updateData.id_lista_precio);
      }
    }

    // Validar fecha si se proporciona
    if (updateData.fecha_inicio_plan) {
      updateData.fecha_inicio_plan = new Date(updateData.fecha_inicio_plan);
    }

    console.log('Datos a actualizar:', updateData);

    // Actualizar la cotización
    const cotizacionActualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: idCotizacion },
      data: updateData,
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
        }
      }
    });

    console.log('Cotización actualizada exitosamente:', cotizacionActualizada.numero_cotizacion);

    res.json({
      message: 'Cotización actualizada correctamente',
      cotizacion: cotizacionActualizada
    });

  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Error de datos duplicados' });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

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
      observaciones,
      cantidad_animales 
    } = req.body;

    // Validaciones
    if (!id_cliente || !id_plan || !fecha_inicio_plan || !cantidad_animales) {
      return res.status(400).json({ 
        error: 'Cliente, plan, fecha de inicio y cantidad de animales son obligatorios' 
      });
    }

    // Validar que cantidad_animales sea un número positivo
    const cantidadAnimalesNum = parseInt(cantidad_animales);
    if (isNaN(cantidadAnimalesNum) || cantidadAnimalesNum <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad de animales debe ser un número mayor a 0' 
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

      // Calcular precios usando la nueva lógica de recargos
      const listaPrecios = id_lista_precio ? parseInt(id_lista_precio) : plan.id_lista_precio;
      let listaPrecio = null;
      let precioTotal = 0;
      const detalleProductos = [];

      // Obtener lista de precios si se especificó
      if (listaPrecios) {
        listaPrecio = await tx.listaPrecio.findUnique({
          where: { id_lista: listaPrecios }
        });
        
        if (!listaPrecio || !listaPrecio.activa) {
          throw new Error('Lista de precios no encontrada o inactiva');
        }
      }

      for (const planProducto of plan.productos_plan) {
        const precioBase = parseFloat(planProducto.producto.precio_unitario);
        let precioFinal = precioBase;
        let porcentajeAplicado = 0;

        // Aplicar recargo si hay lista de precios
        if (listaPrecio && listaPrecio.porcentaje_recargo > 0) {
          porcentajeAplicado = parseFloat(listaPrecio.porcentaje_recargo);
          precioFinal = PriceCalculator.calcularPrecioConRecargo(precioBase, porcentajeAplicado);
        }

        const subtotal = PriceCalculator.calcularSubtotal(precioFinal, planProducto.cantidad_total);
        precioTotal += subtotal;

        detalleProductos.push({
          id_producto: planProducto.id_producto,
          cantidad_total: planProducto.cantidad_total,
          precio_base_producto: precioBase,
          porcentaje_aplicado: porcentajeAplicado || null,
          precio_unitario: precioFinal, // Para compatibilidad
          precio_final_calculado: precioFinal,
          subtotal: subtotal,
          facturacion_tipo: 'pendiente',
          editado_manualmente: false,
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
          cantidad_animales: cantidadAnimalesNum,
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
        plan.productos_plan,
        tx
      );

      return cotizacion;
    });

    // NUEVA FUNCIONALIDAD: Crear reservas automáticamente al crear la cotización
    // Esto asegura que el stock se reserve desde el momento de creación
    try {
      console.log('Creando reservas automáticas para nueva cotización...');
      
      const productosDelPlan = await prisma.planProducto.findMany({
        where: { id_plan: parseInt(id_plan) },
        include: {
          producto: true
        }
      });
      
      const reservasCreadas = await reservarStockParaCotizacion(
        nuevaCotizacion.id_cotizacion, 
        productosDelPlan, 
        req.user?.id_usuario || null
      );
      
      console.log(`Reservas creadas exitosamente: ${reservasCreadas?.length || 0} productos`);
    } catch (stockError) {
      console.warn('Advertencia al crear reservas automáticas:', stockError.message);
      // No fallar la creación de la cotización por falta de stock
      // Solo registrar la advertencia
    }

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

    console.log('=== UPDATE ESTADO DEBUG ===');
    console.log('ID:', id);
    console.log('Body:', req.body);
    console.log('Usuario:', req.user);
    console.log('Estado recibido:', estado);

    if (!estado) {
      return res.status(400).json({ error: 'Estado es obligatorio' });
    }

    const estadosValidos = ['en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada', 'eliminada'];
    if (!estadosValidos.includes(estado)) {
      console.log('Estado no válido:', estado, 'válidos:', estadosValidos);
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

    console.log('Cotización encontrada:', cotizacionExistente ? {
      id: cotizacionExistente.id_cotizacion,
      estado_actual: cotizacionExistente.estado,
      numero: cotizacionExistente.numero_cotizacion
    } : 'NO ENCONTRADA');

    if (!cotizacionExistente) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Validar transiciones de estado válidas
    const transicionesValidas = {
      'borrador': ['en_proceso', 'enviada', 'cancelada', 'eliminada'],
      'en_proceso': ['enviada', 'aceptada', 'cancelada', 'eliminada'],
      'enviada': ['aceptada', 'rechazada', 'cancelada', 'eliminada'],
      'aceptada': ['cancelada', 'eliminada'],
      'rechazada': ['en_proceso', 'enviada', 'eliminada'],
      'cancelada': ['eliminada'],
      'eliminada': ['en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada']
    };

    if (!transicionesValidas[cotizacionExistente.estado]?.includes(estado)) {
      console.log('Transición inválida:', {
        estadoActual: cotizacionExistente.estado,
        estadoDestino: estado,
        transicionesPermitidas: transicionesValidas[cotizacionExistente.estado]
      });
      return res.status(400).json({ 
        error: `Transición inválida de ${cotizacionExistente.estado} a ${estado}` 
      });
    }

    console.log('Transición válida:', cotizacionExistente.estado, '->', estado);

    // Procesar lógicas específicas por estado
    let reservasCreadas = null;
    
    console.log('Verificando estado para lógicas específicas...', estado);
    
    if (estado === 'aceptada' && cotizacionExistente.estado !== 'aceptada') {
      console.log('Procesando aceptación de cotización...');
      
      // Verificar si ya existen reservas para esta cotización
      const reservasExistentes = await prisma.reservaStock.findMany({
        where: { 
          id_cotizacion: parseInt(id), // Asegurar que sea entero
          estado_reserva: 'activa'
        },
        include: {
          producto: { select: { nombre: true } }
        }
      });
      
      console.log(`Buscando reservas para cotización ID: ${parseInt(id)}`);
      console.log(`Reservas existentes encontradas: ${reservasExistentes.length}`);
      
      if (reservasExistentes.length > 0) {
        // Ya existen reservas - simplemente validar que siguen siendo válidas
        console.log('Validando reservas existentes...');
        
        // Obtener el stock total reservado por esta cotización por producto
        const reservasPorProducto = {};
        reservasExistentes.forEach(reserva => {
          if (!reservasPorProducto[reserva.id_producto]) {
            reservasPorProducto[reserva.id_producto] = 0;
          }
          reservasPorProducto[reserva.id_producto] += reserva.cantidad_reservada;
        });
        
        // Verificar que el stock sigue siendo válido (sin contar las reservas de esta misma cotización)
        for (const detalle of cotizacionExistente.detalle_cotizacion) {
          const producto = detalle.producto;
          if (producto.requiere_control_stock) {
            const totalDosisRequeridas = detalle.cantidad_total * detalle.dosis_por_semana;
            const reservasEstaCotizacion = reservasPorProducto[producto.id_producto] || 0;
            
            console.log(`Validación - Producto: ${producto.nombre}`);
            console.log(`  Stock total: ${producto.stock}`);
            console.log(`  Stock reservado total: ${producto.stock_reservado}`);
            console.log(`  Reservas de esta cotización: ${reservasEstaCotizacion}`);
            console.log(`  Dosis requeridas: ${totalDosisRequeridas}`);
            
            // CORRECCIÓN: Si las reservas ya cubren exactamente lo que necesitamos, está bien
            if (reservasEstaCotizacion >= totalDosisRequeridas) {
              console.log(`  ✓ Las reservas existentes (${reservasEstaCotizacion}) cubren las dosis requeridas (${totalDosisRequeridas})`);
              continue; // Esta línea del detalle está cubierta
            }
            
            // Si necesitamos más dosis de las que ya tenemos reservadas, verificar disponibilidad
            const dosisAdicionalesnecesarias = totalDosisRequeridas - reservasEstaCotizacion;
            const stockDisponibleReal = (producto.stock || 0) - (producto.stock_reservado || 0);
            
            console.log(`  Dosis adicionales necesarias: ${dosisAdicionalesnecesarias}`);
            console.log(`  Stock disponible real: ${stockDisponibleReal}`);
            
            if (stockDisponibleReal < dosisAdicionalesnecesarias) {
              return res.status(400).json({
                error: 'STOCK_INSUFICIENTE',
                message: 'El stock ya no es suficiente para esta cotización',
                productos_insuficientes: [{
                  id_producto: producto.id_producto,
                  nombre: producto.nombre,
                  descripcion: producto.descripcion,
                  stock_disponible: stockDisponibleReal,
                  cantidad_requerida: dosisAdicionalesnecesarias,
                  deficit: dosisAdicionalesnecesarias - stockDisponibleReal
                }]
              });
            }
          }
        }
        
        console.log('Reservas existentes validadas correctamente. No se crean nuevas reservas.');
        reservasCreadas = reservasExistentes; // Usar las reservas existentes
        
      } else {
        // No existen reservas - crear nuevas (flujo normal)
        console.log('No hay reservas existentes. Creando nuevas reservas...');
        
        // Verificar si se debe forzar la aceptación (omitir verificación de stock)
        const forzarAceptacion = req.body.forzar_aceptacion === true;
        
        if (!forzarAceptacion) {
          // Verificar disponibilidad de stock antes de aceptar
          const productosConStockInsuficiente = [];
          
          for (const detalle of cotizacionExistente.detalle_cotizacion) {
            const producto = detalle.producto;
            if (producto.requiere_control_stock) {
              // CORRECCIÓN: Usar la misma lógica de cálculo que en reservarStockParaCotizacion
              const totalDosisRequeridas = detalle.cantidad_total * detalle.dosis_por_semana;
              const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
              console.log(`Stock check - Producto: ${producto.nombre}, Disponible: ${stockDisponible}, Requerido: ${totalDosisRequeridas}`);
              
              if (stockDisponible < totalDosisRequeridas) {
                productosConStockInsuficiente.push({
                  id_producto: producto.id_producto,
                  nombre: producto.nombre,
                  descripcion: producto.descripcion,
                  stock_disponible: stockDisponible,
                  cantidad_requerida: totalDosisRequeridas,
                  deficit: totalDosisRequeridas - stockDisponible
                });
              }
            }
          }
          
          // Si hay productos con stock insuficiente, devolver error detallado
          if (productosConStockInsuficiente.length > 0) {
            return res.status(400).json({
              error: 'STOCK_INSUFICIENTE',
              message: 'No hay stock suficiente para uno o más productos de la cotización',
              productos_insuficientes: productosConStockInsuficiente,
              puede_forzar: true,
              total_productos_afectados: productosConStockInsuficiente.length
            });
          }
        } else {
          console.log('Aceptación forzada: omitiendo verificación de stock');
        }

        // Crear reservas automáticas de stock (siempre, incluso si stock es insuficiente)
        try {
          console.log('Creando reservas de stock...');
          
          // CORRECCIÓN: Obtener productos individuales del plan en lugar del detalle agrupado
          const productosDelPlan = await prisma.planProducto.findMany({
            where: { id_plan: cotizacionExistente.id_plan },
            include: {
              producto: true
            }
          });
          
          console.log(`Productos del plan encontrados: ${productosDelPlan.length}`);
          productosDelPlan.forEach(pp => {
            const totalDosis = pp.cantidad_total * pp.dosis_por_semana;
            console.log(`  - ${pp.producto.nombre}: ${pp.cantidad_total} × ${pp.dosis_por_semana} = ${totalDosis} dosis`);
          });
          
          reservasCreadas = await reservarStockParaCotizacion(
            cotizacionExistente.id_cotizacion, 
            productosDelPlan, // Usar productos individuales del plan
            idUsuario
          );
          console.log('Reservas creadas exitosamente:', reservasCreadas?.length || 0);
        } catch (stockError) {
          console.error('Error al crear reservas:', stockError.message);
          // Si se está forzando la aceptación, permitir continuar incluso con errores de reserva
          if (!forzarAceptacion) {
            return res.status(400).json({ error: stockError.message });
          } else {
            console.log('Continuando a pesar del error de reserva (aceptación forzada)');
            reservasCreadas = [];
          }
        }
      }
    }

    if (estado === 'cancelada' || estado === 'rechazada' || estado === 'eliminada') {
      // Liberar reservas de stock existentes para cualquier estado de finalización
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
            observaciones: `Liberada por cambio de estado a ${estado}`
          }
        });

        await registrarMovimientoStock(
          reserva.id_producto,
          'liberacion_reserva',
          reserva.cantidad_reservada,
          `Liberación por cambio de estado a ${estado}`,
          `Cotización: ${cotizacionExistente.id_cotizacion}`,
          cotizacionExistente.id_cotizacion,
          idUsuario
        );
      }
      
      console.log(`Liberadas ${reservasExistentes.length} reservas por cambio a estado ${estado}`);
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

    console.log('Datos a actualizar:', updateData);
    console.log('ID de cotización para actualizar:', parseInt(id));

    let cotizacionActualizada;
    try {
      console.log('Ejecutando prisma.cotizacion.update...');
      cotizacionActualizada = await prisma.cotizacion.update({
        where: { id_cotizacion: parseInt(id) },
        data: updateData,
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
              nombre: true,
              porcentaje_recargo: true
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
        }
      });
      
      console.log('Actualización exitosa! Nuevo estado:', cotizacionActualizada.estado);
    } catch (updateError) {
      console.error('Error específico en la actualización:', updateError);
      console.error('Código de error:', updateError.code);
      console.error('Mensaje:', updateError.message);
      throw updateError;
    }

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
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
        cotizacion.plan.productos_plan,
        tx
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

// ===== FUNCIONES DE ELIMINACIÓN Y REACTIVACIÓN =====

exports.eliminarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const idUsuario = req.user?.id_usuario;

    console.log('=== ELIMINAR COTIZACIÓN ===');
    console.log('ID:', id);
    console.log('Motivo:', motivo);
    console.log('Usuario:', idUsuario);

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        cliente: true,
        plan: true
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Verificar que no esté ya eliminada
    if (cotizacion.estado === 'eliminada') {
      return res.status(400).json({ error: 'La cotización ya está eliminada' });
    }

    // Soft delete: cambiar estado a eliminada
    const cotizacionEliminada = await prisma.cotizacion.update({
      where: { id_cotizacion: parseInt(id) },
      data: {
        estado: 'eliminada',
        observaciones: `${cotizacion.observaciones || ''}\n[ELIMINADA] ${new Date().toLocaleString()}: ${motivo || 'Sin motivo especificado'}`.trim(),
        updated_at: new Date(),
        updated_by: idUsuario
      },
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
            nombre: true,
            porcentaje_recargo: true
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
      }
    });

    // Liberar reservas de stock activas (independientemente del estado)
    console.log('Verificando reservas de stock para liberar...');
    
    const reservasActivas = await prisma.reservaStock.findMany({
      where: { 
        id_cotizacion: parseInt(id),
        estado_reserva: 'activa'
      }
    });

    if (reservasActivas.length > 0) {
      console.log(`Liberando ${reservasActivas.length} reservas de stock por eliminación...`);
      
      for (const reserva of reservasActivas) {
        // Actualizar estado de la reserva
        await prisma.reservaStock.update({
          where: { id_reserva: reserva.id_reserva },
          data: { 
            estado_reserva: 'liberada',
            fecha_liberacion: new Date(),
            observaciones: 'Liberada por eliminación de cotización'
          }
        });

        // Registrar movimiento de liberación
        await registrarMovimientoStock(
          reserva.id_producto,
          'liberacion_reserva',
          reserva.cantidad_reservada,
          'Liberación por eliminación de cotización',
          `Cotización eliminada: ${cotizacion.numero_cotizacion}`,
          parseInt(id),
          idUsuario
        );
      }
      
      console.log(`Liberadas ${reservasActivas.length} reservas de stock`);
    } else {
      console.log('No se encontraron reservas activas para liberar');
    }

    console.log('Cotización eliminada exitosamente:', cotizacionEliminada.numero_cotizacion);

    res.json({
      message: 'Cotización eliminada correctamente',
      cotizacion: cotizacionEliminada
    });

  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.reactivarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_destino, motivo } = req.body;
    const idUsuario = req.user?.id_usuario;

    console.log('=== REACTIVAR COTIZACIÓN ===');
    console.log('ID:', id);
    console.log('Estado destino:', estado_destino);
    console.log('Motivo:', motivo);
    console.log('Usuario:', idUsuario);

    // Verificar que la cotización existe y está eliminada
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        cliente: true,
        plan: true,
        detalle_cotizacion: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (cotizacion.estado !== 'eliminada') {
      return res.status(400).json({ error: 'La cotización no está eliminada' });
    }

    // Validar estado destino
    const estadosValidos = ['en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada'];
    if (!estadosValidos.includes(estado_destino)) {
      return res.status(400).json({ error: 'Estado destino no válido' });
    }

    // Si se reactiva a estado aceptada, verificar stock
    if (estado_destino === 'aceptada') {
      for (const detalle of cotizacion.detalle_cotizacion) {
        if (detalle.producto.requiere_control_stock) {
          const totalDosisRequeridas = detalle.cantidad_total * detalle.dosis_por_semana;
          const stockDisponible = (detalle.producto.stock || 0) - (detalle.producto.stock_reservado || 0);
          
          if (stockDisponible < totalDosisRequeridas) {
            return res.status(400).json({
              error: 'STOCK_INSUFICIENTE',
              message: `No hay stock suficiente para ${detalle.producto.nombre}`,
              productos_insuficientes: [{
                id_producto: detalle.producto.id_producto,
                nombre: detalle.producto.nombre,
                stock_disponible: stockDisponible,
                cantidad_requerida: totalDosisRequeridas,
                deficit: totalDosisRequeridas - stockDisponible
              }]
            });
          }
        }
      }
    }

    // Reactivar cotización
    const cotizacionReactivada = await prisma.cotizacion.update({
      where: { id_cotizacion: parseInt(id) },
      data: {
        estado: estado_destino,
        observaciones: `${cotizacion.observaciones || ''}\n[REACTIVADA] ${new Date().toLocaleString()}: ${motivo || 'Sin motivo especificado'} - Estado: ${estado_destino}`.trim(),
        updated_at: new Date(),
        updated_by: idUsuario,
        // Si se reactiva a aceptada, actualizar fecha de aceptación
        ...(estado_destino === 'aceptada' ? { fecha_aceptacion: new Date() } : {})
      },
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
            nombre: true,
            porcentaje_recargo: true
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
      }
    });

    // Si se reactiva a aceptada, reservar stock nuevamente
    if (estado_destino === 'aceptada') {
      console.log('Reservando stock por reactivación...');
      
      for (const detalle of cotizacionReactivada.detalle_cotizacion) {
        if (detalle.producto.requiere_control_stock) {
          const totalDosisRequeridas = detalle.cantidad_total * detalle.dosis_por_semana;
          
          // Reservar stock
          await registrarMovimientoStock(
            detalle.id_producto,
            'reserva',
            totalDosisRequeridas,
            'Reserva por reactivación de cotización',
            `Cotización reactivada: ${cotizacion.numero_cotizacion}`,
            parseInt(id),
            idUsuario
          );
        }
      }
    }

    console.log('Cotización reactivada exitosamente:', cotizacionReactivada.numero_cotizacion);

    res.json({
      message: 'Cotización reactivada correctamente',
      cotizacion: cotizacionReactivada
    });

  } catch (error) {
    console.error('Error al reactivar cotización:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== NUEVOS ENDPOINTS PARA CONTROL DE ENTREGAS =====

exports.marcarEntregaDosis = async (req, res) => {
  try {
    const { id_calendario } = req.params;
    const { 
      cantidad_entregada, 
      responsable_entrega, 
      responsable_recibe,
      observaciones_entrega,
      tipo_entrega = 'completa' 
    } = req.body;

    if (!cantidad_entregada || cantidad_entregada <= 0) {
      return res.status(400).json({ error: 'Cantidad entregada debe ser mayor a 0' });
    }

    // Verificar que el calendario existe
    const calendarioExistente = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        producto: true,
        cotizacion: {
          select: {
            numero_cotizacion: true,
            estado: true
          }
        }
      }
    });

    if (!calendarioExistente) {
      return res.status(404).json({ error: 'Calendario de vacunación no encontrado' });
    }

    if (calendarioExistente.cotizacion.estado !== 'aceptada') {
      return res.status(400).json({ error: 'Solo se pueden entregar dosis de cotizaciones aceptadas' });
    }

    // Verificar que no se entregue más de lo programado
    const nuevasEntregadas = (calendarioExistente.dosis_entregadas || 0) + cantidad_entregada;
    if (nuevasEntregadas > calendarioExistente.cantidad_dosis) {
      return res.status(400).json({ 
        error: 'No se puede entregar más dosis de las programadas',
        programadas: calendarioExistente.cantidad_dosis,
        ya_entregadas: calendarioExistente.dosis_entregadas || 0,
        intentando_entregar: cantidad_entregada
      });
    }

    // Verificar stock disponible (solo si requiere control)
    if (calendarioExistente.producto.requiere_control_stock) {
      const stockDisponible = (calendarioExistente.producto.stock || 0) - (calendarioExistente.producto.stock_reservado || 0);
      if (stockDisponible < cantidad_entregada) {
        return res.status(400).json({ 
          error: 'Stock insuficiente para la entrega',
          disponible: stockDisponible,
          solicitado: cantidad_entregada
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar calendario con la entrega
      const nuevoEstadoEntrega = nuevasEntregadas >= calendarioExistente.cantidad_dosis ? 'entregada' : 'parcial';
      
      // Concatenar responsable entrega y responsable recibe
      const responsableCompleto = responsable_recibe 
        ? `Entrega: ${responsable_entrega || 'Sistema'} | Recibe: ${responsable_recibe}`
        : responsable_entrega || 'Sistema';
      
      await tx.calendarioVacunacion.update({
        where: { id_calendario: parseInt(id_calendario) },
        data: {
          dosis_entregadas: nuevasEntregadas,
          fecha_entrega: new Date(),
          responsable_entrega: responsableCompleto,
          observaciones_entrega,
          estado_entrega: nuevoEstadoEntrega,
          updated_at: new Date()
        }
      });

      // Registrar en control de entregas detallado
      await tx.controlEntregaVacunas.create({
        data: {
          id_calendario: parseInt(id_calendario),
          id_cotizacion: calendarioExistente.id_cotizacion,
          id_producto: calendarioExistente.id_producto,
          cantidad_entregada,
          fecha_entrega: new Date(),
          responsable_entrega: responsableCompleto,
          observaciones: observaciones_entrega,
          tipo_entrega,
          stock_afectado: cantidad_entregada,
          created_by: req.user?.id_usuario || null
        }
      });

      // Actualizar stock si requiere control
      if (calendarioExistente.producto.requiere_control_stock) {
        // Reducir stock reservado
        await tx.producto.update({
          where: { id_producto: calendarioExistente.id_producto },
          data: {
            stock_reservado: {
              decrement: cantidad_entregada
            },
            updated_at: new Date()
          }
        });

        // Registrar movimiento de stock
        await tx.movimientoStock.create({
          data: {
            id_producto: calendarioExistente.id_producto,
            tipo_movimiento: 'liberacion_reserva',
            cantidad: cantidad_entregada,
            stock_anterior: calendarioExistente.producto.stock_reservado || 0,
            stock_posterior: (calendarioExistente.producto.stock_reservado || 0) - cantidad_entregada,
            motivo: 'Entrega de dosis según calendario de vacunación',
            observaciones: `Cotización: ${calendarioExistente.cotizacion.numero_cotizacion} - Semana ${calendarioExistente.numero_semana}`,
            id_cotizacion: calendarioExistente.id_cotizacion,
            id_usuario: req.user?.id_usuario || null
          }
        });
      }
    });

    res.json({
      message: 'Entrega registrada correctamente',
      dosis_entregadas: nuevasEntregadas,
      dosis_programadas: calendarioExistente.cantidad_dosis,
      estado_entrega: nuevasEntregadas >= calendarioExistente.cantidad_dosis ? 'entregada' : 'parcial'
    });

  } catch (error) {
    console.error('Error al marcar entrega de dosis:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getControlEntregas = async (req, res) => {
  try {
    const { id } = req.params; // id de cotización
    const { fecha_desde, fecha_hasta, id_producto } = req.query;

    let whereClause = {
      id_cotizacion: parseInt(id)
    };

    if (fecha_desde && fecha_hasta) {
      whereClause.fecha_entrega = {
        gte: new Date(fecha_desde),
        lte: new Date(fecha_hasta)
      };
    }

    if (id_producto) {
      whereClause.id_producto = parseInt(id_producto);
    }

    const controlEntregas = await prisma.controlEntregaVacunas.findMany({
      where: whereClause,
      include: {
        calendario: {
          select: {
            numero_semana: true,
            fecha_programada: true,
            cantidad_dosis: true
          }
        },
        producto: {
          select: {
            nombre: true,
            descripcion: true
          }
        },
        usuario_creador: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        fecha_entrega: 'desc'
      }
    });

    const controlFormatted = controlEntregas.map(control => ({
      ...control,
      id_control_entrega: Number(control.id_control_entrega),
      id_calendario: Number(control.id_calendario),
      id_cotizacion: Number(control.id_cotizacion),
      id_producto: Number(control.id_producto),
      nombre_producto: control.producto.nombre,
      semana: control.calendario.numero_semana,
      fecha_programada: control.calendario.fecha_programada,
      dosis_programadas: control.calendario.cantidad_dosis,
      usuario_nombre: control.usuario_creador?.nombre || 'Sistema'
    }));

    res.json(controlFormatted);
  } catch (error) {
    console.error('Error al obtener control de entregas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.ajustarStockCalendario = async (req, res) => {
  try {
    const { id, calendarioId } = req.params;
    const { motivo, observaciones } = req.body;

    // Obtener información del calendario
    const calendario = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(calendarioId) },
      include: {
        producto: true,
        cotizacion: {
          select: {
            numero_cotizacion: true,
            estado: true
          }
        }
      }
    });

    if (!calendario) {
      return res.status(404).json({ error: 'Calendario de vacunación no encontrado' });
    }

    if (calendario.id_cotizacion !== parseInt(id)) {
      return res.status(400).json({ error: 'El calendario no pertenece a esta cotización' });
    }

    // Verificar stock actual vs dosis pendientes
    const dosisPendientes = calendario.cantidad_dosis - (calendario.dosis_entregadas || 0);
    const stockDisponible = (calendario.producto.stock || 0) - (calendario.producto.stock_reservado || 0);

    let nuevoEstado = calendario.estado_entrega;
    if (dosisPendientes > 0 && stockDisponible < dosisPendientes) {
      nuevoEstado = 'suspendida';
    } else if (nuevoEstado === 'suspendida' && stockDisponible >= dosisPendientes) {
      nuevoEstado = dosisPendientes === 0 ? 'entregada' : 'pendiente';
    }

    // Actualizar estado si cambió
    if (nuevoEstado !== calendario.estado_entrega) {
      await prisma.calendarioVacunacion.update({
        where: { id_calendario: parseInt(calendarioId) },
        data: {
          estado_entrega: nuevoEstado,
          observaciones: observaciones || `Ajuste automático por cambio de stock: ${motivo}`,
          updated_at: new Date()
        }
      });
    }

    res.json({
      message: 'Ajuste de stock procesado',
      estado_anterior: calendario.estado_entrega,
      estado_nuevo: nuevoEstado,
      dosis_pendientes: dosisPendientes,
      stock_disponible: stockDisponible
    });

  } catch (error) {
    console.error('Error al ajustar stock del calendario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.finalizarPlan = async (req, res) => {
  try {
    const { id } = req.params; // id de cotización
    const { observaciones_finalizacion } = req.body;

    // Verificar que la cotización existe y está aceptada
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        calendario_vacunacion: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (cotizacion.estado !== 'aceptada') {
      return res.status(400).json({ error: 'Solo se pueden finalizar cotizaciones aceptadas' });
    }

    // Verificar que todas las dosis estén entregadas
    const dosisIncompletas = cotizacion.calendario_vacunacion.filter(
      cal => (cal.dosis_entregadas || 0) < cal.cantidad_dosis
    );

    if (dosisIncompletas.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede finalizar el plan. Hay dosis pendientes de entrega',
        dosis_pendientes: dosisIncompletas.map(cal => ({
          semana: cal.numero_semana,
          producto: cal.producto.nombre,
          pendientes: cal.cantidad_dosis - (cal.dosis_entregadas || 0)
        }))
      });
    }

    await prisma.$transaction(async (tx) => {
      // Marcar todas las reservas de stock como utilizadas
      await tx.reservaStock.updateMany({
        where: { 
          id_cotizacion: parseInt(id),
          estado_reserva: 'activa'
        },
        data: {
          estado_reserva: 'utilizada',
          fecha_utilizacion: new Date(),
          observaciones: observaciones_finalizacion || 'Plan vacunal finalizado - todas las dosis entregadas',
          updated_at: new Date()
        }
      });

      // Limpiar cualquier stock reservado residual y descontar del stock general
      const productosConReservas = await tx.reservaStock.groupBy({
        by: ['id_producto'],
        where: { 
          id_cotizacion: parseInt(id),
          estado_reserva: 'utilizada'
        },
        _sum: {
          cantidad_reservada: true
        }
      });

      console.log('Finalizando plan - Productos con reservas:', productosConReservas);

      for (const producto of productosConReservas) {
        const cantidadConsumida = producto._sum.cantidad_reservada || 0;
        
        console.log(`Descontando ${cantidadConsumida} dosis del producto ${producto.id_producto}`);
        
        // Obtener stock actual antes de la operación
        const productoActual = await tx.producto.findUnique({
          where: { id_producto: producto.id_producto },
          select: { stock: true }
        });
        
        const stockAnterior = productoActual.stock;
        const stockPosterior = stockAnterior - cantidadConsumida;

        // Descontar del stock general Y del stock reservado
        await tx.producto.update({
          where: { id_producto: producto.id_producto },
          data: {
            stock: {
              decrement: cantidadConsumida // Reducir stock general
            },
            stock_reservado: {
              decrement: cantidadConsumida // Limpiar stock reservado
            }
          }
        });

        // Registrar movimiento de stock manualmente para auditoría (sin llamar función externa)
        await tx.movimientoStock.create({
          data: {
            id_producto: producto.id_producto,
            tipo_movimiento: 'egreso',
            cantidad: cantidadConsumida,
            stock_anterior: stockAnterior,
            stock_posterior: stockPosterior,
            motivo: `Plan vacunal finalizado - COT: ${cotizacion.numero_cotizacion}`,
            observaciones: observaciones_finalizacion || 'Finalización automática de plan',
            id_cotizacion: parseInt(id),
            id_usuario: req.user?.id_usuario || 1
          }
        });
      }

      // Actualizar estado del calendario a finalizado
      await tx.calendarioVacunacion.updateMany({
        where: { id_cotizacion: parseInt(id) },
        data: {
          observaciones: observaciones_finalizacion || 'Plan finalizado - todas las dosis entregadas',
          updated_at: new Date()
        }
      });
    });

    res.json({
      message: 'Plan vacunal finalizado correctamente',
      cotizacion_numero: cotizacion.numero_cotizacion,
      total_dosis_entregadas: cotizacion.calendario_vacunacion.reduce(
        (total, cal) => total + (cal.dosis_entregadas || 0), 0
      )
    });

  } catch (error) {
    console.error('Error al finalizar plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getEstadoPlan = async (req, res) => {
  try {
    const { id } = req.params; // id de cotización

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        calendario_vacunacion: {
          include: {
            producto: {
              select: {
                nombre: true,
                stock: true,
                stock_reservado: true
              }
            }
          },
          orderBy: {
            numero_semana: 'asc'
          }
        },
        cliente: {
          select: {
            nombre: true
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Calcular estadísticas del plan
    const totalDosisProgr = cotizacion.calendario_vacunacion.reduce(
      (total, cal) => total + cal.cantidad_dosis, 0
    );
    
    const totalDosisEntregadas = cotizacion.calendario_vacunacion.reduce(
      (total, cal) => total + (cal.dosis_entregadas || 0), 0
    );

    const dosisPendientes = totalDosisProgr - totalDosisEntregadas;
    const porcentajeCompletado = totalDosisProgr > 0 ? (totalDosisEntregadas / totalDosisProgr) * 100 : 0;

    // Agrupar por producto
    const resumenPorProducto = {};
    cotizacion.calendario_vacunacion.forEach(cal => {
      const nombreProducto = cal.producto.nombre;
      if (!resumenPorProducto[nombreProducto]) {
        resumenPorProducto[nombreProducto] = {
          nombre: nombreProducto,
          programadas: 0,
          entregadas: 0,
          pendientes: 0,
          stock_actual: cal.producto.stock || 0,
          stock_reservado: cal.producto.stock_reservado || 0
        };
      }
      
      resumenPorProducto[nombreProducto].programadas += cal.cantidad_dosis;
      resumenPorProducto[nombreProducto].entregadas += (cal.dosis_entregadas || 0);
      resumenPorProducto[nombreProducto].pendientes += (cal.cantidad_dosis - (cal.dosis_entregadas || 0));
    });

    // Determinar estado general del plan
    let estadoGeneral = 'activo';
    if (dosisPendientes === 0) {
      estadoGeneral = 'completado';
    } else if (cotizacion.estado !== 'aceptada') {
      estadoGeneral = 'inactivo';
    } else {
      // Verificar si hay problemas de stock
      const problemasStock = Object.values(resumenPorProducto).some(
        prod => prod.pendientes > (prod.stock_actual - prod.stock_reservado)
      );
      if (problemasStock) {
        estadoGeneral = 'con_problemas';
      }
    }

    res.json({
      cotizacion: {
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
        cliente: cotizacion.cliente.nombre,
        estado: cotizacion.estado
      },
      estadisticas: {
        estado_general: estadoGeneral,
        total_dosis_programadas: totalDosisProgr,
        total_dosis_entregadas: totalDosisEntregadas,
        dosis_pendientes: dosisPendientes,
        porcentaje_completado: Math.round(porcentajeCompletado * 100) / 100
      },
      resumen_por_producto: Object.values(resumenPorProducto),
      calendario_detallado: cotizacion.calendario_vacunacion.map(cal => ({
        id_calendario: cal.id_calendario,
        numero_semana: cal.numero_semana,
        fecha_programada: cal.fecha_programada,
        producto: cal.producto.nombre,
        cantidad_dosis: cal.cantidad_dosis,
        dosis_entregadas: cal.dosis_entregadas || 0,
        estado_entrega: cal.estado_entrega,
        responsable_entrega: cal.responsable_entrega
      }))
    });

  } catch (error) {
    console.error('Error al obtener estado del plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== NUEVAS FUNCIONALIDADES =====

/**
 * Actualizar cantidad de animales en una cotización
 */
exports.actualizarCantidadAnimales = async (req, res) => {
  const { id } = req.params;
  const { cantidad_animales } = req.body;

  try {
    // Validaciones
    if (!cantidad_animales || cantidad_animales < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad de animales debe ser mayor a 0'
      });
    }

    // Verificar que la cotización existe
    const cotizacionExistente = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      select: { 
        id_cotizacion: true, 
        numero_cotizacion: true, 
        estado: true,
        cantidad_animales: true
      }
    });

    if (!cotizacionExistente) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada'
      });
    }

    // Validar que la cotización esté en estado que permita modificación
    if (cotizacionExistente.estado === 'finalizada' || cotizacionExistente.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar una cotización finalizada o cancelada'
      });
    }

    // Actualizar cantidad de animales
    const cotizacionActualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: parseInt(id) },
      data: {
        cantidad_animales: parseInt(cantidad_animales),
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Cantidad de animales actualizada exitosamente',
      data: {
        id_cotizacion: cotizacionActualizada.id_cotizacion,
        numero_cotizacion: cotizacionActualizada.numero_cotizacion,
        cantidad_animales_anterior: cotizacionExistente.cantidad_animales,
        cantidad_animales_nueva: cotizacionActualizada.cantidad_animales
      }
    });

  } catch (error) {
    console.error('Error al actualizar cantidad de animales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la cantidad de animales'
    });
  }
};

/**
 * Editar fecha programada en el calendario de vacunación
 */
exports.editarFechaCalendario = async (req, res) => {
  const { id_cotizacion, id_calendario } = req.params;
  const { nueva_fecha, observaciones } = req.body;

  try {
    // Validaciones
    if (!nueva_fecha) {
      return res.status(400).json({
        success: false,
        message: 'La nueva fecha es requerida'
      });
    }

    const fechaProgramada = new Date(nueva_fecha);
    if (isNaN(fechaProgramada.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha no válido'
      });
    }

    // Verificar que el calendario existe y pertenece a la cotización
    const calendarioExistente = await prisma.calendarioVacunacion.findFirst({
      where: {
        id_calendario: parseInt(id_calendario),
        id_cotizacion: parseInt(id_cotizacion)
      },
      include: {
        cotizacion: {
          select: { 
            numero_cotizacion: true, 
            estado: true,
            fecha_inicio_plan: true
          }
        },
        producto: {
          select: { nombre: true }
        }
      }
    });

    if (!calendarioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Registro de calendario no encontrado'
      });
    }

    // Validar que la cotización permita modificaciones
    if (calendarioExistente.cotizacion.estado === 'finalizada' || 
        calendarioExistente.cotizacion.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar el calendario de una cotización finalizada o cancelada'
      });
    }

    // Validar que la nueva fecha no sea anterior al inicio del plan
    if (fechaProgramada < calendarioExistente.cotizacion.fecha_inicio_plan) {
      return res.status(400).json({
        success: false,
        message: 'La fecha programada no puede ser anterior al inicio del plan'
      });
    }

    // Actualizar la fecha
    const calendarioActualizado = await prisma.calendarioVacunacion.update({
      where: { id_calendario: parseInt(id_calendario) },
      data: {
        fecha_programada: fechaProgramada,
        observaciones: observaciones ? 
          `${calendarioExistente.observaciones || ''}\nFecha modificada: ${observaciones}` :
          calendarioExistente.observaciones,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Fecha del calendario actualizada exitosamente',
      data: {
        id_calendario: calendarioActualizado.id_calendario,
        numero_semana: calendarioActualizado.numero_semana,
        producto: calendarioExistente.producto.nombre,
        fecha_anterior: calendarioExistente.fecha_programada,
        fecha_nueva: calendarioActualizado.fecha_programada
      }
    });

  } catch (error) {
    console.error('Error al editar fecha del calendario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la fecha del calendario'
    });
  }
};

/**
 * Desdoblar una dosis del calendario (dividir en varias aplicaciones)
 */
exports.desdoblarDosis = async (req, res) => {
  const { id_cotizacion, id_calendario } = req.params;
  const { desdoblamientos } = req.body;

  try {
    // Validaciones
    if (!desdoblamientos || !Array.isArray(desdoblamientos) || desdoblamientos.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos 2 desdoblamientos'
      });
    }

    // Validar que la suma de cantidades coincida
    const totalCantidad = desdoblamientos.reduce((sum, d) => sum + (d.cantidad_dosis || 0), 0);

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener la dosis original
      const dosisOriginal = await tx.calendarioVacunacion.findFirst({
        where: {
          id_calendario: parseInt(id_calendario),
          id_cotizacion: parseInt(id_cotizacion)
        },
        include: {
          cotizacion: {
            select: { estado: true, numero_cotizacion: true }
          }
        }
      });

      if (!dosisOriginal) {
        throw new Error('Registro de calendario no encontrado');
      }

      if (dosisOriginal.es_desdoblamiento) {
        throw new Error('No se puede desdoblar una dosis que ya es un desdoblamiento');
      }

      if (dosisOriginal.cotizacion.estado === 'finalizada' || 
          dosisOriginal.cotizacion.estado === 'cancelada') {
        throw new Error('No se puede desdoblar dosis de una cotización finalizada o cancelada');
      }

      if (totalCantidad !== dosisOriginal.cantidad_dosis) {
        throw new Error(`La suma de desdoblamientos (${totalCantidad}) debe coincidir con la cantidad original (${dosisOriginal.cantidad_dosis})`);
      }

      // Marcar la dosis original como desdoblada (mantener para referencia)
      await tx.calendarioVacunacion.update({
        where: { id_calendario: parseInt(id_calendario) },
        data: {
          observaciones: `${dosisOriginal.observaciones || ''}\nDosis desdoblada en ${desdoblamientos.length} aplicaciones`,
          updated_at: new Date()
        }
      });

      // Crear los desdoblamientos
      const nuevosDesdoblamientos = [];
      
      for (let i = 0; i < desdoblamientos.length; i++) {
        const desdoblamiento = desdoblamientos[i];
        
        if (!desdoblamiento.fecha_programada || !desdoblamiento.cantidad_dosis) {
          throw new Error(`Desdoblamiento ${i + 1}: fecha y cantidad son requeridas`);
        }

        const nuevoCalendario = await tx.calendarioVacunacion.create({
          data: {
            id_cotizacion: parseInt(id_cotizacion),
            id_producto: dosisOriginal.id_producto,
            numero_semana: dosisOriginal.numero_semana,
            fecha_programada: new Date(desdoblamiento.fecha_programada),
            cantidad_dosis: desdoblamiento.cantidad_dosis,
            estado_dosis: 'pendiente',
            es_desdoblamiento: true,
            dosis_original_id: parseInt(id_calendario),
            numero_desdoblamiento: i + 1,
            observaciones: desdoblamiento.observaciones || `Desdoblamiento ${i + 1} de ${desdoblamientos.length}`
          }
        });

        nuevosDesdoblamientos.push(nuevoCalendario);
      }

      return nuevosDesdoblamientos;
    });

    res.json({
      success: true,
      message: 'Dosis desdoblada exitosamente',
      data: {
        dosis_original_id: parseInt(id_calendario),
        cantidad_desdoblamientos: resultado.length,
        desdoblamientos: resultado.map(d => ({
          id_calendario: d.id_calendario,
          numero_desdoblamiento: d.numero_desdoblamiento,
          fecha_programada: d.fecha_programada,
          cantidad_dosis: d.cantidad_dosis
        }))
      }
    });

  } catch (error) {
    console.error('Error al desdoblar dosis:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al desdoblar la dosis'
    });
  }
};

/**
 * Obtener desdoblamientos de una dosis
 */
exports.obtenerDesdoblamientos = async (req, res) => {
  const { id_calendario } = req.params;

  try {
    const desdoblamientos = await prisma.calendarioVacunacion.findMany({
      where: {
        dosis_original_id: parseInt(id_calendario)
      },
      include: {
        producto: {
          select: { nombre: true, tipo_producto: true }
        }
      },
      orderBy: {
        numero_desdoblamiento: 'asc'
      }
    });

    // También obtener la dosis original
    const dosisOriginal = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        producto: {
          select: { nombre: true, tipo_producto: true }
        }
      }
    });

    if (!dosisOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Dosis original no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        dosis_original: {
          id_calendario: dosisOriginal.id_calendario,
          numero_semana: dosisOriginal.numero_semana,
          fecha_programada: dosisOriginal.fecha_programada,
          cantidad_dosis: dosisOriginal.cantidad_dosis,
          producto: dosisOriginal.producto.nombre,
          estado_dosis: dosisOriginal.estado_dosis
        },
        desdoblamientos: desdoblamientos.map(d => ({
          id_calendario: d.id_calendario,
          numero_desdoblamiento: d.numero_desdoblamiento,
          fecha_programada: d.fecha_programada,
          cantidad_dosis: d.cantidad_dosis,
          estado_dosis: d.estado_dosis,
          fecha_aplicacion: d.fecha_aplicacion,
          observaciones: d.observaciones
        })),
        resumen: {
          total_desdoblamientos: desdoblamientos.length,
          cantidad_total: desdoblamientos.reduce((sum, d) => sum + d.cantidad_dosis, 0),
          desdoblamientos_pendientes: desdoblamientos.filter(d => d.estado_dosis === 'pendiente').length,
          desdoblamientos_aplicados: desdoblamientos.filter(d => d.estado_dosis === 'aplicada').length
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener desdoblamientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los desdoblamientos'
    });
  }
};

/**
 * Eliminar un desdoblamiento
 */
exports.eliminarDesdoblamiento = async (req, res) => {
  const { id_calendario } = req.params;

  try {
    const desdoblamiento = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        cotizacion: {
          select: { estado: true }
        }
      }
    });

    if (!desdoblamiento) {
      return res.status(404).json({
        success: false,
        message: 'Desdoblamiento no encontrado'
      });
    }

    if (!desdoblamiento.es_desdoblamiento) {
      return res.status(400).json({
        success: false,
        message: 'Este registro no es un desdoblamiento'
      });
    }

    if (desdoblamiento.estado_dosis === 'aplicada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un desdoblamiento ya aplicado'
      });
    }

    if (desdoblamiento.cotizacion.estado === 'finalizada' || 
        desdoblamiento.cotizacion.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar desdoblamientos de una cotización finalizada o cancelada'
      });
    }

    await prisma.calendarioVacunacion.delete({
      where: { id_calendario: parseInt(id_calendario) }
    });

    res.json({
      success: true,
      message: 'Desdoblamiento eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar desdoblamiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el desdoblamiento'
    });
  }
};

/**
 * Generar remito PDF de entrega de dosis
 */
exports.generarRemitoPDF = async (req, res) => {
  try {
    const { id_calendario } = req.params;
    
    // Obtener datos adicionales del body si es una petición POST
    const {
      cantidad_entregada,
      responsable_entrega,
      responsable_recibe,
      observaciones_entrega,
      tipo_entrega
    } = req.body || {};

    // Obtener datos del calendario con todas las relaciones necesarias
    const calendario = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        },
        producto: true,
        control_entregas: {
          orderBy: { fecha_entrega: 'desc' },
          take: 1 // Solo la última entrega
        }
      }
    });

    if (!calendario) {
      return res.status(404).json({
        success: false,
        message: 'Calendario no encontrado'
      });
    }

    // Usar datos del body si están disponibles (POST), sino usar última entrega (GET)
    let datosEntrega;
    if (req.method === 'POST' && cantidad_entregada !== undefined) {
      // Usar datos del POST request
      datosEntrega = {
        cantidad_entregada: cantidad_entregada,
        tipo_entrega: tipo_entrega || 'completa',
        fecha_entrega: new Date(),
        responsable_entrega: responsable_entrega || 'Sistema',
        responsable_recibe: responsable_recibe || '',
        observaciones_entrega: observaciones_entrega || '',
        estado: tipo_entrega === 'parcial' ? 'parcial' : 'completo'
      };
    } else {
      // Usar última entrega registrada (método GET)
      if (!calendario.control_entregas.length) {
        return res.status(400).json({
          success: false,
          message: 'No hay entregas registradas para este calendario'
        });
      }
      const ultimaEntrega = calendario.control_entregas[0];
      
      // Separar responsable_entrega si contiene ambos datos
      let responsableEntrega = ultimaEntrega.responsable_entrega || '';
      let responsableRecibe = '';
      
      if (responsableEntrega.includes('|')) {
        const partes = responsableEntrega.split('|');
        responsableEntrega = partes[0]?.replace('Entrega:', '').trim() || '';
        responsableRecibe = partes[1]?.replace('Recibe:', '').trim() || '';
      }
      
      datosEntrega = {
        cantidad_entregada: ultimaEntrega.cantidad_entregada,
        tipo_entrega: ultimaEntrega.tipo_entrega,
        fecha_entrega: ultimaEntrega.fecha_entrega,
        responsable_entrega: responsableEntrega,
        responsable_recibe: responsableRecibe,
        observaciones_entrega: calendario.observaciones_entrega || ultimaEntrega.observaciones || '',
        estado: calendario.estado_entrega
      };
    }

    // Calcular dosis restantes según el tipo de entrega
    let dosisRestantes;
    if (datosEntrega.tipo_entrega === 'completa') {
      dosisRestantes = 0; // Si es completa, no quedan restantes
    } else {
      // Para entregas parciales, calcular las restantes de esa semana específica
      dosisRestantes = calendario.cantidad_dosis - datosEntrega.cantidad_entregada;
    }

    // Preparar datos para el template
    const pdfData = {
      cliente: {
        nombre: calendario.cotizacion.cliente.nombre,
        email: calendario.cotizacion.cliente.email,
        telefono: calendario.cotizacion.cliente.telefono,
        direccion: calendario.cotizacion.cliente.direccion,
        localidad: calendario.cotizacion.cliente.localidad,
        cuit: calendario.cotizacion.cliente.cuit
      },
      plan: {
        numeroCotizacion: calendario.cotizacion.numero_cotizacion,
        numeroSemana: calendario.numero_semana,
        fechaProgramada: calendario.fecha_programada,
        cantidadAnimales: calendario.cotizacion.cantidad_animales,
        estado: calendario.cotizacion.estado,
        fechaInicio: calendario.cotizacion.fecha_inicio_plan
      },
      producto: {
        nombre: calendario.producto.nombre,
        descripcion: calendario.producto.descripcion,
        cantidadProgramada: calendario.cantidad_dosis
      },
      entrega: {
        cantidadEntregada: datosEntrega.cantidad_entregada,
        tipoEntrega: datosEntrega.tipo_entrega,
        fechaEntrega: datosEntrega.fecha_entrega,
        responsable: datosEntrega.responsable_entrega,
        responsableRecibe: datosEntrega.responsable_recibe,
        observaciones_entrega: datosEntrega.observaciones_entrega,
        estado: datosEntrega.estado,
        // Usar las dosis restantes calculadas
        dosisRestantes: dosisRestantes,
        cantidadProgramadaTotal: calendario.cantidad_dosis
      }
    };

    // Generar PDF
    const pdfBuffer = await pdfService.generateRemitoPDF(pdfData);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="remito-entrega-${calendario.cotizacion.numero_cotizacion}-semana-${calendario.numero_semana}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al generar remito PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el remito PDF: ' + error.message
    });
  }
};

// ===== FUNCIONES DE CALENDARIO =====

const getCalendarioVacunacion = async (req, res) => {
  try {
    const { id } = req.params;

    const calendario = await prisma.calendarioVacunacion.findMany({
      where: { id_cotizacion: parseInt(id) },
      include: {
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            descripcion: true,
            tipo_producto: true
          }
        }
      },
      orderBy: [
        { numero_semana: 'asc' },
        { id_calendario: 'asc' }
      ]
    });

    // Transformar los datos para que coincidan con lo que espera el frontend
    const calendarioFormateado = calendario.map(item => ({
      id_calendario: item.id_calendario,
      semana_aplicacion: item.numero_semana,
      fecha_aplicacion_programada: item.fecha_programada ? item.fecha_programada.toISOString().split('T')[0] : null,
      vacuna_nombre: item.producto?.nombre || 'Producto no encontrado',
      vacuna_tipo: item.producto?.tipo_producto || 'N/A',
      vacuna_descripcion: item.producto?.descripcion || '',
      cantidad_dosis: item.cantidad_dosis,
      estado_dosis: item.estado_dosis,
      dosis_por_animal: item.cantidad_dosis || 1,
      total_dosis: item.cantidad_dosis || 1
    }));

    res.json(calendarioFormateado);
  } catch (error) {
    console.error('Error obteniendo calendario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el calendario de vacunación: ' + error.message
    });
  }
};

const editarFechaCalendario = async (req, res) => {
  try {
    const { id_cotizacion, id_calendario } = req.params;
    const { fecha_aplicacion_programada } = req.body;

    // Validar que la fecha sea válida
    if (!fecha_aplicacion_programada) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de aplicación es requerida'
      });
    }

    // Actualizar la fecha en el calendario
    const calendarioActualizado = await prisma.calendarioVacunacion.update({
      where: { id_calendario: parseInt(id_calendario) },
      data: {
        fecha_programada: new Date(fecha_aplicacion_programada)
      },
      include: {
        producto: {
          select: {
            nombre: true,
            tipo_producto: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Fecha actualizada correctamente',
      calendario: {
        id_calendario: calendarioActualizado.id_calendario,
        semana_aplicacion: calendarioActualizado.numero_semana,
        fecha_aplicacion_programada: calendarioActualizado.fecha_programada.toISOString().split('T')[0],
        vacuna_nombre: calendarioActualizado.producto?.nombre || 'Producto no encontrado',
        vacuna_tipo: calendarioActualizado.producto?.tipo_producto || 'N/A'
      }
    });

  } catch (error) {
    console.error('Error editando fecha del calendario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al editar la fecha del calendario: ' + error.message
    });
  }
};

const desdoblarDosis = async (req, res) => {
  try {
    const { id_cotizacion, id_calendario } = req.params;
    const { fecha_aplicacion, observaciones, numero_desdoblamiento } = req.body;

    // Obtener el calendario original
    const calendarioOriginal = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: { producto: true }
    });

    if (!calendarioOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Calendario no encontrado'
      });
    }

    // Contar desdoblamientos existentes para determinar el número de desdoblamiento
    const desdoblamentosExistentes = await prisma.calendarioVacunacion.count({
      where: {
        dosis_original_id: parseInt(id_calendario)
      }
    });

    const numeroDesdoblamientoCalculado = desdoblamentosExistentes + 1;

    // Crear el desdoblamiento con un numero_semana único
    // Usamos decimales para mantener la semana original pero hacer el registro único
    const numeroSemanaUnico = calendarioOriginal.numero_semana + (numeroDesdoblamientoCalculado * 0.01);

    // Crear el desdoblamiento
    const desdoblamiento = await prisma.calendarioVacunacion.create({
      data: {
        id_cotizacion: parseInt(id_cotizacion),
        id_producto: calendarioOriginal.id_producto,
        numero_semana: Math.round(numeroSemanaUnico * 100), // Convertir a entero manteniendo la diferencia
        fecha_programada: new Date(fecha_aplicacion),
        cantidad_dosis: calendarioOriginal.cantidad_dosis,
        estado_dosis: 'pendiente',
        es_desdoblamiento: true,
        dosis_original_id: parseInt(id_calendario),
        numero_desdoblamiento: numeroDesdoblamientoCalculado,
        observaciones: observaciones || `Desdoblamiento #${numeroDesdoblamientoCalculado}`
      },
      include: {
        producto: {
          select: {
            nombre: true,
            tipo_producto: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Desdoblamiento creado correctamente',
      desdoblamiento: {
        id_calendario: desdoblamiento.id_calendario,
        semana_aplicacion: desdoblamiento.numero_semana,
        fecha_aplicacion_programada: desdoblamiento.fecha_programada.toISOString().split('T')[0],
        vacuna_nombre: desdoblamiento.producto?.nombre || 'Producto no encontrado',
        vacuna_tipo: desdoblamiento.producto?.tipo_producto || 'N/A',
        es_desdoblamiento: true,
        observaciones: desdoblamiento.observaciones
      }
    });

  } catch (error) {
    console.error('Error creando desdoblamiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el desdoblamiento: ' + error.message
    });
  }
};

// Exportar las nuevas funciones del calendario
exports.getCalendarioVacunacion = getCalendarioVacunacion;
exports.editarFechaCalendario = editarFechaCalendario;
exports.desdoblarDosis = desdoblarDosis;
