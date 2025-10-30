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

const CalendariosVacunalesList = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [calendarios, setCalendarios] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroVacuna, setFiltroVacuna] = useState('');
  const [ordenamiento, setOrdenamiento] = useState('fecha_desc');
  
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
      
      // Obtener todas las cotizaciones aceptadas con sus calendarios
      const response = await planesApi.getCotizaciones({ estado: 'aceptada' });
      const cotizacionesAceptadas = response.data || response;
      
      // Procesar calendarios con información adicional
      const calendariosConDatos = [];
      
      for (const cotizacion of cotizacionesAceptadas) {
        try {
          const calendarioResponse = await planesApi.getCalendarioVacunacion(cotizacion.id_cotizacion);
          const calendario = calendarioResponse.data || calendarioResponse;
          
          if (calendario && calendario.length > 0) {
            // Agrupar por cotización con estadísticas
            const totalDosis = calendario.reduce((sum, item) => sum + item.cantidad_dosis, 0);
            const dosisEntregadas = calendario.reduce((sum, item) => sum + (item.dosis_entregadas || 0), 0);
            const progreso = totalDosis > 0 ? Math.round((dosisEntregadas / totalDosis) * 100) : 0;
            
            // Determinar estado del plan
            let estadoPlan = 'activo';
            if (progreso === 100) {
              estadoPlan = 'completado';
            } else if (progreso === 0) {
              estadoPlan = 'pendiente';
            }
            
            // Verificar si hay retrasos
            const fechaActual = new Date();
            const hayRetrasos = calendario.some(item => {
              const fechaProgramada = new Date(item.fecha_programada);
              return fechaProgramada < fechaActual && item.estado_entrega !== 'entregada';
            });
            
            if (hayRetrasos && estadoPlan !== 'completado') {
              estadoPlan = 'retrasado';
            }
            
            // Próxima entrega
            const proximaEntrega = calendario
              .filter(item => item.estado_entrega !== 'entregada')
              .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))[0];
            
            calendariosConDatos.push({
              id_cotizacion: cotizacion.id_cotizacion,
              numero_cotizacion: cotizacion.numero_cotizacion,
              cliente: cotizacion.cliente,
              plan: cotizacion.plan,
              calendario: calendario,
              estadoPlan,
              totalDosis,
              dosisEntregadas,
              progreso,
              proximaEntrega,
              fecha_inicio: cotizacion.fecha_inicio_plan,
              fecha_aceptacion: cotizacion.fecha_aceptacion,
              hayRetrasos
            });
          }
        } catch (err) {
          console.warn(`Error al cargar calendario para cotización ${cotizacion.id_cotizacion}:`, err);
        }
      }
      
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
      if (filtroEstado !== 'todos' && calendario.estadoPlan !== filtroEstado) {
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
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="activo">Activos</option>
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
                onChange={(e) => setFiltroCliente(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Vacuna</label>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por vacuna..."
                value={filtroVacuna}
                onChange={(e) => setFiltroVacuna(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Ordenar por</label>
              <select 
                className="form-select"
                value={ordenamiento}
                onChange={(e) => setOrdenamiento(e.target.value)}
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
                    <th>Próxima Entrega</th>
                    <th>Fecha Inicio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {calendariosFiltrados.map((calendario) => (
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
                        {calendario.hayRetrasos && (
                          <div className="mt-1">
                            <small className="text-danger">
                              <FaExclamationTriangle className="me-1" />
                              Con retrasos
                            </small>
                          </div>
                        )}
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
                        {calendario.proximaEntrega ? (
                          <div>
                            <strong>{formatFecha(calendario.proximaEntrega.fecha_programada)}</strong>
                            <br />
                            <small className="text-muted">
                              Semana {calendario.proximaEntrega.numero_semana}
                            </small>
                            <br />
                            <small className="text-info">
                              {formatearNumero(calendario.proximaEntrega.cantidad_dosis)} dosis
                            </small>
                          </div>
                        ) : (
                          <span className="text-success">
                            <FaCheckCircle className="me-1" />
                            Completado
                          </span>
                        )}
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