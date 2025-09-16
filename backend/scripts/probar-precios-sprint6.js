const prisma = require('../src/lib/prisma');
const PriceTracker = require('../src/lib/priceTracker');

async function probarFuncionalidadesPrecios() {
  console.log('🧪 PROBANDO FUNCIONALIDADES DE PRECIOS SPRINT 6');
  console.log('=' .repeat(50));

  try {
    // 1. Crear datos de prueba
    console.log('\n1️⃣ Creando datos de prueba...');
    
    // Crear productos de prueba
    const productos = await prisma.producto.createMany({
      data: [
        { nombre: 'VACUNA_A_PRUEBA', precio_unitario: 50.00, descripcion: 'Vacuna tipo A para pruebas' },
        { nombre: 'VACUNA_B_PRUEBA', precio_unitario: 75.00, descripcion: 'Vacuna tipo B para pruebas' },
        { nombre: 'VACUNA_C_PRUEBA', precio_unitario: 100.00, descripcion: 'Vacuna tipo C para pruebas' }
      ],
      skipDuplicates: true
    });

    // Obtener IDs de productos creados
    const productosCreados = await prisma.producto.findMany({
      where: {
        nombre: { in: ['VACUNA_A_PRUEBA', 'VACUNA_B_PRUEBA', 'VACUNA_C_PRUEBA'] }
      }
    });

    console.log(`✅ Creados ${productosCreados.length} productos de prueba`);

    // 2. Buscar o crear lista de precios de prueba
    let listaPrecio = await prisma.listaPrecio.findFirst({
      where: { activa: true }
    });

    if (!listaPrecio) {
      console.log('❌ No hay listas de precios activas. Creando una nueva...');
      // Si no hay listas, usar L15 que debería estar disponible
      listaPrecio = await prisma.listaPrecio.create({
        data: {
          nombre: 'LISTA_PRUEBA_SPRINT6',
          descripcion: 'Lista de precios para validar Sprint 6',
          tipo: 'L15',
          activa: true
        }
      });
    }

    console.log(`✅ Lista de precios creada: ${listaPrecio.nombre}`);

    // 3. Asignar precios a la lista
    const preciosLista = await prisma.precioPorLista.createMany({
      data: productosCreados.map(producto => ({
        id_producto: producto.id_producto,
        id_lista: listaPrecio.id_lista,
        precio: producto.precio_unitario * 1.2 // 20% más caro en la lista especial
      }))
    });

    console.log(`✅ Asignados precios para ${productosCreados.length} productos en la lista`);

    // 4. Simular cambios de precio con tracking
    console.log('\n2️⃣ Simulando cambios de precio...');
    
    for (const producto of productosCreados) {
      const precioOriginal = producto.precio_unitario;
      const precioNuevo = precioOriginal * 1.15; // Aumento del 15%

      // Actualizar precio base
      await prisma.producto.update({
        where: { id_producto: producto.id_producto },
        data: { precio_unitario: precioNuevo }
      });

      // Registrar cambio automáticamente
      await PriceTracker.registrarCambioPrecio({
        id_producto: producto.id_producto,
        id_lista_precio: null,
        precio_anterior: precioOriginal,
        precio_nuevo: precioNuevo,
        motivo: 'Aumento de costos de proveedor',
        usuario_id: null
      });

      console.log(`   📈 ${producto.nombre}: $${precioOriginal} → $${precioNuevo.toFixed(2)}`);
    }

    // 5. Simular actualización masiva en lista de precios
    console.log('\n3️⃣ Simulando actualización masiva...');
    
    const cambiosMasivos = [];
    
    for (const producto of productosCreados) {
      const precioActualLista = await prisma.productoListaPrecio.findUnique({
        where: {
          id_producto_id_lista_precio: {
            id_producto: producto.id_producto,
            id_lista_precio: listaPrecio.id_lista_precio
          }
        }
      });

      const precioNuevoLista = precioActualLista.precio * 0.9; // Descuento del 10%

      await prisma.productoListaPrecio.update({
        where: {
          id_producto_id_lista_precio: {
            id_producto: producto.id_producto,
            id_lista_precio: listaPrecio.id_lista_precio
          }
        },
        data: { precio: precioNuevoLista }
      });

      cambiosMasivos.push({
        id_producto: producto.id_producto,
        id_lista_precio: listaPrecio.id_lista_precio,
        precio_anterior: precioActualLista.precio,
        precio_nuevo: precioNuevoLista
      });
    }

    // Registrar cambios masivos
    const resultadoMasivo = await PriceTracker.registrarCambiosMasivos(
      cambiosMasivos,
      'Promoción especial - descuento 10%'
    );

    console.log(`✅ Registrados ${resultadoMasivo.count} cambios masivos`);

    // 6. Probar estadísticas
    console.log('\n4️⃣ Generando estadísticas...');
    
    const fechaInicio = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fechaFin = new Date();
    
    const estadisticas = await PriceTracker.getEstadisticasCambios(fechaInicio, fechaFin);
    
    console.log('📊 Estadísticas de cambios:');
    estadisticas.resumen_cambios.forEach(stat => {
      console.log(`   ${stat.tipo_cambio}: ${stat._count.id} cambios, promedio: ${stat._avg.variacion_porcentual?.toFixed(2)}%`);
    });

    // 7. Detectar cambios anómalos
    console.log('\n5️⃣ Detectando cambios anómalos...');
    
    const cambiosAnomalos = await PriceTracker.detectarCambiosAnomalos(5); // Umbral del 5%
    
    console.log(`🔍 Cambios anómalos detectados: ${cambiosAnomalos.length}`);
    cambiosAnomalos.forEach(cambio => {
      console.log(`   ${cambio.producto.nombre}: ${cambio.variacion_porcentual.toFixed(2)}% (${cambio.motivo})`);
    });

    // 8. Probar consultas de historial
    console.log('\n6️⃣ Consultando historial de precios...');
    
    const historialProducto = await prisma.historialPrecio.findMany({
      where: {
        id_producto: productosCreados[0].id_producto
      },
      include: {
        producto: { select: { nombre: true } },
        lista_precio: { select: { nombre: true } }
      },
      orderBy: { fecha_cambio: 'desc' }
    });

    console.log(`📋 Historial del producto ${productosCreados[0].nombre}:`);
    historialProducto.forEach(registro => {
      const lista = registro.lista_precio?.nombre || 'Precio base';
      console.log(`   ${registro.fecha_cambio.toISOString().split('T')[0]}: $${registro.precio_anterior} → $${registro.precio_nuevo} (${lista})`);
    });

    // 9. Verificar rendimiento con múltiples consultas
    console.log('\n7️⃣ Probando rendimiento...');
    
    const inicioRendimiento = Date.now();
    
    // Múltiples consultas simultáneas
    const [
      totalHistorial,
      cambiosRecientes,
      productosConCambios,
      listasAfectadas
    ] = await Promise.all([
      prisma.historialPrecio.count(),
      prisma.historialPrecio.count({
        where: {
          fecha_cambio: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.historialPrecio.groupBy({
        by: ['id_producto'],
        _count: { id: true }
      }),
      prisma.historialPrecio.groupBy({
        by: ['id_lista_precio'],
        _count: { id: true }
      })
    ]);

    const finRendimiento = Date.now();
    
    console.log(`⚡ Consultas ejecutadas en ${finRendimiento - inicioRendimiento}ms`);
    console.log(`   📊 Total registros historial: ${totalHistorial}`);
    console.log(`   📅 Cambios últimos 7 días: ${cambiosRecientes}`);
    console.log(`   🏷️ Productos con cambios: ${productosConCambios.length}`);

    // Limpieza
    console.log('\n🧹 Limpiando datos de prueba...');
    
    // Eliminar historial de prueba
    await prisma.historialPrecio.deleteMany({
      where: {
        OR: [
          { motivo: { contains: 'proveedor' } },
          { motivo: { contains: 'Promoción especial' } }
        ]
      }
    });

    // Eliminar relaciones producto-lista
    await prisma.productoListaPrecio.deleteMany({
      where: { id_lista_precio: listaPrecio.id_lista_precio }
    });

    // Eliminar lista de precios solo si la creamos nosotros
    if (listaPrecio.nombre === 'LISTA_PRUEBA_SPRINT6') {
      await prisma.listaPrecio.delete({
        where: { id_lista: listaPrecio.id_lista }
      });
    }

    // Eliminar productos
    await prisma.producto.deleteMany({
      where: {
        nombre: { in: ['VACUNA_A_PRUEBA', 'VACUNA_B_PRUEBA', 'VACUNA_C_PRUEBA'] }
      }
    });

    console.log('✅ Datos de prueba eliminados');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 TODAS LAS FUNCIONALIDADES DE PRECIOS FUNCIONAN CORRECTAMENTE');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS:', error);
    console.error('Detalles:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  probarFuncionalidadesPrecios();
}

module.exports = probarFuncionalidadesPrecios;
