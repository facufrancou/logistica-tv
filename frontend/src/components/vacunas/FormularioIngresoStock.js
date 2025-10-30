import React, { useState } from 'react';
import './FormularioIngresoStock.css';

function FormularioIngresoStock({ 
  lote, 
  show, 
  onClose, 
  onSubmit 
}) {
  const [formData, setFormData] = useState({
    cantidad_frascos: '',
    motivo: 'Compra nueva',
    observaciones: '',
    precio_unitario: ''
  });
  const [loading, setLoading] = useState(false);

  // Obtener dosis por frasco
  const dosisPorFrasco = lote?.dosis_por_frasco || lote?.vacuna?.presentacion?.dosis_por_frasco || 1;
  const dosisCalculadas = formData.cantidad_frascos ? parseInt(formData.cantidad_frascos) * dosisPorFrasco : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cantidad_frascos || parseInt(formData.cantidad_frascos) <= 0) {
      alert('La cantidad de frascos debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        cantidad_frascos: parseInt(formData.cantidad_frascos),
        motivo: formData.motivo,
        observaciones: formData.observaciones || null,
        precio_unitario: formData.precio_unitario ? parseFloat(formData.precio_unitario) : null
      });
      
      // Limpiar formulario
      setFormData({
        cantidad_frascos: '',
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
    <div className="modal show d-block ingreso-stock-modal" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered ingreso-stock-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">
              <i className="fas fa-plus-circle mr-2"></i>
              Registrar Ingreso de Stock
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
                        <div className="text-muted small">
                          Stock actual: <strong>{lote.frascos_actuales || Math.floor(lote.stock_actual / dosisPorFrasco)} frascos</strong>
                          <span className="text-muted"> ({lote.stock_actual} dosis)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="form-group">
                <label>Cantidad de Frascos a Ingresar *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.cantidad_frascos}
                  onChange={(e) => setFormData({...formData, cantidad_frascos: e.target.value})}
                  min="1"
                  required
                  placeholder="Ingrese la cantidad de frascos"
                />
                {formData.cantidad_frascos && (
                  <small className="form-text text-muted">
                    <i className="fas fa-info-circle mr-1"></i>
                    {formData.cantidad_frascos} frascos = <strong>{dosisCalculadas.toLocaleString()} dosis</strong>
                    <span className="text-muted"> ({dosisPorFrasco} dosis por frasco)</span>
                  </small>
                )}
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
                <label>Precio Unitario por Frasco (Opcional)</label>
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
                  Precio por frasco para el cálculo de costo de inventario
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
              {formData.cantidad_frascos && (
                <div className="alert alert-info border-info">
                  <h6 className="alert-heading">
                    <i className="fas fa-calculator mr-2"></i>
                    Resumen del Ingreso
                  </h6>
                  <hr />
                  <div className="row">
                    <div className="col-6">
                      <div><strong>Stock actual:</strong></div>
                      <div>{lote.frascos_actuales || Math.floor(lote.stock_actual / dosisPorFrasco)} frascos</div>
                      <small className="text-muted">({lote.stock_actual} dosis)</small>
                    </div>
                    <div className="col-6">
                      <div><strong>Nuevo stock:</strong></div>
                      <div>
                        {(lote.frascos_actuales || Math.floor(lote.stock_actual / dosisPorFrasco)) + parseInt(formData.cantidad_frascos || 0)} frascos
                      </div>
                      <small className="text-muted">
                        ({lote.stock_actual + dosisCalculadas} dosis)
                      </small>
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