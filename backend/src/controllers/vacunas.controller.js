const prisma = require('../lib/prisma');

// ===== CONTROLADOR DE VACUNAS =====

/**
 * Obtener todas las vacunas con filtros
 */
exports.getVacunas = async (req, res) => {
  try {
    const { 
      id_proveedor, 
      id_patologia, 
      id_presentacion, 
      id_via_aplicacion,
      activa,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (id_proveedor) where.id_proveedor = parseInt(id_proveedor);
    if (id_patologia) where.id_patologia = parseInt(id_patologia);
    if (id_presentacion) where.id_presentacion = parseInt(id_presentacion);
    if (id_via_aplicacion) where.id_via_aplicacion = parseInt(id_via_aplicacion);
    if (activa !== undefined) where.activa = activa === 'true';
    
    // Búsqueda por texto
    if (search) {
      where.OR = [
        { codigo: { contains: search } },
        { nombre: { contains: search } },
        { detalle: { contains: search } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [vacunas, totalCount] = await Promise.all([
      prisma.vacuna.findMany({
        where,
        include: {
          proveedor: {
            select: {
              id_proveedor: true,
              nombre: true
            }
          },
          patologia: {
            select: {
              id_patologia: true,
              codigo: true,
              nombre: true
            }
          },
          presentacion: {
            select: {
              id_presentacion: true,
              codigo: true,
              nombre: true,
              unidad_medida: true,
              dosis_por_frasco: true
            }
          },
          via_aplicacion: {
            select: {
              id_via_aplicacion: true,
              codigo: true,
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
        },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.vacuna.count({ where })
    ]);

    // Formatear respuesta
    const vacunasFormatted = vacunas.map(vacuna => {
      // Calcular stock total disponible en dosis
      const stockTotalDosis = vacuna.stock_vacunas.reduce((total, stock) => 
        total + (stock.estado_stock === 'disponible' ? stock.stock_actual : 0), 0
      );
      const stockReservadoDosis = vacuna.stock_vacunas.reduce((total, stock) => 
        total + stock.stock_reservado, 0
      );
      
      // Obtener dosis por frasco para conversión
      const dosisPorFrasco = vacuna.presentacion?.dosis_por_frasco || 1;
      
      return {
        ...vacuna,
        id_vacuna: Number(vacuna.id_vacuna),
        id_proveedor: Number(vacuna.id_proveedor),
        id_patologia: Number(vacuna.id_patologia),
        id_presentacion: Number(vacuna.id_presentacion),
        id_via_aplicacion: Number(vacuna.id_via_aplicacion),
        precio_lista: parseFloat(vacuna.precio_lista),
        // Stock en dosis (base de datos)
        stock_total_dosis: stockTotalDosis,
        stock_reservado_total_dosis: stockReservadoDosis,
        // Stock en frascos (para UI)
        stock_total_frascos: Math.floor(stockTotalDosis / dosisPorFrasco),
        stock_reservado_total_frascos: Math.floor(stockReservadoDosis / dosisPorFrasco),
        // Mantener compatibilidad con frontend que espera estos campos
        stock_total: stockTotalDosis,
        stock_reservado_total: stockReservadoDosis,
        // Información de conversión
        dosis_por_frasco: dosisPorFrasco
      };
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: vacunasFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener vacunas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener una vacuna por ID
 */
exports.getVacunaById = async (req, res) => {
  try {
    const { id } = req.params;

    const vacuna = await prisma.vacuna.findUnique({
      where: { id_vacuna: parseInt(id) },
      include: {
        proveedor: true,
        patologia: true,
        presentacion: true,
        via_aplicacion: true,
        stock_vacunas: {
          orderBy: {
            fecha_vencimiento: 'asc'
          }
        }
      }
    });

    if (!vacuna) {
      return res.status(404).json({ error: 'Vacuna no encontrada' });
    }

    // Formatear respuesta
    const vacunaFormatted = {
      ...vacuna,
      id_vacuna: Number(vacuna.id_vacuna),
      id_proveedor: Number(vacuna.id_proveedor),
      id_patologia: Number(vacuna.id_patologia),
      id_presentacion: Number(vacuna.id_presentacion),
      id_via_aplicacion: Number(vacuna.id_via_aplicacion),
      precio_lista: parseFloat(vacuna.precio_lista),
      stock_vacunas: vacuna.stock_vacunas.map(stock => ({
        ...stock,
        id_stock_vacuna: Number(stock.id_stock_vacuna),
        precio_compra: stock.precio_compra ? parseFloat(stock.precio_compra) : null
      }))
    };

    res.json(vacunaFormatted);

  } catch (error) {
    console.error('Error al obtener vacuna:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear nueva vacuna
 */
exports.createVacuna = async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      detalle,
      id_proveedor,
      id_patologia,
      id_presentacion,
      id_via_aplicacion,
      precio_lista,
      requiere_frio = false,
      dias_vencimiento,
      observaciones
    } = req.body;

    // Validaciones
    if (!codigo || !nombre || !id_proveedor || !id_patologia || !id_presentacion || !id_via_aplicacion || precio_lista === undefined) {
      return res.status(400).json({ 
        error: 'Campos obligatorios: código, nombre, proveedor, patología, presentación, vía de aplicación y precio' 
      });
    }

    // Verificar que no exista otra vacuna con el mismo código
    const vacunaExistente = await prisma.vacuna.findUnique({
      where: { codigo }
    });

    if (vacunaExistente) {
      return res.status(400).json({ error: 'Ya existe una vacuna con ese código' });
    }

    const nuevaVacuna = await prisma.vacuna.create({
      data: {
        codigo,
        nombre,
        detalle: detalle || null,
        id_proveedor: parseInt(id_proveedor),
        id_patologia: parseInt(id_patologia),
        id_presentacion: parseInt(id_presentacion),
        id_via_aplicacion: parseInt(id_via_aplicacion),
        precio_lista: parseFloat(precio_lista),
        requiere_frio: Boolean(requiere_frio),
        dias_vencimiento: dias_vencimiento ? parseInt(dias_vencimiento) : null,
        observaciones: observaciones || null,
        created_by: req.user?.id || null
      },
      include: {
        proveedor: true,
        patologia: true,
        presentacion: true,
        via_aplicacion: true
      }
    });

    const vacunaFormatted = {
      ...nuevaVacuna,
      id_vacuna: Number(nuevaVacuna.id_vacuna),
      id_proveedor: Number(nuevaVacuna.id_proveedor),
      id_patologia: Number(nuevaVacuna.id_patologia),
      id_presentacion: Number(nuevaVacuna.id_presentacion),
      id_via_aplicacion: Number(nuevaVacuna.id_via_aplicacion),
      precio_lista: parseFloat(nuevaVacuna.precio_lista)
    };

    res.status(201).json(vacunaFormatted);

  } catch (error) {
    console.error('Error al crear vacuna:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una vacuna con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualizar vacuna
 */
exports.updateVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      nombre,
      detalle,
      id_proveedor,
      id_patologia,
      id_presentacion,
      id_via_aplicacion,
      precio_lista,
      requiere_frio,
      dias_vencimiento,
      observaciones,
      activa
    } = req.body;

    // Verificar que la vacuna existe
    const vacunaExistente = await prisma.vacuna.findUnique({
      where: { id_vacuna: parseInt(id) }
    });

    if (!vacunaExistente) {
      return res.status(404).json({ error: 'Vacuna no encontrada' });
    }

    // Si se cambia el código, verificar que no exista otro con el mismo código
    if (codigo && codigo !== vacunaExistente.codigo) {
      const otraVacuna = await prisma.vacuna.findUnique({
        where: { codigo }
      });

      if (otraVacuna) {
        return res.status(400).json({ error: 'Ya existe otra vacuna con ese código' });
      }
    }

    const vacunaActualizada = await prisma.vacuna.update({
      where: { id_vacuna: parseInt(id) },
      data: {
        codigo: codigo || vacunaExistente.codigo,
        nombre: nombre || vacunaExistente.nombre,
        detalle: detalle !== undefined ? detalle : vacunaExistente.detalle,
        id_proveedor: id_proveedor ? parseInt(id_proveedor) : vacunaExistente.id_proveedor,
        id_patologia: id_patologia ? parseInt(id_patologia) : vacunaExistente.id_patologia,
        id_presentacion: id_presentacion ? parseInt(id_presentacion) : vacunaExistente.id_presentacion,
        id_via_aplicacion: id_via_aplicacion ? parseInt(id_via_aplicacion) : vacunaExistente.id_via_aplicacion,
        precio_lista: precio_lista !== undefined ? parseFloat(precio_lista) : vacunaExistente.precio_lista,
        requiere_frio: requiere_frio !== undefined ? Boolean(requiere_frio) : vacunaExistente.requiere_frio,
        dias_vencimiento: dias_vencimiento !== undefined ? (dias_vencimiento ? parseInt(dias_vencimiento) : null) : vacunaExistente.dias_vencimiento,
        observaciones: observaciones !== undefined ? observaciones : vacunaExistente.observaciones,
        activa: activa !== undefined ? Boolean(activa) : vacunaExistente.activa,
        updated_by: req.user?.id || null
      },
      include: {
        proveedor: true,
        patologia: true,
        presentacion: true,
        via_aplicacion: true
      }
    });

    const vacunaFormatted = {
      ...vacunaActualizada,
      id_vacuna: Number(vacunaActualizada.id_vacuna),
      id_proveedor: Number(vacunaActualizada.id_proveedor),
      id_patologia: Number(vacunaActualizada.id_patologia),
      id_presentacion: Number(vacunaActualizada.id_presentacion),
      id_via_aplicacion: Number(vacunaActualizada.id_via_aplicacion),
      precio_lista: parseFloat(vacunaActualizada.precio_lista)
    };

    res.json(vacunaFormatted);

  } catch (error) {
    console.error('Error al actualizar vacuna:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una vacuna con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Eliminar vacuna (soft delete)
 */
exports.deleteVacuna = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la vacuna existe
    const vacuna = await prisma.vacuna.findUnique({
      where: { id_vacuna: parseInt(id) }
    });

    if (!vacuna) {
      return res.status(404).json({ error: 'Vacuna no encontrada' });
    }

    // Soft delete: marcar como inactiva
    const vacunaActualizada = await prisma.vacuna.update({
      where: { id_vacuna: parseInt(id) },
      data: {
        activa: false,
        updated_by: req.user?.id || null
      }
    });

    res.json({ 
      message: 'Vacuna desactivada correctamente',
      id_vacuna: Number(vacunaActualizada.id_vacuna)
    });

  } catch (error) {
    console.error('Error al eliminar vacuna:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener vacunas disponibles (con stock)
 */
exports.getVacunasDisponibles = async (req, res) => {
  try {
    // ✅ OPTIMIZACIÓN: Usar select específico para reducir transferencia de datos
    const vacunas = await prisma.vacuna.findMany({
      where: {
        activa: true,
        stock_vacunas: {
          some: {
            stock_actual: { gt: 0 },
            estado_stock: 'disponible'
          }
        }
      },
      select: {
        id_vacuna: true,
        codigo: true,
        nombre: true,
        detalle: true,
        precio_lista: true,
        requiere_frio: true,
        proveedor: {
          select: {
            id_proveedor: true,
            nombre: true
          }
        },
        patologia: {
          select: {
            id_patologia: true,
            nombre: true,
            codigo: true
          }
        },
        presentacion: {
          select: {
            id_presentacion: true,
            nombre: true,
            unidad_medida: true,
            dosis_por_frasco: true
          }
        },
        via_aplicacion: {
          select: {
            id_via_aplicacion: true,
            nombre: true,
            codigo: true
          }
        },
        stock_vacunas: {
          where: {
            estado_stock: 'disponible',
            stock_actual: { gt: 0 }
          },
          select: {
            id_stock_vacuna: true,
            stock_actual: true,
            stock_reservado: true,
            lote: true,
            fecha_vencimiento: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    const vacunasFormatted = vacunas.map(vacuna => ({
      ...vacuna,
      id_vacuna: Number(vacuna.id_vacuna),
      precio_lista: parseFloat(vacuna.precio_lista),
      stock_disponible: vacuna.stock_vacunas.reduce((total, stock) => 
        total + stock.stock_actual, 0
      ),
      stock_reservado_total: vacuna.stock_vacunas.reduce((total, stock) => 
        total + stock.stock_reservado, 0
      )
    }));

    res.json(vacunasFormatted);

  } catch (error) {
    console.error('Error al obtener vacunas disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};