const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarStock() {
  console.log('🔍 Verificando estado del stock de vacunas...\n');

  try {
    // 1. Verificar si hay vacunas
    const totalVacunas = await prisma.vacuna.count();
    console.log(`📊 Total de vacunas en la base de datos: ${totalVacunas}`);

    if (totalVacunas === 0) {
      console.log('❌ No hay vacunas en la base de datos');
      return;
    }

    // 2. Verificar si hay stock de vacunas
    const totalStock = await prisma.stockVacuna.count();
    console.log(`📦 Total de registros de stock: ${totalStock}\n`);

    if (totalStock === 0) {
      console.log('❌ No hay registros de stock para las vacunas');
      console.log('💡 Necesitas crear registros de stock para las vacunas importadas\n');
      
      // Mostrar algunas vacunas disponibles
      const vacunasMuestra = await prisma.vacuna.findMany({
        take: 5,
        include: {
          proveedor: true,
          patologia: true,
          presentacion: true
        }
      });

      console.log('📋 Algunas vacunas disponibles para crear stock:');
      vacunasMuestra.forEach(vacuna => {
        console.log(`   - ${vacuna.codigo}: ${vacuna.nombre} (${vacuna.proveedor.nombre})`);
      });

    } else {
      // Mostrar resumen del stock existente
      const stockResumen = await prisma.stockVacuna.findMany({
        include: {
          vacuna: {
            include: {
              proveedor: true,
              patologia: true
            }
          }
        },
        take: 10
      });

      console.log('📦 Resumen del stock existente:');
      stockResumen.forEach(stock => {
        console.log(`   - ${stock.vacuna.codigo}: ${stock.lote} - Stock: ${stock.stock_actual} - Vence: ${stock.fecha_vencimiento.toLocaleDateString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verificando stock:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
if (require.main === module) {
  verificarStock()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { verificarStock };