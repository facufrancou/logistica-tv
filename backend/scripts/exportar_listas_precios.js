/**
 * Script para exportar listas de precios de la base de desarrollo
 * Ejecutar: node scripts/exportar_listas_precios.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportarDatos() {
  try {
    console.log('🔍 Exportando listas de precios de desarrollo...\n');

    // Exportar listas de precios
    console.log('📋 Exportando listas de precios...');
    const listasPrecios = await prisma.listaPrecio.findMany({
      orderBy: { id_lista: 'asc' }
    });
    console.log(`   ✅ ${listasPrecios.length} listas de precios encontradas`);

    // Exportar precios por lista
    console.log('💰 Exportando precios por lista...');
    const preciosPorLista = await prisma.precioPorLista.findMany({
      include: {
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            tipo_producto: true
          }
        },
        lista: {
          select: {
            id_lista: true,
            nombre: true,
            tipo: true
          }
        }
      },
      orderBy: [
        { id_lista: 'asc' },
        { id_producto: 'asc' },
        { fecha_vigencia: 'desc' }
      ]
    });
    console.log(`   ✅ ${preciosPorLista.length} precios encontrados`);

    // Preparar datos para exportar
    const datos = {
      fecha_exportacion: new Date().toISOString(),
      base_origen: 'desarrollo',
      estadisticas: {
        listas_precios: listasPrecios.length,
        precios_por_lista: preciosPorLista.length
      },
      listas_precios: listasPrecios.map(l => ({
        id_lista: l.id_lista,
        tipo: l.tipo,
        nombre: l.nombre,
        descripcion: l.descripcion,
        porcentaje_recargo: l.porcentaje_recargo.toString(),
        activa: l.activa
      })),
      precios_por_lista: preciosPorLista.map(p => ({
        id_precio_lista: p.id_precio_lista,
        id_producto: p.id_producto,
        producto_nombre: p.producto.nombre,
        producto_tipo: p.producto.tipo_producto,
        id_lista: p.id_lista,
        lista_nombre: p.lista.nombre,
        lista_tipo: p.lista.tipo,
        precio: p.precio.toString(),
        fecha_vigencia: p.fecha_vigencia.toISOString().split('T')[0],
        activo: p.activo
      }))
    };

    // Guardar en archivo JSON
    const outputPath = path.join(__dirname, 'listas_precios_export.json');
    fs.writeFileSync(outputPath, JSON.stringify(datos, null, 2), 'utf8');

    console.log('\n✅ Exportación completada exitosamente');
    console.log(`📁 Archivo generado: ${outputPath}`);
    console.log('\n📊 Resumen:');
    console.log(`   - ${datos.listas_precios.length} listas de precios`);
    console.log(`   - ${datos.precios_por_lista.length} precios por lista`);
    console.log('\n🚀 Siguiente paso: Ejecutar importar_listas_precios.js en el servidor de producción');

  } catch (error) {
    console.error('❌ Error al exportar datos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportarDatos();
