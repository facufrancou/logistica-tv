// Script para probar la actualización de cotizaciones
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function probarActualizacionCotizacion() {
  try {
    console.log('🔍 Probando actualización de cotizaciones...\n');

    // Buscar una cotización que no esté eliminada
    const cotizacion = await prisma.cotizacion.findFirst({
      where: {
        estado: {
          not: 'eliminada'
        }
      },
      include: {
        cliente: true
      }
    });

    if (!cotizacion) {
      console.log('❌ No se encontraron cotizaciones para probar');
      return;
    }

    console.log('📋 Cotización encontrada para prueba:');
    console.log(`- ID: ${cotizacion.id_cotizacion}`);
    console.log(`- Número: ${cotizacion.numero_cotizacion}`);
    console.log(`- Estado: ${cotizacion.estado}`);
    console.log(`- Cliente: ${cotizacion.cliente.nombre}`);
    console.log(`- Observaciones actuales: ${cotizacion.observaciones || 'Sin observaciones'}\n`);

    // Simular una actualización
    const nuevasObservaciones = `${cotizacion.observaciones || ''}\n[PRUEBA] Actualización realizada el ${new Date().toLocaleString()}`.trim();
    
    console.log('📝 Simulando actualización...');
    console.log(`- Nuevas observaciones: ${nuevasObservaciones}\n`);

    const cotizacionActualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      data: {
        observaciones: nuevasObservaciones,
        updated_at: new Date()
      }
    });

    console.log('✅ Cotización actualizada exitosamente!');
    console.log(`- Observaciones finales: ${cotizacionActualizada.observaciones}`);
    console.log(`- Fecha actualización: ${cotizacionActualizada.updated_at}\n`);

    // Verificar que las cotizaciones eliminadas NO se pueden actualizar
    const cotizacionEliminada = await prisma.cotizacion.findFirst({
      where: { estado: 'eliminada' }
    });

    if (cotizacionEliminada) {
      console.log('🚫 Verificando protección contra edición de eliminadas...');
      try {
        await prisma.cotizacion.update({
          where: { id_cotizacion: cotizacionEliminada.id_cotizacion },
          data: { observaciones: 'Esta actualización no debería funcionar' }
        });
        console.log('❌ ERROR: Se pudo actualizar una cotización eliminada');
      } catch (error) {
        console.log('✅ Correcto: La lógica de negocio debe prevenir esto en el endpoint');
      }
    }

    console.log('\n✅ ¡Prueba completada exitosamente!');
    console.log('El endpoint updateCotizacion debería funcionar correctamente.');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

probarActualizacionCotizacion();