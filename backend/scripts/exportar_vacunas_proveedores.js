/**
 * Script para exportar vacunas y proveedores de la base de desarrollo
 * Ejecutar: node scripts/exportar_vacunas_proveedores.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportarDatos() {
  try {
    console.log('🔍 Exportando datos de desarrollo...\n');

    // Exportar proveedores
    console.log('📦 Exportando proveedores...');
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { id_proveedor: 'asc' }
    });
    console.log(`   ✅ ${proveedores.length} proveedores encontrados`);

    // Exportar vacunas con sus relaciones
    console.log('💉 Exportando vacunas...');
    const vacunas = await prisma.vacuna.findMany({
      include: {
        patologia: true,
        presentacion: true,
        via_aplicacion: true,
        proveedor: true
      },
      orderBy: { id_vacuna: 'asc' }
    });
    console.log(`   ✅ ${vacunas.length} vacunas encontradas`);

    // Exportar patologías (necesarias para vacunas)
    console.log('🦠 Exportando patologías...');
    const patologias = await prisma.patologia.findMany({
      orderBy: { id_patologia: 'asc' }
    });
    console.log(`   ✅ ${patologias.length} patologías encontradas`);

    // Exportar presentaciones (necesarias para vacunas)
    console.log('📋 Exportando presentaciones...');
    const presentaciones = await prisma.presentacion.findMany({
      orderBy: { id_presentacion: 'asc' }
    });
    console.log(`   ✅ ${presentaciones.length} presentaciones encontradas`);

    // Exportar vías de aplicación (necesarias para vacunas)
    console.log('💊 Exportando vías de aplicación...');
    const viasAplicacion = await prisma.viaAplicacion.findMany({
      orderBy: { id_via_aplicacion: 'asc' }
    });
    console.log(`   ✅ ${viasAplicacion.length} vías de aplicación encontradas`);

    // Preparar datos para exportar
    const datos = {
      fecha_exportacion: new Date().toISOString(),
      base_origen: 'desarrollo',
      estadisticas: {
        proveedores: proveedores.length,
        vacunas: vacunas.length,
        patologias: patologias.length,
        presentaciones: presentaciones.length,
        vias_aplicacion: viasAplicacion.length
      },
      proveedores: proveedores.map(p => ({
        id_proveedor: p.id_proveedor,
        nombre: p.nombre,
        activo: p.activo
      })),
      patologias: patologias.map(p => ({
        id_patologia: p.id_patologia,
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        activa: p.activa
      })),
      presentaciones: presentaciones.map(p => ({
        id_presentacion: p.id_presentacion,
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        unidad_medida: p.unidad_medida,
        dosis_por_frasco: p.dosis_por_frasco,
        activa: p.activa
      })),
      vias_aplicacion: viasAplicacion.map(v => ({
        id_via_aplicacion: v.id_via_aplicacion,
        codigo: v.codigo,
        nombre: v.nombre,
        descripcion: v.descripcion,
        activa: v.activa
      })),
      vacunas: vacunas.map(v => ({
        id_vacuna: v.id_vacuna,
        codigo: v.codigo,
        nombre: v.nombre,
        detalle: v.detalle,
        id_proveedor: v.id_proveedor,
        proveedor_nombre: v.proveedor?.nombre,
        id_patologia: v.id_patologia,
        patologia_nombre: v.patologia?.nombre,
        id_presentacion: v.id_presentacion,
        presentacion_nombre: v.presentacion?.nombre,
        id_via_aplicacion: v.id_via_aplicacion,
        via_nombre: v.via_aplicacion?.nombre,
        precio_lista: v.precio_lista.toString(),
        activa: v.activa,
        requiere_frio: v.requiere_frio,
        dias_vencimiento: v.dias_vencimiento,
        observaciones: v.observaciones
      }))
    };

    // Guardar en archivo JSON
    const outputPath = path.join(__dirname, 'vacunas_proveedores_export.json');
    fs.writeFileSync(outputPath, JSON.stringify(datos, null, 2), 'utf8');

    console.log('\n✅ Exportación completada exitosamente');
    console.log(`📁 Archivo generado: ${outputPath}`);
    console.log('\n📊 Resumen:');
    console.log(`   - ${datos.proveedores.length} proveedores`);
    console.log(`   - ${datos.patologias.length} patologías`);
    console.log(`   - ${datos.presentaciones.length} presentaciones`);
    console.log(`   - ${datos.vias_aplicacion.length} vías de aplicación`);
    console.log(`   - ${datos.vacunas.length} vacunas`);
    console.log('\n🚀 Siguiente paso: Ejecutar importar_vacunas_proveedores.js en el servidor de producción');

  } catch (error) {
    console.error('❌ Error al exportar datos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportarDatos();
