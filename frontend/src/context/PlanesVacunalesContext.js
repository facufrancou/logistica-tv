import { createContext, useContext, useState, useEffect } from 'react';
import * as planesApi from '../services/planesVacunalesApi';
import { useNotification } from './NotificationContext';

const PlanesVacunalesContext = createContext();

export const usePlanesVacunales = () => {
  const context = useContext(PlanesVacunalesContext);
  if (!context) {
    throw new Error('usePlanesVacunales debe ser usado dentro de PlanesVacunalesProvider');
  }
  return context;
};

export const PlanesVacunalesProvider = ({ children }) => {
  const [planes, setPlanes] = useState([]);
  const [listasPrecios, setListasPrecios] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useNotification();

  // ==========================================
  // FUNCIONES DE PLANES VACUNALES
  // ==========================================

  const cargarPlanes = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await planesApi.getPlanes(filters);
      setPlanes(data);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudieron cargar los planes vacunales');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const obtenerPlan = async (id) => {
    try {
      setLoading(true);
      const data = await planesApi.getPlanById(id);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo cargar el plan vacunal');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const crearPlan = async (planData) => {
    try {
      setLoading(true);
      const nuevoPlan = await planesApi.crearPlan(planData);
      setPlanes(prev => [...prev, nuevoPlan]);
      showSuccess('Éxito', 'Plan vacunal creado correctamente');
      return nuevoPlan;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo crear el plan vacunal');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const actualizarPlan = async (id, planData) => {
    try {
      setLoading(true);
      const planActualizado = await planesApi.actualizarPlan(id, planData);
      setPlanes(prev => prev.map(plan => 
        plan.id_plan === id ? planActualizado : plan
      ));
      showSuccess('Éxito', 'Plan vacunal actualizado correctamente');
      return planActualizado;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo actualizar el plan vacunal');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const eliminarPlan = async (id) => {
    try {
      setLoading(true);
      await planesApi.eliminarPlan(id);
      setPlanes(prev => prev.filter(plan => plan.id_plan !== id));
      showSuccess('Éxito', 'Plan vacunal eliminado correctamente');
      return true;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo eliminar el plan vacunal');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const calcularPrecioPlan = async (id, idListaPrecio = null) => {
    try {
      const data = await planesApi.calcularPrecioPlan(id, idListaPrecio);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo calcular el precio del plan');
      return null;
    }
  };

  // ==========================================
  // FUNCIONES DE LISTAS DE PRECIOS
  // ==========================================

  const cargarListasPrecios = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await planesApi.getListasPrecios(filters);
      setListasPrecios(data);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudieron cargar las listas de precios');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const crearListaPrecio = async (listaData) => {
    try {
      setLoading(true);
      const nuevaLista = await planesApi.crearListaPrecio(listaData);
      setListasPrecios(prev => [...prev, nuevaLista]);
      showSuccess('Éxito', 'Lista de precios creada correctamente');
      return nuevaLista;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo crear la lista de precios');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const actualizarListaPrecio = async (id, listaData) => {
    try {
      setLoading(true);
      const listaActualizada = await planesApi.actualizarListaPrecio(id, listaData);
      setListasPrecios(prev => prev.map(lista => 
        lista.id_lista === id ? listaActualizada : lista
      ));
      showSuccess('Éxito', 'Lista de precios actualizada correctamente');
      return listaActualizada;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo actualizar la lista de precios');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FUNCIONES DE COTIZACIONES
  // ==========================================

  const cargarCotizaciones = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await planesApi.getCotizaciones(filters);
      setCotizaciones(data);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudieron cargar las cotizaciones');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const obtenerCotizacion = async (id) => {
    try {
      setLoading(true);
      const data = await planesApi.getCotizacionById(id);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo cargar la cotización');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const crearCotizacion = async (cotizacionData) => {
    try {
      setLoading(true);
      const nuevaCotizacion = await planesApi.crearCotizacion(cotizacionData);
      setCotizaciones(prev => [...prev, nuevaCotizacion]);
      showSuccess('Éxito', 'Cotización creada correctamente');
      return nuevaCotizacion;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo crear la cotización');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const actualizarCotizacion = async (id, cotizacionData) => {
    try {
      setLoading(true);
      const cotizacionActualizada = await planesApi.actualizarCotizacion(id, cotizacionData);
      setCotizaciones(prev => prev.map(cotizacion => 
        cotizacion.id_cotizacion === id ? cotizacionActualizada : cotizacion
      ));
      showSuccess('Éxito', 'Cotización actualizada correctamente');
      return cotizacionActualizada;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo actualizar la cotización');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstadoCotizacion = async (id, estadoData) => {
    try {
      setLoading(true);
      const cotizacionActualizada = await planesApi.cambiarEstadoCotizacion(id, estadoData);
      setCotizaciones(prev => prev.map(cotizacion => 
        cotizacion.id_cotizacion === id ? cotizacionActualizada : cotizacion
      ));
      showSuccess('Éxito', 'Estado de cotización actualizado correctamente');
      return cotizacionActualizada;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo actualizar el estado de la cotización');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const eliminarCotizacion = async (id) => {
    try {
      setLoading(true);
      await planesApi.eliminarCotizacion(id);
      setCotizaciones(prev => prev.filter(cotizacion => cotizacion.id_cotizacion !== id));
      showSuccess('Éxito', 'Cotización eliminada correctamente');
      return true;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo eliminar la cotización');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const obtenerCalendarioVacunacion = async (id) => {
    try {
      const data = await planesApi.getCalendarioVacunacion(id);
      return data;
    } catch (error) {
      setError(error.message);
      showError('Error', 'No se pudo cargar el calendario de vacunación');
      return [];
    }
  };

  // Limpiar error después de un tiempo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const value = {
    // Estado
    planes,
    listasPrecios,
    cotizaciones,
    loading,
    error,

    // Funciones de Planes
    cargarPlanes,
    obtenerPlan,
    crearPlan,
    actualizarPlan,
    eliminarPlan,
    calcularPrecioPlan,

    // Funciones de Listas de Precios
    cargarListasPrecios,
    crearListaPrecio,
    actualizarListaPrecio,

    // Funciones de Cotizaciones
    cargarCotizaciones,
    obtenerCotizacion,
    crearCotizacion,
    actualizarCotizacion,
    cambiarEstadoCotizacion,
    eliminarCotizacion,
    obtenerCalendarioVacunacion,

    // Funciones de utilidad
    setError,
    clearError: () => setError(null)
  };

  return (
    <PlanesVacunalesContext.Provider value={value}>
      {children}
    </PlanesVacunalesContext.Provider>
  );
};
