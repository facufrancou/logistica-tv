const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function probarCalendarioCompleto() {
  console.log('🧪 Probando funcionalidad completa del calendario con autenticación...\n');

  try {
    // 1. Autenticarse
    console.log('1. Autenticándose...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    }, {
      withCredentials: true
    });

    if (!loginResponse.data.success) {
      console.log('❌ Error en autenticación:', loginResponse.data.message);
      return;
    }

    console.log('✅ Autenticación exitosa');
    const cookies = loginResponse.headers['set-cookie'];

    // Configurar axios para usar las cookies de sesión
    const axiosWithAuth = axios.create({
      withCredentials: true,
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });

    // 2. Obtener calendario de cotización
    console.log('\n2. Obteniendo calendario de cotización...');
    const calendarioResponse = await axiosWithAuth.get(`${BASE_URL}/api/cotizaciones/1/calendario`);
    
    if (!calendarioResponse.data.success || !calendarioResponse.data.data.length) {
      console.log('❌ No se pudo obtener el calendario');
      return;
    }

    const calendario = calendarioResponse.data.data;
    console.log(`✅ Calendario obtenido: ${calendario.length} entradas`);
    
    const primeraEntrada = calendario.find(c => !c.es_desdoblamiento);
    if (!primeraEntrada) {
      console.log('❌ No se encontró entrada original para desdoblamiento');
      return;
    }

    console.log(`   Entrada para desdoblamiento: ID ${primeraEntrada.id_calendario}, Producto ${primeraEntrada.vacuna_nombre}`);

    // 3. Crear desdoblamiento
    console.log('\n3. Creando desdoblamiento...');
    const fechaAplicacion = new Date();
    fechaAplicacion.setDate(fechaAplicacion.getDate() + 3);

    const desdoblamientoResponse = await axiosWithAuth.post(
      `${BASE_URL}/api/cotizaciones/1/calendario/${primeraEntrada.id_calendario}/desdoblar`,
      {
        fecha_aplicacion: fechaAplicacion.toISOString(),
        observaciones: 'Desdoblamiento de prueba desde script completo'
      }
    );

    if (desdoblamientoResponse.data.success) {
      console.log(`✅ Desdoblamiento creado exitosamente:`);
      console.log(`   ID: ${desdoblamientoResponse.data.data.id_calendario}`);
      console.log(`   Número: ${desdoblamientoResponse.data.data.numero_desdoblamiento}`);
      console.log(`   Semana: ${desdoblamientoResponse.data.data.numero_semana}`);
    } else {
      console.log(`❌ Error creando desdoblamiento: ${desdoblamientoResponse.data.message}`);
      return;
    }

    // 4. Verificar calendario actualizado
    console.log('\n4. Verificando calendario actualizado...');
    const calendarioActualizadoResponse = await axiosWithAuth.get(`${BASE_URL}/api/cotizaciones/1/calendario`);
    
    if (calendarioActualizadoResponse.data.success) {
      const calendarioActualizado = calendarioActualizadoResponse.data.data;
      const desdoblamientos = calendarioActualizado.filter(c => c.es_desdoblamiento);
      
      console.log(`✅ Calendario actualizado:`);
      console.log(`   Total entradas: ${calendarioActualizado.length}`);
      console.log(`   Desdoblamientos: ${desdoblamientos.length}`);
      
      desdoblamientos.forEach(d => {
        console.log(`   - Desdoblamiento: ID ${d.id_calendario}, Semana ${d.numero_semana}, #${d.numero_desdoblamiento}`);
      });
    }

    // 5. Probar edición de fecha
    console.log('\n5. Probando edición de fecha...');
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + 7);

    const fechaResponse = await axiosWithAuth.put(
      `${BASE_URL}/api/cotizaciones/1/calendario/${primeraEntrada.id_calendario}/fecha`,
      {
        fecha_programada: nuevaFecha.toISOString()
      }
    );

    if (fechaResponse.data.success) {
      console.log(`✅ Fecha editada exitosamente`);
      console.log(`   Nueva fecha: ${new Date(nuevaFecha).toLocaleDateString()}`);
    } else {
      console.log(`❌ Error editando fecha: ${fechaResponse.data.message}`);
    }

    console.log('\n✅ Prueba completa del calendario finalizada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.response?.data || error.message);
  }
}

probarCalendarioCompleto();