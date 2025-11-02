/**
 * Script para verificar y crear el procedimiento almacenado actualizar_total_pedido
 * Ejecutar con: node scripts/setup-database-procedures.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function verificarYCrearProcedimiento() {
  let connection;
  
  try {
    console.log('🔗 Conectando a la base de datos...');
    
    // Datos de conexión para el servidor de producción
    const host = '127.0.0.1';
    const port = 3306;
    const user = 'logistica';
    const password = 'qwe567/U'; // Password sin codificar
    const database = 'sistema_pedidos';
    
    console.log(`   Usuario: ${user}`);
    console.log(`   Host: ${host}:${port}`);
    console.log(`   Base de datos: ${database}`);
    
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true
    });
    
    console.log('✅ Conectado a la base de datos');
    console.log('🔍 Verificando si el procedimiento actualizar_total_pedido existe...');
    
    // Verificar si el procedimiento existe
    const [rows] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? 
      AND ROUTINE_NAME = 'actualizar_total_pedido'
      AND ROUTINE_TYPE = 'PROCEDURE'
    `, [database]);
    
    const existe = rows[0].count > 0;
    
    if (existe) {
      console.log('✅ El procedimiento actualizar_total_pedido ya existe en la base de datos');
      return;
    }
    
    console.log('⚠️  El procedimiento NO existe. Creándolo...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'create_actualizar_total_pedido_procedure.sql');
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Limpiar el SQL: remover DELIMITER y $$
    sqlContent = sqlContent
      .replace(/DELIMITER \$\$/g, '')
      .replace(/DELIMITER ;/g, '')
      .replace(/\$\$/g, ';')  // Reemplazar $$ por ;
      .split(';')  // Dividir en statements
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SHOW'))  // Remover comentarios y SHOW
      .join(';\n');
    
    // Ejecutar el SQL limpio
    await connection.query(sqlContent);
    
    console.log('✅ Procedimiento actualizar_total_pedido creado exitosamente');
    
    // Verificar de nuevo
    const [verification] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? 
      AND ROUTINE_NAME = 'actualizar_total_pedido'
      AND ROUTINE_TYPE = 'PROCEDURE'
    `, [database]);
    
    if (verification[0].count > 0) {
      console.log('✅ Verificación exitosa: El procedimiento está disponible');
    } else {
      console.error('❌ Error: El procedimiento no se creó correctamente');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error al verificar/crear el procedimiento:', error);
    console.error('Detalles:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
verificarYCrearProcedimiento()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
