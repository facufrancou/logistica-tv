const prisma = require('../src/lib/prisma');

async function probarEliminacionStock() {
  try {
    console.log('=== VERIFICANDO ESTADO ACTUAL DE STOCK Y COTIZACIONES ===\n');

    // 1. Verificar cotizaciones existentes
    console.log('1. COTIZACIONES EXISTENTES:');
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { estado: { not: 'eliminada' } },
      orderBy: { id_cotizacion: 'asc' },
      include: {
        plan: { select: { nombre: true } }
      }
    });

    console.log(`Total cotizaciones activas: ${cotizaciones.length}`);
    cotizaciones.forEach(c => {
      console.log(`  - Cotización ${c.numero_cotizacion} (ID: ${c.id_cotizacion}) - Estado: ${c.estado} - Plan: ${c.plan?.nombre || 'Sin plan'}`);
    });

    // 2. Verificar reservas de stock activas
    console.log('\n2. RESERVAS DE STOCK ACTIVAS:');
    const reservasActivas = await prisma.reservaStock.findMany({
      where: { estado_reserva: 'activa' },
      include: {
        producto: { select: { nombre: true, id_producto: true } },
        cotizacion: { select: { numero_cotizacion: true, estado: true } }
      },
      orderBy: { id_cotizacion: 'asc' }
    });

    console.log(`Total reservas activas: ${reservasActivas.length}`);
    const resumenReservas = {};
    reservasActivas.forEach(r => {
      const key = r.producto.id_producto;
      if (!resumenReservas[key]) {
        resumenReservas[key] = { nombre: r.producto.nombre, cantidad: 0, cotizaciones: [] };
      }
      resumenReservas[key].cantidad += r.cantidad_reservada;
      resumenReservas[key].cotizaciones.push(`${r.cotizacion.numero_cotizacion} (${r.cotizacion.estado}): ${r.cantidad_reservada}`);
      console.log(`  - ID ${r.producto.id_producto} - ${r.producto.nombre}: ${r.cantidad_reservada} dosis (Cotización: ${r.cotizacion.numero_cotizacion} - ${r.cotizacion.estado})`);
    });

    console.log('\n3. RESUMEN DE RESERVAS POR PRODUCTO:');
    Object.entries(resumenReservas).forEach(([id_producto, data]) => {
      console.log(`\nID ${id_producto} - ${data.nombre}: ${data.cantidad} dosis totales reservadas`);
      data.cotizaciones.forEach(info => {
        console.log(`    ${info}`);
      });
    });

    // 4. Verificar stock actual
    console.log('\n4. STOCK ACTUAL DE PRODUCTOS CON RESERVAS:');
    for (const [id_producto] of Object.entries(resumenReservas)) {
      const stock = await prisma.stock.findFirst({
        where: { id_producto: parseInt(id_producto) },
        include: { producto: { select: { nombre: true, id_producto: true } } }
      });

      if (stock) {
        console.log(`\nID ${stock.producto.id_producto} - ${stock.producto.nombre}:`);
        console.log(`  Stock total: ${stock.stock_total}`);
        console.log(`  Stock disponible: ${stock.stock_disponible}`);
        console.log(`  Stock reservado: ${stock.stock_reservado}`);
        console.log(`  Stock mínimo: ${stock.stock_minimo}`);
      }
    }

    // 5. Identificar problema específico
    console.log('\n5. ❌ PROBLEMA DETECTADO:');
    const reservasEliminadas = reservasActivas.filter(r => r.cotizacion.estado === 'eliminada');
    if (reservasEliminadas.length > 0) {
      console.log(`🚨 ENCONTRADAS ${reservasEliminadas.length} RESERVAS ACTIVAS DE COTIZACIONES ELIMINADAS:`);
      const totalDosisProblema = reservasEliminadas.reduce((total, r) => total + r.cantidad_reservada, 0);
      console.log(`   Total dosis incorrectamente reservadas: ${totalDosisProblema}`);
      
      const cotizacionesProblema = [...new Set(reservasEliminadas.map(r => r.cotizacion.numero_cotizacion))];
      console.log(`   Cotizaciones afectadas: ${cotizacionesProblema.join(', ')}`);
      
      console.log('\n   ✅ SOLUCIÓN: Ejecutar script para liberar estas reservas');
    }

    // 5. Identificar cotizaciones que se pueden eliminar para probar
    console.log('\n5. COTIZACIONES DISPONIBLES PARA ELIMINAR:');
    const cotizacionesEliminables = cotizaciones.filter(c => 
      ['en_proceso', 'enviada', 'aceptada', 'cancelada'].includes(c.estado)
    );

    if (cotizacionesEliminables.length > 0) {
      console.log('Cotizaciones que se pueden eliminar:');
      cotizacionesEliminables.forEach(c => {
        console.log(`  - ${c.numero_cotizacion} (ID: ${c.id_cotizacion}) - Estado: ${c.estado}`);
      });
      
      console.log('\n✅ Para eliminar una cotización y verificar la liberación de stock:');
      console.log('   Usar la API: DELETE /api/cotizaciones/:id');
      console.log('   O el endpoint: PUT /api/cotizaciones/:id/estado con estado "eliminada"');
    } else {
      console.log('No hay cotizaciones disponibles para eliminar.');
    }

    console.log('\n✅ Análisis completado.');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

if (require.main === module) {
  probarEliminacionStock();
}

module.exports = { probarEliminacionStock };