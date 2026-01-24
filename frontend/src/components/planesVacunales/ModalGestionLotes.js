import React from 'react';
import { FaBoxOpen, FaSyringe, FaEdit, FaPlus, FaEye, FaCheckCircle, FaExclamationTriangle, FaTrashAlt, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import './ModalGestionLotes.css';

const ModalGestionLotes = ({ 
  item, 
  isOpen,
  onClose,
  realizandoReasignacion, 
  onReasignarAutomatico, 
  onAsignarManual, 
  onAsignarMultiples,
  onAsignarFaltante, 
  onVerStocks,
  onLiberarLote
}) => {
  if (!isOpen || !item) return null;

  const handleAction = (action) => {
    onClose();
    action();
  };
  
  // Calcular si hay un faltante
  const dosisEntregadas = item.dosis_entregadas || 0;
  const dosisFaltantes = item.cantidad_dosis - dosisEntregadas;
  const hayFaltante = dosisEntregadas > 0 && dosisFaltantes > 0;

  // Verificar si tiene lote asignado - usar los datos del item directamente
  const tieneLoteAsignado = item.lote_asignado || item.id_stock_vacuna;
  const coberturaCompleta = tieneLoteAsignado;

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  return (
    <div className="modal-gestion-lotes-overlay" onClick={onClose}>
      <div className="modal-gestion-lotes" onClick={(e) => e.stopPropagation()}>
        {/* Header profesional */}
        <div className="modal-gestion-header">
          <div className="modal-gestion-title">
            <FaBoxOpen />
            <span>Gestión de Lotes</span>
          </div>
          <button className="modal-gestion-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="modal-gestion-body">
          {/* Info de la vacuna */}
          <div className="modal-gestion-vacuna-info">
            <div className="vacuna-info-main">
              <h4 className="vacuna-nombre">{item.vacuna_nombre}</h4>
              <div className="vacuna-detalles">
                <span className="vacuna-detalle">
                  <FaCalendarAlt />
                  Semana {item.semana_aplicacion}
                </span>
                <span className="vacuna-detalle-separator">•</span>
                <span className="vacuna-detalle">
                  {new Date(item.fecha_aplicacion_programada).toLocaleDateString('es-ES')}
                </span>
                <span className="vacuna-detalle-separator">•</span>
                <span className="vacuna-detalle dosis-highlight">
                  {item.cantidad_dosis?.toLocaleString()} dosis
                </span>
              </div>
            </div>
            <div className="vacuna-estado">
              {coberturaCompleta ? (
                <span className="estado-badge estado-completo">
                  <FaCheckCircle />
                  Cobertura completa
                </span>
              ) : (
                <span className="estado-badge estado-pendiente">
                  Sin lote asignado
                </span>
              )}
            </div>
          </div>

          {/* Sección de lote asignado */}
          <div className="modal-gestion-seccion">
            <div className="seccion-titulo">
              <FaBoxOpen />
              Lote Asignado
            </div>
            
            {!tieneLoteAsignado ? (
              <div className="alerta-sin-lote">
                <FaExclamationTriangle />
                <span>No hay lote asignado a esta aplicación</span>
              </div>
            ) : (
              <div className="lote-asignado-card">
                <div className="lote-info-row">
                  <div className="lote-info-item">
                    <span className="lote-label">Número de Lote</span>
                    <span className="lote-valor lote-numero">{item.lote_asignado}</span>
                  </div>
                  <div className="lote-info-item">
                    <span className="lote-label">Dosis Asignadas</span>
                    <span className="lote-valor lote-dosis">{item.cantidad_dosis?.toLocaleString()}</span>
                  </div>
                  <div className="lote-info-item">
                    <span className="lote-label">Vencimiento</span>
                    <span className="lote-valor lote-fecha">{formatearFecha(item.fecha_vencimiento_lote)}</span>
                  </div>
                </div>
                <div className="lote-cobertura-bar">
                  <div className="cobertura-texto">
                    Cobertura: {item.cantidad_dosis?.toLocaleString()} / {item.cantidad_dosis?.toLocaleString()} dosis
                  </div>
                  <div className="cobertura-barra">
                    <div className="cobertura-progreso" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Alerta de faltante */}
          {hayFaltante && (
            <div className="alerta-faltante">
              <div className="alerta-faltante-icon">
                <FaExclamationTriangle />
              </div>
              <div className="alerta-faltante-contenido">
                <strong>Entrega parcial detectada</strong>
                <div className="alerta-faltante-detalles">
                  <span>Entregadas: {dosisEntregadas.toLocaleString()}</span>
                  <span className="separator">|</span>
                  <span className="faltantes-destaque">Faltantes: {dosisFaltantes.toLocaleString()} dosis</span>
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="modal-gestion-seccion">
            <div className="seccion-titulo">
              Acciones Disponibles
            </div>
            
            <div className="acciones-grid">
              {hayFaltante && (
                <button 
                  className="accion-btn accion-faltante"
                  onClick={() => handleAction(() => onAsignarFaltante(item))}
                  disabled={realizandoReasignacion}
                >
                  <FaPlus className="accion-icon" />
                  <span className="accion-texto">Asignar Faltante ({dosisFaltantes.toLocaleString()} dosis)</span>
                </button>
              )}
              
              <button 
                className="accion-btn accion-automatico"
                onClick={() => handleAction(() => onReasignarAutomatico(item))}
                disabled={realizandoReasignacion}
              >
                <FaSyringe className="accion-icon" />
                <span className="accion-texto">Automático</span>
                <span className="accion-desc">Asignar lote automáticamente</span>
              </button>
              
              <button 
                className="accion-btn accion-manual"
                onClick={() => handleAction(() => onAsignarManual(item))}
                disabled={realizandoReasignacion}
              >
                <FaEdit className="accion-icon" />
                <span className="accion-texto">Manual</span>
                <span className="accion-desc">Seleccionar lote específico</span>
              </button>
              
              <button 
                className="accion-btn accion-multiples"
                onClick={() => handleAction(() => onAsignarMultiples(item))}
                disabled={realizandoReasignacion}
              >
                <FaPlus className="accion-icon" />
                <span className="accion-texto">Múltiples</span>
                <span className="accion-desc">Combinar varios lotes</span>
              </button>
              
              <button 
                className="accion-btn accion-inventario"
                onClick={() => handleAction(() => onVerStocks(item))}
                disabled={realizandoReasignacion}
              >
                <FaEye className="accion-icon" />
                <span className="accion-texto">Inventario</span>
                <span className="accion-desc">Ver stock disponible</span>
              </button>

              {/* Botón Liberar Lote - solo si tiene lote asignado */}
              {tieneLoteAsignado && onLiberarLote && (
                <button 
                  className="accion-btn accion-liberar"
                  onClick={() => handleAction(() => onLiberarLote(item))}
                  disabled={realizandoReasignacion}
                >
                  <FaTrashAlt className="accion-icon" />
                  <span className="accion-texto">Liberar Lote Asignado</span>
                  <span className="accion-desc">Quitar asignación actual</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="modal-gestion-footer">
          <button className="btn-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalGestionLotes;