// Script para reactivar una cotización para hacer pruebas
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reactivarCotizacionParaPruebas() {
  try {
    console.log('🔄 Reactivando una cotización para pruebas...\n');

    // Buscar una cotización eliminada
    const cotizacionEliminada = await prisma.cotizacion.findFirst({
      where: { estado: 'eliminada' },
      include: { cliente: true }
    });

    if (!cotizacionEliminada) {
      console.log('❌ No se encontraron cotizaciones eliminadas');
      return;
    }

    console.log('📋 Cotización a reactivar:');
    console.log(`- ID: ${cotizacionEliminada.id_cotizacion}`);
    console.log(`- Número: ${cotizacionEliminada.numero_cotizacion}`);
    console.log(`- Cliente: ${cotizacionEliminada.cliente.nombre}\n`);

    // Reactivar como 'en_proceso'
    const cotizacionReactivada = await prisma.cotizacion.update({
      where: { id_cotizacion: cotizacionEliminada.id_cotizacion },
      data: {
        estado: 'en_proceso',
        observaciones: `${cotizacionEliminada.observaciones || ''}\n[REACTIVADA] ${new Date().toLocaleString()}: Reactivada para pruebas de edición - Estado: en_proceso`.trim(),
        updated_at: new Date()
      }
    });

    console.log('✅ Cotización reactivada exitosamente!');
    console.log(`- Nuevo estado: ${cotizacionReactivada.estado}`);
    console.log(`- Observaciones: ${cotizacionReactivada.observaciones}\n`);

    console.log('🎯 Ahora puedes probar editar esta cotización desde el frontend');
    console.log(`- Número de cotización: ${cotizacionReactivada.numero_cotizacion}`);

  } catch (error) {
    console.error('❌ Error reactivando cotización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reactivarCotizacionParaPruebas();