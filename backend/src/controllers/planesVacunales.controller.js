const prisma = require('../lib/prisma');

// ===== PLANES VACUNALES =====

exports.getPlanes = async (req, res) => {
  try {
    const { estado, lista_precio } = req.query;
    
    let whereClause = {};
    if (estado) {
      whereClause.estado = estado;
    }
    if (lista_precio) {
      whereClause.id_lista_precio = parseInt(lista_precio);
    }

    const planes = await prisma.planVacunal.findMany({
      where: whereClause,
      include: {
        lista_precio: {
          select: {
            tipo: true,
            nombre: true
          }
        },
        productos_plan: {
          include: {
            producto: {
              select: {
                id_producto: true,
                nombre: true,
                descripcion: true
              }
            }
          },
          orderBy: {
            semana_inicio: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Formatear respuesta
    const planesFormatted = planes.map(plan => ({
      ...plan,
      id_plan: Number(plan.id_plan),
      duracion_semanas: Number(plan.duracion_semanas),
      precio_total: plan.precio_total ? parseFloat(plan.precio_total) : null,
      lista_precio_nombre: plan.lista_precio?.nombre || null,
      lista_precio_tipo: plan.lista_precio?.tipo || null,
      productos: plan.productos_plan.map(pp => ({
        id_plan_producto: Number(pp.id_plan_producto),
        id_producto: Number(pp.id_producto),
        nombre_producto: pp.producto.nombre,
        descripcion_producto: pp.producto.descripcion,
        cantidad_total: pp.cantidad_total,
        dosis_por_semana: pp.dosis_por_semana,
        semana_inicio: Number(pp.semana_inicio),
        semana_fin: pp.semana_fin ? Number(pp.semana_fin) : null,
        observaciones: pp.observaciones
      }))
    }));

    res.json(planesFormatted);
  } catch (error) {
    console.error('Error al obtener planes vacunales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id) },
      include: {
        lista_precio: true,
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
          },
          orderBy: {
            semana_inicio: 'asc'
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan vacunal no encontrado' });
    }

    // Formatear respuesta con precios según lista
    const planFormatted = {
      ...plan,
      id_plan: Number(plan.id_plan),
      duracion_semanas: Number(plan.duracion_semanas),
      precio_total: plan.precio_total ? parseFloat(plan.precio_total) : null,
      productos: plan.productos_plan.map(pp => {
        const precioPorLista = pp.producto.precios_por_lista.find(
          precio => precio.id_lista === plan.id_lista_precio && precio.activo
        );
        
        return {
          id_plan_producto: Number(pp.id_plan_producto),
          id_producto: Number(pp.id_producto),
          nombre_producto: pp.producto.nombre,
          descripcion_producto: pp.producto.descripcion,
          cantidad_total: pp.cantidad_total,
          dosis_por_semana: pp.dosis_por_semana,
          semana_inicio: Number(pp.semana_inicio),
          semana_fin: pp.semana_fin ? Number(pp.semana_fin) : null,
          precio_unitario: precioPorLista ? parseFloat(precioPorLista.precio) : parseFloat(pp.producto.precio_unitario),
          subtotal: precioPorLista ? 
            parseFloat(precioPorLista.precio) * pp.cantidad_total : 
            parseFloat(pp.producto.precio_unitario) * pp.cantidad_total,
          observaciones: pp.observaciones
        };
      })
    };

    res.json(planFormatted);
  } catch (error) {
    console.error('Error al obtener plan vacunal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      duracion_semanas, 
      estado,
      id_lista_precio, 
      observaciones,
      productos 
    } = req.body;

    // Validaciones
    if (!nombre || !duracion_semanas) {
      return res.status(400).json({ 
        error: 'Nombre y duración en semanas son obligatorios' 
      });
    }

    if (duracion_semanas < 1 || duracion_semanas > 52) {
      return res.status(400).json({ 
        error: 'La duración debe estar entre 1 y 52 semanas' 
      });
    }

    // Validar estado si se proporciona
    if (estado && !['activo', 'inactivo', 'borrador'].includes(estado)) {
      return res.status(400).json({ 
        error: 'Estado debe ser: activo, inactivo o borrador' 
      });
    }

    if (productos && productos.length > 0) {
      // Validar que las semanas estén dentro del rango del plan
      for (const producto of productos) {
        if (producto.semana_inicio < 1 || producto.semana_inicio > duracion_semanas) {
          return res.status(400).json({ 
            error: `Semana de inicio ${producto.semana_inicio} fuera del rango del plan` 
          });
        }
        if (producto.semana_fin && producto.semana_fin > duracion_semanas) {
          return res.status(400).json({ 
            error: `Semana de fin ${producto.semana_fin} fuera del rango del plan` 
          });
        }
      }
    }

    // Crear plan con transacción
    const nuevoPlan = await prisma.$transaction(async (tx) => {
      // Crear el plan
      const plan = await tx.planVacunal.create({
        data: {
          nombre,
          descripcion: descripcion || '',
          duracion_semanas: parseInt(duracion_semanas),
          estado: estado || 'borrador',
          id_lista_precio: id_lista_precio ? parseInt(id_lista_precio) : null,
          observaciones: observaciones || '',
          created_by: req.user?.id_usuario || null
        }
      });

      // Agregar productos si se proporcionaron
      if (productos && productos.length > 0) {
        await tx.planProducto.createMany({
          data: productos.map(producto => ({
            id_plan: plan.id_plan,
            id_producto: parseInt(producto.id_producto),
            cantidad_total: parseInt(producto.cantidad_total),
            dosis_por_semana: parseInt(producto.dosis_por_semana) || 1,
            semana_inicio: parseInt(producto.semana_inicio),
            semana_fin: producto.semana_fin ? parseInt(producto.semana_fin) : null,
            observaciones: producto.observaciones || ''
          }))
        });
      }

      return plan;
    });

    res.status(201).json({
      message: 'Plan vacunal creado exitosamente',
      plan: {
        ...nuevoPlan,
        id_plan: Number(nuevoPlan.id_plan),
        duracion_semanas: Number(nuevoPlan.duracion_semanas)
      }
    });
  } catch (error) {
    console.error('Error al crear plan vacunal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      duracion_semanas, 
      estado,
      id_lista_precio, 
      observaciones,
      productos 
    } = req.body;

    // Verificar que el plan existe
    const planExistente = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id) }
    });

    if (!planExistente) {
      return res.status(404).json({ error: 'Plan vacunal no encontrado' });
    }

    // Validaciones
    if (duracion_semanas && (duracion_semanas < 1 || duracion_semanas > 52)) {
      return res.status(400).json({ 
        error: 'La duración debe estar entre 1 y 52 semanas' 
      });
    }

    // Validar estado si se proporciona
    if (estado && !['activo', 'inactivo', 'borrador'].includes(estado)) {
      return res.status(400).json({ 
        error: 'Estado debe ser: activo, inactivo o borrador' 
      });
    }

    // Actualizar plan con transacción
    const planActualizado = await prisma.$transaction(async (tx) => {
      // Actualizar datos del plan
      const plan = await tx.planVacunal.update({
        where: { id_plan: parseInt(id) },
        data: {
          ...(nombre && { nombre }),
          ...(descripcion !== undefined && { descripcion }),
          ...(duracion_semanas && { duracion_semanas: parseInt(duracion_semanas) }),
          ...(estado && { estado }),
          ...(id_lista_precio !== undefined && { 
            id_lista_precio: id_lista_precio ? parseInt(id_lista_precio) : null 
          }),
          ...(observaciones !== undefined && { observaciones }),
          updated_by: req.user?.id_usuario || null,
          updated_at: new Date()
        }
      });

      // Si se proporcionan productos, reemplazar los existentes
      if (productos) {
        // Eliminar productos existentes
        await tx.planProducto.deleteMany({
          where: { id_plan: parseInt(id) }
        });

        // Agregar nuevos productos
        if (productos.length > 0) {
          await tx.planProducto.createMany({
            data: productos.map(producto => ({
              id_plan: parseInt(id),
              id_producto: parseInt(producto.id_producto),
              cantidad_total: parseInt(producto.cantidad_total),
              dosis_por_semana: parseInt(producto.dosis_por_semana) || 1,
              semana_inicio: parseInt(producto.semana_inicio),
              semana_fin: producto.semana_fin ? parseInt(producto.semana_fin) : null,
              observaciones: producto.observaciones || ''
            }))
          });
        }
      }

      return plan;
    });

    res.json({
      message: 'Plan vacunal actualizado exitosamente',
      plan: {
        ...planActualizado,
        id_plan: Number(planActualizado.id_plan),
        duracion_semanas: Number(planActualizado.duracion_semanas)
      }
    });
  } catch (error) {
    console.error('Error al actualizar plan vacunal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el plan existe
    const planExistente = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id) }
    });

    if (!planExistente) {
      return res.status(404).json({ error: 'Plan vacunal no encontrado' });
    }

    // Eliminar plan (esto eliminará automáticamente los productos relacionados por la cascada)
    await prisma.planVacunal.delete({
      where: { id_plan: parseInt(id) }
    });

    res.json({ message: 'Plan vacunal eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar plan vacunal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== LISTAS DE PRECIOS =====

exports.getListasPrecios = async (req, res) => {
  try {
    const { activa } = req.query;
    
    let whereClause = {};
    if (activa !== undefined) {
      whereClause.activa = activa === 'true';
    }

    const listas = await prisma.listaPrecio.findMany({
      where: whereClause,
      orderBy: {
        tipo: 'asc'
      }
    });

    const listasFormatted = listas.map(lista => ({
      ...lista,
      id_lista: Number(lista.id_lista)
    }));

    res.json(listasFormatted);
  } catch (error) {
    console.error('Error al obtener listas de precios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.createListaPrecio = async (req, res) => {
  try {
    const { tipo, nombre, descripcion } = req.body;

    if (!tipo || !nombre) {
      return res.status(400).json({ 
        error: 'Tipo y nombre son obligatorios' 
      });
    }

    const nuevaLista = await prisma.listaPrecio.create({
      data: {
        tipo,
        nombre,
        descripcion: descripcion || '',
        created_by: req.user?.id_usuario || null
      }
    });

    res.status(201).json({
      message: 'Lista de precios creada exitosamente',
      lista: {
        ...nuevaLista,
        id_lista: Number(nuevaLista.id_lista)
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Ya existe una lista de precios con ese tipo' 
      });
    }
    console.error('Error al crear lista de precios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateListaPrecio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activa } = req.body;

    const listaActualizada = await prisma.listaPrecio.update({
      where: { id_lista: parseInt(id) },
      data: {
        ...(nombre && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(activa !== undefined && { activa }),
        updated_by: req.user?.id_usuario || null,
        updated_at: new Date()
      }
    });

    res.json({
      message: 'Lista de precios actualizada exitosamente',
      lista: {
        ...listaActualizada,
        id_lista: Number(listaActualizada.id_lista)
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lista de precios no encontrada' });
    }
    console.error('Error al actualizar lista de precios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== PRECIOS POR LISTA =====

exports.getPreciosPorLista = async (req, res) => {
  try {
    const { id_lista, id_producto, activo } = req.query;
    
    let whereClause = {};
    if (id_lista) {
      whereClause.id_lista = parseInt(id_lista);
    }
    if (id_producto) {
      whereClause.id_producto = parseInt(id_producto);
    }
    if (activo !== undefined) {
      whereClause.activo = activo === 'true';
    }

    const precios = await prisma.precioPorLista.findMany({
      where: whereClause,
      include: {
        producto: {
          select: {
            nombre: true,
            descripcion: true
          }
        },
        lista: {
          select: {
            tipo: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { id_lista: 'asc' },
        { producto: { nombre: 'asc' } }
      ]
    });

    const preciosFormatted = precios.map(precio => ({
      ...precio,
      id_precio_lista: Number(precio.id_precio_lista),
      id_producto: Number(precio.id_producto),
      id_lista: Number(precio.id_lista),
      precio: parseFloat(precio.precio),
      producto_nombre: precio.producto.nombre,
      lista_tipo: precio.lista.tipo,
      lista_nombre: precio.lista.nombre
    }));

    res.json(preciosFormatted);
  } catch (error) {
    console.error('Error al obtener precios por lista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.setPrecioPorLista = async (req, res) => {
  try {
    const { id_producto, id_lista, precio, fecha_vigencia } = req.body;

    if (!id_producto || !id_lista || precio === undefined) {
      return res.status(400).json({ 
        error: 'Producto, lista y precio son obligatorios' 
      });
    }

    // Desactivar precios anteriores para este producto y lista
    await prisma.precioPorLista.updateMany({
      where: {
        id_producto: parseInt(id_producto),
        id_lista: parseInt(id_lista),
        activo: true
      },
      data: {
        activo: false,
        updated_at: new Date()
      }
    });

    // Crear nuevo precio
    const nuevoPrecio = await prisma.precioPorLista.create({
      data: {
        id_producto: parseInt(id_producto),
        id_lista: parseInt(id_lista),
        precio: parseFloat(precio),
        fecha_vigencia: fecha_vigencia ? new Date(fecha_vigencia) : new Date(),
        created_by: req.user?.id_usuario || null
      }
    });

    res.status(201).json({
      message: 'Precio por lista establecido exitosamente',
      precio: {
        ...nuevoPrecio,
        id_precio_lista: Number(nuevoPrecio.id_precio_lista),
        id_producto: Number(nuevoPrecio.id_producto),
        id_lista: Number(nuevoPrecio.id_lista),
        precio: parseFloat(nuevoPrecio.precio)
      }
    });
  } catch (error) {
    console.error('Error al establecer precio por lista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== UTILIDADES =====

exports.calcularPrecioPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id) },
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

    let precioTotal = 0;
    const detallePrecios = [];

    for (const planProducto of plan.productos_plan) {
      let precioUnitario = parseFloat(planProducto.producto.precio_unitario);
      
      // Si el plan tiene lista de precios, usar ese precio
      if (plan.id_lista_precio) {
        const precioPorLista = planProducto.producto.precios_por_lista.find(
          precio => precio.id_lista === plan.id_lista_precio && precio.activo
        );
        if (precioPorLista) {
          precioUnitario = parseFloat(precioPorLista.precio);
        }
      }

      const subtotal = precioUnitario * planProducto.cantidad_total;
      precioTotal += subtotal;

      detallePrecios.push({
        id_producto: Number(planProducto.id_producto),
        nombre_producto: planProducto.producto.nombre,
        cantidad: planProducto.cantidad_total,
        precio_unitario: precioUnitario,
        subtotal: subtotal
      });
    }

    // Actualizar precio total en el plan
    await prisma.planVacunal.update({
      where: { id_plan: parseInt(id) },
      data: {
        precio_total: precioTotal,
        updated_at: new Date()
      }
    });

    res.json({
      id_plan: Number(plan.id_plan),
      nombre_plan: plan.nombre,
      precio_total: precioTotal,
      detalle_precios: detallePrecios
    });
  } catch (error) {
    console.error('Error al calcular precio del plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
