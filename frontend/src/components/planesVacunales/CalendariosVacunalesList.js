import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaEye, 
  FaTrash, 
  FaCheck, 
  FaTimes, 
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaFilter,
  FaSyringe,
  FaUser,
  FaBuilding,
  FaChartPie,
  FaPlay,
  FaPause,
  FaStop,
  FaFileInvoice
} from 'react-icons/fa';
import * as planesApi from '../../services/planesVacunalesApi';
import './PlanesVacunales.css';

const ITEMS_POR_PAGINA = 10;

const CalendariosVacunalesList = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [calendarios, setCalendarios] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('activos'); // Por defecto excluye completados
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroVacuna, setFiltroVacuna] = useState('');
  const [ordenamiento, setOrdenamiento] = useState('fecha_desc');
  const [paginaActual, setPaginaActual] = useState(1);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    activos: 0,
    completados: 0,
    pendientes: 0,
    retrasados: 0
  });

  useEffect(() => {
    cargarCalendarios();
  }, []);

  const cargarCalendarios = async () => {
    try {
      setLoading(true);
      
      // Usar endpoint optimizado que devuelve todo en una sola llamada
      const response = await planesApi.getResumenCalendarios();
      const calendariosConDatos = response.data || response;
      
      setCalendarios(calendariosConDatos);
      
      // Calcular estadísticas
      const stats = {
        total: calendariosConDatos.length,
        activos: calendariosConDatos.filter(c => c.estadoPlan === 'activo').length,
        completados: calendariosConDatos.filter(c => c.estadoPlan === 'completado').length,
        pendientes: calendariosConDatos.filter(c => c.estadoPlan === 'pendiente').length,
        retrasados: calendariosConDatos.filter(c => c.estadoPlan === 'retrasado').length
      };
      setEstadisticas(stats);
      
    } catch (error) {
      console.error('Error al cargar calendarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const calendariosFiltrados = calendarios
    .filter(calendario => {
      // Filtro por estado
      if (filtroEstado === 'activos') {
        // Mostrar todos excepto completados
        if (calendario.estadoPlan === 'completado') return false;
      } else if (filtroEstado !== 'todos' && calendario.estadoPlan !== filtroEstado) {
        return false;
      }
      
      // Filtro por cliente
      if (filtroCliente && !calendario.cliente.nombre.toLowerCase().includes(filtroCliente.toLowerCase())) {
        return false;
      }
      
      // Filtro por vacuna (buscar en el calendario)
      if (filtroVacuna) {
        const tieneVacuna = calendario.calendario.some(item => 
          item.vacuna_nombre?.toLowerCase().includes(filtroVacuna.toLowerCase())
        );
        if (!tieneVacuna) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (ordenamiento) {
        case 'fecha_desc':
          return new Date(b.fecha_aceptacion) - new Date(a.fecha_aceptacion);
        case 'fecha_asc':
          return new Date(a.fecha_aceptacion) - new Date(b.fecha_aceptacion);
        case 'cliente_asc':
          return a.cliente.nombre.localeCompare(b.cliente.nombre);
        case 'progreso_desc':
          return b.progreso - a.progreso;
        case 'progreso_asc':
          return a.progreso - b.progreso;
        default:
          return 0;
      }
    });

  const getEstadoBadge = (estado) => {
    const badges = {
      activo: { class: 'badge bg-primary', icon: FaPlay, text: 'Activo' },
      completado: { class: 'badge bg-success', icon: FaCheckCircle, text: 'Completado' },
      pendiente: { class: 'badge bg-warning', icon: FaClock, text: 'Pendiente' },
      retrasado: { class: 'badge bg-danger', icon: FaExclamationTriangle, text: 'Retrasado' }
    };
    
    const badge = badges[estado] || badges.pendiente;
    const IconComponent = badge.icon;
    
    return (
      <span className={badge.class}>
        <IconComponent className="me-1" />
        {badge.text}
      </span>
    );
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearNumero = (numero) => {
    return numero.toLocaleString('es-ES');
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
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
            <FaCalendarAlt className="me-2 text-primary" />
            <h3 className="mb-0">Calendarios Vacunales</h3>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <FaFilter className="me-2" />
          Filtros
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Estado</label>
              <select 
                className="form-select"
                value={filtroEstado}
                onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
              >
                <option value="activos">En curso (sin completados)</option>
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="activo">Solo activos</option>
                <option value="retrasado">Con retrasos</option>
                <option value="completado">Completados</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por cliente..."
                value={filtroCliente}
                onChange={(e) => { setFiltroCliente(e.target.value); setPaginaActual(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Vacuna</label>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por vacuna..."
                value={filtroVacuna}
                onChange={(e) => { setFiltroVacuna(e.target.value); setPaginaActual(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Ordenar por</label>
              <select 
                className="form-select"
                value={ordenamiento}
                onChange={(e) => { setOrdenamiento(e.target.value); setPaginaActual(1); }}
              >
                <option value="fecha_desc">Fecha (más recientes)</option>
                <option value="fecha_asc">Fecha (más antiguos)</option>
                <option value="cliente_asc">Cliente (A-Z)</option>
                <option value="progreso_desc">Progreso (mayor a menor)</option>
                <option value="progreso_asc">Progreso (menor a mayor)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Calendarios */}
      <div className="card">
        <div className="card-body">
          {calendariosFiltrados.length === 0 ? (
            <div className="text-center py-5">
              <FaCalendarAlt size={60} className="text-muted mb-3" />
              <h5 className="text-muted">No se encontraron calendarios</h5>
              <p className="text-muted">
                {calendarios.length === 0 
                  ? 'No hay calendarios de vacunación disponibles'
                  : 'No hay calendarios que coincidan con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Cotización</th>
                    <th>Cliente</th>
                    <th>Plan</th>
                    <th>Estado</th>
                    <th>Progreso</th>
                    <th>Dosis Total</th>
                    <th>Fecha Inicio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {calendariosFiltrados
                    .slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
                    .map((calendario) => (
                    <tr key={calendario.id_cotizacion}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaFileInvoice className="me-2 text-primary" />
                          <div>
                            <strong>{calendario.numero_cotizacion}</strong>
                            <br />
                            <small className="text-muted">
                              ID: {calendario.id_cotizacion}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaBuilding className="me-2 text-secondary" />
                          <div>
                            <strong>{calendario.cliente.nombre}</strong>
                            <br />
                            <small className="text-muted">
                              CUIT: {calendario.cliente.cuit}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaSyringe className="me-2 text-success" />
                          <div>
                            <strong>{calendario.plan.nombre}</strong>
                            <br />
                            <small className="text-muted">
                              {calendario.plan.duracion_semanas} semanas
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {getEstadoBadge(calendario.estadoPlan)}
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress me-2" style={{ width: '80px', height: '8px' }}>
                            <div 
                              className={`progress-bar ${
                                calendario.progreso === 100 ? 'bg-success' :
                                calendario.progreso >= 50 ? 'bg-info' :
                                calendario.progreso > 0 ? 'bg-warning' : 'bg-secondary'
                              }`}
                              style={{ width: `${calendario.progreso}%` }}
                            ></div>
                          </div>
                          <small><strong>{calendario.progreso}%</strong></small>
                        </div>
                        <small className="text-muted">
                          {formatearNumero(calendario.dosisEntregadas)} / {formatearNumero(calendario.totalDosis)} dosis
                        </small>
                      </td>
                      <td>
                        <strong>{formatearNumero(calendario.totalDosis)}</strong>
                        <br />
                        <small className="text-muted">dosis totales</small>
                      </td>
                      <td>
                        <strong>{formatFecha(calendario.fecha_inicio)}</strong>
                        <br />
                        <small className="text-muted">
                          Aceptada: {formatFecha(calendario.fecha_aceptacion)}
                        </small>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <Link
                            to={`/planes-vacunales/calendario/${calendario.id_cotizacion}`}
                            className="btn btn-outline-primary btn-sm"
                            title="Ver calendario detallado"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/cotizaciones/${calendario.id_cotizacion}`}
                            className="btn btn-outline-info btn-sm"
                            title="Ver cotización"
                          >
                            <FaFileInvoice />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {calendariosFiltrados.length > ITEMS_POR_PAGINA && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Mostrando {((paginaActual - 1) * ITEMS_POR_PAGINA) + 1} - {Math.min(paginaActual * ITEMS_POR_PAGINA, calendariosFiltrados.length)} de {calendariosFiltrados.length} calendarios
                </div>
                <nav>
                  <ul className="pagination mb-0">
                    <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setPaginaActual(1)}
                        disabled={paginaActual === 1}
                      >
                        «
                      </button>
                    </li>
                    <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                        disabled={paginaActual === 1}
                      >
                        ‹
                      </button>
                    </li>
                    {Array.from({ length: Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA);
                        if (totalPages <= 5) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - paginaActual) <= 1) return true;
                        return false;
                      })
                      .map((page, index, arr) => (
                        <React.Fragment key={page}>
                          {index > 0 && arr[index - 1] !== page - 1 && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                          <li className={`page-item ${paginaActual === page ? 'active' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setPaginaActual(page)}
                            >
                              {page}
                            </button>
                          </li>
                        </React.Fragment>
                      ))
                    }
                    <li className={`page-item ${paginaActual >= Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA) ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setPaginaActual(prev => Math.min(Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA), prev + 1))}
                        disabled={paginaActual >= Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA)}
                      >
                        ›
                      </button>
                    </li>
                    <li className={`page-item ${paginaActual >= Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA) ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setPaginaActual(Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA))}
                        disabled={paginaActual >= Math.ceil(calendariosFiltrados.length / ITEMS_POR_PAGINA)}
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Resumen inferior */}
      <div className="row mt-4">
        <div className="col">
          <div className="card bg-light">
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-4">
                  <h6 className="text-muted">Total Calendarios</h6>
                  <h4 className="mb-0">{calendariosFiltrados.length}</h4>
                </div>
                <div className="col-md-4">
                  <h6 className="text-muted">Dosis Programadas</h6>
                  <h4 className="mb-0">
                    {formatearNumero(calendariosFiltrados.reduce((sum, c) => sum + c.totalDosis, 0))}
                  </h4>
                </div>
                <div className="col-md-4">
                  <h6 className="text-muted">Dosis Entregadas</h6>
                  <h4 className="mb-0">
                    {formatearNumero(calendariosFiltrados.reduce((sum, c) => sum + c.dosisEntregadas, 0))}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendariosVacunalesList;