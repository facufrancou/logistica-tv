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
                  unidad_medida: true
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
      
      return {
        ...stock,
        id_stock_vacuna: Number(stock.id_stock_vacuna),
        id_vacuna: Number(stock.id_vacuna),
        precio_compra: stock.precio_compra ? parseFloat(stock.precio_compra) : null,
        dias_hasta_vencimiento: diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        proximo_vencimiento: diasHastaVencimiento <= parseInt(dias_vencimiento) && diasHastaVencimiento >= 0
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
      stock_actual,
      stock_minimo = 0,
      precio_compra,
      ubicacion_fisica,
      temperatura_req,
      observaciones
    } = req.body;

    // Validaciones
    if (!id_vacuna || !lote || !fecha_vencimiento || stock_actual === undefined) {
      return res.status(400).json({ 
        error: 'Campos obligatorios: id_vacuna, lote, fecha_vencimiento, stock_actual' 
      });
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
        stock_actual: parseInt(stock_actual),
        stock_minimo: parseInt(stock_minimo),
        precio_compra: precio_compra ? parseFloat(precio_compra) : null,
        ubicacion_fisica: ubicacion_fisica || null,
        temperatura_req: temperatura_req || null,
        observaciones: observaciones || null,
        created_by: req.user?.id || null
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

    // Registrar movimiento de stock inicial
    if (parseInt(stock_actual) > 0) {
      await prisma.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: nuevoStock.id_stock_vacuna,
          tipo_movimiento: 'ingreso',
          cantidad: parseInt(stock_actual),
          stock_anterior: 0,
          stock_posterior: parseInt(stock_actual),
          motivo: 'Stock inicial',
          observaciones: `Lote: ${lote}`,
          precio_unitario: precio_compra ? parseFloat(precio_compra) : null,
          id_usuario: req.user?.id || null
        }
      });
    }

    const stockFormatted = {
      ...nuevoStock,
      id_stock_vacuna: Number(nuevoStock.id_stock_vacuna),
      id_vacuna: Number(nuevoStock.id_vacuna),
      precio_compra: nuevoStock.precio_compra ? parseFloat(nuevoStock.precio_compra) : null
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