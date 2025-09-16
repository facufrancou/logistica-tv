const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creando datos de prueba para Sprint 2...');

  try {
    // 1. Activar el plan existente
    console.log('\n1️⃣ Activando plan existente...');
    const planExistente = await prisma.planVacunal.findFirst();
    
    if (planExistente) {
      await prisma.planVacunal.update({
        where: { id_plan: planExistente.id_plan },
        data: { estado: 'activo' }
      });
      console.log(`✅ Plan "${planExistente.nombre}" activado`);
    }

    // 2. Obtener un cliente existente
    console.log('\n2️⃣ Obteniendo cliente existente...');
    const cliente = await prisma.cliente.findFirst();
    
    if (!cliente) {
      console.log('❌ No hay clientes en la base de datos');
      return;
    }
    
    console.log(`✅ Cliente encontrado: ${cliente.nombre}`);

    // 3. Crear una cotización de prueba
    console.log('\n3️⃣ Creando cotización de prueba...');
    
    // Generar número único de cotización
    const fecha = new Date();
    const year = fecha.getFullYear().toString().slice(-2);
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const numeroCotizacion = `COT-${year}${month}${day}-${random}`;

    // Obtener lista de precios L20
    const listaL20 = await prisma.listaPrecio.findFirst({
      where: { tipo: 'L20' }
    });

    // Crear cotización
    const cotizacion = await prisma.cotizacion.create({
      data: {
        numero_cotizacion: numeroCotizacion,
        id_cliente: cliente.id_cliente,
        id_plan: planExistente.id_plan,
        id_lista_precio: listaL20.id_lista,
        fecha_inicio_plan: new Date('2025-09-23'), // Próxima semana
        precio_total: 0.30, // Precio del plan calculado anteriormente
        observaciones: 'Cotización de prueba para Sprint 2',
        estado: 'en_proceso'
      }
    });

    console.log(`✅ Cotización creada: ${cotizacion.numero_cotizacion}`);

    // 4. Crear detalle de cotización
    console.log('\n4️⃣ Creando detalle de cotización...');
    
    const productosDelPlan = await prisma.planProducto.findMany({
      where: { id_plan: planExistente.id_plan },
      include: {
        producto: true
      }
    });

    for (const planProducto of productosDelPlan) {
      const precioUnitario = parseFloat(planProducto.producto.precio_unitario);
      const subtotal = precioUnitario * planProducto.cantidad_total;

      await prisma.detalleCotizacion.create({
        data: {
          id_cotizacion: cotizacion.id_cotizacion,
          id_producto: planProducto.id_producto,
          cantidad_total: planProducto.cantidad_total,
          precio_unitario: precioUnitario,
          subtotal: subtotal,
          semana_inicio: planProducto.semana_inicio,
          semana_fin: planProducto.semana_fin,
          dosis_por_semana: planProducto.dosis_por_semana,
          observaciones: planProducto.observaciones
        }
      });
    }

    console.log(`✅ Detalle creado para ${productosDelPlan.length} productos`);

    // 5. Crear calendario de vacunación
    console.log('\n5️⃣ Creando calendario de vacunación...');
    
    const fechaInicio = new Date('2025-09-23');
    const calendarioItems = [];

    for (const planProducto of productosDelPlan) {
      const semanaInicio = planProducto.semana_inicio;
      const semanaFin = planProducto.semana_fin || semanaInicio;
      const dosisTotal = planProducto.cantidad_total;
      const dosisPorSemana = planProducto.dosis_por_semana;
      
      const semanasNecesarias = Math.ceil(dosisTotal / dosisPorSemana);
      const semanasFinal = Math.min(semanaFin, semanaInicio + semanasNecesarias - 1);

      for (let semana = semanaInicio; semana <= semanasFinal; semana++) {
        const dosisRestantes = dosisTotal - ((semana - semanaInicio) * dosisPorSemana);
        const dosisEnEstaSemana = Math.min(dosisPorSemana, dosisRestantes);

        if (dosisEnEstaSemana > 0) {
          const fechaProgramada = new Date(fechaInicio);
          fechaProgramada.setDate(fechaProgramada.getDate() + ((semana - 1) * 7));

          calendarioItems.push({
            id_cotizacion: cotizacion.id_cotizacion,
            id_producto: planProducto.id_producto,
            numero_semana: semana,
            fecha_programada: fechaProgramada,
            cantidad_dosis: dosisEnEstaSemana,
            estado_dosis: 'pendiente'
          });
        }
      }
    }

    await prisma.calendarioVacunacion.createMany({
      data: calendarioItems
    });

    console.log(`✅ Calendario creado con ${calendarioItems.length} aplicaciones programadas`);

    // 6. Mostrar resumen
    console.log('\n📋 RESUMEN DE LA COTIZACIÓN CREADA:');
    console.log(`Número: ${cotizacion.numero_cotizacion}`);
    console.log(`Cliente: ${cliente.nombre}`);
    console.log(`Plan: ${planExistente.nombre}`);
    console.log(`Fecha inicio: ${cotizacion.fecha_inicio_plan.toLocaleDateString()}`);
    console.log(`Estado: ${cotizacion.estado}`);
    console.log(`Precio total: $${parseFloat(cotizacion.precio_total)}`);
    
    console.log('\nCalendario de aplicaciones:');
    calendarioItems.forEach((item, index) => {
      const producto = productosDelPlan.find(p => p.id_producto === item.id_producto);
      console.log(`  ${index + 1}. Semana ${item.numero_semana} (${item.fecha_programada.toLocaleDateString()}): ${item.cantidad_dosis} dosis de ${producto.producto.nombre}`);
    });

    console.log('\n🎉 Datos de prueba para Sprint 2 creados exitosamente');

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
