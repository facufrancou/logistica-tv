const express = require('express');
const cors = require('cors');
const app = express();const session = require('express-session');

app.use(session({
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false,
}));


app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Rutas
app.use('/clientes', require('./routes/clientes.routes'));
app.use('/productos', require('./routes/productos.routes'));
app.use('/pedidos', require('./routes/pedidos.routes'));
app.use('/proveedores', require('./routes/proveedores.routes'));


const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);


module.exports = app;
