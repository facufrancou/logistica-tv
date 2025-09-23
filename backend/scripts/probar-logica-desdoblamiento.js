const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function probarLogicaDesdoblamiento() {
  console.log('🧪 Probando lógica de desdoblamiento directamente...\n');

  try {
    const id_cotizacion = 1;
    const id_calendario = 1; // Primer calendario de la cotización 1

    // Obtener el calendario original
    console.log('1. Obteniendo calendario original...');
    const calendarioOriginal = await prisma.calendarioVacunacion.findUnique({
      where: { id_calendario: parseInt(id_calendario) },
      include: { producto: true }
    });

    if (!calendarioOriginal) {
      console.log('❌ Calendario no encontrado');
      return;
    }

    console.log(`✅ Calendario original encontrado:`);
    console.log(`   ID: ${calendarioOriginal.id_calendario}`);
    console.log(`   Producto: ${calendarioOriginal.producto?.nombre || 'N/A'}`);
    console.log(`   Semana: ${calendarioOriginal.numero_semana}`);
    console.log(`   Es desdoblamiento: ${calendarioOriginal.es_desdoblamiento}`);

    // Contar desdoblamientos existentes
    console.log('\n2. Contando desdoblamientos existentes...');
    const desdoblamentosExistentes = await prisma.calendarioVacunacion.count({
      where: {
        dosis_original_id: parseInt(id_calendario)
      }
    });

    console.log(`✅ Desdoblamientos existentes: ${desdoblamentosExistentes}`);

    const numeroDesdoblamientoCalculado = desdoblamentosExistentes + 1;
    console.log(`   Nuevo número de desdoblamiento: ${numeroDesdoblamientoCalculado}`);

    // Calcular número de semana único
    const numeroSemanaUnico = calendarioOriginal.numero_semana + (numeroDesdoblamientoCalculado * 0.01);
    const numeroSemanaFinal = Math.round(numeroSemanaUnico * 100);

    console.log(`   Número de semana único calculado: ${numeroSemanaFinal}`);

    // Crear el desdoblamiento
    console.log('\n3. Creando desdoblamiento...');
    const fechaAplicacion = new Date();
    fechaAplicacion.setDate(fechaAplicacion.getDate() + 1);

    const desdoblamiento = await prisma.calendarioVacunacion.create({
      data: {
        id_cotizacion: parseInt(id_cotizacion),
        id_producto: calendarioOriginal.id_producto,
        numero_semana: numeroSemanaFinal,
        fecha_programada: fechaAplicacion,
        cantidad_dosis: calendarioOriginal.cantidad_dosis,
        estado_dosis: 'pendiente',
        es_desdoblamiento: true,
        dosis_original_id: parseInt(id_calendario),
        numero_desdoblamiento: numeroDesdoblamientoCalculado,
        observaciones: `Desdoblamiento #${numeroDesdoblamientoCalculado} - Prueba directa`
      },
      include: { producto: true }
    });

    console.log(`✅ Desdoblamiento creado exitosamente:`);
    console.log(`   ID: ${desdoblamiento.id_calendario}`);
    console.log(`   Número desdoblamiento: ${desdoblamiento.numero_desdoblamiento}`);
    console.log(`   Semana: ${desdoblamiento.numero_semana}`);
    console.log(`   Producto: ${desdoblamiento.producto?.nombre || 'N/A'}`);
    console.log(`   Fecha programada: ${desdoblamiento.fecha_programada}`);

    // Verificar el resultado
    console.log('\n4. Verificando resultado...');
    const todosLosCalendarios = await prisma.calendarioVacunacion.findMany({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      include: { producto: true },
      orderBy: [
        { numero_semana: 'asc' },
        { numero_desdoblamiento: 'asc' }
      ]
    });

    console.log(`✅ Total calendarios para cotización ${id_cotizacion}: ${todosLosCalendarios.length}`);
    
    const desdoblamientos = todosLosCalendarios.filter(c => c.es_desdoblamiento);
    console.log(`   Desdoblamientos: ${desdoblamientos.length}`);

    desdoblamientos.forEach(d => {
      console.log(`   - ID ${d.id_calendario}: ${d.producto?.nombre}, Semana ${d.numero_semana}, #${d.numero_desdoblamiento}`);
    });

    console.log('\n✅ Prueba de lógica de desdoblamiento completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

probarLogicaDesdoblamiento();