const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarStock() {
  console.log('🔍 Verificando stock de vacunas...\n');

  try {
    const stocks = await prisma.stockVacuna.findMany({
      where: {
        vacuna: {
          nombre: {
            contains: '9-R 1000DS'
          }
        }
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
      },
      orderBy: {
        lote: 'asc'
      }
    });

    console.log(`📦 Encontrados ${stocks.length} lotes\n`);

    for (const stock of stocks) {
      const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1000;
      const frascosActuales = Math.floor(stock.stock_actual / dosisPorFrasco);
      const frascosReservados = Math.floor(stock.stock_reservado / dosisPorFrasco);
      const frascosDisponibles = frascosActuales - frascosReservados;

      console.log(`\n📦 Lote: ${stock.lote}`);
      console.log(`   Stock Actual: ${stock.stock_actual} dosis (${frascosActuales} frascos)`);
      console.log(`   Stock Reservado: ${stock.stock_reservado} dosis (${frascosReservados} frascos)`);
      console.log(`   Stock Disponible: ${stock.stock_actual - stock.stock_reservado} dosis (${frascosDisponibles} frascos)`);
      
      if (stock.stock_reservado < 0) {
        console.log(`   ⚠️  PROBLEMA: Stock reservado es NEGATIVO!`);
      }
      if (stock.stock_reservado > stock.stock_actual) {
        console.log(`   ⚠️  PROBLEMA: Stock reservado es MAYOR que stock actual!`);
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verificarStock()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
