const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCrearPlan() {
  console.log('🔍 Debug: creación de plan con vacunas...');
  
  try {
    // Verificar que existen las vacunas
    const vacuna1 = await prisma.vacuna.findUnique({ where: { id_vacuna: 1 } });
    const vacuna2 = await prisma.vacuna.findUnique({ where: { id_vacuna: 2 } });
    
    console.log('Vacuna 1 existe:', !!vacuna1, vacuna1?.nombre);
    console.log('Vacuna 2 existe:', !!vacuna2, vacuna2?.nombre);
    
    // Crear plan manualmente usando Prisma directamente
    const plan = await prisma.planVacunal.create({
      data: {
        nombre: 'Plan Debug Test',
        descripcion: 'Plan para debug',
        duracion_semanas: 4,
        estado: 'activo',
        observaciones: 'Test directo con Prisma',
        created_by: 1
      }
    });
    
    console.log('\nPlan creado:', plan.id_plan);
    
    // Crear las vacunas del plan
    const vacunasCreadas = await prisma.planVacuna.createMany({
      data: [
        {
          id_plan: plan.id_plan,
          id_vacuna: 1,
          cantidad_total: 1,
          dosis_por_semana: 2,
          semana_inicio: 1,
          semana_fin: 2,
          observaciones: 'Test vacuna 1'
        },
        {
          id_plan: plan.id_plan,
          id_vacuna: 2,
          cantidad_total: 1,
          dosis_por_semana: 1,
          semana_inicio: 3,
          semana_fin: 3,
          observaciones: 'Test vacuna 2'
        }
      ]
    });
    
    console.log('Vacunas creadas:', vacunasCreadas.count);
    
    // Verificar el plan completo
    const planCompleto = await prisma.planVacunal.findUnique({
      where: { id_plan: plan.id_plan },
      include: {
        vacunas_plan: {
          include: {
            vacuna: true
          }
        }
      }
    });
    
    console.log('\nVerificación:');
    console.log('Plan:', planCompleto.nombre);
    console.log('Vacunas en plan:', planCompleto.vacunas_plan.length);
    planCompleto.vacunas_plan.forEach(vp => {
      console.log(`- ${vp.vacuna.nombre} (ID: ${vp.id_vacuna})`);
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
  
  await prisma.$disconnect();
}

debugCrearPlan();