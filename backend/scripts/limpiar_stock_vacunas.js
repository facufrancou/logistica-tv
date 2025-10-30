const prisma = require('../src/lib/prisma');

async function limpiarStockVacunas() {
  try {
    console.log('🗑️  Iniciando limpieza completa de datos...\n');

    // 1. Eliminar detalles de cotizaciones
    console.log('⏳ Eliminando detalles de cotizaciones...');
    const detallesCotizacion = await prisma.detalleCotizacion.deleteMany({});
    console.log(`✅ ${detallesCotizacion.count} detalles de cotizaciones eliminados\n`);

    // 2. Eliminar cotizaciones
    console.log('⏳ Eliminando cotizaciones...');
    const cotizaciones = await prisma.cotizacion.deleteMany({});
    console.log(`✅ ${cotizaciones.count} cotizaciones eliminadas\n`);

    // 3. Eliminar indicadores de stock de planes
    console.log('⏳ Eliminando indicadores de stock de planes...');
    const indicadores = await prisma.indicadorStockPlan.deleteMany({});
    console.log(`✅ ${indicadores.count} indicadores eliminados\n`);

    // 4. Eliminar vacunas de planes
    console.log('⏳ Eliminando vacunas de planes...');
    const vacunasPlan = await prisma.planVacuna.deleteMany({});
    console.log(`✅ ${vacunasPlan.count} vacunas de planes eliminadas\n`);

    // 5. Eliminar productos de planes
    console.log('⏳ Eliminando productos de planes...');
    const productosPlan = await prisma.planProducto.deleteMany({});
    console.log(`✅ ${productosPlan.count} productos de planes eliminados\n`);

    // 6. Eliminar planes vacunales
    console.log('⏳ Eliminando planes vacunales...');
    const planes = await prisma.planVacunal.deleteMany({});
    console.log(`✅ ${planes.count} planes vacunales eliminados\n`);

    // 7. Eliminar movimientos de stock
    console.log('⏳ Eliminando movimientos de stock...');
    const movimientos = await prisma.movimientoStockVacuna.deleteMany({});
    console.log(`✅ ${movimientos.count} movimientos eliminados\n`);

    // 8. Eliminar stock de vacunas (lotes)
    console.log('⏳ Eliminando lotes de stock...');
    const stock = await prisma.stockVacuna.deleteMany({});
    console.log(`✅ ${stock.count} lotes eliminados\n`);

    console.log('✨ Limpieza completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`- Detalles de cotizaciones: ${detallesCotizacion.count}`);
    console.log(`- Cotizaciones: ${cotizaciones.count}`);
    console.log(`- Indicadores de planes: ${indicadores.count}`);
    console.log(`- Vacunas de planes: ${vacunasPlan.count}`);
    console.log(`- Productos de planes: ${productosPlan.count}`);
    console.log(`- Planes vacunales: ${planes.count}`);
    console.log(`- Movimientos de stock: ${movimientos.count}`);
    console.log(`- Lotes de stock: ${stock.count}`);
    console.log('\n⚠️  Las vacunas, presentaciones y catálogos NO fueron modificados.');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
limpiarStockVacunas()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
