/**
 * Script para recalcular el stock_reservado de todos los productos
 * basándose en las reservas activas en la base de datos
 */

const prisma = require('../src/lib/prisma');

async function recalcularStockReservado() {
  try {
    console.log('🔄 Iniciando recálculo de stock reservado...');
    
    // Obtener todos los productos que requieren control de stock
    const productos = await prisma.producto.findMany({
      where: {
        requiere_control_stock: true
      },
      select: {
        id_producto: true,
        nombre: true,
        stock: true,
        stock_reservado: true
      }
    });

    console.log(`📊 Encontrados ${productos.length} productos con control de stock`);

    // Para cada producto, calcular el stock reservado real
    for (const producto of productos) {
      console.log(`\n🔍 Procesando producto: ${producto.nombre} (ID: ${producto.id_producto})`);
      console.log(`   Stock actual: ${producto.stock}`);
      console.log(`   Stock reservado registrado: ${producto.stock_reservado}`);

      // Sumar todas las reservas activas para este producto
      const reservasActivas = await prisma.reservaStock.findMany({
        where: {
          id_producto: producto.id_producto,
          estado_reserva: 'activa' // Solo reservas activas
        },
        include: {
          cotizacion: {
            select: {
              id_cotizacion: true,
              numero_cotizacion: true,
              estado: true
            }
          }
        }
      });

      const stockReservadoReal = reservasActivas.reduce((total, reserva) => {
        return total + (reserva.cantidad_reservada || 0);
      }, 0);

      console.log(`   Reservas activas encontradas: ${reservasActivas.length}`);
      console.log(`   Stock reservado calculado: ${stockReservadoReal}`);

      // Mostrar detalles de las reservas
      if (reservasActivas.length > 0) {
        console.log(`   📋 Detalles de reservas:`);
        reservasActivas.forEach(reserva => {
          console.log(`      - Cotización ${reserva.cotizacion?.numero_cotizacion || reserva.id_cotizacion}: ${reserva.cantidad_reservada} unidades (Estado: ${reserva.cotizacion?.estado || 'N/A'})`);
        });
      }

      // Actualizar el stock_reservado si es diferente
      if (stockReservadoReal !== (producto.stock_reservado || 0)) {
        console.log(`   ⚠️  Discrepancia detectada. Actualizando...`);
        
        await prisma.producto.update({
          where: { id_producto: producto.id_producto },
          data: {
            stock_reservado: stockReservadoReal,
            updated_at: new Date()
          }
        });

        console.log(`   ✅ Stock reservado actualizado: ${producto.stock_reservado || 0} → ${stockReservadoReal}`);
      } else {
        console.log(`   ✅ Stock reservado correcto, no se requiere actualización`);
      }
    }

    // Resumen final
    console.log('\n📊 RESUMEN FINAL:');
    const productosActualizados = await prisma.producto.findMany({
      where: {
        requiere_control_stock: true
      },
      select: {
        nombre: true,
        stock: true,
        stock_reservado: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log('\n🏷️  Estado final del stock:');
    productosActualizados.forEach(producto => {
      const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
      console.log(`   ${producto.nombre}:`);
      console.log(`      Stock total: ${producto.stock || 0}`);
      console.log(`      Stock reservado: ${producto.stock_reservado || 0}`);
      console.log(`      Stock disponible: ${stockDisponible}`);
      console.log('');
    });

    console.log('✅ Recálculo de stock reservado completado exitosamente');

  } catch (error) {
    console.error('❌ Error durante el recálculo de stock reservado:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  recalcularStockReservado()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { recalcularStockReservado };