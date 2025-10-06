const axios = require('axios');

// URL base del API
const API_BASE = 'http://localhost:3001';

// Configuración de headers
const headers = {
  'Content-Type': 'application/json',
  'Cookie': 'usuario=admin'
};

async function crearElemento(endpoint, data) {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, data, { headers });
    return response.data;
  } catch (error) {
    console.log(`⚠️  Error creando ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

async function obtenerElementos(endpoint) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
    return response.data.data || response.data;
  } catch (error) {
    console.log(`⚠️  Error obteniendo ${endpoint}:`, error.response?.data || error.message);
    return [];
  }
}

async function crearStockEjemplo() {
  console.log('🚀 Creando ejemplos de stock de vacunas...');

  try {
    // Obtener algunas vacunas creadas
    const vacunas = await obtenerElementos('/vacunas');
    
    if (vacunas.length === 0) {
      console.log('❌ No hay vacunas disponibles para crear stock');
      return;
    }

    console.log(`📦 Encontradas ${vacunas.length} vacunas disponibles`);

    // Crear stock para las primeras 10 vacunas
    let stockCreados = 0;
    const fechaHoy = new Date();
    
    for (let i = 0; i < Math.min(10, vacunas.length); i++) {
      const vacuna = vacunas[i];
      
      // Crear 2-3 lotes por vacuna con diferentes vencimientos
      const numLotes = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numLotes; j++) {
        // Fecha de vencimiento aleatoria entre 30 días y 2 años
        const diasVencimiento = Math.floor(Math.random() * 700) + 30;
        const fechaVencimiento = new Date(fechaHoy);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVencimiento);

        // Cantidad aleatoria de stock
        const stockActual = Math.floor(Math.random() * 1000) + 100;
        const stockMinimo = Math.floor(stockActual * 0.1);

        // Precio de compra (80-95% del precio de lista)
        const precioCompra = vacuna.precio_lista ? 
          (vacuna.precio_lista * (0.8 + Math.random() * 0.15)) : 
          (Math.random() * 50000 + 10000);

        const datosStock = {
          id_vacuna: vacuna.id_vacuna,
          lote: `L${vacuna.codigo}-${String(j + 1).padStart(3, '0')}-${new Date().getFullYear()}`,
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
          precio_compra: Math.round(precioCompra * 100) / 100,
          ubicacion_fisica: `Heladera ${String.fromCharCode(65 + Math.floor(Math.random() * 3))} - Estante ${Math.floor(Math.random() * 5) + 1}`,
          temperatura_req: Math.random() > 0.5 ? '2-8°C' : 'Temperatura ambiente',
          observaciones: `Stock creado automáticamente - Lote ${j + 1} de ${vacuna.nombre}`
        };

        const nuevoStock = await crearElemento('/stock-vacunas', datosStock);
        
        if (nuevoStock) {
          console.log(`   ✅ Stock creado: ${datosStock.lote} (${vacuna.codigo} - ${vacuna.nombre})`);
          stockCreados++;
        }
      }
    }

    console.log(`\n🎉 STOCK DE EJEMPLO CREADO:`);
    console.log(`   📦 Registros de stock creados: ${stockCreados}`);
    console.log(`   💉 Vacunas con stock: ${Math.min(10, vacunas.length)}`);

  } catch (error) {
    console.error('❌ Error creando stock de ejemplo:', error);
    throw error;
  }
}

// Ejecutar
if (require.main === module) {
  crearStockEjemplo()
    .then(() => {
      console.log('✅ Creación de stock finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { crearStockEjemplo };