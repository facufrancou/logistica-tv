const prisma = require('../src/lib/prisma');

async function probarNuevaLogicaStock() {
  console.log('=== PROBANDO NUEVA LÓGICA CON DATOS DEL PLAN ===\n');

  try {
    // Buscar producto AD140001
    const producto = await prisma.producto.findFirst({
      where: { nombre: 'AD140001' },
      select: {
        id_producto: true,
        nombre: true,
        stock: true,
        requiere_control_stock: true
      }
    });

    if (!producto) {
      console.log('❌ Producto AD140001 no encontrado');
      return;
    }

    console.log(`Producto: ${producto.nombre} (ID: ${producto.id_producto})`);
    console.log(`Stock actual: ${producto.stock}`);

    // Obtener cotizaciones activas usando la nueva lógica
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
        }
      },
      include: {
        plan: {
          include: {
            productos_plan: {
              where: {
                id_producto: producto.id_producto
              },
              include: {
                producto: {
                  select: {
                    id_producto: true,
                    nombre: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`\nCotizaciones activas encontradas: ${cotizacionesActivas.length}`);

    // Calcular usando la nueva lógica
    let totalReservado = 0;
    let totalAfectado = 0;

    cotizacionesActivas.forEach(cotizacion => {
      console.log(`\n  ${cotizacion.numero_cotizacion} (${cotizacion.estado}):`);
      
      cotizacion.plan.productos_plan.forEach(planProducto => {
        const dosisNecesarias = planProducto.cantidad_total * planProducto.dosis_por_semana;
        console.log(`    - ${planProducto.producto.nombre}: ${planProducto.cantidad_total} × ${planProducto.dosis_por_semana} = ${dosisNecesarias} dosis`);
        
        if (cotizacion.estado === 'en_proceso' || cotizacion.estado === 'enviada') {
          totalReservado += dosisNecesarias;
          console.log(`      → RESERVADO: +${dosisNecesarias}`);
        } else if (cotizacion.estado === 'aceptada') {
          totalAfectado += dosisNecesarias;
          console.log(`      → AFECTADO: +${dosisNecesarias}`);
        }
      });
    });

    console.log(`\n=== RESULTADO CORRECTO ===`);
    console.log(`Stock Total: ${producto.stock}`);
    console.log(`Stock Reservado: ${totalReservado}`);
    console.log(`Stock Afectado: ${totalAfectado}`);
    console.log(`Total Comprometido: ${totalReservado + totalAfectado}`);
    console.log(`Stock Disponible: ${Math.max(0, producto.stock - (totalReservado + totalAfectado))}`);
    
    const faltante = Math.max(0, (totalReservado + totalAfectado) - producto.stock);
    console.log(`Stock Faltante: ${faltante}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
probarNuevaLogicaStock();