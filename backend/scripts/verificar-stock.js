const prisma = require('../src/lib/prisma');

async function verificarStock() {
  try {
    console.log('=== VERIFICANDO STOCK ACTUAL ===\n');

    const stocks = await prisma.stock.findMany({
      include: { 
        producto: { select: { nombre: true, id_producto: true } } 
      }
    });

    console.log('STOCK ACTUAL:');
    stocks.forEach(s => {
      console.log(`ID ${s.producto.id_producto} - ${s.producto.nombre}:`);
      console.log(`  Total: ${s.stock_total}`);
      console.log(`  Disponible: ${s.stock_disponible}`);
      console.log(`  Reservado: ${s.stock_reservado}`);
      console.log(`  Mínimo: ${s.stock_minimo}\n`);
    });

    // Agregar stock si es necesario
    const stockBajo = stocks.filter(s => s.stock_disponible <= 0);
    if (stockBajo.length > 0) {
      console.log('PRODUCTOS CON STOCK INSUFICIENTE:');
      stockBajo.forEach(s => {
        console.log(`- ${s.producto.nombre}: ${s.stock_disponible} disponible`);
      });

      console.log('\nAgregando stock...');
      for (const stock of stockBajo) {
        await prisma.stock.update({
          where: { id_stock: stock.id_stock },
          data: { 
            stock_total: 50000,
            stock_disponible: 50000 
          }
        });
        console.log(`✅ Stock actualizado para ${stock.producto.nombre}: 50000 unidades`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  verificarStock();
}

module.exports = { verificarStock };