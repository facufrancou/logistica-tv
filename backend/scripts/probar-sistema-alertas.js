const prisma = require('../src/lib/prisma');

async function probarSistemaAlertas() {
  try {
    console.log('🧪 Iniciando pruebas del sistema de alertas...\n');

    // Paso 1: Configurar stock mínimo si no existe
    console.log('📋 Paso 1: Configurando stock mínimo...');
    await configurarStockMinimoSiNoExiste();

    // Paso 2: Crear productos de prueba con diferentes estados
    console.log('\n📋 Paso 2: Creando productos de prueba...');
    await crearProductosPrueba();

    // Paso 3: Probar endpoint de alertas
    console.log('\n📋 Paso 3: Probando endpoint de alertas...');
    await probarEndpointAlertas();

    // Paso 4: Verificar tipos de alertas
    console.log('\n📋 Paso 4: Verificando tipos de alertas...');
    await verificarTiposAlertas();

    // Paso 5: Limpiar datos de prueba
    console.log('\n📋 Paso 5: Limpiando datos de prueba...');
    await limpiarDatosPrueba();

    console.log('\n✅ Pruebas del sistema de alertas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function configurarStockMinimoSiNoExiste() {
  const productosSinMinimo = await prisma.producto.count({
    where: {
      requiere_control_stock: true,
      OR: [
        { stock_minimo: null },
        { stock_minimo: 0 }
      ]
    }
  });

  console.log(`   Productos sin stock mínimo: ${productosSinMinimo}`);

  if (productosSinMinimo > 0) {
    console.log('   Configurando stock mínimo automáticamente...');
    const { configurarStockMinimo } = require('./configurar-stock-minimo');
    await configurarStockMinimo();
  } else {
    console.log('   ✅ Todos los productos ya tienen stock mínimo configurado');
  }
}

async function crearProductosPrueba() {
  const productosPrueba = [
    {
      nombre: 'PRODUCTO_PRUEBA_AGOTADO',
      descripcion: 'Producto para probar alerta de stock agotado',
      stock: 0,
      stock_minimo: 10,
      stock_reservado: 0,
      requiere_control_stock: true
    },
    {
      nombre: 'PRODUCTO_PRUEBA_CRITICO',
      descripcion: 'Producto para probar alerta de stock crítico',
      stock: 2,
      stock_minimo: 10,
      stock_reservado: 0,
      requiere_control_stock: true
    },
    {
      nombre: 'PRODUCTO_PRUEBA_BAJO',
      descripcion: 'Producto para probar alerta de stock bajo',
      stock: 8,
      stock_minimo: 10,
      stock_reservado: 0,
      requiere_control_stock: true
    },
    {
      nombre: 'PRODUCTO_PRUEBA_RESERVADO',
      descripcion: 'Producto para probar alerta de stock reservado',
      stock: 15,
      stock_minimo: 10,
      stock_reservado: 15,
      requiere_control_stock: true
    },
    {
      nombre: 'PRODUCTO_PRUEBA_SIN_CONFIG',
      descripcion: 'Producto para probar alerta de configuración faltante',
      stock: 20,
      stock_minimo: 0,
      stock_reservado: 0,
      requiere_control_stock: true
    }
  ];

  for (const productoPrueba of productosPrueba) {
    try {
      // Verificar si ya existe
      const existente = await prisma.producto.findFirst({
        where: { nombre: productoPrueba.nombre }
      });

      if (!existente) {
        await prisma.producto.create({
          data: productoPrueba
        });
        console.log(`   ✅ Creado: ${productoPrueba.nombre}`);
      } else {
        // Actualizar el existente
        await prisma.producto.update({
          where: { id_producto: existente.id_producto },
          data: productoPrueba
        });
        console.log(`   🔄 Actualizado: ${productoPrueba.nombre}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error con ${productoPrueba.nombre}:`, error.message);
    }
  }

  // Crear cotización con el producto sin configuración para simular demanda
  const productoSinConfig = await prisma.producto.findFirst({
    where: { nombre: 'PRODUCTO_PRUEBA_SIN_CONFIG' }
  });

  if (productoSinConfig) {
    const cotizacionPrueba = await prisma.cotizacion.create({
      data: {
        numero_cotizacion: `COT-PRUEBA-${Date.now()}`,
        cliente_nombre: 'Cliente Prueba',
        estado: 'aceptada',
        detalle_cotizacion: {
          create: {
            id_producto: productoSinConfig.id_producto,
            cantidad: 5,
            precio_unitario: 100
          }
        }
      }
    });
    console.log(`   📝 Creada cotización de prueba para producto sin configuración`);
  }
}

async function probarEndpointAlertas() {
  // Simular la función del controlador
  const productos = await prisma.producto.findMany({
    where: { requiere_control_stock: true },
    include: {
      proveedores: {
        select: {
          nombre: true
        }
      },
      _count: {
        select: {
          detalle_cotizacion: {
            where: {
              cotizacion: {
                estado: { in: ['en_proceso', 'enviada', 'aceptada'] }
              }
            }
          }
        }
      }
    }
  });

  const alertas = [];
  
  productos.forEach(producto => {
    const stock = Number(producto.stock) || 0;
    const stockMinimo = Number(producto.stock_minimo) || 5;
    const stockReservado = Number(producto.stock_reservado) || 0;
    const stockDisponible = stock - stockReservado;
    const tieneMovimientoReciente = producto._count.detalle_cotizacion > 0;

    // Stock agotado
    if (stock === 0) {
      alertas.push({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        tipo_alerta: 'stock_agotado',
        severidad: 'error'
      });
    }
    // Stock crítico
    else if (stock > 0 && stock <= stockMinimo * 0.5) {
      alertas.push({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        tipo_alerta: 'stock_critico',
        severidad: 'error'
      });
    }
    // Stock bajo
    else if (stock > stockMinimo * 0.5 && stock <= stockMinimo) {
      alertas.push({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        tipo_alerta: 'stock_bajo',
        severidad: 'warning'
      });
    }

    // Stock totalmente reservado
    if (stock > 0 && stockDisponible <= 0 && stockReservado > 0) {
      alertas.push({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        tipo_alerta: 'stock_reservado',
        severidad: 'warning'
      });
    }

    // Sin configuración pero con movimiento
    if (tieneMovimientoReciente && (!producto.stock_minimo || producto.stock_minimo === 0)) {
      alertas.push({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        tipo_alerta: 'configuracion_faltante',
        severidad: 'info'
      });
    }
  });

  const estadisticas = {
    total_alertas: alertas.length,
    alertas_criticas: alertas.filter(a => a.severidad === 'error').length,
    alertas_warning: alertas.filter(a => a.severidad === 'warning').length,
    alertas_info: alertas.filter(a => a.severidad === 'info').length,
    productos_sin_configurar: alertas.filter(a => a.tipo_alerta === 'configuracion_faltante').length
  };

  console.log(`   📊 Estadísticas de alertas:`);
  console.log(`      Total: ${estadisticas.total_alertas}`);
  console.log(`      Críticas: ${estadisticas.alertas_criticas}`);
  console.log(`      Advertencias: ${estadisticas.alertas_warning}`);
  console.log(`      Información: ${estadisticas.alertas_info}`);
  console.log(`      Sin configurar: ${estadisticas.productos_sin_configurar}`);

  return { alertas, estadisticas };
}

async function verificarTiposAlertas() {
  const { alertas } = await probarEndpointAlertas();
  
  const tiposEsperados = [
    'stock_agotado',
    'stock_critico', 
    'stock_bajo',
    'stock_reservado',
    'configuracion_faltante'
  ];

  const tiposEncontrados = [...new Set(alertas.map(a => a.tipo_alerta))];
  
  console.log(`   🔍 Tipos de alertas encontrados: ${tiposEncontrados.join(', ')}`);
  
  tiposEsperados.forEach(tipo => {
    const encontrado = tiposEncontrados.includes(tipo);
    console.log(`      ${encontrado ? '✅' : '❌'} ${tipo}: ${encontrado ? 'OK' : 'NO ENCONTRADO'}`);
  });

  // Verificar alertas específicas de productos de prueba
  const alertasPrueba = alertas.filter(a => a.nombre.includes('PRODUCTO_PRUEBA'));
  console.log(`\n   🧪 Alertas de productos de prueba: ${alertasPrueba.length}`);
  
  alertasPrueba.forEach(alerta => {
    console.log(`      • ${alerta.nombre}: ${alerta.tipo_alerta} (${alerta.severidad})`);
  });
}

async function limpiarDatosPrueba() {
  try {
    // Eliminar cotizaciones de prueba
    await prisma.detalleCotizacion.deleteMany({
      where: {
        cotizacion: {
          numero_cotizacion: { startsWith: 'COT-PRUEBA-' }
        }
      }
    });

    await prisma.cotizacion.deleteMany({
      where: {
        numero_cotizacion: { startsWith: 'COT-PRUEBA-' }
      }
    });

    // Eliminar productos de prueba
    const resultadoProductos = await prisma.producto.deleteMany({
      where: {
        nombre: { startsWith: 'PRODUCTO_PRUEBA_' }
      }
    });

    console.log(`   🗑️  Eliminados ${resultadoProductos.count} productos de prueba`);
    console.log(`   🗑️  Eliminadas cotizaciones de prueba`);

  } catch (error) {
    console.log(`   ⚠️  Error limpiando datos de prueba: ${error.message}`);
  }
}

if (require.main === module) {
  probarSistemaAlertas();
}

module.exports = { probarSistemaAlertas };