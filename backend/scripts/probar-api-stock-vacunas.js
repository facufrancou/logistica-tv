const axios = require('axios');

async function probarAPIStock() {
  console.log('🔍 Probando endpoints de stock de vacunas...\n');

  const baseURL = 'http://localhost:3000';
  
  try {
    // Primero hacer login para obtener el token
    console.log('🔐 Iniciando sesión...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@logistica.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('✅ Sesión iniciada correctamente\n');

    // Probar endpoint de stock
    console.log('📦 Probando GET /stock-vacunas...');
    const stockResponse = await axios.get(`${baseURL}/stock-vacunas`, { headers });
    
    console.log(`✅ Respuesta exitosa - Total registros: ${stockResponse.data.data?.length || 0}`);
    console.log(`📊 Total páginas: ${stockResponse.data.pagination?.totalPages || 'N/A'}`);
    console.log(`💉 Total stock: ${stockResponse.data.pagination?.totalItems || 'N/A'}\n`);

    // Mostrar algunos registros de ejemplo
    if (stockResponse.data.data && stockResponse.data.data.length > 0) {
      console.log('📋 Primeros 3 registros de stock:');
      stockResponse.data.data.slice(0, 3).forEach((stock, index) => {
        console.log(`   ${index + 1}. ${stock.vacuna?.codigo} - ${stock.vacuna?.nombre}`);
        console.log(`      Lote: ${stock.lote} | Stock: ${stock.stock_actual} | Vence: ${stock.fecha_vencimiento}`);
      });
    }

    // Probar endpoint de alertas
    console.log('\n🚨 Probando GET /stock-vacunas/alertas...');
    const alertasResponse = await axios.get(`${baseURL}/stock-vacunas/alertas`, { headers });
    
    console.log('✅ Respuesta de alertas exitosa');
    console.log('📊 Alertas encontradas:');
    
    if (alertasResponse.data.alertas) {
      const alertas = alertasResponse.data.alertas;
      console.log(`   - Stock bajo: ${alertas.stock_bajo?.length || 0}`);
      console.log(`   - Próximos a vencer: ${alertas.proximos_vencimientos?.length || 0}`);
      console.log(`   - Vencidas: ${alertas.vencidas?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Error probando API:', error.response?.data || error.message);
  }
}

// Ejecutar prueba
if (require.main === module) {
  probarAPIStock()
    .then(() => {
      console.log('\n✅ Pruebas completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { probarAPIStock };