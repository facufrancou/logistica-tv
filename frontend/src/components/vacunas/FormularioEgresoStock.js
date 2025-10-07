import React, { useState } from 'react';

function FormularioEgresoStock({ 
  lote, 
  show, 
  onClose, 
  onSubmit 
}) {
  const [formData, setFormData] = useState({
    cantidad: '',
    motivo: 'Venta directa',
    observaciones: '',
    cliente: ''
  });
  const [loading, setLoading] = useState(false);

  const stockDisponible = lote ? lote.stock_actual - lote.stock_reservado : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cantidad = parseInt(formData.cantidad);
    
    if (!cantidad || cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (cantidad > stockDisponible) {
      alert(`No hay suficiente stock disponible. Disponible: ${stockDisponible}`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        cantidad: cantidad,
        motivo: formData.motivo,
        observaciones: formData.observaciones || null
      });
      
      // Limpiar formulario
      setFormData({
        cantidad: '',
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
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h4 className="modal-title">
              <i className="fas fa-minus-circle mr-2"></i>
              Registrar Egreso de Stock
            </h4>
            <button type="button" className="close text-dark" onClick={onClose}>
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
                        <div>
                          <span className="badge badge-dark px-3 py-2 text-white font-weight-bold" style={{fontSize: '0.9em'}}>
                            {lote.lote}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-muted small">Stock total: <strong>{lote.stock_actual}</strong></div>
                          <div className="text-muted small">Reservado: <strong>{lote.stock_reservado}</strong></div>
                          <div className="text-success font-weight-bold">Disponible: {stockDisponible}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta si stock bajo */}
              {stockDisponible <= 0 && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  No hay stock disponible para este lote.
                </div>
              )}

              {/* Formulario */}
              <div className="form-group">
                <label>Cantidad a Retirar *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                  min="1"
                  max={stockDisponible}
                  required
                  placeholder="Ingrese la cantidad"
                  disabled={stockDisponible <= 0}
                />
                <small className="form-text text-muted">
                  Máximo disponible: {stockDisponible} dosis
                </small>
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
              {formData.cantidad && (
                <div className="alert alert-warning border-warning">
                  <h6 className="alert-heading">
                    <i className="fas fa-calculator mr-2"></i>
                    Resumen del Egreso
                  </h6>
                  <hr />
                  <div className="row">
                    <div className="col-6">
                      <div><strong>Stock disponible:</strong> {stockDisponible}</div>
                      <div><strong>Stock total:</strong> {lote.stock_actual}</div>
                    </div>
                    <div className="col-6">
                      <div><strong>Nuevo disponible:</strong> {stockDisponible - parseInt(formData.cantidad || 0)}</div>
                      <div><strong>Nuevo total:</strong> {lote.stock_actual - parseInt(formData.cantidad || 0)}</div>
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
                disabled={loading || stockDisponible <= 0}
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