/**
 * Script para corregir las reservas de las cotizaciones aceptadas
 * que usan el "Plan de prueba" con múltiples entradas del mismo producto
 */

const prisma = require('../src/lib/prisma');

async function corregirReservasPlanPrueba() {
  try {
    console.log('🔄 Iniciando corrección de reservas del Plan de prueba...');
    
    // Buscar las cotizaciones aceptadas que usan el Plan de prueba (ID: 5)
    const cotizacionesAceptadas = await prisma.cotizacion.findMany({
      where: {
        id_plan: 5, // Plan de prueba
        estado: 'aceptada'
      },
      include: {
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: true
              }
            }
          }
        },
        cliente: {
          select: {
            nombre: true
          }
        }
      }
    });

    console.log(`📋 Cotizaciones aceptadas encontradas: ${cotizacionesAceptadas.length}`);

    for (const cotizacion of cotizacionesAceptadas) {
      console.log(`\n🔍 Procesando cotización: ${cotizacion.numero_cotizacion} (${cotizacion.cliente.nombre})`);
      
      // Mostrar productos del plan
      console.log('📦 Productos en el plan:');
      let totalDosisAD140001 = 0;
      cotizacion.plan.productos_plan.forEach(pp => {
        const totalDosis = pp.cantidad_total * pp.dosis_por_semana;
        console.log(`   - ${pp.producto.nombre}: ${pp.cantidad_total} × ${pp.dosis_por_semana} = ${totalDosis} dosis`);
        if (pp.producto.nombre === 'AD140001') {
          totalDosisAD140001 += totalDosis;
        }
      });
      console.log(`   Total dosis AD140001 esperadas: ${totalDosisAD140001}`);

      // Verificar reservas actuales
      const reservasActuales = await prisma.reservaStock.findMany({
        where: {
          id_cotizacion: cotizacion.id_cotizacion,
          estado_reserva: 'activa'
        },
        include: {
          producto: {
            select: {
              nombre: true
            }
          }
        }
      });

      console.log(`📊 Reservas actuales: ${reservasActuales.length}`);
      let totalReservadoActual = 0;
      reservasActuales.forEach(reserva => {
        console.log(`   - ${reserva.producto.nombre}: ${reserva.cantidad_reservada} dosis`);
        if (reserva.producto.nombre === 'AD140001') {
          totalReservadoActual += reserva.cantidad_reservada;
        }
      });
      console.log(`   Total AD140001 reservado actualmente: ${totalReservadoActual}`);

      // Si las reservas no coinciden, corregir
      if (totalReservadoActual !== totalDosisAD140001) {
        console.log(`⚠️  DISCREPANCIA: Esperado ${totalDosisAD140001}, actual ${totalReservadoActual}`);
        console.log('🔧 Corrigiendo reservas...');

        // Eliminar reservas existentes para esta cotización
        await prisma.reservaStock.updateMany({
          where: {
            id_cotizacion: cotizacion.id_cotizacion,
            estado_reserva: 'activa'
          },
          data: {
            estado_reserva: 'liberada',
            fecha_liberacion: new Date()
          }
        });

        console.log('   ✅ Reservas anteriores liberadas');

        // Crear nuevas reservas correctas (una por cada entrada del plan)
        let reservasCreadas = 0;
        for (const planProducto of cotizacion.plan.productos_plan) {
          if (planProducto.producto.requiere_control_stock) {
            const totalDosis = planProducto.cantidad_total * planProducto.dosis_por_semana;
            
            // Crear reserva individual
            await prisma.reservaStock.create({
              data: {
                id_producto: planProducto.id_producto,
                id_cotizacion: cotizacion.id_cotizacion,
                cantidad_reservada: totalDosis,
                motivo: 'Corrección automática - Reserva por entrada de plan',
                observaciones: `Reserva corregida para ${totalDosis} dosis (${planProducto.cantidad_total} semanas × ${planProducto.dosis_por_semana} dosis/semana) - Entrada ${reservasCreadas + 1} del plan`,
                created_by: 1 // Usuario sistema
              }
            });

            reservasCreadas++;
            console.log(`   ✅ Reserva creada: ${planProducto.producto.nombre} - ${totalDosis} dosis`);
          }
        }

        console.log(`   📊 Total reservas creadas: ${reservasCreadas}`);
      } else {
        console.log('   ✅ Reservas correctas, no se requiere corrección');
      }
    }

    // Recalcular stock reservado
    console.log('\n🔄 Recalculando stock reservado...');
    const { recalcularStockReservado } = require('./recalcular-stock-reservado');
    await recalcularStockReservado();

    console.log('\n✅ Corrección de reservas completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la corrección de reservas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  corregirReservasPlanPrueba()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { corregirReservasPlanPrueba };