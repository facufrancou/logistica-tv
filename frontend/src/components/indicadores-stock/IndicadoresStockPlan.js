import React, { useState, useEffect } from 'react';
import { 
  FaChartBar, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaBoxOpen,
  FaSyringe,
  FaCalendarAlt,
  FaUser,
  FaSearch,
  FaFilter,
  FaDownload,
  FaSync,
  FaEye
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import './IndicadoresStock.css';

const IndicadoresStockPlan = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [indicadores, setIndicadores] = useState([]);
  const [resumenGeneral, setResumenGeneral] = useState({});
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado_alerta: '',
    plan_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  const [planes, setPlanes] = useState([]);
  const [mostrarDetalle, setMostrarDetalle] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      await Promise.all([
        cargarIndicadores(),
        cargarPlanes(),
        cargarResumenGeneral()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error', 'No se pudieron cargar los indicadores de stock');
    } finally {
      setLoading(false);
    }
  };

  const cargarIndicadores = async () => {
    const params = new URLSearchParams(filtros);
    const response = await fetch(`http://localhost:3001/indicadores-stock/planes?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Error al cargar indicadores');
    }

    const data = await response.json();
    setIndicadores(data.data?.indicadores || []);
  };

  const cargarPlanes = async () => {
    const response = await fetch('http://localhost:3001/planes-vacunales/activos', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Error al cargar planes');
    }

    const data = await response.json();
    setPlanes(data.data || []);
  };

  const cargarResumenGeneral = async () => {
    const response = await fetch('http://localhost:3001/indicadores-stock/resumen', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Error al cargar resumen');
    }

    const data = await response.json();
    setResumenGeneral(data.data || {});
  };

  const getAlertaColor = (tipoAlerta) => {
    const colores = {
      'critico': 'danger',
      'advertencia': 'warning',
      'normal': 'success',
      'info': 'info'
    };
    return colores[tipoAlerta] || 'secondary';
  };

  const getAlertaIcon = (tipoAlerta) => {
    const iconos = {
      'critico': FaTimesCircle,
      'advertencia': FaExclamationTriangle,
      'normal': FaCheckCircle,
      'info': FaInfoCircle
    };
    const IconComponent = iconos[tipoAlerta] || FaInfoCircle;
    return <IconComponent />;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const formatearPorcentaje = (valor) => {
    return `${(valor || 0).toFixed(1)}%`;
  };

  const exportarReporte = async () => {
    try {
      const params = new URLSearchParams(filtros);
      const response = await fetch(`http://localhost:3001/indicadores-stock/export?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al exportar reporte');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `indicadores-stock-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Éxito', 'Reporte exportado correctamente');
    } catch (error) {
      console.error('Error exportando reporte:', error);
      showError('Error', 'No se pudo exportar el reporte');
    }
  };

  if (loading) {
    return (
      <div className="indicadores-loading">
        <div className="indicadores-spinner"></div>
        <p>Cargando indicadores de stock...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <FaChartBar className="me-2 text-primary" size={24} />
              <div>
                <h3 className="mb-0">Indicadores de Stock por Plan</h3>
                <small className="text-muted">Monitoreo de stock y alertas para planes de vacunación</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-success"
                onClick={exportarReporte}
                title="Exportar reporte"
              >
                <FaDownload className="me-1" />
                Exportar
              </button>
              <button 
                className="btn btn-outline-primary"
                onClick={cargarDatos}
                title="Actualizar datos"
              >
                <FaRefresh className="me-1" />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen General */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaTimesCircle className="me-3" size={32} />
                <div>
                  <h4 className="mb-0">{resumenGeneral.alertas_criticas || 0}</h4>
                  <small>Alertas Críticas</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaExclamationTriangle className="me-3" size={32} />
                <div>
                  <h4 className="mb-0">{resumenGeneral.alertas_advertencia || 0}</h4>
                  <small>Advertencias</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaCheckCircle className="me-3" size={32} />
                <div>
                  <h4 className="mb-0">{resumenGeneral.planes_normales || 0}</h4>
                  <small>Stock Normal</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <FaBoxOpen className="me-3" size={32} />
                <div>
                  <h4 className="mb-0">{resumenGeneral.total_planes || 0}</h4>
                  <small>Total Planes</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cliente, plan..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado Alerta</label>
              <select
                className="form-select"
                value={filtros.estado_alerta}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado_alerta: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="critico">Crítico</option>
                <option value="advertencia">Advertencia</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Plan de Vacunación</label>
              <select
                className="form-select"
                value={filtros.plan_id}
                onChange={(e) => setFiltros(prev => ({ ...prev, plan_id: e.target.value }))}
              >
                <option value="">Todos los planes</option>
                {planes.map(plan => (
                  <option key={plan.id_plan} value={plan.id_plan}>
                    {plan.nombre_plan}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="d-flex align-items-end">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setFiltros({
                    busqueda: '',
                    estado_alerta: '',
                    plan_id: '',
                    fecha_desde: '',
                    fecha_hasta: ''
                  })}
                >
                  <FaFilter className="me-1" />
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Indicadores */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Indicadores por Plan</h5>
        </div>
        <div className="card-body">
          {indicadores.length === 0 ? (
            <div className="text-center py-5">
              <FaInfoCircle className="text-muted mb-3" size={48} />
              <h4>No hay indicadores disponibles</h4>
              <p className="text-muted">No se encontraron indicadores con los filtros aplicados</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Estado</th>
                    <th>Cliente</th>
                    <th>Plan</th>
                    <th>Fecha Inicio</th>
                    <th>Stock Crítico</th>
                    <th>Stock Bajo</th>
                    <th>Próximas Vacunas</th>
                    <th>Cobertura (%)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {indicadores.map((indicador) => (
                    <tr key={`${indicador.id_cotizacion}-${indicador.id_plan}`}>
                      <td>
                        <span className={`badge bg-${getAlertaColor(indicador.estado_alerta)} d-flex align-items-center`}>
                          {getAlertaIcon(indicador.estado_alerta)}
                          <span className="ms-1">{indicador.estado_alerta}</span>
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-muted me-2" />
                          <div>
                            <div className="fw-bold">{indicador.cliente_nombre}</div>
                            <small className="text-muted">Cot. {indicador.numero_cotizacion}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaSyringe className="text-primary me-2" />
                          <div>
                            <div>{indicador.plan_nombre}</div>
                            <small className="text-muted">{indicador.plan_duracion} semanas</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-warning me-2" />
                          <div>
                            <div>{formatearFecha(indicador.fecha_inicio_plan)}</div>
                            <small className="text-muted">
                              Semana {indicador.semana_actual || 1}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {indicador.productos_criticos > 0 ? (
                          <span className="badge bg-danger">
                            {indicador.productos_criticos} productos
                          </span>
                        ) : (
                          <span className="text-success">
                            <FaCheckCircle className="me-1" />
                            Sin críticos
                          </span>
                        )}
                      </td>
                      <td>
                        {indicador.productos_bajo_stock > 0 ? (
                          <span className="badge bg-warning">
                            {indicador.productos_bajo_stock} productos
                          </span>
                        ) : (
                          <span className="text-success">
                            <FaCheckCircle className="me-1" />
                            Stock normal
                          </span>
                        )}
                      </td>
                      <td>
                        <div>
                          <span className="fw-bold text-info">
                            {indicador.proximas_vacunas || 0}
                          </span>
                          <div>
                            <small className="text-muted">
                              Próximos 7 días
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="progress mb-1" style={{ height: '20px' }}>
                          <div 
                            className={`progress-bar bg-${
                              indicador.cobertura_stock >= 80 ? 'success' : 
                              indicador.cobertura_stock >= 50 ? 'warning' : 'danger'
                            }`}
                            style={{ width: `${indicador.cobertura_stock || 0}%` }}
                          >
                            {formatearPorcentaje(indicador.cobertura_stock)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setMostrarDetalle(indicador)}
                            title="Ver detalles"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => navigate(`/cotizaciones/${indicador.id_cotizacion}`)}
                            title="Ver cotización"
                          >
                            <FaInfoCircle />
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

      {/* Modal Detalle */}
      {mostrarDetalle && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaChartBar className="me-2" />
                  Detalle de Indicadores - {mostrarDetalle.cliente_nombre}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setMostrarDetalle(null)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Información General */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Información General</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Cliente:</strong> {mostrarDetalle.cliente_nombre}
                      </div>
                      <div className="col-md-6">
                        <strong>Plan:</strong> {mostrarDetalle.plan_nombre}
                      </div>
                      <div className="col-md-6">
                        <strong>Cotización:</strong> {mostrarDetalle.numero_cotizacion}
                      </div>
                      <div className="col-md-6">
                        <strong>Fecha Inicio:</strong> {formatearFecha(mostrarDetalle.fecha_inicio_plan)}
                      </div>
                      <div className="col-md-6">
                        <strong>Semana Actual:</strong> {mostrarDetalle.semana_actual || 1}
                      </div>
                      <div className="col-md-6">
                        <strong>Estado:</strong> 
                        <span className={`badge bg-${getAlertaColor(mostrarDetalle.estado_alerta)} ms-2`}>
                          {mostrarDetalle.estado_alerta}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indicadores de Stock */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Indicadores de Stock</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="h4 text-danger">{mostrarDetalle.productos_criticos || 0}</div>
                          <small>Stock Crítico</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="h4 text-warning">{mostrarDetalle.productos_bajo_stock || 0}</div>
                          <small>Stock Bajo</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="h4 text-info">{mostrarDetalle.proximas_vacunas || 0}</div>
                          <small>Próximas Vacunas</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="text-center">
                          <div className="h4 text-success">{formatearPorcentaje(mostrarDetalle.cobertura_stock)}</div>
                          <small>Cobertura</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productos Críticos */}
                {mostrarDetalle.productos_detalle && mostrarDetalle.productos_detalle.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">Detalle de Productos</h6>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Producto</th>
                              <th>Stock Actual</th>
                              <th>Stock Mínimo</th>
                              <th>Necesario</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mostrarDetalle.productos_detalle.map((producto, index) => (
                              <tr key={index}>
                                <td>{producto.nombre}</td>
                                <td>{producto.stock_actual}</td>
                                <td>{producto.stock_minimo}</td>
                                <td>{producto.cantidad_necesaria}</td>
                                <td>
                                  <span className={`badge bg-${getAlertaColor(producto.estado)}`}>
                                    {producto.estado}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setMostrarDetalle(null)}
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => navigate(`/cotizaciones/${mostrarDetalle.id_cotizacion}`)}
                >
                  Ver Cotización
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicadoresStockPlan;