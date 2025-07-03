const mysql = require('mysql2');

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

module.exports = connection;
