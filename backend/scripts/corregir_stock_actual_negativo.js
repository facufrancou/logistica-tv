const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirStockActualNegativo() {
  try {
    console.log('🔧 Iniciando corrección de stock_actual negativo...\n');

    // Buscar lotes con stock_actual negativo
    const lotesProblematicos = await prisma.stockVacuna.findMany({
      where: {
        stock_actual: { lt: 0 }
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

    if (lotesProblematicos.length === 0) {
      console.log('✅ No se encontraron problemas de stock_actual negativo\n');
      return;
    }

    console.log(`📊 Encontrados ${lotesProblematicos.length} lotes con stock_actual negativo\n\n`);

    const lotesCorregidos = [];

    for (const lote of lotesProblematicos) {
      const dosisPorFrasco = lote.vacuna?.presentacion?.dosis_por_frasco || 1000;
      
      console.log(`📦 Lote: ${lote.lote}`);
      console.log(`   Vacuna: ${lote.vacuna?.nombre || 'Desconocida'}`);
      console.log(`   ❌ ANTES:`);
      console.log(`      Stock Actual: ${lote.stock_actual} dosis (${Math.floor(lote.stock_actual / dosisPorFrasco)} frascos)`);
      console.log(`      Stock Reservado: ${lote.stock_reservado} dosis (${Math.floor(lote.stock_reservado / dosisPorFrasco)} frascos)`);

      // Corregir a 0 (no hay stock físico)
      const nuevoStockActual = 0;
      const nuevoStockReservado = 0; // Si no hay stock físico, tampoco puede haber reserva

      await prisma.stockVacuna.update({
        where: { id_stock_vacuna: lote.id_stock_vacuna },
        data: {
          stock_actual: nuevoStockActual,
          stock_reservado: nuevoStockReservado
        }
      });

      console.log(`   🔧 Corrección: Stock negativo → 0`);
      console.log(`   ✅ DESPUÉS:`);
      console.log(`      Stock Actual: ${nuevoStockActual} dosis (${Math.floor(nuevoStockActual / dosisPorFrasco)} frascos)`);
      console.log(`      Stock Reservado: ${nuevoStockReservado} dosis (${Math.floor(nuevoStockReservado / dosisPorFrasco)} frascos)`);
      console.log(`      ✔️ Corregido!\n`);

      lotesCorregidos.push({
        lote: lote.lote,
        vacuna: lote.vacuna?.nombre,
        stock_anterior: lote.stock_actual,
        stock_nuevo: nuevoStockActual
      });
    }

    console.log(`✅ Corrección completada exitosamente!`);
    console.log(`   ${lotesCorregidos.length} lotes corregidos\n`);

    console.log('🎉 Proceso completado');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

corregirStockActualNegativo();
