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
    secure: process.env.NODE_ENV === 'production' // Solo HTTPS en producción
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
app.use('/facturacion', require('./routes/facturacion.routes'));

// Sprint 6: Nuevas rutas para reportes y dashboard
app.use('/reportes', require('./routes/reportes.routes'));
app.use('/dashboard', require('./routes/dashboard.routes'));

// Nuevas rutas para liquidaciones y clasificación fiscal
app.use('/liquidaciones', require('./routes/liquidaciones.routes'));

// Nuevas funcionalidades Sprint 7-10: Remitos, Ventas Directas e Indicadores
app.use('/remitos', require('./routes/remitos.routes'));
app.use('/ventas-directas', require('./routes/ventasDirectas.routes'));
app.use('/indicadores-stock', require('./routes/indicadoresStock.routes'));

// Sistema de Vacunas: Nuevas rutas para gestión completa de vacunas
app.use('/vacunas', require('./routes/vacunas.routes'));
app.use('/catalogos', require('./routes/catalogos.routes'));
app.use('/stock-vacunas', require('./routes/stockVacunas.routes'));

// Nuevas rutas para ventas directas de vacunas (entregas fuera de plan)
app.use('/ventas-directas-vacunas', require('./routes/ventasDirectasVacunas'));

module.exports = app;
