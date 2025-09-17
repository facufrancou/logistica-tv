const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analizarDatosExistentes() {
  try {
    console.log('=== ANÁLISIS DE DATOS EXISTENTES ===\n');

    // 1. Analizar listas de precios actuales
    console.log('📋 LISTAS DE PRECIOS ACTUALES:');
    const listasPrecios = await prisma.listaPrecio.findMany({
      include: {
        precios_por_lista: {
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

    for (const lista of listasPrecios) {
      console.log(`\n🏷️  ${lista.nombre} (${lista.tipo})`);
      console.log(`   Descripción: ${lista.descripcion}`);
      console.log(`   Activa: ${lista.activa}`);
      console.log(`   Productos con precios específicos: ${lista.precios_por_lista.length}`);
      
      if (lista.precios_por_lista.length > 0) {
        console.log('   Ejemplos de precios:');
        lista.precios_por_lista.slice(0, 3).forEach(precio => {
          const precioBase = parseFloat(precio.producto.precio_unitario);
          const precioLista = parseFloat(precio.precio);
          const recargo = precioBase > 0 ? ((precioLista - precioBase) / precioBase * 100).toFixed(2) : 0;
          
          console.log(`     • ${precio.producto.nombre}: Base $${precioBase} → Lista $${precioLista} (${recargo > 0 ? '+' : ''}${recargo}%)`);
        });
      }
    }

    // 2. Analizar productos y sus precios
    console.log('\n\n📦 PRODUCTOS Y PRECIOS:');
    const productos = await prisma.producto.findMany({
      include: {
        precios_por_lista: {
          include: {
            lista: true
          }
        }
      },
      take: 5
    });

    productos.forEach(producto => {
      console.log(`\n🔸 ${producto.nombre}`);
      console.log(`   Precio base: $${producto.precio_unitario}`);
      console.log(`   Precios en listas: ${producto.precios_por_lista.length}`);
      
      producto.precios_por_lista.forEach(precio => {
        const precioBase = parseFloat(producto.precio_unitario);
        const precioLista = parseFloat(precio.precio);
        const recargo = precioBase > 0 ? ((precioLista - precioBase) / precioBase * 100).toFixed(2) : 0;
        
        console.log(`     • ${precio.lista.nombre}: $${precioLista} (${recargo > 0 ? '+' : ''}${recargo}%)`);
      });
    });

    // 3. Analizar cotizaciones existentes
    console.log('\n\n📊 COTIZACIONES RECIENTES:');
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        detalle_cotizacion: {
          include: {
            producto: {
              select: {
                nombre: true,
                precio_unitario: true
              }
            }
          }
        },
        lista_precio: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 3
    });

    cotizaciones.forEach(cotizacion => {
      console.log(`\n💼 ${cotizacion.numero_cotizacion}`);
      console.log(`   Lista aplicada: ${cotizacion.lista_precio?.nombre || 'Sin lista'}`);
      console.log(`   Total: $${cotizacion.precio_total}`);
      console.log(`   Items: ${cotizacion.detalle_cotizacion.length}`);
      
      cotizacion.detalle_cotizacion.slice(0, 2).forEach(detalle => {
        const precioBase = parseFloat(detalle.producto.precio_unitario);
        const precioFinal = parseFloat(detalle.precio_unitario);
        const diferencia = precioBase > 0 ? ((precioFinal - precioBase) / precioBase * 100).toFixed(2) : 0;
        
        console.log(`     • ${detalle.producto.nombre}: $${precioBase} → $${precioFinal} (${diferencia > 0 ? '+' : ''}${diferencia}%)`);
      });
    });

    // 4. Estadísticas generales
    console.log('\n\n📈 ESTADÍSTICAS GENERALES:');
    const totalProductos = await prisma.producto.count();
    const totalListas = await prisma.listaPrecio.count();
    const totalPreciosPorLista = await prisma.precioPorLista.count();
    const totalCotizaciones = await prisma.cotizacion.count();

    console.log(`   • Total productos: ${totalProductos}`);
    console.log(`   • Total listas de precios: ${totalListas}`);
    console.log(`   • Total precios específicos por lista: ${totalPreciosPorLista}`);
    console.log(`   • Total cotizaciones: ${totalCotizaciones}`);

    // 5. Calcular recargos promedio por lista
    console.log('\n\n🧮 ANÁLISIS DE RECARGOS POR LISTA:');
    for (const lista of listasPrecios) {
      if (lista.precios_por_lista.length > 0) {
        const recargos = lista.precios_por_lista.map(precio => {
          const precioBase = parseFloat(precio.producto.precio_unitario);
          const precioLista = parseFloat(precio.precio);
          return precioBase > 0 ? ((precioLista - precioBase) / precioBase * 100) : 0;
        });
        
        const recargoPromedio = recargos.reduce((sum, r) => sum + r, 0) / recargos.length;
        const recargoMin = Math.min(...recargos);
        const recargoMax = Math.max(...recargos);
        
        console.log(`\n   ${lista.nombre}:`);
        console.log(`     • Recargo promedio: ${recargoPromedio.toFixed(2)}%`);
        console.log(`     • Recargo mínimo: ${recargoMin.toFixed(2)}%`);
        console.log(`     • Recargo máximo: ${recargoMax.toFixed(2)}%`);
        
        // Sugerir porcentaje de recargo estandarizado
        const recargoSugerido = Math.round(recargoPromedio);
        console.log(`     • Porcentaje sugerido para migración: ${recargoSugerido}%`);
      }
    }

    console.log('\n=== FIN DEL ANÁLISIS ===');

  } catch (error) {
    console.error('Error en el análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analizarDatosExistentes();