const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiarTodo() {
  try {
    console.log('🗑️  Iniciando limpieza de planes, cotizaciones y stock...\n');

    // 1. Eliminar cotizaciones (esto eliminará en cascada calendarios, detalles, etc.)
    console.log('📋 Eliminando cotizaciones...');
    const cotizacionesEliminadas = await prisma.cotizacion.deleteMany({});
    console.log(`   ✅ ${cotizacionesEliminadas.count} cotizaciones eliminadas`);

    // 2. Eliminar movimientos de stock de vacunas
    console.log('📦 Eliminando movimientos de stock de vacunas...');
    const movimientosEliminados = await prisma.movimientoStockVacuna.deleteMany({});
    console.log(`   ✅ ${movimientosEliminados.count} movimientos eliminados`);

    // 3. Eliminar stock de vacunas
    console.log('💉 Eliminando stock de vacunas...');
    const stockEliminado = await prisma.stockVacuna.deleteMany({});
    console.log(`   ✅ ${stockEliminado.count} lotes de stock eliminados`);

    // 4. Eliminar planes vacunales (esto eliminará en cascada plan_vacuna)
    console.log('📅 Eliminando planes vacunales...');
    const planesEliminados = await prisma.planVacunal.deleteMany({});
    console.log(`   ✅ ${planesEliminados.count} planes vacunales eliminados`);

    // 5. Resetear stock de productos
    console.log('🔄 Reseteando stock de productos...');
    const productosActualizados = await prisma.producto.updateMany({
      data: {
        stock: 0,
        stock_reservado: 0
      }
    });
    console.log(`   ✅ ${productosActualizados.count} productos reseteados`);

    console.log('\n✅ Limpieza completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Cotizaciones eliminadas: ${cotizacionesEliminadas.count}`);
    console.log(`   - Movimientos de stock eliminados: ${movimientosEliminados.count}`);
    console.log(`   - Lotes de stock eliminados: ${stockEliminado.count}`);
    console.log(`   - Planes vacunales eliminados: ${planesEliminados.count}`);
    console.log(`   - Productos reseteados: ${productosActualizados.count}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

limpiarTodo();
