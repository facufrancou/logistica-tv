const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función registrarMovimientoStock (simplificada)
async function registrarMovimientoStock(idProducto, tipoMovimiento, cantidad, motivo, observaciones, idCotizacion, idUsuario) {
  try {
    // Obtener stock actual del producto
    const producto = await prisma.producto.findUnique({
      where: { id_producto: idProducto }
    });

    if (!producto) {
      throw new Error(`Producto no encontrado: ${idProducto}`);
    }

    const stockAnterior = producto.stock || 0;
    let stockPosterior = stockAnterior;

    // Calcular nuevo stock según el tipo de movimiento
    switch (tipoMovimiento) {
      case 'entrada':
        stockPosterior = stockAnterior + cantidad;
        break;
      case 'salida':
        stockPosterior = stockAnterior - cantidad;
        break;
      case 'reserva':
        // Para reserva, el stock físico no cambia, solo se marca como reservado
        stockPosterior = stockAnterior;
        break;
      case 'liberacion_reserva':
        // Para liberación, el stock físico tampoco cambia
        stockPosterior = stockAnterior;
        break;
      default:
        throw new Error(`Tipo de movimiento no válido: ${tipoMovimiento}`);
    }

    // Crear el movimiento
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

    // Actualizar stock del producto solo si es entrada o salida
    if (tipoMovimiento === 'entrada' || tipoMovimiento === 'salida') {
      await prisma.producto.update({
        where: { id_producto: idProducto },
        data: { stock: stockPosterior }
      });
    }

    return movimiento;
  } catch (error) {
    console.error('Error en registrarMovimientoStock:', error);
    throw error;
  }
}

// Función reservarStockParaCotizacion corregida
async function reservarStockParaCotizacion(cotizacionId, detalleProductos, idUsuario) {
  const reservasCreadas = [];

  for (const detalle of detalleProductos) {
    const producto = await prisma.producto.findUnique({
      where: { id_producto: detalle.id_producto }
    });

    if (producto && producto.requiere_control_stock) {
      // CORRECCIÓN: Calcular la cantidad total de dosis correctamente
      const totalDosisRequeridas = detalle.cantidad_total * detalle.dosis_por_semana;
      const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
      
      console.log(`Producto: ${producto.nombre}`);
      console.log(`  - Cálculo: ${detalle.cantidad_total} semanas × ${detalle.dosis_por_semana} dosis/semana = ${totalDosisRequeridas} dosis`);
      console.log(`  - Stock disponible: ${stockDisponible}`);
      
      if (stockDisponible >= totalDosisRequeridas) {
        // Crear reserva
        const reserva = await prisma.reservaStock.create({
          data: {
            id_producto: detalle.id_producto,
            id_cotizacion: cotizacionId,
            cantidad_reservada: totalDosisRequeridas,
            motivo: 'Reserva automática por cotización aceptada',
            observaciones: `Reserva automática para ${totalDosisRequeridas} dosis (${detalle.cantidad_total} semanas × ${detalle.dosis_por_semana} dosis/semana)`,
            created_by: idUsuario
          }
        });

        // Actualizar stock reservado del producto
        await prisma.producto.update({
          where: { id_producto: detalle.id_producto },
          data: {
            stock_reservado: (producto.stock_reservado || 0) + totalDosisRequeridas
          }
        });

        // Registrar movimiento de stock
        await registrarMovimientoStock(
          detalle.id_producto,
          'reserva',
          totalDosisRequeridas,
          'Reserva automática por cotización aceptada',
          `Cotización: ${cotizacionId} - ${totalDosisRequeridas} dosis (${detalle.cantidad_total} semanas × ${detalle.dosis_por_semana} dosis/semana)`,
          cotizacionId,
          idUsuario
        );

        console.log(`  ✅ Reserva creada: ${totalDosisRequeridas} dosis`);
        reservasCreadas.push(reserva);
      } else {
        console.log(`  ❌ Stock insuficiente`);
        throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, requerido: ${totalDosisRequeridas} dosis`);
      }
    }
  }

  return reservasCreadas;
}

async function activarReservas() {
  try {
    console.log('=== ACTIVANDO RESERVAS CON LÓGICA CORREGIDA ===\n');

    // Buscar la cotización aceptada más reciente
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { estado: 'aceptada' },
      orderBy: { updated_at: 'desc' },
      include: {
        detalle_cotizacion: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!cotizacion) {
      console.log('No se encontró cotización aceptada');
      return;
    }

    console.log(`Procesando cotización: ${cotizacion.numero_cotizacion}`);
    
    // Verificar si ya tiene reservas activas
    const reservasExistentes = await prisma.reservaStock.findMany({
      where: { 
        id_cotizacion: cotizacion.id_cotizacion,
        estado_reserva: 'activa'
      }
    });

    if (reservasExistentes.length > 0) {
      console.log('Esta cotización ya tiene reservas activas. Eliminando reservas anteriores...');
      
      // Liberar stock reservado antes de eliminar reservas
      for (const reserva of reservasExistentes) {
        const producto = await prisma.producto.findUnique({
          where: { id_producto: reserva.id_producto }
        });
        
        if (producto) {
          await prisma.producto.update({
            where: { id_producto: reserva.id_producto },
            data: {
              stock_reservado: Math.max(0, (producto.stock_reservado || 0) - reserva.cantidad_reservada)
            }
          });
        }
      }
      
      await prisma.reservaStock.deleteMany({
        where: { id_cotizacion: cotizacion.id_cotizacion }
      });
    }

    console.log('\nCreando nuevas reservas...');
    const reservas = await reservarStockParaCotizacion(
      cotizacion.id_cotizacion,
      cotizacion.detalle_cotizacion,
      1
    );

    console.log(`\n✅ Se crearon ${reservas.length} reservas correctamente`);
    
    // Mostrar estado final
    console.log('\n=== ESTADO FINAL ===');
    for (const reserva of reservas) {
      const producto = await prisma.producto.findUnique({
        where: { id_producto: reserva.id_producto }
      });
      console.log(`${producto.nombre}:`);
      console.log(`  - Stock total: ${producto.stock}`);
      console.log(`  - Stock reservado: ${producto.stock_reservado}`);
      console.log(`  - Stock libre: ${producto.stock - producto.stock_reservado}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activarReservas();