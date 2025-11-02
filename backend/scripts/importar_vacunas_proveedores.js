/**
 * Script para importar vacunas y proveedores en la base de producción
 * Ejecutar: node scripts/importar_vacunas_proveedores.js
 * 
 * IMPORTANTE: Este script debe ejecutarse en el servidor de producción
 * después de haber copiado el archivo vacunas_proveedores_export.json
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importarDatos() {
  let connection;
  
  try {
    console.log('🔗 Conectando a la base de datos de producción...\n');
    
    // Datos de conexión de producción
    const host = '127.0.0.1';
    const port = 3306;
    const user = 'logistica';
    const password = 'qwe567/U';
    const database = 'sistema_pedidos';
    
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true
    });
    
    console.log('✅ Conectado a la base de datos\n');
    
    // Leer archivo de exportación
    const jsonPath = path.join(__dirname, 'vacunas_proveedores_export.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`No se encontró el archivo: ${jsonPath}\nAsegúrate de haber ejecutado exportar_vacunas_proveedores.js y copiar el archivo al servidor.`);
    }
    
    console.log('📂 Leyendo archivo de exportación...');
    const datos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`📅 Fecha de exportación: ${datos.fecha_exportacion}`);
    console.log(`📊 Origen: ${datos.base_origen}\n`);
    
    // Comenzar transacción
    await connection.beginTransaction();
    
    try {
      // 1. Importar proveedores
      console.log('📦 Importando proveedores...');
      for (const proveedor of datos.proveedores) {
        await connection.execute(`
          INSERT INTO proveedores (id_proveedor, nombre, activo)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            activo = VALUES(activo)
        `, [
          proveedor.id_proveedor,
          proveedor.nombre,
          proveedor.activo ?? true
        ]);
      }
      console.log(`   ✅ ${datos.proveedores.length} proveedores importados`);
      
      // 2. Importar patologías
      console.log('🦠 Importando patologías...');
      for (const patologia of datos.patologias) {
        await connection.execute(`
          INSERT INTO patologias (id_patologia, codigo, nombre, descripcion, activa, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            codigo = VALUES(codigo),
            nombre = VALUES(nombre),
            descripcion = VALUES(descripcion),
            activa = VALUES(activa),
            updated_at = NOW()
        `, [
          patologia.id_patologia,
          patologia.codigo,
          patologia.nombre,
          patologia.descripcion,
          patologia.activa ?? true
        ]);
      }
      console.log(`   ✅ ${datos.patologias.length} patologías importadas`);
      
      // 3. Importar presentaciones
      console.log('📋 Importando presentaciones...');
      for (const presentacion of datos.presentaciones) {
        await connection.execute(`
          INSERT INTO presentaciones (id_presentacion, codigo, nombre, descripcion, unidad_medida, dosis_por_frasco, activa, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            codigo = VALUES(codigo),
            nombre = VALUES(nombre),
            descripcion = VALUES(descripcion),
            unidad_medida = VALUES(unidad_medida),
            dosis_por_frasco = VALUES(dosis_por_frasco),
            activa = VALUES(activa),
            updated_at = NOW()
        `, [
          presentacion.id_presentacion,
          presentacion.codigo,
          presentacion.nombre,
          presentacion.descripcion,
          presentacion.unidad_medida,
          presentacion.dosis_por_frasco ?? 1,
          presentacion.activa ?? true
        ]);
      }
      console.log(`   ✅ ${datos.presentaciones.length} presentaciones importadas`);
      
      // 4. Importar vías de aplicación
      console.log('💊 Importando vías de aplicación...');
      for (const via of datos.vias_aplicacion) {
        await connection.execute(`
          INSERT INTO vias_aplicacion (id_via_aplicacion, codigo, nombre, descripcion, activa, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            codigo = VALUES(codigo),
            nombre = VALUES(nombre),
            descripcion = VALUES(descripcion),
            activa = VALUES(activa),
            updated_at = NOW()
        `, [
          via.id_via_aplicacion,
          via.codigo,
          via.nombre,
          via.descripcion,
          via.activa ?? true
        ]);
      }
      console.log(`   ✅ ${datos.vias_aplicacion.length} vías de aplicación importadas`);
      
      // 5. Importar vacunas
      console.log('💉 Importando vacunas...');
      for (const vacuna of datos.vacunas) {
        await connection.execute(`
          INSERT INTO vacunas (
            id_vacuna,
            codigo,
            nombre,
            detalle,
            id_proveedor,
            id_patologia,
            id_presentacion,
            id_via_aplicacion,
            precio_lista,
            activa,
            requiere_frio,
            dias_vencimiento,
            observaciones,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            codigo = VALUES(codigo),
            nombre = VALUES(nombre),
            detalle = VALUES(detalle),
            id_proveedor = VALUES(id_proveedor),
            id_patologia = VALUES(id_patologia),
            id_presentacion = VALUES(id_presentacion),
            id_via_aplicacion = VALUES(id_via_aplicacion),
            precio_lista = VALUES(precio_lista),
            activa = VALUES(activa),
            requiere_frio = VALUES(requiere_frio),
            dias_vencimiento = VALUES(dias_vencimiento),
            observaciones = VALUES(observaciones),
            updated_at = NOW()
        `, [
          vacuna.id_vacuna,
          vacuna.codigo,
          vacuna.nombre,
          vacuna.detalle,
          vacuna.id_proveedor,
          vacuna.id_patologia,
          vacuna.id_presentacion,
          vacuna.id_via_aplicacion,
          vacuna.precio_lista,
          vacuna.activa ?? true,
          vacuna.requiere_frio ?? false,
          vacuna.dias_vencimiento,
          vacuna.observaciones
        ]);
      }
      console.log(`   ✅ ${datos.vacunas.length} vacunas importadas`);
      
      // Commit de la transacción
      await connection.commit();
      
      console.log('\n✅ Importación completada exitosamente');
      console.log('\n📊 Resumen:');
      console.log(`   - ${datos.proveedores.length} proveedores`);
      console.log(`   - ${datos.patologias.length} patologías`);
      console.log(`   - ${datos.presentaciones.length} presentaciones`);
      console.log(`   - ${datos.vias_aplicacion.length} vías de aplicación`);
      console.log(`   - ${datos.vacunas.length} vacunas`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al importar datos:', error);
    console.error('Detalles:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

importarDatos();
