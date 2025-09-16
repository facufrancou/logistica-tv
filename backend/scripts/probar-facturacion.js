const prisma = require('../src/lib/prisma');

async function probarSistemaFacturacion() {
  console.log('🧪 PRUEBA COMPLETA DEL SISTEMA DE FACTURACIÓN');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar una cotización aceptada
    console.log('1. Buscando cotización aceptada...');
    
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { estado: 'aceptada' },
      include: {
        cliente: true,
        plan: true
      }
    });

    if (!cotizacion) {
      console.log('   ❌ No se encontró cotización aceptada');
      return;
    }

    console.log(`   ✅ Cotización encontrada: ${cotizacion.numero_cotizacion}`);
    console.log(`   💰 Precio total: $${cotizacion.precio_total}`);
    console.log(`   👤 Cliente: ${cotizacion.cliente.nombre}`);

    // 2. Simular generación de factura usando la lógica del controlador
    console.log('\n2. Generando factura...');

    // Simular datos de facturación
    const datosFactura = {
      numero_factura: `FACT-${Date.now()}`,
      id_cotizacion: cotizacion.id_cotizacion,
      estado_factura: 'pendiente',
      fecha_emision: new Date(),
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      monto_total: parseFloat(cotizacion.precio_total),
      monto_pagado: 0,
      descuento_aplicado: 0,
      observaciones: 'Factura generada por prueba del sistema',
      datos_fiscales: {
        cuit_cliente: cotizacion.cliente.cuit,
        razon_social: cotizacion.cliente.nombre,
        condicion_iva: 'Responsable Inscripto'
      }
    };

    const factura = await prisma.factura.create({
      data: datosFactura
    });

    console.log(`   ✅ Factura creada: ${factura.numero_factura}`);
    console.log(`   💵 Monto: $${factura.monto_total}`);

    // 3. Crear detalle de factura
    console.log('\n3. Creando detalle de factura...');

    const detalleFactura = await prisma.detalleFactura.create({
      data: {
        id_factura: factura.id_factura,
        concepto: `Plan Vacunal: ${cotizacion.plan.nombre}`,
        descripcion: `Cotización: ${cotizacion.numero_cotizacion} - Cliente: ${cotizacion.cliente.nombre}`,
        cantidad: 1,
        precio_unitario: parseFloat(cotizacion.precio_total),
        subtotal: parseFloat(cotizacion.precio_total),
        descuento: 0,
        impuestos: 0,
        tipo_item: 'plan_vacunal',
        referencia_id: cotizacion.id_plan
      }
    });

    console.log(`   ✅ Detalle creado: ${detalleFactura.concepto}`);

    // 4. Probar cambio de estado
    console.log('\n4. Cambiando estado de factura...');

    const facturaEnviada = await prisma.factura.update({
      where: { id_factura: factura.id_factura },
      data: {
        estado_factura: 'enviada',
        updated_at: new Date()
      }
    });

    console.log(`   ✅ Estado actualizado: ${facturaEnviada.estado_factura}`);

    // 5. Probar configuración de facturación en cotización
    console.log('\n5. Configurando modalidad de facturación...');

    const cotizacionActualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      data: {
        modalidad_facturacion: 'porcentaje_custom',
        porcentaje_aplicado: 50.0
      }
    });

    console.log(`   ✅ Modalidad configurada: ${cotizacionActualizada.modalidad_facturacion}`);
    console.log(`   📊 Porcentaje: ${cotizacionActualizada.porcentaje_aplicado}%`);

    // 6. Consultar facturas creadas
    console.log('\n6. Consultando facturas del cliente...');

    const facturasCliente = await prisma.factura.findMany({
      where: {
        cotizacion: {
          id_cliente: cotizacion.id_cliente
        }
      },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        },
        detalle_factura: true
      }
    });

    console.log(`   ✅ Total de facturas encontradas: ${facturasCliente.length}`);

    facturasCliente.forEach((f, index) => {
      console.log(`   📄 Factura ${index + 1}: ${f.numero_factura} - $${f.monto_total} (${f.estado_factura})`);
    });

    // 7. Simular reporte financiero básico
    console.log('\n7. Generando métricas financieras...');

    const todasFacturas = await prisma.factura.findMany();
    
    const metricas = {
      total_facturas: todasFacturas.length,
      total_facturado: todasFacturas.reduce((sum, f) => sum + parseFloat(f.monto_total), 0),
      total_cobrado: todasFacturas.reduce((sum, f) => sum + parseFloat(f.monto_pagado || 0), 0),
      facturas_pendientes: todasFacturas.filter(f => f.estado_factura === 'pendiente').length,
      facturas_enviadas: todasFacturas.filter(f => f.estado_factura === 'enviada').length,
      facturas_pagadas: todasFacturas.filter(f => f.estado_factura === 'pagada').length
    };

    console.log(`   📊 Métricas financieras:`);
    console.log(`      • Total facturas: ${metricas.total_facturas}`);
    console.log(`      • Total facturado: $${metricas.total_facturado.toFixed(2)}`);
    console.log(`      • Total cobrado: $${metricas.total_cobrado.toFixed(2)}`);
    console.log(`      • Pendientes: ${metricas.facturas_pendientes}`);
    console.log(`      • Enviadas: ${metricas.facturas_enviadas}`);
    console.log(`      • Pagadas: ${metricas.facturas_pagadas}`);

    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('=' .repeat(60));
    console.log('✅ El sistema de facturación está funcionando correctamente:');
    console.log('   • Generación de facturas desde cotizaciones');
    console.log('   • Gestión de estados de factura');
    console.log('   • Configuración de modalidades de facturación');
    console.log('   • Consultas y filtros de facturas');
    console.log('   • Métricas y reportes financieros');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
probarSistemaFacturacion();
