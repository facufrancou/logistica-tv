const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarCotizaciones() {
  console.log('🔍 Verificando cotizaciones disponibles...\n');

  try {
    // Obtener todas las cotizaciones
    const cotizaciones = await prisma.cotizacion.findMany({
      take: 5,
      include: {
        cliente: true
      }
    });

    if (cotizaciones.length === 0) {
      console.log('❌ No se encontraron cotizaciones en la base de datos');
      return;
    }

    console.log(`✅ Se encontraron ${cotizaciones.length} cotizaciones:`);
    cotizaciones.forEach(cot => {
      console.log(`   - ID: ${cot.id_cotizacion}, Número: ${cot.numero_cotizacion}, Cliente: ${cot.cliente?.nombre || 'N/A'}, Estado: ${cot.estado}`);
    });

    // Verificar si alguna tiene calendario
    console.log('\n🗓️ Verificando calendarios existentes...');
    for (const cot of cotizaciones) {
      const calendarios = await prisma.calendarioVacunacion.findMany({
        where: { id_cotizacion: cot.id_cotizacion },
        take: 3,
        include: { producto: true }
      });

      if (calendarios.length > 0) {
        console.log(`   - Cotización ${cot.id_cotizacion} tiene ${calendarios.length} calendario(s):`);
        calendarios.forEach(cal => {
          console.log(`     * ID: ${cal.id_calendario}, Producto: ${cal.producto?.nombre || 'N/A'}, Semana: ${cal.numero_semana}`);
        });
      } else {
        console.log(`   - Cotización ${cot.id_cotizacion} no tiene calendarios`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarCotizaciones();