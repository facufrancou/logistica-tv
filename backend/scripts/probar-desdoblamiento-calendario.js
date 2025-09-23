const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function probarDesdoblamiento() {
  console.log('🧪 Probando funcionalidad de desdoblamiento de calendario...\n');

  try {
    // 1. Obtener un calendario existente
    console.log('1. Obteniendo calendario para cotización de prueba...');
    const calendarioResponse = await axios.get(`${BASE_URL}/api/cotizaciones/1/calendario`);
    const calendarioData = calendarioResponse.data;
    
    if (!calendarioData.success || !calendarioData.data || calendarioData.data.length === 0) {
      console.log('❌ No se encontraron calendarios para prueba');
      return;
    }

    const calendarioOriginal = calendarioData.data[0];
    console.log(`✅ Calendario encontrado: ID ${calendarioOriginal.id_calendario}, Semana ${calendarioOriginal.numero_semana}, Producto ${calendarioOriginal.producto?.nombre || 'N/A'}`);

    // 2. Crear primer desdoblamiento
    console.log('\n2. Creando primer desdoblamiento...');
    const fechaAplicacion1 = new Date();
    fechaAplicacion1.setDate(fechaAplicacion1.getDate() + 1); // Mañana

    const desdoblamiento1Response = await axios.post(`${BASE_URL}/api/cotizaciones/1/calendario/${calendarioOriginal.id_calendario}/desdoblar`, {
      fecha_aplicacion: fechaAplicacion1.toISOString(),
      observaciones: 'Primer desdoblamiento de prueba'
    });

    const desdoblamiento1Data = desdoblamiento1Response.data;
    
    if (desdoblamiento1Data.success) {
      console.log(`✅ Primer desdoblamiento creado exitosamente`);
      console.log(`   ID: ${desdoblamiento1Data.data.id_calendario}`);
      console.log(`   Número desdoblamiento: ${desdoblamiento1Data.data.numero_desdoblamiento}`);
      console.log(`   Semana modificada: ${desdoblamiento1Data.data.numero_semana}`);
    } else {
      console.log(`❌ Error creando primer desdoblamiento: ${desdoblamiento1Data.message}`);
      return;
    }

    // 3. Crear segundo desdoblamiento
    console.log('\n3. Creando segundo desdoblamiento...');
    const fechaAplicacion2 = new Date();
    fechaAplicacion2.setDate(fechaAplicacion2.getDate() + 2); // Pasado mañana

    const desdoblamiento2Response = await axios.post(`${BASE_URL}/api/cotizaciones/1/calendario/${calendarioOriginal.id_calendario}/desdoblar`, {
      fecha_aplicacion: fechaAplicacion2.toISOString(),
      observaciones: 'Segundo desdoblamiento de prueba'
    });

    const desdoblamiento2Data = desdoblamiento2Response.data;
    
    if (desdoblamiento2Data.success) {
      console.log(`✅ Segundo desdoblamiento creado exitosamente`);
      console.log(`   ID: ${desdoblamiento2Data.data.id_calendario}`);
      console.log(`   Número desdoblamiento: ${desdoblamiento2Data.data.numero_desdoblamiento}`);
      console.log(`   Semana modificada: ${desdoblamiento2Data.data.numero_semana}`);
    } else {
      console.log(`❌ Error creando segundo desdoblamiento: ${desdoblamiento2Data.message}`);
      return;
    }

    // 4. Verificar calendario actualizado
    console.log('\n4. Verificando calendario actualizado...');
    const calendarioActualizadoResponse = await axios.get(`${BASE_URL}/api/cotizaciones/1/calendario`);
    const calendarioActualizadoData = calendarioActualizadoResponse.data;
    
    if (calendarioActualizadoData.success) {
      const totalCalendarios = calendarioActualizadoData.data.length;
      const desdoblamientos = calendarioActualizadoData.data.filter(c => c.es_desdoblamiento);
      console.log(`✅ Calendario actualizado:`);
      console.log(`   Total calendarios: ${totalCalendarios}`);
      console.log(`   Desdoblamientos: ${desdoblamientos.length}`);
      
      desdoblamientos.forEach(d => {
        console.log(`   - Desdoblamiento ID ${d.id_calendario}: Semana ${d.numero_semana}, #${d.numero_desdoblamiento}`);
      });
    }

    console.log('\n✅ Prueba de desdoblamiento completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

probarDesdoblamiento();