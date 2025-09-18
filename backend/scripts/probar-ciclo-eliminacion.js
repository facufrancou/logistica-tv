const prisma = require('../src/lib/prisma');

async function probarCicloCompletoEliminacion() {
  try {
    console.log('=== PRUEBA COMPLETA: ACEPTAR → VERIFICAR → ELIMINAR → VERIFICAR ===\n');

    // 1. Buscar una cotización en proceso
    console.log('1. BUSCANDO COTIZACIÓN PARA PROBAR...');
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { estado: 'en_proceso' },
      include: {
        plan: { select: { nombre: true } }
      }
    });

    if (!cotizacion) {
      console.log('❌ No se encontró cotización en proceso para probar');
      return;
    }

    console.log(`✅ Cotización encontrada: ${cotizacion.numero_cotizacion} (ID: ${cotizacion.id_cotizacion})`);
    console.log(`   Estado: ${cotizacion.estado}`);
    console.log(`   Plan: ${cotizacion.plan?.nombre}`);

    // 2. Verificar stock ANTES de aceptar
    console.log('\n2. STOCK ANTES DE ACEPTAR:');
    const stockAntes = await prisma.producto.findFirst({
      where: { nombre: 'AD140001' },
      select: { 
        nombre: true, 
        stock: true, 
        stock_reservado: true, 
        id_producto: true 
      }
    });

    if (stockAntes) {
      console.log(`   ${stockAntes.nombre}:`);
      console.log(`     Stock total: ${stockAntes.stock || 0}`);
      console.log(`     Stock reservado: ${stockAntes.stock_reservado || 0}`);
      console.log(`     Stock disponible: ${(stockAntes.stock || 0) - (stockAntes.stock_reservado || 0)}`);
    }

    // 3. Aceptar la cotización (simular)
    console.log('\n3. CAMBIANDO ESTADO A "ACEPTADA"...');
    
    // Simular llamada a la API PUT /api/cotizaciones/:id/estado
    await prisma.cotizacion.update({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      data: { 
        estado: 'aceptada',
        fecha_aceptacion: new Date(),
        updated_at: new Date()
      }
    });

    console.log(`✅ Cotización ${cotizacion.numero_cotizacion} actualizada a "aceptada"`);
    
    // Simular creación de reservas (simplificado)
    // En la práctica esto se haría a través del endpoint que ya corregimos
    console.log('   (Nota: Las reservas se crearían automáticamente en la API real)');

    // 4. Verificar reservas creadas
    console.log('\n4. VERIFICANDO RESERVAS DESPUÉS DE ACEPTAR...');
    const reservasCreadas = await prisma.reservaStock.findMany({
      where: { 
        id_cotizacion: cotizacion.id_cotizacion,
        estado_reserva: 'activa'
      },
      include: {
        producto: { select: { nombre: true } }
      }
    });

    console.log(`   Reservas activas: ${reservasCreadas.length}`);
    let totalReservado = 0;
    reservasCreadas.forEach(r => {
      totalReservado += r.cantidad_reservada;
      console.log(`   - ${r.producto.nombre}: ${r.cantidad_reservada} dosis`);
    });
    console.log(`   Total dosis reservadas: ${totalReservado}`);

    // 5. Verificar stock DESPUÉS de aceptar
    console.log('\n5. STOCK DESPUÉS DE ACEPTAR:');
    const stockDespues = await prisma.producto.findFirst({
      where: { id_producto: stockAntes.id_producto },
      select: { 
        nombre: true, 
        stock: true, 
        stock_reservado: true 
      }
    });

    if (stockDespues) {
      console.log(`   ${stockDespues.nombre}:`);
      console.log(`     Stock total: ${stockDespues.stock || 0}`);
      console.log(`     Stock reservado: ${stockDespues.stock_reservado || 0}`);
      console.log(`     Stock disponible: ${(stockDespues.stock || 0) - (stockDespues.stock_reservado || 0)}`);
    }

    // 6. Eliminar la cotización
    console.log('\n6. 🗑️  ELIMINANDO COTIZACIÓN...');
    
    await prisma.cotizacion.update({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      data: { 
        estado: 'eliminada',
        updated_at: new Date(),
        observaciones: `${cotizacion.observaciones || ''}\n[PRUEBA ELIMINACIÓN] ${new Date().toLocaleString()}: Prueba de liberación automática de reservas`.trim()
      }
    });

    console.log(`✅ Cotización ${cotizacion.numero_cotizacion} eliminada`);

    // 7. Verificar que las reservas se liberaron automáticamente
    console.log('\n7. VERIFICANDO LIBERACIÓN DE RESERVAS...');
    const reservasDespuesEliminar = await prisma.reservaStock.findMany({
      where: { 
        id_cotizacion: cotizacion.id_cotizacion,
        estado_reserva: 'activa'
      }
    });

    console.log(`   Reservas activas restantes: ${reservasDespuesEliminar.length}`);
    
    if (reservasDespuesEliminar.length === 0) {
      console.log('   ✅ ¡ÉXITO! Todas las reservas fueron liberadas automáticamente');
    } else {
      console.log('   ❌ PROBLEMA: Aún quedan reservas activas');
      reservasDespuesEliminar.forEach(r => {
        console.log(`     - Reserva ID ${r.id_reserva}: ${r.cantidad_reservada} dosis`);
      });
    }

    // 8. Verificar stock FINAL
    console.log('\n8. STOCK FINAL:');
    const stockFinal = await prisma.producto.findFirst({
      where: { id_producto: stockAntes.id_producto },
      select: { 
        nombre: true, 
        stock: true, 
        stock_reservado: true 
      }
    });

    if (stockFinal) {
      console.log(`   ${stockFinal.nombre}:`);
      console.log(`     Stock total: ${stockFinal.stock || 0}`);
      console.log(`     Stock reservado: ${stockFinal.stock_reservado || 0}`);
      console.log(`     Stock disponible: ${(stockFinal.stock || 0) - (stockFinal.stock_reservado || 0)}`);
      
      const cambioReserva = (stockFinal.stock_reservado || 0) - (stockAntes.stock_reservado || 0);
      if (cambioReserva === 0) {
        console.log('   ✅ El stock reservado volvió al estado inicial');
      } else {
        console.log(`   ⚠️  Cambio en stock reservado: ${cambioReserva > 0 ? '+' : ''}${cambioReserva}`);
      }
    }

    console.log('\n🎯 RESUMEN DE LA PRUEBA:');
    console.log(`   - Cotización ${cotizacion.numero_cotizacion} probada`);
    console.log(`   - Cambio de estado: en_proceso → aceptada → eliminada`);
    console.log(`   - Reservas liberadas automáticamente: ${reservasCreadas.length > 0 && reservasDespuesEliminar.length === 0 ? 'SÍ' : 'NO'}`);
    console.log(`   - Stock liberado correctamente: ${(stockFinal.stock_reservado || 0) === (stockAntes.stock_reservado || 0) ? 'SÍ' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

if (require.main === module) {
  probarCicloCompletoEliminacion();
}

module.exports = { probarCicloCompletoEliminacion };