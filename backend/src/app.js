const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();

// ðŸ” Cloudflare HTTPS requiere esto para cookies seguras
app.set('trust proxy', 1);


// ? CORS abierto o limitado según entorno
app.use(cors({
//  origin: true,           // o tu dominio exacto
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://gestion.tierravolga.com.ar'],
  credentials: true
}));
/* // CORS - Configuración para múltiples orígenes permitidos
const allowedOrigins = [
  'https://gestion.tierravolga.com.ar',
  'https://api.tierravolga.com.ar',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173', // Vite dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas - cachea la preflight request
})); */


// Middleware JSON
app.use(express.json());

//  Config sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
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

// Nuevas rutas para liquidaciones y clasificaciÃ³n fiscal
app.use('/liquidaciones', require('./routes/liquidaciones.routes'));

// Nuevas funcionalidades Sprint 7-10: Remitos, Ventas Directas e Indicadores
app.use('/remitos', require('./routes/remitos.routes'));
app.use('/ventas-directas', require('./routes/ventasDirectas.routes'));
app.use('/indicadores-stock', require('./routes/indicadoresStock.routes'));

// Sistema de Vacunas: Nuevas rutas para gestiÃ³n completa de vacunas
app.use('/vacunas', require('./routes/vacunas.routes'));
app.use('/catalogos', require('./routes/catalogos.routes'));
app.use('/stock-vacunas', require('./routes/stockVacunas.routes'));

// Nuevas rutas para ventas directas de vacunas (entregas fuera de plan)
app.use('/ventas-directas-vacunas', require('./routes/ventasDirectasVacunas'));

module.exports = app;
