const prisma = require('../lib/prisma');
const PriceCalculator = require('../lib/priceCalculator');

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
