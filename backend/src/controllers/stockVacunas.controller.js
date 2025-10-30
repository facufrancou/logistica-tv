const prisma = require('../lib/prisma');

// ===== CONTROLADOR DE STOCK DE VACUNAS =====

/**
 * Obtener stock de vacunas con filtros
 */
exports.getStockVacunas = async (req, res) => {
  try {
    const { 
      id_vacuna,
      estado_stock,
      vencimiento_proximo,
      dias_vencimiento = 30,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (id_vacuna) where.id_vacuna = parseInt(id_vacuna);
    if (estado_stock) where.estado_stock = estado_stock;
    
    // Filtro por vencimiento próximo
    if (vencimiento_proximo === 'true') {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + parseInt(dias_vencimiento));
      where.fecha_vencimiento = { lte: fechaLimite };
    }

    // Búsqueda por lote
    if (search) {
      where.OR = [
        { lote: { contains: search } },
        { vacuna: { codigo: { contains: search } } },
        { vacuna: { nombre: { contains: search } } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [stockVacunas, totalCount] = await Promise.all([
      prisma.stockVacuna.findMany({
        where,
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
                  unidad_medida: true,
                  dosis_por_frasco: true
                }
              }
            }
          }
        },
        orderBy: [
          { fecha_vencimiento: 'asc' },
          { vacuna: { nombre: 'asc' } }
        ],
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.stockVacuna.count({ where })
    ]);

    // Formatear respuesta y calcular días hasta vencimiento
    const stockFormatted = stockVacunas.map(stock => {
      const today = new Date();
      const fechaVencimiento = new Date(stock.fecha_vencimiento);
      const diasHastaVencimiento = Math.ceil((fechaVencimiento - today) / (1000 * 60 * 60 * 24));
      
      // Calcular conversión a frascos
      const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1;
      const frascosActuales = Math.floor(stock.stock_actual / dosisPorFrasco);
      const frascoMinimo = Math.ceil(stock.stock_minimo / dosisPorFrasco);
      const dosisSobrantes = stock.stock_actual % dosisPorFrasco;
      
      // Calcular frascos reservados
      const frascosReservados = Math.floor((stock.stock_reservado || 0) / dosisPorFrasco);
      const dosisReservadasSobrantes = (stock.stock_reservado || 0) % dosisPorFrasco;
      
      return {
        ...stock,
        id_stock_vacuna: Number(stock.id_stock_vacuna),
        id_vacuna: Number(stock.id_vacuna),
        precio_compra: stock.precio_compra ? parseFloat(stock.precio_compra) : null,
        dias_hasta_vencimiento: diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        proximo_vencimiento: diasHastaVencimiento <= parseInt(dias_vencimiento) && diasHastaVencimiento >= 0,
        // Información de conversión frascos/dosis
        dosis_por_frasco: dosisPorFrasco,
        frascos_actuales: frascosActuales,
        frascos_minimo: frascoMinimo,
        dosis_sobrantes: dosisSobrantes,
        // Información de stock reservado
        frascos_reservados: frascosReservados,
        dosis_reservadas_sobrantes: dosisReservadasSobrantes
      };
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: stockFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener stock de vacunas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener stock por vacuna específica
 */
exports.getStockByVacuna = async (req, res) => {
  try {
    const { id_vacuna } = req.params;

    const stockVacunas = await prisma.stockVacuna.findMany({
      where: { id_vacuna: parseInt(id_vacuna) },
      include: {
        vacuna: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { fecha_vencimiento: 'asc' },
        { lote: 'asc' }
      ]
    });

    // Calcular totales
    const totales = {
      stock_total: stockVacunas.reduce((total, stock) => 
        total + (stock.estado_stock === 'disponible' ? stock.stock_actual : 0), 0
      ),
      stock_reservado_total: stockVacunas.reduce((total, stock) => 
        total + stock.stock_reservado, 0
      ),
      lotes_disponibles: stockVacunas.filter(stock => 
        stock.estado_stock === 'disponible' && stock.stock_actual > 0
      ).length,
      lotes_vencidos: stockVacunas.filter(stock => {
        const today = new Date();
        return new Date(stock.fecha_vencimiento) < today;
      }).length
    };

    const stockFormatted = stockVacunas.map(stock => {
      const today = new Date();
      const fechaVencimiento = new Date(stock.fecha_vencimiento);
      const diasHastaVencimiento = Math.ceil((fechaVencimiento - today) / (1000 * 60 * 60 * 24));
      
      return {
        ...stock,
        id_stock_vacuna: Number(stock.id_stock_vacuna),
        precio_compra: stock.precio_compra ? parseFloat(stock.precio_compra) : null,
        dias_hasta_vencimiento: diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0
      };
    });

    res.json({
      success: true,
      data: stockFormatted,
      totales
    });

  } catch (error) {
    console.error('Error al obtener stock por vacuna:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear nuevo registro de stock
 */
exports.createStockVacuna = async (req, res) => {
  try {
    const {
      id_vacuna,
      lote,
      fecha_vencimiento,
      stock_actual, // Ahora puede venir en frascos o dosis
      cantidad_frascos, // Nuevo: cantidad en frascos
      stock_minimo = 0,
      precio_compra,
      ubicacion_fisica,
      temperatura_req,
      observaciones
    } = req.body;

    // Validaciones
    if (!id_vacuna || !lote || !fecha_vencimiento) {
      return res.status(400).json({ 
        error: 'Campos obligatorios: id_vacuna, lote, fecha_vencimiento' 
      });
    }

    if (stock_actual === undefined && cantidad_frascos === undefined) {
      return res.status(400).json({ 
        error: 'Debe proporcionar stock_actual (dosis) o cantidad_frascos' 
      });
    }

    // Obtener información de la vacuna para conversión
    const vacuna = await prisma.vacuna.findUnique({
      where: { id_vacuna: parseInt(id_vacuna) },
      include: {
        presentacion: {
          select: {
            dosis_por_frasco: true
          }
        }
      }
    });

    if (!vacuna) {
      return res.status(404).json({ error: 'Vacuna no encontrada' });
    }

    // Calcular stock en dosis (base de datos trabaja con dosis)
    const dosisPorFrasco = vacuna.presentacion?.dosis_por_frasco || 1;
    let stockActualDosis;
    let stockMinimoDosis = 0;
    
    if (cantidad_frascos !== undefined) {
      // Si viene en frascos, convertir a dosis
      stockActualDosis = parseInt(cantidad_frascos) * dosisPorFrasco;
      stockMinimoDosis = parseInt(stock_minimo || 0) * dosisPorFrasco;
    } else {
      // Si viene en dosis, usar directamente (ya viene calculado desde el frontend)
      stockActualDosis = parseInt(stock_actual);
      stockMinimoDosis = parseInt(stock_minimo || 0);
    }

    // Verificar que no exista otro lote igual para la misma vacuna
    const stockExistente = await prisma.stockVacuna.findUnique({
      where: {
        id_vacuna_lote: {
          id_vacuna: parseInt(id_vacuna),
          lote: lote
        }
      }
    });

    if (stockExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un registro de stock para esta vacuna con el mismo lote' 
      });
    }

    const nuevoStock = await prisma.stockVacuna.create({
      data: {
        id_vacuna: parseInt(id_vacuna),
        lote,
        fecha_vencimiento: new Date(fecha_vencimiento),
        stock_actual: stockActualDosis,
        stock_minimo: stockMinimoDosis,
        precio_compra: precio_compra ? parseFloat(precio_compra) : null,
        ubicacion_fisica: ubicacion_fisica || null,
        temperatura_req: temperatura_req || null,
        observaciones: observaciones || null,
        created_by: req.user?.id || null
      },
      include: {
        vacuna: {
          include: {
            presentacion: {
              select: {
                nombre: true,
                dosis_por_frasco: true
              }
            }
          }
        }
      }
    });

    // Registrar movimiento de stock inicial
    if (stockActualDosis > 0) {
      const frascos = Math.floor(stockActualDosis / dosisPorFrasco);
      await prisma.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: nuevoStock.id_stock_vacuna,
          tipo_movimiento: 'ingreso',
          cantidad: stockActualDosis,
          stock_anterior: 0,
          stock_posterior: stockActualDosis,
          motivo: 'Stock inicial',
          observaciones: `Lote: ${lote} - ${frascos} frascos (${stockActualDosis} dosis)`,
          precio_unitario: precio_compra ? parseFloat(precio_compra) : null,
          id_usuario: req.user?.id || null
        }
      });
    }

    const stockFormatted = {
      ...nuevoStock,
      id_stock_vacuna: Number(nuevoStock.id_stock_vacuna),
      id_vacuna: Number(nuevoStock.id_vacuna),
      precio_compra: nuevoStock.precio_compra ? parseFloat(nuevoStock.precio_compra) : null,
      dosis_por_frasco: dosisPorFrasco,
      frascos_actuales: Math.floor(stockActualDosis / dosisPorFrasco),
      dosis_sobrantes: stockActualDosis % dosisPorFrasco
    };

    res.status(201).json(stockFormatted);

  } catch (error) {
    console.error('Error al crear stock de vacuna:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Ya existe un registro de stock para esta vacuna con el mismo lote' 
      });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualizar stock de vacuna
 */
exports.updateStockVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stock_actual,
      stock_minimo,
      precio_compra,
      ubicacion_fisica,
      temperatura_req,
      estado_stock,
      observaciones,
      motivo_cambio
    } = req.body;

    // Obtener stock actual para registrar movimiento si cambia cantidad
    const stockActual = await prisma.stockVacuna.findUnique({
      where: { id_stock_vacuna: parseInt(id) }
    });

    if (!stockActual) {
      return res.status(404).json({ error: 'Registro de stock no encontrado' });
    }

    const stockActualizado = await prisma.stockVacuna.update({
      where: { id_stock_vacuna: parseInt(id) },
      data: {
        stock_actual: stock_actual !== undefined ? parseInt(stock_actual) : undefined,
        stock_minimo: stock_minimo !== undefined ? parseInt(stock_minimo) : undefined,
        precio_compra: precio_compra !== undefined ? (precio_compra ? parseFloat(precio_compra) : null) : undefined,
        ubicacion_fisica: ubicacion_fisica !== undefined ? ubicacion_fisica : undefined,
        temperatura_req: temperatura_req !== undefined ? temperatura_req : undefined,
        estado_stock: estado_stock || undefined,
        observaciones: observaciones !== undefined ? observaciones : undefined,
        updated_by: req.user?.id || null
      },
      include: {
        vacuna: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      }
    });

    // Registrar movimiento si cambió la cantidad de stock
    if (stock_actual !== undefined && parseInt(stock_actual) !== stockActual.stock_actual) {
      const diferencia = parseInt(stock_actual) - stockActual.stock_actual;
      const tipoMovimiento = diferencia > 0 ? 'ajuste_positivo' : 'ajuste_negativo';
      
      await prisma.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: parseInt(id),
          tipo_movimiento: tipoMovimiento,
          cantidad: Math.abs(diferencia),
          stock_anterior: stockActual.stock_actual,
          stock_posterior: parseInt(stock_actual),
          motivo: motivo_cambio || 'Ajuste manual de stock',
          observaciones: observaciones || null,
          id_usuario: req.user?.id || null
        }
      });
    }

    const stockFormatted = {
      ...stockActualizado,
      id_stock_vacuna: Number(stockActualizado.id_stock_vacuna),
      id_vacuna: Number(stockActualizado.id_vacuna),
      precio_compra: stockActualizado.precio_compra ? parseFloat(stockActualizado.precio_compra) : null
    };

    res.json(stockFormatted);

  } catch (error) {
    console.error('Error al actualizar stock de vacuna:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro de stock no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener movimientos de stock para una vacuna
 */
exports.getMovimientosStockVacuna = async (req, res) => {
  try {
    const { id_stock_vacuna } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [movimientos, totalCount] = await Promise.all([
      prisma.movimientoStockVacuna.findMany({
        where: { id_stock_vacuna: parseInt(id_stock_vacuna) },
        include: {
          usuario: {
            select: {
              nombre: true
            }
          },
          stock_vacuna: {
            include: {
              vacuna: {
                select: {
                  codigo: true,
                  nombre: true
                }
              }
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.movimientoStockVacuna.count({
        where: { id_stock_vacuna: parseInt(id_stock_vacuna) }
      })
    ]);

    const movimientosFormatted = movimientos.map(movimiento => ({
      ...movimiento,
      id_movimiento: Number(movimiento.id_movimiento),
      id_stock_vacuna: Number(movimiento.id_stock_vacuna),
      precio_unitario: movimiento.precio_unitario ? parseFloat(movimiento.precio_unitario) : null
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: movimientosFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener movimientos de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Reportes de stock crítico y alertas
 */
exports.getAlertas = async (req, res) => {
  try {
    const { dias_vencimiento = 30 } = req.query;

    // Stock bajo (por debajo del mínimo)
    const stockBajo = await prisma.stockVacuna.findMany({
      where: {
        OR: [
          {
            stock_actual: {
              lte: prisma.stockVacuna.fields.stock_minimo
            }
          }
        ],
        estado_stock: 'disponible'
      },
      include: {
        vacuna: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      }
    });

    // Vacunas próximas a vencer
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + parseInt(dias_vencimiento));

    const proximosVencimientos = await prisma.stockVacuna.findMany({
      where: {
        fecha_vencimiento: {
          lte: fechaLimite,
          gte: new Date()
        },
        estado_stock: 'disponible',
        stock_actual: { gt: 0 }
      },
      include: {
        vacuna: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fecha_vencimiento: 'asc'
      }
    });

    // Vacunas ya vencidas
    const vencidas = await prisma.stockVacuna.findMany({
      where: {
        fecha_vencimiento: {
          lt: new Date()
        },
        estado_stock: { not: 'vencido' },
        stock_actual: { gt: 0 }
      },
      include: {
        vacuna: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      }
    });

    res.json({
      success: true,
      alertas: {
        stock_bajo: stockBajo.map(stock => ({
          ...stock,
          id_stock_vacuna: Number(stock.id_stock_vacuna),
          deficit: Math.max(0, stock.stock_minimo - stock.stock_actual)
        })),
        proximos_vencimientos: proximosVencimientos.map(stock => {
          const diasHastaVencimiento = Math.ceil(
            (new Date(stock.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
          );
          return {
            ...stock,
            id_stock_vacuna: Number(stock.id_stock_vacuna),
            dias_hasta_vencimiento: diasHastaVencimiento
          };
        }),
        vencidas: vencidas.map(stock => ({
          ...stock,
          id_stock_vacuna: Number(stock.id_stock_vacuna),
          dias_vencido: Math.ceil(
            (new Date() - new Date(stock.fecha_vencimiento)) / (1000 * 60 * 60 * 24)
          )
        }))
      },
      totales: {
        stock_bajo: stockBajo.length,
        proximos_vencimientos: proximosVencimientos.length,
        vencidas: vencidas.length
      }
    });

  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Registrar ingreso de stock
 */
exports.registrarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, cantidad_frascos, motivo, observaciones, precio_unitario } = req.body;
    const id_usuario = req.usuario?.id_usuario || 1;

    if ((!cantidad || cantidad <= 0) && (!cantidad_frascos || cantidad_frascos <= 0)) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }

    // Obtener el stock actual con información de la vacuna
    const stockActual = await prisma.stockVacuna.findUnique({
      where: { id_stock_vacuna: parseInt(id) },
      include: {
        vacuna: {
          include: {
            presentacion: {
              select: {
                dosis_por_frasco: true
              }
            }
          }
        }
      }
    });

    if (!stockActual) {
      return res.status(404).json({ error: 'Stock no encontrado' });
    }

    // Obtener dosis por frasco para conversión
    const dosisPorFrasco = stockActual.vacuna?.presentacion?.dosis_por_frasco || 1;
    
    // Calcular cantidad en dosis
    let cantidadDosis;
    if (cantidad_frascos !== undefined) {
      cantidadDosis = parseInt(cantidad_frascos) * dosisPorFrasco;
    } else {
      cantidadDosis = parseInt(cantidad);
    }

    // Calcular nuevo stock
    const stockAnterior = stockActual.stock_actual;
    const stockPosterior = stockAnterior + cantidadDosis;

    // Crear movimiento y actualizar stock en una transacción
    const resultado = await prisma.$transaction(async (prisma) => {
      // Crear movimiento
      const frascos = Math.floor(cantidadDosis / dosisPorFrasco);
      const observacionesCompletas = cantidad_frascos !== undefined 
        ? `${observaciones || ''} - ${cantidad_frascos} frascos (${cantidadDosis} dosis)`.trim()
        : observaciones || null;

      const movimiento = await prisma.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: parseInt(id),
          tipo_movimiento: 'ingreso',
          cantidad: cantidadDosis,
          stock_anterior: stockAnterior,
          stock_posterior: stockPosterior,
          motivo: motivo || 'Ingreso manual',
          observaciones: observacionesCompletas,
          precio_unitario: precio_unitario ? parseFloat(precio_unitario) : null,
          id_usuario: id_usuario
        }
      });

      // Actualizar stock
      const stockActualizado = await prisma.stockVacuna.update({
        where: { id_stock_vacuna: parseInt(id) },
        data: { 
          stock_actual: stockPosterior,
          updated_at: new Date()
        },
        include: {
          vacuna: {
            include: {
              proveedor: true,
              patologia: true,
              presentacion: true
            }
          }
        }
      });

      return { movimiento, stockActualizado };
    });

    res.json({
      success: true,
      message: 'Ingreso registrado exitosamente',
      data: {
        movimiento: resultado.movimiento,
        stock: resultado.stockActualizado
      }
    });

  } catch (error) {
    console.error('Error al registrar ingreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Registrar egreso de stock
 */
exports.registrarEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, cantidad_frascos, motivo, observaciones, precio_unitario } = req.body;
    const id_usuario = req.usuario?.id_usuario || 1;

    if ((!cantidad || cantidad <= 0) && (!cantidad_frascos || cantidad_frascos <= 0)) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }

    // Obtener el stock actual con información de la vacuna
    const stockActual = await prisma.stockVacuna.findUnique({
      where: { id_stock_vacuna: parseInt(id) },
      include: {
        vacuna: {
          include: {
            presentacion: {
              select: {
                dosis_por_frasco: true
              }
            }
          }
        }
      }
    });

    if (!stockActual) {
      return res.status(404).json({ error: 'Stock no encontrado' });
    }

    // Obtener dosis por frasco para conversión
    const dosisPorFrasco = stockActual.vacuna?.presentacion?.dosis_por_frasco || 1;
    
    // Calcular cantidad en dosis
    let cantidadDosis;
    if (cantidad_frascos !== undefined) {
      cantidadDosis = parseInt(cantidad_frascos) * dosisPorFrasco;
    } else {
      cantidadDosis = parseInt(cantidad);
    }

    // Validar que hay suficiente stock TOTAL (incluyendo reservados)
    if (cantidadDosis > stockActual.stock_actual) {
      const frascosActuales = Math.floor(stockActual.stock_actual / dosisPorFrasco);
      return res.status(400).json({ 
        error: `Stock insuficiente. Stock actual: ${frascosActuales} frascos (${stockActual.stock_actual} dosis), solicitado: ${Math.ceil(cantidadDosis / dosisPorFrasco)} frascos (${cantidadDosis} dosis)` 
      });
    }

    // Calcular nuevo stock
    const stockAnterior = stockActual.stock_actual;
    const stockPosterior = stockAnterior - cantidadDosis;
    
    // Calcular cuánto afecta a las reservas (si es que afecta)
    const stockDisponible = stockActual.stock_actual - stockActual.stock_reservado;
    let stockReservadoNuevo = stockActual.stock_reservado;
    
    if (cantidadDosis > stockDisponible) {
      // El egreso afecta stock reservado
      const dosisDeReserva = cantidadDosis - stockDisponible;
      stockReservadoNuevo = Math.max(0, stockActual.stock_reservado - dosisDeReserva);
      console.log(`⚠️ Egreso afecta stock reservado: ${dosisDeReserva} dosis de ${stockActual.stock_reservado} reservadas`);
    }

    // Crear movimiento y actualizar stock en una transacción
    const resultado = await prisma.$transaction(async (prisma) => {
      // Crear movimiento
      const frascos = cantidad_frascos !== undefined ? cantidad_frascos : Math.floor(cantidadDosis / dosisPorFrasco);
      const observacionesCompletas = cantidad_frascos !== undefined 
        ? `${observaciones || ''} - ${cantidad_frascos} frascos (${cantidadDosis} dosis)`.trim()
        : observaciones || null;

      const movimiento = await prisma.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: parseInt(id),
          tipo_movimiento: 'egreso',
          cantidad: cantidadDosis,
          stock_anterior: stockAnterior,
          stock_posterior: stockPosterior,
          motivo: motivo || 'Egreso manual',
          observaciones: observacionesCompletas,
          precio_unitario: precio_unitario ? parseFloat(precio_unitario) : null,
          id_usuario: id_usuario
        }
      });

      // Actualizar stock (y reservas si fueron afectadas)
      const stockActualizado = await prisma.stockVacuna.update({
        where: { id_stock_vacuna: parseInt(id) },
        data: { 
          stock_actual: stockPosterior,
          stock_reservado: stockReservadoNuevo,
          updated_at: new Date()
        },
        include: {
          vacuna: {
            include: {
              proveedor: true,
              patologia: true,
              presentacion: true
            }
          }
        }
      });

      return { movimiento, stockActualizado };
    });

    res.json({
      success: true,
      message: 'Egreso registrado exitosamente',
      data: {
        movimiento: resultado.movimiento,
        stock: resultado.stockActualizado
      }
    });

  } catch (error) {
    console.error('Error al registrar egreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear movimiento genérico (para ajustes, transferencias, etc.)
 */
exports.crearMovimiento = async (req, res) => {
  try {
    const { 
      id_stock_vacuna, 
      tipo_movimiento, 
      cantidad, 
      motivo, 
      observaciones, 
      precio_unitario 
    } = req.body;
    const id_usuario = req.usuario?.id_usuario || 1;

    // Validaciones
    if (!id_stock_vacuna || !tipo_movimiento || !cantidad || !motivo) {
      return res.status(400).json({ 
        error: 'Campos requeridos: id_stock_vacuna, tipo_movimiento, cantidad, motivo' 
      });
    }

    if (!['ingreso', 'egreso', 'ajuste_positivo', 'ajuste_negativo', 'vencimiento', 'transferencia'].includes(tipo_movimiento)) {
      return res.status(400).json({ 
        error: 'Tipo de movimiento inválido' 
      });
    }

    // Obtener el stock actual
    const stockActual = await prisma.stockVacuna.findUnique({
      where: { id_stock_vacuna: parseInt(id_stock_vacuna) }
    });

    if (!stockActual) {
      return res.status(404).json({ error: 'Stock no encontrado' });
    }

    // Calcular nuevo stock según el tipo de movimiento
    const stockAnterior = stockActual.stock_actual;
    let stockPosterior;

    switch (tipo_movimiento) {
      case 'ingreso':
      case 'ajuste_positivo':
        stockPosterior = stockAnterior + parseInt(cantidad);
        break;
      case 'egreso':
      case 'ajuste_negativo':
      case 'vencimiento':
        // Validar stock disponible para egresos
        const stockDisponible = stockActual.stock_actual - stockActual.stock_reservado;
        if (parseInt(cantidad) > stockDisponible && tipo_movimiento === 'egreso') {
          return res.status(400).json({ 
            error: `Stock insuficiente. Disponible: ${stockDisponible}, solicitado: ${cantidad}` 
          });
        }
        stockPosterior = stockAnterior - parseInt(cantidad);
        break;
      case 'transferencia':
        // Para transferencias, solo registramos el movimiento sin cambiar el stock
        stockPosterior = stockAnterior;
        break;
      default:
        return res.status(400).json({ error: 'Tipo de movimiento no soportado' });
    }

    // Crear movimiento y actualizar stock en una transacción
    const resultado = await prisma.$transaction(async (prisma) => {
      // Crear movimiento
      const movimiento = await prisma.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: parseInt(id_stock_vacuna),
          tipo_movimiento,
          cantidad: parseInt(cantidad),
          stock_anterior: stockAnterior,
          stock_posterior: stockPosterior,
          motivo,
          observaciones: observaciones || null,
          precio_unitario: precio_unitario ? parseFloat(precio_unitario) : null,
          id_usuario: id_usuario
        }
      });

      // Actualizar stock (excepto para transferencias)
      let stockActualizado = stockActual;
      if (tipo_movimiento !== 'transferencia') {
        stockActualizado = await prisma.stockVacuna.update({
          where: { id_stock_vacuna: parseInt(id_stock_vacuna) },
          data: { 
            stock_actual: stockPosterior,
            updated_at: new Date(),
            // Marcar como vencido si es un movimiento por vencimiento
            estado_stock: tipo_movimiento === 'vencimiento' ? 'vencido' : stockActual.estado_stock
          },
          include: {
            vacuna: {
              include: {
                proveedor: true,
                patologia: true,
                presentacion: true
              }
            }
          }
        });
      }

      return { movimiento, stockActualizado };
    });

    res.json({
      success: true,
      message: 'Movimiento registrado exitosamente',
      data: {
        movimiento: resultado.movimiento,
        stock: resultado.stockActualizado
      }
    });

  } catch (error) {
    console.error('Error al crear movimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener cotizaciones que tienen reservas en un lote específico
 */
exports.getReservasLote = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del lote
    const lote = await prisma.stockVacuna.findUnique({
      where: { id_stock_vacuna: parseInt(id) },
      include: {
        vacuna: {
          select: {
            nombre: true,
            codigo: true,
            presentacion: {
              select: {
                dosis_por_frasco: true
              }
            }
          }
        }
      }
    });

    if (!lote) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    // Si no hay stock reservado, retornar vacío
    if (!lote.stock_reservado || lote.stock_reservado <= 0) {
      const dosisPorFrasco = lote.vacuna?.presentacion?.dosis_por_frasco || 1000;
      return res.json({
        success: true,
        lote: {
          id_stock_vacuna: lote.id_stock_vacuna,
          lote: lote.lote,
          vacuna: lote.vacuna.nombre,
          stock_actual: lote.stock_actual,
          stock_reservado: 0,
          frascos_actuales: Math.floor(lote.stock_actual / dosisPorFrasco),
          frascos_reservados: 0,
          dosis_por_frasco: dosisPorFrasco
        },
        totales: {
          total_dosis_reservadas: 0,
          total_frascos_reservados: 0,
          total_cotizaciones: 0
        },
        cotizaciones: []
      });
    }

    // Buscar todos los calendarios que tienen este lote asignado Y tienen entregas pendientes
    console.log(`Buscando calendarios para lote ID: ${id}, stock_reservado: ${lote.stock_reservado}`);
    
    const calendarios = await prisma.calendarioVacunacion.findMany({
      where: {
        id_stock_vacuna: parseInt(id),
        estado_entrega: {
          in: ['pendiente', 'parcial'] // Solo los que aún tienen reservas activas
        }
      },
      include: {
        cotizacion: {
          select: {
            numero_cotizacion: true,
            estado: true,
            created_at: true,
            cliente: {
              select: {
                nombre: true
              }
            },
            plan: {
              select: {
                nombre: true
              }
            }
          }
        },
        producto: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        fecha_programada: 'asc'
      }
    });

    console.log(`Calendarios encontrados: ${calendarios.length}`);

    // Agrupar por cotización
    const cotizacionesMap = new Map();

    calendarios.forEach(calendario => {
      const idCotizacion = calendario.id_cotizacion;
      
      if (!cotizacionesMap.has(idCotizacion)) {
        const dosisPorFrasco = lote.vacuna?.presentacion?.dosis_por_frasco || 1000;
        const dosisReservadas = calendario.cantidad_dosis - (calendario.dosis_entregadas || 0);
        const frascosReservados = Math.ceil(dosisReservadas / dosisPorFrasco);

        cotizacionesMap.set(idCotizacion, {
          id_cotizacion: idCotizacion,
          numero_cotizacion: calendario.cotizacion.numero_cotizacion,
          cliente: calendario.cotizacion.cliente?.nombre || 'Sin cliente',
          plan: calendario.cotizacion.plan?.nombre || 'Sin plan',
          estado: calendario.cotizacion.estado,
          fecha_creacion: calendario.cotizacion.created_at,
          total_dosis_reservadas: dosisReservadas,
          total_frascos_reservados: frascosReservados,
          entregas: []
        });
      }

      // Agregar detalle de esta entrega
      const dosisReservadas = calendario.cantidad_dosis - (calendario.dosis_entregadas || 0);
      const dosisPorFrasco = lote.vacuna?.presentacion?.dosis_por_frasco || 1000;
      const frascosReservados = Math.ceil(dosisReservadas / dosisPorFrasco);

      cotizacionesMap.get(idCotizacion).entregas.push({
        id_calendario: calendario.id_calendario,
        fecha_programada: calendario.fecha_programada,
        producto: lote.vacuna.nombre, // Mostrar nombre de la vacuna del lote, no el producto genérico
        cantidad_total: calendario.cantidad_dosis,
        dosis_entregadas: calendario.dosis_entregadas || 0,
        dosis_pendientes: dosisReservadas,
        frascos_pendientes: frascosReservados,
        estado_entrega: calendario.estado_entrega
      });

      // Actualizar total
      const cotizacion = cotizacionesMap.get(idCotizacion);
      cotizacion.total_dosis_reservadas = cotizacion.entregas.reduce(
        (sum, e) => sum + e.dosis_pendientes, 0
      );
      cotizacion.total_frascos_reservados = Math.ceil(
        cotizacion.total_dosis_reservadas / dosisPorFrasco
      );
    });

    const cotizaciones = Array.from(cotizacionesMap.values());

    // Calcular totales
    const dosisPorFrasco = lote.vacuna?.presentacion?.dosis_por_frasco || 1000;
    const totalDosisReservadas = cotizaciones.reduce(
      (sum, cot) => sum + cot.total_dosis_reservadas, 0
    );
    const totalFrascosReservados = Math.ceil(totalDosisReservadas / dosisPorFrasco);

    res.json({
      success: true,
      lote: {
        id_stock_vacuna: lote.id_stock_vacuna,
        lote: lote.lote,
        vacuna: lote.vacuna.nombre,
        stock_actual: lote.stock_actual,
        stock_reservado: lote.stock_reservado,
        frascos_actuales: Math.floor(lote.stock_actual / dosisPorFrasco),
        frascos_reservados: Math.floor(lote.stock_reservado / dosisPorFrasco),
        dosis_por_frasco: dosisPorFrasco
      },
      totales: {
        total_dosis_reservadas: totalDosisReservadas,
        total_frascos_reservados: totalFrascosReservados,
        total_cotizaciones: cotizaciones.length
      },
      cotizaciones
    });

  } catch (error) {
    console.error('Error al obtener reservas del lote:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Obtener todos los movimientos de stock (para la vista de Movimientos)
 */
exports.getTodosMovimientos = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100,
      tipo_movimiento,
      id_vacuna,
      lote,
      fecha_desde,
      fecha_hasta
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (tipo_movimiento) {
      where.tipo_movimiento = tipo_movimiento;
    }
    
    if (lote) {
      where.stock_vacuna = {
        lote: { contains: lote }
      };
    }
    
    if (id_vacuna) {
      where.stock_vacuna = {
        ...where.stock_vacuna,
        id_vacuna: parseInt(id_vacuna)
      };
    }
    
    if (fecha_desde || fecha_hasta) {
      where.created_at = {};
      if (fecha_desde) where.created_at.gte = new Date(fecha_desde);
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta);
        hasta.setHours(23, 59, 59, 999);
        where.created_at.lte = hasta;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [movimientos, totalCount] = await Promise.all([
      prisma.movimientoStockVacuna.findMany({
        where,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true
            }
          },
          stock_vacuna: {
            include: {
              vacuna: {
                select: {
                  id_vacuna: true,
                  codigo: true,
                  nombre: true,
                  detalle: true
                }
              }
            }
          },
          cotizacion: {
            select: {
              id_cotizacion: true,
              numero_cotizacion: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.movimientoStockVacuna.count({ where })
    ]);

    const movimientosFormatted = movimientos.map(movimiento => ({
      ...movimiento,
      id_movimiento: Number(movimiento.id_movimiento),
      id_stock_vacuna: Number(movimiento.id_stock_vacuna),
      precio_unitario: movimiento.precio_unitario ? parseFloat(movimiento.precio_unitario) : null
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: movimientosFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener todos los movimientos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
};