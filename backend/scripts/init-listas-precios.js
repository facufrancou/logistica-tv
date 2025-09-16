const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Inicializando listas de precios...');

  // Crear listas de precios básicas
  const listasPrecios = [
    { tipo: 'L15', nombre: 'Lista de precios L15', descripcion: 'Lista de precios con descuento del 15%' },
    { tipo: 'L18', nombre: 'Lista de precios L18', descripcion: 'Lista de precios con descuento del 18%' },
    { tipo: 'L20', nombre: 'Lista de precios L20', descripcion: 'Lista de precios con descuento del 20%' },
    { tipo: 'L25', nombre: 'Lista de precios L25', descripcion: 'Lista de precios con descuento del 25%' },
    { tipo: 'L30', nombre: 'Lista de precios L30', descripcion: 'Lista de precios con descuento del 30%' }
  ];

  for (const lista of listasPrecios) {
    try {
      const existeLista = await prisma.listaPrecio.findFirst({
        where: { tipo: lista.tipo }
      });

      if (!existeLista) {
        await prisma.listaPrecio.create({
          data: lista
        });
        console.log(`✅ Lista ${lista.tipo} creada exitosamente`);
      } else {
        console.log(`ℹ️  Lista ${lista.tipo} ya existe`);
      }
    } catch (error) {
      console.error(`❌ Error creando lista ${lista.tipo}:`, error.message);
    }
  }

  console.log('🎉 Inicialización completada');
}

main()
  .catch((e) => {
    console.error('❌ Error en inicialización:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
