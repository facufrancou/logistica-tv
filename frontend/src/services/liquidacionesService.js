/**
 * Servicio para gestionar liquidaciones y clasificación fiscal
 */

// Configuración de la API
const API_BASE = "http://localhost:3001/api";

// Función helper para llamadas API
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return await response.json();
};

// ===== CLASIFICACIÓN FISCAL =====

/**
 * Obtener items de cotización para clasificación fiscal
 * @param {number} cotizacionId - ID de la cotización
 * @returns {Promise} Items pendientes de clasificación
 */
export const obtenerItemsClasificacion = async (cotizacionId) => {
  try {
    const response = await apiCall(`/liquidaciones/cotizacion/${cotizacionId}/items`);
    return response;
  } catch (error) {
    console.error('Error al obtener items para clasificación:', error);
    throw error;
  }
};

/**
 * Clasificar un item individual como Vía 2 o Vía 1
 * @param {number} itemId - ID del detalle de cotización
 * @param {string} tipoFiscal - 'negro' (Vía 2) o 'blanco' (Vía 1)
 * @param {number} montoPersonalizado - Monto personalizado (opcional)
 * @param {string} observaciones - Observaciones adicionales
 * @returns {Promise} Resultado de la clasificación
 */
export const clasificarItem = async (itemId, tipoFiscal, montoPersonalizado = null, observaciones = '') => {
  try {
    const payload = {
      tipo_facturacion: tipoFiscal,
      ...(montoPersonalizado && { monto_personalizado: montoPersonalizado }),
      ...(observaciones && { observaciones })
    };

    const response = await apiCall(`/liquidaciones/item/${itemId}/clasificar`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return response;
  } catch (error) {
    console.error('Error al clasificar item:', error);
    throw error;
  }
};

/**
 * Clasificar múltiples items de una vez
 * @param {Array} items - Array de items con { id_detalle_cotizacion, tipo_facturacion, monto_personalizado }
 * @returns {Promise} Resultado de la clasificación múltiple
 */
export const clasificarMultiplesItems = async (items) => {
  try {
    const response = await apiCall('/liquidaciones/items/clasificar-multiples', {
      method: 'PUT',
      body: JSON.stringify({ items })
    });
    return response;
  } catch (error) {
    console.error('Error al clasificar múltiples items:', error);
    throw error;
  }
};

// ===== RESÚMENES DE LIQUIDACIÓN =====

/**
 * Generar resumen de liquidación para una cotización
 * @param {number} cotizacionId - ID de la cotización
 * @returns {Promise} Resumen generado
 */
export const generarResumenLiquidacion = async (cotizacionId) => {
  try {
    const response = await apiCall(`/liquidaciones/cotizacion/${cotizacionId}/resumen`, {
      method: 'POST'
    });
    return response;
  } catch (error) {
    console.error('Error al generar resumen de liquidación:', error);
    throw error;
  }
};

/**
 * Obtener resumen de liquidación de una cotización
 * @param {number} cotizacionId - ID de la cotización
 * @returns {Promise} Resumen de liquidación
 */
export const obtenerResumenLiquidacion = async (cotizacionId) => {
  try {
    const response = await apiCall(`/liquidaciones/cotizacion/${cotizacionId}/resumen`);
    return response;
  } catch (error) {
    console.error('Error al obtener resumen de liquidación:', error);
    throw error;
  }
};

/**
 * Listar resúmenes de liquidación con filtros
 * @param {Object} filtros - Filtros de búsqueda
 * @param {number} page - Página actual
 * @param {number} limit - Límite por página
 * @returns {Promise} Lista de resúmenes
 */
export const listarResumenesLiquidacion = async (filtros = {}, page = 1, limit = 10) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filtros
    });

    const response = await apiCall(`/liquidaciones/resumenes?${params}`);
    return response;
  } catch (error) {
    console.error('Error al listar resúmenes de liquidación:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de liquidaciones
 * @param {Object} filtros - Filtros de fecha
 * @returns {Promise} Estadísticas generales
 */
export const obtenerEstadisticasLiquidaciones = async (filtros = {}) => {
  try {
    const params = new URLSearchParams(filtros);
    const response = await apiCall(`/liquidaciones/estadisticas?${params}`);
    return response;
  } catch (error) {
    console.error('Error al obtener estadísticas de liquidaciones:', error);
    throw error;
  }
};

// ===== UTILIDADES =====

/**
 * Formatear precio para mostrar
 * @param {number} precio - Precio a formatear
 * @param {string} moneda - Símbolo de moneda
 * @returns {string} Precio formateado
 */
export const formatearPrecio = (precio, moneda = '$') => {
  if (typeof precio !== 'number' || isNaN(precio)) {
    return `${moneda}0,00`;
  }

  return `${moneda}${precio.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Calcular totales de clasificación
 * @param {Array} items - Items clasificados
 * @returns {Object} Totales por tipo
 */
export const calcularTotalesClasificacion = (items) => {
  const totales = {
    negro: 0,
    blanco: 0,
    pendiente: 0,
    total: 0
  };

  items.forEach(item => {
    const subtotal = parseFloat(item.subtotal || 0);
    totales.total += subtotal;

    switch (item.facturacion_tipo) {
      case 'negro':
        totales.negro += subtotal;
        break;
      case 'blanco':
        totales.blanco += subtotal;
        break;
      default:
        totales.pendiente += subtotal;
    }
  });

  return {
    ...totales,
    porcentaje_negro: totales.total > 0 ? (totales.negro / totales.total * 100) : 0,
    porcentaje_blanco: totales.total > 0 ? (totales.blanco / totales.total * 100) : 0,
    porcentaje_pendiente: totales.total > 0 ? (totales.pendiente / totales.total * 100) : 0
  };
};

/**
 * Validar si todos los items están clasificados
 * @param {Array} items - Items de cotización
 * @returns {boolean} True si todos están clasificados
 */
export const todosItemsClasificados = (items) => {
  return items.every(item => 
    item.facturacion_tipo === 'negro' || item.facturacion_tipo === 'blanco'
  );
};

/**
 * Obtener todas las liquidaciones con filtros opcionales
 */
const obtenerTodasLiquidaciones = async (filtros = {}) => {
  try {
    return await listarResumenesLiquidacion(filtros, 1, 1000); // Obtener hasta 1000 registros
  } catch (error) {
    console.error('Error al obtener todas las liquidaciones:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de liquidaciones
 */
const obtenerEstadisticas = async (filtros = {}) => {
  try {
    return await obtenerEstadisticasLiquidaciones(filtros);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

/**
 * Exportar liquidaciones en formato para descarga
 */
const exportarLiquidaciones = async (filtros = {}) => {
  try {
    const data = await listarResumenesLiquidacion(filtros, 1, 10000);
    return data;
  } catch (error) {
    console.error('Error al exportar liquidaciones:', error);
    throw error;
  }
};

/**
 * Obtener color según tipo de facturación
 * @param {string} tipo - Tipo de facturación
 * @returns {string} Clase CSS o color
 */
export const obtenerColorTipo = (tipo) => {
  switch (tipo) {
    case 'negro': return '#343a40'; // Gris oscuro
    case 'blanco': return '#6c757d'; // Gris claro
    case 'pendiente': return '#ffc107'; // Amarillo
    default: return '#dee2e6'; // Gris muy claro
  }
};

const liquidacionesService = {
  obtenerItemsClasificacion,
  clasificarItem,
  clasificarMultiplesItems,
  generarResumenLiquidacion,
  obtenerResumenLiquidacion,
  listarResumenesLiquidacion,
  obtenerEstadisticasLiquidaciones,
  obtenerTodasLiquidaciones,
  obtenerEstadisticas,
  exportarLiquidaciones,
  formatearPrecio,
  calcularTotalesClasificacion,
  todosItemsClasificados,
  obtenerColorTipo
};

export default liquidacionesService;