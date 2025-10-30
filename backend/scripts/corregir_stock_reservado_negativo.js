const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirStockReservadoNegativo() {
  console.log('🔧 Iniciando corrección de stock reservado negativo...\n');

  try {
    // Buscar todos los stocks donde stock_reservado es negativo o mayor que stock_actual
    const stocksProblematicos = await prisma.stockVacuna.findMany({
      where: {
        OR: [
          {
            stock_reservado: {
              lt: 0
            }
          },
          {
            stock_reservado: {
              gt: prisma.stockVacuna.fields.stock_actual
            }
          }
        ]
      },
      include: {
        vacuna: {
          select: {
            nombre: true,
            presentacion: {
              select: {
                dosis_por_frasco: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Encontrados ${stocksProblematicos.length} lotes con problemas de stock_reservado\n`);

    if (stocksProblematicos.length === 0) {
      console.log('✅ No hay lotes con problemas. Todo está correcto.');
      return;
    }

    for (const stock of stocksProblematicos) {
      const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1000;
      const frascosActuales = Math.floor(stock.stock_actual / dosisPorFrasco);
      const frascosReservados = Math.floor(stock.stock_reservado / dosisPorFrasco);
      
      console.log(`\n📦 Lote: ${stock.lote}`);
      console.log(`   Vacuna: ${stock.vacuna?.nombre || 'Sin nombre'}`);
      console.log(`   ❌ ANTES:`);
      console.log(`      Stock Actual: ${stock.stock_actual} dosis (${frascosActuales} frascos)`);
      console.log(`      Stock Reservado: ${stock.stock_reservado} dosis (${frascosReservados} frascos)`);
      console.log(`      Diferencia: ${stock.stock_reservado - stock.stock_actual} dosis (${frascosReservados - frascosActuales} frascos)`);

      // Si es negativo, ponerlo en 0
      // Si es mayor que stock_actual, ponerlo igual a stock_actual
      let nuevoStockReservado;
      if (stock.stock_reservado < 0) {
        nuevoStockReservado = 0;
        console.log(`   🔧 Corrección: Negativo → 0`);
      } else if (stock.stock_reservado > stock.stock_actual) {
        nuevoStockReservado = stock.stock_actual;
        console.log(`   🔧 Corrección: Mayor que stock_actual → stock_actual`);
      }
      
      await prisma.stockVacuna.update({
        where: { id_stock_vacuna: stock.id_stock_vacuna },
        data: {
          stock_reservado: nuevoStockReservado
        }
      });

      const nuevosFrascosReservados = Math.floor(nuevoStockReservado / dosisPorFrasco);
      
      console.log(`   ✅ DESPUÉS:`);
      console.log(`      Stock Actual: ${stock.stock_actual} dosis (${frascosActuales} frascos)`);
      console.log(`      Stock Reservado: ${nuevoStockReservado} dosis (${nuevosFrascosReservados} frascos)`);
      console.log(`      ✔️ Corregido!`);
    }

    console.log(`\n✅ Corrección completada exitosamente!`);
    console.log(`   ${stocksProblematicos.length} lotes corregidos\n`);

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
corregirStockReservadoNegativo()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
