/* const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'qwe567/U', // modificar si tenés clave
  database: 'sistema_pedidos'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Base de datos conectada');
});

module.exports = connection; */

const mysql = require('mysql2');

// Crear un pool de conexiones
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'logistica',
  password: 'qwe567/U',
  database: 'sistema_pedidos',
  waitForConnections: true,
  connectionLimit: 10, // Ajusta según tu servidor
  queueLimit: 0
});

module.exports = pool;
