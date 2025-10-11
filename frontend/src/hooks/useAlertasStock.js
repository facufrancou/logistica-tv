import { useState, useEffect, useCallback } from 'react';
import * as planesVacunalesApi from '../services/planesVacunalesApi';

export const useAlertasStock = (cotizacionId, opciones = {}) => {
  const {
    autoRefresh = true,
    intervaloRefresh = 30000, // 30 segundos por defecto
    onProblemasDetectados = null
  } = opciones;

  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaVerificacion, setUltimaVerificacion] = useState(null);

  const verificarEstadoLotes = useCallback(async (silencioso = false) => {
    if (!cotizacionId) return;

    if (!silencioso) setLoading(true);
    setError(null);

    try {
      console.log('🔍 Verificando estado de lotes para cotización:', cotizacionId);
      const response = await planesVacunalesApi.verificarEstadoLotes(cotizacionId);
      
      console.log('📊 Respuesta del servidor:', response);
      
      if (response && response.data && response.data.success) {
        setAlertas(response.data.data);
        setUltimaVerificacion(new Date());
        
        if (onProblemasDetectados) {
          onProblemasDetectados(response.data.data.requiere_atencion);
        }
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err) {
      console.error('❌ Error al verificar estado de lotes:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al verificar estado de lotes';
      setError(errorMessage);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [cotizacionId, onProblemasDetectados]);

  // Verificación inicial
  useEffect(() => {
    if (cotizacionId) {
      verificarEstadoLotes();
    }
  }, [cotizacionId, verificarEstadoLotes]);

  // Auto-refresh
  useEffect(() => {
    let interval;
    
    if (autoRefresh && cotizacionId) {
      interval = setInterval(() => {
        verificarEstadoLotes(true); // refresh silencioso
      }, intervaloRefresh);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, cotizacionId, intervaloRefresh, verificarEstadoLotes]);

  // Funciones de utilidad
  const getTipoProblemaTexto = useCallback((tipo) => {
    const tipos = {
      sin_lote: 'Sin lote asignado',
      stock_inexistente: 'Stock inexistente',
      stock_no_disponible: 'Stock no disponible',
      cantidad_insuficiente: 'Cantidad insuficiente',
      lote_vencido: 'Lote vencido',
      vencimiento_proximo: 'Vencimiento próximo',
      solo_reservado: 'Solo disponible en reserva'
    };
    return tipos[tipo] || tipo;
  }, []);

  const getSeverityClass = useCallback((severidad) => {
    switch (severidad) {
      case 'error': return 'alert-danger';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-secondary';
    }
  }, []);

  const getSeverityIcon = useCallback((severidad) => {
    switch (severidad) {
      case 'error': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-question-circle';
    }
  }, []);

  const getEstadisticas = useCallback(() => {
    if (!alertas) return null;

    const { resumen, problemas, alertas: alertasPreventivas } = alertas;
    
    return {
      totalCalendarios: resumen.total_calendarios,
      sinProblemas: resumen.calendarios_sin_problemas,
      conProblemas: resumen.calendarios_con_problemas,
      alertasPreventivas: resumen.alertas_preventivas,
      requiereAtencion: alertas.requiere_atencion,
      porcentajeSaludable: resumen.total_calendarios > 0 
        ? Math.round((resumen.calendarios_sin_problemas / resumen.total_calendarios) * 100)
        : 0,
      problemasDetallados: problemas,
      alertasDetalladas: alertasPreventivas,
      tiposProblemas: resumen.tipos_problemas
    };
  }, [alertas]);

  const hayProblemasUrgentes = useCallback(() => {
    if (!alertas) return false;
    return alertas.problemas?.some(p => 
      p.problemas.some(prob => prob.severidad === 'error')
    ) || false;
  }, [alertas]);

  const hayAlertasPreventivas = useCallback(() => {
    if (!alertas) return false;
    return (alertas.alertas?.length || 0) > 0;
  }, [alertas]);

  return {
    // Estados
    alertas,
    loading,
    error,
    ultimaVerificacion,
    
    // Funciones
    verificarEstadoLotes,
    
    // Utilidades
    getTipoProblemaTexto,
    getSeverityClass,
    getSeverityIcon,
    getEstadisticas,
    
    // Indicadores
    hayProblemasUrgentes: hayProblemasUrgentes(),
    hayAlertasPreventivas: hayAlertasPreventivas(),
    requiereAtencion: alertas?.requiere_atencion || false
  };
};