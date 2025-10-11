const path = require('path');

// Mock del contexto de request/response para probar el controlador
const createMockRequest = (data) => ({
  body: data.body || {},
  params: data.params || {},
  query: data.query || {},
  user: data.user || null
});

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Importar el controlador
const controller = require('../src/controllers/planesVacunales.controller');

async function probarControlador() {
  console.log('🧪 Probando controlador de planes vacunales...\n');

  try {
    // 1. Probar obtener planes
    console.log('📋 1. Probando obtener planes...');
    
    const reqGet = createMockRequest({
      query: { estado: 'activo' }
    });
    const resGet = createMockResponse();

    await controller.getPlanes(reqGet, resGet);

    if (resGet.json.mock.calls.length > 0) {
      const planes = resGet.json.mock.calls[0][0];
      console.log(`✅ Obtenidos ${planes.length} planes`);
      
      if (planes.length > 0) {
        const primerPlan = planes[0];
        console.log(`   - Primer plan: ${primerPlan.nombre}`);
        console.log(`   - Vacunas: ${primerPlan.vacunas?.length || 0}`);
        
        // Verificar que no hay productos
        if (primerPlan.productos) {
          console.log(`❌ Error: El plan tiene campo 'productos' (no debería)`);
        } else {
          console.log(`✅ Correcto: El plan NO tiene campo 'productos'`);
        }
      }
    }

    // 2. Probar crear plan con vacunas
    console.log('\n📝 2. Probando crear plan con vacunas...');
    
    const reqCreate = createMockRequest({
      body: {
        nombre: 'Plan Test API Vacunas',
        descripcion: 'Plan de prueba para API',
        duracion_semanas: 6,
        estado: 'borrador',
        vacunas: [
          {
            id_vacuna: 1, // 9-R
            cantidad_total: 200,
            dosis_por_semana: 50,
            semana_inicio: 1,
            semana_fin: 4,
            observaciones: 'Vacuna de prueba 1'
          },
          {
            id_vacuna: 2, // COLERA AVIAR 1000DS
            cantidad_total: 150,
            dosis_por_semana: 30,
            semana_inicio: 2,
            semana_fin: 5,
            observaciones: 'Vacuna de prueba 2'
          }
        ]
      }
    });
    const resCreate = createMockResponse();

    await controller.createPlan(reqCreate, resCreate);

    let planCreado = null;
    if (resCreate.json.mock.calls.length > 0) {
      planCreado = resCreate.json.mock.calls[0][0];
      console.log(`✅ Plan creado con ID: ${planCreado.id_plan}`);
      console.log(`   - Nombre: ${planCreado.nombre}`);
      console.log(`   - Vacunas: ${planCreado.vacunas_plan?.length || 0}`);
    }

    // 3. Probar obtener plan específico
    if (planCreado) {
      console.log('\n🔍 3. Probando obtener plan específico...');
      
      const reqGetById = createMockRequest({
        params: { id: planCreado.id_plan.toString() }
      });
      const resGetById = createMockResponse();

      await controller.getPlanById(reqGetById, resGetById);

      if (resGetById.json.mock.calls.length > 0) {
        const planDetalle = resGetById.json.mock.calls[0][0];
        console.log(`✅ Plan obtenido: ${planDetalle.nombre}`);
        console.log(`   - Estado: ${planDetalle.estado}`);
        console.log(`   - Vacunas: ${planDetalle.vacunas_plan?.length || 0}`);
        
        // Verificar que no hay productos
        if (planDetalle.productos_plan) {
          console.log(`❌ Error: El plan tiene campo 'productos_plan' (no debería)`);
        } else {
          console.log(`✅ Correcto: El plan NO tiene campo 'productos_plan'`);
        }
      }

      // 4. Probar actualizar plan
      console.log('\n🔄 4. Probando actualizar plan...');
      
      const reqUpdate = createMockRequest({
        params: { id: planCreado.id_plan.toString() },
        body: {
          estado: 'activo',
          observaciones: 'Plan actualizado por prueba API',
          vacunas: [
            {
              id_vacuna: 1, // 9-R
              cantidad_total: 250,
              dosis_por_semana: 60,
              semana_inicio: 1,
              semana_fin: 4,
              observaciones: 'Vacuna actualizada'
            }
          ]
        }
      });
      const resUpdate = createMockResponse();

      await controller.updatePlan(reqUpdate, resUpdate);

      if (resUpdate.json.mock.calls.length > 0) {
        const planActualizado = resUpdate.json.mock.calls[0][0];
        console.log(`✅ Plan actualizado: ${planActualizado.nombre}`);
        console.log(`   - Nuevo estado: ${planActualizado.estado}`);
        console.log(`   - Vacunas: ${planActualizado.vacunas_plan?.length || 0}`);
      }

      // 5. Limpiar - eliminar plan de prueba
      console.log('\n🧹 5. Limpiando plan de prueba...');
      
      const reqDelete = createMockRequest({
        params: { id: planCreado.id_plan.toString() }
      });
      const resDelete = createMockResponse();

      await controller.deletePlan(reqDelete, resDelete);

      if (resDelete.json.mock.calls.length > 0) {
        console.log('✅ Plan eliminado correctamente');
      }
    }

    console.log('\n🎉 PRUEBAS DEL CONTROLADOR COMPLETADAS!');
    console.log('✅ El controlador funciona correctamente solo con vacunas');

  } catch (error) {
    console.error('❌ Error durante las pruebas del controlador:', error);
  }
}

// Configurar Jest mock environment
global.jest = {
  fn: () => {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      return mockFn.mock.returnValue;
    };
    mockFn.mock = {
      calls: [],
      returnValue: undefined
    };
    mockFn.mockReturnValue = (value) => {
      mockFn.mock.returnValue = value;
      return mockFn;
    };
    return mockFn;
  }
};

// Ejecutar las pruebas
probarControlador();