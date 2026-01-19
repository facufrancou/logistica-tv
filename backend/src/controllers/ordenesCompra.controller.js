const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

/**
 * Genera número de orden único: OC-YYMMDD-XXX
 */
function generarNumeroOrden() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `OC-${year}${month}${day}-${random}`;
}

/**
 * Calcula el estado de la orden basado en sus items
 */
function calcularEstadoOrden(detalles) {
  if (!detalles || detalles.length === 0) return 'borrador';
  
  const todosCompletos = detalles.every(d => d.estado_item === 'completo');
  const algunoParcial = detalles.some(d => d.estado_item === 'parcial' || d.estado_item === 'completo');
  const todosCancelados = detalles.every(d => d.estado_item === 'cancelado');
  
  if (todosCancelados) return 'cancelada';
  if (todosCompletos) return 'ingresada';
  if (algunoParcial) return 'parcial';
  return 'confirmada';
}

/**
 * Calcula el estado de un item basado en cantidades
 */
function calcularEstadoItem(cantidadSolicitada, cantidadRecibida) {
  if (cantidadRecibida >= cantidadSolicitada) return 'completo';
  if (cantidadRecibida > 0) return 'parcial';
  return 'pendiente';
}

// ===== CONTROLADORES =====

/**
 * Obtener todas las órdenes de compra con filtros
 */
exports.getOrdenesCompra = async (req, res) => {
  try {
    const {
      estado,
      id_proveedor,
      fecha_desde,
      fecha_hasta,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const where = {};

    if (estado) {
      where.estado = estado;
    }

    if (search) {
      where.OR = [
        { numero_orden: { contains: search } },
        { observaciones: { contains: search } }
      ];
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha_creacion = {};
      if (fecha_desde) {
        where.fecha_creacion.gte = new Date(fecha_desde + 'T00:00:00.000Z');
      }
      if (fecha_hasta) {
        where.fecha_creacion.lte = new Date(fecha_hasta + 'T23:59:59.999Z');
      }
    }

    // Filtro por proveedor (a través de detalle)
    if (id_proveedor) {
      where.detalle_orden = {
        some: {
          id_proveedor: parseInt(id_proveedor)
        }
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [ordenes, totalCount] = await Promise.all([
      prisma.ordenCompra.findMany({
        where,
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
          detalle_orden: {
            include: {
              vacuna: {
                select: {
                  id_vacuna: true,
                  codigo: true,
                  nombre: true,
                  precio_lista: true
                }
              },
              proveedor: {
                select: {
                  id_proveedor: true,
                  nombre: true
                }
              },
              ingresos: {
                select: {
                  id_ingreso: true,
                  cantidad_ingresada: true,
                  lote: true,
                  fecha_vencimiento: true,
                  fecha_ingreso: true
                }
              }
            }
          }
        },
        orderBy: { fecha_creacion: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.ordenCompra.count({ where })
    ]);

    // Formatear respuesta
    const ordenesFormatted = ordenes.map(orden => {
      // Agrupar por proveedor
      const proveedoresMap = {};
      let totalItems = 0;
      let totalDosis = 0;
      let totalRecibido = 0;
      let totalEstimado = 0;

      orden.detalle_orden.forEach(detalle => {
        const provId = detalle.id_proveedor;
        if (!proveedoresMap[provId]) {
          proveedoresMap[provId] = {
            id_proveedor: provId,
            nombre: detalle.proveedor.nombre,
            items: 0,
            dosis_solicitadas: 0,
            dosis_recibidas: 0,
            subtotal: 0
          };
        }
        proveedoresMap[provId].items++;
        proveedoresMap[provId].dosis_solicitadas += detalle.cantidad_solicitada;
        proveedoresMap[provId].dosis_recibidas += detalle.cantidad_recibida;
        proveedoresMap[provId].subtotal += parseFloat(detalle.precio_estimado || 0) * detalle.cantidad_solicitada;

        totalItems++;
        totalDosis += detalle.cantidad_solicitada;
        totalRecibido += detalle.cantidad_recibida;
        totalEstimado += parseFloat(detalle.precio_estimado || 0) * detalle.cantidad_solicitada;
      });

      return {
        ...orden,
        id_orden_compra: Number(orden.id_orden_compra),
        total_estimado: orden.total_estimado ? parseFloat(orden.total_estimado) : totalEstimado,
        resumen: {
          total_items: totalItems,
          total_dosis_solicitadas: totalDosis,
          total_dosis_recibidas: totalRecibido,
          porcentaje_recibido: totalDosis > 0 ? Math.round((totalRecibido / totalDosis) * 100) : 0,
          proveedores: Object.values(proveedoresMap)
        },
        cotizacion_info: orden.cotizacion ? {
          numero: orden.cotizacion.numero_cotizacion,
          cliente: orden.cotizacion.cliente?.nombre
        } : null
      };
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: ordenesFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener órdenes de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener una orden de compra por ID
 */
exports.getOrdenCompraById = async (req, res) => {
  try {
    const { id } = req.params;

    const orden = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: {
        cotizacion: {
          select: {
            id_cotizacion: true,
            numero_cotizacion: true,
            cantidad_animales: true,
            cliente: {
              select: {
                id_cliente: true,
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
        detalle_orden: {
          include: {
            vacuna: {
              include: {
                proveedor: { select: { nombre: true } },
                presentacion: { select: { nombre: true, dosis_por_frasco: true } },
                patologia: { select: { nombre: true } }
              }
            },
            proveedor: true,
            ingresos: {
              include: {
                stock_vacuna: {
                  select: {
                    id_stock_vacuna: true,
                    lote: true,
                    stock_actual: true
                  }
                }
              },
              orderBy: { fecha_ingreso: 'desc' }
            }
          }
        }
      }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // Formatear detalle con información adicional
    const detalleFormatted = orden.detalle_orden.map(detalle => ({
      ...detalle,
      id_detalle_orden: Number(detalle.id_detalle_orden),
      precio_estimado: detalle.precio_estimado ? parseFloat(detalle.precio_estimado) : null,
      subtotal_estimado: detalle.precio_estimado 
        ? parseFloat(detalle.precio_estimado) * detalle.cantidad_solicitada 
        : null,
      pendiente_recibir: detalle.cantidad_solicitada - detalle.cantidad_recibida,
      porcentaje_recibido: detalle.cantidad_solicitada > 0 
        ? Math.round((detalle.cantidad_recibida / detalle.cantidad_solicitada) * 100) 
        : 0,
      dosis_por_frasco: detalle.vacuna?.presentacion?.dosis_por_frasco || 1
    }));

    // Agrupar por proveedor para resumen
    const resumenPorProveedor = {};
    detalleFormatted.forEach(d => {
      const provId = d.id_proveedor;
      if (!resumenPorProveedor[provId]) {
        resumenPorProveedor[provId] = {
          id_proveedor: provId,
          nombre: d.proveedor.nombre,
          items: [],
          total_dosis: 0,
          total_recibido: 0,
          subtotal: 0
        };
      }
      resumenPorProveedor[provId].items.push(d);
      resumenPorProveedor[provId].total_dosis += d.cantidad_solicitada;
      resumenPorProveedor[provId].total_recibido += d.cantidad_recibida;
      resumenPorProveedor[provId].subtotal += d.subtotal_estimado || 0;
    });

    res.json({
      success: true,
      data: {
        ...orden,
        id_orden_compra: Number(orden.id_orden_compra),
        total_estimado: orden.total_estimado ? parseFloat(orden.total_estimado) : null,
        detalle_orden: detalleFormatted,
        por_proveedor: Object.values(resumenPorProveedor)
      }
    });

  } catch (error) {
    console.error('Error al obtener orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear nueva orden de compra
 */
exports.createOrdenCompra = async (req, res) => {
  try {
    const {
      id_cotizacion,
      fecha_esperada,
      observaciones,
      items // Array de { id_vacuna, id_proveedor, cantidad_solicitada, precio_estimado }
    } = req.body;

    // Validaciones
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos un item en la orden' 
      });
    }

    // Validar que todas las vacunas existan
    const vacunaIds = [...new Set(items.map(i => i.id_vacuna))];
    const vacunas = await prisma.vacuna.findMany({
      where: { id_vacuna: { in: vacunaIds } }
    });

    if (vacunas.length !== vacunaIds.length) {
      return res.status(400).json({ error: 'Una o más vacunas no existen' });
    }

    // Calcular total estimado
    const totalEstimado = items.reduce((sum, item) => {
      return sum + (parseFloat(item.precio_estimado || 0) * item.cantidad_solicitada);
    }, 0);

    // Generar número único
    let numeroOrden = generarNumeroOrden();
    let intentos = 0;
    while (intentos < 10) {
      const existe = await prisma.ordenCompra.findUnique({
        where: { numero_orden: numeroOrden }
      });
      if (!existe) break;
      numeroOrden = generarNumeroOrden();
      intentos++;
    }

    // Crear orden con transacción
    const nuevaOrden = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.create({
        data: {
          numero_orden: numeroOrden,
          estado: 'borrador',
          id_cotizacion: id_cotizacion ? parseInt(id_cotizacion) : null,
          fecha_esperada: fecha_esperada ? new Date(fecha_esperada) : null,
          observaciones: observaciones || null,
          total_estimado: totalEstimado,
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear items
      await tx.detalleOrdenCompra.createMany({
        data: items.map(item => ({
          id_orden_compra: orden.id_orden_compra,
          id_vacuna: parseInt(item.id_vacuna),
          id_proveedor: parseInt(item.id_proveedor),
          cantidad_solicitada: parseInt(item.cantidad_solicitada),
          precio_estimado: item.precio_estimado ? parseFloat(item.precio_estimado) : null,
          observaciones: item.observaciones || null
        }))
      });

      return orden;
    });

    // Obtener orden completa
    const ordenCompleta = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: nuevaOrden.id_orden_compra },
      include: {
        detalle_orden: {
          include: {
            vacuna: { select: { codigo: true, nombre: true } },
            proveedor: { select: { nombre: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Orden de compra creada exitosamente',
      data: {
        ...ordenCompleta,
        id_orden_compra: Number(ordenCompleta.id_orden_compra)
      }
    });

  } catch (error) {
    console.error('Error al crear orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualizar orden de compra (solo en estado borrador o pendiente)
 */
exports.updateOrdenCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha_esperada,
      observaciones,
      items // Array actualizado de items
    } = req.body;

    const ordenExistente = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) }
    });

    if (!ordenExistente) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (!['borrador', 'pendiente'].includes(ordenExistente.estado)) {
      return res.status(400).json({ 
        error: 'Solo se pueden editar órdenes en estado borrador o pendiente' 
      });
    }

    // Calcular nuevo total
    const totalEstimado = items ? items.reduce((sum, item) => {
      return sum + (parseFloat(item.precio_estimado || 0) * item.cantidad_solicitada);
    }, 0) : ordenExistente.total_estimado;

    // Actualizar con transacción
    const ordenActualizada = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const orden = await tx.ordenCompra.update({
        where: { id_orden_compra: parseInt(id) },
        data: {
          fecha_esperada: fecha_esperada ? new Date(fecha_esperada) : ordenExistente.fecha_esperada,
          observaciones: observaciones !== undefined ? observaciones : ordenExistente.observaciones,
          total_estimado: totalEstimado,
          updated_by: req.user?.id_usuario || null
        }
      });

      // Si se enviaron items, actualizar
      if (items && items.length > 0) {
        // Eliminar items existentes
        await tx.detalleOrdenCompra.deleteMany({
          where: { id_orden_compra: parseInt(id) }
        });

        // Crear nuevos items
        await tx.detalleOrdenCompra.createMany({
          data: items.map(item => ({
            id_orden_compra: parseInt(id),
            id_vacuna: parseInt(item.id_vacuna),
            id_proveedor: parseInt(item.id_proveedor),
            cantidad_solicitada: parseInt(item.cantidad_solicitada),
            precio_estimado: item.precio_estimado ? parseFloat(item.precio_estimado) : null,
            observaciones: item.observaciones || null
          }))
        });
      }

      return orden;
    });

    res.json({
      success: true,
      message: 'Orden de compra actualizada exitosamente',
      data: ordenActualizada
    });

  } catch (error) {
    console.error('Error al actualizar orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Cambiar estado de la orden
 */
exports.cambiarEstadoOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['borrador', 'pendiente', 'confirmada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const orden = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: { detalle_orden: true }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // Validar transiciones de estado
    const transicionesValidas = {
      'borrador': ['pendiente', 'cancelada'],
      'pendiente': ['confirmada', 'borrador', 'cancelada'],
      'confirmada': ['cancelada'], // parcial e ingresada se calculan automáticamente
      'parcial': ['cancelada'],
      'ingresada': [],
      'cancelada': []
    };

    if (!transicionesValidas[orden.estado]?.includes(estado)) {
      return res.status(400).json({ 
        error: `No se puede cambiar de estado ${orden.estado} a ${estado}` 
      });
    }

    // Validar que tenga items antes de confirmar
    if (estado === 'confirmada' && orden.detalle_orden.length === 0) {
      return res.status(400).json({ 
        error: 'La orden debe tener al menos un item para confirmarla' 
      });
    }

    const ordenActualizada = await prisma.ordenCompra.update({
      where: { id_orden_compra: parseInt(id) },
      data: {
        estado,
        updated_by: req.user?.id_usuario || null
      }
    });

    res.json({
      success: true,
      message: `Estado de la orden cambiado a ${estado}`,
      data: ordenActualizada
    });

  } catch (error) {
    console.error('Error al cambiar estado de orden:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Registrar ingreso de mercadería (soporta múltiples lotes y parciales)
 */
exports.registrarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { ingresos } = req.body; // Array de ingresos

    // Estructura de cada ingreso:
    // {
    //   id_detalle_orden: number,
    //   lotes: [{ cantidad, lote, fecha_vencimiento, precio_compra, ubicacion_fisica, temperatura_req }]
    // }

    if (!ingresos || ingresos.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un ingreso' });
    }

    const orden = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: {
        detalle_orden: {
          include: {
            vacuna: {
              include: {
                presentacion: { select: { dosis_por_frasco: true } }
              }
            }
          }
        }
      }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (!['confirmada', 'parcial'].includes(orden.estado)) {
      return res.status(400).json({ 
        error: 'Solo se pueden registrar ingresos en órdenes confirmadas o parciales' 
      });
    }

    // Procesar ingresos en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const ingresosCreados = [];
      const stocksCreados = [];

      for (const ingreso of ingresos) {
        const detalle = orden.detalle_orden.find(
          d => d.id_detalle_orden === parseInt(ingreso.id_detalle_orden)
        );

        if (!detalle) {
          throw new Error(`Detalle de orden ${ingreso.id_detalle_orden} no encontrado`);
        }

        // Calcular total a ingresar para este detalle
        const totalAIngresar = ingreso.lotes.reduce((sum, l) => sum + (parseInt(l.cantidad) || 0), 0);
        const pendienteRecibir = detalle.cantidad_solicitada - detalle.cantidad_recibida;

        // Validar que no se exceda la cantidad pendiente
        if (totalAIngresar > pendienteRecibir) {
          throw new Error(
            `No se puede ingresar ${totalAIngresar} dosis de "${detalle.vacuna?.nombre || 'vacuna'}". ` +
            `Solo quedan ${pendienteRecibir} dosis pendientes de recibir.`
          );
        }

        for (const loteData of ingreso.lotes) {
          if (!loteData.cantidad || loteData.cantidad <= 0) {
            continue; // Saltar lotes sin cantidad
          }

          // Verificar si ya existe el lote para esta vacuna
          let stockVacuna = await tx.stockVacuna.findUnique({
            where: {
              id_vacuna_lote: {
                id_vacuna: detalle.id_vacuna,
                lote: loteData.lote
              }
            }
          });

          if (stockVacuna) {
            // Actualizar stock existente
            const stockAnterior = stockVacuna.stock_actual;
            stockVacuna = await tx.stockVacuna.update({
              where: { id_stock_vacuna: stockVacuna.id_stock_vacuna },
              data: {
                stock_actual: { increment: parseInt(loteData.cantidad) },
                precio_compra: loteData.precio_compra ? parseFloat(loteData.precio_compra) : stockVacuna.precio_compra,
                ubicacion_fisica: loteData.ubicacion_fisica || stockVacuna.ubicacion_fisica,
                temperatura_req: loteData.temperatura_req || stockVacuna.temperatura_req
              }
            });

            // Registrar movimiento
            await tx.movimientoStockVacuna.create({
              data: {
                id_stock_vacuna: stockVacuna.id_stock_vacuna,
                tipo_movimiento: 'ingreso',
                cantidad: parseInt(loteData.cantidad),
                stock_anterior: stockAnterior,
                stock_posterior: stockVacuna.stock_actual,
                motivo: `Ingreso por Orden de Compra ${orden.numero_orden}`,
                observaciones: loteData.observaciones || null,
                precio_unitario: loteData.precio_compra ? parseFloat(loteData.precio_compra) : null,
                id_usuario: req.user?.id_usuario || null
              }
            });

          } else {
            // Crear nuevo registro de stock
            stockVacuna = await tx.stockVacuna.create({
              data: {
                id_vacuna: detalle.id_vacuna,
                lote: loteData.lote,
                fecha_vencimiento: new Date(loteData.fecha_vencimiento),
                stock_actual: parseInt(loteData.cantidad),
                stock_minimo: 0,
                precio_compra: loteData.precio_compra ? parseFloat(loteData.precio_compra) : null,
                ubicacion_fisica: loteData.ubicacion_fisica || null,
                temperatura_req: loteData.temperatura_req || null,
                estado_stock: 'disponible',
                created_by: req.user?.id_usuario || null
              }
            });

            // Registrar movimiento inicial
            await tx.movimientoStockVacuna.create({
              data: {
                id_stock_vacuna: stockVacuna.id_stock_vacuna,
                tipo_movimiento: 'ingreso',
                cantidad: parseInt(loteData.cantidad),
                stock_anterior: 0,
                stock_posterior: parseInt(loteData.cantidad),
                motivo: `Ingreso inicial por Orden de Compra ${orden.numero_orden}`,
                observaciones: `Lote: ${loteData.lote}`,
                precio_unitario: loteData.precio_compra ? parseFloat(loteData.precio_compra) : null,
                id_usuario: req.user?.id_usuario || null
              }
            });

            stocksCreados.push(stockVacuna);
          }

          // Crear registro de ingreso
          const nuevoIngreso = await tx.ingresoOrdenCompra.create({
            data: {
              id_detalle_orden: parseInt(ingreso.id_detalle_orden),
              id_stock_vacuna: stockVacuna.id_stock_vacuna,
              cantidad_ingresada: parseInt(loteData.cantidad),
              lote: loteData.lote,
              fecha_vencimiento: new Date(loteData.fecha_vencimiento),
              precio_compra: loteData.precio_compra ? parseFloat(loteData.precio_compra) : null,
              ubicacion_fisica: loteData.ubicacion_fisica || null,
              temperatura_req: loteData.temperatura_req || null,
              observaciones: loteData.observaciones || null,
              created_by: req.user?.id_usuario || null
            }
          });

          ingresosCreados.push(nuevoIngreso);

          // Actualizar cantidad recibida en detalle
          await tx.detalleOrdenCompra.update({
            where: { id_detalle_orden: parseInt(ingreso.id_detalle_orden) },
            data: {
              cantidad_recibida: { increment: parseInt(loteData.cantidad) }
            }
          });
        }
      }

      // Recalcular estados de items
      const detallesActualizados = await tx.detalleOrdenCompra.findMany({
        where: { id_orden_compra: parseInt(id) }
      });

      for (const detalle of detallesActualizados) {
        const nuevoEstado = calcularEstadoItem(detalle.cantidad_solicitada, detalle.cantidad_recibida);
        await tx.detalleOrdenCompra.update({
          where: { id_detalle_orden: detalle.id_detalle_orden },
          data: { estado_item: nuevoEstado }
        });
      }

      // Recalcular estado de la orden
      const detallesFinal = await tx.detalleOrdenCompra.findMany({
        where: { id_orden_compra: parseInt(id) }
      });
      const nuevoEstadoOrden = calcularEstadoOrden(detallesFinal);

      const ordenActualizada = await tx.ordenCompra.update({
        where: { id_orden_compra: parseInt(id) },
        data: {
          estado: nuevoEstadoOrden,
          fecha_ingreso_completo: nuevoEstadoOrden === 'ingresada' ? new Date() : null,
          updated_by: req.user?.id_usuario || null
        }
      });

      return {
        orden: ordenActualizada,
        ingresos: ingresosCreados,
        stocks_creados: stocksCreados.length,
        nuevo_estado: nuevoEstadoOrden
      };
    });

    res.json({
      success: true,
      message: 'Ingreso registrado exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error al registrar ingreso:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

/**
 * Obtener stock global de vacunas para sugerencia de compra
 */
exports.getStockGlobalVacunas = async (req, res) => {
  try {
    const { id_cotizacion, mostrar_todo } = req.query;

    // Obtener todas las vacunas activas con su stock
    const vacunas = await prisma.vacuna.findMany({
      where: { activa: true },
      include: {
        proveedor: { select: { id_proveedor: true, nombre: true } },
        presentacion: { select: { nombre: true, dosis_por_frasco: true } },
        patologia: { select: { nombre: true } },
        stock_vacunas: {
          where: { estado_stock: 'disponible' },
          select: {
            id_stock_vacuna: true,
            lote: true,
            fecha_vencimiento: true,
            stock_actual: true,
            stock_reservado: true,
            ubicacion_fisica: true
          },
          orderBy: { fecha_vencimiento: 'asc' }
        }
      },
      orderBy: [
        { proveedor: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });

    // Si hay cotización, calcular necesidades
    let necesidadesPorVacuna = {};
    let cotizacionInfo = null;

    if (id_cotizacion) {
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id_cotizacion: parseInt(id_cotizacion) },
        include: {
          cliente: { select: { nombre: true } },
          plan: {
            include: {
              vacunas_plan: {
                include: {
                  vacuna: { select: { id_vacuna: true, nombre: true } }
                }
              }
            }
          }
        }
      });

      if (cotizacion) {
        cotizacionInfo = {
          numero: cotizacion.numero_cotizacion,
          cliente: cotizacion.cliente.nombre,
          cantidad_animales: cotizacion.cantidad_animales
        };

        // Calcular necesidades por vacuna del plan
        cotizacion.plan.vacunas_plan.forEach(pv => {
          const dosisNecesarias = pv.cantidad_total * cotizacion.cantidad_animales;
          necesidadesPorVacuna[pv.id_vacuna] = {
            nombre: pv.vacuna.nombre,
            dosis_necesarias: dosisNecesarias
          };
        });
      }
    }

    // También considerar todas las cotizaciones activas para stock comprometido
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: { in: ['en_proceso', 'enviada', 'aceptada'] }
      },
      include: {
        calendario_vacunacion: {
          where: { estado_dosis: 'pendiente' },
          select: {
            id_producto: true,
            cantidad_dosis: true
          }
        }
      }
    });

    // Calcular stock comprometido por vacuna
    const stockComprometido = {};
    cotizacionesActivas.forEach(cot => {
      cot.calendario_vacunacion.forEach(cal => {
        if (!stockComprometido[cal.id_producto]) {
          stockComprometido[cal.id_producto] = 0;
        }
        stockComprometido[cal.id_producto] += cal.cantidad_dosis;
      });
    });

    // Formatear respuesta
    const vacunasFormatted = vacunas.map(vacuna => {
      const stockTotal = vacuna.stock_vacunas.reduce((sum, s) => sum + s.stock_actual, 0);
      const stockReservado = vacuna.stock_vacunas.reduce((sum, s) => sum + s.stock_reservado, 0);
      const comprometido = stockComprometido[vacuna.id_vacuna] || 0;
      const stockDisponible = stockTotal - stockReservado - comprometido;

      const necesidad = necesidadesPorVacuna[vacuna.id_vacuna];
      const dosisNecesarias = necesidad?.dosis_necesarias || 0;
      const faltante = Math.max(0, dosisNecesarias - stockDisponible);

      // Detalle de lotes
      const detalleLotes = vacuna.stock_vacunas.map(s => ({
        id_stock_vacuna: s.id_stock_vacuna,
        lote: s.lote,
        fecha_vencimiento: s.fecha_vencimiento,
        stock_actual: s.stock_actual,
        stock_reservado: s.stock_reservado,
        disponible: s.stock_actual - s.stock_reservado,
        ubicacion: s.ubicacion_fisica || 'Sin ubicación',
        dias_vencimiento: Math.ceil((new Date(s.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
      }));

      return {
        id_vacuna: vacuna.id_vacuna,
        codigo: vacuna.codigo,
        nombre: vacuna.nombre,
        id_proveedor: vacuna.id_proveedor,
        proveedor_nombre: vacuna.proveedor.nombre,
        presentacion: vacuna.presentacion?.nombre,
        dosis_por_frasco: vacuna.presentacion?.dosis_por_frasco || 1,
        patologia: vacuna.patologia?.nombre,
        precio_lista: parseFloat(vacuna.precio_lista),
        stock: {
          total: stockTotal,
          reservado: stockReservado,
          comprometido: comprometido,
          disponible: stockDisponible
        },
        necesidad_cotizacion: dosisNecesarias,
        faltante_sugerido: faltante,
        detalle_lotes: detalleLotes
      };
    });

    // Filtrar solo vacunas con faltante si no se pide mostrar todo
    const resultado = mostrar_todo === 'true' 
      ? vacunasFormatted 
      : vacunasFormatted.filter(v => v.faltante_sugerido > 0 || Object.keys(necesidadesPorVacuna).length === 0);

    res.json({
      success: true,
      data: resultado,
      cotizacion_info: cotizacionInfo,
      total_vacunas: resultado.length
    });

  } catch (error) {
    console.error('Error al obtener stock global:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Generar sugerencia de orden desde cotización
 */
exports.generarSugerenciaDesdesCotizacion = async (req, res) => {
  try {
    const { id_cotizacion } = req.params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      include: {
        cliente: { select: { nombre: true } },
        plan: {
          include: {
            vacunas_plan: {
              include: {
                vacuna: {
                  include: {
                    proveedor: { select: { id_proveedor: true, nombre: true } },
                    presentacion: { select: { dosis_por_frasco: true } },
                    stock_vacunas: {
                      where: { estado_stock: 'disponible' },
                      select: {
                        stock_actual: true,
                        stock_reservado: true,
                        lote: true,
                        ubicacion_fisica: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Generar sugerencia de items - INCLUYE TODOS los items de la cotización
    const itemsSugeridos = cotizacion.plan.vacunas_plan.map(pv => {
      const dosisNecesarias = pv.cantidad_total * cotizacion.cantidad_animales;
      const stockTotal = pv.vacuna.stock_vacunas.reduce((sum, s) => sum + s.stock_actual, 0);
      const stockReservado = pv.vacuna.stock_vacunas.reduce((sum, s) => sum + s.stock_reservado, 0);
      const stockDisponible = stockTotal - stockReservado;
      const faltante = Math.max(0, dosisNecesarias - stockDisponible);

      const detalleLotes = pv.vacuna.stock_vacunas.map(s => ({
        lote: s.lote,
        disponible: s.stock_actual - s.stock_reservado,
        ubicacion: s.ubicacion_fisica || 'Sin ubicación'
      }));

      return {
        id_vacuna: pv.id_vacuna,
        vacuna_nombre: pv.vacuna.nombre,
        id_proveedor: pv.vacuna.id_proveedor,
        proveedor_nombre: pv.vacuna.proveedor.nombre,
        dosis_necesarias: dosisNecesarias,
        stock_disponible: stockDisponible,
        faltante: faltante,
        // Sugerir el faltante si hay, sino la cantidad necesaria total
        cantidad_sugerida: faltante > 0 ? faltante : dosisNecesarias,
        precio_estimado: parseFloat(pv.vacuna.precio_lista) || 0,
        detalle_lotes: detalleLotes,
        detalle_stock: detalleLotes.map(l => `${l.lote}: ${l.disponible} disp (${l.ubicacion})`).join(' | ') || 'Sin stock'
      };
    });

    // NO filtramos - devolvemos TODOS los items de la cotización

    res.json({
      success: true,
      data: {
        cotizacion: {
          id: cotizacion.id_cotizacion,
          numero: cotizacion.numero_cotizacion,
          cliente: cotizacion.cliente.nombre,
          plan: cotizacion.plan.nombre,
          cantidad_animales: cotizacion.cantidad_animales
        },
        items_sugeridos: itemsSugeridos,
        total_items: itemsSugeridos.length,
        total_estimado: itemsSugeridos.reduce((sum, i) => 
          sum + (i.cantidad_sugerida * i.precio_estimado), 0
        )
      }
    });

  } catch (error) {
    console.error('Error al generar sugerencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener datos para exportar PDF
 */
exports.getOrdenParaPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_proveedor } = req.query; // Opcional: filtrar por proveedor

    const orden = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: {
        cotizacion: {
          select: {
            numero_cotizacion: true,
            cliente: {
              select: { nombre: true, cuit: true, direccion: true, telefono: true }
            }
          }
        },
        detalle_orden: {
          where: id_proveedor ? { id_proveedor: parseInt(id_proveedor) } : {},
          include: {
            vacuna: {
              include: {
                presentacion: { select: { nombre: true, dosis_por_frasco: true } },
                patologia: { select: { nombre: true } }
              }
            },
            proveedor: true
          }
        }
      }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // Agrupar por proveedor
    const porProveedor = {};
    orden.detalle_orden.forEach(d => {
      const provId = d.id_proveedor;
      if (!porProveedor[provId]) {
        porProveedor[provId] = {
          proveedor: d.proveedor,
          items: [],
          subtotal: 0
        };
      }
      const subtotalItem = (d.precio_estimado || 0) * d.cantidad_solicitada;
      porProveedor[provId].items.push({
        ...d,
        subtotal: subtotalItem
      });
      porProveedor[provId].subtotal += subtotalItem;
    });

    const totalGeneral = Object.values(porProveedor).reduce((sum, p) => sum + p.subtotal, 0);

    res.json({
      success: true,
      data: {
        orden: {
          numero_orden: orden.numero_orden,
          estado: orden.estado,
          fecha_creacion: orden.fecha_creacion,
          fecha_esperada: orden.fecha_esperada,
          observaciones: orden.observaciones
        },
        cotizacion: orden.cotizacion,
        por_proveedor: Object.values(porProveedor),
        total_general: totalGeneral,
        generado_el: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al obtener orden para PDF:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Eliminar orden de compra (solo en borrador)
 */
exports.deleteOrdenCompra = async (req, res) => {
  try {
    const { id } = req.params;

    const orden = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (orden.estado !== 'borrador') {
      return res.status(400).json({ 
        error: 'Solo se pueden eliminar órdenes en estado borrador' 
      });
    }

    await prisma.ordenCompra.delete({
      where: { id_orden_compra: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Orden de compra eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener proveedores para filtro
 */
exports.getProveedoresOrden = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { activo: true },
      select: {
        id_proveedor: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({
      success: true,
      data: proveedores
    });

  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener cotizaciones disponibles para crear orden
 */
exports.getCotizacionesDisponibles = async (req, res) => {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        estado: { in: ['en_proceso', 'enviada', 'aceptada'] }
      },
      select: {
        id_cotizacion: true,
        numero_cotizacion: true,
        estado: true,
        cantidad_animales: true,
        cliente: {
          select: { nombre: true }
        },
        plan: {
          select: { nombre: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: cotizaciones.map(c => ({
        ...c,
        id_cotizacion: Number(c.id_cotizacion),
        cliente_nombre: c.cliente.nombre,
        plan_nombre: c.plan.nombre
      }))
    });

  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
