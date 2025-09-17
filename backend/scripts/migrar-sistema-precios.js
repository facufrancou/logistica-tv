/**
 * Script para migrar las listas de precios al nuevo sistema de porcentajes de recargo
 * También actualiza cotizaciones existentes con los nuevos campos
 */

const { PrismaClient } = require('@prisma/client');
const PriceCalculator = require('../src/lib/priceCalculator');

const prisma = new PrismaClient();

// Configuración de porcentajes según el análisis de las listas existentes
const PORCENTAJES_POR_LISTA = {
  'L15': 15,  // 15% de recargo
  'L18': 18,  // 18% de recargo
  'L20': 20,  // 20% de recargo
  'L25': 25,  // 25% de recargo
  'L30': 30   // 30% de recargo
};

async function migrarListasPrecios() {
  console.log('📋 MIGRANDO LISTAS DE PRECIOS...\n');

  try {
    const listas = await prisma.listaPrecio.findMany();
    
    for (const lista of listas) {
      const porcentajeRecargo = PORCENTAJES_POR_LISTA[lista.tipo] || 0;
      
      console.log(`🏷️  Actualizando ${lista.nombre} (${lista.tipo})`);
      console.log(`   Porcentaje de recargo: ${porcentajeRecargo}%`);
      
      // Actualizar descripción para reflejar el cambio
      const nuevaDescripcion = `Lista de precios con recargo del ${porcentajeRecargo}%`;
      
      await prisma.listaPrecio.update({
        where: { id_lista: lista.id_lista },
        data: {
          porcentaje_recargo: porcentajeRecargo,
          descripcion: nuevaDescripcion,
          updated_at: new Date()
        }
      });
      
      console.log(`   ✅ Actualizada con ${porcentajeRecargo}% de recargo\n`);
    }
    
    console.log('✅ Migración de listas de precios completada\n');
    
  } catch (error) {
    console.error('❌ Error en migración de listas de precios:', error);
    throw error;
  }
}

async function migrarCotizacionesExistentes() {
  console.log('💼 MIGRANDO COTIZACIONES EXISTENTES...\n');

  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        detalle_cotizacion: {
          include: {
            producto: true
          }
        },
        lista_precio: true
      }
    });

    console.log(`📊 Encontradas ${cotizaciones.length} cotizaciones para migrar\n`);

    for (const cotizacion of cotizaciones) {
      console.log(`💼 Migrando cotización ${cotizacion.numero_cotizacion}`);
      
      const porcentajeRecargo = cotizacion.lista_precio?.porcentaje_recargo || 0;
      console.log(`   Lista aplicada: ${cotizacion.lista_precio?.nombre || 'Sin lista'} (${porcentajeRecargo}%)`);
      
      // Migrar cada detalle de cotización
      for (const detalle of cotizacion.detalle_cotizacion) {
        const precioBase = parseFloat(detalle.producto.precio_unitario);
        const precioActual = parseFloat(detalle.precio_unitario);
        
        let precioFinalCalculado = precioBase;
        let porcentajeAplicado = 0;
        
        // Si hay una lista de precios, calcular el precio con recargo
        if (porcentajeRecargo > 0) {
          porcentajeAplicado = porcentajeRecargo;
          precioFinalCalculado = PriceCalculator.calcularPrecioConRecargo(precioBase, porcentajeRecargo);
        } else {
          // Si no hay lista, usar el precio actual como final
          precioFinalCalculado = precioActual;
        }
        
        // Recalcular subtotal
        const nuevoSubtotal = PriceCalculator.calcularSubtotal(precioFinalCalculado, detalle.cantidad_total);
        
        await prisma.detalleCotizacion.update({
          where: { id_detalle_cotizacion: detalle.id_detalle_cotizacion },
          data: {
            precio_base_producto: precioBase,
            porcentaje_aplicado: porcentajeAplicado || null,
            precio_final_calculado: precioFinalCalculado,
            precio_unitario: precioFinalCalculado, // Mantener compatibilidad
            subtotal: nuevoSubtotal,
            facturacion_tipo: 'pendiente',
            editado_manualmente: false
          }
        });
        
        console.log(`     • ${detalle.producto.nombre}: $${precioBase} → $${precioFinalCalculado} (${porcentajeAplicado}%)`);
      }
      
      // Recalcular precio total de la cotización
      const nuevoPrecioTotal = cotizacion.detalle_cotizacion.reduce((total, detalle) => {
        const precioBase = parseFloat(detalle.producto.precio_unitario);
        let precioFinal = precioBase;
        
        if (porcentajeRecargo > 0) {
          precioFinal = PriceCalculator.calcularPrecioConRecargo(precioBase, porcentajeRecargo);
        }
        
        return total + PriceCalculator.calcularSubtotal(precioFinal, detalle.cantidad_total);
      }, 0);
      
      await prisma.cotizacion.update({
        where: { id_cotizacion: cotizacion.id_cotizacion },
        data: {
          precio_total: nuevoPrecioTotal,
          updated_at: new Date()
        }
      });
      
      console.log(`   💰 Precio total actualizado: $${nuevoPrecioTotal}`);
      console.log('   ✅ Cotización migrada\n');
    }
    
    console.log('✅ Migración de cotizaciones completada\n');
    
  } catch (error) {
    console.error('❌ Error en migración de cotizaciones:', error);
    throw error;
  }
}

async function limpiarDatosAntiguos() {
  console.log('🧹 LIMPIANDO DATOS ANTIGUOS...\n');

  try {
    // Como la tabla PrecioPorLista está vacía según el análisis, 
    // solo necesitamos verificar esto
    const preciosPorLista = await prisma.precioPorLista.count();
    
    if (preciosPorLista > 0) {
      console.log(`⚠️  Encontrados ${preciosPorLista} registros en PrecioPorLista`);
      console.log('   ❗ Considera revisar estos datos antes de eliminarlos');
      
      // Por seguridad, no eliminamos automáticamente
      // await prisma.precioPorLista.deleteMany();
      // console.log('   ✅ Tabla PrecioPorLista limpiada');
    } else {
      console.log('✅ Tabla PrecioPorLista ya está vacía');
    }
    
    console.log('✅ Limpieza completada\n');
    
  } catch (error) {
    console.error('❌ Error en limpieza de datos:', error);
    throw error;
  }
}

async function verificarMigracion() {
  console.log('🔍 VERIFICANDO MIGRACIÓN...\n');

  try {
    // Verificar listas de precios
    const listas = await prisma.listaPrecio.findMany();
    console.log('📋 LISTAS DE PRECIOS:');
    listas.forEach(lista => {
      console.log(`   • ${lista.nombre}: ${lista.porcentaje_recargo}% de recargo`);
    });
    
    // Verificar algunas cotizaciones
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        detalle_cotizacion: true,
        lista_precio: true
      },
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    
    console.log('\n💼 COTIZACIONES VERIFICADAS:');
    cotizaciones.forEach(cotizacion => {
      console.log(`   • ${cotizacion.numero_cotizacion}:`);
      console.log(`     - Lista: ${cotizacion.lista_precio?.nombre || 'Sin lista'}`);
      console.log(`     - Items: ${cotizacion.detalle_cotizacion.length}`);
      console.log(`     - Total: $${cotizacion.precio_total}`);
      
      const itemsConPorcentaje = cotizacion.detalle_cotizacion.filter(d => d.porcentaje_aplicado > 0).length;
      console.log(`     - Items con recargo: ${itemsConPorcentaje}/${cotizacion.detalle_cotizacion.length}`);
    });
    
    // Estadísticas generales
    const totalCotizaciones = await prisma.cotizacion.count();
    const totalDetalles = await prisma.detalleCotizacion.count();
    const detallesConRecargo = await prisma.detalleCotizacion.count({
      where: { porcentaje_aplicado: { gt: 0 } }
    });
    
    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`   • Total cotizaciones: ${totalCotizaciones}`);
    console.log(`   • Total items: ${totalDetalles}`);
    console.log(`   • Items con recargo: ${detallesConRecargo}`);
    console.log(`   • Items pendientes clasificación: ${totalDetalles} (todos)`);
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    throw error;
  }
}

async function ejecutarMigracionCompleta() {
  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DEL SISTEMA DE PRECIOS\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    await migrarListasPrecios();
    await migrarCotizacionesExistentes();
    await limpiarDatosAntiguos();
    await verificarMigracion();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('');
    console.log('📋 PRÓXIMOS PASOS:');
    console.log('   1. Ejecutar migraciones de Prisma para aplicar cambios de schema');
    console.log('   2. Probar creación de nuevas cotizaciones');
    console.log('   3. Probar clasificación fiscal de items');
    console.log('   4. Generar resúmenes de liquidación');
    console.log('   5. Actualizar frontend para nuevas funcionalidades');
    
  } catch (error) {
    console.error('\n❌ MIGRACIÓN FALLIDA:', error);
    console.log('\n⚠️  RECOMENDACIONES:');
    console.log('   1. Restaurar backup de base de datos');
    console.log('   2. Revisar logs de error');
    console.log('   3. Corregir problemas y reintentar');
  } finally {
    await prisma.$disconnect();
  }
}

// Función para ejecutar solo migración de listas
async function migrarSoloListas() {
  console.log('🏷️  MIGRANDO SOLO LISTAS DE PRECIOS\n');
  
  try {
    await migrarListasPrecios();
    console.log('✅ Migración de listas completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para ejecutar solo migración de cotizaciones
async function migrarSoloCotizaciones() {
  console.log('💼 MIGRANDO SOLO COTIZACIONES\n');
  
  try {
    await migrarCotizacionesExistentes();
    console.log('✅ Migración de cotizaciones completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según argumentos de línea de comandos
if (require.main === module) {
  const comando = process.argv[2];
  
  switch (comando) {
    case 'listas':
      migrarSoloListas();
      break;
    case 'cotizaciones':
      migrarSoloCotizaciones();
      break;
    case 'verificar':
      verificarMigracion().then(() => prisma.$disconnect());
      break;
    default:
      ejecutarMigracionCompleta();
  }
}

module.exports = {
  ejecutarMigracionCompleta,
  migrarListasPrecios,
  migrarCotizacionesExistentes,
  limpiarDatosAntiguos,
  verificarMigracion
};