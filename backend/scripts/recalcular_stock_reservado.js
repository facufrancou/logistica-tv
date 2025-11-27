/**
 * Script para recalcular stock_reservado basándose en las asignaciones reales del calendario
 * 
 * El stock_reservado debe reflejar SOLO las dosis que están asignadas en calendario_vacunacion
 * con estado != 'aplicada' (las aplicadas ya salieron del stock)
 * 
 * Ejecutar: node scripts/recalcular_stock_reservado.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalcularStockReservado() {
  console.log('=== RECALCULAR STOCK RESERVADO ===\n');
  
  try {
    // 1. Obtener todos los stocks de vacunas
    const todosLosStocks = await prisma.stockVacuna.findMany({
      include: {
        vacuna: {
          select: { nombre: true, codigo: true }
        }
      }
    });

    console.log(`Total de lotes en stock: ${todosLosStocks.length}\n`);

    let corregidos = 0;
    let sinCambios = 0;

    for (const stock of todosLosStocks) {
      // 2. Calcular el stock_reservado REAL desde calendario_vacunacion
      // Solo contar las dosis que están asignadas a este lote y NO están aplicadas
      const reservasReales = await prisma.calendarioVacunacion.aggregate({
        where: {
          id_stock_vacuna: stock.id_stock_vacuna,
          estado_dosis: { not: 'aplicada' } // Solo pendientes/programadas
        },
        _sum: {
          cantidad_dosis: true
        }
      });

      const stockReservadoReal = reservasReales._sum.cantidad_dosis || 0;
      const stockReservadoActual = stock.stock_reservado || 0;

      if (stockReservadoReal !== stockReservadoActual) {
        console.log(`❌ INCONSISTENCIA en lote ${stock.lote} (${stock.vacuna?.nombre || 'Sin nombre'}):`);
        console.log(`   stock_reservado actual: ${stockReservadoActual} dosis`);
        console.log(`   stock_reservado real:   ${stockReservadoReal} dosis`);
        console.log(`   Diferencia: ${stockReservadoActual - stockReservadoReal} dosis`);

        // Corregir
        await prisma.stockVacuna.update({
          where: { id_stock_vacuna: stock.id_stock_vacuna },
          data: { stock_reservado: stockReservadoReal }
        });

        console.log(`   ✅ CORREGIDO: stock_reservado = ${stockReservadoReal}\n`);
        corregidos++;
      } else {
        sinCambios++;
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Lotes corregidos: ${corregidos}`);
    console.log(`Lotes sin cambios: ${sinCambios}`);
    console.log(`Total procesados: ${todosLosStocks.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalcularStockReservado();
