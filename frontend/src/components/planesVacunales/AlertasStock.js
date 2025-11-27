import React, { useState, useEffect } from 'react';
import * as planesVacunalesApi from '../../services/planesVacunalesApi';

const AlertasStock = ({ cotizacionId, onProblemasDetectados, mostrarContenido = true }) => {
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ultimaVerificacion, setUltimaVerificacion] = useState(null);

  const verificarEstadoLotes = async (silencioso = false) => {
    if (!cotizacionId) {
      console.log('❌ No hay cotizacionId');
      return;
    }

    if (!silencioso) setLoading(true);
    setError(null);

    try {
      console.log('🔍 Verificando estado de lotes para cotización:', cotizacionId);
      
      // Usar el servicio API centralizado que maneja correctamente el proxy
      const data = await planesVacunalesApi.verificarEstadoLotes(cotizacionId);
      
      console.log('✅ Data received:', data);
      
      if (data.success) {
        setAlertas(data.data);
        setUltimaVerificacion(new Date());
        
        if (onProblemasDetectados) {
          onProblemasDetectados(data.data.requiere_atencion);
        }
      } else {
        throw new Error(data.message || 'Respuesta inválida del servidor');
      }
    } catch (err) {
      console.error('❌ Error completo:', err);
      
      let errorMessage = 'Error al verificar estado de lotes';
      if (err.name === 'AbortError') {
        errorMessage = 'La verificación tardó demasiado tiempo (timeout 10s)';
        console.warn('⏱️ Timeout: La consulta de lotes demoró más de 10 segundos');
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      
      // Notificar que no hay problemas si hubo error (para no bloquear UI)
      if (onProblemasDetectados) {
        onProblemasDetectados(false);
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  // Verificación inicial
  useEffect(() => {
    if (cotizacionId) {
      console.log('🚀 Iniciando verificación inicial para cotización:', cotizacionId);
      verificarEstadoLotes();
    }
  }, [cotizacionId]);

  // Auto-refresh
  useEffect(() => {
    let interval;
    
    if (autoRefresh && cotizacionId) {
      interval = setInterval(() => {
        console.log('🔄 Auto-refresh ejecutándose...');
        verificarEstadoLotes(true);
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, cotizacionId]);

  const getTipoProblemaTexto = (tipo) => {
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
  };

  const getSeverityClass = (severidad) => {
    switch (severidad) {
      case 'error': return 'alert-danger';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-secondary';
    }
  };

  const getSeverityIcon = (severidad) => {
    switch (severidad) {
      case 'error': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-question-circle';
    }
  };

  if (loading && !alertas) {
    return (
      <div className="d-flex justify-content-center p-3">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="sr-only">Verificando estado...</span>
        </div>
        <span className="ml-2">Verificando estado de lotes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle mr-2"></i>
        Error al verificar estado de lotes: {error}
        <button
          className="btn btn-sm btn-outline-danger ml-2"
          onClick={() => verificarEstadoLotes()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!alertas) return null;

  const { resumen, problemas, alertas: alertasPreventivas } = alertas;

  // Si no debe mostrar contenido, solo retorna null pero las verificaciones ya se ejecutaron
  if (!mostrarContenido) return null;

  return (
    <div className="alertas-stock">
      {/* Header con resumen */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="fas fa-shield-alt mr-2"></i>
            Estado del Stock - Plan Vacunal
          </h6>
          <div className="d-flex align-items-center">
            <div className="form-check form-check-inline mr-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="autoRefresh">
                Auto-actualizar
              </label>
            </div>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => verificarEstadoLotes()}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm mr-1"></span>
              ) : (
                <i className="fas fa-sync mr-1"></i>
              )}
              Actualizar
            </button>
          </div>
        </div>
        
        <div className="card-body py-2">
          <div className="row text-center">
            <div className="col-md-3">
              <div className="text-muted small">Total calendarios</div>
              <div className="h5 mb-0">{resumen.total_calendarios}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small">Sin problemas</div>
              <div className="h5 mb-0 text-success">{resumen.calendarios_sin_problemas}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small">Con problemas</div>
              <div className="h5 mb-0 text-danger">{resumen.calendarios_con_problemas}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small">Alertas preventivas</div>
              <div className="h5 mb-0 text-warning">{resumen.alertas_preventivas}</div>
            </div>
          </div>
          
          {/* Barra de progreso del estado de salud */}
          <div className="row mt-3">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">Estado de Salud del Plan</small>
                <small className="text-muted">
                  {resumen.total_calendarios > 0 
                    ? Math.round((resumen.calendarios_sin_problemas / resumen.total_calendarios) * 100)
                    : 0}% saludable
                </small>
              </div>
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className={`progress-bar ${
                    resumen.total_calendarios > 0 ? 
                      Math.round((resumen.calendarios_sin_problemas / resumen.total_calendarios) * 100) >= 80 ? 'bg-success' : 
                      Math.round((resumen.calendarios_sin_problemas / resumen.total_calendarios) * 100) >= 60 ? 'bg-warning' : 'bg-danger'
                      : 'bg-secondary'
                  }`}
                  role="progressbar" 
                  style={{ 
                    width: `${resumen.total_calendarios > 0 
                      ? Math.round((resumen.calendarios_sin_problemas / resumen.total_calendarios) * 100)
                      : 0}%` 
                  }}
                ></div>
              </div>
              {ultimaVerificacion && (
                <small className="text-muted d-block mt-1">
                  Última verificación: {ultimaVerificacion.toLocaleTimeString()}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Problemas críticos */}
      {problemas.length > 0 && (
        <div className="card mb-3">
          <div className="card-header bg-danger text-white">
            <h6 className="mb-0">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Problemas Críticos que Requieren Atención ({problemas.length})
            </h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>Semana</th>
                    <th>Fecha</th>
                    <th>Vacuna</th>
                    <th>Cantidad</th>
                    <th>Problemas</th>
                  </tr>
                </thead>
                <tbody>
                  {problemas.map((problema, index) => (
                    <tr key={index} className="border-left border-danger">
                      <td>Semana {problema.semana}</td>
                      <td>{new Date(problema.fecha_programada).toLocaleDateString()}</td>
                      <td>{problema.producto}</td>
                      <td>{problema.cantidad_requerida}</td>
                      <td>
                        {problema.problemas.map((prob, idx) => (
                          <div key={idx} className={`text-${prob.severidad === 'error' ? 'danger' : 'warning'} small fw-bold mb-1`}>
                            <i className={getSeverityIcon(prob.severidad)}></i>
                            <span className="ms-1">{prob.mensaje}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Alertas preventivas */}
      {alertasPreventivas.length > 0 && (
        <div className="card mb-3">
          <div className="card-header bg-warning text-dark">
            <h6 className="mb-0">
              <i className="fas fa-exclamation-circle mr-2"></i>
              Alertas Preventivas ({alertasPreventivas.length})
            </h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>Semana</th>
                    <th>Fecha</th>
                    <th>Vacuna</th>
                    <th>Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasPreventivas.map((alerta, index) => (
                    <tr key={index} className="border-left border-warning">
                      <td>Semana {alerta.semana}</td>
                      <td>{new Date(alerta.fecha_programada).toLocaleDateString()}</td>
                      <td>{alerta.producto}</td>
                      <td>
                        <div className={`text-${alerta.severidad === 'warning' ? 'warning' : 'info'} fw-bold`}>
                          <i className={getSeverityIcon(alerta.severidad)}></i>
                          <span className="ml-1">{alerta.mensaje}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Estado todo OK */}
      {problemas.length === 0 && alertasPreventivas.length === 0 && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle mr-2"></i>
          <strong>¡Excelente!</strong> Todos los lotes están correctamente asignados y disponibles.
        </div>
      )}
    </div>
  );
};

export default AlertasStock;