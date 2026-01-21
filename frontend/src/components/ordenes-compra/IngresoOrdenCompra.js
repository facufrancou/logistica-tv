import React, { useState, useEffect } from 'react';
import { getOrdenCompraById, registrarIngresoOrden } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const IngresoOrdenCompra = ({ ordenId, onClose, onSuccess }) => {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ingresos, setIngresos] = useState([]);
  const [error, setError] = useState('');
  const { showSuccess: notifySuccess, showError: notifyError } = useNotification();

  // Ubicaciones predefinidas
  const ubicaciones = [
    'DEPOSITO_PRINCIPAL',
    'CAMARA_FRIO_1',
    'CAMARA_FRIO_2',
    'ALMACEN_GENERAL',
    'FRIGORIFICO_1'
  ];

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const ordenRes = await getOrdenCompraById(ordenId);

      if (ordenRes.success) {
        setOrden(ordenRes.data);
        // Inicializar ingresos vacíos para items pendientes
        const ingresosIniciales = ordenRes.data.detalle_orden
          .filter(d => d.estado_item !== 'completo' && d.estado_item !== 'cancelado')
          .map(d => ({
            id_detalle_orden: d.id_detalle_orden,
            vacuna: d.vacuna,
            proveedor: d.proveedor,
            pendiente_recibir: d.pendiente_recibir || (d.cantidad_solicitada - d.cantidad_recibida),
            lotes: [{ lote: '', fecha_vencimiento: '', cantidad: '', ubicacion_fisica: '', precio_compra: '', observaciones: '' }]
          }));
        setIngresos(ingresosIniciales);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los datos de la orden');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toISOString().split('T')[0];
  };

  const handleLoteChange = (ingresoIndex, loteIndex, field, value) => {
    setIngresos(prev => {
      const updated = [...prev];
      updated[ingresoIndex].lotes[loteIndex][field] = value;
      return updated;
    });
  };

  const agregarLote = (ingresoIndex) => {
    setIngresos(prev => {
      const updated = [...prev];
      updated[ingresoIndex].lotes.push({
        lote: '',
        fecha_vencimiento: '',
        cantidad: '',
        ubicacion_fisica: '',
        precio_compra: '',
        observaciones: ''
      });
      return updated;
    });
  };

  const eliminarLote = (ingresoIndex, loteIndex) => {
    setIngresos(prev => {
      const updated = [...prev];
      if (updated[ingresoIndex].lotes.length > 1) {
        updated[ingresoIndex].lotes.splice(loteIndex, 1);
      }
      return updated;
    });
  };

  const autoCompletarLote = (ingresoIndex, loteIndex) => {
    // Auto-completar con la cantidad pendiente
    setIngresos(prev => {
      const updated = [...prev];
      const pendiente = updated[ingresoIndex].pendiente_recibir;
      const yaIngresado = updated[ingresoIndex].lotes.reduce((sum, l, idx) => {
        if (idx !== loteIndex) {
          return sum + (parseInt(l.cantidad) || 0);
        }
        return sum;
      }, 0);
      updated[ingresoIndex].lotes[loteIndex].cantidad = Math.max(0, pendiente - yaIngresado);
      return updated;
    });
  };

  // Generar código de lote automático con formato mejorado
  const generarCodigoLote = (ingresoIndex, loteIndex) => {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    const fechaActual = new Date();
    const año = fechaActual.getFullYear().toString().slice(-2);
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
    
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
    
    handleLoteChange(ingresoIndex, loteIndex, 'lote', codigo);
  };

  const getTotalLotes = (lotes) => {
    return lotes.reduce((sum, l) => sum + (parseInt(l.cantidad) || 0), 0);
  };

  const validarIngreso = () => {
    // Verificar que al menos un item tenga datos completos
    let tieneIngresos = false;
    
    for (const ingreso of ingresos) {
      const totalLotes = getTotalLotes(ingreso.lotes);
      
      // Validar que no se exceda la cantidad pendiente
      if (totalLotes > ingreso.pendiente_recibir) {
        setError(`No puede ingresar ${totalLotes.toLocaleString()} dosis de "${ingreso.vacuna?.nombre}". Solo quedan ${ingreso.pendiente_recibir.toLocaleString()} dosis pendientes.`);
        return false;
      }
      
      for (const lote of ingreso.lotes) {
        if (lote.cantidad && parseInt(lote.cantidad) > 0) {
          if (!lote.lote || !lote.fecha_vencimiento) {
            setError(`Debe completar lote y fecha de vencimiento para todas las cantidades ingresadas`);
            return false;
          }
          tieneIngresos = true;
        }
      }
    }

    if (!tieneIngresos) {
      setError('Debe ingresar al menos un item con cantidad');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validarIngreso()) return;

    setSubmitting(true);
    try {
      // Preparar datos para el backend - agrupar por id_detalle_orden
      const ingresosData = [];

      for (const ingreso of ingresos) {
        const lotesValidos = ingreso.lotes
          .filter(lote => lote.cantidad && parseInt(lote.cantidad) > 0)
          .map(lote => ({
            cantidad: parseInt(lote.cantidad),
            lote: lote.lote,
            fecha_vencimiento: lote.fecha_vencimiento,
            ubicacion_fisica: lote.ubicacion_fisica || null,
            precio_compra: lote.precio_compra ? parseFloat(lote.precio_compra) : null,
            observaciones: lote.observaciones || null
          }));

        if (lotesValidos.length > 0) {
          ingresosData.push({
            id_detalle_orden: ingreso.id_detalle_orden,
            lotes: lotesValidos
          });
        }
      }

      const response = await registrarIngresoOrden(ordenId, { ingresos: ingresosData });
      
      if (response.success) {
        notifySuccess('Ingreso Registrado', 'El stock ha sido actualizado exitosamente.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        notifyError('Error', response.error || 'Error al registrar el ingreso');
      }
    } catch (error) {
      console.error('Error:', error);
      notifyError('Error', 'Error al procesar el ingreso: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '1000px' }}>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando datos de la orden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Error</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>No se pudo cargar la orden de compra</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1000px', width: '95%' }}>
        <div className="modal-header">
          <h2>Registrar Ingreso - {orden.numero_orden}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{
            background: '#f0fff4',
            border: '1px solid #68d391',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0 }}>
              <strong>Instrucciones:</strong> Complete los datos de los lotes que está ingresando.
              Puede agregar múltiples lotes por vacuna si la mercadería viene en diferentes lotes.
            </p>
          </div>

          {ingresos.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <h3>Todos los items están completos</h3>
              <p>No hay items pendientes de ingreso en esta orden</p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              {ingresos.map((ingreso, ingresoIndex) => (
                <div key={ingreso.id_detalle_orden} className="ingreso-item" style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#edf2f7',
                    padding: '12px 16px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>{ingreso.vacuna?.nombre}</strong>
                      <span style={{ color: '#718096', marginLeft: '12px' }}>
                        Proveedor: {ingreso.proveedor?.nombre}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{
                        background: '#fff5f5',
                        color: '#c53030',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        Pendiente: {ingreso.pendiente_recibir.toLocaleString()} dosis
                      </span>
                      <span style={{
                        background: getTotalLotes(ingreso.lotes) === ingreso.pendiente_recibir
                          ? '#c6f6d5'
                          : getTotalLotes(ingreso.lotes) > 0
                            ? '#fefcbf'
                            : '#f7fafc',
                        color: getTotalLotes(ingreso.lotes) === ingreso.pendiente_recibir
                          ? '#276749'
                          : getTotalLotes(ingreso.lotes) > 0
                            ? '#744210'
                            : '#718096',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        Ingresando: {getTotalLotes(ingreso.lotes).toLocaleString()} dosis
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '16px' }}>
                    {ingreso.lotes.map((lote, loteIndex) => (
                      <div key={loteIndex} style={{
                        marginBottom: '16px',
                        padding: '12px',
                        background: '#f7fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        {/* Primera fila: Lote, Vencimiento, Cantidad, Eliminar */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1.5fr 1fr 1fr auto',
                          gap: '12px',
                          marginBottom: '10px'
                        }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>
                              Lote *
                              <button
                                type="button"
                                className="btn-link"
                                style={{ marginLeft: '8px', fontSize: '0.75rem' }}
                                onClick={() => generarCodigoLote(ingresoIndex, loteIndex)}
                                title="Generar código de lote aleatorio"
                              >
                                (generar)
                              </button>
                            </label>
                            <input
                              type="text"
                              value={lote.lote}
                              onChange={(e) => handleLoteChange(ingresoIndex, loteIndex, 'lote', e.target.value)}
                              placeholder="Ej: ABC123"
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Vencimiento *</label>
                            <input
                              type="date"
                              value={lote.fecha_vencimiento}
                              onChange={(e) => handleLoteChange(ingresoIndex, loteIndex, 'fecha_vencimiento', e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>
                              Cantidad * 
                              <button
                                type="button"
                                className="btn-link"
                                style={{ marginLeft: '4px', fontSize: '0.75rem' }}
                                onClick={() => autoCompletarLote(ingresoIndex, loteIndex)}
                              >
                                (auto)
                              </button>
                            </label>
                            <input
                              type="number"
                              value={lote.cantidad}
                              onChange={(e) => handleLoteChange(ingresoIndex, loteIndex, 'cantidad', e.target.value)}
                              placeholder="Dosis"
                              min="0"
                              max={ingreso.pendiente_recibir}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            {ingreso.lotes.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => eliminarLote(ingresoIndex, loteIndex)}
                                style={{ padding: '8px 12px' }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Segunda fila: Ubicación, Precio, Observaciones */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 2fr',
                          gap: '12px'
                        }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Ubicación</label>
                            <input
                              type="text"
                              value={lote.ubicacion_fisica}
                              onChange={(e) => handleLoteChange(ingresoIndex, loteIndex, 'ubicacion_fisica', e.target.value)}
                              placeholder="Ej: Cámara 1, Estante A"
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Precio Unitario</label>
                            <input
                              type="number"
                              value={lote.precio_compra}
                              onChange={(e) => handleLoteChange(ingresoIndex, loteIndex, 'precio_compra', e.target.value)}
                              placeholder="$"
                              step="0.01"
                              min="0"
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Observaciones (Nro. Remito, etc.)</label>
                            <input
                              type="text"
                              value={lote.observaciones}
                              onChange={(e) => handleLoteChange(ingresoIndex, loteIndex, 'observaciones', e.target.value)}
                              placeholder="Ej: Remito N° 0001-00012345"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => agregarLote(ingresoIndex)}
                      style={{ marginTop: '8px' }}
                    >
                      + Agregar Lote
                    </button>
                  </div>

                  {/* Advertencia si excede */}
                  {getTotalLotes(ingreso.lotes) > ingreso.pendiente_recibir && (
                    <div style={{
                      background: '#fff5f5',
                      borderTop: '1px solid #fed7d7',
                      padding: '8px 16px',
                      color: '#c53030',
                      fontSize: '0.875rem'
                    }}>
                      La cantidad ingresada ({getTotalLotes(ingreso.lotes)}) excede lo pendiente ({ingreso.pendiente_recibir})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resumen */}
          {ingresos.length > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#ebf8ff',
              borderRadius: '8px',
              border: '1px solid #90cdf4'
            }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Resumen del Ingreso</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <span style={{ color: '#718096' }}>Items con ingreso:</span>
                  <strong style={{ marginLeft: '8px' }}>
                    {ingresos.filter(i => getTotalLotes(i.lotes) > 0).length} de {ingresos.length}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#718096' }}>Total dosis a ingresar:</span>
                  <strong style={{ marginLeft: '8px', color: '#2c5282' }}>
                    {ingresos.reduce((sum, i) => sum + getTotalLotes(i.lotes), 0).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#718096' }}>Total lotes:</span>
                  <strong style={{ marginLeft: '8px' }}>
                    {ingresos.reduce((sum, i) => sum + i.lotes.filter(l => l.cantidad && parseInt(l.cantidad) > 0).length, 0)}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={submitting || ingresos.length === 0}
          >
            {submitting ? (
              <>
                <span className="spinner-sm"></span> Procesando...
              </>
            ) : (
              'Confirmar Ingreso'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngresoOrdenCompra;
