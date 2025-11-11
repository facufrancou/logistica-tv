const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiarPlanesCotizaciones() {
  try {
    console.log('🗑️  Iniciando limpieza de planes y cotizaciones...\n');

    // 1. Eliminar cotizaciones (esto eliminará en cascada calendarios, detalles, etc.)
    console.log('📋 Eliminando cotizaciones...');
    const cotizacionesEliminadas = await prisma.cotizacion.deleteMany({});
    console.log(`   ✅ ${cotizacionesEliminadas.count} cotizaciones eliminadas`);

    // 2. Eliminar planes vacunales (esto eliminará en cascada plan_vacuna)
    console.log('📅 Eliminando planes vacunales...');
    const planesEliminados = await prisma.planVacunal.deleteMany({});
    console.log(`   ✅ ${planesEliminados.count} planes vacunales eliminados`);

    console.log('\n✅ Limpieza completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Cotizaciones eliminadas: ${cotizacionesEliminadas.count}`);
    console.log(`   - Planes vacunales eliminados: ${planesEliminados.count}`);
    console.log('\n⚠️  NOTA: El stock y movimientos de vacunas NO fueron modificados');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

limpiarPlanesCotizaciones();
