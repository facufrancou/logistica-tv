import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { FaPlus, FaEdit, FaEye, FaTrash, FaSearch, FaFilter, FaSyringe, FaCheckCircle, FaTimesCircle, FaEdit as FaPencil } from 'react-icons/fa';
import './PlanesVacunales.css';

const PlanesVacunalesList = () => {
  const { 
    planes, 
    loading, 
    cargarPlanes, 
    eliminarPlan 
  } = usePlanesVacunales();

  const [filtros, setFiltros] = useState({
    estado: '',
    busqueda: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    cargarPlanes();
  }, []);

  const aplicarFiltros = () => {
    const filtrosActivos = {};
    if (filtros.estado) filtrosActivos.estado = filtros.estado;
    
    cargarPlanes(filtrosActivos);
  };

  const limpiarFiltros = () => {
    setFiltros({ estado: '', busqueda: '' });
    cargarPlanes();
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Está seguro que desea eliminar el plan "${nombre}"?`)) {
      await eliminarPlan(id);
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
              <div className="col-md-6 d-flex align-items-end">
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
                    <th>Vacunas</th>
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
                        <span className="badge bg-primary">
                          {plan.vacunas_plan?.length || 0} vacunas
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
    </div>
  );
};

export default PlanesVacunalesList;
