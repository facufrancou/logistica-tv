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
app.use('/planes-vacunales', require('./routes/planesVacunales.routes'));
app.use('/cotizaciones', require('./routes/cotizaciones.routes'));
app.use('/stock', require('./routes/stock.routes'));
app.use('/seguimiento', require('./routes/seguimiento.routes'));
app.use('/api', require('./routes/facturacion.routes'));

// Sprint 6: Nuevas rutas para reportes y dashboard
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

module.exports = app;
