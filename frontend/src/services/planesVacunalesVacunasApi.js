// ===== API PARA PLANES VACUNALES CON VACUNAS =====

const API_BASE_URL = 'http://localhost:3001';

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

// ===== PLANES VACUNALES CON SOPORTE PARA VACUNAS =====

/**
 * Obtener planes vacunales con opción de filtrar por tipo
 * @param {Object} filters - Filtros para los planes
 * @param {string} filters.tipo - 'productos', 'vacunas' o 'todos' (por defecto)
 */
export const getPlanesVacunales = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.lista_precio) params.append('lista_precio', filters.lista_precio);
  if (filters.tipo) params.append('tipo', filters.tipo);
  
  const url = `${API_BASE_URL}/planes-vacunales/planes${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

/**
 * Obtener plan vacunal por ID con soporte para vacunas
 * @param {number} id - ID del plan
 * @param {string} tipo - 'productos', 'vacunas' o 'todos'
 */
export const getPlanVacunalById = async (id, tipo = 'todos') => {
  const params = new URLSearchParams();
  if (tipo) params.append('tipo', tipo);
  
  const url = `${API_BASE_URL}/planes-vacunales/planes/${id}${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

// ===== GESTIÓN DE VACUNAS EN PLANES =====

/**
 * Obtener vacunas disponibles para agregar a planes
 */
export const getVacunasDisponibles = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.id_patologia) params.append('id_patologia', filters.id_patologia);
  if (filters.id_proveedor) params.append('id_proveedor', filters.id_proveedor);
  if (filters.activa !== undefined) params.append('activa', filters.activa);
  
  const url = `${API_BASE_URL}/planes-vacunales/vacunas/disponibles${params.toString() ? '?' + params.toString() : ''}`;
  return await fetchConSesion(url);
};

/**
 * Agregar vacuna a un plan
 */
export const agregarVacunaAPlan = async (idPlan, vacunaData) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/planes/${idPlan}/vacunas`, {
    method: 'POST',
    body: JSON.stringify(vacunaData)
  });
};

/**
 * Remover vacuna de un plan
 */
export const removerVacunaDePlan = async (idPlan, idPlanVacuna) => {
  return await fetchConSesion(`${API_BASE_URL}/planes-vacunales/planes/${idPlan}/vacunas/${idPlanVacuna}`, {
    method: 'DELETE'
  });
};

// ===== UTILIDADES PARA PLANES CON VACUNAS =====

/**
 * Verificar si un plan tiene vacunas
 */
export const planTieneVacunas = (plan) => {
  return plan.vacunas && plan.vacunas.length > 0;
};

/**
 * Obtener tipo de plan basado en su contenido
 */
export const getTipoPlan = (plan) => {
  const tieneVacunas = planTieneVacunas(plan);
  
  if (tieneVacunas) return 'vacunas';
  return 'vacio';
};

/**
 * Calcular total de elementos en un plan (solo vacunas)
 */
export const getTotalElementosPlan = (plan) => {
  const vacunas = plan.vacunas ? plan.vacunas.length : 0;
  return vacunas;
};

/**
 * Obtener resumen de duración de un plan
 */
export const getResumenDuracionPlan = (plan) => {
  const elementos = [
    ...(plan.vacunas || [])
  ];
  
  if (elementos.length === 0) {
    return {
      semana_minima: null,
      semana_maxima: null,
      duracion_efectiva: 0
    };
  }
  
  const semanas = elementos.map(elem => ({
    inicio: elem.semana_inicio,
    fin: elem.semana_fin || elem.semana_inicio
  }));
  
  const semana_minima = Math.min(...semanas.map(s => s.inicio));
  const semana_maxima = Math.max(...semanas.map(s => s.fin));
  
  return {
    semana_minima,
    semana_maxima,
    duracion_efectiva: semana_maxima - semana_minima + 1
  };
};

/**
 * Validar datos de vacuna antes de agregar al plan
 */
export const validarVacunaParaPlan = (vacunaData, plan) => {
  const errores = [];
  
  if (!vacunaData.id_vacuna) {
    errores.push('Debe seleccionar una vacuna');
  }
  
  if (!vacunaData.cantidad_total || vacunaData.cantidad_total <= 0) {
    errores.push('La cantidad total debe ser mayor a 0');
  }
  
  if (!vacunaData.semana_inicio || vacunaData.semana_inicio < 1) {
    errores.push('La semana de inicio debe ser mayor a 0');
  }
  
  if (vacunaData.semana_inicio > plan.duracion_semanas) {
    errores.push(`La semana de inicio no puede ser mayor a ${plan.duracion_semanas}`);
  }
  
  if (vacunaData.semana_fin && vacunaData.semana_fin > plan.duracion_semanas) {
    errores.push(`La semana de fin no puede ser mayor a ${plan.duracion_semanas}`);
  }
  
  if (vacunaData.semana_fin && vacunaData.semana_fin < vacunaData.semana_inicio) {
    errores.push('La semana de fin no puede ser menor a la semana de inicio');
  }
  
  if (vacunaData.dosis_por_semana && vacunaData.dosis_por_semana <= 0) {
    errores.push('Las dosis por semana deben ser mayor a 0');
  }
  
  return errores;
};

// ===== EXPORTAR TODAS LAS FUNCIONES =====

export const planesVacunalesVacunasApi = {
  // Planes
  getPlanesVacunales,
  getPlanVacunalById,
  
  // Vacunas
  getVacunasDisponibles,
  agregarVacunaAPlan,
  removerVacunaDePlan,
  
  // Utilidades
  planTieneVacunas,
  getTipoPlan,
  getTotalElementosPlan,
  getResumenDuracionPlan,
  validarVacunaParaPlan
};

export default planesVacunalesVacunasApi;