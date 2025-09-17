const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: []  // Desactivar logs de queries
});

async function diagnosticarReservas() {
  try {
    console.log('=== DIAGNÓSTICO DE RESERVAS DE STOCK ===\n');

    // Buscar cotizaciones recientes
    const cotizaciones = await prisma.cotizacion.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        detalle_cotizacion: {
          include: {
            producto: true
          }
        },
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: true
              }
            }
          }
        },
        reservas_stock: true
      }
    });

    for (const cotizacion of cotizaciones) {
      console.log(`\n--- Cotización ${cotizacion.numero_cotizacion} (ID: ${cotizacion.id_cotizacion}) ---`);
      console.log(`Estado: ${cotizacion.estado}`);
      console.log(`Plan: ${cotizacion.plan.nombre}`);
      
      console.log('\n📋 DETALLE DE COTIZACIÓN:');
      for (const detalle of cotizacion.detalle_cotizacion) {
        console.log(`  • ${detalle.producto.nombre}`);
        console.log(`    - Cantidad total: ${detalle.cantidad_total}`);
        console.log(`    - Dosis por semana: ${detalle.dosis_por_semana}`);
        console.log(`    - Semana inicio: ${detalle.semana_inicio}`);
        console.log(`    - Semana fin: ${detalle.semana_fin || 'No definida'}`);
      }

      console.log('\n📦 PRODUCTOS DEL PLAN ORIGINAL:');
      for (const planProducto of cotizacion.plan.productos_plan) {
        console.log(`  • ${planProducto.producto.nombre}`);
        console.log(`    - Cantidad total: ${planProducto.cantidad_total}`);
        console.log(`    - Dosis por semana: ${planProducto.dosis_por_semana}`);
        console.log(`    - Semana inicio: ${planProducto.semana_inicio}`);
        console.log(`    - Semana fin: ${planProducto.semana_fin || 'No definida'}`);
      }

      console.log('\n🔒 RESERVAS DE STOCK:');
      if (cotizacion.reservas_stock.length > 0) {
        for (const reserva of cotizacion.reservas_stock) {
          console.log(`  • Producto ID: ${reserva.id_producto}`);
          console.log(`    - Cantidad reservada: ${reserva.cantidad_reservada}`);
          console.log(`    - Estado: ${reserva.estado_reserva}`);
          console.log(`    - Fecha: ${reserva.created_at}`);
        }
      } else {
        console.log('  No hay reservas para esta cotización');
      }

      console.log('\n' + '='.repeat(60));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticarReservas();