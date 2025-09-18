const prisma = require('../src/lib/prisma');

async function crearProductosConStock() {
  try {
    console.log('🧪 Creando productos de prueba para validar alertas...');

    // Crear productos con diferentes estados de stock para probar todas las alertas
    const productosPrueba = [
      {
        nombre: 'PRODUCTO-CRITICO-TEST',
        descripcion: 'Producto para prueba de stock crítico',
        precio_unitario: 100.00,
        requiere_control_stock: true,
        stock: 2,
        stock_minimo: 10,
        stock_reservado: 0,
        id_proveedor: 1
      },
      {
        nombre: 'PRODUCTO-BAJO-TEST',
        descripcion: 'Producto para prueba de stock bajo',
        precio_unitario: 150.00,
        requiere_control_stock: true,
        stock: 8,
        stock_minimo: 10,
        stock_reservado: 0,
        id_proveedor: 1
      },
      {
        nombre: 'PRODUCTO-RESERVADO-TEST',
        descripcion: 'Producto para prueba de stock totalmente reservado',
        precio_unitario: 200.00,
        requiere_control_stock: true,
        stock: 10,
        stock_minimo: 5,
        stock_reservado: 10,
        id_proveedor: 1
      },
      {
        nombre: 'PRODUCTO-SIN-CONFIG-TEST',
        descripcion: 'Producto sin stock mínimo configurado',
        precio_unitario: 75.00,
        requiere_control_stock: true,
        stock: 15,
        stock_minimo: 0,
        stock_reservado: 0,
        id_proveedor: 1
      }
    ];

    for (const producto of productosPrueba) {
      try {
        const productoCreado = await prisma.producto.create({
          data: producto
        });
        console.log(`✅ Creado: ${producto.nombre} (ID: ${productoCreado.id_producto})`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Ya existe: ${producto.nombre}`);
          // Actualizar en lugar de crear
          await prisma.producto.updateMany({
            where: { nombre: producto.nombre },
            data: {
              stock: producto.stock,
              stock_minimo: producto.stock_minimo,
              stock_reservado: producto.stock_reservado,
              requiere_control_stock: producto.requiere_control_stock
            }
          });
          console.log(`🔄 Actualizado: ${producto.nombre}`);
        } else {
          console.error(`❌ Error con ${producto.nombre}:`, error.message);
        }
      }
    }

    // Ahora crear detalle de cotizaciones para el producto sin config para que aparezca en alertas info
    const productoSinConfig = await prisma.producto.findFirst({
      where: { nombre: 'PRODUCTO-SIN-CONFIG-TEST' }
    });

    if (productoSinConfig) {
      // Buscar una cotización existente o crear una
      let cotizacion = await prisma.cotizacion.findFirst({
        where: { estado: 'en_proceso' }
      });

      if (!cotizacion) {
        // Crear cotización de prueba
        cotizacion = await prisma.cotizacion.create({
          data: {
            id_cliente: 1,
            estado: 'en_proceso',
            fecha_creacion: new Date(),
            total: 0
          }
        });
      }

      // Crear detalle de cotización para generar "movimiento reciente"
      try {
        await prisma.detalle_cotizacion.create({
          data: {
            id_cotizacion: cotizacion.id_cotizacion,
            id_producto: productoSinConfig.id_producto,
            cantidad: 5,
            precio_unitario: productoSinConfig.precio_unitario,
            subtotal: 5 * productoSinConfig.precio_unitario
          }
        });
        console.log('✅ Creado detalle de cotización para generar alerta de configuración');
      } catch (error) {
        console.log('⚠️  Detalle de cotización ya existe o error:', error.message);
      }
    }

    console.log('\n🎉 Productos de prueba creados correctamente');
    console.log('Ahora debería ver diferentes tipos de alertas:');
    console.log('- Stock crítico (2 unidades, mínimo 10)');
    console.log('- Stock bajo (8 unidades, mínimo 10)');
    console.log('- Stock totalmente reservado (10 de 10 reservadas)');
    console.log('- Sin configuración (con movimiento reciente)');

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  crearProductosConStock();
}

module.exports = { crearProductosConStock };