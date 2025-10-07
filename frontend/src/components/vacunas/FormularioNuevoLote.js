import React, { useState } from 'react';

function FormularioNuevoLote({ 
  vacunas, 
  show, 
  onClose, 
  onSubmit 
}) {
  const [formData, setFormData] = useState({
    id_vacuna: '',
    lote: '',
    fecha_vencimiento: '',
    stock_inicial: '',
    stock_minimo: '',
    precio_compra: '',
    ubicacion_fisica: '',
    temperatura_req: '2-8°C',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);

  // Generar código de lote automático
  const generarCodigoLote = () => {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    
    let codigo = '';
    // 2 letras
    for (let i = 0; i < 2; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    // 4 números
    for (let i = 0; i < 4; i++) {
      codigo += numeros.charAt(Math.floor(Math.random() * numeros.length));
    }
    
    setFormData({...formData, lote: codigo});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.id_vacuna || !formData.lote || !formData.fecha_vencimiento || !formData.stock_inicial) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    if (parseInt(formData.stock_inicial) <= 0) {
      alert('El stock inicial debe ser mayor a 0');
      return;
    }

    if (new Date(formData.fecha_vencimiento) <= new Date()) {
      alert('La fecha de vencimiento debe ser posterior a hoy');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        id_vacuna: parseInt(formData.id_vacuna),
        lote: formData.lote,
        fecha_vencimiento: formData.fecha_vencimiento,
        stock_actual: parseInt(formData.stock_inicial),
        stock_minimo: parseInt(formData.stock_minimo) || 0,
        stock_reservado: 0,
        precio_compra: formData.precio_compra ? parseFloat(formData.precio_compra) : null,
        ubicacion_fisica: formData.ubicacion_fisica || null,
        temperatura_req: formData.temperatura_req,
        estado_stock: 'disponible',
        observaciones: formData.observaciones || null
      });
      
      // Limpiar formulario
      setFormData({
        id_vacuna: '',
        lote: '',
        fecha_vencimiento: '',
        stock_inicial: '',
        stock_minimo: '',
        precio_compra: '',
        ubicacion_fisica: '',
        temperatura_req: '2-8°C',
        observaciones: ''
      });
      
      onClose();
    } catch (error) {
      alert('Error al crear el lote: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h4 className="modal-title">
              <i className="fas fa-plus-square mr-2"></i>
              Crear Nuevo Lote de Stock
            </h4>
            <button type="button" className="close text-white" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  {/* Información básica */}
                  <h6 className="text-primary mb-3">Información Básica</h6>
                  
                  <div className="form-group">
                    <label>Vacuna *</label>
                    <select
                      className="form-control"
                      value={formData.id_vacuna}
                      onChange={(e) => setFormData({...formData, id_vacuna: e.target.value})}
                      required
                    >
                      <option value="">Seleccione una vacuna</option>
                      {vacunas.map(vacuna => (
                        <option key={vacuna.id_vacuna} value={vacuna.id_vacuna}>
                          {vacuna.codigo} - {vacuna.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Código de Lote *</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={formData.lote}
                        onChange={(e) => setFormData({...formData, lote: e.target.value.toUpperCase()})}
                        placeholder="Ej: AB1234"
                        required
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={generarCodigoLote}
                          title="Generar código automático"
                        >
                          <i className="fas fa-random"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Fecha de Vencimiento *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Inicial *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stock_inicial}
                      onChange={(e) => setFormData({...formData, stock_inicial: e.target.value})}
                      min="1"
                      placeholder="Cantidad de dosis"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Mínimo</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                      min="0"
                      placeholder="Alerta cuando el stock baje de este nivel"
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  {/* Información comercial y almacenamiento */}
                  <h6 className="text-primary mb-3">Comercial y Almacenamiento</h6>
                  
                  <div className="form-group">
                    <label>Precio de Compra</label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text">$</span>
                      </div>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.precio_compra}
                        onChange={(e) => setFormData({...formData, precio_compra: e.target.value})}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                    <small className="form-text text-muted">
                      Precio por dosis para control de costos
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Ubicación Física</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.ubicacion_fisica}
                      onChange={(e) => setFormData({...formData, ubicacion_fisica: e.target.value})}
                      placeholder="Ej: EST-1-NIV-2, Heladera A, etc."
                    />
                  </div>

                  <div className="form-group">
                    <label>Temperatura Requerida</label>
                    <select
                      className="form-control"
                      value={formData.temperatura_req}
                      onChange={(e) => setFormData({...formData, temperatura_req: e.target.value})}
                    >
                      <option value="2-8°C">2-8°C (Refrigerado)</option>
                      <option value="-20°C">-20°C (Congelado)</option>
                      <option value="15-25°C">15-25°C (Ambiente)</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Observaciones</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                      placeholder="Observaciones adicionales sobre el lote..."
                    />
                  </div>
                </div>
              </div>

              {/* Resumen */}
              {formData.id_vacuna && formData.stock_inicial && (
                <div className="alert alert-info border-info">
                  <h5 className="alert-heading">
                    <i className="fas fa-clipboard-check mr-2"></i>
                    Resumen del Lote
                  </h5>
                  <hr />
                  <div className="row">
                    <div className="col-md-6">
                      <ul className="list-unstyled mb-0">
                        <li><strong>Vacuna:</strong> {vacunas.find(v => v.id_vacuna === parseInt(formData.id_vacuna))?.nombre}</li>
                        <li><strong>Lote:</strong> {formData.lote}</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul className="list-unstyled mb-0">
                        <li><strong>Stock inicial:</strong> {formData.stock_inicial} dosis</li>
                        <li><strong>Vencimiento:</strong> {formData.fecha_vencimiento ? new Date(formData.fecha_vencimiento).toLocaleDateString() : 'No especificado'}</li>
                      </ul>
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
                className="btn btn-primary btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                    Creando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Crear Lote
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

export default FormularioNuevoLote;