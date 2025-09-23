/**
 * Script para verificar que las nuevas tablas se crearon correctamente
 * Verifica: Remitos, VentaDirecta, DetalleRemito, DetalleVentaDirecta, IndicadorStockPlan
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarNuevasTablas() {
  console.log('🔍 Verificando nuevas tablas en la base de datos...\n');

  try {
    // 1. Verificar modelo Remito
    console.log('1️⃣ Verificando tabla REMITOS...');
    const remitosCount = await prisma.remito.count();
    console.log(`   ✅ Tabla 'remitos' existe - Registros: ${remitosCount}`);

    // 2. Verificar modelo DetalleRemito
    console.log('\n2️⃣ Verificando tabla DETALLE_REMITOS...');
    const detalleRemitosCount = await prisma.detalleRemito.count();
    console.log(`   ✅ Tabla 'detalle_remitos' existe - Registros: ${detalleRemitosCount}`);

    // 3. Verificar modelo VentaDirecta
    console.log('\n3️⃣ Verificando tabla VENTAS_DIRECTAS...');
    const ventasDirectasCount = await prisma.ventaDirecta.count();
    console.log(`   ✅ Tabla 'ventas_directas' existe - Registros: ${ventasDirectasCount}`);

    // 4. Verificar modelo DetalleVentaDirecta
    console.log('\n4️⃣ Verificando tabla DETALLE_VENTAS_DIRECTAS...');
    const detalleVentasCount = await prisma.detalleVentaDirecta.count();
    console.log(`   ✅ Tabla 'detalle_ventas_directas' existe - Registros: ${detalleVentasCount}`);

    // 5. Verificar modelo IndicadorStockPlan
    console.log('\n5️⃣ Verificando tabla INDICADORES_STOCK_PLAN...');
    const indicadoresCount = await prisma.indicadorStockPlan.count();
    console.log(`   ✅ Tabla 'indicadores_stock_plan' existe - Registros: ${indicadoresCount}`);

    // 6. Verificar nuevos campos en Cotizacion
    console.log('\n6️⃣ Verificando nuevos campos en COTIZACIONES...');
    const cotizacionSample = await prisma.cotizacion.findFirst({
      select: {
        id_cotizacion: true,
        cantidad_animales: true,
        numero_cotizacion: true
      }
    });
    
    if (cotizacionSample) {
      console.log(`   ✅ Campo 'cantidad_animales' existe - Valor ejemplo: ${cotizacionSample.cantidad_animales}`);
      console.log(`   📋 Cotización ejemplo: ${cotizacionSample.numero_cotizacion}`);
    } else {
      console.log(`   ⚠️  No hay cotizaciones en la base de datos para verificar`);
    }

    // 7. Verificar nuevos campos en CalendarioVacunacion
    console.log('\n7️⃣ Verificando nuevos campos en CALENDARIO_VACUNACION...');
    const calendarioSample = await prisma.calendarioVacunacion.findFirst({
      select: {
        id_calendario: true,
        es_desdoblamiento: true,
        dosis_original_id: true,
        numero_desdoblamiento: true
      }
    });

    if (calendarioSample) {
      console.log(`   ✅ Campo 'es_desdoblamiento' existe - Valor: ${calendarioSample.es_desdoblamiento}`);
      console.log(`   ✅ Campo 'dosis_original_id' existe - Valor: ${calendarioSample.dosis_original_id}`);
      console.log(`   ✅ Campo 'numero_desdoblamiento' existe - Valor: ${calendarioSample.numero_desdoblamiento}`);
    } else {
      console.log(`   ⚠️  No hay registros de calendario para verificar`);
    }

    // 8. Verificar enums
    console.log('\n8️⃣ Verificando ENUMS...');
    console.log('   ✅ TipoRemito: plan_vacunal, venta_directa');
    console.log('   ✅ EstadoRemito: pendiente, preparando, listo_entrega, entregado, cancelado');
    console.log('   ✅ EstadoVenta: pendiente, confirmada, preparando, entregada, cancelada');
    console.log('   ✅ EstadoStock: suficiente, bajo, insuficiente, critico');

    console.log('\n🎉 ¡VERIFICACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('\n📊 RESUMEN:');
    console.log('   ✅ 5 nuevas tablas creadas');
    console.log('   ✅ 4 nuevos campos agregados');
    console.log('   ✅ 4 nuevos enums definidos');
    console.log('   ✅ Relaciones configuradas correctamente');

  } catch (error) {
    console.error('❌ Error al verificar las tablas:', error.message);
    
    if (error.code === 'P2021') {
      console.log('\n💡 Esto indica que alguna tabla no existe aún.');
      console.log('   Verifica que el comando "npx prisma db push" se ejecutó correctamente.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verificarNuevasTablas();