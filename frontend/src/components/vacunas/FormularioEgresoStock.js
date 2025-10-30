import React, { useState } from 'react';
import './FormularioEgresoStock.css';

function FormularioEgresoStock({ 
  lote, 
  show, 
  onClose, 
  onSubmit 
}) {
  const [formData, setFormData] = useState({
    cantidad_frascos: '',
    motivo: 'Venta directa',
    observaciones: '',
    cliente: ''
  });
  const [loading, setLoading] = useState(false);

  // Obtener dosis por frasco y calcular disponibilidad
  const dosisPorFrasco = lote?.dosis_por_frasco || lote?.vacuna?.presentacion?.dosis_por_frasco || 1;
  
  // Stock total actual (no solo disponible)
  const frascosActuales = lote ? (lote.frascos_actuales || Math.floor(lote.stock_actual / dosisPorFrasco)) : 0;
  const dosisActuales = lote ? lote.stock_actual : 0;
  
  // Stock disponible (no reservado)
  const dosisDisponibles = lote ? lote.stock_actual - lote.stock_reservado : 0;
  const frascosDisponibles = Math.floor(dosisDisponibles / dosisPorFrasco);
  
  // Stock reservado
  const dosisReservadas = lote ? lote.stock_reservado : 0;
  const frascosReservados = Math.floor(dosisReservadas / dosisPorFrasco);
  
  const dosisCalculadas = formData.cantidad_frascos ? parseInt(formData.cantidad_frascos) * dosisPorFrasco : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cantidadFrascos = parseInt(formData.cantidad_frascos);
    
    if (!cantidadFrascos || cantidadFrascos <= 0) {
      alert('La cantidad de frascos debe ser mayor a 0');
      return;
    }

    // Validar contra stock TOTAL (actuales), no solo disponibles
    if (cantidadFrascos > frascosActuales) {
      alert(`No hay suficiente stock. Stock actual: ${frascosActuales} frascos (${dosisActuales} dosis)`);
      return;
    }
    
    // Advertir si se están usando frascos reservados
    if (cantidadFrascos > frascosDisponibles) {
      const frascosDeReserva = cantidadFrascos - frascosDisponibles;
      const confirmar = window.confirm(
        `ATENCIÓN: Está utilizando ${frascosDeReserva} frasco(s) RESERVADO(S).\n\n` +
        `Stock disponible: ${frascosDisponibles} frascos\n` +
        `Stock reservado: ${frascosReservados} frascos\n` +
        `Cantidad solicitada: ${cantidadFrascos} frascos\n\n` +
        `¿Desea continuar con el egreso?`
      );
      
      if (!confirmar) {
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({
        cantidad_frascos: cantidadFrascos,
        motivo: formData.motivo,
        observaciones: formData.observaciones || null
      });
      
      // Limpiar formulario
      setFormData({
        cantidad_frascos: '',
        motivo: 'Venta directa',
        observaciones: '',
        cliente: ''
      });
      
      onClose();
    } catch (error) {
      alert('Error al registrar egreso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show || !lote) return null;

  return (
    <div className="modal show d-block egreso-stock-modal" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered egreso-stock-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">
              <i className="fas fa-minus-circle mr-2"></i>
              Registrar Egreso de Stock
            </h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Información del lote */}
              <div className="card bg-light mb-4">
                <div className="card-body">
                  <h5 className="card-title text-primary mb-3">
                    <i className="fas fa-info-circle mr-2"></i>
                    Información del Lote
                  </h5>
                  <div className="row">
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="text-muted small font-weight-bold">VACUNA:</label>
                        <div className="text-dark font-weight-bold">{lote.vacuna?.codigo}</div>
                        <div className="text-muted">{lote.vacuna?.nombre}</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="text-muted small font-weight-bold">LOTE:</label>
                        <div className="text-dark font-weight-bold" style={{fontSize: '1.1em'}}>
                          {lote.lote}
                        </div>
                        <div className="mt-2">
                          <div className="text-dark small mb-1">
                            <i className="fas fa-box mr-1"></i>
                            Stock total: <strong>{frascosActuales} frascos</strong>
                            <span className="text-muted"> ({dosisActuales} dosis)</span>
                          </div>
                          <div className="text-warning small mb-1">
                            <i className="fas fa-lock mr-1"></i>
                            Reservado: <strong>{frascosReservados} frascos</strong>
                            <span className="text-muted"> ({dosisReservadas} dosis)</span>
                          </div>
                          <div className="text-success font-weight-bold">
                            <i className="fas fa-check-circle mr-1"></i>
                            Disponible: {frascosDisponibles} frascos ({dosisDisponibles} dosis)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta informativa */}
              {frascosReservados > 0 && (
                <div className="alert alert-warning">
                  <i className="fas fa-info-circle mr-2"></i>
                  <strong>Nota:</strong> Este lote tiene {frascosReservados} frasco(s) reservado(s). 
                  Puede hacer egreso de cualquier frasco, incluso los reservados (por rotura, pérdida, etc). 
                  El sistema le advertirá si está usando frascos reservados.
                </div>
              )}

              {frascosActuales <= 0 && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  No hay stock disponible en este lote.
                </div>
              )}

              {/* Formulario */}
              <div className="form-group">
                <label>Cantidad de Frascos a Retirar *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.cantidad_frascos}
                  onChange={(e) => setFormData({...formData, cantidad_frascos: e.target.value})}
                  min="1"
                  max={frascosActuales}
                  required
                  placeholder="Ingrese la cantidad de frascos"
                  disabled={frascosActuales <= 0}
                />
                <small className="form-text text-muted">
                  Stock total: {frascosActuales} frascos ({dosisActuales} dosis)
                  {frascosDisponibles < frascosActuales && (
                    <span className="text-warning d-block">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      {frascosReservados} frasco(s) reservado(s) - Se advertirá si los usa
                    </span>
                  )}
                </small>
                {formData.cantidad_frascos && (
                  <small className="form-text text-info">
                    <i className="fas fa-info-circle mr-1"></i>
                    {formData.cantidad_frascos} frascos = <strong>{dosisCalculadas.toLocaleString()} dosis</strong>
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Motivo del Egreso *</label>
                <select
                  className="form-control"
                  value={formData.motivo}
                  onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                  required
                >
                  <option value="Venta directa">Venta directa (sin plan vacunal)</option>
                  <option value="Cliente emergencia">Cliente emergencia</option>
                  <option value="Transferencia veterinario">Transferencia a veterinario</option>
                  <option value="Uso interno">Uso interno</option>
                  <option value="Muestra gratuita">Muestra gratuita</option>
                  <option value="Pérdida">Pérdida/Rotura</option>
                  <option value="Vencimiento">Descarte por vencimiento</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {(formData.motivo === 'Venta directa' || formData.motivo === 'Cliente emergencia') && (
                <div className="form-group">
                  <label>Cliente</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    placeholder="Nombre del cliente (opcional)"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                  placeholder="Observaciones adicionales (opcional)"
                />
              </div>

              {/* Resumen */}
              {formData.cantidad_frascos && (
                <div className="alert alert-warning border-warning">
                  <h6 className="alert-heading">
                    <i className="fas fa-calculator mr-2"></i>
                    Resumen del Egreso
                  </h6>
                  <hr />
                  <div className="row">
                    <div className="col-6">
                      <div><strong>Stock disponible:</strong> {frascosDisponibles} frascos</div>
                      <div className="text-muted small">({dosisDisponibles} dosis)</div>
                      <div className="mt-2"><strong>Stock total:</strong> {Math.floor(lote.stock_actual / dosisPorFrasco)} frascos</div>
                      <div className="text-muted small">({lote.stock_actual} dosis)</div>
                    </div>
                    <div className="col-6">
                      <div><strong>Nuevo disponible:</strong> {frascosDisponibles - parseInt(formData.cantidad_frascos || 0)} frascos</div>
                      <div className="text-muted small">({dosisDisponibles - dosisCalculadas} dosis)</div>
                      <div className="mt-2"><strong>Nuevo total:</strong> {Math.floor(lote.stock_actual / dosisPorFrasco) - parseInt(formData.cantidad_frascos || 0)} frascos</div>
                      <div className="text-muted small">({lote.stock_actual - dosisCalculadas} dosis)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer bg-light">
              <button 
                type="button" 
                className="btn btn-secondary btn-lg" 
                onClick={onClose}
                disabled={loading}
              >
                <i className="fas fa-times mr-2"></i>
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-warning btn-lg"
                disabled={loading || frascosActuales <= 0}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                    Registrando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-minus mr-2"></i>
                    Registrar Egreso
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FormularioEgresoStock;