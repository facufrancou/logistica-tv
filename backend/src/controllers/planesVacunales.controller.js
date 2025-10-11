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
        // Solo incluir vacunas
        vacunas_plan: {
          include: {
            vacuna: {
              select: {
                id_vacuna: true,
                codigo: true,
                nombre: true,
                detalle: true,
                precio_lista: true,
                proveedor: {
                  select: {
                    nombre: true
                  }
                },
                patologia: {
                  select: {
                    nombre: true
                  }
                },
                presentacion: {
                  select: {
                    nombre: true,
                    unidad_medida: true
                  }
                }
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
      // Solo vacunas
      vacunas: plan.vacunas_plan ? plan.vacunas_plan.map(pv => ({
        id_plan_vacuna: Number(pv.id_plan_vacuna),
        id_vacuna: Number(pv.id_vacuna),
        codigo_vacuna: pv.vacuna.codigo,
        nombre_vacuna: pv.vacuna.nombre,
        detalle_vacuna: pv.vacuna.detalle,
        proveedor: pv.vacuna.proveedor.nombre,
        patologia: pv.vacuna.patologia.nombre,
        presentacion: `${pv.vacuna.presentacion.nombre} (${pv.vacuna.presentacion.unidad_medida})`,
        precio_lista: parseFloat(pv.vacuna.precio_lista),
        cantidad_total: pv.cantidad_total,
        dosis_por_semana: pv.dosis_por_semana,
        semana_inicio: Number(pv.semana_inicio),
        semana_fin: pv.semana_fin ? Number(pv.semana_fin) : null,
        observaciones: pv.observaciones
      })) : []
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
        // Solo incluir vacunas
        vacunas_plan: {
          include: {
            vacuna: {
              include: {
                proveedor: {
                  select: {
                    nombre: true
                  }
                },
                patologia: {
                  select: {
                    nombre: true
                  }
                },
                presentacion: {
                  select: {
                    nombre: true,
                    unidad_medida: true
                  }
                },
                via_aplicacion: {
                  select: {
                    nombre: true
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
      return res.status(404).json({ message: "Plan no encontrado" });
    }

    console.log('Plan encontrado:', {
      id: plan.id_plan,
      nombre: plan.nombre,
      vacunas_plan_count: plan.vacunas_plan?.length || 0
    });

    res.json(plan);
  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({ message: "Error interno del servidor" });
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
      vacunas 
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

    // Validar vacunas si se proporcionan
    if (vacunas && vacunas.length > 0) {
      for (const vacuna of vacunas) {
        if (vacuna.semana_inicio < 1 || vacuna.semana_inicio > duracion_semanas) {
          return res.status(400).json({ 
            error: `Semana de inicio ${vacuna.semana_inicio} fuera del rango del plan` 
          });
        }
        if (vacuna.semana_fin && vacuna.semana_fin > duracion_semanas) {
          return res.status(400).json({ 
            error: `Semana de fin ${vacuna.semana_fin} fuera del rango del plan` 
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

      // Agregar vacunas al plan
      if (vacunas && vacunas.length > 0) {
        console.log('Creando vacunas del plan:', vacunas);
        await tx.planVacuna.createMany({
          data: vacunas.map(vacuna => ({
            id_plan: plan.id_plan,
            id_vacuna: parseInt(vacuna.id_vacuna),
            cantidad_total: parseInt(vacuna.cantidad_total) || 1,
            dosis_por_semana: parseInt(vacuna.dosis_por_semana) || 1,
            semana_inicio: parseInt(vacuna.semana_inicio),
            semana_fin: vacuna.semana_fin ? parseInt(vacuna.semana_fin) : null,
            observaciones: vacuna.observaciones || ''
          }))
        });
      }

      return plan;
    });

    // Obtener el plan completo con las relaciones
    const planCompleto = await prisma.planVacunal.findUnique({
      where: { id_plan: nuevoPlan.id_plan },
      include: {
        lista_precio: true,
        vacunas_plan: {
          include: {
            vacuna: {
              include: {
                proveedor: {
                  select: {
                    nombre: true
                  }
                },
                patologia: {
                  select: {
                    nombre: true
                  }
                },
                presentacion: {
                  select: {
                    nombre: true,
                    unidad_medida: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('Plan creado exitosamente:', {
      id: planCompleto.id_plan,
      nombre: planCompleto.nombre,
      vacunas_count: planCompleto.vacunas_plan?.length || 0
    });

    res.status(201).json(planCompleto);
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
      vacunas 
    } = req.body;

    console.log('Actualizando plan:', { id, vacunas: vacunas?.length });

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

      // Si se proporcionan vacunas, reemplazar las existentes
      if (vacunas) {
        // Eliminar vacunas existentes
        await tx.planVacuna.deleteMany({
          where: { id_plan: parseInt(id) }
        });

        // Crear nuevas relaciones vacuna-plan si hay vacunas
        if (vacunas.length > 0) {
          const vacunasData = vacunas.map(vacuna => ({
            id_plan: parseInt(id),
            id_vacuna: parseInt(vacuna.id_vacuna),
            cantidad_total: vacuna.cantidad_total || 0,
            dosis_por_semana: vacuna.dosis_por_semana || 0,
            semana_inicio: parseInt(vacuna.semana_inicio),
            semana_fin: vacuna.semana_fin ? parseInt(vacuna.semana_fin) : null,
            observaciones: vacuna.observaciones || null
          }));

          await tx.planVacuna.createMany({
            data: vacunasData
          });
        }
      }

      return plan;
    });

    // Obtener el plan actualizado con las relaciones
    const planCompleto = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id) },
      include: {
        lista_precio: true,
        vacunas_plan: {
          include: {
            vacuna: {
              include: {
                proveedor: {
                  select: {
                    nombre: true
                  }
                },
                patologia: {
                  select: {
                    nombre: true
                  }
                },
                presentacion: {
                  select: {
                    nombre: true,
                    unidad_medida: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('Plan actualizado exitosamente:', {
      id: planCompleto.id_plan,
      nombre: planCompleto.nombre,
      vacunas_count: planCompleto.vacunas_plan?.length || 0
    });

    res.json(planCompleto);
  } catch (error) {
    console.error('Error al actualizar plan:', error);
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

    // Eliminar plan con transacción (primero las vacunas, luego el plan)
    await prisma.$transaction(async (tx) => {
      // Eliminar relaciones con vacunas
      await tx.planVacuna.deleteMany({
        where: { id_plan: parseInt(id) }
      });

      // Eliminar el plan
      await tx.planVacunal.delete({
        where: { id_plan: parseInt(id) }
      });
    });

    console.log('Plan eliminado exitosamente:', { id });

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

// ===== MÉTODOS ESPECÍFICOS PARA VACUNAS =====

/**
 * Obtener vacunas disponibles para agregar a planes
 */
exports.getVacunasDisponibles = async (req, res) => {
  try {
    const { search, id_patologia, id_proveedor, activa = 'true' } = req.query;

    const whereClause = {
      activa: activa === 'true'
    };

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search } },
        { nombre: { contains: search } },
        { detalle: { contains: search } }
      ];
    }

    if (id_patologia) {
      whereClause.id_patologia = parseInt(id_patologia);
    }

    if (id_proveedor) {
      whereClause.id_proveedor = parseInt(id_proveedor);
    }

    const vacunas = await prisma.vacuna.findMany({
      where: whereClause,
      include: {
        proveedor: {
          select: {
            nombre: true
          }
        },
        patologia: {
          select: {
            nombre: true
          }
        },
        presentacion: {
          select: {
            nombre: true,
            unidad_medida: true
          }
        },
        via_aplicacion: {
          select: {
            nombre: true
          }
        },
        stock_vacunas: {
          select: {
            stock_actual: true,
            stock_reservado: true,
            estado_stock: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    const vacunasFormatted = vacunas.map(vacuna => ({
      id_vacuna: Number(vacuna.id_vacuna),
      codigo: vacuna.codigo,
      nombre: vacuna.nombre,
      detalle: vacuna.detalle,
      precio_lista: parseFloat(vacuna.precio_lista),
      proveedor: vacuna.proveedor.nombre,
      patologia: vacuna.patologia.nombre,
      presentacion: `${vacuna.presentacion.nombre} (${vacuna.presentacion.unidad_medida})`,
      via_aplicacion: vacuna.via_aplicacion.nombre,
      stock_total: vacuna.stock_vacunas.reduce((total, stock) => 
        stock.estado_stock === 'disponible' ? total + stock.stock_actual : total, 0),
      stock_reservado: vacuna.stock_vacunas.reduce((total, stock) => 
        total + stock.stock_reservado, 0),
      requiere_frio: vacuna.requiere_frio,
      dias_vencimiento: vacuna.dias_vencimiento
    }));

    res.json(vacunasFormatted);
  } catch (error) {
    console.error('Error al obtener vacunas disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Agregar vacuna a un plan
 */
exports.agregarVacunaAPlan = async (req, res) => {
  try {
    const { id_plan } = req.params;
    const {
      id_vacuna,
      cantidad_total,
      dosis_por_semana = 1,
      semana_inicio,
      semana_fin,
      observaciones
    } = req.body;

    // Validaciones
    if (!id_vacuna || !cantidad_total || !semana_inicio) {
      return res.status(400).json({ 
        error: 'id_vacuna, cantidad_total y semana_inicio son obligatorios' 
      });
    }

    // Verificar que el plan existe
    const plan = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id_plan) }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan vacunal no encontrado' });
    }

    // Verificar que la vacuna existe
    const vacuna = await prisma.vacuna.findUnique({
      where: { id_vacuna: parseInt(id_vacuna) }
    });

    if (!vacuna) {
      return res.status(404).json({ error: 'Vacuna no encontrada' });
    }

    // Verificar que las semanas estén dentro del rango del plan
    if (semana_inicio < 1 || semana_inicio > plan.duracion_semanas) {
      return res.status(400).json({ 
        error: `Semana de inicio ${semana_inicio} fuera del rango del plan (1-${plan.duracion_semanas})` 
      });
    }

    if (semana_fin && semana_fin > plan.duracion_semanas) {
      return res.status(400).json({ 
        error: `Semana de fin ${semana_fin} fuera del rango del plan (1-${plan.duracion_semanas})` 
      });
    }

    // Verificar que no existe ya esa vacuna en el plan
    const vacunaExistente = await prisma.planVacuna.findFirst({
      where: {
        id_plan: parseInt(id_plan),
        id_vacuna: parseInt(id_vacuna)
      }
    });

    if (vacunaExistente) {
      return res.status(400).json({ 
        error: 'Esta vacuna ya está incluida en el plan' 
      });
    }

    // Crear la relación plan-vacuna
    const planVacuna = await prisma.planVacuna.create({
      data: {
        id_plan: parseInt(id_plan),
        id_vacuna: parseInt(id_vacuna),
        cantidad_total: parseInt(cantidad_total),
        dosis_por_semana: parseInt(dosis_por_semana),
        semana_inicio: parseInt(semana_inicio),
        semana_fin: semana_fin ? parseInt(semana_fin) : null,
        observaciones: observaciones || '',
        created_by: req.user?.id_usuario || null
      },
      include: {
        vacuna: {
          include: {
            proveedor: {
              select: { nombre: true }
            },
            patologia: {
              select: { nombre: true }
            },
            presentacion: {
              select: { nombre: true, unidad_medida: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Vacuna agregada al plan exitosamente',
      plan_vacuna: {
        id_plan_vacuna: Number(planVacuna.id_plan_vacuna),
        id_plan: Number(planVacuna.id_plan),
        id_vacuna: Number(planVacuna.id_vacuna),
        codigo_vacuna: planVacuna.vacuna.codigo,
        nombre_vacuna: planVacuna.vacuna.nombre,
        proveedor: planVacuna.vacuna.proveedor.nombre,
        patologia: planVacuna.vacuna.patologia.nombre,
        presentacion: `${planVacuna.vacuna.presentacion.nombre} (${planVacuna.vacuna.presentacion.unidad_medida})`,
        cantidad_total: planVacuna.cantidad_total,
        dosis_por_semana: planVacuna.dosis_por_semana,
        semana_inicio: Number(planVacuna.semana_inicio),
        semana_fin: planVacuna.semana_fin ? Number(planVacuna.semana_fin) : null,
        observaciones: planVacuna.observaciones,
        created_at: planVacuna.created_at
      }
    });
  } catch (error) {
    console.error('Error al agregar vacuna al plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Remover vacuna de un plan
 */
exports.removerVacunaDePlan = async (req, res) => {
  try {
    const { id_plan, id_plan_vacuna } = req.params;

    // Verificar que la relación existe
    const planVacuna = await prisma.planVacuna.findUnique({
      where: { id_plan_vacuna: parseInt(id_plan_vacuna) },
      include: {
        plan: true,
        vacuna: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      }
    });

    if (!planVacuna) {
      return res.status(404).json({ error: 'Relación plan-vacuna no encontrada' });
    }

    if (planVacuna.id_plan !== parseInt(id_plan)) {
      return res.status(400).json({ error: 'La vacuna no pertenece a este plan' });
    }

    // Eliminar la relación
    await prisma.planVacuna.delete({
      where: { id_plan_vacuna: parseInt(id_plan_vacuna) }
    });

    res.json({
      message: 'Vacuna removida del plan exitosamente',
      vacuna_removida: {
        id_plan_vacuna: Number(id_plan_vacuna),
        codigo_vacuna: planVacuna.vacuna.codigo,
        nombre_vacuna: planVacuna.vacuna.nombre
      }
    });
  } catch (error) {
    console.error('Error al remover vacuna del plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
