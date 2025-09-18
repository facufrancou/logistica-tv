/**
 * Script para probar la actualización de cotización
 * Prueba el endpoint PUT /cotizaciones/:id
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Datos de prueba para actualizar cotización
const datosActualizacion = {
  observaciones: 'Actualización de prueba desde script de testing',
  fecha_inicio_plan: '2024-10-01'
};

async function probarActualizacion() {
  try {
    console.log('🔍 Probando actualización de cotización...');
    
    // Usar la cotización que reactivamos antes (ID 6)
    const cotizacionId = 6;
    
    console.log(`📝 Actualizando cotización ID: ${cotizacionId}`);
    console.log('📋 Datos a actualizar:', datosActualizacion);
    
    const response = await axios.put(
      `${BASE_URL}/cotizaciones/${cotizacionId}`,
      datosActualizacion,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Actualización exitosa!');
    console.log('📊 Respuesta del servidor:', response.data);
    
  } catch (error) {
    console.error('❌ Error al actualizar cotización:', error.response?.data || error.message);
    console.log('🔧 Status:', error.response?.status);
    console.log('🔧 URL:', error.config?.url);
  }
}

// Ejecutar prueba
probarActualizacion();