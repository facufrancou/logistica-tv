/**
 * Script simple para verificar las reservas y cotizaciones
 */
const prisma = require('../src/lib/prisma');

async function verificarReservas() {
  try {
    console.log('🔍 Verificando reservas y cotizaciones...\n');

    // 1. Verificar cotizaciones activas
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: 'aceptada' // Solo las aceptadas deberían tener reservas
      },
      include: {
        detalle_cotizacion: {
          include: {
            producto: {
              select: { id_producto: true, nombre: true }
            }
          }
        }
      }
    });

    console.log(`📊 Cotizaciones aceptadas encontradas: ${cotizacionesActivas.length}`);
    
    cotizacionesActivas.forEach(cot => {
      console.log(`\n📋 Cotización ${cot.numero_cotizacion} (Estado: ${cot.estado})`);
      if (cot.detalle_cotizacion && cot.detalle_cotizacion.length > 0) {
        console.log(`   Productos:`);
        cot.detalle_cotizacion.forEach(detalle => {
          const totalDosis = detalle.cantidad_total * detalle.dosis_por_semana;
          console.log(`   - ${detalle.producto.nombre}: ${detalle.cantidad_total} × ${detalle.dosis_por_semana} = ${totalDosis} dosis`);
        });
      }
    });

    // 2. Verificar reservas activas
    console.log('\n🔒 Verificando reservas activas...');
    const reservasActivas = await prisma.reservaStock.findMany({
      where: { estado_reserva: 'activa' },
      include: {
        producto: { select: { nombre: true } },
        cotizacion: { select: { numero_cotizacion: true, estado: true } }
      }
    });

    console.log(`\n📦 Reservas activas encontradas: ${reservasActivas.length}`);
    reservasActivas.forEach(reserva => {
      console.log(`   - ${reserva.producto.nombre}: ${reserva.cantidad_reservada} dosis (Cotización: ${reserva.cotizacion.numero_cotizacion})`);
    });

    // 3. Verificar específicamente AD140001
    console.log('\n🎯 Verificando específicamente AD140001...');
    const producto397 = await prisma.producto.findUnique({
      where: { id_producto: 397 }, // ID correcto de AD140001
      select: { 
        nombre: true, 
        stock: true, 
        stock_reservado: true 
      }
    });

    if (producto397) {
      console.log(`Producto: ${producto397.nombre}`);
      console.log(`Stock total: ${producto397.stock}`);
      console.log(`Stock reservado: ${producto397.stock_reservado}`);
    }

    const reservas397 = await prisma.reservaStock.findMany({
      where: { id_producto: 397 }, // ID correcto
      include: {
        cotizacion: { select: { numero_cotizacion: true, estado: true } }
      }
    });

    console.log(`Reservas para AD140001: ${reservas397.length}`);
    reservas397.forEach(reserva => {
      console.log(`   - Estado: ${reserva.estado_reserva}, Cantidad: ${reserva.cantidad_reservada}, Cotización: ${reserva.cotizacion.numero_cotizacion} (${reserva.cotizacion.estado})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarReservas();