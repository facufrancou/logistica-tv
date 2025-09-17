const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCotizaciones() {
  try {
    console.log('🔍 Verificando cotizaciones en la base de datos...');
    
    // Obtener todas las cotizaciones
    const cotizaciones = await prisma.cotizacion.findMany({
      select: {
        id_cotizacion: true,
        numero_cotizacion: true,
        estado: true,
        cliente: {
          select: {
            nombre: true
          }
        }
      },
      take: 5 // Solo las primeras 5 para testing
    });
    
    if (cotizaciones.length === 0) {
      console.log('❌ No hay cotizaciones en la base de datos');
      return;
    }
    
    console.log(`✅ Encontradas ${cotizaciones.length} cotizaciones:`);
    cotizaciones.forEach(cot => {
      console.log(`  - ID: ${cot.id_cotizacion}, Número: ${cot.numero_cotizacion}, Estado: ${cot.estado}, Cliente: ${cot.cliente?.nombre || 'N/A'}`);
    });
    
    // Probar obtener una cotización específica
    const primeraId = cotizaciones[0].id_cotizacion;
    console.log(`\n🧪 Probando obtener cotización con ID: ${primeraId}`);
    
    const cotizacionDetalle = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: primeraId },
      include: {
        cliente: true,
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: true
              }
            }
          }
        },
        lista_precio: true,
        detalle_cotizacion: {
          include: {
            producto: true
          }
        },
        calendario_vacunacion: {
          include: {
            producto: {
              select: {
                nombre: true
              }
            }
          },
          orderBy: [
            { numero_semana: 'asc' },
            { producto: { nombre: 'asc' } }
          ]
        }
      }
    });
    
    if (cotizacionDetalle) {
      console.log(`✅ Cotización obtenida exitosamente:`);
      console.log(`  - ID: ${cotizacionDetalle.id_cotizacion}`);
      console.log(`  - Cliente: ${cotizacionDetalle.cliente?.nombre || 'N/A'}`);
      console.log(`  - Plan: ${cotizacionDetalle.plan?.nombre || 'N/A'}`);
      console.log(`  - Productos en plan: ${cotizacionDetalle.plan?.productos_plan?.length || 0}`);
      console.log(`  - Detalles: ${cotizacionDetalle.detalle_cotizacion?.length || 0}`);
      console.log(`  - Calendario: ${cotizacionDetalle.calendario_vacunacion?.length || 0} dosis`);
    } else {
      console.log(`❌ No se pudo obtener la cotización con ID: ${primeraId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCotizaciones();