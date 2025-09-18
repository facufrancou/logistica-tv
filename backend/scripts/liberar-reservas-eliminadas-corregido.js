const prisma = require('../src/lib/prisma');
const { registrarMovimientoStock } = require('../src/controllers/stock.controller');

async function liberarReservasEliminadas() {
  try {
    console.log('=== LIBERANDO RESERVAS DE COTIZACIONES ELIMINADAS ===\n');

    // 1. Buscar reservas activas de cotizaciones eliminadas
    console.log('1. BUSCANDO RESERVAS PROBLEMÁTICAS...');
    const reservasProblematicas = await prisma.reservaStock.findMany({
      where: { 
        estado_reserva: 'activa',
        cotizacion: {
          estado: 'eliminada'
        }
      },
      include: {
        producto: { select: { nombre: true, id_producto: true } },
        cotizacion: { select: { numero_cotizacion: true, estado: true, id_cotizacion: true } }
      }
    });

    console.log(`❌ Encontradas ${reservasProblematicas.length} reservas activas de cotizaciones eliminadas:`);
    
    const resumenProblemas = {};
    let totalDosisProblema = 0;
    
    reservasProblematicas.forEach(r => {
      const key = `${r.producto.id_producto}-${r.producto.nombre}`;
      if (!resumenProblemas[key]) {
        resumenProblemas[key] = { producto: r.producto, cantidad: 0, cotizaciones: new Set() };
      }
      resumenProblemas[key].cantidad += r.cantidad_reservada;
      resumenProblemas[key].cotizaciones.add(r.cotizacion.numero_cotizacion);
      totalDosisProblema += r.cantidad_reservada;
      console.log(`  - ${r.producto.nombre}: ${r.cantidad_reservada} dosis (Cotización: ${r.cotizacion.numero_cotizacion})`);
    });

    console.log(`\n📊 RESUMEN DEL PROBLEMA:`);
    console.log(`   Total dosis incorrectamente reservadas: ${totalDosisProblema}`);
    Object.values(resumenProblemas).forEach(item => {
      console.log(`   - ${item.producto.nombre}: ${item.cantidad} dosis en ${item.cotizaciones.size} cotizaciones`);
    });

    if (reservasProblematicas.length === 0) {
      console.log('✅ No se encontraron reservas problemáticas.');
      return;
    }

    // 2. Confirmar acción
    console.log(`\n🔧 PROCEDIENDO A LIBERAR ${reservasProblematicas.length} RESERVAS...`);
    
    let reservasLiberadas = 0;
    let movimientosCreados = 0;

    // 3. Liberar cada reserva
    for (const reserva of reservasProblematicas) {
      try {
        console.log(`\n  Liberando reserva ID ${reserva.id_reserva}:`);
        console.log(`    Producto: ${reserva.producto.nombre} (${reserva.cantidad_reservada} dosis)`);
        console.log(`    Cotización: ${reserva.cotizacion.numero_cotizacion}`);

        // Actualizar estado de la reserva
        await prisma.reservaStock.update({
          where: { id_reserva: reserva.id_reserva },
          data: { 
            estado_reserva: 'liberada',
            fecha_liberacion: new Date(),
            observaciones: `Liberada automáticamente - cotización eliminada (${reserva.cotizacion.numero_cotizacion})`
          }
        });

        reservasLiberadas++;
        console.log(`    ✅ Reserva actualizada`);

        // Registrar movimiento de stock
        try {
          await registrarMovimientoStock(
            reserva.id_producto,
            'liberacion_reserva',
            reserva.cantidad_reservada,
            'Liberación automática de reserva de cotización eliminada',
            `Cotización eliminada: ${reserva.cotizacion.numero_cotizacion}`,
            reserva.id_cotizacion,
            1 // Usuario sistema
          );
          movimientosCreados++;
          console.log(`    ✅ Movimiento de stock registrado`);
        } catch (movError) {
          console.log(`    ⚠️  Error registrando movimiento: ${movError.message}`);
        }

      } catch (reservaError) {
        console.log(`    ❌ Error liberando reserva: ${reservaError.message}`);
      }
    }

    console.log(`\n📈 RESULTADOS:`);
    console.log(`   ✅ Reservas liberadas: ${reservasLiberadas}/${reservasProblematicas.length}`);
    console.log(`   ✅ Movimientos de stock creados: ${movimientosCreados}/${reservasProblematicas.length}`);

    // 4. Verificar resultado final
    console.log(`\n4. VERIFICANDO RESULTADO FINAL...`);
    const reservasActivasRestantes = await prisma.reservaStock.findMany({
      where: { 
        estado_reserva: 'activa',
        cotizacion: {
          estado: 'eliminada'
        }
      }
    });

    if (reservasActivasRestantes.length === 0) {
      console.log(`✅ ÉXITO: No quedan reservas activas de cotizaciones eliminadas.`);
    } else {
      console.log(`⚠️  ATENCIÓN: Aún quedan ${reservasActivasRestantes.length} reservas activas de cotizaciones eliminadas.`);
    }

    // 5. Mostrar stock actualizado
    console.log(`\n5. STOCK ACTUALIZADO:`);
    for (const [key, item] of Object.entries(resumenProblemas)) {
      const producto = await prisma.producto.findUnique({
        where: { id_producto: item.producto.id_producto },
        select: { 
          nombre: true, 
          stock: true, 
          stock_reservado: true, 
          stock_minimo: true 
        }
      });

      if (producto) {
        const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
        console.log(`\n   ${producto.nombre}:`);
        console.log(`     Stock total: ${producto.stock || 0}`);
        console.log(`     Stock reservado: ${producto.stock_reservado || 0}`);
        console.log(`     Stock disponible: ${stockDisponible}`);
        console.log(`     Stock mínimo: ${producto.stock_minimo || 0}`);
      }
    }

    console.log(`\n✅ PROCESO COMPLETADO`);

  } catch (error) {
    console.error('❌ Error durante la liberación:', error);
  }
}

if (require.main === module) {
  liberarReservasEliminadas();
}

module.exports = { liberarReservasEliminadas };