const prisma = require('../lib/prisma');

// =====================================================
// CONTROLADOR DE ASIGNACIONES DE LOTES
// Gestiona la asignación de lotes de stock a calendarios
// de vacunación (soporta multi-lote)
// =====================================================

/**
 * Obtener todas las asignaciones de un calendario
 * GET /asignaciones/calendario/:id_calendario
 */
exports.getAsignacionesByCalendario = async (req, res) => {
  try {
    const { id_calendario } = req.params;

    const asignaciones = await prisma.asignacionLote.findMany({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        stock_vacuna: {
          select: {
            id_stock_vacuna: true,
            lote: true,
            fecha_vencimiento: true,
            stock_actual: true,
            stock_reservado: true,
            ubicacion_fisica: true,
            vacuna: {
              select: {
                nombre: true,
                codigo: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    const totalAsignado = asignaciones.reduce((sum, a) => sum + a.cantidad_asignada, 0);

    res.json({
      success: true,
      data: {
        id_calendario: parseInt(id_calendario),
        total_asignado: totalAsignado,
        cantidad_lotes: asignaciones.length,
        asignaciones: asignaciones.map(a => ({
          id_asignacion: a.id_asignacion,
          id_stock_vacuna: a.id_stock_vacuna,
          lote: a.stock_vacuna.lote,
          cantidad_asignada: a.cantidad_asignada,
          fecha_vencimiento: a.stock_vacuna.fecha_vencimiento,
          ubicacion_fisica: a.stock_vacuna.ubicacion_fisica,
          stock_disponible: a.stock_vacuna.stock_actual - a.stock_vacuna.stock_reservado,
          created_at: a.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asignaciones: ' + error.message
    });
  }
};

/**
 * Obtener todas las asignaciones (reservas) de un lote de stock
 * GET /asignaciones/stock/:id_stock_vacuna
 */
exports.getAsignacionesByStock = async (req, res) => {
  try {
    const { id_stock_vacuna } = req.params;

    // Obtener info del lote
    const stock = await prisma.stockVacuna.findUnique({
      where: { id_stock_vacuna: parseInt(id_stock_vacuna) },
      include: {
        vacuna: {
          select: {
            nombre: true,
            codigo: true,
            presentacion: {
              select: { dosis_por_frasco: true }
            }
          }
        }
      }
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Lote no encontrado'
      });
    }

    // Obtener asignaciones con info del calendario y cotización
    const asignaciones = await prisma.asignacionLote.findMany({
      where: { id_stock_vacuna: parseInt(id_stock_vacuna) },
      include: {
        calendario: {
          select: {
            id_calendario: true,
            numero_semana: true,
            fecha_programada: true,
            cantidad_dosis: true,
            estado_entrega: true,
            dosis_entregadas: true,
            cotizacion: {
              select: {
                id_cotizacion: true,
                numero_cotizacion: true,
                estado: true,
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
            }
          }
        }
      },
      orderBy: { calendario: { fecha_programada: 'asc' } }
    });

    const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1000;
    const totalReservado = asignaciones.reduce((sum, a) => sum + a.cantidad_asignada, 0);

    // Agrupar por cotización
    const cotizacionesMap = new Map();
    asignaciones.forEach(a => {
      const idCot = a.calendario.cotizacion.id_cotizacion;
      if (!cotizacionesMap.has(idCot)) {
        cotizacionesMap.set(idCot, {
          id_cotizacion: idCot,
          numero_cotizacion: a.calendario.cotizacion.numero_cotizacion,
          cliente: a.calendario.cotizacion.cliente?.nombre || 'Sin cliente',
          plan: a.calendario.cotizacion.plan?.nombre || 'Sin plan',
          estado: a.calendario.cotizacion.estado,
          total_dosis_reservadas: 0,
          entregas: []
        });
      }
      
      const cot = cotizacionesMap.get(idCot);
      cot.total_dosis_reservadas += a.cantidad_asignada;
      cot.entregas.push({
        id_asignacion: a.id_asignacion,
        id_calendario: a.calendario.id_calendario,
        semana: a.calendario.numero_semana,
        fecha_programada: a.calendario.fecha_programada,
        cantidad_asignada: a.cantidad_asignada,
        dosis_entregadas: a.calendario.dosis_entregadas || 0,
        estado_entrega: a.calendario.estado_entrega
      });
    });

    res.json({
      success: true,
      lote: {
        id_stock_vacuna: stock.id_stock_vacuna,
        lote: stock.lote,
        vacuna: stock.vacuna.nombre,
        stock_actual: stock.stock_actual,
        stock_reservado: stock.stock_reservado,
        frascos_actuales: Math.floor(stock.stock_actual / dosisPorFrasco),
        frascos_reservados: Math.floor(stock.stock_reservado / dosisPorFrasco),
        dosis_por_frasco: dosisPorFrasco
      },
      totales: {
        total_dosis_reservadas: totalReservado,
        total_frascos_reservados: Math.ceil(totalReservado / dosisPorFrasco),
        total_cotizaciones: cotizacionesMap.size
      },
      cotizaciones: Array.from(cotizacionesMap.values())
    });

  } catch (error) {
    console.error('Error al obtener asignaciones del stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asignaciones: ' + error.message
    });
  }
};

/**
 * Asignar un lote a un calendario
 * POST /asignaciones
 * Body: { id_calendario, id_stock_vacuna, cantidad_asignada }
 */
exports.asignarLote = async (req, res) => {
  try {
    const { id_calendario, id_stock_vacuna, cantidad_asignada } = req.body;
    const idUsuario = req.user?.id_usuario;

    console.log('=== ASIGNAR LOTE (NUEVA TABLA) ===');
    console.log('Calendario:', id_calendario, 'Stock:', id_stock_vacuna, 'Cantidad:', cantidad_asignada);

    // Validaciones
    if (!id_calendario || !id_stock_vacuna || !cantidad_asignada) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren id_calendario, id_stock_vacuna y cantidad_asignada'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener calendario
      const calendario = await tx.calendarioVacunacion.findUnique({
        where: { id_calendario: parseInt(id_calendario) }
      });

      if (!calendario) {
        throw new Error('Calendario no encontrado');
      }

      // Obtener stock
      const stock = await tx.stockVacuna.findUnique({
        where: { id_stock_vacuna: parseInt(id_stock_vacuna) }
      });

      if (!stock) {
        throw new Error('Lote de stock no encontrado');
      }

      // Validar stock disponible
      const stockDisponible = stock.stock_actual - stock.stock_reservado;
      if (stockDisponible < cantidad_asignada) {
        throw new Error(`Stock insuficiente. Disponible: ${stockDisponible}, Requerido: ${cantidad_asignada}`);
      }

      // Validar fecha de vencimiento
      if (stock.fecha_vencimiento < calendario.fecha_programada) {
        throw new Error('El lote vence antes de la fecha de aplicación');
      }

      // 1. Crear asignación
      const asignacion = await tx.asignacionLote.create({
        data: {
          id_calendario: parseInt(id_calendario),
          id_stock_vacuna: parseInt(id_stock_vacuna),
          cantidad_asignada: parseInt(cantidad_asignada),
          created_by: idUsuario
        }
      });

      // 2. Incrementar stock_reservado
      await tx.stockVacuna.update({
        where: { id_stock_vacuna: parseInt(id_stock_vacuna) },
        data: { stock_reservado: { increment: parseInt(cantidad_asignada) } }
      });

      // 3. Registrar movimiento (para historial)
      await tx.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: parseInt(id_stock_vacuna),
          tipo_movimiento: 'reserva',
          cantidad: parseInt(cantidad_asignada),
          stock_anterior: stock.stock_actual,
          stock_posterior: stock.stock_actual,
          motivo: 'Asignación de lote a calendario',
          observaciones: `Asignación ID: ${asignacion.id_asignacion}`,
          id_calendario: parseInt(id_calendario),
          id_usuario: idUsuario
        }
      });

      // 4. Actualizar campos legacy del calendario (para compatibilidad)
      const todasAsignaciones = await tx.asignacionLote.findMany({
        where: { id_calendario: parseInt(id_calendario) },
        include: { stock_vacuna: true },
        orderBy: { created_at: 'asc' }
      });

      const primerLote = todasAsignaciones[0];
      const textoLote = todasAsignaciones.length > 1 
        ? `${primerLote.stock_vacuna.lote} +${todasAsignaciones.length - 1} más`
        : primerLote.stock_vacuna.lote;

      await tx.calendarioVacunacion.update({
        where: { id_calendario: parseInt(id_calendario) },
        data: {
          id_stock_vacuna: primerLote.id_stock_vacuna,
          lote_asignado: textoLote,
          fecha_vencimiento_lote: primerLote.stock_vacuna.fecha_vencimiento
        }
      });

      return {
        asignacion,
        lote: stock.lote,
        total_lotes: todasAsignaciones.length
      };
    });

    res.json({
      success: true,
      message: 'Lote asignado exitosamente',
      data: {
        id_asignacion: resultado.asignacion.id_asignacion,
        lote: resultado.lote,
        cantidad_asignada: cantidad_asignada,
        total_lotes_calendario: resultado.total_lotes
      }
    });

  } catch (error) {
    console.error('Error al asignar lote:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al asignar lote'
    });
  }
};

/**
 * Liberar todos los lotes de un calendario
 * DELETE /asignaciones/calendario/:id_calendario
 */
exports.liberarLotesCalendario = async (req, res) => {
  try {
    const { id_calendario } = req.params;
    const { motivo } = req.body;
    const idUsuario = req.user?.id_usuario;

    console.log('=== LIBERAR LOTES CALENDARIO (NUEVA TABLA) ===');
    console.log('Calendario:', id_calendario);

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener calendario
      const calendario = await tx.calendarioVacunacion.findUnique({
        where: { id_calendario: parseInt(id_calendario) },
        include: { cotizacion: { select: { numero_cotizacion: true } } }
      });

      if (!calendario) {
        throw new Error('Calendario no encontrado');
      }

      // Obtener todas las asignaciones
      const asignaciones = await tx.asignacionLote.findMany({
        where: { id_calendario: parseInt(id_calendario) },
        include: { stock_vacuna: true }
      });

      if (asignaciones.length === 0) {
        throw new Error('No hay lotes asignados para liberar');
      }

      const lotesLiberados = [];

      // Liberar cada asignación
      for (const asig of asignaciones) {
        const cantidadALiberar = Math.min(asig.cantidad_asignada, asig.stock_vacuna.stock_reservado);

        if (cantidadALiberar > 0) {
          // Decrementar stock_reservado
          await tx.stockVacuna.update({
            where: { id_stock_vacuna: asig.id_stock_vacuna },
            data: { stock_reservado: { decrement: cantidadALiberar } }
          });

          // Registrar movimiento
          await tx.movimientoStockVacuna.create({
            data: {
              id_stock_vacuna: asig.id_stock_vacuna,
              tipo_movimiento: 'liberacion_reserva',
              cantidad: cantidadALiberar,
              stock_anterior: asig.stock_vacuna.stock_actual,
              stock_posterior: asig.stock_vacuna.stock_actual,
              motivo: motivo || 'Liberación de lote asignado',
              observaciones: `Cotización: ${calendario.cotizacion.numero_cotizacion}`,
              id_calendario: parseInt(id_calendario),
              id_usuario: idUsuario
            }
          });

          lotesLiberados.push({
            lote: asig.stock_vacuna.lote,
            cantidad_liberada: cantidadALiberar
          });
        }
      }

      // Eliminar todas las asignaciones
      await tx.asignacionLote.deleteMany({
        where: { id_calendario: parseInt(id_calendario) }
      });

      // Limpiar campos legacy del calendario
      await tx.calendarioVacunacion.update({
        where: { id_calendario: parseInt(id_calendario) },
        data: {
          id_stock_vacuna: null,
          lote_asignado: null,
          fecha_vencimiento_lote: null
        }
      });

      return { lotesLiberados, total: asignaciones.length };
    });

    res.json({
      success: true,
      message: `${resultado.total} lote(s) liberado(s) exitosamente`,
      data: {
        id_calendario: parseInt(id_calendario),
        lotes_liberados: resultado.lotesLiberados
      }
    });

  } catch (error) {
    console.error('Error al liberar lotes:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al liberar lotes'
    });
  }
};

/**
 * Eliminar una asignación específica
 * DELETE /asignaciones/:id_asignacion
 */
exports.eliminarAsignacion = async (req, res) => {
  try {
    const { id_asignacion } = req.params;
    const { motivo } = req.body;
    const idUsuario = req.user?.id_usuario;

    console.log('=== ELIMINAR ASIGNACIÓN ===');
    console.log('ID Asignación:', id_asignacion);

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener asignación
      const asignacion = await tx.asignacionLote.findUnique({
        where: { id_asignacion: parseInt(id_asignacion) },
        include: {
          stock_vacuna: true,
          calendario: {
            include: { cotizacion: { select: { numero_cotizacion: true } } }
          }
        }
      });

      if (!asignacion) {
        throw new Error('Asignación no encontrada');
      }

      const cantidadALiberar = Math.min(
        asignacion.cantidad_asignada, 
        asignacion.stock_vacuna.stock_reservado
      );

      // Decrementar stock_reservado
      if (cantidadALiberar > 0) {
        await tx.stockVacuna.update({
          where: { id_stock_vacuna: asignacion.id_stock_vacuna },
          data: { stock_reservado: { decrement: cantidadALiberar } }
        });

        // Registrar movimiento
        await tx.movimientoStockVacuna.create({
          data: {
            id_stock_vacuna: asignacion.id_stock_vacuna,
            tipo_movimiento: 'liberacion_reserva',
            cantidad: cantidadALiberar,
            stock_anterior: asignacion.stock_vacuna.stock_actual,
            stock_posterior: asignacion.stock_vacuna.stock_actual,
            motivo: motivo || 'Eliminación de asignación',
            observaciones: `Cotización: ${asignacion.calendario.cotizacion.numero_cotizacion}`,
            id_calendario: asignacion.id_calendario,
            id_usuario: idUsuario
          }
        });
      }

      // Eliminar asignación
      await tx.asignacionLote.delete({
        where: { id_asignacion: parseInt(id_asignacion) }
      });

      // Actualizar campos legacy del calendario
      const asignacionesRestantes = await tx.asignacionLote.findMany({
        where: { id_calendario: asignacion.id_calendario },
        include: { stock_vacuna: true },
        orderBy: { created_at: 'asc' }
      });

      if (asignacionesRestantes.length === 0) {
        await tx.calendarioVacunacion.update({
          where: { id_calendario: asignacion.id_calendario },
          data: {
            id_stock_vacuna: null,
            lote_asignado: null,
            fecha_vencimiento_lote: null
          }
        });
      } else {
        const primerLote = asignacionesRestantes[0];
        const textoLote = asignacionesRestantes.length > 1 
          ? `${primerLote.stock_vacuna.lote} +${asignacionesRestantes.length - 1} más`
          : primerLote.stock_vacuna.lote;

        await tx.calendarioVacunacion.update({
          where: { id_calendario: asignacion.id_calendario },
          data: {
            id_stock_vacuna: primerLote.id_stock_vacuna,
            lote_asignado: textoLote,
            fecha_vencimiento_lote: primerLote.stock_vacuna.fecha_vencimiento
          }
        });
      }

      return {
        lote: asignacion.stock_vacuna.lote,
        cantidad_liberada: cantidadALiberar,
        asignaciones_restantes: asignacionesRestantes.length
      };
    });

    res.json({
      success: true,
      message: 'Asignación eliminada exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al eliminar asignación'
    });
  }
};

/**
 * Recalcular stock_reservado de todos los lotes basándose en asignaciones
 * POST /asignaciones/recalcular-reservas
 * Útil para corregir inconsistencias
 */
exports.recalcularReservas = async (req, res) => {
  try {
    console.log('=== RECALCULAR RESERVAS ===');

    // Obtener suma de asignaciones por lote
    const asignacionesPorLote = await prisma.asignacionLote.groupBy({
      by: ['id_stock_vacuna'],
      _sum: {
        cantidad_asignada: true
      }
    });

    const actualizados = [];

    for (const grupo of asignacionesPorLote) {
      const stockReservadoCorrecto = grupo._sum.cantidad_asignada || 0;
      
      const stock = await prisma.stockVacuna.findUnique({
        where: { id_stock_vacuna: grupo.id_stock_vacuna }
      });

      if (stock && stock.stock_reservado !== stockReservadoCorrecto) {
        await prisma.stockVacuna.update({
          where: { id_stock_vacuna: grupo.id_stock_vacuna },
          data: { stock_reservado: stockReservadoCorrecto }
        });

        actualizados.push({
          lote: stock.lote,
          anterior: stock.stock_reservado,
          correcto: stockReservadoCorrecto
        });
      }
    }

    // También resetear a 0 los lotes sin asignaciones
    const lotesConAsignacion = asignacionesPorLote.map(g => g.id_stock_vacuna);
    
    if (lotesConAsignacion.length > 0) {
      await prisma.stockVacuna.updateMany({
        where: {
          id_stock_vacuna: { notIn: lotesConAsignacion },
          stock_reservado: { gt: 0 }
        },
        data: { stock_reservado: 0 }
      });
    }

    res.json({
      success: true,
      message: `Recálculo completado. ${actualizados.length} lotes actualizados.`,
      data: {
        lotes_actualizados: actualizados
      }
    });

  } catch (error) {
    console.error('Error al recalcular reservas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al recalcular reservas: ' + error.message
    });
  }
};
