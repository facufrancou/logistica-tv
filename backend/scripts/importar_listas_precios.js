/**
 * Script para importar listas de precios en la base de producción
 * Ejecutar: node scripts/importar_listas_precios.js
 * 
 * IMPORTANTE: Este script debe ejecutarse en el servidor de producción
 * después de haber copiado el archivo listas_precios_export.json
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
    const jsonPath = path.join(__dirname, 'listas_precios_export.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`No se encontró el archivo: ${jsonPath}\nAsegúrate de haber ejecutado exportar_listas_precios.js y copiar el archivo al servidor.`);
    }
    
    console.log('📂 Leyendo archivo de exportación...');
    const datos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`📅 Fecha de exportación: ${datos.fecha_exportacion}`);
    console.log(`📊 Origen: ${datos.base_origen}\n`);
    
    // Comenzar transacción
    await connection.beginTransaction();
    
    try {
      // 1. Importar listas de precios
      console.log('📋 Importando listas de precios...');
      for (const lista of datos.listas_precios) {
        await connection.execute(`
          INSERT INTO listas_precios (
            id_lista,
            tipo,
            nombre,
            descripcion,
            porcentaje_recargo,
            activa,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            tipo = VALUES(tipo),
            nombre = VALUES(nombre),
            descripcion = VALUES(descripcion),
            porcentaje_recargo = VALUES(porcentaje_recargo),
            activa = VALUES(activa),
            updated_at = NOW()
        `, [
          lista.id_lista,
          lista.tipo,
          lista.nombre,
          lista.descripcion,
          lista.porcentaje_recargo,
          lista.activa ?? true
        ]);
      }
      console.log(`   ✅ ${datos.listas_precios.length} listas de precios importadas`);
      
      // 2. Importar precios por lista
      console.log('💰 Importando precios por lista...');
      let importados = 0;
      let actualizados = 0;
      
      for (const precio of datos.precios_por_lista) {
        const [result] = await connection.execute(`
          INSERT INTO precios_por_lista (
            id_precio_lista,
            id_producto,
            id_lista,
            precio,
            fecha_vigencia,
            activo,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            precio = VALUES(precio),
            activo = VALUES(activo),
            updated_at = NOW()
        `, [
          precio.id_precio_lista,
          precio.id_producto,
          precio.id_lista,
          precio.precio,
          precio.fecha_vigencia,
          precio.activo ?? true
        ]);
        
        if (result.affectedRows === 1) {
          importados++;
        } else {
          actualizados++;
        }
      }
      console.log(`   ✅ ${importados} precios importados, ${actualizados} actualizados`);
      
      // Commit de la transacción
      await connection.commit();
      
      console.log('\n✅ Importación completada exitosamente');
      console.log('\n📊 Resumen:');
      console.log(`   - ${datos.listas_precios.length} listas de precios`);
      console.log(`   - ${datos.precios_por_lista.length} precios por lista`);
      console.log(`   - ${importados} nuevos, ${actualizados} actualizados`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al importar datos:', error);
    console.error('Detalles:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

importarDatos();
