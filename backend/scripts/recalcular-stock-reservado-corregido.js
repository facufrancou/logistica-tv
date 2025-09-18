const prisma = require('../src/lib/prisma');

async function recalcularStockReservado() {
  try {
    console.log('=== RECALCULANDO STOCK RESERVADO ===\n');

    // 1. Obtener todos los productos que tienen reservas
    const productosConReservas = await prisma.reservaStock.groupBy({
      by: ['id_producto'],
      _count: { id_reserva: true }
    });

    console.log(`Productos con reservas: ${productosConReservas.length}`);

    for (const productGroup of productosConReservas) {
      const idProducto = productGroup.id_producto;
      
      // Calcular total de reservas activas para este producto
      const reservasActivas = await prisma.reservaStock.aggregate({
        where: {
          id_producto: idProducto,
          estado_reserva: 'activa'
        },
        _sum: {
          cantidad_reservada: true
        }
      });

      const totalReservado = reservasActivas._sum.cantidad_reservada || 0;

      // Obtener información del producto
      const producto = await prisma.producto.findUnique({
        where: { id_producto: idProducto },
        select: { nombre: true, stock: true, stock_reservado: true }
      });

      console.log(`\n📦 ${producto.nombre} (ID: ${idProducto}):`);
      console.log(`   Stock total: ${producto.stock || 0}`);
      console.log(`   Stock reservado ANTES: ${producto.stock_reservado || 0}`);
      console.log(`   Stock reservado CALCULADO: ${totalReservado}`);

      // Actualizar el stock_reservado si es diferente
      if ((producto.stock_reservado || 0) !== totalReservado) {
        await prisma.producto.update({
          where: { id_producto: idProducto },
          data: { stock_reservado: totalReservado }
        });
        console.log(`   ✅ Stock reservado actualizado: ${producto.stock_reservado || 0} → ${totalReservado}`);
      } else {
        console.log(`   ✓ Stock reservado ya está correcto`);
      }

      // Mostrar stock disponible
      const stockDisponible = (producto.stock || 0) - totalReservado;
      console.log(`   Stock disponible: ${stockDisponible}`);
      if (stockDisponible < 0) {
        console.log(`   ⚠️  ATENCIÓN: Stock disponible negativo`);
      }
    }

    // 2. Verificar productos sin reservas activas pero con stock_reservado > 0
    console.log(`\n🔍 VERIFICANDO PRODUCTOS SIN RESERVAS ACTIVAS...`);
    
    const productosConStockReservado = await prisma.producto.findMany({
      where: {
        stock_reservado: { gt: 0 }
      },
      select: { id_producto: true, nombre: true, stock_reservado: true }
    });

    for (const producto of productosConStockReservado) {
      const reservasActivas = await prisma.reservaStock.count({
        where: {
          id_producto: producto.id_producto,
          estado_reserva: 'activa'
        }
      });

      if (reservasActivas === 0) {
        console.log(`\n🧹 ${producto.nombre}: tiene stock_reservado=${producto.stock_reservado} pero 0 reservas activas`);
        await prisma.producto.update({
          where: { id_producto: producto.id_producto },
          data: { stock_reservado: 0 }
        });
        console.log(`   ✅ Stock reservado limpiado: ${producto.stock_reservado} → 0`);
      }
    }

    console.log(`\n✅ RECÁLCULO COMPLETADO`);

    // 3. Resumen final
    console.log(`\n📊 RESUMEN FINAL:`);
    const resumenReservas = await prisma.reservaStock.groupBy({
      by: ['estado_reserva'],
      _count: { id_reserva: true },
      _sum: { cantidad_reservada: true }
    });

    resumenReservas.forEach(estado => {
      console.log(`   ${estado.estado_reserva}: ${estado._count.id_reserva} reservas, ${estado._sum.cantidad_reservada || 0} dosis`);
    });

  } catch (error) {
    console.error('❌ Error durante el recálculo:', error);
  }
}

if (require.main === module) {
  recalcularStockReservado();
}

module.exports = { recalcularStockReservado };