import React, { useState } from 'react';
import { FaBoxOpen, FaTimes, FaSyringe, FaEdit, FaPlus, FaEye } from 'react-icons/fa';

const ModalGestionLotes = ({ 
  item, 
  isOpen,
  onClose,
  realizandoReasignacion, 
  onReasignarAutomatico, 
  onAsignarManual, 
  onAsignarMultiples,
  onAsignarFaltante, 
  onVerStocks 
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

  return (
    <>
      {/* Overlay */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        style={{ zIndex: 1050 }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
          <div className="modal-content">
            {/* Header minimalista */}
            <div className="modal-header border-bottom py-2">
              <h6 className="modal-title d-flex align-items-center mb-0 text-dark">
                <FaBoxOpen className="me-2 text-muted" />
                Gestión de Lotes
              </h6>
              <button 
                type="button" 
                className="btn-close btn-sm" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Body ultra compacto */}
            <div className="modal-body p-3">
              {/* Info condensada */}
              <div className="d-flex justify-content-between align-items-start mb-3 p-2 bg-light rounded">
                <div>
                  <div className="fw-bold text-dark">{item.vacuna_nombre}</div>
                  <small className="text-muted">
                    Semana {item.semana_aplicacion} • {new Date(item.fecha_aplicacion_programada).toLocaleDateString('es-ES')} • {item.cantidad_dosis} dosis
                  </small>
                </div>
                <div className="text-end">
                  {item.lote_asignado ? (
                    <div>
                      <div className="badge bg-success">{item.lote_asignado}</div>
                      {item.fecha_vencimiento_lote && (
                        <div className="small text-muted mt-1">
                          Vence: {new Date(item.fecha_vencimiento_lote).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="badge bg-warning text-dark">Sin lote asignado</span>
                  )}
                </div>
              </div>

              {/* Alerta de faltante */}
              {hayFaltante && (
                <div className="alert alert-warning mb-3 py-2 px-3 d-flex align-items-center">
                  <div className="me-auto">
                    <strong>Entrega parcial detectada:</strong>
                    <div className="small">
                      Entregadas: {dosisEntregadas} | Faltantes: {dosisFaltantes} dosis
                    </div>
                  </div>
                </div>
              )}

              {/* Botones profesionales en grid */}
              <div className="row g-2">
                {hayFaltante && (
                  <div className="col-12">
                    <button 
                      className="btn btn-warning w-100 py-2 text-center fw-bold"
                      onClick={() => handleAction(() => onAsignarFaltante(item))}
                      disabled={realizandoReasignacion}
                      style={{ borderWidth: '2px' }}
                    >
                      <FaPlus className="me-2" style={{ fontSize: '1.2rem' }} />
                      Asignar Faltante ({dosisFaltantes} dosis)
                    </button>
                  </div>
                )}
                
                <div className="col-6">
                  <button 
                    className="btn btn-outline-primary w-100 py-2 text-center"
                    onClick={() => handleAction(() => onReasignarAutomatico(item))}
                    disabled={realizandoReasignacion}
                  >
                    <FaSyringe className="d-block mx-auto mb-1" style={{ fontSize: '1.2rem' }} />
                    <div className="small fw-bold">Automático</div>
                  </button>
                </div>
                
                <div className="col-6">
                  <button 
                    className="btn btn-outline-secondary w-100 py-2 text-center"
                    onClick={() => handleAction(() => onAsignarManual(item))}
                    disabled={realizandoReasignacion}
                  >
                    <FaEdit className="d-block mx-auto mb-1" style={{ fontSize: '1.2rem' }} />
                    <div className="small fw-bold">Manual</div>
                  </button>
                </div>
                
                <div className="col-6">
                  <button 
                    className="btn btn-outline-dark w-100 py-2 text-center"
                    onClick={() => handleAction(() => onAsignarMultiples(item))}
                    disabled={realizandoReasignacion}
                  >
                    <FaPlus className="d-block mx-auto mb-1" style={{ fontSize: '1.2rem' }} />
                    <div className="small fw-bold">Múltiples</div>
                  </button>
                </div>
                
                <div className="col-6">
                  <button 
                    className="btn btn-outline-info w-100 py-2 text-center"
                    onClick={() => handleAction(() => onVerStocks(item))}
                    disabled={realizandoReasignacion}
                  >
                    <FaEye className="d-block mx-auto mb-1" style={{ fontSize: '1.2rem' }} />
                    <div className="small fw-bold">Inventario</div>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Footer mínimo */}
            <div className="modal-footer border-top py-2 px-3">
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalGestionLotes;