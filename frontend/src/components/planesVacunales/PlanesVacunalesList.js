import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { FaPlus, FaEdit, FaEye, FaTrash, FaSearch, FaFilter, FaSyringe, FaCalculator, FaCheckCircle, FaTimesCircle, FaEdit as FaPencil } from 'react-icons/fa';
import './PlanesVacunales.css';

const PlanesVacunalesList = () => {
  const { 
    planes, 
    loading, 
    cargarPlanes, 
    eliminarPlan, 
    calcularPrecioPlan,
    cargarListasPrecios 
  } = usePlanesVacunales();

  const [filtros, setFiltros] = useState({
    estado: '',
    lista_precio: '',
    busqueda: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [precios, setPrecios] = useState({});

  useEffect(() => {
    cargarPlanes();
    cargarListasPrecios();
  }, []);

  const aplicarFiltros = () => {
    const filtrosActivos = {};
    if (filtros.estado) filtrosActivos.estado = filtros.estado;
    if (filtros.lista_precio) filtrosActivos.lista_precio = filtros.lista_precio;
    
    cargarPlanes(filtrosActivos);
  };

  const limpiarFiltros = () => {
    setFiltros({ estado: '', lista_precio: '', busqueda: '' });
    cargarPlanes();
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Está seguro que desea eliminar el plan "${nombre}"?`)) {
      await eliminarPlan(id);
    }
  };

  const calcularPrecio = async (id) => {
    const resultado = await calcularPrecioPlan(id);
    if (resultado) {
      setPrecios(prev => ({
        ...prev,
        [id]: resultado.precio_total
      }));
    }
  };

  const planesFiltrados = planes.filter(plan => {
    if (!filtros.busqueda) return true;
    return plan.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
           (plan.descripcion && plan.descripcion.toLowerCase().includes(filtros.busqueda.toLowerCase()));
  });

  const getEstadoBadge = (estado) => {
    const badges = {
      'activo': { class: 'badge bg-success', icon: FaCheckCircle },
      'inactivo': { class: 'badge bg-secondary', icon: FaTimesCircle },
      'borrador': { class: 'badge bg-warning text-dark', icon: FaPencil }
    };
    return badges[estado] || { class: 'badge bg-secondary', icon: FaTimesCircle };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaSyringe className="me-2 text-primary" />
            <h3 className="mb-0">Planes Vacunales</h3>
          </div>
          <Link to="/planes-vacunales/nuevo" className="btn btn-primary d-flex align-items-center">
            <FaPlus className="me-2" />
            Nuevo Plan
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
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Buscar por nombre</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar plan..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={filtros.estado}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="borrador">Borrador</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Lista de Precios</label>
                <select
                  className="form-select"
                  value={filtros.lista_precio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, lista_precio: e.target.value }))}
                >
                  <option value="">Todas</option>
                  <option value="1">L15</option>
                  <option value="2">L18</option>
                  <option value="3">L20</option>
                  <option value="4">L25</option>
                  <option value="5">L30</option>
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button 
                  className="btn btn-primary me-2"
                  onClick={aplicarFiltros}
                >
                  Aplicar
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={limpiarFiltros}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Planes */}
      <div className="card">
        <div className="card-body">
          {planesFiltrados.length === 0 ? (
            <div className="text-center py-5">
              <FaSyringe className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay planes vacunales</h5>
              <p className="text-muted">Crea tu primer plan vacunal para comenzar</p>
              <Link to="/planes-vacunales/nuevo" className="btn btn-primary">
                <FaPlus className="me-2" />
                Crear Plan
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Duración</th>
                    <th>Lista de Precios</th>
                    <th>Precio Total</th>
                    <th>Productos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {planesFiltrados.map((plan) => (
                    <tr key={plan.id_plan}>
                      <td>
                        <div>
                          <strong>{plan.nombre}</strong>
                          {plan.descripcion && (
                            <small className="d-block text-muted">
                              {plan.descripcion}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const estadoInfo = getEstadoBadge(plan.estado);
                          const IconoEstado = estadoInfo.icon;
                          return (
                            <span className={estadoInfo.class}>
                              <IconoEstado className="me-1" />
                              {plan.estado}
                            </span>
                          );
                        })()}
                        {plan.estado === 'borrador' && (
                          <div className="mt-1">
                            <small className="text-muted">
                              <FaEdit className="me-1" />
                              Editar para activar
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        {plan.duracion_semanas} semana{plan.duracion_semanas !== 1 ? 's' : ''}
                      </td>
                      <td>
                        {plan.lista_precio ? (
                          <span className="badge bg-info">
                            {plan.lista_precio.tipo}
                          </span>
                        ) : (
                          <span className="text-muted">Sin asignar</span>
                        )}
                      </td>
                      <td>
                        {precios[plan.id_plan] ? (
                          <span className="fw-bold text-success">
                            ${precios[plan.id_plan].toLocaleString()}
                          </span>
                        ) : plan.precio_total ? (
                          <span className="fw-bold text-success">
                            ${plan.precio_total.toLocaleString()}
                          </span>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => calcularPrecio(plan.id_plan)}
                            title="Calcular precio"
                          >
                            <FaCalculator />
                          </button>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-primary">
                          {plan.productos_plan?.length || 0} productos
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <Link
                            to={`/planes-vacunales/${plan.id_plan}`}
                            className="btn btn-sm btn-outline-primary"
                            title="Ver detalles"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/planes-vacunales/${plan.id_plan}/editar`}
                            className="btn btn-sm btn-outline-warning"
                            title="Editar"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleEliminar(plan.id_plan, plan.nombre)}
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stats Card */}
      {planesFiltrados.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">Total Planes</h6>
                    <h4>{planesFiltrados.length}</h4>
                  </div>
                  <FaSyringe style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">Activos</h6>
                    <h4>{planesFiltrados.filter(p => p.estado === 'activo').length}</h4>
                  </div>
                  <FaSyringe style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-dark">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">Borradores</h6>
                    <h4>{planesFiltrados.filter(p => p.estado === 'borrador').length}</h4>
                  </div>
                  <FaSyringe style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-secondary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">Inactivos</h6>
                    <h4>{planesFiltrados.filter(p => p.estado === 'inactivo').length}</h4>
                  </div>
                  <FaSyringe style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanesVacunalesList;
