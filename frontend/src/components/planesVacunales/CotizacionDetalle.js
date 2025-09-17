import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { 
  FaFileInvoice, 
  FaEdit, 
  FaCalendarAlt, 
  FaUser, 
  FaClock, 
  FaMoneyBillWave,
  FaFileExport,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaEye,
  FaArrowLeft,
  FaInfoCircle,
  FaCalculator,
  FaBalanceScale
} from 'react-icons/fa';
import ClasificacionFiscal from '../liquidaciones/ClasificacionFiscal';
import ResumenLiquidacion from '../liquidaciones/ResumenLiquidacion';
import './PlanesVacunales.css';

const CotizacionDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    cotizaciones, 
    cargarCotizaciones, 
    cambiarEstadoCotizacion,
    eliminarCotizacion,
    loading 
  } = usePlanesVacunales();

  const [cotizacion, setCotizacion] = useState(null);
  const [modalConfirmacion, setModalConfirmacion] = useState({ show: false, accion: null });
  const [modalStockInsuficiente, setModalStockInsuficiente] = useState({ 
    show: false, 
    productos: [], 
    estadoDestino: null,
    observaciones: null
  });
  const [observacionesEstado, setObservacionesEstado] = useState('');
  const [mostrarClasificacion, setMostrarClasificacion] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      await cargarCotizaciones();
      const cotizacionEncontrada = cotizaciones.find(c => c.id_cotizacion == id);
      if (cotizacionEncontrada) {
        setCotizacion(cotizacionEncontrada);
      } else {
        // Si no se encuentra en el estado, recargar
        await cargarCotizaciones();
        const cotizacionRecargada = cotizaciones.find(c => c.id_cotizacion == id);
        setCotizacion(cotizacionRecargada);
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
    }
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      'en_proceso': { class: 'bg-warning text-dark', text: 'En Proceso' },
      'enviada': { class: 'bg-info', text: 'Enviada' },
      'aceptada': { class: 'bg-success', text: 'Aceptada' },
      'rechazada': { class: 'bg-danger', text: 'Rechazada' }
    };
    
    const estadoInfo = estados[estado] || { class: 'bg-secondary', text: estado };
    return (
      <span className={`badge ${estadoInfo.class}`}>
        {estadoInfo.text}
      </span>
    );
  };

  const handleCambiarEstado = async (nuevoEstado, forzarAceptacion = false) => {
    try {
      const datos = { 
        estado: nuevoEstado,
        observaciones: observacionesEstado || null
      };
      
      // Si se está forzando la aceptación, agregar el parámetro
      if (forzarAceptacion) {
        datos.forzar_aceptacion = true;
      }
      
      await cambiarEstadoCotizacion(id, datos);
      setCotizacion(prev => ({ ...prev, estado: nuevoEstado }));
      setModalConfirmacion({ show: false, accion: null });
      setModalStockInsuficiente({ show: false, productos: [], estadoDestino: null, observaciones: null });
      setObservacionesEstado('');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      
      // Verificar si es un error de stock insuficiente
      if (error.response?.data?.error === 'STOCK_INSUFICIENTE') {
        const errorData = error.response.data;
        setModalStockInsuficiente({
          show: true,
          productos: errorData.productos_insuficientes,
          estadoDestino: nuevoEstado,
          observaciones: observacionesEstado
        });
        // Cerrar el modal de confirmación actual
        setModalConfirmacion({ show: false, accion: null });
      } else {
        // Mostrar error general si no es problema de stock
        alert('Error al cambiar estado: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEliminar = async () => {
    try {
      await eliminarCotizacion(id);
      navigate('/cotizaciones');
    } catch (error) {
      console.error('Error eliminando cotización:', error);
    }
  };

  const calcularFechaFinalizacion = (fechaInicio, duracionSemanas) => {
    if (!fechaInicio || !duracionSemanas) return null;
    const inicio = new Date(fechaInicio);
    const fin = new Date(inicio.getTime() + (duracionSemanas * 7 * 24 * 60 * 60 * 1000));
    return fin;
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaCorta = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  if (loading || !cotizacion) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner"></div>
        <p>Cargando cotización...</p>
      </div>
    );
  }

  const fechaFinalizacion = calcularFechaFinalizacion(
    cotizacion.fecha_inicio_plan, 
    cotizacion.plan?.duracion_semanas
  );

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm me-3"
                onClick={() => navigate('/cotizaciones')}
              >
                <FaArrowLeft />
              </button>
              <FaFileInvoice className="me-2 text-primary" />
              <div>
                <h3 className="mb-0">Cotización #{cotizacion.id_cotizacion}</h3>
                <small className="text-muted">
                  Creada el {formatearFecha(cotizacion.fecha_creacion)}
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {getEstadoBadge(cotizacion.estado)}
              {cotizacion.estado === 'en_proceso' && (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                >
                  <FaEdit className="me-1" />
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Información Principal */}
        <div className="col-lg-8">
          {/* Datos del Cliente */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <FaUser className="me-2" />
                Información del Cliente
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="text-primary">{cotizacion.cliente?.nombre}</h6>
                  {cotizacion.cliente?.email && (
                    <div className="mb-2">
                      <strong>Email:</strong> {cotizacion.cliente.email}
                    </div>
                  )}
                  {cotizacion.cliente?.telefono && (
                    <div className="mb-2">
                      <strong>Teléfono:</strong> {cotizacion.cliente.telefono}
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  {cotizacion.cliente?.direccion && (
                    <div className="mb-2">
                      <strong>Dirección:</strong> {cotizacion.cliente.direccion}
                    </div>
                  )}
                  {cotizacion.cliente?.fecha_registro && (
                    <div className="mb-2">
                      <strong>Cliente desde:</strong> {formatearFechaCorta(cotizacion.cliente.fecha_registro)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detalles del Plan */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Plan Vacunal
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-12">
                  <h6 className="text-primary">{cotizacion.plan?.nombre}</h6>
                  {cotizacion.plan?.descripcion && (
                    <p className="text-muted mb-3">{cotizacion.plan.descripcion}</p>
                  )}
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="text-muted small">Duración</div>
                    <div className="fw-bold">{cotizacion.plan?.duracion_semanas} semanas</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="text-muted small">Fecha de Inicio</div>
                    <div className="fw-bold">{formatearFechaCorta(cotizacion.fecha_inicio_plan)}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="text-muted small">Fecha de Finalización</div>
                    <div className="fw-bold">
                      {fechaFinalizacion ? formatearFechaCorta(fechaFinalizacion) : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="text-muted small">Productos</div>
                    <div className="fw-bold">{cotizacion.plan?.productos_plan?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Productos del Plan */}
              {cotizacion.plan?.productos_plan && cotizacion.plan.productos_plan.length > 0 && (
                <div>
                  <h6>Productos incluidos:</h6>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Vacuna</th>
                          <th>Dosis/Semana</th>
                          <th>Período</th>
                          <th>Total Dosis</th>
                          <th>Precio Unitario</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cotizacion.plan.productos_plan.map((pp, index) => {
                          const totalDosis = pp.semana_fin ? 
                            pp.dosis_por_semana * (pp.semana_fin - pp.semana_inicio + 1) :
                            pp.dosis_por_semana * (cotizacion.plan.duracion_semanas - pp.semana_inicio + 1);
                          
                          const precioUnitario = pp.producto?.precio_actual || 0;
                          const subtotal = totalDosis * precioUnitario;
                          
                          return (
                            <tr key={index}>
                              <td>
                                <div>
                                  <strong>{pp.producto?.nombre || 'Vacuna no encontrada'}</strong>
                                  {pp.producto?.descripcion && (
                                    <div>
                                      <small className="text-muted">{pp.producto.descripcion}</small>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>{pp.dosis_por_semana}</td>
                              <td>
                                Semana {pp.semana_inicio}
                                {pp.semana_fin ? ` - ${pp.semana_fin}` : ' - final'}
                              </td>
                              <td>
                                <span className="badge bg-primary">{totalDosis}</span>
                              </td>
                              <td>${precioUnitario.toLocaleString()}</td>
                              <td className="fw-bold">${subtotal.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observaciones */}
          {cotizacion.observaciones && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <FaInfoCircle className="me-2" />
                  Observaciones
                </h5>
              </div>
              <div className="card-body">
                <p className="mb-0">{cotizacion.observaciones}</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel Lateral */}
        <div className="col-lg-4">
          {/* Resumen Financiero */}
          <div className="card mb-4 sticky-top">
            <div className="card-header">
              <h5 className="mb-0">
                <FaMoneyBillWave className="me-2" />
                Resumen Financiero
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div className="text-muted">Precio Total</div>
                <div className="display-6 text-success fw-bold">
                  ${cotizacion.precio_total?.toLocaleString() || 'Calcular'}
                </div>
              </div>

              {cotizacion.lista_precio && (
                <div className="mb-3">
                  <small className="text-muted">Lista de precios aplicada</small>
                  <div className="fw-bold">{cotizacion.lista_precio.tipo}</div>
                </div>
              )}

              <div className="mb-3">
                <small className="text-muted">Válida hasta</small>
                <div className="fw-bold">
                  {cotizacion.fecha_validez ? 
                    formatearFechaCorta(cotizacion.fecha_validez) : 
                    '30 días desde creación'
                  }
                </div>
              </div>

              <hr />

              {/* Acciones según el estado */}
              <div className="d-grid gap-2">
                {cotizacion.estado === 'en_proceso' && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => setModalConfirmacion({ 
                        show: true, 
                        accion: 'enviar',
                        titulo: 'Enviar Cotización',
                        mensaje: '¿Confirma que desea enviar esta cotización al cliente?',
                        nuevoEstado: 'enviada'
                      })}
                    >
                      <FaFileExport className="me-2" />
                      Enviar al Cliente
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => setModalConfirmacion({ 
                        show: true, 
                        accion: 'eliminar',
                        titulo: 'Eliminar Cotización',
                        mensaje: '¿Está seguro que desea eliminar esta cotización? Esta acción no se puede deshacer.'
                      })}
                    >
                      <FaTimes className="me-2" />
                      Eliminar
                    </button>
                  </>
                )}

                {cotizacion.estado === 'enviada' && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => setModalConfirmacion({ 
                        show: true, 
                        accion: 'aceptar',
                        titulo: 'Aceptar Cotización',
                        mensaje: '¿Confirma que el cliente ha aceptado esta cotización?',
                        nuevoEstado: 'aceptada'
                      })}
                    >
                      <FaCheck className="me-2" />
                      Marcar como Aceptada
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => setModalConfirmacion({ 
                        show: true, 
                        accion: 'rechazar',
                        titulo: 'Rechazar Cotización',
                        mensaje: '¿Confirma que el cliente ha rechazado esta cotización?',
                        nuevoEstado: 'rechazada'
                      })}
                    >
                      <FaTimes className="me-2" />
                      Marcar como Rechazada
                    </button>
                  </>
                )}

                {(cotizacion.estado === 'aceptada' || cotizacion.estado === 'rechazada') && (
                  <>
                    <button
                      className="btn btn-outline-secondary mb-2"
                      onClick={() => navigate(`/planes-vacunales/${cotizacion.plan?.id_plan}`)}
                    >
                      <FaEye className="me-2" />
                      Ver Plan Detallado
                    </button>
                    
                    {cotizacion.estado === 'aceptada' && (
                      <>
                        <button
                          className="btn btn-warning mb-2"
                          onClick={() => setMostrarClasificacion(!mostrarClasificacion)}
                        >
                          <FaBalanceScale className="me-2" />
                          {mostrarClasificacion ? 'Ocultar' : 'Clasificar'} para Facturación
                        </button>
                        
                        <button
                          className="btn btn-info"
                          onClick={() => setMostrarResumen(!mostrarResumen)}
                        >
                          <FaCalculator className="me-2" />
                          {mostrarResumen ? 'Ocultar' : 'Ver'} Resumen de Liquidación
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Historial de Estados */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <FaClock className="me-2" />
                Historial
              </h5>
            </div>
            <div className="card-body">
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-marker bg-primary"></div>
                  <div className="timeline-content">
                    <div className="timeline-title">Cotización creada</div>
                    <div className="timeline-date">{formatearFecha(cotizacion.fecha_creacion)}</div>
                  </div>
                </div>
                
                {cotizacion.fecha_envio && (
                  <div className="timeline-item">
                    <div className="timeline-marker bg-info"></div>
                    <div className="timeline-content">
                      <div className="timeline-title">Enviada al cliente</div>
                      <div className="timeline-date">{formatearFecha(cotizacion.fecha_envio)}</div>
                    </div>
                  </div>
                )}

                {cotizacion.fecha_respuesta && (
                  <div className="timeline-item">
                    <div className={`timeline-marker ${cotizacion.estado === 'aceptada' ? 'bg-success' : 'bg-danger'}`}></div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        {cotizacion.estado === 'aceptada' ? 'Aceptada' : 'Rechazada'} por el cliente
                      </div>
                      <div className="timeline-date">{formatearFecha(cotizacion.fecha_respuesta)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Clasificación Fiscal */}
      {mostrarClasificacion && cotizacion.estado === 'aceptada' && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <FaBalanceScale className="me-2" />
                  Clasificación Fiscal
                </h5>
                <small className="d-block mt-1">
                  Seleccione qué productos van facturados en Vía 1 y cuáles en Vía 2
                </small>
              </div>
              <div className="card-body p-0">
                <ClasificacionFiscal 
                  cotizacionId={cotizacion.id_cotizacion}
                  onClasificacionCompleta={() => {
                    // Recargar datos si es necesario
                    cargarDatos();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Resumen de Liquidación */}
      {mostrarResumen && cotizacion.estado === 'aceptada' && (
        <div className="row mt-4">
          <div className="col-12">
            <ResumenLiquidacion 
              cotizacionId={cotizacion.id_cotizacion}
              mostrarDetalle={true}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {modalConfirmacion.show && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalConfirmacion.titulo}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalConfirmacion({ show: false, accion: null })}
                ></button>
              </div>
              <div className="modal-body">
                <p>{modalConfirmacion.mensaje}</p>
                
                {(modalConfirmacion.accion === 'aceptar' || modalConfirmacion.accion === 'rechazar') && (
                  <div className="mt-3">
                    <label className="form-label">Observaciones (opcional):</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={observacionesEstado}
                      onChange={(e) => setObservacionesEstado(e.target.value)}
                      placeholder="Agregar comentarios sobre la respuesta del cliente..."
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalConfirmacion({ show: false, accion: null })}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`btn ${modalConfirmacion.accion === 'eliminar' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => {
                    if (modalConfirmacion.accion === 'eliminar') {
                      handleEliminar();
                    } else {
                      handleCambiarEstado(modalConfirmacion.nuevoEstado);
                    }
                  }}
                >
                  {modalConfirmacion.accion === 'eliminar' ? 'Eliminar' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para productos con stock insuficiente */}
      {modalStockInsuficiente.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-backdrop fade show"></div>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Stock Insuficiente
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalStockInsuficiente({ show: false, productos: [], estadoDestino: null, observaciones: null })}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <strong>No hay stock suficiente para los siguientes productos:</strong>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Descripción</th>
                        <th>Stock Disponible</th>
                        <th>Cantidad Requerida</th>
                        <th>Déficit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalStockInsuficiente.productos.map((producto, index) => (
                        <tr key={index}>
                          <td><strong>{producto.nombre}</strong></td>
                          <td>{producto.descripcion}</td>
                          <td>
                            <span className="badge bg-danger">
                              {producto.stock_disponible}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {producto.cantidad_requerida}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-warning text-dark">
                              -{producto.deficit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info mt-3">
                  <h6><i className="bi bi-info-circle me-2"></i>¿Qué deseas hacer?</h6>
                  <ul className="mb-0">
                    <li><strong>Cancelar:</strong> No cambiar el estado de la cotización</li>
                    <li><strong>Aceptar de todas formas:</strong> Aceptar la cotización a pesar del stock insuficiente. Los productos quedarán en déficit en el sistema de stock</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalStockInsuficiente({ show: false, productos: [], estadoDestino: null, observaciones: null })}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => {
                    // Forzar la aceptación ignorando el stock
                    handleCambiarEstado(modalStockInsuficiente.estadoDestino, true);
                  }}
                >
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Aceptar de todas formas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionDetalle;
