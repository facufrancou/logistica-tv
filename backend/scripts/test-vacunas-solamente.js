const prisma = require('../src/lib/prisma');

async function probarSistemaVacunas() {
  console.log('🧪 Probando sistema de vacunas únicamente...\n');

  try {
    // 1. Verificar que tenemos vacunas disponibles
    console.log('📋 1. Verificando vacunas disponibles...');
    const vacunas = await prisma.vacuna.findMany({
      take: 3,
      include: {
        proveedor: { select: { nombre: true } },
        patologia: { select: { nombre: true } },
        presentacion: { select: { nombre: true, unidad_medida: true } }
      }
    });

    if (vacunas.length === 0) {
      console.log('❌ No hay vacunas disponibles');
      return;
    }

    console.log(`✅ Encontradas ${vacunas.length} vacunas:`)
    vacunas.forEach(v => {
      console.log(`   - ${v.nombre} (${v.codigo})`);
    });

    // 2. Crear un plan de prueba solo con vacunas
    console.log('\n📝 2. Creando plan de prueba solo con vacunas...');
    
    const planData = {
      nombre: `Plan Prueba Vacunas Solo - ${new Date().toISOString()}`,
      descripcion: 'Plan de prueba para verificar sistema solo vacunas',
      duracion_semanas: 8,
      estado: 'borrador',
      id_lista_precio: null,
      observaciones: 'Creado por script de prueba'
    };

    // Crear el plan
    const nuevoPlan = await prisma.planVacunal.create({
      data: planData
    });

    console.log(`✅ Plan creado con ID: ${nuevoPlan.id_plan}`);

    // 3. Agregar vacunas al plan
    console.log('\n💉 3. Agregando vacunas al plan...');
    
    const vacunasParaPlan = vacunas.slice(0, 2).map((vacuna, index) => ({
      id_plan: nuevoPlan.id_plan,
      id_vacuna: vacuna.id_vacuna,
      cantidad_total: 100 + (index * 50),
      dosis_por_semana: 25,
      semana_inicio: 1 + index,
      semana_fin: 4 + index,
      observaciones: `Vacuna ${index + 1} del plan de prueba`
    }));

    await prisma.planVacuna.createMany({
      data: vacunasParaPlan
    });

    console.log(`✅ ${vacunasParaPlan.length} vacunas agregadas al plan`);

    // 4. Verificar el plan creado
    console.log('\n🔍 4. Verificando plan creado...');
    
    const planCompleto = await prisma.planVacunal.findUnique({
      where: { id_plan: nuevoPlan.id_plan },
      include: {
        vacunas_plan: {
          include: {
            vacuna: {
              include: {
                proveedor: { select: { nombre: true } },
                patologia: { select: { nombre: true } },
                presentacion: { select: { nombre: true, unidad_medida: true } }
              }
            }
          }
        }
      }
    });

    console.log(`✅ Plan verificado:`);
    console.log(`   - Nombre: ${planCompleto.nombre}`);
    console.log(`   - Duración: ${planCompleto.duracion_semanas} semanas`);
    console.log(`   - Estado: ${planCompleto.estado}`);
    console.log(`   - Vacunas: ${planCompleto.vacunas_plan.length}`);

    planCompleto.vacunas_plan.forEach((vp, index) => {
      console.log(`     ${index + 1}. ${vp.vacuna.nombre} (${vp.vacuna.codigo})`);
      console.log(`        - Dosis/semana: ${vp.dosis_por_semana}`);
      console.log(`        - Semanas: ${vp.semana_inicio} a ${vp.semana_fin}`);
    });

    // 5. Probar actualización
    console.log('\n🔄 5. Probando actualización del plan...');
    
    const planActualizado = await prisma.planVacunal.update({
      where: { id_plan: nuevoPlan.id_plan },
      data: {
        estado: 'activo',
        observaciones: 'Plan actualizado por script de prueba'
      }
    });

    console.log(`✅ Plan actualizado - nuevo estado: ${planActualizado.estado}`);

    // 6. Verificar que NO hay productos en el plan
    console.log('\n🚫 6. Verificando que no hay productos...');
    
    const productosEnPlan = await prisma.planProducto.findMany({
      where: { id_plan: nuevoPlan.id_plan }
    });

    if (productosEnPlan.length === 0) {
      console.log('✅ Confirmado: El plan NO tiene productos (correcto!)');
    } else {
      console.log(`❌ Error: El plan tiene ${productosEnPlan.length} productos (no debería)`);
    }

    // 7. Limpieza
    console.log('\n🧹 7. Limpiando datos de prueba...');
    
    await prisma.planVacuna.deleteMany({
      where: { id_plan: nuevoPlan.id_plan }
    });

    await prisma.planVacunal.delete({
      where: { id_plan: nuevoPlan.id_plan }
    });

    console.log('✅ Datos de prueba eliminados');

    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE!');
    console.log('✅ El sistema funciona correctamente solo con vacunas');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
probarSistemaVacunas();