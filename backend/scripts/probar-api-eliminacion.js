const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Token simulado (en producción vendría del login)
const AUTH_TOKEN = 'fake-token-for-testing';

async function probarAPIEliminacion() {
  try {
    console.log('=== PRUEBA DE ELIMINACIÓN VÍA API ===\n');

    // 1. Obtener cotizaciones disponibles
    console.log('1. OBTENIENDO COTIZACIONES DISPONIBLES...');
    
    try {
      const responseCotizaciones = await axios.get(`${API_BASE}/cotizaciones`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      const cotizaciones = responseCotizaciones.data.filter(c => c.estado !== 'eliminada');
      console.log(`   Cotizaciones disponibles: ${cotizaciones.length}`);
      
      if (cotizaciones.length === 0) {
        console.log('❌ No hay cotizaciones disponibles para probar');
        return;
      }

      const cotizacion = cotizaciones[0];
      console.log(`   Usando cotización: ${cotizacion.numero_cotizacion} (ID: ${cotizacion.id_cotizacion}, Estado: ${cotizacion.estado})`);

      // 2. Si no está aceptada, aceptarla primero
      if (cotizacion.estado !== 'aceptada') {
        console.log('\n2. ACEPTANDO COTIZACIÓN PARA CREAR RESERVAS...');
        
        try {
          const responseAceptar = await axios.put(
            `${API_BASE}/cotizaciones/${cotizacion.id_cotizacion}/estado`,
            { 
              estado: 'aceptada',
              observaciones: 'Prueba automática - aceptando para crear reservas'
            },
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
          );
          
          console.log(`   ✅ Cotización aceptada exitosamente`);
        } catch (errorAceptar) {
          console.log(`   ⚠️  Error aceptando cotización: ${errorAceptar.response?.data?.error || errorAceptar.message}`);
          console.log('   Continuando con la prueba...');
        }
      }

      // 3. Verificar reservas después de aceptar
      console.log('\n3. VERIFICANDO RESERVAS DESPUÉS DE ACEPTAR...');
      try {
        const responseStock = await axios.get(`${API_BASE}/dashboard/stock`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
        });
        
        const stockData = responseStock.data;
        const ad140001 = stockData.find(item => item.nombre === 'AD140001');
        
        if (ad140001) {
          console.log(`   AD140001:`);
          console.log(`     Stock total: ${ad140001.stock || 0}`);
          console.log(`     Stock reservado: ${ad140001.stock_reservado || 0}`);
          console.log(`     Stock disponible: ${(ad140001.stock || 0) - (ad140001.stock_reservado || 0)}`);
        }
      } catch (errorStock) {
        console.log(`   ⚠️  Error obteniendo stock: ${errorStock.message}`);
      }

      // 4. Eliminar la cotización
      console.log('\n4. 🗑️  ELIMINANDO COTIZACIÓN VÍA API...');
      
      try {
        const responseEliminar = await axios.delete(`${API_BASE}/cotizaciones/${cotizacion.id_cotizacion}`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
          data: { motivo: 'Prueba automática de liberación de reservas' }
        });
        
        console.log(`   ✅ Cotización eliminada exitosamente`);
        console.log(`   Respuesta: ${responseEliminar.data.message}`);
      } catch (errorEliminar) {
        console.log(`   ❌ Error eliminando cotización: ${errorEliminar.response?.data?.error || errorEliminar.message}`);
        return;
      }

      // 5. Verificar stock después de eliminar
      console.log('\n5. VERIFICANDO STOCK DESPUÉS DE ELIMINAR...');
      try {
        const responseStockFinal = await axios.get(`${API_BASE}/dashboard/stock`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
        });
        
        const stockDataFinal = responseStockFinal.data;
        const ad140001Final = stockDataFinal.find(item => item.nombre === 'AD140001');
        
        if (ad140001Final) {
          console.log(`   AD140001 DESPUÉS DE ELIMINAR:`);
          console.log(`     Stock total: ${ad140001Final.stock || 0}`);
          console.log(`     Stock reservado: ${ad140001Final.stock_reservado || 0}`);
          console.log(`     Stock disponible: ${(ad140001Final.stock || 0) - (ad140001Final.stock_reservado || 0)}`);
          
          if ((ad140001Final.stock_reservado || 0) === 0) {
            console.log(`   ✅ ¡ÉXITO! Stock reservado liberado correctamente`);
          } else {
            console.log(`   ⚠️  Posible problema: Stock reservado no se liberó completamente`);
          }
        }
      } catch (errorStockFinal) {
        console.log(`   ⚠️  Error obteniendo stock final: ${errorStockFinal.message}`);
      }

      // 6. Verificar estado de la cotización
      console.log('\n6. VERIFICANDO ESTADO FINAL DE LA COTIZACIÓN...');
      try {
        const responseCotizacionFinal = await axios.get(`${API_BASE}/cotizaciones/${cotizacion.id_cotizacion}`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
        });
        
        const cotizacionFinal = responseCotizacionFinal.data;
        console.log(`   Estado final: ${cotizacionFinal.estado}`);
        console.log(`   Observaciones: ${cotizacionFinal.observaciones || 'Sin observaciones'}`);
      } catch (errorCotizacionFinal) {
        console.log(`   ⚠️  Error obteniendo cotización final: ${errorCotizacionFinal.response?.data?.error || errorCotizacionFinal.message}`);
      }

      console.log('\n🎯 PRUEBA COMPLETADA');

    } catch (errorGeneral) {
      console.log(`❌ Error en la prueba: ${errorGeneral.response?.data?.error || errorGeneral.message}`);
    }

  } catch (error) {
    console.error('❌ Error durante la prueba de API:', error.message);
  }
}

if (require.main === module) {
  probarAPIEliminacion();
}

module.exports = { probarAPIEliminacion };