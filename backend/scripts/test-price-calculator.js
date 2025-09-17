/**
 * Tests para el servicio PriceCalculator
 * Ejecutar con: node scripts/test-price-calculator.js
 */

const PriceCalculator = require('../src/lib/priceCalculator');

function testCalcularPrecioConRecargo() {
  console.log('🧪 Testing calcularPrecioConRecargo...');
  
  // Test básico
  const precio1 = PriceCalculator.calcularPrecioConRecargo(100, 15);
  console.log(`   100 + 15% = ${precio1} (esperado: 115)`);
  
  const precio2 = PriceCalculator.calcularPrecioConRecargo(1000, 20);
  console.log(`   1000 + 20% = ${precio2} (esperado: 1200)`);
  
  const precio3 = PriceCalculator.calcularPrecioConRecargo(0.01, 25);
  console.log(`   0.01 + 25% = ${precio3} (esperado: 0.01)`);
  
  // Test error
  try {
    PriceCalculator.calcularPrecioConRecargo(0, 15);
    console.log('   ❌ Error: Debería fallar con precio 0');
  } catch (e) {
    console.log(`   ✅ Error capturado correctamente: ${e.message}`);
  }
  
  console.log('');
}

function testAplicarListaPrecios() {
  console.log('🧪 Testing aplicarListaPrecios...');
  
  const productos = [
    { id: 1, nombre: 'Producto A', precio_unitario: 100 },
    { id: 2, nombre: 'Producto B', precio_unitario: 200 },
    { id: 3, nombre: 'Producto C', precio_unitario: 50 }
  ];
  
  const listaPrecio = {
    id: 1,
    nombre: 'Lista L20',
    porcentaje_recargo: 20
  };
  
  const resultado = PriceCalculator.aplicarListaPrecios(productos, listaPrecio);
  
  console.log('   Productos originales vs con recargo:');
  resultado.forEach(producto => {
    console.log(`   • ${producto.nombre}: $${producto.precio_base_producto} → $${producto.precio_final_calculado}`);
  });
  
  console.log('');
}

function testCalcularSubtotal() {
  console.log('🧪 Testing calcularSubtotal...');
  
  const subtotal1 = PriceCalculator.calcularSubtotal(100, 5);
  console.log(`   100 × 5 = ${subtotal1} (esperado: 500)`);
  
  const subtotal2 = PriceCalculator.calcularSubtotal(115.50, 10);
  console.log(`   115.50 × 10 = ${subtotal2} (esperado: 1155)`);
  
  console.log('');
}

function testValidarPorcentajeRecargo() {
  console.log('🧪 Testing validarPorcentajeRecargo...');
  
  const casos = [
    { valor: 15, esperado: true },
    { valor: 0, esperado: true },
    { valor: 200, esperado: true },
    { valor: -5, esperado: false },
    { valor: 250, esperado: false },
    { valor: 'abc', esperado: false },
    { valor: null, esperado: false }
  ];
  
  casos.forEach(caso => {
    const resultado = PriceCalculator.validarPorcentajeRecargo(caso.valor);
    const status = resultado === caso.esperado ? '✅' : '❌';
    console.log(`   ${status} ${caso.valor} → ${resultado} (esperado: ${caso.esperado})`);
  });
  
  console.log('');
}

function testCalcularEstadisticas() {
  console.log('🧪 Testing calcularEstadisticasPrecios...');
  
  const productos = [
    { precio_base_producto: 100, precio_final_calculado: 115 },
    { precio_base_producto: 200, precio_final_calculado: 230 },
    { precio_base_producto: 50, precio_final_calculado: 57.5 }
  ];
  
  const stats = PriceCalculator.calcularEstadisticasPrecios(productos);
  
  console.log('   Estadísticas calculadas:');
  console.log(`   • Total productos: ${stats.total_productos}`);
  console.log(`   • Precio promedio base: $${stats.precio_promedio_base}`);
  console.log(`   • Precio promedio final: $${stats.precio_promedio_final}`);
  console.log(`   • Recargo promedio: ${stats.recargo_promedio}%`);
  console.log(`   • Total base: $${stats.total_base}`);
  console.log(`   • Total final: $${stats.total_final}`);
  console.log(`   • Total recargo: $${stats.total_recargo}`);
  
  console.log('');
}

function testFormatearPrecio() {
  console.log('🧪 Testing formatearPrecio...');
  
  const casos = [
    { precio: 1234.56, esperado: '$1.234,56' },
    { precio: 0, esperado: '$0,00' },
    { precio: 999999.99, esperado: '$999.999,99' }
  ];
  
  casos.forEach(caso => {
    const resultado = PriceCalculator.formatearPrecio(caso.precio);
    console.log(`   ${caso.precio} → ${resultado}`);
  });
  
  console.log('');
}

function testScenarioCompleto() {
  console.log('🧪 Testing escenario completo de cotización...');
  
  // Simular datos de una cotización real
  const productosDelPlan = [
    { id_producto: 1, nombre: 'Vacuna A', precio_unitario: 1500, cantidad_total: 10 },
    { id_producto: 2, nombre: 'Vacuna B', precio_unitario: 800, cantidad_total: 5 },
    { id_producto: 3, nombre: 'Suplemento C', precio_unitario: 300, cantidad_total: 20 }
  ];
  
  const listaPrecio = {
    nombre: 'Lista L25',
    porcentaje_recargo: 25
  };
  
  console.log(`   Lista aplicada: ${listaPrecio.nombre} (+${listaPrecio.porcentaje_recargo}%)`);
  console.log('   Desglose por producto:');
  
  let totalCotizacion = 0;
  
  productosDelPlan.forEach(producto => {
    const precioBase = parseFloat(producto.precio_unitario);
    const precioConRecargo = PriceCalculator.calcularPrecioConRecargo(precioBase, listaPrecio.porcentaje_recargo);
    const subtotal = PriceCalculator.calcularSubtotal(precioConRecargo, producto.cantidad_total);
    const recargo = PriceCalculator.calcularMontoRecargo(precioBase, listaPrecio.porcentaje_recargo);
    
    totalCotizacion += subtotal;
    
    console.log(`   • ${producto.nombre}:`);
    console.log(`     - Precio base: ${PriceCalculator.formatearPrecio(precioBase)}`);
    console.log(`     - Recargo (+${listaPrecio.porcentaje_recargo}%): ${PriceCalculator.formatearPrecio(recargo)}`);
    console.log(`     - Precio final: ${PriceCalculator.formatearPrecio(precioConRecargo)}`);
    console.log(`     - Cantidad: ${producto.cantidad_total}`);
    console.log(`     - Subtotal: ${PriceCalculator.formatearPrecio(subtotal)}`);
    console.log('');
  });
  
  console.log(`   💰 TOTAL COTIZACIÓN: ${PriceCalculator.formatearPrecio(totalCotizacion)}`);
  console.log('');
}

// Ejecutar todos los tests
function runAllTests() {
  console.log('🚀 INICIANDO TESTS DEL PRICE CALCULATOR\n');
  console.log('='.repeat(50));
  console.log('');
  
  testCalcularPrecioConRecargo();
  testAplicarListaPrecios();
  testCalcularSubtotal();
  testValidarPorcentajeRecargo();
  testCalcularEstadisticas();
  testFormatearPrecio();
  testScenarioCompleto();
  
  console.log('='.repeat(50));
  console.log('✅ TODOS LOS TESTS COMPLETADOS');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testCalcularPrecioConRecargo,
  testAplicarListaPrecios,
  testCalcularSubtotal,
  testValidarPorcentajeRecargo,
  testCalcularEstadisticas,
  testFormatearPrecio,
  testScenarioCompleto
};