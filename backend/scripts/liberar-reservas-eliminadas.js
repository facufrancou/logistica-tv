/**
 * Script para liberar reservas de cotizaciones eliminadas
 */
const prisma = require('../src/lib/prisma');

async function liberarReservasCotizacionesEliminadas() {
  try {
    console.log('🔍 Buscando reservas activas de cotizaciones eliminadas...\n');

    // Buscar reservas activas que pertenecen a cotizaciones eliminadas
    const reservasProblematicas = await prisma.reservaStock.findMany({
      where: {
        estado_reserva: 'activa',
        cotizacion: {
          estado: 'eliminada'
        }
      },
      include: {
        cotizacion: {
          select: { numero_cotizacion: true, estado: true }
        },
        producto: {
          select: { nombre: true, stock: true, stock_reservado: true }
        }
      }
    });

    console.log(`📦 Reservas problemáticas encontradas: ${reservasProblematicas.length}`);

    if (reservasProblematicas.length === 0) {
      console.log('✅ No se encontraron reservas problemáticas');
      return;
    }

    // Mostrar detalles de las reservas problemáticas
    console.log('\n🚨 Reservas que serán liberadas:');
    let totalDosisALiberar = 0;
    reservasProblematicas.forEach(reserva => {
      console.log(`   - ${reserva.producto.nombre}: ${reserva.cantidad_reservada} dosis (Cotización: ${reserva.cotizacion.numero_cotizacion})`);
      totalDosisALiberar += reserva.cantidad_reservada;
    });

    console.log(`\n📊 Total de dosis a liberar: ${totalDosisALiberar}`);

    // Confirmar acción
    console.log('\n⚡ Procediendo con la liberación...');

    // Agrupar por producto para procesar eficientemente
    const reservasPorProducto = {};
    reservasProblematicas.forEach(reserva => {
      const idProducto = reserva.id_producto;
      if (!reservasPorProducto[idProducto]) {
        reservasPorProducto[idProducto] = {
          producto: reserva.producto,
          reservas: [],
          totalALiberar: 0
        };
      }
      reservasPorProducto[idProducto].reservas.push(reserva);
      reservasPorProducto[idProducto].totalALiberar += reserva.cantidad_reservada;
    });

    // Procesar cada producto
    for (const [idProducto, data] of Object.entries(reservasPorProducto)) {
      console.log(`\n🔧 Procesando ${data.producto.nombre}...`);
      console.log(`   Stock actual: ${data.producto.stock}`);
      console.log(`   Stock reservado actual: ${data.producto.stock_reservado}`);
      console.log(`   Dosis a liberar: ${data.totalALiberar}`);

      // Usar transacción para asegurar consistencia
      await prisma.$transaction(async (tx) => {
        // 1. Marcar reservas como liberadas
        for (const reserva of data.reservas) {
          await tx.reservaStock.update({
            where: { id_reserva: reserva.id_reserva },
            data: {
              estado_reserva: 'liberada',
              fecha_liberacion: new Date(),
              updated_at: new Date(),
              observaciones: `${reserva.observaciones || ''}\nLiberada automáticamente por cotización eliminada - ${new Date().toLocaleString()}`
            }
          });

          // 2. Registrar movimiento de liberación
          await tx.movimientoStock.create({
            data: {
              id_producto: parseInt(idProducto),
              tipo_movimiento: 'liberacion_reserva',
              cantidad: reserva.cantidad_reservada,
              stock_anterior: data.producto.stock,
              stock_posterior: data.producto.stock, // Stock total no cambia en liberación
              motivo: 'Liberación automática por cotización eliminada',
              observaciones: `Cotización ${reserva.cotizacion.numero_cotizacion} fue eliminada`,
              id_cotizacion: reserva.id_cotizacion,
              id_usuario: 1 // Usuario sistema
            }
          });
        }

        // 3. Actualizar stock_reservado del producto
        const nuevoStockReservado = Math.max(0, data.producto.stock_reservado - data.totalALiberar);
        await tx.producto.update({
          where: { id_producto: parseInt(idProducto) },
          data: {
            stock_reservado: nuevoStockReservado,
            updated_at: new Date()
          }
        });

        console.log(`   ✅ Stock reservado actualizado: ${data.producto.stock_reservado} → ${nuevoStockReservado}`);
      });
    }

    console.log('\n🎉 Liberación completada exitosamente');

    // Mostrar resumen final
    console.log('\n📊 RESUMEN POST-LIBERACIÓN:');
    for (const [idProducto, data] of Object.entries(reservasPorProducto)) {
      const productoActualizado = await prisma.producto.findUnique({
        where: { id_producto: parseInt(idProducto) },
        select: { nombre: true, stock: true, stock_reservado: true }
      });

      console.log(`\n   ${productoActualizado.nombre}:`);
      console.log(`      Stock total: ${productoActualizado.stock}`);
      console.log(`      Stock reservado: ${productoActualizado.stock_reservado}`);
      console.log(`      Stock disponible: ${productoActualizado.stock - productoActualizado.stock_reservado}`);
    }

  } catch (error) {
    console.error('❌ Error durante la liberación de reservas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  liberarReservasCotizacionesEliminadas()
    .then(() => {
      console.log('\n🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { liberarReservasCotizacionesEliminadas };