import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { useNotification } from '../../context/NotificationContext';
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
  FaBalanceScale,
  FaPaw,
  FaClipboardList
} from 'react-icons/fa';
import ClasificacionFiscal from '../liquidaciones/ClasificacionFiscalSimple';
import ResumenLiquidacion from '../liquidaciones/ResumenLiquidacionSimple';
import './PlanesVacunales.css';

const CotizacionDetalleOptimizado = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    cotizaciones, 
    cargarCotizaciones, 
    cambiarEstadoCotizacion,
    eliminarCotizacion,
    loading 
  } = usePlanesVacunales();

  const { showError, showSuccess } = useNotification();

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
  
  // Refs para mantener la posición en la página
  const clasificacionRef = useRef(null);
  const resumenRef = useRef(null);

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
      
      if (forzarAceptacion) {
        datos.forzar_aceptacion = true;
      }
      
      await cambiarEstadoCotizacion(id, datos);
      
      // Mantener la posición si hay clasificación o resumen abierto
      const scrollPosition = window.pageYOffset;
      
      await cargarDatos();
      showSuccess(`Estado cambiado a ${nuevoEstado} exitosamente`);
      
      // Restaurar posición
      window.scrollTo(0, scrollPosition);
      
      setModalConfirmacion({ show: false, accion: null });
      setModalStockInsuficiente({ show: false, productos: [], estadoDestino: null, observaciones: null });
      setObservacionesEstado('');
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      
      if (error.response?.status === 400 && error.response?.data?.productosInsuficientes) {
        setModalStockInsuficiente({
          show: true,
          productos: error.response.data.productosInsuficientes,
          estadoDestino: nuevoEstado,
          observaciones: observacionesEstado
        });
      } else {
        showError(error.response?.data?.error || 'Error al cambiar estado de la cotización');
      }
    }
  };

  const confirmarAccion = async () => {
    const accion = modalConfirmacion.accion;
    
    if (accion === 'eliminar esta cotización') {
      try {
        await eliminarCotizacion(id);
        showSuccess('Cotización eliminada exitosamente');
        navigate('/cotizaciones');
      } catch (error) {
        showError('Error al eliminar la cotización');
      }
    } else if (accion?.includes('cambiar estado a')) {
      const nuevoEstado = accion.split('cambiar estado a ')[1];
      await handleCambiarEstado(nuevoEstado);
    }
  };

  const forzarAceptacion = async () => {
    await handleCambiarEstado(modalStockInsuficiente.estadoDestino, true);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No definida';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaCorta = (fecha) => {
    if (!fecha) return 'No definida';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const calcularFechaFinalizacion = (fechaInicio, duracionSemanas) => {
    if (!fechaInicio || !duracionSemanas) return null;
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + (duracionSemanas * 7));
    return fecha;
  };

  // Función para hacer scroll suave a la clasificación
  const scrollToClasificacion = () => {
    setMostrarClasificacion(true);
    setTimeout(() => {
      if (clasificacionRef.current) {
        clasificacionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
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
    <div className="container-fluid py-1">
      {/* Header Compacto */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm me-3"
                onClick={() => navigate('/cotizaciones')}
              >
                <FaArrowLeft />
              </button>
              <div>
                <h4 className="mb-1">Cotización #{cotizacion.id_cotizacion}</h4>
                <small className="text-muted">
                  {cotizacion.numero_cotizacion} • {formatearFechaCorta(cotizacion.created_at)}
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

      {/* Layout Principal Optimizado */}
      <div className="row g-3">
        {/* Columna Principal - Información y Acciones */}
        <div className="col-lg-8">
          
          {/* Card Compacta: Información Esencial */}
          <div className="card mb-3 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                {/* Cliente */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaUser className="text-primary me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Cliente</small>
                      <strong className="h6 mb-0">{cotizacion.cliente?.nombre}</strong>
                      {cotizacion.cliente?.cuit && (
                        <small className="text-muted d-block">CUIT: {cotizacion.cliente.cuit}</small>
                      )}
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaPaw className="text-success me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Plan Vacunal</small>
                      <strong className="h6 mb-0">{cotizacion.plan?.nombre}</strong>
                      <small className="text-muted d-block">
                        {cotizacion.cantidad_animales ? `${cotizacion.cantidad_animales} animales` : ''} • {cotizacion.plan?.duracion_semanas} semanas
                      </small>
                    </div>
                  </div>
                </div>

                {/* Fechas */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaCalendarAlt className="text-info me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Período del Plan</small>
                      <strong className="h6 mb-0">{formatearFechaCorta(cotizacion.fecha_inicio_plan)}</strong>
                      <small className="text-muted d-block">hasta {formatearFechaCorta(fechaFinalizacion)}</small>
                    </div>
                  </div>
                </div>

                {/* Precio */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaMoneyBillWave className="text-warning me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Precio Total</small>
                      <strong className="h5 mb-0 text-success">${cotizacion.precio_total?.toLocaleString()}</strong>
                      {cotizacion.lista_precio && (
                        <small className="text-muted d-block">Lista {cotizacion.lista_precio.tipo}</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones si existen */}
              {cotizacion.observaciones && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex align-items-start">
                    <FaInfoCircle className="text-muted me-2 mt-1" />
                    <div className="flex-grow-1">
                      <small className="text-muted d-block">Observaciones</small>
                      <p className="mb-0 small">{cotizacion.observaciones}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productos del Plan - Tabla Compacta */}
          {cotizacion.detalle_cotizacion && cotizacion.detalle_cotizacion.length > 0 && (
            <div className="card mb-3 shadow-sm">
              <div className="card-header py-2">
                <h6 className="mb-0">
                  <FaClipboardList className="me-2" />
                  Productos del Plan ({cotizacion.detalle_cotizacion.length})
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Semana</th>
                        <th className="text-end">Precio</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizacion.detalle_cotizacion.map((detalle, index) => {
                        const subtotal = parseFloat(detalle.subtotal) || 
                          (parseFloat(detalle.precio_final_calculado) * parseFloat(detalle.cantidad_total));
                        
                        return (
                          <tr key={index}>
                            <td>
                              <div>
                                <strong className="small">{detalle.producto?.nombre}</strong>
                                <small className="text-muted d-block">{detalle.producto?.descripcion}</small>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-primary bg-opacity-75 small">
                                {detalle.semana_inicio === detalle.semana_fin ? 
                                  `S${detalle.semana_inicio}` : 
                                  `S${detalle.semana_inicio}-${detalle.semana_fin}`}
                              </span>
                            </td>
                            <td className="text-end small">${parseFloat(detalle.precio_final_calculado).toLocaleString()}</td>
                            <td className="text-end fw-bold small">${subtotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Clasificación Fiscal */}
          {cotizacion.estado === 'aceptada' && mostrarClasificacion && (
            <div className="card shadow-sm" ref={clasificacionRef}>
              <div className="card-header py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <FaBalanceScale className="me-2" />
                    Clasificación Fiscal
                  </h6>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setMostrarClasificacion(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <ClasificacionFiscal 
                  cotizacionId={cotizacion.id_cotizacion} 
                  onClasificacionCompleta={() => {
                    setMostrarClasificacion(false);
                    cargarDatos();
                  }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Derecho - Acciones y Estado */}
        <div className="col-lg-4">
          
          {/* Card de Acciones Principales */}
          <div className="card mb-3 shadow-sm" style={{ position: 'sticky', top: '80px', zIndex: 999 }}>
            <div className="card-header py-2">
              <h6 className="mb-0">
                <FaCalculator className="me-2" />
                Acciones
              </h6>
            </div>
            <div className="card-body">
              
              {/* Estado y Precio Destacados */}
              <div className="text-center mb-3 p-2 bg-light rounded">
                <div className="mb-2">{getEstadoBadge(cotizacion.estado)}</div>
                <div className="h4 text-success mb-0">${cotizacion.precio_total?.toLocaleString()}</div>
                <small className="text-muted">
                  {cotizacion.lista_precio ? `Lista ${cotizacion.lista_precio.tipo}` : 'Sin lista aplicada'}
                </small>
              </div>
              
              {/* Acciones por Estado */}
              <div className="d-grid gap-2">
                {cotizacion.estado === 'en_proceso' && (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleCambiarEstado('enviada')}
                    >
                      <FaFileExport className="me-1" />
                      Enviar al Cliente
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                    >
                      <FaEdit className="me-1" />
                      Editar
                    </button>
                  </>
                )}

                {cotizacion.estado === 'enviada' && (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleCambiarEstado('aceptada')}
                    >
                      <FaCheck className="me-1" />
                      Marcar Aceptada
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCambiarEstado('rechazada')}
                    >
                      <FaTimes className="me-1" />
                      Marcar Rechazada
                    </button>
                    <hr className="my-2" />
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                    >
                      <FaEdit className="me-1" />
                      Editar
                    </button>
                  </>
                )}

                {cotizacion.estado === 'aceptada' && (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/planes-vacunales/calendario/${id}`)}
                    >
                      <FaCalendarAlt className="me-1" />
                      Ver Calendario
                    </button>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={scrollToClasificacion}
                    >
                      <FaBalanceScale className="me-1" />
                      Clasificar para Facturación
                    </button>
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => setMostrarResumen(true)}
                    >
                      <FaFileInvoice className="me-1" />
                      Resumen de Liquidación
                    </button>
                  </>
                )}

                {cotizacion.estado === 'rechazada' && (
                  <div className="alert alert-danger alert-sm mb-0 text-center">
                    <FaTimes className="me-1" />
                    Cotización Rechazada
                  </div>
                )}

                {/* Acción de Eliminar */}
                <hr className="my-2" />
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setModalConfirmacion({
                    show: true,
                    accion: 'eliminar esta cotización'
                  })}
                >
                  <FaTimes className="me-1" />
                  Eliminar
                </button>
              </div>

            </div>
          </div>

          {/* Card de Información Adicional */}
          <div className="card shadow-sm">
            <div className="card-header py-2">
              <h6 className="mb-0">
                <FaClock className="me-2" />
                Información
              </h6>
            </div>
            <div className="card-body">
              
              {/* Validez */}
              <div className="mb-3">
                <small className="text-muted d-block">Validez</small>
                <div className="fw-bold small">
                  {cotizacion.fecha_validez ? 
                    formatearFechaCorta(cotizacion.fecha_validez) : 
                    '30 días desde creación'
                  }
                </div>
              </div>

              {/* Timeline Compacto */}
              <div className="timeline-compact">
                <div className="timeline-item">
                  <div className="timeline-dot bg-primary"></div>
                  <div className="timeline-content">
                    <small className="text-muted">Creada</small>
                    <div className="fw-bold small">{formatearFechaCorta(cotizacion.created_at)}</div>
                  </div>
                </div>

                {cotizacion.fecha_envio && (
                  <div className="timeline-item">
                    <div className="timeline-dot bg-info"></div>
                    <div className="timeline-content">
                      <small className="text-muted">Enviada</small>
                      <div className="fw-bold small">{formatearFechaCorta(cotizacion.fecha_envio)}</div>
                    </div>
                  </div>
                )}

                {cotizacion.fecha_aceptacion && (
                  <div className="timeline-item">
                    <div className="timeline-dot bg-success"></div>
                    <div className="timeline-content">
                      <small className="text-muted">Aceptada</small>
                      <div className="fw-bold small">{formatearFechaCorta(cotizacion.fecha_aceptacion)}</div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Modal de Resumen de Liquidación */}
      {mostrarResumen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resumen de Liquidación</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarResumen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <ResumenLiquidacion 
                  cotizacionId={cotizacion.id_cotizacion} 
                  onClose={() => setMostrarResumen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {modalConfirmacion.show && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Acción</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalConfirmacion({ show: false, accion: null })}
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que quieres {modalConfirmacion.accion}?</p>
                {modalConfirmacion.accion?.includes('eliminar') && (
                  <div className="alert alert-warning">
                    <FaExclamationTriangle className="me-2" />
                    Esta acción no se puede deshacer.
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={observacionesEstado}
                    onChange={(e) => setObservacionesEstado(e.target.value)}
                    placeholder="Agrega observaciones sobre este cambio..."
                  />
                </div>
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
                  className="btn btn-primary"
                  onClick={confirmarAccion}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Stock Insuficiente */}
      {modalStockInsuficiente.show && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaExclamationTriangle className="text-warning me-2" />
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
                  Los siguientes productos no tienen stock suficiente para completar la cotización:
                </div>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-end">Requerido</th>
                        <th className="text-end">Disponible</th>
                        <th className="text-end">Faltante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalStockInsuficiente.productos.map((producto, index) => (
                        <tr key={index}>
                          <td>{producto.nombre}</td>
                          <td className="text-end">{producto.requerido}</td>
                          <td className="text-end">{producto.disponible}</td>
                          <td className="text-end text-danger fw-bold">{producto.faltante}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3">
                  ¿Deseas continuar y aceptar la cotización de todas formas? 
                  Esto puede generar productos en estado de pedido pendiente.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalStockInsuficiente({ show: false, productos: [], estadoDestino: null, observaciones: null })}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => forzarAceptacion()}
                >
                  Continuar de Todas Formas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CotizacionDetalleOptimizado;