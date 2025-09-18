const prisma = require('../src/lib/prisma');

async function aplicarReservasExistentes() {
  console.log('=== APLICANDO RESERVAS A COTIZACIONES EXISTENTES ===\n');

  try {
    // Obtener cotizaciones activas sin reservas
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
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
                producto: true
              }
            }
          }
        },
        reservas_stock: {
          where: { estado_reserva: 'activa' }
        }
      }
    });

    console.log(`Encontradas ${cotizacionesActivas.length} cotizaciones activas`);

    for (const cotizacion of cotizacionesActivas) {
      console.log(`\nProcesando: ${cotizacion.numero_cotizacion} - ${cotizacion.cliente.nombre}`);
      console.log(`Estado: ${cotizacion.estado}`);
      console.log(`Reservas existentes: ${cotizacion.reservas_stock.length}`);
      
      if (cotizacion.reservas_stock.length === 0) {
        console.log('⚠️  No tiene reservas - creando...');
        
        try {
          // Crear reservas para esta cotización
          const productosDelPlan = cotizacion.plan.productos_plan;
          
          for (const planProducto of productosDelPlan) {
            const producto = planProducto.producto;
            
            if (producto.requiere_control_stock) {
              const totalDosisRequeridas = planProducto.cantidad_total * planProducto.dosis_por_semana;
              const stockDisponible = (producto.stock || 0) - (producto.stock_reservado || 0);
              
              console.log(`  Producto: ${producto.nombre}`);
              console.log(`    Dosis requeridas: ${totalDosisRequeridas} (${planProducto.cantidad_total} × ${planProducto.dosis_por_semana})`);
              console.log(`    Stock disponible: ${stockDisponible}`);
              
              if (stockDisponible >= totalDosisRequeridas) {
                // Crear reserva
                const reserva = await prisma.reservaStock.create({
                  data: {
                    id_producto: producto.id_producto,
                    id_cotizacion: cotizacion.id_cotizacion,
                    cantidad_reservada: totalDosisRequeridas,
                    motivo: 'Reserva automática aplicada por corrección del sistema',
                    observaciones: `Aplicación retroactiva para ${totalDosisRequeridas} dosis (${planProducto.cantidad_total} semanas × ${planProducto.dosis_por_semana} dosis/semana)`,
                    created_by: null // Sistema
                  }
                });

                // Actualizar stock reservado del producto
                await prisma.producto.update({
                  where: { id_producto: producto.id_producto },
                  data: {
                    stock_reservado: (producto.stock_reservado || 0) + totalDosisRequeridas,
                    updated_at: new Date()
                  }
                });

                // Registrar movimiento de stock
                await prisma.movimientoStock.create({
                  data: {
                    id_producto: producto.id_producto,
                    tipo_movimiento: 'reserva',
                    cantidad: totalDosisRequeridas,
                    stock_anterior: producto.stock || 0,
                    stock_posterior: producto.stock || 0, // El stock total no cambia en reservas
                    motivo: 'Reserva automática aplicada por corrección del sistema',
                    observaciones: `Cotización: ${cotizacion.numero_cotizacion} - ${totalDosisRequeridas} dosis`,
                    id_cotizacion: cotizacion.id_cotizacion,
                    id_usuario: null
                  }
                });

                console.log(`    ✅ Reserva creada: ${totalDosisRequeridas} unidades`);
              } else {
                console.log(`    ❌ Stock insuficiente: disponible ${stockDisponible}, necesario ${totalDosisRequeridas}`);
              }
            } else {
              console.log(`    ℹ️  No requiere control de stock`);
            }
          }
        } catch (error) {
          console.error(`❌ Error al crear reservas para ${cotizacion.numero_cotizacion}:`, error.message);
        }
      } else {
        console.log('✅ Ya tiene reservas activas');
      }
    }

    console.log('\n=== VERIFICACIÓN FINAL ===');
    
    // Verificar estado final
    const estadoFinal = await prisma.producto.findMany({
      where: {
        stock_reservado: { gt: 0 }
      },
      select: {
        nombre: true,
        stock: true,
        stock_reservado: true
      }
    });

    console.log('Productos con stock reservado después de la corrección:');
    estadoFinal.forEach(producto => {
      const disponible = (producto.stock || 0) - (producto.stock_reservado || 0);
      console.log(`  - ${producto.nombre}: Stock ${producto.stock}, Reservado ${producto.stock_reservado}, Disponible ${disponible}`);
    });

    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
aplicarReservasExistentes();