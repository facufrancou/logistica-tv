const API_BASE_URL = 'http://localhost:3001'; // Backend API URL (corregido al puerto 3001)
const OLD_API_BASE_URL = "http://localhost:3001"; // Sistema anterior de pedidos

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

// Función reutilizable para fetch con sesión - NUEVA API (Planes Vacunales)
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
      // Crear un error que preserve toda la información del backend
      const error = new Error(errorData.message || errorData.error || 'Datos inválidos');
      error.response = { data: errorData };
      throw error;
    } else if (res.status === 404) {
      throw new Error('Recurso no encontrado');
    } else {
      throw new Error('Error interno del servidor');
    }
  }
  
  return await res.json();
};

// Función para la API antigua de pedidos
const fetchLegacy = async (url, options = {}) => {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) throw new Error("No autorizado");
  return await res.json();
};

// ==========================================
// AUTENTICACIÓN - NUEVA API
// ==========================================

export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: defaultHeaders,
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error de autenticación');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders
    });

    if (!response.ok) {
      throw new Error('Error al cerrar sesión');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const verificarSesion = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      credentials: 'include',
      headers: authHeaders
    });

    if (!response.ok) {
      throw new Error('Sesión no válida');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// ==========================================
// PLANES VACUNALES (SPRINT 1)
// ==========================================

// Gestión de Planes
export const getPlanes = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.lista_precio) params.append('lista_precio', filters.lista_precio);
  
  const url = `${API_BASE_URL}/planes-vacunales/planes${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const getPlanById = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/planes/${id}`);
};

export const crearPlan = async (planData) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/planes`, {
    method: 'POST',
    body: JSON.stringify(planData)
  });
};

export const actualizarPlan = async (id, planData) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/planes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(planData)
  });
};

export const eliminarPlan = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/planes/${id}`, {
    method: 'DELETE'
  });
};

export const calcularPrecioPlan = async (id, idListaPrecio = null) => {
  let url = `${API_BASE_URL}/planes-vacunales/planes/${id}/calcular-precio`;
  if (idListaPrecio) {
    url += `?id_lista_precio=${idListaPrecio}`;
  }
  return await fetchConSesion(url);
};

// Listas de Precios
export const getListasPrecios = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.activa !== undefined) params.append('activa', filters.activa);
  
  const url = `${API_BASE_URL}/planes-vacunales/listas-precios${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const crearListaPrecio = async (listaData) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/listas-precios`, {
    method: 'POST',
    body: JSON.stringify(listaData)
  });
};

export const actualizarListaPrecio = async (id, listaData) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/listas-precios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(listaData)
  });
};

// Precios por Lista
export const getPreciosPorLista = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.id_lista) params.append('id_lista', filters.id_lista);
  if (filters.id_producto) params.append('id_producto', filters.id_producto);
  if (filters.activo !== undefined) params.append('activo', filters.activo);
  
  const url = `${API_BASE_URL}/planes-vacunales/precios-por-lista${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const establecerPrecio = async (precioData) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/precios-por-lista`, {
    method: 'POST',
    body: JSON.stringify(precioData)
  });
};

// ==========================================
// COTIZACIONES (SPRINT 2)
// ==========================================

export const getCotizaciones = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.id_cliente) params.append('id_cliente', filters.id_cliente);
  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
  
  const url = `${API_BASE_URL}/cotizaciones${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const getCotizacionById = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}`);
};

export const crearCotizacion = async (cotizacionData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones`, {
    method: 'POST',
    body: JSON.stringify(cotizacionData)
  });
};

export const actualizarCotizacion = async (id, cotizacionData) => {
  const response = await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cotizacionData)
  });
  // El backend devuelve { message: "...", cotizacion: {...} }
  // Extraemos solo la cotización para mantener consistencia
  return response.cotizacion || response;
};

export const cambiarEstadoCotizacion = async (id, estadoData) => {
  const response = await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}/estado`, {
    method: 'PUT',
    body: JSON.stringify(estadoData)
  });
  // El backend devuelve { message: "...", cotizacion: {...} }
  // Extraemos solo la cotización para mantener consistencia
  return response.cotizacion || response;
};

export const eliminarCotizacion = async (id, motivo = '') => {
  const response = await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ motivo })
  });
  // El backend devuelve { message: "...", cotizacion: {...} }
  // Extraemos solo la cotización para mantener consistencia
  return response.cotizacion || response;
};

export const reactivarCotizacion = async (id, estado_destino, motivo = '') => {
  const response = await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}/reactivar`, {
    method: 'PUT',
    body: JSON.stringify({ estado_destino, motivo })
  });
  // El backend devuelve { message: "...", cotizacion: {...} }
  // Extraemos solo la cotización para mantener consistencia
  return response.cotizacion || response;
};

export const getCalendarioVacunacion = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}/calendario`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
};

export const actualizarEstadoDosis = async (id_calendario, estadoData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/calendario/${id_calendario}/estado`, {
    method: 'PUT',
    body: JSON.stringify(estadoData)
  });
};

export const regenerarCalendario = async (id, fechaData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id}/regenerar-calendario`, {
    method: 'POST',
    body: JSON.stringify(fechaData)
  });
};

// ===== EDICIÓN DE CALENDARIO =====

export const editarFechaCalendario = async (id_cotizacion, id_calendario, fechaData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/calendario/${id_calendario}/fecha`, {
    method: 'PUT',
    body: JSON.stringify(fechaData)
  });
};

export const crearDesdoblamientoDosis = async (id_cotizacion, id_calendario, desdoblamientoData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/calendario/${id_calendario}/desdoblar`, {
    method: 'POST',
    body: JSON.stringify(desdoblamientoData)
  });
};

// ===== CONTROL DE ENTREGAS =====

export const marcarEntregaDosis = async (id_calendario, entregaData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/calendario/${id_calendario}/entregar`, {
    method: 'POST',
    body: JSON.stringify(entregaData)
  });
};

export const getControlEntregas = async (id_cotizacion, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
  if (filters.id_producto) params.append('id_producto', filters.id_producto);
  
  const url = `${API_BASE_URL}/cotizaciones/${id_cotizacion}/control-entregas${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const generarRemitoEntrega = async (id_calendario, entregaData = {}) => {
  const response = await fetch(`${API_BASE_URL}/cotizaciones/calendario/${id_calendario}/remito`, {
    method: 'POST',
    credentials: 'include', // Usar cookies de sesión
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(entregaData)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al generar el remito PDF' }));
    throw new Error(error.message || 'Error al generar el remito PDF');
  }
  
  return await response.blob();
};

export const ajustarStockCalendario = async (id_cotizacion, id_calendario, ajusteData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/calendario/${id_calendario}/ajustar-stock`, {
    method: 'PUT',
    body: JSON.stringify(ajusteData)
  });
};

export const finalizarPlan = async (id_cotizacion, observaciones = '') => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/finalizar-plan`, {
    method: 'POST',
    body: JSON.stringify({ observaciones_finalizacion: observaciones })
  });
};

export const getEstadoPlan = async (id_cotizacion) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/estado-plan`);
};

// ===== REASIGNACIÓN DE LOTES =====

export const asignarLoteManual = async (id_calendario, loteData) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/calendario/${id_calendario}/asignar-lote`, {
    method: 'PUT',
    body: JSON.stringify(loteData)
  });
};

export const reasignarLoteAutomatico = async (id_calendario) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/calendario/${id_calendario}/reasignar-lote`, {
    method: 'POST'
  });
};

export const asignarMultiplesLotes = async (id_calendario) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/calendario/${id_calendario}/asignar-multilote`, {
    method: 'POST'
  });
};

export const getStocksDisponibles = async (id_vacuna, fecha_aplicacion = null) => {
  const params = new URLSearchParams();
  params.append('id_vacuna', id_vacuna);
  if (fecha_aplicacion) params.append('fecha_aplicacion', fecha_aplicacion);
  
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/stocks-disponibles?${params.toString()}`);
};

export const reasignarTodosLotesCotizacion = async (id_cotizacion) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/reasignar-todos-lotes`, {
    method: 'POST'
  });
};

export const verificarEstadoLotes = async (id_cotizacion) => {
  return await fetchConSesion(`${API_BASE_URL}/cotizaciones/${id_cotizacion}/verificar-lotes`);
};

// ==========================================
// STOCK (SPRINT 3)
// ==========================================

export const getMovimientosStock = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.id_producto) params.append('id_producto', filters.id_producto);
  if (filters.tipo_movimiento) params.append('tipo_movimiento', filters.tipo_movimiento);
  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
  
  const url = `${API_BASE_URL}/stock/movimientos${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const registrarMovimiento = async (movimientoData) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/movimientos`, {
    method: 'POST',
    body: JSON.stringify(movimientoData)
  });
};

export const getEstadoStock = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.requiere_control_stock !== undefined) params.append('requiere_control_stock', filters.requiere_control_stock);
  
  const url = `${API_BASE_URL}/stock/estado${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const getAlertasStock = async () => {
  return await fetchConSesion(`${API_BASE_URL}/stock/alertas`);
};

export const getReservasStock = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.estado_reserva) params.append('estado_reserva', filters.estado_reserva);
  if (filters.id_cotizacion) params.append('id_cotizacion', filters.id_cotizacion);
  
  const url = `${API_BASE_URL}/stock/reservas${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

export const crearReserva = async (reservaData) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/reservas`, {
    method: 'POST',
    body: JSON.stringify(reservaData)
  });
};

export const liberarReserva = async (id, motivo = '') => {
  return await fetchConSesion(`${API_BASE_URL}/stock/reservas/${id}/liberar`, {
    method: 'PUT',
    body: JSON.stringify({ motivo })
  });
};

export const verificarDisponibilidad = async (id_cotizacion) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/verificar-disponibilidad`, {
    method: 'POST',
    body: JSON.stringify({ id_cotizacion })
  });
};

export const getResumenStock = async (idProducto) => {
  return await fetchConSesion(`${API_BASE_URL}/stock/resumen/${idProducto}`);
};

// ==========================================
// API LEGACY (PEDIDOS) - Mantener compatibilidad
// ==========================================

// CLIENTES
export const getClientes = () => fetchLegacy(OLD_API_BASE_URL + "/clientes");
export const crearCliente = async (cliente) => {
  try {
    const res = await fetch(OLD_API_BASE_URL + "/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear el cliente");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear cliente: " + err.message);
    return null;
  }
};

// PRODUCTOS
export const getProductos = () => fetchLegacy(OLD_API_BASE_URL + "/productos");

// PEDIDOS
export const getPedidos = () => fetchLegacy(OLD_API_BASE_URL + "/pedidos");

// ==========================================
// SPRINT 4 - SEGUIMIENTO DE DOSIS
// ==========================================

// Dashboard de Seguimiento
export const getSeguimientoDashboard = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/dashboard?${params}`);
};

// Aplicaciones de Dosis
export const getAplicaciones = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones?${params}`);
};

export const crearAplicacion = async (aplicacionData) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones`, {
    method: 'POST',
    body: JSON.stringify(aplicacionData)
  });
};

export const actualizarAplicacion = async (id, aplicacionData) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(aplicacionData)
  });
};

export const eliminarAplicacion = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/${id}`, {
    method: 'DELETE'
  });
};

export const marcarAplicacionCompleta = async (id, datos) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/${id}/completar`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

export const getAplicacionDetalle = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/${id}`);
};

// Retiros de Campo
export const getRetirosCampo = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/retiros?${params}`);
};

export const crearRetiroCampo = async (retiroData) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/retiros`, {
    method: 'POST',
    body: JSON.stringify(retiroData)
  });
};

export const actualizarRetiroCampo = async (id, retiroData) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/retiros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(retiroData)
  });
};

export const eliminarRetiroCampo = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/retiros/${id}`, {
    method: 'DELETE'
  });
};

export const marcarRetiroCompleto = async (id, datos) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/retiros/${id}/completar`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

export const getRetiroCampoDetalle = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/retiros/${id}`);
};

// Panel de Cumplimiento
export const getCumplimiento = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/cumplimiento?${params}`);
};

export const getCumplimientoPorCliente = async (clienteId, periodo = '30') => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/cumplimiento/cliente/${clienteId}?periodo=${periodo}`);
};

export const getCumplimientoPorProducto = async (productoId, periodo = '30') => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/cumplimiento/producto/${productoId}?periodo=${periodo}`);
};

export const getReporteCumplimiento = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/cumplimiento/reporte?${params}`);
};

export const getTendenciasCumplimiento = async (periodo = '90') => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/cumplimiento/tendencias?periodo=${periodo}`);
};

// Centro de Notificaciones
export const getNotificaciones = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones?${params}`);
};

export const crearNotificacion = async (notificacionData) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones`, {
    method: 'POST',
    body: JSON.stringify(notificacionData)
  });
};

export const marcarNotificacionLeida = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/${id}/leer`, {
    method: 'PUT'
  });
};

export const marcarTodasNotificacionesLeidas = async () => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/leer-todas`, {
    method: 'PUT'
  });
};

export const eliminarNotificacion = async (id) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/${id}`, {
    method: 'DELETE'
  });
};

export const getConfiguracionNotificaciones = async () => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/configuracion`);
};

export const actualizarConfiguracionNotificaciones = async (configuracion) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/configuracion`, {
    method: 'PUT',
    body: JSON.stringify(configuracion)
  });
};

export const getNotificacionesNoLeidas = async () => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/no-leidas`);
};

export const getEstadisticasNotificaciones = async () => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/notificaciones/estadisticas`);
};

// Funciones auxiliares para el seguimiento
export const getProximasAplicaciones = async (dias = 7) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/proximas?dias=${dias}`);
};

export const getAplicacionesVencidas = async () => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/vencidas`);
};

export const getAlertasCriticas = async () => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/alertas/criticas`);
};

export const programarRecordatorio = async (aplicacionId, datos) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/${aplicacionId}/recordatorio`, {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const cancelarRecordatorio = async (aplicacionId) => {
  return await fetchConSesion(`${API_BASE_URL}/seguimiento/aplicaciones/${aplicacionId}/recordatorio`, {
    method: 'DELETE'
  });
};

// Export de todas las funciones de la API
export const planesVacunalesApi = {
  // Planes vacunales
  getPlanes,
  crearPlan,
  actualizarPlan,
  eliminarPlan,
  getPlanById,
  
  // Listas de precios
  getListasPrecios,
  crearListaPrecio,
  actualizarListaPrecio,
  getPreciosPorLista,
  
  // Cotizaciones
  getCotizaciones,
  crearCotizacion,
  actualizarCotizacion,
  eliminarCotizacion,
  reactivarCotizacion,
  getCotizacionById,
  
  // Calendario
  getCalendarioVacunacion,
  actualizarEstadoDosis,
  regenerarCalendario,
  editarFechaCalendario,
  crearDesdoblamientoDosis,
  
  // Reasignación de Lotes
  asignarLoteManual,
  reasignarLoteAutomatico,
  asignarMultiplesLotes,
  getStocksDisponibles,
  reasignarTodosLotesCotizacion,
  verificarEstadoLotes,
  
  // Control de Entregas
  marcarEntregaDosis,
  getControlEntregas,
  generarRemitoEntrega,
  ajustarStockCalendario,
  finalizarPlan,
  getEstadoPlan,
  
  // Stock
  getMovimientosStock,
  getEstadoStock,
  getAlertasStock,
  getReservasStock,
  crearReserva,
  liberarReserva,
  verificarDisponibilidad,
  getResumenStock,
  
  // Seguimiento de Dosis (Sprint 4)
  getSeguimientoDashboard,
  getAplicaciones,
  crearAplicacion,
  actualizarAplicacion,
  eliminarAplicacion,
  marcarAplicacionCompleta,
  getAplicacionDetalle,
  getRetirosCampo,
  crearRetiroCampo,
  actualizarRetiroCampo,
  eliminarRetiroCampo,
  marcarRetiroCompleto,
  getRetiroCampoDetalle,
  getCumplimiento,
  getCumplimientoPorCliente,
  getCumplimientoPorProducto,
  getReporteCumplimiento,
  getTendenciasCumplimiento,
  getNotificaciones,
  crearNotificacion,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  eliminarNotificacion,
  getConfiguracionNotificaciones,
  actualizarConfiguracionNotificaciones,
  getNotificacionesNoLeidas,
  getEstadisticasNotificaciones,
  getProximasAplicaciones,
  getAplicacionesVencidas,
  getAlertasCriticas,
  programarRecordatorio,
  cancelarRecordatorio,
  
  // === FACTURACIÓN API ===
  
  // Dashboard de Facturación
  getFacturacionDashboard: async (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    return await fetchConSesion(`${API_BASE_URL}/api/facturacion/dashboard?${params}`);
  },
  
  // CRUD Facturas
  getFacturas: async (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    return await fetchConSesion(`${API_BASE_URL}/api/facturas?${params}`);
  },
  
  getFacturaById: async (id) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${id}`);
  },
  
  crearFactura: async (facturaData) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas`, {
      method: 'POST',
      body: JSON.stringify(facturaData)
    });
  },
  
  actualizarFactura: async (id, facturaData) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(facturaData)
    });
  },
  
  eliminarFactura: async (id) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${id}`, {
      method: 'DELETE'
    });
  },
  
  actualizarEstadoFactura: async (id, estado) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado })
    });
  },
  
  anularFactura: async (id) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${id}/anular`, {
      method: 'POST'
    });
  },
  
  duplicarFactura: async (id) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${id}/duplicar`, {
      method: 'POST'
    });
  },
  
  // Numeración
  generarNumeroFactura: async (tipo = 'A') => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/generar-numero`, {
      method: 'POST',
      body: JSON.stringify({ tipo })
    });
  },
  
  // Pagos
  getHistorialPagosFactura: async (facturaId) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${facturaId}/pagos`);
  },
  
  registrarPagoFactura: async (facturaId, pagoData) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${facturaId}/pagos`, {
      method: 'POST',
      body: JSON.stringify(pagoData)
    });
  },
  
  // Email y PDF
  enviarFacturaPorEmail: async (facturaId, emailData) => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/${facturaId}/enviar-email`, {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  },
  
  descargarFacturaPDF: async (facturaId) => {
    const response = await fetch(`${API_BASE_URL}/api/facturas/${facturaId}/pdf`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Error al descargar PDF');
    return await response.blob();
  },
  
  // Notas de Crédito y Débito
  getNotasCreditoDebito: async (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    return await fetchConSesion(`${API_BASE_URL}/api/notas-credito-debito?${params}`);
  },
  
  getNotaCreditoDebitoById: async (id) => {
    return await fetchConSesion(`${API_BASE_URL}/api/notas-credito-debito/${id}`);
  },
  
  crearNotaCreditoDebito: async (notaData) => {
    return await fetchConSesion(`${API_BASE_URL}/api/notas-credito-debito`, {
      method: 'POST',
      body: JSON.stringify(notaData)
    });
  },
  
  actualizarNotaCreditoDebito: async (id, notaData) => {
    return await fetchConSesion(`${API_BASE_URL}/api/notas-credito-debito/${id}`, {
      method: 'PUT',
      body: JSON.stringify(notaData)
    });
  },
  
  anularNotaCreditoDebito: async (id) => {
    return await fetchConSesion(`${API_BASE_URL}/api/notas-credito-debito/${id}/anular`, {
      method: 'POST'
    });
  },
  
  generarNumeroNota: async (tipo) => {
    return await fetchConSesion(`${API_BASE_URL}/api/notas-credito-debito/generar-numero`, {
      method: 'POST',
      body: JSON.stringify({ tipo })
    });
  },
  
  getFacturasParaNotas: async () => {
    return await fetchConSesion(`${API_BASE_URL}/api/facturas/para-notas`);
  },
  
  // Configuración de Facturación
  getConfiguracionFacturacion: async () => {
    return await fetchConSesion(`${API_BASE_URL}/api/configuracion/facturacion`);
  },
  
  actualizarConfiguracionFacturacion: async (configuracion) => {
    return await fetchConSesion(`${API_BASE_URL}/api/configuracion/facturacion`, {
      method: 'PUT',
      body: JSON.stringify(configuracion)
    });
  },
  
  subirLogoEmpresa: async (formData) => {
    return await fetch(`${API_BASE_URL}/api/configuracion/logo`, {
      method: 'POST',
      credentials: 'include',
      body: formData // No agregar Content-Type para FormData
    }).then(res => res.json());
  },
  
  subirCertificadoAFIP: async (formData) => {
    return await fetch(`${API_BASE_URL}/api/configuracion/afip/certificado`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    }).then(res => res.json());
  },
  
  probarConexionAFIP: async () => {
    return await fetchConSesion(`${API_BASE_URL}/api/afip/probar-conexion`, {
      method: 'POST'
    });
  },
  
  resetearNumeracionFactura: async (tipo) => {
    return await fetchConSesion(`${API_BASE_URL}/api/configuracion/numeracion/resetear`, {
      method: 'POST',
      body: JSON.stringify({ tipo })
    });
  },
  
  // Reportes de Facturación
  getReporteFacturacion: async (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    return await fetchConSesion(`${API_BASE_URL}/api/reportes/facturacion?${params}`);
  },
  
  getReporteVentas: async (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    return await fetchConSesion(`${API_BASE_URL}/api/reportes/ventas?${params}`);
  },
  
  getReporteCuentasCorrientes: async (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    return await fetchConSesion(`${API_BASE_URL}/api/reportes/cuentas-corrientes?${params}`);
  },
  
  exportarReporteFacturacion: async (filtros = {}, formato = 'excel') => {
    const params = new URLSearchParams({...filtros, formato});
    const response = await fetch(`${API_BASE_URL}/api/reportes/facturacion/exportar?${params}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Error al exportar reporte');
    return await response.blob();
  },
  
  // Sincronización AFIP
  sincronizarAFIP: async () => {
    return await fetchConSesion(`${API_BASE_URL}/api/afip/sincronizar`, {
      method: 'POST'
    });
  },
  
  getEstadoSincronizacionAFIP: async () => {
    return await fetchConSesion(`${API_BASE_URL}/api/afip/estado-sincronizacion`);
  },
  
  autorizarFacturaAFIP: async (facturaId) => {
    return await fetchConSesion(`${API_BASE_URL}/api/afip/autorizar-factura/${facturaId}`, {
      method: 'POST'
    });
  },
  
  consultarFacturaAFIP: async (facturaId) => {
    return await fetchConSesion(`${API_BASE_URL}/api/afip/consultar-factura/${facturaId}`);
  },
  
  // Validaciones
  validarCuit: async (cuit) => {
    return await fetchConSesion(`${API_BASE_URL}/api/validaciones/cuit`, {
      method: 'POST',
      body: JSON.stringify({ cuit })
    });
  },
  
  validarCondicionTributaria: async (cuit) => {
    return await fetchConSesion(`${API_BASE_URL}/api/validaciones/condicion-tributaria`, {
      method: 'POST',
      body: JSON.stringify({ cuit })
    });
  },
  
  // API Legacy (compatibilidad)
  getClientes,
  crearCliente,
  getProductos,
  getPedidos
};


