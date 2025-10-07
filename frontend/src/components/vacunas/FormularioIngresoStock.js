import React, { useState } from 'react';

function FormularioIngresoStock({ 
  lote, 
  show, 
  onClose, 
  onSubmit 
}) {
  const [formData, setFormData] = useState({
    cantidad: '',
    motivo: 'Compra nueva',
    observaciones: '',
    precio_unitario: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cantidad || parseInt(formData.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        cantidad: parseInt(formData.cantidad),
        motivo: formData.motivo,
        observaciones: formData.observaciones || null,
        precio_unitario: formData.precio_unitario ? parseFloat(formData.precio_unitario) : null
      });
      
      // Limpiar formulario
      setFormData({
        cantidad: '',
        motivo: 'Compra nueva',
        observaciones: '',
        precio_unitario: ''
      });
      
      onClose();
    } catch (error) {
      alert('Error al registrar ingreso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show || !lote) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h4 className="modal-title">
              <i className="fas fa-plus-circle mr-2"></i>
              Registrar Ingreso de Stock
            </h4>
            <button type="button" className="close text-white" onClick={onClose}>
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
                        <div className="text-muted small">Stock actual: <strong>{lote.stock_actual}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="form-group">
                <label>Cantidad a Ingresar *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                  min="1"
                  required
                  placeholder="Ingrese la cantidad"
                />
              </div>

              <div className="form-group">
                <label>Motivo del Ingreso *</label>
                <select
                  className="form-control"
                  value={formData.motivo}
                  onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                  required
                >
                  <option value="Compra nueva">Compra nueva</option>
                  <option value="Devolución cliente">Devolución de cliente</option>
                  <option value="Ajuste inventario">Ajuste de inventario</option>
                  <option value="Transferencia interna">Transferencia interna</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Precio Unitario (Opcional)</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text">$</span>
                  </div>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.precio_unitario}
                    onChange={(e) => setFormData({...formData, precio_unitario: e.target.value})}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <small className="form-text text-muted">
                  Precio por dosis para el cálculo de costo de inventario
                </small>
              </div>

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
                <div className="alert alert-info border-info">
                  <h6 className="alert-heading">
                    <i className="fas fa-calculator mr-2"></i>
                    Resumen del Ingreso
                  </h6>
                  <hr />
                  <div className="row">
                    <div className="col-6">
                      <strong>Stock actual:</strong> {lote.stock_actual}
                    </div>
                    <div className="col-6">
                      <strong>Nuevo stock:</strong> {lote.stock_actual + parseInt(formData.cantidad || 0)}
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
                className="btn btn-success btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                    Registrando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Registrar Ingreso
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

export default FormularioIngresoStock;