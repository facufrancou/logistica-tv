const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();

// 🔐 Cloudflare HTTPS requiere esto para cookies seguras
app.set('trust proxy', 1);

// ✅ CORS abierto o limitado según entorno
app.use(cors({
  origin: true,           // o tu dominio exacto
  credentials: true
}));

// Middleware JSON
app.use(express.json());

//  Config sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',       
    secure: true           
  }
}));

// Rutas API - EXACTAMENTE LAS MISMAS RUTAS QUE EL BACKEND ORIGINAL
app.use('/auth', require('./routes/auth.routes'));
app.use('/clientes', require('./routes/clientes.routes'));
app.use('/productos', require('./routes/productos.routes'));
app.use('/pedidos', require('./routes/pedidos.routes'));
app.use('/proveedores', require('./routes/proveedores.routes'));

module.exports = app;
