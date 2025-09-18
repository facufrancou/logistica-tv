const prisma = require('../src/lib/prisma');

async function verificarEstadoReservas() {
  console.log('=== VERIFICACIÓN DE ESTADO DE RESERVAS ===\n');

  try {
    // 1. Obtener cotizaciones activas
    console.log('1. COTIZACIONES ACTIVAS:');
    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
        }
      },
      include: {
        cliente: {
          select: { nombre: true }
        },
        detalle_cotizacion: {
          include: {
            producto: {
              select: { nombre: true, stock: true, stock_reservado: true, requiere_control_stock: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (cotizaciones.length === 0) {
      console.log('   - No hay cotizaciones activas\n');
    } else {
      cotizaciones.forEach(cot => {
        console.log(`   - ${cot.numero_cotizacion} (${cot.estado}) - Cliente: ${cot.cliente.nombre}`);
        console.log(`     Fecha: ${cot.created_at.toISOString().split('T')[0]}`);
        console.log(`     Productos: ${cot.detalle_cotizacion.length}`);
        
        cot.detalle_cotizacion.forEach(detalle => {
          const producto = detalle.producto;
          const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
          const totalDosis = detalle.cantidad_total * detalle.dosis_por_semana;
          
          console.log(`       • ${producto.nombre}: ${totalDosis} dosis necesarias`);
          console.log(`         Stock: ${producto.stock}, Reservado: ${producto.stock_reservado}, Disponible: ${stockDisponible}`);
          console.log(`         Control de stock: ${producto.requiere_control_stock ? 'SÍ' : 'NO'}`);
        });
        console.log('');
      });
    }

    // 2. Obtener reservas existentes
    console.log('2. RESERVAS DE STOCK EXISTENTES:');
    const reservas = await prisma.reservaStock.findMany({
      where: {
        estado_reserva: 'activa'
      },
      include: {
        producto: {
          select: { nombre: true }
        },
        cotizacion: {
          select: { numero_cotizacion: true, estado: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (reservas.length === 0) {
      console.log('   - No hay reservas activas\n');
    } else {
      reservas.forEach(reserva => {
        console.log(`   - Producto: ${reserva.producto.nombre}`);
        console.log(`     Cotización: ${reserva.cotizacion.numero_cotizacion} (${reserva.cotizacion.estado})`);
        console.log(`     Cantidad reservada: ${reserva.cantidad_reservada}`);
        console.log(`     Fecha: ${reserva.created_at.toISOString().split('T')[0]}`);
        console.log(`     Motivo: ${reserva.motivo}`);
        console.log('');
      });
    }

    // 3. Obtener productos con stock reservado
    console.log('3. PRODUCTOS CON STOCK RESERVADO:');
    const productosConReservas = await prisma.producto.findMany({
      where: {
        stock_reservado: {
          gt: 0
        }
      },
      select: {
        id_producto: true,
        nombre: true,
        stock: true,
        stock_reservado: true,
        requiere_control_stock: true
      },
      orderBy: { nombre: 'asc' }
    });

    if (productosConReservas.length === 0) {
      console.log('   - No hay productos con stock reservado\n');
    } else {
      productosConReservas.forEach(producto => {
        const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
        console.log(`   - ${producto.nombre}:`);
        console.log(`     Stock total: ${producto.stock}`);
        console.log(`     Stock reservado: ${producto.stock_reservado}`);
        console.log(`     Stock disponible: ${stockDisponible}`);
        console.log(`     Control de stock: ${producto.requiere_control_stock ? 'SÍ' : 'NO'}`);
        console.log('');
      });
    }

    // 4. Análisis de discrepancias
    console.log('4. ANÁLISIS DE DISCREPANCIAS:');
    
    // Verificar si hay cotizaciones activas sin reservas correspondientes
    const cotizacionesSinReservas = [];
    for (const cot of cotizaciones) {
      if (cot.estado === 'aceptada') {
        const reservasCotizacion = reservas.filter(r => r.cotizacion.numero_cotizacion === cot.numero_cotizacion);
        
        if (reservasCotizacion.length === 0) {
          cotizacionesSinReservas.push(cot);
        } else {
          // Verificar si las reservas coinciden con el detalle
          for (const detalle of cot.detalle_cotizacion) {
            const reservaProducto = reservasCotizacion.find(r => r.producto.nombre === detalle.producto.nombre);
            const dosisNecesarias = detalle.cantidad_total * detalle.dosis_por_semana;
            
            if (!reservaProducto) {
              console.log(`   ⚠️  PROBLEMA: Cotización ${cot.numero_cotizacion} aceptada sin reserva para ${detalle.producto.nombre}`);
            } else if (reservaProducto.cantidad_reservada !== dosisNecesarias) {
              console.log(`   ⚠️  PROBLEMA: Reserva incorrecta para ${detalle.producto.nombre} en ${cot.numero_cotizacion}`);
              console.log(`       Esperado: ${dosisNecesarias}, Reservado: ${reservaProducto.cantidad_reservada}`);
            }
          }
        }
      }
    }

    if (cotizacionesSinReservas.length > 0) {
      console.log('   COTIZACIONES ACEPTADAS SIN RESERVAS:');
      cotizacionesSinReservas.forEach(cot => {
        console.log(`   - ${cot.numero_cotizacion} - ${cot.cliente.nombre}`);
      });
    }

    // Verificar reservas huérfanas (sin cotización activa)
    const reservasHuerfanas = reservas.filter(r => 
      !cotizaciones.some(c => c.numero_cotizacion === r.cotizacion.numero_cotizacion)
    );

    if (reservasHuerfanas.length > 0) {
      console.log('   RESERVAS HUÉRFANAS (sin cotización activa):');
      reservasHuerfanas.forEach(reserva => {
        console.log(`   - ${reserva.producto.nombre}: ${reserva.cantidad_reservada} unidades`);
        console.log(`     Cotización: ${reserva.cotizacion.numero_cotizacion} (${reserva.cotizacion.estado})`);
      });
    }

    if (cotizacionesSinReservas.length === 0 && reservasHuerfanas.length === 0) {
      console.log('   ✅ No se detectaron discrepancias obvias\n');
    }

    console.log('=== FIN DE VERIFICACIÓN ===');

  } catch (error) {
    console.error('Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verificarEstadoReservas();