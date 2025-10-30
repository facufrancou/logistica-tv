const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirStockReservado() {
  try {
    console.log('🔧 Iniciando corrección de stock_actual y stock_reservado...\n');

    // Obtener todos los lotes con stock
    const stocks = await prisma.stockVacuna.findMany({
      include: {
        vacuna: {
          select: {
            nombre: true
          }
        }
      }
    });

    console.log(`📦 Se encontraron ${stocks.length} lotes de stock\n`);

    let corregidos = 0;

    for (const stock of stocks) {
      const stockActualAnterior = stock.stock_actual;
      const stockReservadoAnterior = stock.stock_reservado || 0;
      
      // Calcular el stock total real (lo que físicamente hay en depósito)
      const stockTotalReal = stockActualAnterior + stockReservadoAnterior;
      
      // Si el stock_actual es diferente al total real, necesita corrección
      if (stockActualAnterior !== stockTotalReal) {
        console.log(`📝 Corrigiendo lote ${stock.lote} - ${stock.vacuna.nombre}`);
        console.log(`   Anterior: stock_actual=${stockActualAnterior}, stock_reservado=${stockReservadoAnterior}`);
        console.log(`   Nuevo:    stock_actual=${stockTotalReal}, stock_reservado=${stockReservadoAnterior}`);
        
        await prisma.stockVacuna.update({
          where: { id_stock_vacuna: stock.id_stock_vacuna },
          data: {
            stock_actual: stockTotalReal
          }
        });
        
        corregidos++;
        console.log(`   ✅ Corregido\n`);
      } else {
        console.log(`✓ Lote ${stock.lote} - ${stock.vacuna.nombre} ya está correcto`);
      }
    }

    console.log(`\n✅ Proceso completado`);
    console.log(`   Total lotes: ${stocks.length}`);
    console.log(`   Lotes corregidos: ${corregidos}`);
    console.log(`   Lotes sin cambios: ${stocks.length - corregidos}`);

    console.log('\n📊 Verificación final:');
    const stocksVerificacion = await prisma.stockVacuna.findMany({
      select: {
        lote: true,
        stock_actual: true,
        stock_reservado: true,
        vacuna: {
          select: {
            nombre: true
          }
        }
      }
    });

    for (const s of stocksVerificacion) {
      const disponible = s.stock_actual - s.stock_reservado;
      console.log(`   ${s.vacuna.nombre} (${s.lote}):`);
      console.log(`     Stock Total: ${s.stock_actual} dosis`);
      console.log(`     Reservado: ${s.stock_reservado} dosis`);
      console.log(`     Disponible: ${disponible} dosis`);
      
      if (s.stock_reservado > s.stock_actual) {
        console.log(`     ⚠️  ADVERTENCIA: Reservado mayor que total!`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error al corregir stock:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

corregirStockReservado();
