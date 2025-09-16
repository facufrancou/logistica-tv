import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { getClientes } from '../../services/api';
import { FaPlus, FaEdit, FaEye, FaSearch, FaFilter, FaFileInvoice, FaCalendarAlt, FaCheck, FaTimes } from 'react-icons/fa';
import './PlanesVacunales.css';

const CotizacionesList = () => {
  const { 
    cotizaciones, 
    loading, 
    cargarCotizaciones, 
    cambiarEstadoCotizacion 
  } = usePlanesVacunales();

  const [filtros, setFiltros] = useState({
    estado: '',
    id_cliente: '',
    fecha_desde: '',
    busqueda: ''
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

  const handleCambiarEstado = async (id, nuevoEstado, observaciones = '') => {
    if (window.confirm(`¿Está seguro que desea cambiar el estado a "${nuevoEstado}"?`)) {
      await cambiarEstadoCotizacion(id, { estado: nuevoEstado, observaciones });
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
      'cancelada': { class: 'badge bg-secondary', text: 'Cancelada' }
    };
    return badges[estado] || { class: 'badge bg-secondary', text: estado };
  };

  const getAccionesDisponibles = (estado) => {
    const transiciones = {
      'en_proceso': ['enviada', 'cancelada'],
      'enviada': ['aceptada', 'rechazada', 'cancelada'],
      'aceptada': ['cancelada'],
      'rechazada': [],
      'cancelada': []
    };
    return transiciones[estado] || [];
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
                              to={`/cotizaciones/${cotizacion.id_cotizacion}/calendario`}
                              className="btn btn-sm btn-outline-info"
                              title="Ver calendario"
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
    </div>
  );
};

export default CotizacionesList;
