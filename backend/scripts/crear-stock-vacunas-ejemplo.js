const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para generar fecha aleatoria en el futuro (6 meses a 2 años)
function generarFechaVencimiento() {
  const ahora = new Date();
  const diasMinimos = 180; // 6 meses
  const diasMaximos = 730; // 2 años
  const diasAleatorios = Math.floor(Math.random() * (diasMaximos - diasMinimos)) + diasMinimos;
  
  const fechaVencimiento = new Date(ahora);
  fechaVencimiento.setDate(ahora.getDate() + diasAleatorios);
  return fechaVencimiento;
}

// Función para generar lote aleatorio
function generarLote() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  
  let lote = '';
  // 2 letras
  for (let i = 0; i < 2; i++) {
    lote += letras.charAt(Math.floor(Math.random() * letras.length));
  }
  // 4 números
  for (let i = 0; i < 4; i++) {
    lote += numeros.charAt(Math.floor(Math.random() * numeros.length));
  }
  
  return lote;
}

async function crearStockEjemplo() {
  console.log('🚀 Creando registros de stock de ejemplo para las vacunas...\n');

  try {
    // Obtener todas las vacunas activas
    const vacunas = await prisma.vacuna.findMany({
      where: { activa: true },
      include: {
        proveedor: true,
        patologia: true,
        presentacion: true
      }
    });

    console.log(`📋 Encontradas ${vacunas.length} vacunas activas\n`);

    let stockCreado = 0;

    for (const vacuna of vacunas) {
      // Crear 1-3 lotes por vacuna
      const cantidadLotes = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < cantidadLotes; i++) {
        const stockActual = Math.floor(Math.random() * 1000) + 50; // Entre 50 y 1050
        const stockMinimo = Math.floor(stockActual * 0.1); // 10% del stock actual
        const stockReservado = Math.floor(Math.random() * (stockActual * 0.3)); // Hasta 30% reservado
        
        const datosStock = {
          id_vacuna: vacuna.id_vacuna,
          lote: generarLote(),
          fecha_vencimiento: generarFechaVencimiento(),
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
          stock_reservado: stockReservado,
          precio_compra: parseFloat((vacuna.precio_lista * (0.7 + Math.random() * 0.4)).toFixed(2)), // ±30% del precio lista
          ubicacion_fisica: `EST-${Math.floor(Math.random() * 10) + 1}-NIV-${Math.floor(Math.random() * 5) + 1}`,
          temperatura_req: vacuna.requiere_frio ? '-20°C' : '2-8°C',
          estado_stock: 'disponible',
          observaciones: `Lote de ${vacuna.proveedor.nombre} - ${vacuna.patologia.nombre}`,
          created_by: 1
        };

        await prisma.stockVacuna.create({
          data: datosStock
        });

        console.log(`   ✅ Stock creado para ${vacuna.codigo} - ${vacuna.nombre}`);
        console.log(`      Lote: ${datosStock.lote} | Stock: ${datosStock.stock_actual} | Vence: ${datosStock.fecha_vencimiento.toLocaleDateString()}`);
        
        stockCreado++;
      }
    }

    console.log('\n🎉 CREACIÓN DE STOCK COMPLETADA:');
    console.log(`   📦 Vacunas procesadas: ${vacunas.length}`);
    console.log(`   📋 Lotes de stock creados: ${stockCreado}`);
    console.log(`   📊 Promedio lotes por vacuna: ${(stockCreado / vacunas.length).toFixed(1)}`);

    // Mostrar resumen final
    const totalStockDosis = await prisma.stockVacuna.aggregate({
      _sum: {
        stock_actual: true
      }
    });

    console.log(`   💉 Total dosis disponibles: ${totalStockDosis._sum.stock_actual?.toLocaleString() || 0}`);

  } catch (error) {
    console.error('❌ Error creando stock:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la creación
if (require.main === module) {
  crearStockEjemplo()
    .then(() => {
      console.log('\n✅ Creación de stock finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la creación de stock:', error);
      process.exit(1);
    });
}

module.exports = { crearStockEjemplo };