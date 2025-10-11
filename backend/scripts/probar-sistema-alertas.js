// Script para probar el sistema de alertas de stock
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Función para probar la verificación de estado de lotes
async function probarVerificacionLotes() {
  console.log('🔍 Probando verificación de estado de lotes...\n');
  
  try {
    // Obtener lista de cotizaciones activas
    const cotizacionesResponse = await axios.get(`${BASE_URL}/cotizaciones`, {
      withCredentials: true
    });
    
    if (!cotizacionesResponse.data || cotizacionesResponse.data.length === 0) {
      console.log('❌ No hay cotizaciones disponibles para probar');
      return;
    }
    
    const cotizacion = cotizacionesResponse.data[0];
    console.log(`📋 Probando con cotización ID: ${cotizacion.id_cotizacion}`);
    console.log(`   Cliente: ${cotizacion.cliente_nombre}`);
    console.log(`   Estado: ${cotizacion.estado_cotizacion}\n`);
    
    // Verificar estado de lotes
    const alertasResponse = await axios.get(`${BASE_URL}/cotizaciones/${cotizacion.id_cotizacion}/verificar-lotes`, {
      withCredentials: true
    });
    
    if (alertasResponse.data.success) {
      const { resumen, problemas, alertas, requiere_atencion } = alertasResponse.data.data;
      
      console.log('📊 RESUMEN DE VERIFICACIÓN:');
      console.log(`   Total calendarios: ${resumen.total_calendarios}`);
      console.log(`   Sin problemas: ${resumen.calendarios_sin_problemas}`);
      console.log(`   Con problemas: ${resumen.calendarios_con_problemas}`);
      console.log(`   Alertas preventivas: ${resumen.alertas_preventivas}`);
      console.log(`   Requiere atención: ${requiere_atencion ? '🔴 SÍ' : '🟢 NO'}\n`);
      
      if (Object.keys(resumen.tipos_problemas).length > 0) {
        console.log('🚨 TIPOS DE PROBLEMAS DETECTADOS:');
        Object.entries(resumen.tipos_problemas).forEach(([tipo, cantidad]) => {
          console.log(`   - ${tipo}: ${cantidad} casos`);
        });
        console.log('');
      }
      
      if (problemas.length > 0) {
        console.log('⚠️  PROBLEMAS CRÍTICOS:');
        problemas.forEach((problema, index) => {
          console.log(`   ${index + 1}. Semana ${problema.semana} - ${problema.producto}`);
          console.log(`      Fecha: ${problema.fecha_programada}`);
          console.log(`      Cantidad: ${problema.cantidad_requerida}`);
          problema.problemas.forEach(p => {
            console.log(`      - ${p.severidad.toUpperCase()}: ${p.mensaje}`);
          });
          console.log('');
        });
      }
      
      if (alertas.length > 0) {
        console.log('🟡 ALERTAS PREVENTIVAS:');
        alertas.forEach((alerta, index) => {
          console.log(`   ${index + 1}. Semana ${alerta.semana} - ${alerta.producto}`);
          console.log(`      ${alerta.mensaje}\n`);
        });
      }
      
      if (problemas.length === 0 && alertas.length === 0) {
        console.log('✅ ¡Excelente! Todos los lotes están correctamente asignados y disponibles.');
      }
      
    } else {
      console.log('❌ Error en la respuesta del servidor');
    }
    
  } catch (error) {
    console.error('❌ Error al probar verificación de lotes:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

// Función para simular problemas de stock
async function simularProblemasStock() {
  console.log('\n🧪 Simulando problemas de stock...\n');
  
  try {
    // Aquí podrías agregar lógica para modificar el stock y crear situaciones problemáticas
    console.log('💡 Para simular problemas puedes:');
    console.log('   1. Modificar fechas de vencimiento en la tabla stockVacuna');
    console.log('   2. Cambiar el estado de stock a "no_disponible"');
    console.log('   3. Reducir la cantidad disponible');
    console.log('   4. Eliminar registros de stock asignados');
    
  } catch (error) {
    console.error('❌ Error al simular problemas:', error.message);
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas del sistema de alertas de stock\n');
  console.log('=' .repeat(60));
  
  await probarVerificacionLotes();
  await simularProblemasStock();
  
  console.log('=' .repeat(60));
  console.log('✅ Pruebas completadas');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  probarVerificacionLotes,
  simularProblemasStock
};
