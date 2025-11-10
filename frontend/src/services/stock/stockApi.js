// API para gestión de stock - Sprint 3
const API_BASE_URL = 'http://localhost:3001'; // Backend API URL

// Headers por defecto
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Headers para requests con autenticación de sesión
const authHeaders = {
  ...defaultHeaders,
  'X-Requested-With': 'XMLHttpRequest'
};

// Función reutilizable para fetch con sesión
const fetchConSesion = async (url, options = {}) => {
  const config = {
    ...options,
    credentials: 'include', // IMPORTANTE: Incluir cookies de sesión
    headers: {
      ...authHeaders,
      ...options.headers
    }
  };

  const res = await fetch(url, config);
  
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('No autorizado - Sesión expirada');
    } else if (res.status === 400) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Datos inválidos');
    } else if (res.status === 404) {
      throw new Error('Recurso no encontrado');
    } else {
      throw new Error('Error interno del servidor');
    }
  }
  
  return await res.json();
};

// ==========================================
// FUNCIONES DE GESTIÓN DE STOCK
// ==========================================

// Obtener movimientos de stock
export const getMovimientosStock = async (filtros = {}) => {
  const params = new URLSearchParams();
  
  if (filtros.id_producto) params.append('id_producto', filtros.id_producto);
  if (filtros.tipo_movimiento) params.append('tipo_movimiento', filtros.tipo_movimiento);
  if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/stock/movimientos${queryString ? `?${queryString}` : ''}`;
  
  return await fetchConSesion(url);
};

// Registrar movimiento de stock
export const registrarMovimiento = async (movimiento) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/movimientos`, {
    method: 'POST',
    body: JSON.stringify(movimiento)
  });
};

// Obtener estado actual de stock
export const getEstadoStock = async (filtros = {}) => {
  const params = new URLSearchParams();
  
  if (filtros.requiere_control_stock !== undefined) {
    params.append('requiere_control_stock', filtros.requiere_control_stock);
  }
  
  if (filtros.tipo_producto) {
    params.append('tipo_producto', filtros.tipo_producto);
  }
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/stock/estado${queryString ? `?${queryString}` : ''}`;
  
  return await fetchConSesion(url);
};

// Obtener alertas de stock bajo
export const getAlertasStock = async (filtros = {}) => {
  const params = new URLSearchParams();
  
  if (filtros.tipo_producto) params.append('tipo_producto', filtros.tipo_producto);
  if (filtros.tipo_alerta) params.append('tipo_alerta', filtros.tipo_alerta);
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/stock/alertas${queryString ? `?${queryString}` : ''}`;
  
  return await fetchConSesion(url);
};

// Obtener reservas de stock
export const getReservasStock = async (filtros = {}) => {
  const params = new URLSearchParams();
  
  if (filtros.estado_reserva) params.append('estado_reserva', filtros.estado_reserva);
  if (filtros.id_cotizacion) params.append('id_cotizacion', filtros.id_cotizacion);
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/stock/reservas${queryString ? `?${queryString}` : ''}`;
  
  return await fetchConSesion(url);
};

// Crear reserva de stock
export const crearReserva = async (reserva) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/reservas`, {
    method: 'POST',
    body: JSON.stringify(reserva)
  });
};

// Liberar reserva de stock
export const liberarReserva = async (idReserva, motivo = '') => {
  return await fetchConSesion(`${API_BASE_URL}/stock/reservas/${idReserva}/liberar`, {
    method: 'PUT',
    body: JSON.stringify({ motivo })
  });
};

// Verificar disponibilidad para cotización
export const verificarDisponibilidad = async (idCotizacion) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/verificar-disponibilidad`, {
    method: 'POST',
    body: JSON.stringify({ id_cotizacion: idCotizacion })
  });
};

// Obtener resumen de stock por producto
export const getResumenStock = async (idProducto) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/resumen/${idProducto}`);
};