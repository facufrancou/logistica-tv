import React from 'react';
import { FaBoxOpen, FaSyringe, FaEdit, FaPlus, FaEye, FaClock, FaCheckCircle, FaExclamationTriangle, FaTrashAlt } from 'react-icons/fa';

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
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '600px' }}>
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
            
            {/* Body */}
            <div className="modal-body p-3">
              {/* Info condensada */}
              <div className="d-flex justify-content-between align-items-start mb-3 p-2 bg-light rounded">
                <div>
                  <div className="fw-bold text-dark">{item.vacuna_nombre}</div>
                  <small className="text-muted">
                    Semana {item.semana_aplicacion} • {new Date(item.fecha_aplicacion_programada).toLocaleDateString('es-ES')} • {item.cantidad_dosis?.toLocaleString()} dosis
                  </small>
                </div>
                <div className="text-end">
                  {coberturaCompleta ? (
                    <span className="badge bg-success">
                      <FaCheckCircle className="me-1" />
                      Cobertura completa
                    </span>
                  ) : (
                    <span className="badge bg-secondary">Sin lote asignado</span>
                  )}
                </div>
              </div>

              {/* Lote asignado - usar datos del item */}
              <div className="mb-3">
                <h6 className="text-muted mb-2 small">
                  <FaBoxOpen className="me-1" />
                  Lote Asignado
                </h6>
                
                {!tieneLoteAsignado ? (
                  <div className="alert alert-warning py-2 small mb-0">
                    <FaExclamationTriangle className="me-1" />
                    No hay lote asignado a esta aplicación
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Lote</th>
                          <th className="text-end">Dosis</th>
                          <th className="text-end">Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <strong className="text-primary">{item.lote_asignado}</strong>
                          </td>
                          <td className="text-end">
                            <span className="badge bg-info">
                              {item.cantidad_dosis?.toLocaleString()}
                            </span>
                          </td>
                          <td className="text-end">
                            <small className="text-muted">
                              <FaClock className="me-1" />
                              {formatearFecha(item.fecha_vencimiento_lote)}
                            </small>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <th>Total</th>
                          <th className="text-end">
                            <span className="badge bg-success">
                              {item.cantidad_dosis?.toLocaleString()} / {item.cantidad_dosis?.toLocaleString()}
                            </span>
                          </th>
                          <th></th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Alerta de faltante */}
              {hayFaltante && (
                <div className="alert alert-warning mb-3 py-2 px-3 d-flex align-items-center">
                  <div className="me-auto">
                    <strong>Entrega parcial detectada:</strong>
                    <div className="small">
                      Entregadas: {dosisEntregadas.toLocaleString()} | Faltantes: {dosisFaltantes.toLocaleString()} dosis
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
                      Asignar Faltante ({dosisFaltantes.toLocaleString()} dosis)
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

                {/* Botón Liberar Lote - solo si tiene lote asignado */}
                {tieneLoteAsignado && onLiberarLote && (
                  <div className="col-12 mt-2">
                    <button 
                      className="btn btn-outline-danger w-100 py-2 text-center"
                      onClick={() => handleAction(() => onLiberarLote(item))}
                      disabled={realizandoReasignacion}
                    >
                      <FaTrashAlt className="me-2" style={{ fontSize: '1rem' }} />
                      <span className="fw-bold">Liberar Lote Asignado</span>
                    </button>
                  </div>
                )}
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