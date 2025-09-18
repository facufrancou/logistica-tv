const axios = require('axios');
const prisma = require('../src/lib/prisma');

const BASE_URL = 'http://localhost:3001';

async function probarEliminacionSimple() {
  try {
    console.log('=== PRUEBA SIMPLE DE ELIMINACIÓN ===\n');

    // 1. Verificar estado actual de cotizaciones
    console.log('1. VERIFICANDO COTIZACIONES EN BD...');
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { estado: { not: 'eliminada' } },
      orderBy: { id_cotizacion: 'desc' },
      take: 1
    });

    if (cotizaciones.length === 0) {
      console.log('❌ No hay cotizaciones para probar');
      return;
    }

    const cotizacion = cotizaciones[0];
    console.log(`   Cotización encontrada: ${cotizacion.numero_cotizacion} (ID: ${cotizacion.id_cotizacion}, Estado: ${cotizacion.estado})`);

    // 2. Verificar reservas antes
    const reservasAntes = await prisma.reservaStock.findMany({
      where: { 
        id_cotizacion: cotizacion.id_cotizacion,
        estado_reserva: 'activa'
      },
      include: { producto: { select: { nombre: true } } }
    });

    console.log(`   Reservas activas antes: ${reservasAntes.length}`);
    reservasAntes.forEach(r => {
      console.log(`     - ${r.producto.nombre}: ${r.cantidad_reservada} dosis`);
    });

    // 3. Si no está aceptada, aceptarla para crear reservas
    if (cotizacion.estado !== 'aceptada') {
      console.log('\n2. ACEPTANDO COTIZACIÓN PARA CREAR RESERVAS...');
      try {
        const responseAceptar = await axios.put(
          `${BASE_URL}/cotizaciones/${cotizacion.id_cotizacion}/estado`,
          { 
            estado: 'aceptada',
            observaciones: 'Aceptada para prueba de eliminación'
          }
        );
        console.log('   ✅ Cotización aceptada');

        // Verificar reservas después de aceptar
        const reservasDespuesAceptar = await prisma.reservaStock.findMany({
          where: { 
            id_cotizacion: cotizacion.id_cotizacion,
            estado_reserva: 'activa'
          },
          include: { producto: { select: { nombre: true } } }
        });

        console.log(`   Reservas creadas: ${reservasDespuesAceptar.length}`);
        reservasDespuesAceptar.forEach(r => {
          console.log(`     - ${r.producto.nombre}: ${r.cantidad_reservada} dosis`);
        });

      } catch (error) {
        console.log(`   ❌ Error aceptando: ${error.response?.data?.error || error.message}`);
        return;
      }
    }

    // 4. Eliminar la cotización
    console.log('\n3. ELIMINANDO COTIZACIÓN...');
    try {
      const responseEliminar = await axios.delete(
        `${BASE_URL}/cotizaciones/${cotizacion.id_cotizacion}`,
        {
          data: { motivo: 'Prueba de eliminación y liberación de stock' }
        }
      );
      console.log('   ✅ Cotización eliminada');

      // 5. Verificar que las reservas fueron liberadas
      console.log('\n4. VERIFICANDO LIBERACIÓN DE RESERVAS...');
      const reservasDespuesEliminar = await prisma.reservaStock.findMany({
        where: { 
          id_cotizacion: cotizacion.id_cotizacion,
          estado_reserva: 'activa'
        }
      });

      const reservasLiberadas = await prisma.reservaStock.findMany({
        where: { 
          id_cotizacion: cotizacion.id_cotizacion,
          estado_reserva: 'liberada'
        },
        include: { producto: { select: { nombre: true } } }
      });

      console.log(`   Reservas activas después: ${reservasDespuesEliminar.length}`);
      console.log(`   Reservas liberadas: ${reservasLiberadas.length}`);
      
      reservasLiberadas.forEach(r => {
        console.log(`     - ${r.producto.nombre}: ${r.cantidad_reservada} dosis liberadas`);
      });

      // 6. Verificar estado final de la cotización
      const cotizacionFinal = await prisma.cotizacion.findUnique({
        where: { id_cotizacion: cotizacion.id_cotizacion }
      });

      console.log(`\n5. ESTADO FINAL:`);
      console.log(`   Cotización estado: ${cotizacionFinal.estado}`);
      console.log(`   Reservas activas: ${reservasDespuesEliminar.length}`);
      console.log(`   Reservas liberadas: ${reservasLiberadas.length}`);

      if (reservasDespuesEliminar.length === 0 && reservasLiberadas.length > 0) {
        console.log('\n✅ PRUEBA EXITOSA: La eliminación liberó correctamente las reservas');
      } else {
        console.log('\n❌ PRUEBA FALLIDA: Las reservas no fueron liberadas correctamente');
      }

    } catch (error) {
      console.log(`   ❌ Error eliminando: ${error.response?.data?.error || error.message}`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

if (require.main === module) {
  probarEliminacionSimple();
}

module.exports = { probarEliminacionSimple };