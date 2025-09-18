const prisma = require('../src/lib/prisma');

async function verificarDatosDetalleCotizaciones() {
  console.log('=== VERIFICANDO DATOS DETALLADOS DE COTIZACIONES ===\n');

  try {
    // Obtener las 3 cotizaciones con todos sus detalles
    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        numero_cotizacion: {
          in: ['COT-250916-512', 'COT-250916-486', 'COT-250916-663']
        }
      },
      include: {
        cliente: {
          select: { nombre: true }
        },
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: {
                  select: { nombre: true }
                }
              }
            }
          }
        },
        detalle_cotizacion: {
          include: {
            producto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    cotizaciones.forEach(cot => {
      console.log(`\n=== ${cot.numero_cotizacion} (${cot.estado}) - ${cot.cliente.nombre} ===`);
      
      console.log('\nPLAN VACUNAL:');
      console.log(`  Nombre: ${cot.plan.nombre}`);
      console.log(`  Duración: ${cot.plan.duracion_semanas} semanas`);
      
      console.log('\nPRODUCTOS DEL PLAN:');
      cot.plan.productos_plan.forEach(pp => {
        console.log(`  - ${pp.producto.nombre}:`);
        console.log(`    cantidad_total: ${pp.cantidad_total}`);
        console.log(`    dosis_por_semana: ${pp.dosis_por_semana}`);
        console.log(`    semana_inicio: ${pp.semana_inicio}`);
        console.log(`    semana_fin: ${pp.semana_fin || 'N/A'}`);
        
        // Calculando como lo hace el sistema actual
        const dosisCalculadasActual = pp.cantidad_total * pp.dosis_por_semana;
        console.log(`    → Dosis calculadas (actual): ${dosisCalculadasActual}`);
        
        // Calculando como debería ser (cantidad_total podría ser el total de dosis)
        console.log(`    → ¿Es cantidad_total el total de dosis? ${pp.cantidad_total}`);
      });
      
      console.log('\nDETALLE DE COTIZACIÓN:');
      cot.detalle_cotizacion.forEach(detalle => {
        console.log(`  - ${detalle.producto.nombre}:`);
        console.log(`    cantidad_total: ${detalle.cantidad_total}`);
        console.log(`    dosis_por_semana: ${detalle.dosis_por_semana}`);
        console.log(`    semana_inicio: ${detalle.semana_inicio}`);
        console.log(`    semana_fin: ${detalle.semana_fin || 'N/A'}`);
        
        // Cálculo actual
        const dosisActual = detalle.cantidad_total * detalle.dosis_por_semana;
        console.log(`    → Dosis calculadas (actual): ${dosisActual}`);
        
        // Posibles interpretaciones
        console.log(`    → Si cantidad_total son dosis totales: ${detalle.cantidad_total}`);
        console.log(`    → Si son semanas × dosis/semana: ${detalle.cantidad_total * detalle.dosis_por_semana}`);
        
        if (detalle.semana_fin) {
          const semanasDuracion = detalle.semana_fin - detalle.semana_inicio + 1;
          console.log(`    → Si duración real: ${semanasDuracion} semanas × ${detalle.dosis_por_semana} dosis = ${semanasDuracion * detalle.dosis_por_semana}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
verificarDatosDetalleCotizaciones();