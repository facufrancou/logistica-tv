import React, { useState } from 'react';
import './FormularioNuevoLote.css';
import './FormularioNuevoLote.css';

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
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Generar código de lote automático con formato mejorado
  const generarCodigoLote = () => {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    const fechaActual = new Date();
    const año = fechaActual.getFullYear().toString().slice(-2); // Últimos 2 dígitos del año
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0'); // Mes con 2 dígitos
    
    let codigo = '';
    
    // 2 letras aleatorias
    for (let i = 0; i < 2; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    
    // Año y mes (4 dígitos)
    codigo += año + mes;
    
    // 2 números aleatorios adicionales
    for (let i = 0; i < 2; i++) {
      codigo += numeros.charAt(Math.floor(Math.random() * numeros.length));
    }
    
    setFormData({...formData, lote: codigo});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    
    if (!formData.id_vacuna || !formData.lote || !formData.fecha_vencimiento || !formData.stock_inicial) {
      setErrors({ general: 'Por favor complete los campos obligatorios' });
      return;
    }

    if (parseInt(formData.stock_inicial) <= 0) {
      setErrors({ general: 'El stock inicial debe ser mayor a 0' });
      return;
    }

    if (new Date(formData.fecha_vencimiento) <= new Date()) {
      setErrors({ general: 'La fecha de vencimiento debe ser posterior a hoy' });
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
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setErrors({ general: 'Error al crear el lote: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered lote-modal-enhanced">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-plus-square mr-2"></i>
              Crear Nuevo Lote de Stock
            </h5>
            <button
              type="button"
              className="close"
              onClick={onClose}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.8'}
            >
              <span>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Mensaje de éxito */}
              {success && (
                <div className="alert alert-success" role="alert">
                  <div className="text-center">
                    <i className="fas fa-check-circle mr-2" style={{ fontSize: '1.2em' }}></i>
                    <strong>¡Lote creado exitosamente!</strong>
                    <br />
                    <small>El lote se ha guardado correctamente y está disponible en el stock.</small>
                  </div>
                </div>
              )}

              {/* Mensaje de error general */}
              {errors.general && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Error:</strong> {errors.general}
                </div>
              )}

              <div className="row">
                <div className="col-md-6">
                  {/* Información básica */}
                  <h6 className="mb-3" style={{color: 'var(--color-principal)'}}>
                    <i className="fas fa-info-circle mr-2"></i>
                    Información Básica
                  </h6>
                  
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
                        placeholder="Ej: AB242501"
                        required
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          style={{
                            backgroundColor: 'var(--color-principal)',
                            borderColor: 'var(--color-principal)',
                            color: 'white',
                            fontWeight: '600',
                            padding: '0.75rem 1rem',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onClick={generarCodigoLote}
                          title="Generar código automático con formato: 2 letras + año/mes + 2 números (Ej: AB242501)"
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#2d1810';
                            e.target.style.borderColor = '#2d1810';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'var(--color-principal)';
                            e.target.style.borderColor = 'var(--color-principal)';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          <i className="fas fa-dice mr-1"></i>
                          Generar
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
                  <h6 className="mb-3" style={{color: 'var(--color-principal)'}}>
                    <i className="fas fa-warehouse mr-2"></i>
                    Comercial y Almacenamiento
                  </h6>
                  
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


            </div>
          </form>

          <div className="modal-footer bg-light d-flex justify-content-end align-items-center">
            {success ? (
              // Botones cuando el lote fue creado exitosamente
              <button 
                type="button" 
                className="btn btn-success btn-lg px-4" 
                onClick={onClose}
                style={{ minWidth: '150px' }}
              >
                <i className="fas fa-check mr-2"></i>
                Finalizar
              </button>
            ) : (
              // Botones normales del formulario
              <div className="d-flex gap-3">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg px-4" 
                  onClick={onClose}
                  disabled={loading}
                  style={{ minWidth: '120px' }}
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancelar
                </button>
                <button 
                  type="button"
                  className="btn btn-primary btn-lg px-4"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ 
                    minWidth: '150px',
                    backgroundColor: 'var(--color-principal)',
                    borderColor: 'var(--color-principal)'
                  }}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormularioNuevoLote;