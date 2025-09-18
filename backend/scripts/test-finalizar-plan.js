const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function probarFinalizarPlanCompleto() {
  try {
    console.log('=== SIMULANDO ENDPOINT FINALIZAR PLAN COMPLETO ===');
    
    const id = 13;

    // Verificar que la cotización existe y está aceptada
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) },
      include: {
        calendario_vacunacion: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!cotizacion) {
      console.log('ERROR: Cotización no encontrada');
      return;
    }

    console.log('Cotización:', cotizacion.numero_cotizacion, 'Estado:', cotizacion.estado);

    if (cotizacion.estado !== 'aceptada') {
      console.log('ERROR: Solo se pueden finalizar cotizaciones aceptadas');
      return;
    }

    // Verificar que todas las dosis estén entregadas
    const dosisIncompletas = cotizacion.calendario_vacunacion.filter(
      cal => (cal.dosis_entregadas || 0) < cal.cantidad_dosis
    );

    if (dosisIncompletas.length > 0) {
      console.log('ERROR: Hay dosis pendientes:', dosisIncompletas.length);
      return;
    }

    console.log('Verificaciones pasadas. Iniciando transacción...');

    await prisma.$transaction(async (tx) => {
      console.log('1. Marcando reservas como utilizadas...');
      
      const updateResult = await tx.reservaStock.updateMany({
        where: { 
          id_cotizacion: parseInt(id),
          estado_reserva: 'activa'
        },
        data: {
          estado_reserva: 'utilizada',
          fecha_utilizacion: new Date(),
          observaciones: 'Plan vacunal finalizado - todas las dosis entregadas',
          updated_at: new Date()
        }
      });
      
      console.log('Reservas actualizadas:', updateResult.count);

      console.log('2. Obteniendo productos con reservas...');
      
      const productosConReservas = await tx.reservaStock.groupBy({
        by: ['id_producto'],
        where: { 
          id_cotizacion: parseInt(id),
          estado_reserva: 'utilizada'
        },
        _sum: {
          cantidad_reservada: true
        }
      });

      console.log('Productos con reservas:', productosConReservas);

      for (const producto of productosConReservas) {
        const cantidadConsumida = producto._sum.cantidad_reservada || 0;
        
        console.log(`3. Descontando ${cantidadConsumida} dosis del producto ${producto.id_producto}`);
        
        // Descontar del stock general Y del stock reservado
        await tx.producto.update({
          where: { id_producto: producto.id_producto },
          data: {
            stock: {
              decrement: cantidadConsumida // Reducir stock general
            },
            stock_reservado: {
              decrement: cantidadConsumida // Limpiar stock reservado
            }
          }
        });

        console.log('4. Creando movimiento de stock...');
        
        await tx.movimientoStock.create({
          data: {
            id_producto: producto.id_producto,
            tipo_movimiento: 'egreso',
            cantidad: cantidadConsumida,
            stock_anterior: null,
            stock_posterior: null,
            motivo: `Plan vacunal finalizado - COT: ${cotizacion.numero_cotizacion}`,
            observaciones: 'Finalización automática de plan',
            id_usuario: 1,
            fecha_movimiento: new Date()
          }
        });
      }

      console.log('5. Actualizando calendario...');
      
      await tx.calendarioVacunacion.updateMany({
        where: { id_cotizacion: parseInt(id) },
        data: {
          observaciones: 'Plan finalizado - todas las dosis entregadas',
          updated_at: new Date()
        }
      });
      
      console.log('Transacción completada!');
    });

    console.log('ÉXITO: Plan finalizado correctamente');
    
  } catch (error) {
    console.error('ERROR en la simulación:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

probarFinalizarPlanCompleto();