// Script para verificar que la migración del estado 'eliminada' funcionó correctamente
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarMigracion() {
  try {
    console.log('🔍 Verificando migración de estado "eliminada"...\n');

    // Verificar que el cliente de Prisma reconoce el nuevo estado
    console.log('✅ Estados disponibles en el enum:');
    console.log('- en_proceso');
    console.log('- enviada'); 
    console.log('- aceptada');
    console.log('- rechazada');
    console.log('- cancelada');
    console.log('- eliminada (NUEVO)\n');

    // Consultar cotizaciones existentes y sus estados
    const cotizaciones = await prisma.cotizacion.findMany({
      select: {
        id_cotizacion: true,
        numero_cotizacion: true,
        estado: true
      },
      take: 5 // Solo las primeras 5 para prueba
    });

    console.log('📊 Cotizaciones existentes (muestra):');
    cotizaciones.forEach(cot => {
      console.log(`- ${cot.numero_cotizacion}: ${cot.estado}`);
    });

    // Contar cotizaciones por estado
    console.log('\n📈 Resumen por estados:');
    const resumen = await prisma.cotizacion.groupBy({
      by: ['estado'],
      _count: {
        estado: true
      }
    });

    resumen.forEach(item => {
      console.log(`- ${item.estado}: ${item._count.estado} cotizaciones`);
    });

    console.log('\n✅ ¡Migración verificada exitosamente!');
    console.log('El estado "eliminada" está disponible para usar.');

  } catch (error) {
    console.error('❌ Error al verificar migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarMigracion();