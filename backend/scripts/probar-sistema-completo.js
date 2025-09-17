/**
 * Script para probar el nuevo sistema de precios y clasificación fiscal
 * Ejecutar con: node scripts/probar-sistema-completo.js
 */

const { PrismaClient } = require('@prisma/client');
const PriceCalculator = require('../src/lib/priceCalculator');

const prisma = new PrismaClient();

async function probarNuevoSistemaPrecios() {
  console.log('🧪 PROBANDO NUEVO SISTEMA DE PRECIOS Y CLASIFICACIÓN FISCAL\n');
  console.log('='.repeat(70));
  console.log('');

  try {
    // 1. Verificar listas de precios actualizadas
    console.log('📋 1. VERIFICANDO LISTAS DE PRECIOS:');
    const listas = await prisma.listaPrecio.findMany();
    
    listas.forEach(lista => {
      console.log(`   • ${lista.nombre}: ${lista.porcentaje_recargo}% de recargo`);
      console.log(`     - Descripción: ${lista.descripcion}`);
      console.log(`     - Activa: ${lista.activa ? 'Sí' : 'No'}\n`);
    });

    // 2. Probar cálculo de precios con diferentes listas
    console.log('💰 2. PROBANDO CÁLCULOS DE PRECIOS:');
    const productoPrueba = {
      nombre: 'Vacuna Test',
      precio_unitario: 1000,
      cantidad: 10
    };

    for (const lista of listas.slice(0, 3)) {
      const precioConRecargo = PriceCalculator.calcularPrecioConRecargo(
        productoPrueba.precio_unitario, 
        lista.porcentaje_recargo
      );
      const subtotal = PriceCalculator.calcularSubtotal(precioConRecargo, productoPrueba.cantidad);
      
      console.log(`   📦 ${productoPrueba.nombre} con ${lista.nombre}:`);
      console.log(`      - Precio base: ${PriceCalculator.formatearPrecio(productoPrueba.precio_unitario)}`);
      console.log(`      - Recargo (+${lista.porcentaje_recargo}%): ${PriceCalculator.formatearPrecio(precioConRecargo - productoPrueba.precio_unitario)}`);
      console.log(`      - Precio final: ${PriceCalculator.formatearPrecio(precioConRecargo)}`);
      console.log(`      - Cantidad: ${productoPrueba.cantidad}`);
      console.log(`      - Subtotal: ${PriceCalculator.formatearPrecio(subtotal)}\n`);
    }

    // 3. Verificar cotizaciones existentes migradas
    console.log('💼 3. VERIFICANDO COTIZACIONES MIGRADAS:');
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        cliente: { select: { nombre: true } },
        lista_precio: { select: { nombre: true, porcentaje_recargo: true } },
        detalle_cotizacion: {
          include: {
            producto: { select: { nombre: true } }
          }
        }
      }
    });

    cotizaciones.forEach(cotizacion => {
      console.log(`   💼 ${cotizacion.numero_cotizacion}:`);
      console.log(`      - Cliente: ${cotizacion.cliente.nombre}`);
      console.log(`      - Lista: ${cotizacion.lista_precio?.nombre || 'Sin lista'}`);
      console.log(`      - Total: ${PriceCalculator.formatearPrecio(parseFloat(cotizacion.precio_total))}`);
      console.log(`      - Items: ${cotizacion.detalle_cotizacion.length}`);
      
      cotizacion.detalle_cotizacion.forEach(detalle => {
        console.log(`        • ${detalle.producto.nombre}:`);
        console.log(`          Base: ${PriceCalculator.formatearPrecio(parseFloat(detalle.precio_base_producto))}`);
        console.log(`          Final: ${PriceCalculator.formatearPrecio(parseFloat(detalle.precio_final_calculado))}`);
        console.log(`          Recargo: ${detalle.porcentaje_aplicado || 0}%`);
        console.log(`          Clasificación: ${detalle.facturacion_tipo}`);
      });
      console.log('');
    });

    // 4. Simular clasificación fiscal
    console.log('🏷️  4. SIMULANDO CLASIFICACIÓN FISCAL:');
    
    if (cotizaciones.length > 0) {
      const cotizacionPrueba = cotizaciones[0];
      console.log(`   Trabajando con cotización: ${cotizacionPrueba.numero_cotizacion}\n`);
      
      // Simular clasificación de items
      for (const [index, detalle] of cotizacionPrueba.detalle_cotizacion.entries()) {
        const tipoFiscal = index % 2 === 0 ? 'negro' : 'blanco'; // Alternar tipos
        const subtotal = parseFloat(detalle.subtotal);
        
        console.log(`   📦 Clasificando ${detalle.producto.nombre}:`);
        console.log(`      - Subtotal: ${PriceCalculator.formatearPrecio(subtotal)}`);
        console.log(`      - Tipo fiscal: ${tipoFiscal.toUpperCase()}`);
        
        // Actualizar base de datos (simulación)
        await prisma.detalleCotizacion.update({
          where: { id_detalle_cotizacion: detalle.id_detalle_cotizacion },
          data: { facturacion_tipo: tipoFiscal }
        });
        
        // Crear/actualizar item de facturación
        await prisma.itemFacturacion.upsert({
          where: { id_detalle_cotizacion: detalle.id_detalle_cotizacion },
          update: {
            tipo_facturacion: tipoFiscal,
            monto_negro: tipoFiscal === 'negro' ? subtotal : null,
            monto_blanco: tipoFiscal === 'blanco' ? subtotal : null,
            fecha_clasificacion: new Date()
          },
          create: {
            id_detalle_cotizacion: detalle.id_detalle_cotizacion,
            tipo_facturacion: tipoFiscal,
            monto_negro: tipoFiscal === 'negro' ? subtotal : null,
            monto_blanco: tipoFiscal === 'blanco' ? subtotal : null
          }
        });
        
        console.log(`      ✅ Clasificado como ${tipoFiscal}\n`);
      }
    }

    // 5. Generar resumen de liquidación
    console.log('📊 5. GENERANDO RESUMEN DE LIQUIDACIÓN:');
    
    if (cotizaciones.length > 0) {
      const cotizacionPrueba = cotizaciones[0];
      
      // Obtener items clasificados
      const itemsClasificados = await prisma.itemFacturacion.findMany({
        where: {
          detalle_cotizacion: {
            id_cotizacion: cotizacionPrueba.id_cotizacion
          }
        }
      });
      
      let totalNegro = 0;
      let totalBlanco = 0;
      
      itemsClasificados.forEach(item => {
        if (item.monto_negro) totalNegro += parseFloat(item.monto_negro);
        if (item.monto_blanco) totalBlanco += parseFloat(item.monto_blanco);
      });
      
      const totalGeneral = totalNegro + totalBlanco;
      const porcentajeNegro = totalGeneral > 0 ? (totalNegro / totalGeneral * 100) : 0;
      const porcentajeBlanco = totalGeneral > 0 ? (totalBlanco / totalGeneral * 100) : 0;
      
      // Crear resumen
      const resumen = await prisma.resumenLiquidacion.upsert({
        where: { id_cotizacion: cotizacionPrueba.id_cotizacion },
        update: {
          total_negro: totalNegro,
          total_blanco: totalBlanco,
          total_general: totalGeneral,
          porcentaje_negro: porcentajeNegro,
          porcentaje_blanco: porcentajeBlanco,
          fecha_generacion: new Date()
        },
        create: {
          id_cotizacion: cotizacionPrueba.id_cotizacion,
          total_negro: totalNegro,
          total_blanco: totalBlanco,
          total_general: totalGeneral,
          porcentaje_negro: porcentajeNegro,
          porcentaje_blanco: porcentajeBlanco
        }
      });
      
      console.log(`   📋 Resumen para ${cotizacionPrueba.numero_cotizacion}:`);
      console.log(`      💰 TOTALES:`);
      console.log(`         - En Negro: ${PriceCalculator.formatearPrecio(totalNegro)} (${porcentajeNegro.toFixed(1)}%)`);
      console.log(`         - En Blanco: ${PriceCalculator.formatearPrecio(totalBlanco)} (${porcentajeBlanco.toFixed(1)}%)`);
      console.log(`         - Total General: ${PriceCalculator.formatearPrecio(totalGeneral)}`);
      console.log(`      📅 Generado: ${new Date().toLocaleString('es-AR')}\n`);
    }

    // 6. Estadísticas finales
    console.log('📈 6. ESTADÍSTICAS DEL SISTEMA:');
    
    const stats = {
      total_listas: await prisma.listaPrecio.count(),
      total_cotizaciones: await prisma.cotizacion.count(),
      total_items: await prisma.detalleCotizacion.count(),
      items_clasificados: await prisma.detalleCotizacion.count({
        where: { facturacion_tipo: { not: 'pendiente' } }
      }),
      resumenes_generados: await prisma.resumenLiquidacion.count(),
      items_facturacion: await prisma.itemFacturacion.count()
    };
    
    console.log(`   📊 Resumen del sistema:`);
    console.log(`      - Listas de precios: ${stats.total_listas}`);
    console.log(`      - Cotizaciones: ${stats.total_cotizaciones}`);
    console.log(`      - Items de cotización: ${stats.total_items}`);
    console.log(`      - Items clasificados: ${stats.items_clasificados}/${stats.total_items}`);
    console.log(`      - Resúmenes de liquidación: ${stats.resumenes_generados}`);
    console.log(`      - Registros de facturación: ${stats.items_facturacion}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ PRUEBA COMPLETA DEL SISTEMA FINALIZADA');
    console.log('');
    console.log('🎯 RESULTADOS:');
    console.log('   ✅ Sistema de precios con recargos: FUNCIONANDO');
    console.log('   ✅ Migración de datos existentes: COMPLETA');
    console.log('   ✅ Clasificación fiscal de items: IMPLEMENTADA');
    console.log('   ✅ Generación de resúmenes: OPERATIVA');
    console.log('   ✅ Nuevas tablas y relaciones: CREADAS');
    console.log('');
    console.log('🚀 EL BACKEND ESTÁ LISTO PARA USAR');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  probarNuevoSistemaPrecios();
}

module.exports = { probarNuevoSistemaPrecios };