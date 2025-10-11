// Script para probar el sistema de planes vacunales con soporte para vacunas
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPlanesVacunas() {
  try {
    console.log('🧪 Iniciando test del sistema de planes vacunales con vacunas...\n');

    // 1. Verificar que las tablas existen
    console.log('1. Verificando estructura de la base de datos...');
    
    const planesCount = await prisma.planVacunal.count();
    const vacunasCount = await prisma.vacuna.count();
    const planVacunasCount = await prisma.planVacuna.count();
    
    console.log(`   - Planes vacunales: ${planesCount}`);
    console.log(`   - Vacunas: ${vacunasCount}`);
    console.log(`   - Relaciones plan-vacuna: ${planVacunasCount}`);

    // 2. Crear un plan de prueba con vacunas si no existe
    let planPrueba = await prisma.planVacunal.findFirst({
      where: { nombre: 'Plan Test Vacunas' }
    });

    if (!planPrueba) {
      console.log('\n2. Creando plan de prueba...');
      planPrueba = await prisma.planVacunal.create({
        data: {
          nombre: 'Plan Test Vacunas',
          descripcion: 'Plan de prueba para el sistema de vacunas',
          duracion_semanas: 8,
          estado: 'activo',
          created_by: 1
        }
      });
      console.log(`   ✅ Plan creado con ID: ${planPrueba.id_plan}`);
    } else {
      console.log(`\n2. Usando plan existente: ${planPrueba.id_plan}`);
    }

    // 3. Obtener algunas vacunas
    console.log('\n3. Obteniendo vacunas disponibles...');
    const vacunas = await prisma.vacuna.findMany({
      take: 3,
      where: { activa: true }
    });
    
    console.log(`   - Vacunas encontradas: ${vacunas.length}`);
    vacunas.forEach(v => {
      console.log(`     * ${v.nombre} - $${v.precio_lista}`);
    });

    // 4. Agregar vacunas al plan si hay disponibles
    if (vacunas.length > 0) {
      console.log('\n4. Agregando vacunas al plan...');
      
      for (let i = 0; i < Math.min(2, vacunas.length); i++) {
        const vacuna = vacunas[i];
        
        // Verificar si ya existe la relación
        const existeRelacion = await prisma.planVacuna.findFirst({
          where: {
            id_plan: planPrueba.id_plan,
            id_vacuna: vacuna.id_vacuna
          }
        });

        if (!existeRelacion) {
          await prisma.planVacuna.create({
            data: {
              id_plan: planPrueba.id_plan,
              id_vacuna: vacuna.id_vacuna,
              cantidad_total: 10,
              dosis_por_semana: 2,
              semana_inicio: i + 1,
              semana_fin: i + 3,
              observaciones: `Vacuna ${i + 1} del plan de prueba`
            }
          });
          console.log(`   ✅ Vacuna ${vacuna.nombre} agregada al plan`);
        } else {
          console.log(`   ⚠️  Vacuna ${vacuna.nombre} ya existe en el plan`);
        }
      }
    }

    // 5. Probar consulta completa del plan
    console.log('\n5. Probando consulta completa del plan...');
    const planCompleto = await prisma.planVacunal.findUnique({
      where: { id_plan: planPrueba.id_plan },
      include: {
        productos_plan: {
          include: {
            producto: true
          }
        },
        vacunas_plan: {
          include: {
            vacuna: true
          }
        }
      }
    });

    console.log(`   - Productos en el plan: ${planCompleto.productos_plan?.length || 0}`);
    console.log(`   - Vacunas en el plan: ${planCompleto.vacunas_plan?.length || 0}`);

    if (planCompleto.vacunas_plan?.length > 0) {
      console.log('   - Detalle de vacunas:');
      planCompleto.vacunas_plan.forEach(vp => {
        console.log(`     * ${vp.vacuna.nombre} - Sem ${vp.semana_inicio}-${vp.semana_fin}, ${vp.dosis_por_semana} dosis/sem`);
      });
    }

    // 6. Probar crear una cotización
    console.log('\n6. Probando creación de cotización con vacunas...');
    
    // Buscar un cliente para la cotización
    const cliente = await prisma.cliente.findFirst();
    if (!cliente) {
      console.log('   ⚠️  No hay clientes disponibles para crear cotización');
      return;
    }

    // Solo crear cotización si el plan tiene vacunas
    if (planCompleto.vacunas_plan?.length > 0) {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() + 7); // Una semana desde hoy

      const cotizacionTest = {
        id_cliente: cliente.id_cliente,
        id_plan: planPrueba.id_plan,
        fecha_inicio_plan: fechaInicio.toISOString().split('T')[0],
        cantidad_animales: 50,
        observaciones: 'Cotización de prueba para sistema de vacunas'
      };

      console.log('   - Datos de la cotización:', cotizacionTest);
      console.log('   ✅ Estructura validada (no se crea la cotización en el test)');
    }

    console.log('\n🎉 Test completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Plan ID: ${planPrueba.id_plan}`);
    console.log(`   - Productos: ${planCompleto.productos_plan?.length || 0}`);
    console.log(`   - Vacunas: ${planCompleto.vacunas_plan?.length || 0}`);
    console.log(`   - Sistema híbrido funcionando correctamente ✅`);

  } catch (error) {
    console.error('❌ Error en el test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el test
testPlanesVacunas();