const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creando plan de prueba...');

  try {
    // Obtener algunos productos existentes
    const productos = await prisma.producto.findMany({
      take: 3,
      select: {
        id_producto: true,
        nombre: true,
        precio_unitario: true
      }
    });

    if (productos.length === 0) {
      console.log('❌ No hay productos en la base de datos');
      return;
    }

    // Obtener una lista de precios
    const listaPrecio = await prisma.listaPrecio.findFirst({
      where: { tipo: 'L20' }
    });

    // Crear un plan de prueba
    const planPrueba = await prisma.planVacunal.create({
      data: {
        nombre: 'Plan Vacunal de Prueba - Sprint 1',
        descripcion: 'Plan de prueba para validar la funcionalidad del Sprint 1',
        duracion_semanas: 8,
        id_lista_precio: listaPrecio.id_lista,
        estado: 'borrador',
        observaciones: 'Plan creado automáticamente para pruebas'
      }
    });

    console.log(`✅ Plan creado con ID: ${planPrueba.id_plan}`);

    // Agregar productos al plan
    const productosDelPlan = productos.map((producto, index) => ({
      id_plan: planPrueba.id_plan,
      id_producto: producto.id_producto,
      cantidad_total: (index + 1) * 5, // 5, 10, 15
      dosis_por_semana: 1,
      semana_inicio: index + 1,
      semana_fin: (index + 1) * 2,
      observaciones: `Producto ${producto.nombre} - dosis programadas`
    }));

    await prisma.planProducto.createMany({
      data: productosDelPlan
    });

    console.log(`✅ Agregados ${productosDelPlan.length} productos al plan`);

    // Mostrar resumen del plan creado
    const planCompleto = await prisma.planVacunal.findUnique({
      where: { id_plan: planPrueba.id_plan },
      include: {
        lista_precio: true,
        productos_plan: {
          include: {
            producto: {
              select: {
                nombre: true,
                precio_unitario: true
              }
            }
          }
        }
      }
    });

    console.log('\n📋 RESUMEN DEL PLAN CREADO:');
    console.log(`Nombre: ${planCompleto.nombre}`);
    console.log(`Duración: ${planCompleto.duracion_semanas} semanas`);
    console.log(`Lista de precios: ${planCompleto.lista_precio.nombre}`);
    console.log(`Estado: ${planCompleto.estado}`);
    console.log('\nProductos incluidos:');
    
    planCompleto.productos_plan.forEach((pp, index) => {
      console.log(`  ${index + 1}. ${pp.producto.nombre}`);
      console.log(`     Cantidad: ${pp.cantidad_total}`);
      console.log(`     Semanas: ${pp.semana_inicio} - ${pp.semana_fin}`);
    });

    console.log('\n🎉 Plan de prueba creado exitosamente');

  } catch (error) {
    console.error('❌ Error creando plan de prueba:', error);
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
