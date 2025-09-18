const prisma = require('../src/lib/prisma');

async function verificarStockAD140001() {
  console.log('=== VERIFICANDO AD140001 ESPECÍFICAMENTE ===\n');

  try {
    // 1. Verificar producto AD140001
    const producto = await prisma.producto.findFirst({
      where: { nombre: 'AD140001' },
      select: {
        id_producto: true,
        nombre: true,
        stock: true,
        stock_reservado: true,
        requiere_control_stock: true
      }
    });

    if (!producto) {
      console.log('❌ Producto AD140001 no encontrado');
      return;
    }

    console.log('Producto AD140001:');
    console.log(`  ID: ${producto.id_producto}`);
    console.log(`  Stock: ${producto.stock}`);
    console.log(`  Stock Reservado: ${producto.stock_reservado}`);
    console.log(`  Requiere Control: ${producto.requiere_control_stock}`);

    // 2. Verificar cotizaciones que incluyen este producto
    const cotizacionesConAD140001 = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
        },
        detalle_cotizacion: {
          some: {
            id_producto: producto.id_producto
          }
        }
      },
      include: {
        detalle_cotizacion: {
          where: {
            id_producto: producto.id_producto
          }
        }
      }
    });

    console.log(`\nCotizaciones que incluyen AD140001: ${cotizacionesConAD140001.length}`);

    let totalReservado = 0;
    let totalAfectado = 0;

    cotizacionesConAD140001.forEach(cot => {
      console.log(`\n  - ${cot.numero_cotizacion} (${cot.estado}):`);
      
      cot.detalle_cotizacion.forEach(detalle => {
        const dosisNecesarias = detalle.cantidad_total * detalle.dosis_por_semana;
        console.log(`    Cantidad: ${detalle.cantidad_total} × ${detalle.dosis_por_semana} = ${dosisNecesarias} dosis`);
        
        if (cot.estado === 'en_proceso' || cot.estado === 'enviada') {
          totalReservado += dosisNecesarias;
          console.log(`    → RESERVADO: +${dosisNecesarias}`);
        } else if (cot.estado === 'aceptada') {
          totalAfectado += dosisNecesarias;
          console.log(`    → AFECTADO: +${dosisNecesarias}`);
        }
      });
    });

    console.log(`\n=== TOTALES CALCULADOS ===`);
    console.log(`Stock Total: ${producto.stock}`);
    console.log(`Stock Reservado (en proceso + enviada): ${totalReservado}`);
    console.log(`Stock Afectado (aceptada): ${totalAfectado}`);
    console.log(`Total Comprometido: ${totalReservado + totalAfectado}`);
    console.log(`Stock Disponible: ${Math.max(0, producto.stock - (totalReservado + totalAfectado))}`);

    const faltante = Math.max(0, (totalReservado + totalAfectado) - producto.stock);
    console.log(`Stock Faltante: ${faltante}`);

    // 3. Verificar reservas existentes en la tabla
    const reservasExistentes = await prisma.reservaStock.findMany({
      where: {
        id_producto: producto.id_producto,
        estado_reserva: 'activa'
      },
      include: {
        cotizacion: {
          select: {
            numero_cotizacion: true,
            estado: true
          }
        }
      }
    });

    console.log(`\n=== RESERVAS EN TABLA reservas_stock ===`);
    console.log(`Reservas activas: ${reservasExistentes.length}`);
    reservasExistentes.forEach(reserva => {
      console.log(`  - ${reserva.cotizacion.numero_cotizacion} (${reserva.cotizacion.estado}): ${reserva.cantidad_reservada} unidades`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
verificarStockAD140001();