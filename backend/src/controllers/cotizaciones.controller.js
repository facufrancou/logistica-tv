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

// Función para generar calendario con vacunas (ÚNICA FUNCIÓN DE CALENDARIO)
async function generarCalendarioVacunacionVacunas(cotizacionId, fechaInicio, vacunasDelPlan, cantidadAnimales, tx = prisma) {
  const calendarioMap = new Map(); // Usar Map para agrupar por vacuna+semana

  for (const planVacuna of vacunasDelPlan) {
    const semanaInicio = planVacuna.semana_inicio;
    const semanaFin = planVacuna.semana_fin || semanaInicio;
    
    // Calcular dosis reales: 1 dosis por animal en total (no por semana)
    const dosisRealesTotal = cantidadAnimales; // 1 dosis por animal
    
    console.log(`Generando calendario - Vacuna: ${planVacuna.vacuna?.nombre || 'N/A'}, Semana: ${semanaInicio}-${semanaFin}, Animales: ${cantidadAnimales}, Dosis Totales: ${dosisRealesTotal}`);

    // Para cada semana en el rango, crear entrada de aplicación de vacuna
    for (let semana = semanaInicio; semana <= semanaFin; semana++) {
      const fechaProgramada = calcularFechaProgramada(fechaInicio, semana);
      const clave = `${planVacuna.id_vacuna}-${semana}`;
      
      // Buscar stock disponible con lógica FIFO y validación de vencimiento
      const stockAsignado = await asignarStockFIFO(
        planVacuna.id_vacuna, 
        dosisRealesTotal, 
        fechaProgramada, 
        tx
      );

      if (calendarioMap.has(clave)) {
        const itemExistente = calendarioMap.get(clave);
        itemExistente.cantidad_dosis += dosisRealesTotal;
        if (stockAsignado) {
          // Si hay nuevo stock asignado, actualizar información
          itemExistente.id_stock_vacuna = stockAsignado.id_stock_vacuna;
          itemExistente.lote_asignado = stockAsignado.lote;
          itemExistente.fecha_vencimiento_lote = stockAsignado.fecha_vencimiento;
        }
      } else {
        calendarioMap.set(clave, {
          id_cotizacion: cotizacionId,
          id_producto: planVacuna.id_vacuna,
          id_stock_vacuna: stockAsignado?.id_stock_vacuna || null,
          numero_semana: semana,
          fecha_programada: fechaProgramada,
          cantidad_dosis: dosisRealesTotal,
          lote_asignado: stockAsignado?.lote || null,
          fecha_vencimiento_lote: stockAsignado?.fecha_vencimiento || null,
          estado_dosis: 'pendiente'
        });
      }
    }
  }

  const calendarioItems = Array.from(calendarioMap.values());

  if (calendarioItems.length > 0) {
    await tx.calendarioVacunacion.createMany({
      data: calendarioItems
    });
  }

  return calendarioItems;
}

// Nueva función para asignar stock con lógica FIFO
async function asignarStockFIFO(idVacuna, cantidadRequerida, fechaAplicacion, tx = prisma) {
  try {
    // Buscar stock disponible para la vacuna, ordenado por fecha de vencimiento (FIFO)
    // Solo incluir lotes que no venzan antes de la fecha de aplicación
    const stocksDisponibles = await tx.stockVacuna.findMany({
      where: {
        id_vacuna: idVacuna,
        estado_stock: 'disponible',
        stock_actual: {
          gt: 0
        },
        fecha_vencimiento: {
          gte: fechaAplicacion // Solo lotes que no venzan antes de la aplicación
        }
      },
      orderBy: {
        fecha_vencimiento: 'asc' // FIFO: los que vencen primero
      }
    });

    if (stocksDisponibles.length === 0) {
      console.warn(`No hay stock disponible para vacuna ${idVacuna} con vencimiento posterior a ${fechaAplicacion}`);
      return null;
    }

    // Buscar el primer lote que tenga suficiente stock
    for (const stock of stocksDisponibles) {
      if (stock.stock_actual >= cantidadRequerida) {
        // Este lote tiene suficiente stock, reservarlo
        await tx.stockVacuna.update({
          where: { id_stock_vacuna: stock.id_stock_vacuna },
          data: {
            stock_reservado: {
              increment: cantidadRequerida
            },
            stock_actual: {
              decrement: cantidadRequerida
            }
          }
        });

        // Registrar el movimiento de stock
        await tx.movimientoStockVacuna.create({
          data: {
            id_stock_vacuna: stock.id_stock_vacuna,
            tipo_movimiento: 'reserva',
            cantidad: cantidadRequerida,
            stock_anterior: stock.stock_actual,
            stock_posterior: stock.stock_actual - cantidadRequerida,
            motivo: `Reserva automática para cotización - aplicación programada`,
            observaciones: `Asignación FIFO para aplicación del ${fechaAplicacion.toISOString().split('T')[0]}`
          }
        });

        console.log(`Stock asignado: Lote ${stock.lote}, ${cantidadRequerida} dosis, vence ${stock.fecha_vencimiento}`);
        
        return {
          id_stock_vacuna: stock.id_stock_vacuna,
          lote: stock.lote,
          fecha_vencimiento: stock.fecha_vencimiento,
          cantidad_asignada: cantidadRequerida
        };
      }
    }

    // Si llegamos aquí, ningún lote individual tiene suficiente stock
    // Podríamos implementar lógica para usar múltiples lotes, pero por simplicidad
    // retornamos el primer lote disponible con una advertencia
    const primerStock = stocksDisponibles[0];
    const cantidadDisponible = primerStock.stock_actual;
    
    if (cantidadDisponible > 0) {
      // Reservar lo que esté disponible
      await tx.stockVacuna.update({
        where: { id_stock_vacuna: primerStock.id_stock_vacuna },
        data: {
          stock_reservado: {
            increment: cantidadDisponible
          },
          stock_actual: 0
        }
      });

      // Registrar el movimiento de stock
      await tx.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: primerStock.id_stock_vacuna,
          tipo_movimiento: 'reserva',
          cantidad: cantidadDisponible,
          stock_anterior: primerStock.stock_actual,
          stock_posterior: 0,
          motivo: `Reserva parcial para cotización - stock insuficiente`,
          observaciones: `ADVERTENCIA: Se requieren ${cantidadRequerida} dosis pero solo hay ${cantidadDisponible} disponibles en lote ${primerStock.lote}`
        }
      });

      console.warn(`Stock parcial asignado: Lote ${primerStock.lote}, ${cantidadDisponible}/${cantidadRequerida} dosis`);
      
      return {
        id_stock_vacuna: primerStock.id_stock_vacuna,
        lote: primerStock.lote,
        fecha_vencimiento: primerStock.fecha_vencimiento,
        cantidad_asignada: cantidadDisponible,
        cantidad_faltante: cantidadRequerida - cantidadDisponible
      };
    }

    return null;
  } catch (error) {
    console.error('Error al asignar stock FIFO:', error);
    return null;
  }
}

// Nueva función para asignar lote manualmente a un elemento del calendario
async function asignarLoteManual(idCalendario, idStockVacuna, cantidadAsignar, idUsuario = null) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Obtener el elemento del calendario
      const calendarioItem = await tx.calendarioVacunacion.findUnique({
        where: { id_calendario: idCalendario },
        include: { stock_vacuna: true }
      });

      if (!calendarioItem) {
        throw new Error('Elemento del calendario no encontrado');
      }

      // Obtener información del nuevo stock
      const nuevoStock = await tx.stockVacuna.findUnique({
        where: { id_stock_vacuna: idStockVacuna }
      });

      if (!nuevoStock) {
        throw new Error('Stock de vacuna no encontrado');
      }

      // Validar que el stock tenga cantidad suficiente
      if (nuevoStock.stock_actual < cantidadAsignar) {
        throw new Error(`Stock insuficiente. Disponible: ${nuevoStock.stock_actual}, Requerido: ${cantidadAsignar}`);
      }

      // Validar que la fecha de vencimiento sea posterior a la fecha de aplicación
      if (nuevoStock.fecha_vencimiento < calendarioItem.fecha_programada) {
        throw new Error('El lote seleccionado vence antes de la fecha de aplicación');
      }

      // Si ya había un lote asignado, liberar esa reserva
      if (calendarioItem.id_stock_vacuna) {
        await liberarReservaStock(calendarioItem.id_stock_vacuna, calendarioItem.cantidad_dosis, tx);
      }

      // Asignar nuevo stock (solo incrementar reserva, NO decrementar stock_actual)
      await tx.stockVacuna.update({
        where: { id_stock_vacuna: idStockVacuna },
        data: {
          stock_reservado: { increment: cantidadAsignar }
        }
      });

      // Actualizar el calendario
      await tx.calendarioVacunacion.update({
        where: { id_calendario: idCalendario },
        data: {
          id_stock_vacuna: idStockVacuna,
          lote_asignado: nuevoStock.lote,
          fecha_vencimiento_lote: nuevoStock.fecha_vencimiento
        }
      });

      // Registrar movimiento
      await tx.movimientoStockVacuna.create({
        data: {
          id_stock_vacuna: idStockVacuna,
          tipo_movimiento: 'reserva',
          cantidad: cantidadAsignar,
          stock_anterior: nuevoStock.stock_actual,
          stock_posterior: nuevoStock.stock_actual - cantidadAsignar,
          motivo: 'Asignación manual de lote',
          observaciones: `Asignado manualmente al calendario ID: ${idCalendario}`,
          id_calendario: idCalendario,
          id_usuario: idUsuario
        }
      });

      return {
        success: true,
        lote_asignado: nuevoStock.lote,
        fecha_vencimiento: nuevoStock.fecha_vencimiento
      };
    });
  } catch (error) {
    console.error('Error en asignación manual de lote:', error);
    throw error;
  }
}

// Función para liberar reserva de stock
async function liberarReservaStock(idStockVacuna, cantidad, tx = prisma) {
  // Solo decrementar la reserva, NO incrementar stock_actual
  await tx.stockVacuna.update({
    where: { id_stock_vacuna: idStockVacuna },
    data: {
      stock_reservado: { decrement: cantidad }
    }
  });

  await tx.movimientoStockVacuna.create({
    data: {
      id_stock_vacuna: idStockVacuna,
      tipo_movimiento: 'liberacion_reserva',
      cantidad: cantidad,
      stock_anterior: 0, // Se actualizará con el valor real
      stock_posterior: 0, // Se actualizará con el valor real
      motivo: 'Liberación de reserva para reasignación',
      observaciones: 'Stock liberado automáticamente'
    }
  });
}

// Función para reasignar automáticamente cuando el stock original no está disponible
async function reasignarLoteAutomatico(idCalendario, idUsuario = null) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Obtener el elemento del calendario
      const calendarioItem = await tx.calendarioVacunacion.findUnique({
        where: { id_calendario: idCalendario },
        include: { stock_vacuna: true }
      });

      if (!calendarioItem) {
        throw new Error('Elemento del calendario no encontrado');
      }

      // Verificar si el stock actual sigue siendo válido
      const stockActual = calendarioItem.stock_vacuna;
      const necesitaReasignacion = !stockActual || 
        stockActual.stock_actual + stockActual.stock_reservado < calendarioItem.cantidad_dosis ||
        stockActual.fecha_vencimiento < calendarioItem.fecha_programada ||
        stockActual.estado_stock !== 'disponible';

      if (!necesitaReasignacion) {
        return { success: true, reasignado: false, mensaje: 'El lote actual sigue siendo válido' };
      }

      // Liberar reserva del stock actual si existe
      if (calendarioItem.id_stock_vacuna && stockActual) {
        await liberarReservaStock(calendarioItem.id_stock_vacuna, calendarioItem.cantidad_dosis, tx);
      }

      // Buscar nuevo stock con lógica FIFO
      const nuevoStockAsignado = await asignarStockFIFO(
        calendarioItem.id_producto,
        calendarioItem.cantidad_dosis,
        calendarioItem.fecha_programada,
        tx
      );

      if (!nuevoStockAsignado) {
        // No hay stock disponible, limpiar asignación
        await tx.calendarioVacunacion.update({
          where: { id_calendario: idCalendario },
          data: {
            id_stock_vacuna: null,
            lote_asignado: null,
            fecha_vencimiento_lote: null
          }
        });

        return { 
          success: false, 
          reasignado: false, 
          error: 'No hay stock disponible para reasignar',
          requiere_atencion: true 
        };
      }

      // Actualizar el calendario con el nuevo lote
      await tx.calendarioVacunacion.update({
        where: { id_calendario: idCalendario },
        data: {
          id_stock_vacuna: nuevoStockAsignado.id_stock_vacuna,
          lote_asignado: nuevoStockAsignado.lote,
          fecha_vencimiento_lote: nuevoStockAsignado.fecha_vencimiento
        }
      });

      return {
        success: true,
        reasignado: true,
        lote_anterior: stockActual?.lote || 'No asignado',
        lote_nuevo: nuevoStockAsignado.lote,
        fecha_vencimiento: nuevoStockAsignado.fecha_vencimiento
      };
    });
  } catch (error) {
    console.error('Error en reasignación automática:', error);
    return { success: false, error: error.message };
  }
}

// Función para asignar múltiples lotes cuando un solo lote no es suficiente
async function asignarMultiplesLotes(idCalendario, idUsuario = null) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Obtener el elemento del calendario
      const calendarioItem = await tx.calendarioVacunacion.findUnique({
        where: { id_calendario: idCalendario }
      });

      if (!calendarioItem) {
        throw new Error('Elemento del calendario no encontrado');
      }

      let cantidadRestante = calendarioItem.cantidad_dosis;
      const lotesAsignados = [];

      // Buscar todos los stocks disponibles para esta vacuna
      const stocksDisponibles = await tx.stockVacuna.findMany({
        where: {
          id_vacuna: calendarioItem.id_producto,
          estado_stock: 'disponible',
          stock_actual: { gt: 0 },
          fecha_vencimiento: { gte: calendarioItem.fecha_programada }
        },
        orderBy: { fecha_vencimiento: 'asc' }
      });

      if (stocksDisponibles.length === 0) {
        throw new Error('No hay stock disponible para asignar');
      }

      // Asignar stock de cada lote disponible hasta completar la cantidad
      for (const stock of stocksDisponibles) {
        if (cantidadRestante <= 0) break;

        const cantidadDelLote = Math.min(stock.stock_actual, cantidadRestante);

        // Reservar stock de este lote (solo incrementar reserva, NO decrementar stock_actual)
        await tx.stockVacuna.update({
          where: { id_stock_vacuna: stock.id_stock_vacuna },
          data: {
            stock_reservado: { increment: cantidadDelLote }
          }
        });

        // Registrar movimiento
        await tx.movimientoStockVacuna.create({
          data: {
            id_stock_vacuna: stock.id_stock_vacuna,
            tipo_movimiento: 'reserva',
            cantidad: cantidadDelLote,
            stock_anterior: stock.stock_actual,
            stock_posterior: stock.stock_actual - cantidadDelLote,
            motivo: 'Asignación multi-lote',
            observaciones: `Parte ${lotesAsignados.length + 1} de asignación múltiple para calendario ID: ${idCalendario}`,
            id_calendario: idCalendario,
            id_usuario: idUsuario
          }
        });

        lotesAsignados.push({
          id_stock_vacuna: stock.id_stock_vacuna,
          lote: stock.lote,
          cantidad: cantidadDelLote,
          fecha_vencimiento: stock.fecha_vencimiento
        });

        cantidadRestante -= cantidadDelLote;
      }

      // Verificar si se pudo asignar toda la cantidad
      if (cantidadRestante > 0) {
        // Revertir todas las asignaciones realizadas
        for (const lote of lotesAsignados) {
          await tx.stockVacuna.update({
            where: { id_stock_vacuna: lote.id_stock_vacuna },
            data: {
              stock_actual: { increment: lote.cantidad },
              stock_reservado: { decrement: lote.cantidad }
            }
          });
        }
        throw new Error(`Stock insuficiente. Faltan ${cantidadRestante} dosis`);
      }

      // Actualizar el calendario con el lote principal (el primero)
      const lotePrincipal = lotesAsignados[0];
      await tx.calendarioVacunacion.update({
        where: { id_calendario: idCalendario },
        data: {
          id_stock_vacuna: lotePrincipal.id_stock_vacuna,
          lote_asignado: `${lotePrincipal.lote}${lotesAsignados.length > 1 ? ` +${lotesAsignados.length - 1} más` : ''}`,
          fecha_vencimiento_lote: lotePrincipal.fecha_vencimiento
        }
      });

      return {
        success: true,
        lotes_asignados: lotesAsignados,
        cantidad_total: calendarioItem.cantidad_dosis,
        lotes_utilizados: lotesAsignados.length
      };
    });
  } catch (error) {
    console.error('Error en asignación múltiple de lotes:', error);
    throw error;
  }
}

async function registrarMovimientoStockVacunaEspecifico(
  idStockVacuna, 
  tipoMovimiento, 
  cantidad, 
  motivo, 
  observaciones = null, 
  idCotizacion = null,
  idCalendario = null,
  idUsuario = null
) {
  const stockVacuna = await prisma.stockVacuna.findUnique({
    where: { id_stock_vacuna: idStockVacuna }
  });

  if (!stockVacuna) {
    throw new Error('Stock de vacuna específico no encontrado');
  }

  const stockAnterior = stockVacuna.stock_actual || 0;
  let stockPosterior = stockAnterior;

  // Calcular nuevo stock según tipo de movimiento
  switch (tipoMovimiento) {
    case 'reserva':
      stockPosterior = Math.max(0, stockAnterior - cantidad);
      await prisma.stockVacuna.update({
        where: { id_stock_vacuna: idStockVacuna },
        data: {
          stock_actual: stockPosterior,
          stock_reservado: {
            increment: cantidad
          }
        }
      });
      break;
    case 'liberacion_reserva':
      stockPosterior = stockAnterior + cantidad;
      await prisma.stockVacuna.update({
        where: { id_stock_vacuna: idStockVacuna },
        data: {
          stock_actual: stockPosterior,
          stock_reservado: {
            decrement: cantidad
          }
        }
      });
      break;
    case 'egreso':
      await prisma.stockVacuna.update({
        where: { id_stock_vacuna: idStockVacuna },
        data: {
          stock_reservado: {
            decrement: cantidad
          }
        }
      });
      stockPosterior = stockAnterior; // El stock actual ya fue decrementado en la reserva
      break;
  }

  // Registrar movimiento en historial de vacunas
  const movimiento = await prisma.movimientoStockVacuna.create({
    data: {
      id_stock_vacuna: idStockVacuna,
      tipo_movimiento: tipoMovimiento,
      cantidad: cantidad,
      stock_anterior: stockAnterior,
      stock_posterior: stockPosterior,
      motivo: motivo,
      observaciones: observaciones,
      id_cotizacion: idCotizacion,
      id_calendario: idCalendario,
      id_usuario: idUsuario
    }
  });

  return movimiento;
}

async function registrarMovimientoStockVacuna(
  idVacuna, 
  tipoMovimiento, 
  cantidad, 
  motivo, 
  observaciones = null, 
  idCotizacion = null, 
  idUsuario = null
) {
  const stockVacuna = await prisma.stockVacuna.findUnique({
    where: { id_vacuna: idVacuna }
  });

  if (!stockVacuna) {
    throw new Error('Stock de vacuna no encontrado');
  }

  const stockAnterior = stockVacuna.stock_actual || 0;
  let stockPosterior = stockAnterior;

  // Calcular nuevo stock según tipo de movimiento
  switch (tipoMovimiento) {
    case 'reserva':
      // Para reservas, solo actualizamos el stock reservado, no el stock total
      const nuevoStockReservado = Math.max(0, (stockVacuna.stock_reservado || 0) + cantidad);
      
      await prisma.stockVacuna.update({
        where: { id_vacuna: idVacuna },
        data: {
          stock_reservado: nuevoStockReservado,
          fecha_actualizacion: new Date()
        }
      });

      stockPosterior = stockAnterior; // El stock total no cambia
      break;
    case 'liberacion_reserva':
      const stockReservadoReducido = Math.max(0, (stockVacuna.stock_reservado || 0) - cantidad);
      
      await prisma.stockVacuna.update({
        where: { id_vacuna: idVacuna },
        data: {
          stock_reservado: stockReservadoReducido,
          fecha_actualizacion: new Date()
        }
      });

      stockPosterior = stockAnterior; // El stock total no cambia
      break;
  }

  // Registrar movimiento en historial de vacunas
  const movimiento = await prisma.historialStockVacuna.create({
    data: {
      id_vacuna: idVacuna,
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

async function reservarStockParaCotizacion(cotizacionId, vacunasDelPlan, idUsuario) {
  const reservasCreadas = [];

  for (const planVacuna of vacunasDelPlan) {
    // Buscar stocks disponibles para esta vacuna específica
    const stocksVacuna = await prisma.stockVacuna.findMany({
      where: {
        id_vacuna: planVacuna.id_vacuna,
        estado_stock: 'disponible'
      },
      orderBy: {
        fecha_vencimiento: 'asc' // FIFO: ordenar por fecha de vencimiento
      }
    });

    if (stocksVacuna.length > 0) {
      // cantidad_total son FRASCOS, necesitamos convertir a dosis
      const dosisPorFrasco = planVacuna.vacuna?.presentacion?.dosis_por_frasco || 1000;
      const totalDosisRequeridas = planVacuna.cantidad_total * dosisPorFrasco;
      
      // Calcular stock total disponible
      const stockTotalDisponible = stocksVacuna.reduce((total, stock) => {
        return total + ((stock.stock_actual || 0) - (stock.stock_reservado || 0));
      }, 0);
      
      console.log(`Reservando stock - Vacuna: ${planVacuna.vacuna.nombre}, Disponible: ${stockTotalDisponible}, Requerido: ${totalDosisRequeridas}`);
      
      if (stockTotalDisponible >= totalDosisRequeridas) {
        // Reservar stock usando el primer lote disponible (FIFO)
        let dosisRestantes = totalDosisRequeridas;
        
        for (const stock of stocksVacuna) {
          if (dosisRestantes <= 0) break;
          
          const stockDisponibleEnLote = (stock.stock_actual || 0) - (stock.stock_reservado || 0);
          if (stockDisponibleEnLote > 0) {
            const dosisAReservar = Math.min(dosisRestantes, stockDisponibleEnLote);
            
            // Actualizar stock reservado en el lote
            await prisma.stockVacuna.update({
              where: { id_stock_vacuna: stock.id_stock_vacuna },
              data: {
                stock_reservado: {
                  increment: dosisAReservar
                }
              }
            });
            
            dosisRestantes -= dosisAReservar;
            
            console.log(`  ✓ Reservado en lote ${stock.lote}: ${dosisAReservar} dosis (${dosisRestantes} restantes)`);
          }
        }
        
        // Como no tenemos tabla ReservaStockVacuna, crear una reserva en el sistema de productos
        // Esto es un workaround temporal hasta que se implemente la tabla correcta
        console.log(`✓ Stock reservado para ${planVacuna.vacuna.nombre}: ${totalDosisRequeridas} dosis`);
        
        reservasCreadas.push({
          id_vacuna: planVacuna.id_vacuna,
          cantidad_reservada: totalDosisRequeridas,
          nombre_vacuna: planVacuna.vacuna.nombre
        });
      } else {
        throw new Error(`Stock insuficiente para ${planVacuna.vacuna.nombre}. Disponible: ${stockTotalDisponible}, requerido: ${totalDosisRequeridas} dosis`);
      }
    } else {
      throw new Error(`No hay stock disponible para la vacuna: ${planVacuna.vacuna.nombre}`);
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
        detalle_cotizacion: true // Sin include de producto para manejar híbrido
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Formatear respuesta con lógica híbrida
    const cotizacionesFormatted = await Promise.all(
      cotizaciones.map(async (cotizacion) => {
        // Procesar detalle con lógica de solo vacunas
        const productosHibridos = await Promise.all(
          cotizacion.detalle_cotizacion.map(async (dc) => {
            // Buscar solo en vacunas
            const vacuna = await prisma.vacuna.findUnique({
              where: { id_vacuna: dc.id_producto },
              select: { nombre: true, detalle: true }
            });

            const nombreItem = vacuna ? vacuna.nombre : 'Vacuna no encontrada';

            return {
              id_producto: Number(dc.id_producto),
              nombre_producto: nombreItem,
              cantidad_total: dc.cantidad_total,
              precio_unitario: parseFloat(dc.precio_unitario),
              subtotal: parseFloat(dc.subtotal),
              semana_inicio: Number(dc.semana_inicio),
              semana_fin: dc.semana_fin ? Number(dc.semana_fin) : null
            };
          })
        );

        return {
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
          productos: productosHibridos
        };
      })
    );

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

    // Obtener cotización sin include de producto en detalle (para manejar híbrido)
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        cliente: true,
        plan: {
          include: {
            vacunas_plan: {
              include: {
                vacuna: true
              }
            }
          }
        },
        lista_precio: true,
        detalle_cotizacion: true, // Sin include para manejarlo manualmente
        calendario_vacunacion: {
          orderBy: [
            { numero_semana: 'asc' },
            { id_producto: 'asc' }
          ]
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Procesar detalle con lógica de solo vacunas
    const detalleCompleto = await Promise.all(
      cotizacion.detalle_cotizacion.map(async (dc) => {
        // Buscar solo en vacunas
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: dc.id_producto }
        });

        if (vacuna) {
          // Es una vacuna
          return {
            id_producto: Number(dc.id_producto),
            id_vacuna: Number(dc.id_producto),
            tipo: 'vacuna',
            nombre_producto: vacuna.nombre,
            descripcion_producto: vacuna.detalle || vacuna.descripcion || '',
            cantidad_total: dc.cantidad_total,
            precio_unitario: parseFloat(dc.precio_unitario),
            subtotal: parseFloat(dc.subtotal),
            semana_inicio: Number(dc.semana_inicio),
            semana_fin: dc.semana_fin ? Number(dc.semana_fin) : null,
            dosis_por_semana: dc.dosis_por_semana
          };
        } else {
          // No encontrado - datos por defecto
          return {
            id_producto: Number(dc.id_producto),
            tipo: 'no_encontrado',
            nombre_producto: 'Vacuna no encontrada',
            descripcion_producto: 'Vacuna eliminada o no encontrada',
            cantidad_total: dc.cantidad_total,
            precio_unitario: parseFloat(dc.precio_unitario),
            subtotal: parseFloat(dc.subtotal),
            semana_inicio: Number(dc.semana_inicio),
            semana_fin: dc.semana_fin ? Number(dc.semana_fin) : null,
            dosis_por_semana: dc.dosis_por_semana
          };
        }
      })
    );

    // Procesar calendario híbrido (vacunas primero, luego productos)
    const calendarioCompleto = await Promise.all(
      cotizacion.calendario_vacunacion.map(async (cv) => {
        // PRIMERO intentar encontrar como vacuna (nuevo sistema)
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: cv.id_producto }
        });

        let nombreItem = 'Vacuna no encontrada';
        if (vacuna) {
          nombreItem = vacuna.nombre;
        }

        return {
          id_calendario: Number(cv.id_calendario),
          id_producto: Number(cv.id_producto),
          nombre_producto: nombreItem,
          numero_semana: Number(cv.numero_semana),
          fecha_programada: cv.fecha_programada,
          cantidad_dosis: cv.cantidad_dosis,
          estado_dosis: cv.estado_dosis,
          fecha_aplicacion: cv.fecha_aplicacion,
          observaciones: cv.observaciones
        };
      })
    );

    // Formatear respuesta completa
    const cotizacionFormatted = {
      ...cotizacion,
      id_cotizacion: Number(cotizacion.id_cotizacion),
      precio_total: parseFloat(cotizacion.precio_total),
      detalle_productos: detalleCompleto,
      calendario: calendarioCompleto
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
            vacunas_plan: {
              include: {
                vacuna: true
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

    // Verificar que el plan existe y está activo - SOLO VACUNAS
    const plan = await prisma.planVacunal.findUnique({
      where: { id_plan: parseInt(id_plan) },
      include: {
        vacunas_plan: {
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

    // Verificar que el plan tiene vacunas
    if (!plan.vacunas_plan || plan.vacunas_plan.length === 0) {
      return res.status(400).json({ 
        error: 'El plan debe tener al menos una vacuna para generar cotizaciones' 
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
      const detalleVacunas = [];

      // Obtener lista de precios si se especificó
      if (listaPrecios) {
        listaPrecio = await tx.listaPrecio.findUnique({
          where: { id_lista: listaPrecios }
        });
        
        if (!listaPrecio || !listaPrecio.activa) {
          throw new Error('Lista de precios no encontrada o inactiva');
        }
      }

      // Procesar SOLO vacunas del plan (sistema vacunas únicamente)
      for (const planVacuna of plan.vacunas_plan) {
        const precioBase = parseFloat(planVacuna.vacuna.precio_lista);
        let precioFinal = precioBase;
        let porcentajeAplicado = 0;

        // Aplicar recargo si hay lista de precios
        if (listaPrecio && listaPrecio.porcentaje_recargo > 0) {
          porcentajeAplicado = parseFloat(listaPrecio.porcentaje_recargo);
          precioFinal = PriceCalculator.calcularPrecioConRecargo(precioBase, porcentajeAplicado);
        }

        // Calcular cantidad basada en dosis por animal (1 dosis por animal)
        const dosisNecesarias = cantidadAnimalesNum; // 1 dosis por animal
        const dosisPorFrasco = planVacuna.vacuna?.presentacion?.dosis_por_frasco || 1;
        const frascosNecesarios = Math.ceil(dosisNecesarias / dosisPorFrasco);
        
        // El precio_lista es el precio POR FRASCO
        const subtotal = precioFinal * frascosNecesarios; // Precio por frasco * cantidad de frascos
        precioTotal += subtotal;

        // Crear detalle usando id_producto para compatibilidad con la tabla actual
        detalleVacunas.push({
          id_producto: planVacuna.id_vacuna, // Usar id_vacuna como id_producto para compatibilidad
          cantidad_total: frascosNecesarios, // Cantidad de frascos necesarios
          precio_base_producto: precioBase,
          porcentaje_aplicado: porcentajeAplicado || null,
          precio_unitario: precioFinal,
          precio_final_calculado: precioFinal,
          subtotal: subtotal,
          facturacion_tipo: 'pendiente',
          editado_manualmente: false,
          semana_inicio: planVacuna.semana_inicio,
          semana_fin: planVacuna.semana_fin,
          dosis_por_semana: planVacuna.dosis_por_semana,
          observaciones: planVacuna.observaciones
        });
      }

      // Crear la cotización
      const cotizacion = await tx.cotizacion.create({
        data: {
          numero_cotizacion: numeroCotizacion,
          id_cliente: parseInt(id_cliente),
          id_plan: parseInt(id_plan),
          id_lista_precio: listaPrecios,
          fecha_inicio_plan: new Date(fecha_inicio_plan + 'T12:00:00'),
          cantidad_animales: cantidadAnimalesNum,
          precio_total: precioTotal,
          observaciones: observaciones || '',
          created_by: req.user?.id_usuario || null
        }
      });

      // Crear detalle de cotización
      await tx.detalleCotizacion.createMany({
        data: detalleVacunas.map(vacuna => ({
          id_cotizacion: cotizacion.id_cotizacion,
          ...vacuna
        }))
      });

      // Generar calendario de vacunación SOLO para vacunas
      await generarCalendarioVacunacionVacunas(
        cotizacion.id_cotizacion,
        new Date(fecha_inicio_plan),
        plan.vacunas_plan,
        cantidadAnimalesNum,
        tx
      );

      return cotizacion;
    });

    // RESERVAS AUTOMÁTICAS: Crear reservas al crear la cotización
    // Las reservas se crean SIEMPRE, sin importar si hay stock disponible
    try {
      console.log('Creando reservas automáticas para nueva cotización...');
      
      const vacunasDelPlan = await prisma.planVacuna.findMany({
        where: { id_plan: parseInt(id_plan) },
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
      
      for (const planVacuna of vacunasDelPlan) {
        const dosisPorFrasco = planVacuna.vacuna?.presentacion?.dosis_por_frasco || 1000;
        const totalDosisNecesarias = planVacuna.cantidad_total * dosisPorFrasco;
        
        console.log(`Reservando ${totalDosisNecesarias} dosis de ${planVacuna.vacuna.nombre} (${planVacuna.cantidad_total} frascos)`);
        
        // Buscar stocks disponibles (FIFO por vencimiento)
        const stocksVacuna = await prisma.stockVacuna.findMany({
          where: {
            id_vacuna: planVacuna.id_vacuna,
            estado_stock: 'disponible'
          },
          orderBy: {
            fecha_vencimiento: 'asc'
          }
        });
        
        // Reservar en los lotes disponibles (aunque no haya stock suficiente)
        let dosisRestantes = totalDosisNecesarias;
        
        for (const stock of stocksVacuna) {
          if (dosisRestantes <= 0) break;
          
          const dosisAReservar = Math.min(dosisRestantes, totalDosisNecesarias);
          
          await prisma.stockVacuna.update({
            where: { id_stock_vacuna: stock.id_stock_vacuna },
            data: {
              stock_reservado: {
                increment: dosisAReservar
              }
            }
          });
          
          dosisRestantes -= dosisAReservar;
          console.log(`  ✓ Reservadas ${dosisAReservar} dosis en lote ${stock.lote}`);
        }
        
        if (dosisRestantes > 0) {
          console.warn(`  ⚠️  Faltan ${dosisRestantes} dosis de ${planVacuna.vacuna.nombre} - se reservó lo disponible`);
        }
      }
      
    } catch (stockError) {
      console.warn('Advertencia al crear reservas:', stockError.message);
      // No fallar la creación - las reservas son indicativas
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
      
      // Como no tenemos tabla de reservas específicas para vacunas,
      // verificamos si ya hay stock reservado en los lotes de las vacunas del plan
      console.log('Verificando reservas existentes de vacunas...');
      
      const vacunasDelPlan = await prisma.planVacuna.findMany({
        where: { id_plan: cotizacionExistente.id_plan },
        include: {
          vacuna: true
        }
      });
      
      let tieneReservasExistentes = false;
      
      for (const planVacuna of vacunasDelPlan) {
        const stocksConReservas = await prisma.stockVacuna.findMany({
          where: {
            id_vacuna: planVacuna.id_vacuna,
            stock_reservado: {
              gt: 0
            }
          }
        });
        
        if (stocksConReservas.length > 0) {
          const totalReservado = stocksConReservas.reduce((total, stock) => total + (stock.stock_reservado || 0), 0);
          // cantidad_total son FRASCOS, necesitamos convertir a dosis
          const dosisPorFrasco = planVacuna.vacuna?.presentacion?.dosis_por_frasco || 1000;
          const totalRequerido = planVacuna.cantidad_total * dosisPorFrasco;
          
          console.log(`Vacuna ${planVacuna.vacuna.nombre}: ${totalReservado} dosis reservadas, ${totalRequerido} requeridas`);
          
          if (totalReservado >= totalRequerido) {
            tieneReservasExistentes = true;
          }
        }
      }
      
      if (tieneReservasExistentes) {
        console.log('Se detectaron reservas existentes en el stock de vacunas. No se crean nuevas reservas.');
        reservasCreadas = []; // Marcar como que ya existen reservas
        
      } else {
        // No existen reservas - NO VERIFICAR STOCK
        // La asignación de lotes se hará posteriormente en el calendario
        console.log('Cotización aceptada sin verificación de stock. Los lotes se asignarán en el calendario.');
        
        // NO crear reservas automáticas
        // Las reservas se crearán cuando se asignen los lotes en el calendario
        reservasCreadas = [];
        
        console.log('Stock se gestionará posteriormente al asignar lotes en el calendario.');
      }
    }

    if (estado === 'cancelada' || estado === 'rechazada' || estado === 'eliminada') {
      // Liberar reservas de stock de vacunas existentes para cualquier estado de finalización
      console.log('Liberando reservas de stock de vacunas...');
      
      // Obtener vacunas del plan para liberar sus reservas
      const vacunasDelPlan = await prisma.planVacuna.findMany({
        where: { id_plan: cotizacionExistente.id_plan },
        include: {
          vacuna: true
        }
      });

      for (const planVacuna of vacunasDelPlan) {
        // cantidad_total son FRASCOS, necesitamos convertir a dosis
        const dosisPorFrasco = planVacuna.vacuna?.presentacion?.dosis_por_frasco || 1000;
        const totalDosisReservadas = planVacuna.cantidad_total * dosisPorFrasco;
        
        // Buscar stocks de esta vacuna que tengan reservas
        const stocksConReservas = await prisma.stockVacuna.findMany({
          where: {
            id_vacuna: planVacuna.id_vacuna,
            stock_reservado: {
              gt: 0
            }
          },
          orderBy: {
            fecha_vencimiento: 'asc'
          }
        });

        // Liberar reservas (este es un enfoque simplificado)
        // En un sistema completo, necesitaríamos rastrear qué reservas específicas liberar
        let dosisALiberar = totalDosisReservadas;
        
        for (const stock of stocksConReservas) {
          if (dosisALiberar <= 0) break;
          
          const dosisEnEsteStock = Math.min(dosisALiberar, stock.stock_reservado);
          
          if (dosisEnEsteStock > 0) {
            await prisma.stockVacuna.update({
              where: { id_stock_vacuna: stock.id_stock_vacuna },
              data: {
                stock_reservado: {
                  decrement: dosisEnEsteStock
                }
              }
            });
            
            dosisALiberar -= dosisEnEsteStock;
            console.log(`  ✓ Liberadas ${dosisEnEsteStock} dosis del lote ${stock.lote} de ${planVacuna.vacuna.nombre}`);
          }
        }
      }
      
      console.log(`Reservas liberadas por cambio a estado ${estado}`);
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
      updateData.fecha_aplicacion = new Date(fecha_aplicacion + 'T12:00:00');
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
        cotizacion.cantidad_animales, // Usar la cantidad de animales de la cotización
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

    // Liberar reservas de stock de vacunas activas (independientemente del estado)
    console.log('Verificando reservas de stock de vacunas para liberar...');
    
    const reservasActivas = await prisma.reservaStockVacuna.findMany({
      where: { 
        id_cotizacion: parseInt(id),
        estado_reserva: 'activa'
      }
    });

    if (reservasActivas.length > 0) {
      console.log(`Liberando ${reservasActivas.length} reservas de stock de vacunas por eliminación...`);
      
      for (const reserva of reservasActivas) {
        // Actualizar estado de la reserva
        await prisma.reservaStockVacuna.update({
          where: { id_reserva: reserva.id_reserva },
          data: { 
            estado_reserva: 'liberada',
            fecha_liberacion: new Date(),
            observaciones: 'Liberada por eliminación de cotización'
          }
        });

        // Registrar movimiento de liberación de vacuna
        await registrarMovimientoStockVacuna(
          reserva.id_vacuna, // En el sistema migrado de vacunas
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
          
          // Reservar stock de vacuna
          await registrarMovimientoStockVacuna(
            detalle.id_producto, // En el sistema migrado, id_producto es id_vacuna
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
        stock_vacuna: true, // Incluir información del stock de vacuna específico
        cotizacion: {
          select: {
            numero_cotizacion: true,
            estado: true,
            id_plan: true // Para verificar si es plan de vacunación
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
      // Si es un plan de vacunación y tiene stock_vacuna asignado, usar ese stock
      if (calendarioExistente.cotizacion.id_plan && calendarioExistente.stock_vacuna) {
        const stockActual = calendarioExistente.stock_vacuna.stock_actual || 0;
        const stockReservado = calendarioExistente.stock_vacuna.stock_reservado || 0;
        
        console.log(`Verificando stock de vacuna - Lote: ${calendarioExistente.stock_vacuna.lote}`);
        console.log(`  Stock actual: ${stockActual}, Stock reservado: ${stockReservado}, Solicitado: ${cantidad_entregada}`);
        
        // Validar que haya stock_actual Y que esté reservado
        if (stockActual < cantidad_entregada) {
          return res.status(400).json({ 
            error: 'Stock insuficiente para la entrega',
            stock_actual: stockActual,
            solicitado: cantidad_entregada,
            lote: calendarioExistente.stock_vacuna.lote
          });
        }
        
        if (stockReservado < cantidad_entregada) {
          return res.status(400).json({ 
            error: 'Stock reservado insuficiente. Debe reasignar lotes en el calendario.',
            stock_reservado: stockReservado,
            solicitado: cantidad_entregada,
            lote: calendarioExistente.stock_vacuna.lote,
            sugerencia: 'Verifique si hubo egresos que afectaron las reservas y reasigne lotes'
          });
        }
      } else {
        // Si no tiene stock de vacuna específico, usar stock de producto
        const stockDisponible = (calendarioExistente.producto.stock || 0) - (calendarioExistente.producto.stock_reservado || 0);
        console.log(`Verificando stock de producto - ${calendarioExistente.producto.nombre}, Disponible: ${stockDisponible}, Solicitado: ${cantidad_entregada}`);
        
        if (stockDisponible < cantidad_entregada) {
          return res.status(400).json({ 
            error: 'Stock insuficiente para la entrega',
            disponible: stockDisponible,
            solicitado: cantidad_entregada
          });
        }
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

      // Actualizar stock si requiere control
      if (calendarioExistente.producto.requiere_control_stock) {
        // Si es un plan de vacunación y tiene stock_vacuna asignado, actualizar ese stock
        if (calendarioExistente.cotizacion.id_plan && calendarioExistente.stock_vacuna) {
          // Calcular stock posterior
          const stockAnterior = calendarioExistente.stock_vacuna.stock_actual;
          const stockReservadoAnterior = calendarioExistente.stock_vacuna.stock_reservado || 0;
          const stockPosterior = stockAnterior - cantidad_entregada;
          const stockReservadoPosterior = Math.max(0, stockReservadoAnterior - cantidad_entregada);
          
          console.log(`📦 Entrega de dosis - Lote ${calendarioExistente.stock_vacuna.lote}:`);
          console.log(`  Stock anterior: ${stockAnterior} dosis`);
          console.log(`  Reservado anterior: ${stockReservadoAnterior} dosis`);
          console.log(`  Cantidad entregada: ${cantidad_entregada} dosis`);
          console.log(`  Stock posterior: ${stockPosterior} dosis`);
          console.log(`  Reservado posterior: ${stockReservadoPosterior} dosis`);
          
          // Reducir stock reservado y actual del lote específico
          await tx.stockVacuna.update({
            where: { id_stock_vacuna: calendarioExistente.id_stock_vacuna },
            data: {
              stock_reservado: stockReservadoPosterior,
              stock_actual: stockPosterior,
              updated_at: new Date()
            }
          });

          // Registrar movimiento de stock de vacuna
          await tx.movimientoStockVacuna.create({
            data: {
              id_stock_vacuna: calendarioExistente.id_stock_vacuna,
              tipo_movimiento: 'egreso',
              cantidad: cantidad_entregada,
              stock_anterior: stockAnterior,
              stock_posterior: stockPosterior,
              motivo: 'Entrega de dosis programada',
              observaciones: `Entrega: ${cantidad_entregada} dosis - ${responsableCompleto}`,
              id_calendario: parseInt(id_calendario),
              id_cotizacion: calendarioExistente.id_cotizacion,
              id_usuario: req.user?.id_usuario || null
            }
          });
          
          console.log(`✅ Stock actualizado correctamente`);
        } else {
          // Si no tiene stock de vacuna específico, usar stock de producto
          await tx.producto.update({
            where: { id_producto: calendarioExistente.id_producto },
            data: {
              stock_reservado: {
                decrement: cantidad_entregada
              },
              updated_at: new Date()
            }
          });

          // Registrar movimiento de stock de producto
          await tx.movimientoStock.create({
            data: {
              id_producto: calendarioExistente.id_producto,
              tipo_movimiento: 'liberacion_reserva',
              cantidad: cantidad_entregada,
              stock_anterior: calendarioExistente.producto.stock_reservado || 0,
              stock_nuevo: (calendarioExistente.producto.stock_reservado || 0) - cantidad_entregada,
              motivo: 'Entrega de dosis programada',
              observaciones: `Entrega realizada por ${responsableCompleto}`,
              id_usuario: req.user?.id_usuario || null
            }
          });
        }
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

    // TEMPORAL: Devolver array vacío ya que la tabla controlEntregaVacunas no existe
    // TODO: Implementar tabla de control de entregas para vacunas
    console.log(`getControlEntregas llamado para cotización ${id} - devolviendo array vacío temporalmente`);
    
    res.json([]);
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

    // Obtener cotización sin include para manejar híbrido
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        calendario_vacunacion: {
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

    // Agrupar por item usando lógica híbrida (vacunas primero, productos para compatibilidad)
    const resumenPorItem = {};
    
    for (const cal of cotizacion.calendario_vacunacion) {
      // PRIMERO intentar encontrar como vacuna (nuevo sistema)
      const vacuna = await prisma.vacuna.findUnique({
        where: { id_vacuna: cal.id_producto },
        select: {
          nombre: true,
          stock_vacunas: {
            select: {
              stock_actual: true,
              stock_reservado: true
            }
          }
        }
      });

      let nombreItem = 'Item no encontrado';
      let stockActual = 0;
      let stockReservado = 0;

      if (vacuna) {
        nombreItem = vacuna.nombre;
        // Sumar todo el stock de todas las entradas de la vacuna
        stockActual = vacuna.stock_vacunas.reduce((total, stock) => total + (stock.stock_actual || 0), 0);
        stockReservado = vacuna.stock_vacunas.reduce((total, stock) => total + (stock.stock_reservado || 0), 0);
      } else {
        // LUEGO intentar como producto (sistema anterior - retrocompatibilidad)
        const producto = await prisma.producto.findUnique({
          where: { id_producto: cal.id_producto },
          select: {
            nombre: true,
            stock: true,
            stock_reservado: true
          }
        });
        if (producto) {
          nombreItem = producto.nombre;
          stockActual = producto.stock || 0;
          stockReservado = producto.stock_reservado || 0;
        }
      }

      if (!resumenPorItem[nombreItem]) {
        resumenPorItem[nombreItem] = {
          nombre: nombreItem,
          programadas: 0,
          entregadas: 0,
          pendientes: 0,
          stock_actual: stockActual,
          stock_reservado: stockReservado
        };
      }
      
      resumenPorItem[nombreItem].programadas += cal.cantidad_dosis;
      resumenPorItem[nombreItem].entregadas += (cal.dosis_entregadas || 0);
      resumenPorItem[nombreItem].pendientes += (cal.cantidad_dosis - (cal.dosis_entregadas || 0));
    }

    // Determinar estado general del plan
    let estadoGeneral = 'activo';
    if (dosisPendientes === 0) {
      estadoGeneral = 'completado';
    } else if (cotizacion.estado !== 'aceptada') {
      estadoGeneral = 'inactivo';
    } else {
      // Verificar si hay problemas de stock
      const problemasStock = Object.values(resumenPorItem).some(
        item => item.pendientes > (item.stock_actual - item.stock_reservado)
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
      resumen_por_vacuna: Object.values(resumenPorItem),
      calendario_detallado: await Promise.all(
        cotizacion.calendario_vacunacion.map(async (cal) => {
          // Usar lógica híbrida para el nombre del item
          const vacuna = await prisma.vacuna.findUnique({
            where: { id_vacuna: cal.id_producto },
            select: { nombre: true }
          });

          let nombreItem = 'Item no encontrado';
          if (vacuna) {
            nombreItem = vacuna.nombre;
          } else {
            const producto = await prisma.producto.findUnique({
              where: { id_producto: cal.id_producto },
              select: { nombre: true }
            });
            if (producto) {
              nombreItem = producto.nombre;
            }
          }

          return {
            id_calendario: cal.id_calendario,
            numero_semana: cal.numero_semana,
            fecha_programada: cal.fecha_programada,
            vacuna: nombreItem,
            cantidad_dosis: cal.cantidad_dosis,
            dosis_entregadas: cal.dosis_entregadas || 0,
            estado_entrega: cal.estado_entrega,
            responsable_entrega: cal.responsable_entrega
          };
        })
      )
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

    // Crear fecha manteniendo la zona horaria local
    const fechaProgramada = new Date(nueva_fecha + 'T12:00:00'); // Agregar hora del mediodía para evitar problemas de zona horaria
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

    // Obtener datos del calendario directamente con campos básicos
    const calendario = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        },
        stock_vacuna: {
          include: {
            vacuna: true  // Incluir información de la vacuna desde stock_vacuna
          }
        }
      }
    });

    // Si no tiene stock_vacuna pero sí id_producto, obtener la vacuna directamente
    let vacunaInfo = null;
    if (calendario && !calendario.stock_vacuna && calendario.id_producto) {
      try {
        vacunaInfo = await prisma.vacuna.findUnique({
          where: { id_vacuna: calendario.id_producto } // id_producto contiene id_vacuna
        });
      } catch (error) {
        console.log('No se pudo obtener vacuna con id_producto:', calendario.id_producto);
      }
    }

    if (!calendario) {
      return res.status(404).json({
        success: false,
        message: 'Calendario no encontrado'
      });
    }

    // Verificar que hay datos de entrega (menos estricto para permitir POST)
    if (req.method === 'GET' && (!calendario.dosis_entregadas || calendario.estado_entrega === 'pendiente')) {
      return res.status(400).json({
        success: false,
        message: 'No hay entregas registradas para este calendario'
      });
    }

    // Validar que tiene cotización asociada
    if (!calendario.cotizacion) {
      return res.status(400).json({
        success: false,
        message: 'El calendario no tiene una cotización asociada'
      });
    }

    // Usar datos del POST si están disponibles, sino usar datos del calendario
    let datosEntrega;
    if (req.method === 'POST' && cantidad_entregada !== undefined) {
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
      // Usar datos del calendario
      let responsableEntrega = calendario.responsable_entrega || '';
      let responsableRecibe = '';
      
      if (responsableEntrega.includes('|')) {
        const partes = responsableEntrega.split('|');
        responsableEntrega = partes[0]?.replace('Entrega:', '').trim() || '';
        responsableRecibe = partes[1]?.replace('Recibe:', '').trim() || '';
      }
      
      datosEntrega = {
        cantidad_entregada: calendario.dosis_entregadas,
        tipo_entrega: calendario.estado_entrega === 'entregada' ? 'completa' : 'parcial',
        fecha_entrega: calendario.fecha_entrega,
        responsable_entrega: responsableEntrega,
        responsable_recibe: responsableRecibe,
        observaciones_entrega: calendario.observaciones_entrega || '',
        estado: calendario.estado_entrega
      };
    }

    // Calcular dosis restantes
    const dosisRestantes = calendario.cantidad_dosis - datosEntrega.cantidad_entregada;

    // Preparar datos para el PDF
    const pdfData = {
      cliente: {
        nombre: calendario.cotizacion?.cliente?.nombre || 'Cliente sin nombre',
        email: calendario.cotizacion?.cliente?.email || '',
        telefono: calendario.cotizacion?.cliente?.telefono || '',
        direccion: calendario.cotizacion?.cliente?.direccion || '',
        localidad: calendario.cotizacion?.cliente?.localidad || '',
        cuit: calendario.cotizacion?.cliente?.cuit || ''
      },
      cotizacion: {
        numero: calendario.cotizacion.numero_cotizacion,
        fecha_inicio: calendario.cotizacion.fecha_inicio_plan
      },
      plan: {
        numeroCotizacion: calendario.cotizacion?.numero_cotizacion || 'SIN-NUMERO',
        numeroSemana: calendario.numero_semana || calendario.semana_aplicacion || 'N/A',
        fechaProgramada: calendario.fecha_programada || calendario.fecha_aplicacion_programada || new Date(),
        cantidadAnimales: calendario.cotizacion?.cantidad_animales || 0,
        estado: calendario.estado_entrega || 'pendiente',
        fechaInicio: calendario.cotizacion?.fecha_inicio_plan || new Date()
      },
      entrega: {
        fecha: datosEntrega.fecha_entrega || new Date(),
        responsable_entrega: datosEntrega.responsable_entrega || 'Sistema',
        responsable_recibe: datosEntrega.responsable_recibe || 'Sin especificar',
        observaciones: datosEntrega.observaciones_entrega || '',
        observaciones_entrega: datosEntrega.observaciones_entrega || '',
        tipo: datosEntrega.tipo_entrega || 'completa',
        tipoEntrega: datosEntrega.tipo_entrega || 'completa',
        estado: datosEntrega.estado || 'entregada',
        cantidadEntregada: datosEntrega.cantidad_entregada || 0,
        dosisRestantes: dosisRestantes || 0,
        tipoEntregaDisplay: datosEntrega.tipo_entrega === 'completa' ? 'COMPLETA' : `RESTANTES: ${dosisRestantes || 0} dosis`
      },
      producto: {
        nombre: calendario.stock_vacuna?.vacuna?.nombre || vacunaInfo?.nombre || calendario.vacuna_nombre || 'Producto no encontrado',
        descripcion: calendario.stock_vacuna?.vacuna?.detalle || vacunaInfo?.detalle || calendario.vacuna_descripcion || 'Sin descripción',
        codigo: calendario.stock_vacuna?.vacuna?.codigo || vacunaInfo?.codigo || 'SIN-CODIGO',
        lote: calendario.stock_vacuna?.lote || calendario.lote_asignado || 'N/A',
        fecha_vencimiento: calendario.stock_vacuna?.fecha_vencimiento || calendario.fecha_vencimiento_lote || null,
        cantidad_programada: calendario.cantidad_dosis || 0,
        cantidad_entregada: datosEntrega.cantidad_entregada || 0,
        cantidad_restante: dosisRestantes || 0,
        semana: calendario.numero_semana || calendario.semana_aplicacion || 'N/A',
        fecha_programada: calendario.fecha_programada || calendario.fecha_aplicacion_programada || null,
        // Información adicional de la vacuna
        proveedor: calendario.stock_vacuna?.vacuna?.proveedor?.nombre || vacunaInfo?.proveedor?.nombre || 'Sin proveedor',
        tipo_producto: 'vacuna'
      }
    };

    // Debug: Log de los datos que se enviarán al PDF
    console.log('Datos para PDF:', {
      cliente: pdfData.cliente?.nombre || 'Sin cliente',
      producto: pdfData.producto?.nombre || 'Sin producto',
      codigo: pdfData.producto?.codigo || 'Sin código',
      cantidadEntregada: pdfData.entrega?.cantidadEntregada || 'Sin cantidad'
    });

    // Generar PDF
    const pdfBuffer = await pdfService.generateRemitoPDF(pdfData);

    // Configurar headers de respuesta
    const nombreArchivo = `remito-entrega-${calendario.cotizacion?.numero_cotizacion || 'SIN-NUM'}-semana-${calendario.numero_semana || calendario.semana_aplicacion || 'X'}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al generar remito PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el remito PDF',
      error: error.message
    });
  }
};

// ===== FUNCIONES DE CALENDARIO =====

const getCalendarioVacunacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener calendario sin include para manejar híbrido manualmente
    const calendario = await prisma.calendarioVacunacion.findMany({
      where: { id_cotizacion: parseInt(id) },
      orderBy: [
        { numero_semana: 'asc' },
        { id_calendario: 'asc' }
      ]
    });

    // Función auxiliar para formatear fecha evitando problemas de timezone
    const formatearFechaLocal = (fecha) => {
      if (!fecha) return null;
      
      console.log('Fecha original de BD:', fecha);
      console.log('Fecha como ISO:', fecha.toISOString());
      
      // Usar getUTCFullYear, getUTCMonth, getUTCDate para extraer la fecha sin conversión de zona horaria
      const year = fecha.getUTCFullYear();
      const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fecha.getUTCDate()).padStart(2, '0');
      const fechaFormateada = `${year}-${month}-${day}`;
      
      console.log('Fecha formateada para frontend:', fechaFormateada);
      return fechaFormateada;
    };

    // Procesar calendario con lógica híbrida (vacunas primero, productos para compatibilidad)
    const calendarioFormateado = await Promise.all(
      calendario.map(async (item) => {
        // PRIMERO intentar encontrar como vacuna (nuevo sistema)
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: item.id_producto }
        });

        let nombreItem = 'Item no encontrado';
        let descripcionItem = '';
        let tipoItem = 'N/A';
        let stockInfo = null;

        if (vacuna) {
          // Es una vacuna (sistema nuevo)
          nombreItem = vacuna.nombre;
          descripcionItem = vacuna.detalle || vacuna.descripcion || '';
          tipoItem = 'vacuna';
          
          // Obtener información del stock si está asignado
          if (item.id_stock_vacuna) {
            stockInfo = await prisma.stockVacuna.findUnique({
              where: { id_stock_vacuna: item.id_stock_vacuna },
              select: {
                lote: true,
                fecha_vencimiento: true,
                stock_actual: true,
                stock_reservado: true,
                ubicacion_fisica: true
              }
            });
          }
        } else {
          // LUEGO intentar como producto (sistema anterior - retrocompatibilidad)
          const producto = await prisma.producto.findUnique({
            where: { id_producto: item.id_producto }
          });
          if (producto) {
            nombreItem = producto.nombre;
            descripcionItem = producto.descripcion || '';
            tipoItem = producto.tipo_producto || 'producto';
          }
        }

        return {
          id_calendario: item.id_calendario,
          id_producto: item.id_producto, // ID que puede ser vacuna o producto
          id_vacuna: vacuna ? vacuna.id_vacuna : null, // ID específico de vacuna (si es vacuna)
          semana_aplicacion: item.numero_semana,
          fecha_aplicacion_programada: formatearFechaLocal(item.fecha_programada),
          vacuna_nombre: nombreItem,
          vacuna_tipo: tipoItem,
          vacuna_descripcion: descripcionItem,
          cantidad_dosis: item.cantidad_dosis,
          estado_dosis: item.estado_dosis,
          estado_entrega: item.estado_entrega || item.estado_dosis,
          dosis_entregadas: item.dosis_entregadas || 0,
          responsable_entrega: item.responsable_entrega || null,
          fecha_entrega: item.fecha_entrega ? item.fecha_entrega.toISOString().split('T')[0] : null,
          observaciones_entrega: item.observaciones_entrega || null,
          dosis_por_animal: item.cantidad_dosis || 1,
          total_dosis: item.cantidad_dosis || 1,
          // Información del lote asignado
          lote_asignado: item.lote_asignado || stockInfo?.lote || null,
          fecha_vencimiento_lote: item.fecha_vencimiento_lote ? 
            formatearFechaLocal(item.fecha_vencimiento_lote) : 
            (stockInfo?.fecha_vencimiento ? formatearFechaLocal(stockInfo.fecha_vencimiento) : null),
          ubicacion_fisica: stockInfo?.ubicacion_fisica || null,
          stock_disponible: stockInfo?.stock_actual || 0,
          stock_reservado: stockInfo?.stock_reservado || 0,
          // Campos adicionales para desdoblamientos
          es_desdoblamiento: item.es_desdoblamiento || false,
          numero_desdoblamiento: item.numero_desdoblamiento || null,
          dosis_original_id: item.dosis_original_id || null
        };
      })
    );

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

    console.log('Recibida fecha para editar:', fecha_aplicacion_programada);

    // Validar formato de fecha (YYYY-MM-DD)
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha_aplicacion_programada)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    // Crear fecha manteniendo solo la fecha sin problemas de timezone
    // Parseamos la fecha y la guardamos como inicio del día en UTC
    const [year, month, day] = fecha_aplicacion_programada.split('-');
    const fechaParaGuardar = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0));

    console.log('Fecha ISO para guardar:', fechaParaGuardar.toISOString());
    console.log('Fecha objeto para guardar:', fechaParaGuardar);

    // Actualizar la fecha en el calendario
    const calendarioActualizado = await prisma.calendarioVacunacion.update({
      where: { id_calendario: parseInt(id_calendario) },
      data: {
        fecha_programada: fechaParaGuardar
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

    console.log('Fecha guardada en BD:', calendarioActualizado.fecha_programada);

    // Devolver la fecha original enviada (sin conversiones)
    res.json({
      success: true,
      message: 'Fecha actualizada correctamente',
      calendario: {
        id_calendario: calendarioActualizado.id_calendario,
        semana_aplicacion: calendarioActualizado.numero_semana,
        fecha_aplicacion_programada: fecha_aplicacion_programada, // Devolver la fecha original
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

// ===== NUEVOS ENDPOINTS PARA REASIGNACIÓN DE LOTES =====

/**
 * Asignar lote manualmente a un elemento del calendario
 */
exports.asignarLoteManual = async (req, res) => {
  const { id_calendario } = req.params;
  const { id_stock_vacuna, cantidad_asignar } = req.body;

  try {
    // Validaciones
    if (!id_stock_vacuna || !cantidad_asignar) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere id_stock_vacuna y cantidad_asignar'
      });
    }

    const resultado = await asignarLoteManual(
      parseInt(id_calendario),
      parseInt(id_stock_vacuna),
      parseInt(cantidad_asignar),
      req.user?.id_usuario
    );

    res.json({
      success: true,
      message: 'Lote asignado exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error al asignar lote manual:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al asignar lote'
    });
  }
};

/**
 * Reasignar lote automáticamente cuando el original no está disponible
 */
exports.reasignarLoteAutomatico = async (req, res) => {
  const { id_calendario } = req.params;

  try {
    const resultado = await reasignarLoteAutomatico(
      parseInt(id_calendario),
      req.user?.id_usuario
    );

    if (resultado.success) {
      res.json({
        success: true,
        message: resultado.reasignado ? 'Lote reasignado exitosamente' : 'El lote actual sigue siendo válido',
        data: resultado
      });
    } else {
      res.status(400).json({
        success: false,
        message: resultado.error || 'No se pudo reasignar el lote',
        data: resultado
      });
    }

  } catch (error) {
    console.error('Error al reasignar lote automático:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Asignar múltiples lotes para una aplicación
 */
exports.asignarMultiplesLotes = async (req, res) => {
  const { id_calendario } = req.params;

  try {
    const resultado = await asignarMultiplesLotes(
      parseInt(id_calendario),
      req.user?.id_usuario
    );

    res.json({
      success: true,
      message: `Asignación completada con ${resultado.lotes_utilizados} lotes`,
      data: resultado
    });

  } catch (error) {
    console.error('Error al asignar múltiples lotes:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al asignar múltiples lotes'
    });
  }
};

/**
 * Asignar múltiples lotes manualmente seleccionados por el usuario
 */
exports.asignarMultiplesLotesManual = async (req, res) => {
  const { id_calendario } = req.params;
  const { lotes } = req.body;

  try {
    // Validaciones
    if (!lotes || !Array.isArray(lotes) || lotes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de lotes con id_stock_vacuna y cantidad'
      });
    }

    // Obtener información del calendario
    const calendario = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: {
        producto: {
          select: {
            nombre: true
          }
        }
      }
    });

    if (!calendario) {
      return res.status(404).json({
        success: false,
        message: 'Calendario no encontrado'
      });
    }

    const cantidadTotal = lotes.reduce((sum, l) => sum + parseInt(l.cantidad), 0);
    
    if (cantidadTotal < calendario.cantidad_dosis) {
      return res.status(400).json({
        success: false,
        message: `La cantidad total (${cantidadTotal}) es menor a la requerida (${calendario.cantidad_dosis})`
      });
    }

    // Verificar disponibilidad de todos los lotes
    for (const lote of lotes) {
      const stock = await prisma.stockVacuna.findUnique({
        where: { id_stock_vacuna: parseInt(lote.id_stock_vacuna) }
      });

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: `Lote con ID ${lote.id_stock_vacuna} no encontrado`
        });
      }

      if (stock.stock_actual < lote.cantidad) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente en lote ${stock.lote}. Disponible: ${stock.stock_actual}, Solicitado: ${lote.cantidad}`
        });
      }
    }

    // Asignar los lotes
    const resultados = [];
    
    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];
      const cantidad = parseInt(lote.cantidad);
      
      // Asignar el lote
      const resultado = await asignarLoteManual(
        parseInt(id_calendario),
        parseInt(lote.id_stock_vacuna),
        cantidad,
        req.user?.id_usuario
      );

      resultados.push({
        id_stock_vacuna: lote.id_stock_vacuna,
        cantidad,
        lote: resultado.lote
      });

      // Si no es el primer lote, crear un desdoblamiento
      if (i > 0) {
        // Crear registro de desdoblamiento o actualización
        await prisma.calendarioVacunacion.update({
          where: { id_calendario: parseInt(id_calendario) },
          data: {
            observaciones: calendario.observaciones 
              ? `${calendario.observaciones}\nLotes múltiples asignados: ${resultados.map(r => r.lote).join(', ')}`
              : `Lotes múltiples asignados: ${resultados.map(r => r.lote).join(', ')}`
          }
        });
      }
    }

    res.json({
      success: true,
      message: `${lotes.length} lote(s) asignados correctamente`,
      data: {
        lotes_asignados: resultados.length,
        cantidad_total: cantidadTotal,
        lotes: resultados
      }
    });

  } catch (error) {
    console.error('Error al asignar múltiples lotes manualmente:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al asignar múltiples lotes'
    });
  }
};

/**
 * Obtener stocks disponibles para una vacuna específica
 * IMPORTANTE: Solo busca en la tabla Vacuna, NO en Producto
 * Acepta tanto id_vacuna como id_producto (para compatibilidad)
 */
exports.getStocksDisponibles = async (req, res) => {
  const { id_vacuna, id_producto, fecha_aplicacion } = req.query;

  try {
    // Aceptar tanto id_vacuna como id_producto (el campo id_producto del calendario contiene IDs de vacuna)
    const idVacuna = parseInt(id_vacuna || id_producto);
    
    if (!idVacuna || isNaN(idVacuna)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere id_vacuna o id_producto'
      });
    }

    const fechaAplicacion = fecha_aplicacion ? new Date(fecha_aplicacion) : new Date();

    console.log('getStocksDisponibles - ID Vacuna recibido:', idVacuna);
    console.log('getStocksDisponibles - Fecha aplicación:', fechaAplicacion);

    // Verificar que la vacuna existe en la tabla Vacuna
    const vacuna = await prisma.vacuna.findUnique({
      where: { id_vacuna: idVacuna },
      select: { 
        id_vacuna: true,
        nombre: true,
        codigo: true
      }
    });
    
    if (!vacuna) {
      console.error('Vacuna no encontrada con ID:', idVacuna);
      return res.status(404).json({
        success: false,
        message: `No se encontró la vacuna con ID ${idVacuna}`
      });
    }

    console.log('Vacuna encontrada:', vacuna);

    // Buscar stocks disponibles SOLO de vacunas
    const stocks = await prisma.stockVacuna.findMany({
      where: {
        id_vacuna: idVacuna,
        estado_stock: 'disponible',
        stock_actual: { gt: 0 },
        fecha_vencimiento: { gte: fechaAplicacion }
      },
      include: {
        vacuna: {
          select: {
            nombre: true,
            codigo: true
          }
        }
      },
      orderBy: {
        fecha_vencimiento: 'asc'
      }
    });

    console.log(`Stocks encontrados: ${stocks.length}`);
    if (stocks.length > 0) {
      console.log('Primer stock:', stocks[0]);
    }

    // Formatear respuesta
    const stocksFormateados = stocks.map(stock => ({
      id_stock_vacuna: stock.id_stock_vacuna,
      lote: stock.lote,
      fecha_vencimiento: stock.fecha_vencimiento,
      stock_actual: stock.stock_actual,
      stock_reservado: stock.stock_reservado,
      ubicacion_fisica: stock.ubicacion_fisica,
      precio_compra: stock.precio_compra,
      vacuna_nombre: stock.vacuna.nombre,
      vacuna_codigo: stock.vacuna.codigo,
      dias_hasta_vencimiento: Math.ceil((stock.fecha_vencimiento.getTime() - fechaAplicacion.getTime()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      data: stocksFormateados,
      total_stocks: stocksFormateados.length,
      fecha_aplicacion: fechaAplicacion
    });

  } catch (error) {
    console.error('Error al obtener stocks disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener stocks disponibles'
    });
  }
};

/**
 * Reasignar todos los lotes de una cotización
 */
exports.reasignarTodosLotesCotizacion = async (req, res) => {
  const { id } = req.params;

  try {
    const calendarios = await prisma.calendarioVacunacion.findMany({
      where: { id_cotizacion: parseInt(id) },
      select: { id_calendario: true }
    });

    const resultados = [];
    let exitosos = 0;
    let fallidos = 0;

    for (const calendario of calendarios) {
      try {
        const resultado = await reasignarLoteAutomatico(
          calendario.id_calendario,
          req.user?.id_usuario
        );
        
        resultados.push({
          id_calendario: calendario.id_calendario,
          ...resultado
        });

        if (resultado.success) {
          exitosos++;
        } else {
          fallidos++;
        }
      } catch (error) {
        resultados.push({
          id_calendario: calendario.id_calendario,
          success: false,
          error: error.message
        });
        fallidos++;
      }
    }

    res.json({
      success: true,
      message: `Reasignación completada: ${exitosos} exitosos, ${fallidos} fallidos`,
      data: {
        total_procesados: calendarios.length,
        exitosos,
        fallidos,
        detalles: resultados
      }
    });

  } catch (error) {
    console.error('Error al reasignar todos los lotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reasignar lotes de la cotización'
    });
  }
};

/**
 * Verificar estado de todos los lotes asignados en una cotización
 */
exports.verificarEstadoLotes = async (req, res) => {
  const { id } = req.params;

  try {
    const calendarios = await prisma.calendarioVacunacion.findMany({
      where: { id_cotizacion: parseInt(id) },
      include: {
        stock_vacuna: {
          include: {
            vacuna: {
              select: { 
                nombre: true,
                detalle: true 
              }
            }
          }
        },
        producto: {
          select: { nombre: true }
        }
      }
    });

    const problemas = [];
    const alertas = [];

    for (const calendario of calendarios) {
      // Obtener el nombre de la vacuna prioritariamente del stock, o del producto como fallback
      let nombreVacuna = 'Vacuna desconocida';
      if (calendario.stock_vacuna?.vacuna?.nombre) {
        nombreVacuna = calendario.stock_vacuna.vacuna.nombre;
      } else if (calendario.producto?.nombre) {
        nombreVacuna = calendario.producto.nombre;
      }

      const problema = {
        id_calendario: calendario.id_calendario,
        semana: calendario.numero_semana,
        fecha_programada: calendario.fecha_programada,
        producto: nombreVacuna,
        cantidad_requerida: calendario.cantidad_dosis,
        problemas: []
      };

      // Verificar si tiene lote asignado
      if (!calendario.id_stock_vacuna) {
        problema.problemas.push({
          tipo: 'sin_lote',
          severidad: 'error',
          mensaje: 'No tiene lote asignado'
        });
      } else {
        const stock = calendario.stock_vacuna;
        
        // Verificar si el stock existe
        if (!stock) {
          problema.problemas.push({
            tipo: 'stock_inexistente',
            severidad: 'error',
            mensaje: 'El lote asignado ya no existe'
          });
        } else {
          // Verificar estado del stock
          if (stock.estado_stock !== 'disponible') {
            problema.problemas.push({
              tipo: 'stock_no_disponible',
              severidad: 'error',
              mensaje: `Stock en estado: ${stock.estado_stock}`
            });
          }

          // Verificar cantidad disponible vs reservada
          const stockDisponible = stock.stock_actual + stock.stock_reservado;
          if (stockDisponible < calendario.cantidad_dosis) {
            problema.problemas.push({
              tipo: 'cantidad_insuficiente',
              severidad: 'error',
              mensaje: `Stock insuficiente: ${stockDisponible}/${calendario.cantidad_dosis}`
            });
          }

          // Verificar fecha de vencimiento
          if (stock.fecha_vencimiento < calendario.fecha_programada) {
            problema.problemas.push({
              tipo: 'lote_vencido',
              severidad: 'error',
              mensaje: `Lote vence antes de la aplicación (${stock.fecha_vencimiento.toISOString().split('T')[0]})`
            });
          }

          // Alertas preventivas
          const diasHastaVencimiento = Math.ceil(
            (stock.fecha_vencimiento.getTime() - calendario.fecha_programada.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diasHastaVencimiento < 7) {
            alertas.push({
              ...problema,
              tipo: 'vencimiento_proximo',
              severidad: 'warning',
              mensaje: `Lote ${stock.lote} vence en ${diasHastaVencimiento} días después de la aplicación`
            });
          }

          if (stock.stock_actual < calendario.cantidad_dosis && stock.stock_reservado >= calendario.cantidad_dosis) {
            alertas.push({
              ...problema,
              tipo: 'solo_reservado',
              severidad: 'info',
              mensaje: `Stock solo disponible en reserva`
            });
          }
        }
      }

      // Solo agregar si tiene problemas
      if (problema.problemas.length > 0) {
        problemas.push(problema);
      }
    }

    const resumen = {
      total_calendarios: calendarios.length,
      calendarios_con_problemas: problemas.length,
      calendarios_sin_problemas: calendarios.length - problemas.length,
      tipos_problemas: {},
      alertas_preventivas: alertas.length
    };

    // Contar tipos de problemas
    problemas.forEach(p => {
      p.problemas.forEach(prob => {
        resumen.tipos_problemas[prob.tipo] = (resumen.tipos_problemas[prob.tipo] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        resumen,
        problemas,
        alertas,
        requiere_atencion: problemas.length > 0
      }
    });

  } catch (error) {
    console.error('Error al verificar estado de lotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado de lotes'
    });
  }
};

// Exportar las nuevas funciones del calendario
exports.getCalendarioVacunacion = getCalendarioVacunacion;
exports.editarFechaCalendario = editarFechaCalendario;
exports.desdoblarDosis = desdoblarDosis;
