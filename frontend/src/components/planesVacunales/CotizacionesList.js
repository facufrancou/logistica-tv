import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { useNotification } from '../../context/NotificationContext';
import { getClientes } from '../../services/api';
import { FaPlus, FaEdit, FaEye, FaSearch, FaFilter, FaFileInvoice, FaCalendarAlt, FaCheck, FaTimes, FaTrash, FaUndo } from 'react-icons/fa';
import './PlanesVacunales.css';

const CotizacionesList = () => {
  const { 
    cotizaciones, 
    loading, 
    cargarCotizaciones, 
    cambiarEstadoCotizacion,
    eliminarCotizacion,
    reactivarCotizacion
  } = usePlanesVacunales();

  const { showError, showWarning } = useNotification();

  const [filtros, setFiltros] = useState({
    estado: '',
    id_cliente: '',
    fecha_desde: '',
    busqueda: ''
  });

  const [modalStockInsuficiente, setModalStockInsuficiente] = useState({ 
    show: false, 
    productos: [], 
    cotizacionId: null,
    estadoDestino: null
  });
  const [modalEliminar, setModalEliminar] = useState({
    show: false,
    cotizacionId: null,
    numeroCotizacion: ''
  });
  const [modalReactivar, setModalReactivar] = useState({
    show: false,
    cotizacionId: null,
    numeroCotizacion: ''
  });
  const [modalConfirmarCambioEstado, setModalConfirmarCambioEstado] = useState({
    show: false,
    cotizacionId: null,
    nuevoEstado: '',
    observaciones: '',
    forzarAceptacion: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      cargarCotizaciones();
      const clientesData = await getClientes();
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const aplicarFiltros = () => {
    const filtrosActivos = {};
    if (filtros.estado) filtrosActivos.estado = filtros.estado;
    if (filtros.id_cliente) filtrosActivos.id_cliente = filtros.id_cliente;
    if (filtros.fecha_desde) filtrosActivos.fecha_desde = filtros.fecha_desde;
    
    cargarCotizaciones(filtrosActivos);
  };

  const limpiarFiltros = () => {
    setFiltros({ estado: '', id_cliente: '', fecha_desde: '', busqueda: '' });
    cargarCotizaciones();
  };

  const handleCambiarEstado = async (id, nuevoEstado, observaciones = '', forzarAceptacion = false) => {
    try {
      if (!forzarAceptacion) {
        // Mostrar modal de confirmación
        setModalConfirmarCambioEstado({
          show: true,
          cotizacionId: id,
          nuevoEstado: nuevoEstado,
          observaciones: observaciones,
          forzarAceptacion: false
        });
        return;
      }
      
      // Ejecutar el cambio de estado directamente si se está forzando
      const datos = { estado: nuevoEstado, observaciones };
      
      if (forzarAceptacion) {
        datos.forzar_aceptacion = true;
      }
      
      await cambiarEstadoCotizacion(id, datos);
      setModalStockInsuficiente({ show: false, productos: [], cotizacionId: null, estadoDestino: null });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      
      // Verificar si es un error de stock insuficiente
      if (error.response?.data?.error === 'STOCK_INSUFICIENTE') {
        const errorData = error.response.data;
        setModalStockInsuficiente({
          show: true,
          productos: errorData.productos_insuficientes,
          cotizacionId: id,
          estadoDestino: nuevoEstado
        });
      } else {
        // Mostrar error general si no es problema de stock
        showError('Error al cambiar estado', error.response?.data?.message || error.message);
      }
    }
  };

  const confirmarCambioEstado = async () => {
    try {
      const { cotizacionId, nuevoEstado, observaciones, forzarAceptacion } = modalConfirmarCambioEstado;
      const datos = { estado: nuevoEstado, observaciones };
      
      if (forzarAceptacion) {
        datos.forzar_aceptacion = true;
      }
      
      await cambiarEstadoCotizacion(cotizacionId, datos);
      setModalConfirmarCambioEstado({ show: false, cotizacionId: null, nuevoEstado: '', observaciones: '', forzarAceptacion: false });
      setModalStockInsuficiente({ show: false, productos: [], cotizacionId: null, estadoDestino: null });
    } catch (error) {
      console.error('Error cambiando estado:', error);
      if (error.response?.data?.error === 'STOCK_INSUFICIENTE') {
        setModalStockInsuficiente({
          show: true,
          productos: error.response.data.productos_insuficientes,
          cotizacionId: modalConfirmarCambioEstado.cotizacionId,
          estadoDestino: modalConfirmarCambioEstado.nuevoEstado
        });
        setModalConfirmarCambioEstado({ show: false, cotizacionId: null, nuevoEstado: '', observaciones: '', forzarAceptacion: false });
      } else {
        showError('Error al cambiar estado', error.response?.data?.message || error.message);
      }
    }
  };

  const handleEliminar = (cotizacion) => {
    setModalEliminar({
      show: true,
      cotizacionId: cotizacion.id_cotizacion,
      numeroCotizacion: cotizacion.numero_cotizacion
    });
  };

  const confirmarEliminacion = async () => {
    const motivo = document.getElementById('motivoEliminacion').value;
    
    try {
      await eliminarCotizacion(modalEliminar.cotizacionId, motivo);
      setModalEliminar({ show: false, cotizacionId: null, numeroCotizacion: '' });
      cargarCotizaciones(); // Recargar la lista
    } catch (error) {
      console.error('Error eliminando cotización:', error);
    }
  };

  const handleReactivar = (cotizacion) => {
    setModalReactivar({
      show: true,
      cotizacionId: cotizacion.id_cotizacion,
      numeroCotizacion: cotizacion.numero_cotizacion
    });
  };

  const confirmarReactivacion = async () => {
    const estadoDestino = document.getElementById('estadoDestino').value;
    const motivo = document.getElementById('motivoReactivacion').value;
    
    if (!estadoDestino) {
      showWarning('Validación', 'Debe seleccionar un estado destino');
      return;
    }
    
    try {
      await reactivarCotizacion(modalReactivar.cotizacionId, estadoDestino, motivo);
      setModalReactivar({ show: false, cotizacionId: null, numeroCotizacion: '' });
      cargarCotizaciones(); // Recargar la lista
    } catch (error) {
      console.error('Error reactivando cotización:', error);
      if (error.response?.data?.error === 'STOCK_INSUFICIENTE') {
        showError('Stock Insuficiente', 'No hay stock suficiente para reactivar esta cotización como aceptada.');
      }
    }
  };

  const cotizacionesFiltradas = cotizaciones.filter(cotizacion => {
    if (!filtros.busqueda) return true;
    return cotizacion.numero_cotizacion.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
           (cotizacion.cliente?.nombre && cotizacion.cliente.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())) ||
           (cotizacion.plan?.nombre && cotizacion.plan.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()));
  });

  const getEstadoBadge = (estado) => {
    const badges = {
      'en_proceso': { class: 'badge bg-info', text: 'En Proceso' },
      'enviada': { class: 'badge bg-warning text-dark', text: 'Enviada' },
      'aceptada': { class: 'badge bg-success', text: 'Aceptada' },
      'rechazada': { class: 'badge bg-danger', text: 'Rechazada' },
      'cancelada': { class: 'badge bg-secondary', text: 'Cancelada' },
      'eliminada': { class: 'badge bg-dark', text: 'Eliminada' }
    };
    return badges[estado] || { class: 'badge bg-secondary', text: estado };
  };

  const getAccionesDisponibles = (estado) => {
    const transiciones = {
      'en_proceso': ['enviada', 'cancelada'],
      'enviada': ['aceptada', 'rechazada', 'cancelada'],
      'aceptada': ['cancelada'],
      'rechazada': [],
      'cancelada': [],
      'eliminada': []
    };
    return transiciones[estado] || [];
  };

  const puedeEliminar = (estado) => {
    return estado !== 'eliminada';
  };

  const puedeReactivar = (estado) => {
    return estado === 'eliminada';
  };

  if (loading) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner"></div>
        <p>Cargando cotizaciones...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaFileInvoice className="me-2 text-primary" />
            <h3 className="mb-0">Cotizaciones</h3>
          </div>
          <Link to="/cotizaciones/nueva" className="btn btn-primary d-flex align-items-center">
            <FaPlus className="me-2" />
            Nueva Cotización
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <button 
            className="btn btn-outline-primary d-flex align-items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="me-2" />
            Filtros
          </button>
        </div>
        {showFilters && (
          <div className="card-body filtros-container">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Buscar</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Número, cliente, plan..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={filtros.estado}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="enviada">Enviada</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="eliminada">Eliminada</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Cliente</label>
                <select
                  className="form-select"
                  value={filtros.id_cliente}
                  onChange={(e) => setFiltros(prev => ({ ...prev, id_cliente: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Desde</label>
                <input
                  type="date"
                  className="form-control"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <div className="d-flex w-100 gap-2">
                  <button 
                    className="btn btn-primary flex-fill"
                    onClick={aplicarFiltros}
                  >
                    Aplicar
                  </button>
                  <button 
                    className="btn btn-outline-secondary flex-fill"
                    onClick={limpiarFiltros}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Cotizaciones */}
      <div className="card">
        <div className="card-body">
          {cotizacionesFiltradas.length === 0 ? (
            <div className="text-center py-5">
              <FaFileInvoice className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay cotizaciones</h5>
              <p className="text-muted">Crea tu primera cotización para comenzar</p>
              <Link to="/cotizaciones/nueva" className="btn btn-primary">
                <FaPlus className="me-2" />
                Crear Cotización
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover productos-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Plan</th>
                    <th>Lista Precio</th>
                    <th>Estado</th>
                    <th>Precio Total</th>
                    <th>Fecha Inicio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacionesFiltradas.map((cotizacion) => {
                    const estadoBadge = getEstadoBadge(cotizacion.estado);
                    const acciones = getAccionesDisponibles(cotizacion.estado);
                    
                    return (
                      <tr key={cotizacion.id_cotizacion}>
                        <td>
                          <strong className="text-primary">
                            {cotizacion.numero_cotizacion}
                          </strong>
                          <small className="d-block text-muted">
                            {new Date(cotizacion.created_at).toLocaleDateString('es-ES')}
                          </small>
                        </td>
                        <td>
                          <strong>{cotizacion.cliente?.nombre || 'Cliente no encontrado'}</strong>
                          {cotizacion.cliente?.email && (
                            <small className="d-block text-muted">
                              {cotizacion.cliente.email}
                            </small>
                          )}
                        </td>
                        <td>
                          <strong>{cotizacion.plan?.nombre || 'Plan no encontrado'}</strong>
                          {cotizacion.plan?.duracion_semanas && (
                            <small className="d-block text-muted">
                              {cotizacion.plan.duracion_semanas} semanas
                            </small>
                          )}
                        </td>
                        <td>
                          {cotizacion.lista_precio ? (
                            <>
                              <strong>{cotizacion.lista_precio.nombre}</strong>
                              <small className="d-block text-muted">
                                {cotizacion.lista_precio.tipo} (+{cotizacion.lista_precio.porcentaje_recargo}%)
                              </small>
                            </>
                          ) : (
                            <span className="text-muted">Sin lista asignada</span>
                          )}
                        </td>
                        <td>
                          <span className={estadoBadge.class}>
                            {estadoBadge.text}
                          </span>
                          {cotizacion.fecha_envio && (
                            <small className="d-block text-muted">
                              Enviada: {new Date(cotizacion.fecha_envio).toLocaleDateString('es-ES')}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="fw-bold text-success">
                            ${cotizacion.precio_total?.toLocaleString() || '0'}
                          </span>
                          {cotizacion.modalidad_facturacion && (
                            <small className="d-block text-muted">
                              {cotizacion.modalidad_facturacion.replace('_', ' ')}
                            </small>
                          )}
                        </td>
                        <td>
                          {new Date(cotizacion.fecha_inicio_plan).toLocaleDateString('es-ES')}
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link
                              to={`/cotizaciones/${cotizacion.id_cotizacion}`}
                              className="btn btn-sm btn-outline-primary"
                              title="Ver detalles"
                            >
                              <FaEye />
                            </Link>
                            <Link
                              to={`/planes-vacunales/calendario/${cotizacion.id_cotizacion}`}
                              className="btn btn-sm btn-outline-info"
                              title="Ver y editar calendario de vacunación"
                            >
                              <FaCalendarAlt />
                            </Link>
                            
                            {/* Botones de cambio de estado */}
                            {acciones.includes('enviada') && (
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleCambiarEstado(cotizacion.id_cotizacion, 'enviada')}
                                title="Enviar cotización"
                              >
                                📤
                              </button>
                            )}
                            {acciones.includes('aceptada') && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleCambiarEstado(cotizacion.id_cotizacion, 'aceptada')}
                                title="Aceptar cotización"
                              >
                                <FaCheck />
                              </button>
                            )}
                            {acciones.includes('rechazada') && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCambiarEstado(cotizacion.id_cotizacion, 'rechazada')}
                                title="Rechazar cotización"
                              >
                                <FaTimes />
                              </button>
                            )}
                            
                            {/* Botón eliminar */}
                            {puedeEliminar(cotizacion.estado) && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleEliminar(cotizacion)}
                                title="Eliminar cotización"
                              >
                                <FaTrash />
                              </button>
                            )}
                            
                            {/* Botón reactivar */}
                            {puedeReactivar(cotizacion.estado) && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleReactivar(cotizacion)}
                                title="Reactivar cotización"
                              >
                                <FaUndo />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {cotizacionesFiltradas.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-2">
            <div className="card stats-card primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">Total</h6>
                    <h4>{cotizacionesFiltradas.length}</h4>
                  </div>
                  <FaFileInvoice style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card stats-card success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">Aceptadas</h6>
                    <h4>{cotizacionesFiltradas.filter(c => c.estado === 'aceptada').length}</h4>
                  </div>
                  <FaCheck style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card stats-card warning text-dark">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">Enviadas</h6>
                    <h4>{cotizacionesFiltradas.filter(c => c.estado === 'enviada').length}</h4>
                  </div>
                  <FaFileInvoice style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card stats-card secondary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title">En Proceso</h6>
                    <h4>{cotizacionesFiltradas.filter(c => c.estado === 'en_proceso').length}</h4>
                  </div>
                  <FaEdit style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">Valor Total Cotizaciones</h6>
                <h4 className="text-success">
                  ${cotizacionesFiltradas
                    .filter(c => c.estado === 'aceptada')
                    .reduce((total, c) => total + (c.precio_total || 0), 0)
                    .toLocaleString()}
                </h4>
                <small className="text-muted">Solo cotizaciones aceptadas</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {modalEliminar.show && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setModalEliminar({ show: false, cotizacionId: null, numeroCotizacion: '' })}></div>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">
                    <FaTrash className="me-2" />
                    Confirmar Eliminación
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalEliminar({ show: false, cotizacionId: null, numeroCotizacion: '' })}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <strong>¿Está seguro que desea eliminar la cotización?</strong>
                  </div>
                  <p><strong>Número:</strong> {modalEliminar.numeroCotizacion}</p>
                  <p className="text-muted">
                    Esta acción marcará la cotización como eliminada. Si estaba aceptada, se liberarán las reservas de stock.
                  </p>
                  
                  <div className="mb-3">
                    <label className="form-label">Motivo de eliminación:</label>
                    <textarea
                      id="motivoEliminacion"
                      className="form-control"
                      rows="3"
                      placeholder="Opcional: indique el motivo de la eliminación"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalEliminar({ show: false, cotizacionId: null, numeroCotizacion: '' })}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmarEliminacion}
                  >
                    <FaTrash className="me-2" />
                    Eliminar Cotización
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación para reactivar */}
      {modalReactivar.show && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setModalReactivar({ show: false, cotizacionId: null, numeroCotizacion: '' })}></div>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <FaUndo className="me-2" />
                    Reactivar Cotización
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalReactivar({ show: false, cotizacionId: null, numeroCotizacion: '' })}
                  ></button>
                </div>
                <div className="modal-body">
                  <p><strong>Número:</strong> {modalReactivar.numeroCotizacion}</p>
                  <p className="text-info">
                    Seleccione el estado al que desea reactivar la cotización.
                  </p>
                  
                  <div className="mb-3">
                    <label className="form-label">Estado destino: <span className="text-danger">*</span></label>
                    <select id="estadoDestino" className="form-select" required>
                      <option value="">Seleccione un estado</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="enviada">Enviada</option>
                      <option value="aceptada">Aceptada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <small className="text-muted">
                      Si selecciona "Aceptada", se verificará la disponibilidad de stock.
                    </small>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Motivo de reactivación:</label>
                    <textarea
                      id="motivoReactivacion"
                      className="form-control"
                      rows="3"
                      placeholder="Opcional: indique el motivo de la reactivación"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalReactivar({ show: false, cotizacionId: null, numeroCotizacion: '' })}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmarReactivacion}
                  >
                    <FaUndo className="me-2" />
                    Reactivar Cotización
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal para productos con stock insuficiente */}
      {modalStockInsuficiente.show && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setModalStockInsuficiente({ show: false, productos: [], cotizacionId: null, estadoDestino: null })}></div>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Stock Insuficiente
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModalStockInsuficiente({ show: false, productos: [], cotizacionId: null, estadoDestino: null })}
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
                  onClick={() => setModalStockInsuficiente({ show: false, productos: [], cotizacionId: null, estadoDestino: null })}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => {
                    // Forzar la aceptación ignorando el stock
                    handleCambiarEstado(modalStockInsuficiente.cotizacionId, modalStockInsuficiente.estadoDestino, '', true);
                  }}
                >
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Aceptar de todas formas
                </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación para cambio de estado */}
      {modalConfirmarCambioEstado.show && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setModalConfirmarCambioEstado({ show: false, cotizacionId: null, nuevoEstado: null, observaciones: '', forzarAceptacion: false })}></div>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-question-circle-fill me-2"></i>
                    Confirmar Cambio de Estado
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalConfirmarCambioEstado({ show: false, cotizacionId: null, nuevoEstado: null, observaciones: '', forzarAceptacion: false })}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-3">
                    <h6>¿Estás seguro de que deseas cambiar el estado de esta cotización?</h6>
                    <p className="text-muted mb-0">
                      Estado destino: <strong className="text-primary">{modalConfirmarCambioEstado.nuevoEstado}</strong>
                    </p>
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <small>Esta acción cambiará el estado de la cotización y puede afectar el stock de productos.</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalConfirmarCambioEstado({ show: false, cotizacionId: null, nuevoEstado: null, observaciones: '', forzarAceptacion: false })}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmarCambioEstado}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Confirmar Cambio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CotizacionesList;
