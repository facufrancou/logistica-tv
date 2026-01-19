import React, { useState, useEffect } from 'react';
import { getOrdenCompraById, getOrdenParaPDF } from '../../services/api';

const OrdenCompraDetalle = ({ ordenId, onClose, onRegistrarIngreso }) => {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    cargarOrden();
  }, [ordenId]);

  const cargarOrden = async () => {
    setLoading(true);
    try {
      const response = await getOrdenCompraById(ordenId);
      if (response.success) {
        setOrden(response.data);
      }
    } catch (error) {
      console.error('Error al cargar orden:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMoney = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  const getEstadoTexto = (estado) => {
    const estados = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      parcial: 'Ingreso Parcial',
      ingresada: 'Ingresada',
      cancelada: 'Cancelada'
    };
    return estados[estado] || estado;
  };

  const getEstadoItemTexto = (estado) => {
    const estados = {
      pendiente: 'Pendiente',
      parcial: 'Parcial',
      completo: 'Completo',
      cancelado: 'Cancelado'
    };
    return estados[estado] || estado;
  };

  const handleExportarPDF = async (idProveedor = null) => {
    try {
      const response = await getOrdenParaPDF(ordenId, idProveedor);
      if (response.success) {
        // Por ahora mostramos los datos, luego se puede integrar con generador PDF
        console.log('Datos para PDF:', response.data);
        alert('Funcionalidad de PDF en desarrollo. Ver consola para datos.');
      }
    } catch (error) {
      alert('Error al generar PDF: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '1000px' }}>
          <div className="loading-container">
            <div className="spinner"></div>
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

  const totalDosis = orden.detalle_orden.reduce((sum, d) => sum + d.cantidad_solicitada, 0);
  const totalRecibido = orden.detalle_orden.reduce((sum, d) => sum + d.cantidad_recibida, 0);
  const porcentajeRecibido = totalDosis > 0 ? Math.round((totalRecibido / totalDosis) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1100px' }}>
        <div className="modal-header">
          <h2>
            Orden de Compra: {orden.numero_orden}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Header con información principal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Card Estado */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#718096', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</p>
              <span className={`estado-badge ${orden.estado}`} style={{ fontSize: '0.9rem' }}>
                {getEstadoTexto(orden.estado)}
              </span>
            </div>

            {/* Card Fecha */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#718096', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Creación</p>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1a365d', fontWeight: '700' }}>
                {formatFecha(orden.fecha_creacion)}
              </h3>
            </div>

            {/* Card Progreso */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progreso</p>
                <span style={{ 
                  fontSize: '1.4rem', 
                  fontWeight: '700',
                  color: porcentajeRecibido === 100 ? '#059669' : 
                         porcentajeRecibido >= 50 ? '#d97706' : '#dc2626'
                }}>
                  {porcentajeRecibido}%
                </span>
              </div>
              <div style={{
                background: '#e2e8f0',
                borderRadius: '10px',
                height: '12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${porcentajeRecibido}%`,
                  height: '100%',
                  borderRadius: '10px',
                  background: porcentajeRecibido === 100 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 
                              porcentajeRecibido >= 50 ? 'linear-gradient(90deg, #fbbf24 0%, #d97706 100%)' : 
                              'linear-gradient(90deg, #f87171 0%, #dc2626 100%)',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#718096' }}>
                <span>Recibido: {totalRecibido.toLocaleString()}</span>
                <span>Total: {totalDosis.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Cotización asociada */}
          {orden.cotizacion && (
            <div style={{
              background: '#f0fff4',
              border: '1px solid #68d391',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#276749' }}>Cotización Asociada: </span>
                <a 
                  href={`/cotizaciones/${orden.cotizacion.id_cotizacion}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#2c5282', 
                    textDecoration: 'none',
                    fontWeight: '600',
                    borderBottom: '1px dashed #2c5282'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#1a365d'}
                  onMouseOut={(e) => e.target.style.color = '#2c5282'}
                >
                  {orden.cotizacion.numero_cotizacion}
                </a>
                {orden.cotizacion.cliente && (
                  <span style={{ color: '#718096' }}> - {orden.cotizacion.cliente.nombre}</span>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('general')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'general' ? '#2c5282' : 'transparent',
                  color: activeTab === 'general' ? 'white' : '#4a5568',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Items ({orden.detalle_orden.length})
              </button>
              <button
                onClick={() => setActiveTab('proveedores')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'proveedores' ? '#2c5282' : 'transparent',
                  color: activeTab === 'proveedores' ? 'white' : '#4a5568',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Por Proveedor ({orden.por_proveedor?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('ingresos')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'ingresos' ? '#2c5282' : 'transparent',
                  color: activeTab === 'ingresos' ? 'white' : '#4a5568',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Ingresos
              </button>
            </div>
          </div>

          {/* Tab: Items General */}
          {activeTab === 'general' && (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Vacuna</th>
                    <th>Proveedor</th>
                    <th style={{ textAlign: 'right' }}>Solicitado</th>
                    <th style={{ textAlign: 'right' }}>Recibido</th>
                    <th style={{ textAlign: 'right' }}>Pendiente</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orden.detalle_orden.map((detalle) => (
                    <tr key={detalle.id_detalle_orden}>
                      <td>
                        <strong>{detalle.vacuna?.nombre}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                          {detalle.vacuna?.codigo}
                        </div>
                      </td>
                      <td>{detalle.proveedor?.nombre}</td>
                      <td style={{ textAlign: 'right' }}>
                        {detalle.cantidad_solicitada.toLocaleString()} dosis
                      </td>
                      <td style={{ textAlign: 'right', color: detalle.cantidad_recibida > 0 ? '#38a169' : '#718096' }}>
                        {detalle.cantidad_recibida.toLocaleString()} dosis
                      </td>
                      <td style={{ textAlign: 'right', color: detalle.pendiente_recibir > 0 ? '#e53e3e' : '#38a169' }}>
                        {detalle.pendiente_recibir?.toLocaleString() || 0} dosis
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`estado-badge ${detalle.estado_item}`}>
                          {getEstadoItemTexto(detalle.estado_item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
                    <td colSpan="2">TOTALES</td>
                    <td style={{ textAlign: 'right' }}>{totalDosis.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{totalRecibido.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{(totalDosis - totalRecibido).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Tab: Por Proveedor */}
          {activeTab === 'proveedores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {orden.por_proveedor?.map((prov) => (
                <div key={prov.id_proveedor} className="proveedor-section">
                  <div className="proveedor-header">
                    <span>{prov.nombre}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span className="proveedor-subtotal">
                        {prov.total_dosis.toLocaleString()} dosis
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
                        onClick={() => handleExportarPDF(prov.id_proveedor)}
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                  <table className="items-table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Vacuna</th>
                        <th style={{ textAlign: 'right' }}>Solicitado</th>
                        <th style={{ textAlign: 'right' }}>Recibido</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prov.items.map((item) => (
                        <tr key={item.id_detalle_orden}>
                          <td>{item.vacuna?.nombre}</td>
                          <td style={{ textAlign: 'right' }}>{item.cantidad_solicitada.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{item.cantidad_recibida.toLocaleString()}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`estado-badge ${item.estado_item}`}>
                              {getEstadoItemTexto(item.estado_item)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Ingresos */}
          {activeTab === 'ingresos' && (
            <div>
              {orden.detalle_orden.some(d => d.ingresos?.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {orden.detalle_orden
                    .filter(d => d.ingresos?.length > 0)
                    .map((detalle) => (
                      <div key={detalle.id_detalle_orden} style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: '#f7fafc',
                          padding: '12px 16px',
                          borderBottom: '1px solid #e2e8f0',
                          fontWeight: 'bold'
                        }}>
                          {detalle.vacuna?.nombre}
                          <span style={{ fontWeight: 'normal', color: '#718096', marginLeft: '8px' }}>
                            ({detalle.ingresos.length} ingresos)
                          </span>
                        </div>
                        <table className="items-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Lote</th>
                              <th>Vencimiento</th>
                              <th style={{ textAlign: 'right' }}>Cantidad</th>
                              <th>Ubicación</th>
                              <th style={{ textAlign: 'right' }}>Precio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.ingresos.map((ingreso) => (
                              <tr key={ingreso.id_ingreso}>
                                <td>{formatFecha(ingreso.fecha_ingreso)}</td>
                                <td><strong>{ingreso.lote}</strong></td>
                                <td>{formatFecha(ingreso.fecha_vencimiento)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {ingreso.cantidad_ingresada.toLocaleString()} dosis
                                </td>
                                <td>{ingreso.ubicacion_fisica || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {formatMoney(ingreso.precio_compra)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <h3>Sin ingresos registrados</h3>
                  <p>Aún no se han registrado ingresos para esta orden</p>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          {orden.observaciones && (
            <div className="observaciones-section" style={{ marginTop: '20px' }}>
              <div className="observaciones-title">Observaciones</div>
              <p style={{ margin: 0 }}>{orden.observaciones}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => handleExportarPDF()}>
            Exportar PDF Completo
          </button>
          {['confirmada', 'parcial'].includes(orden.estado) && (
            <button className="btn btn-success" onClick={onRegistrarIngreso}>
              Registrar Ingreso
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdenCompraDetalle;
