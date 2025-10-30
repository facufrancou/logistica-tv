const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirReservasNegativas() {
  try {
    console.log('🔧 Corrigiendo reservas negativas...\n');

    const stocksNegativos = await prisma.stockVacuna.findMany({
      where: {
        stock_reservado: {
          lt: 0
        }
      },
      include: {
        vacuna: {
          select: {
            nombre: true
          }
        }
      }
    });

    console.log(`📦 Encontrados ${stocksNegativos.length} lotes con reservas negativas\n`);

    for (const stock of stocksNegativos) {
      console.log(`📝 Corrigiendo ${stock.vacuna.nombre} (${stock.lote})`);
      console.log(`   Reservado anterior: ${stock.stock_reservado}`);
      console.log(`   Stock actual: ${stock.stock_actual}`);
      
      // Establecer reservado en 0 (no puede haber reservas negativas)
      await prisma.stockVacuna.update({
        where: { id_stock_vacuna: stock.id_stock_vacuna },
        data: {
          stock_reservado: 0
        }
      });
      
      console.log(`   ✅ Reservado corregido a 0\n`);
    }

    console.log('✅ Corrección completada');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

corregirReservasNegativas();
