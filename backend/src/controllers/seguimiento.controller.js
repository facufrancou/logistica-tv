const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

async function calcularCumplimiento(idCotizacion, fechaEvaluacion = new Date()) {
  // Obtener aplicaciones programadas hasta la fecha de evaluación
  const aplicacionesProgramadas = await prisma.calendarioVacunacion.findMany({
    where: {
      id_cotizacion: idCotizacion,
      fecha_programada: {
        lte: fechaEvaluacion
      }
    }
  });

  // Obtener aplicaciones realizadas
  const aplicacionesRealizadas = await prisma.aplicacionDosis.findMany({
    where: {
      id_cotizacion: idCotizacion,
      fecha_aplicacion: {
        lte: fechaEvaluacion
      },
      estado_aplicacion: 'exitosa'
    }
  });

  const totalProgramadas = aplicacionesProgramadas.reduce((sum, app) => sum + app.cantidad_dosis, 0);
  const totalAplicadas = aplicacionesRealizadas.reduce((sum, app) => sum + app.cantidad_aplicada, 0);
  const porcentajeCumplimiento = totalProgramadas > 0 ? (totalAplicadas / totalProgramadas) * 100 : 0;

  // Calcular días de atraso promedio
  let diasAtrasoTotal = 0;
  let aplicacionesAtrasadas = 0;

  for (const programada of aplicacionesProgramadas) {
    const aplicacionRealizada = aplicacionesRealizadas.find(
      real => real.id_calendario === programada.id_calendario
    );

    if (aplicacionRealizada) {
      const diasAtraso = Math.max(0, 
        Math.floor((new Date(aplicacionRealizada.fecha_aplicacion) - new Date(programada.fecha_programada)) / (1000 * 60 * 60 * 24))
      );
      if (diasAtraso > 0) {
        diasAtrasoTotal += diasAtraso;
        aplicacionesAtrasadas++;
      }
    } else if (new Date(programada.fecha_programada) < fechaEvaluacion) {
      // Aplicación vencida
      const diasVencida = Math.floor((fechaEvaluacion - new Date(programada.fecha_programada)) / (1000 * 60 * 60 * 24));
      diasAtrasoTotal += diasVencida;
      aplicacionesAtrasadas++;
    }
  }

  const diasAtrasoPromedio = aplicacionesAtrasadas > 0 ? Math.round(diasAtrasoTotal / aplicacionesAtrasadas) : 0;

  // Determinar estado general
  let estadoGeneral = 'en_tiempo';
  if (porcentajeCumplimiento < 50) {
    estadoGeneral = 'critico';
  } else if (porcentajeCumplimiento < 80 || diasAtrasoPromedio > 7) {
    estadoGeneral = 'atrasado';
  } else if (porcentajeCumplimiento === 100) {
    estadoGeneral = 'completado';
  }

  return {
    totalProgramadas,
    totalAplicadas,
    porcentajeCumplimiento: parseFloat(porcentajeCumplimiento.toFixed(2)),
    diasAtrasoPromedio,
    estadoGeneral,
    aplicacionesPendientes: totalProgramadas - totalAplicadas
  };
}

async function generarNotificacionesAutomaticas() {
  try {
    const ahora = new Date();
    const dosDiasAdelante = new Date(ahora.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    // 1. Recordatorios de aplicaciones próximas (2 días antes)
    const aplicacionesProximas = await prisma.calendarioVacunacion.findMany({
      where: {
        fecha_programada: {
          gte: ahora,
          lte: dosDiasAdelante
        },
        estado_dosis: 'pendiente'
      },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        },
        producto: true
      }
    });

    for (const aplicacion of aplicacionesProximas) {
      // Verificar si ya existe notificación para esta aplicación
      const notificacionExistente = await prisma.notificacionAutomatica.findFirst({
        where: {
          tipo_notificacion: 'recordatorio_aplicacion',
          id_calendario: aplicacion.id_calendario,
          estado_notificacion: {
            in: ['pendiente', 'enviada']
          }
        }
      });

      if (!notificacionExistente) {
        await prisma.notificacionAutomatica.create({
          data: {
            tipo_notificacion: 'recordatorio_aplicacion',
            id_cotizacion: aplicacion.id_cotizacion,
            id_calendario: aplicacion.id_calendario,
            id_producto: aplicacion.id_producto,
            titulo: `Recordatorio: Aplicación programada para ${aplicacion.fecha_programada.toLocaleDateString()}`,
            mensaje: `Recordatorio de aplicación de ${aplicacion.producto.nombre} para el cliente ${aplicacion.cotizacion.cliente.nombre}. Cantidad: ${aplicacion.cantidad_dosis} dosis.`,
            fecha_programada: new Date(aplicacion.fecha_programada.getTime() - (2 * 24 * 60 * 60 * 1000)),
            destinatarios: JSON.stringify({
              cliente_id: aplicacion.cotizacion.id_cliente,
              cliente_nombre: aplicacion.cotizacion.cliente.nombre
            })
          }
        });
      }
    }

    // 2. Alertas de aplicaciones vencidas
    const aplicacionesVencidas = await prisma.calendarioVacunacion.findMany({
      where: {
        fecha_programada: {
          lt: ahora
        },
        estado_dosis: 'pendiente'
      },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        },
        producto: true
      }
    });

    for (const aplicacion of aplicacionesVencidas) {
      const notificacionExistente = await prisma.notificacionAutomatica.findFirst({
        where: {
          tipo_notificacion: 'aplicacion_vencida',
          id_calendario: aplicacion.id_calendario,
          estado_notificacion: {
            in: ['pendiente', 'enviada']
          }
        }
      });

      if (!notificacionExistente) {
        const diasVencida = Math.floor((ahora - new Date(aplicacion.fecha_programada)) / (1000 * 60 * 60 * 24));
        
        await prisma.notificacionAutomatica.create({
          data: {
            tipo_notificacion: 'aplicacion_vencida',
            id_cotizacion: aplicacion.id_cotizacion,
            id_calendario: aplicacion.id_calendario,
            id_producto: aplicacion.id_producto,
            titulo: `URGENTE: Aplicación vencida (${diasVencida} días)`,
            mensaje: `La aplicación de ${aplicacion.producto.nombre} para ${aplicacion.cotizacion.cliente.nombre} está vencida por ${diasVencida} días. Reprogramar urgentemente.`,
            fecha_programada: ahora,
            destinatarios: JSON.stringify({
              cliente_id: aplicacion.cotizacion.id_cliente,
              cliente_nombre: aplicacion.cotizacion.cliente.nombre,
              urgente: true
            })
          }
        });
      }
    }

    return {
      recordatorios_creados: aplicacionesProximas.length,
      alertas_vencidas_creadas: aplicacionesVencidas.length
    };

  } catch (error) {
    console.error('Error generando notificaciones automáticas:', error);
    throw error;
  }
}

// ===== ENDPOINTS PRINCIPALES =====

// 1. Registrar nueva aplicación de dosis
exports.registrarAplicacion = async (req, res) => {
  try {
    const {
      id_calendario,
      id_cotizacion,
      id_producto,
      cantidad_aplicada,
      fecha_aplicacion,
      lote_producto,
      animal_identificacion,
      responsable_aplicacion,
      observaciones,
      estado_aplicacion = 'exitosa'
    } = req.body;
    const idUsuario = req.user?.id_usuario;

    // Validaciones básicas
    if (!id_calendario || !id_cotizacion || !id_producto || !cantidad_aplicada || !fecha_aplicacion) {
      return res.status(400).json({
        error: 'Campos obligatorios: id_calendario, id_cotizacion, id_producto, cantidad_aplicada, fecha_aplicacion'
      });
    }

    // Verificar que existe el calendario programado
    const calendarioItem = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        cotizacion: true,
        producto: true
      }
    });

    if (!calendarioItem) {
      return res.status(404).json({ error: 'Item del calendario no encontrado' });
    }

    // Verificar que no se aplique más de lo programado
    if (cantidad_aplicada > calendarioItem.cantidad_dosis) {
      return res.status(400).json({
        error: `No se puede aplicar más de lo programado. Máximo: ${calendarioItem.cantidad_dosis}`
      });
    }

    // Registrar la aplicación
    const aplicacion = await prisma.aplicacionDosis.create({
      data: {
        id_calendario: parseInt(id_calendario),
        id_cotizacion: parseInt(id_cotizacion),
        id_producto: parseInt(id_producto),
        cantidad_aplicada: parseInt(cantidad_aplicada),
        fecha_aplicacion: new Date(fecha_aplicacion),
        lote_producto,
        animal_identificacion,
        responsable_aplicacion,
        observaciones,
        estado_aplicacion,
        created_by: idUsuario
      }
    });

    // Actualizar estado del calendario si se aplicó completamente
    if (cantidad_aplicada === calendarioItem.cantidad_dosis) {
      await prisma.calendarioVacunacion.update({
        where: { id_calendario: parseInt(id_calendario) },
        data: { estado_dosis: 'aplicada' }
      });
    }

    // Actualizar stock si el producto requiere control
    if (calendarioItem.producto.requiere_control_stock) {
      await prisma.producto.update({
        where: { id_producto: parseInt(id_producto) },
        data: {
          stock: {
            decrement: cantidad_aplicada
          },
          stock_reservado: {
            decrement: Math.min(cantidad_aplicada, calendarioItem.producto.stock_reservado || 0)
          }
        }
      });

      // Registrar movimiento de stock
      await prisma.movimientoStock.create({
        data: {
          id_producto: parseInt(id_producto),
          tipo_movimiento: 'egreso',
          cantidad: cantidad_aplicada,
          stock_anterior: calendarioItem.producto.stock || 0,
          stock_posterior: (calendarioItem.producto.stock || 0) - cantidad_aplicada,
          motivo: 'Aplicación de dosis realizada',
          observaciones: `Aplicación ID: ${aplicacion.id_aplicacion}`,
          id_cotizacion: parseInt(id_cotizacion),
          id_usuario: idUsuario
        }
      });
    }

    res.json({
      message: 'Aplicación registrada exitosamente',
      aplicacion: aplicacion,
      calendario_actualizado: cantidad_aplicada === calendarioItem.cantidad_dosis
    });

  } catch (error) {
    console.error('Error al registrar aplicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 2. Obtener historial de aplicaciones por cotización
exports.getAplicacionesPorCotizacion = async (req, res) => {
  try {
    const { idCotizacion } = req.params;
    const { estado_aplicacion, fecha_desde, fecha_hasta, id_producto } = req.query;

    const filtros = {
      id_cotizacion: parseInt(idCotizacion)
    };

    if (estado_aplicacion) {
      filtros.estado_aplicacion = estado_aplicacion;
    }

    if (fecha_desde || fecha_hasta) {
      filtros.fecha_aplicacion = {};
      if (fecha_desde) filtros.fecha_aplicacion.gte = new Date(fecha_desde);
      if (fecha_hasta) filtros.fecha_aplicacion.lte = new Date(fecha_hasta);
    }

    if (id_producto) {
      filtros.id_producto = parseInt(id_producto);
    }

    const aplicaciones = await prisma.aplicacionDosis.findMany({
      where: filtros,
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
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fecha_aplicacion: 'desc'
      }
    });

    // Calcular estadísticas
    const totalAplicaciones = aplicaciones.length;
    const exitosas = aplicaciones.filter(a => a.estado_aplicacion === 'exitosa').length;
    const parciales = aplicaciones.filter(a => a.estado_aplicacion === 'parcial').length;
    const fallidas = aplicaciones.filter(a => a.estado_aplicacion === 'fallida').length;
    const totalDosisAplicadas = aplicaciones.reduce((sum, a) => sum + a.cantidad_aplicada, 0);

    res.json({
      aplicaciones: aplicaciones.map(app => ({
        id_aplicacion: app.id_aplicacion,
        numero_semana: app.calendario.numero_semana,
        fecha_programada: app.calendario.fecha_programada,
        fecha_aplicacion: app.fecha_aplicacion,
        producto: app.producto.nombre,
        cantidad_programada: app.calendario.cantidad_dosis,
        cantidad_aplicada: app.cantidad_aplicada,
        lote_producto: app.lote_producto,
        animal_identificacion: app.animal_identificacion,
        responsable_aplicacion: app.responsable_aplicacion,
        estado_aplicacion: app.estado_aplicacion,
        observaciones: app.observaciones,
        usuario_registro: app.usuario_creador ? `${app.usuario_creador.nombre} ${app.usuario_creador.apellido}` : 'Sistema'
      })),
      estadisticas: {
        total_aplicaciones: totalAplicaciones,
        exitosas,
        parciales,
        fallidas,
        total_dosis_aplicadas: totalDosisAplicadas,
        tasa_exito: totalAplicaciones > 0 ? ((exitosas / totalAplicaciones) * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('Error al obtener aplicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 3. Registrar retiro de campo
exports.registrarRetiro = async (req, res) => {
  try {
    const {
      id_cotizacion,
      id_producto,
      cantidad_retirada,
      fecha_retiro,
      motivo_retiro,
      descripcion_motivo,
      afecta_calendario = true,
      responsable_retiro,
      observaciones
    } = req.body;
    const idUsuario = req.user?.id_usuario;

    // Validaciones básicas
    if (!id_cotizacion || !id_producto || !cantidad_retirada || !fecha_retiro || !motivo_retiro) {
      return res.status(400).json({
        error: 'Campos obligatorios: id_cotizacion, id_producto, cantidad_retirada, fecha_retiro, motivo_retiro'
      });
    }

    // Verificar que existe la cotización y el producto
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id_cotizacion) }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const producto = await prisma.producto.findUnique({
      where: { id_producto: parseInt(id_producto) }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Registrar el retiro
    const retiro = await prisma.retiroCampo.create({
      data: {
        id_cotizacion: parseInt(id_cotizacion),
        id_producto: parseInt(id_producto),
        cantidad_retirada: parseInt(cantidad_retirada),
        fecha_retiro: new Date(fecha_retiro),
        motivo_retiro,
        descripcion_motivo,
        afecta_calendario,
        responsable_retiro,
        observaciones,
        created_by: idUsuario
      }
    });

    // Si afecta el calendario, marcar aplicaciones futuras como canceladas
    if (afecta_calendario) {
      const aplicacionesFuturas = await prisma.calendarioVacunacion.findMany({
        where: {
          id_cotizacion: parseInt(id_cotizacion),
          id_producto: parseInt(id_producto),
          fecha_programada: {
            gte: new Date(fecha_retiro)
          },
          estado_dosis: 'pendiente'
        }
      });

      let cantidadRestante = cantidad_retirada;
      for (const aplicacion of aplicacionesFuturas) {
        if (cantidadRestante <= 0) break;

        const cantidadACancelar = Math.min(cantidadRestante, aplicacion.cantidad_dosis);
        
        if (cantidadACancelar === aplicacion.cantidad_dosis) {
          // Cancelar aplicación completa
          await prisma.calendarioVacunacion.update({
            where: { id_calendario: aplicacion.id_calendario },
            data: { estado_dosis: 'cancelada' }
          });
        } else {
          // Reducir cantidad de aplicación
          await prisma.calendarioVacunacion.update({
            where: { id_calendario: aplicacion.id_calendario },
            data: { cantidad_dosis: aplicacion.cantidad_dosis - cantidadACancelar }
          });
        }

        cantidadRestante -= cantidadACancelar;
      }
    }

    // Liberar stock reservado si corresponde
    if (producto.requiere_control_stock) {
      await prisma.producto.update({
        where: { id_producto: parseInt(id_producto) },
        data: {
          stock_reservado: {
            decrement: Math.min(cantidad_retirada, producto.stock_reservado || 0)
          }
        }
      });

      // Registrar movimiento de stock
      await prisma.movimientoStock.create({
        data: {
          id_producto: parseInt(id_producto),
          tipo_movimiento: 'liberacion_reserva',
          cantidad: cantidad_retirada,
          stock_anterior: producto.stock || 0,
          stock_posterior: producto.stock || 0, // Stock total no cambia
          motivo: `Retiro de campo: ${motivo_retiro}`,
          observaciones: `Retiro ID: ${retiro.id_retiro}. ${descripcion_motivo || ''}`,
          id_cotizacion: parseInt(id_cotizacion),
          id_usuario: idUsuario
        }
      });
    }

    res.json({
      message: 'Retiro registrado exitosamente',
      retiro: retiro,
      calendario_afectado: afecta_calendario
    });

  } catch (error) {
    console.error('Error al registrar retiro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 4. Obtener reporte de cumplimiento
exports.getReporteCumplimiento = async (req, res) => {
  try {
    const { idCotizacion } = req.params;
    const { fecha_evaluacion } = req.query;

    const fechaEval = fecha_evaluacion ? new Date(fecha_evaluacion) : new Date();
    
    const cumplimiento = await calcularCumplimiento(parseInt(idCotizacion), fechaEval);

    // Obtener detalle de aplicaciones pendientes
    const aplicacionesPendientes = await prisma.calendarioVacunacion.findMany({
      where: {
        id_cotizacion: parseInt(idCotizacion),
        estado_dosis: 'pendiente',
        fecha_programada: {
          lte: fechaEval
        }
      },
      include: {
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

    // Obtener últimas aplicaciones realizadas
    const ultimasAplicaciones = await prisma.aplicacionDosis.findMany({
      where: {
        id_cotizacion: parseInt(idCotizacion)
      },
      include: {
        producto: {
          select: {
            nombre: true
          }
        },
        calendario: {
          select: {
            numero_semana: true,
            fecha_programada: true
          }
        }
      },
      orderBy: {
        fecha_aplicacion: 'desc'
      },
      take: 5
    });

    res.json({
      cumplimiento: {
        ...cumplimiento,
        fecha_evaluacion: fechaEval
      },
      aplicaciones_pendientes: aplicacionesPendientes.map(app => ({
        id_calendario: app.id_calendario,
        numero_semana: app.numero_semana,
        producto: app.producto.nombre,
        cantidad_dosis: app.cantidad_dosis,
        fecha_programada: app.fecha_programada,
        dias_vencida: Math.max(0, Math.floor((fechaEval - new Date(app.fecha_programada)) / (1000 * 60 * 60 * 24)))
      })),
      ultimas_aplicaciones: ultimasAplicaciones.map(app => ({
        id_aplicacion: app.id_aplicacion,
        numero_semana: app.calendario.numero_semana,
        producto: app.producto.nombre,
        cantidad_aplicada: app.cantidad_aplicada,
        fecha_programada: app.calendario.fecha_programada,
        fecha_aplicacion: app.fecha_aplicacion,
        dias_atraso: Math.max(0, Math.floor((new Date(app.fecha_aplicacion) - new Date(app.calendario.fecha_programada)) / (1000 * 60 * 60 * 24)))
      }))
    });

  } catch (error) {
    console.error('Error al obtener reporte de cumplimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 5. Evaluar y actualizar cumplimiento
exports.evaluarCumplimiento = async (req, res) => {
  try {
    const { id_cotizacion, fecha_evaluacion, observaciones } = req.body;

    const fechaEval = fecha_evaluacion ? new Date(fecha_evaluacion) : new Date();
    const cumplimiento = await calcularCumplimiento(id_cotizacion, fechaEval);

    // Buscar evaluación existente para la fecha
    const evaluacionExistente = await prisma.seguimientoCumplimiento.findFirst({
      where: {
        id_cotizacion: id_cotizacion,
        fecha_evaluacion: fechaEval
      }
    });

    let seguimiento;
    if (evaluacionExistente) {
      // Actualizar evaluación existente
      seguimiento = await prisma.seguimientoCumplimiento.update({
        where: { id_seguimiento: evaluacionExistente.id_seguimiento },
        data: {
          total_dosis_programadas: cumplimiento.totalProgramadas,
          total_dosis_aplicadas: cumplimiento.totalAplicadas,
          porcentaje_cumplimiento: cumplimiento.porcentajeCumplimiento,
          dias_atraso_promedio: cumplimiento.diasAtrasoPromedio,
          productos_pendientes: cumplimiento.aplicacionesPendientes,
          estado_general: cumplimiento.estadoGeneral,
          observaciones: observaciones || evaluacionExistente.observaciones,
          updated_at: new Date()
        }
      });
    } else {
      // Crear nueva evaluación
      seguimiento = await prisma.seguimientoCumplimiento.create({
        data: {
          id_cotizacion: id_cotizacion,
          fecha_evaluacion: fechaEval,
          total_dosis_programadas: cumplimiento.totalProgramadas,
          total_dosis_aplicadas: cumplimiento.totalAplicadas,
          porcentaje_cumplimiento: cumplimiento.porcentajeCumplimiento,
          dias_atraso_promedio: cumplimiento.diasAtrasoPromedio,
          productos_pendientes: cumplimiento.aplicacionesPendientes,
          estado_general: cumplimiento.estadoGeneral,
          observaciones
        }
      });
    }

    res.json({
      message: 'Evaluación de cumplimiento actualizada',
      seguimiento: seguimiento,
      resumen_cumplimiento: cumplimiento
    });

  } catch (error) {
    console.error('Error al evaluar cumplimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 6. Obtener notificaciones pendientes
exports.getNotificacionesPendientes = async (req, res) => {
  try {
    const { tipo_notificacion, id_cotizacion, limit = 50 } = req.query;

    const filtros = {
      estado_notificacion: 'pendiente'
    };

    if (tipo_notificacion) {
      filtros.tipo_notificacion = tipo_notificacion;
    }

    if (id_cotizacion) {
      filtros.id_cotizacion = parseInt(id_cotizacion);
    }

    const notificaciones = await prisma.notificacionAutomatica.findMany({
      where: filtros,
      include: {
        cotizacion: {
          include: {
            cliente: {
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
        },
        calendario: {
          select: {
            numero_semana: true,
            fecha_programada: true
          }
        }
      },
      orderBy: {
        fecha_programada: 'asc'
      },
      take: parseInt(limit)
    });

    res.json({
      notificaciones: notificaciones.map(notif => ({
        id_notificacion: notif.id_notificacion,
        tipo_notificacion: notif.tipo_notificacion,
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        fecha_programada: notif.fecha_programada,
        cliente: notif.cotizacion.cliente.nombre,
        producto: notif.producto?.nombre,
        numero_semana: notif.calendario?.numero_semana,
        fecha_aplicacion_programada: notif.calendario?.fecha_programada,
        canal_envio: notif.canal_envio,
        destinatarios: notif.destinatarios
      })),
      total: notificaciones.length
    });

  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 7. Marcar notificación como leída
exports.marcarNotificacionLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const notificacion = await prisma.notificacionAutomatica.update({
      where: { id_notificacion: parseInt(id) },
      data: {
        estado_notificacion: 'leida',
        fecha_enviada: new Date()
      }
    });

    res.json({
      message: 'Notificación marcada como leída',
      notificacion
    });

  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 8. Dashboard de seguimiento por cotización
exports.getDashboardSeguimiento = async (req, res) => {
  try {
    const { idCotizacion } = req.params;

    // Obtener información general de la cotización
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(idCotizacion) },
      include: {
        cliente: true,
        plan_vacunal: true
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Calcular cumplimiento actual
    const cumplimiento = await calcularCumplimiento(parseInt(idCotizacion));

    // Obtener estadísticas de aplicaciones
    const totalAplicaciones = await prisma.aplicacionDosis.count({
      where: { id_cotizacion: parseInt(idCotizacion) }
    });

    const aplicacionesExitosas = await prisma.aplicacionDosis.count({
      where: { 
        id_cotizacion: parseInt(idCotizacion),
        estado_aplicacion: 'exitosa'
      }
    });

    // Obtener retiros de campo
    const totalRetiros = await prisma.retiroCampo.count({
      where: { id_cotizacion: parseInt(idCotizacion) }
    });

    const cantidadTotalRetirada = await prisma.retiroCampo.aggregate({
      where: { id_cotizacion: parseInt(idCotizacion) },
      _sum: {
        cantidad_retirada: true
      }
    });

    // Obtener notificaciones pendientes
    const notificacionesPendientes = await prisma.notificacionAutomatica.count({
      where: {
        id_cotizacion: parseInt(idCotizacion),
        estado_notificacion: 'pendiente'
      }
    });

    // Próximas aplicaciones (siguientes 7 días)
    const ahora = new Date();
    const sieteDiasDespues = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));

    const proximasAplicaciones = await prisma.calendarioVacunacion.findMany({
      where: {
        id_cotizacion: parseInt(idCotizacion),
        fecha_programada: {
          gte: ahora,
          lte: sieteDiasDespues
        },
        estado_dosis: 'pendiente'
      },
      include: {
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

    res.json({
      cotizacion: {
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
        cliente: cotizacion.cliente.nombre,
        plan_vacunal: cotizacion.plan_vacunal.nombre,
        fecha_inicio: cotizacion.fecha_inicio_plan,
        estado: cotizacion.estado
      },
      cumplimiento_general: cumplimiento,
      estadisticas: {
        total_aplicaciones: totalAplicaciones,
        aplicaciones_exitosas: aplicacionesExitosas,
        tasa_exito: totalAplicaciones > 0 ? ((aplicacionesExitosas / totalAplicaciones) * 100).toFixed(2) : 0,
        total_retiros: totalRetiros,
        cantidad_total_retirada: cantidadTotalRetirada._sum.cantidad_retirada || 0,
        notificaciones_pendientes: notificacionesPendientes
      },
      proximas_aplicaciones: proximasAplicaciones.map(app => ({
        id_calendario: app.id_calendario,
        numero_semana: app.numero_semana,
        producto: app.producto.nombre,
        cantidad_dosis: app.cantidad_dosis,
        fecha_programada: app.fecha_programada,
        dias_hasta_aplicacion: Math.floor((new Date(app.fecha_programada) - ahora) / (1000 * 60 * 60 * 24))
      }))
    });

  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 9. Generar notificaciones automáticas (tarea programada)
exports.generarNotificaciones = async (req, res) => {
  try {
    const resultado = await generarNotificacionesAutomaticas();
    
    res.json({
      message: 'Notificaciones generadas exitosamente',
      resultado
    });

  } catch (error) {
    console.error('Error al generar notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 10. Obtener retiros por cotización
exports.getRetirosPorCotizacion = async (req, res) => {
  try {
    const { idCotizacion } = req.params;
    const { motivo_retiro, fecha_desde, fecha_hasta } = req.query;

    const filtros = {
      id_cotizacion: parseInt(idCotizacion)
    };

    if (motivo_retiro) {
      filtros.motivo_retiro = motivo_retiro;
    }

    if (fecha_desde || fecha_hasta) {
      filtros.fecha_retiro = {};
      if (fecha_desde) filtros.fecha_retiro.gte = new Date(fecha_desde);
      if (fecha_hasta) filtros.fecha_retiro.lte = new Date(fecha_hasta);
    }

    const retiros = await prisma.retiroCampo.findMany({
      where: filtros,
      include: {
        producto: {
          select: {
            nombre: true,
            descripcion: true
          }
        },
        usuario_creador: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fecha_retiro: 'desc'
      }
    });

    // Calcular estadísticas
    const totalRetiros = retiros.length;
    const cantidadTotalRetirada = retiros.reduce((sum, r) => sum + r.cantidad_retirada, 0);
    
    const retirosPorMotivo = retiros.reduce((acc, retiro) => {
      acc[retiro.motivo_retiro] = (acc[retiro.motivo_retiro] || 0) + 1;
      return acc;
    }, {});

    res.json({
      retiros: retiros.map(retiro => ({
        id_retiro: retiro.id_retiro,
        producto: retiro.producto.nombre,
        cantidad_retirada: retiro.cantidad_retirada,
        fecha_retiro: retiro.fecha_retiro,
        motivo_retiro: retiro.motivo_retiro,
        descripcion_motivo: retiro.descripcion_motivo,
        afecta_calendario: retiro.afecta_calendario,
        responsable_retiro: retiro.responsable_retiro,
        observaciones: retiro.observaciones,
        usuario_registro: retiro.usuario_creador ? `${retiro.usuario_creador.nombre} ${retiro.usuario_creador.apellido}` : 'Sistema'
      })),
      estadisticas: {
        total_retiros: totalRetiros,
        cantidad_total_retirada: cantidadTotalRetirada,
        retiros_por_motivo: retirosPorMotivo
      }
    });

  } catch (error) {
    console.error('Error al obtener retiros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
