import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFileInvoice, 
  FaSearch,
  FaFilter,
  FaDownload,
  FaChartBar,
  FaCalendarAlt,
  FaBuilding,
  FaMoneyBillWave,
  FaEye,
  FaBalanceScale,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import liquidacionesService from '../../services/liquidacionesService';
import ResumenLiquidacion from './ResumenLiquidacion';
import './LiquidacionesDashboard.css';

const LiquidacionesDashboard = () => {
  const navigate = useNavigate();
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    cliente: '',
    estado: 'todas'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    total_liquidaciones: 0,
    total_negro: 0,
    total_blanco: 0,
    total_general: 0,
    cotizaciones_pendientes: 0
  });

  useEffect(() => {
    cargarLiquidaciones();
    cargarEstadisticas();
  }, []);

  const cargarLiquidaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await liquidacionesService.obtenerTodasLiquidaciones();
      setLiquidaciones(data.liquidaciones || []);
    } catch (error) {
      console.error('Error cargando liquidaciones:', error);
      setError('Error al cargar las liquidaciones');
      setLiquidaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const data = await liquidacionesService.obtenerEstadisticas();
      setEstadisticas(data.estadisticas || {});
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    // Implementar filtrado local o llamada a API con filtros
    cargarLiquidaciones();
  };

  const exportarTodas = async () => {
    try {
      const data = await liquidacionesService.exportarLiquidaciones(filtros);
      
      // Crear archivo CSV
      const contenidoCSV = [
        ['Fecha', 'Cotización', 'Cliente', 'CUIT', 'Total Negro', 'Total Blanco', 'Total General'].join(','),
        ...data.liquidaciones.map(liq => [
          new Date(liq.fecha_generacion).toLocaleDateString('es-AR'),
          liq.cotizacion.numero_cotizacion,
          liq.cotizacion.cliente.nombre,
          liq.cotizacion.cliente.cuit,
          liq.totales.total_negro,
          liq.totales.total_blanco,
          liq.totales.total_general
        ].join(','))
      ].join('\n');

      const blob = new Blob([contenidoCSV], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liquidaciones_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando liquidaciones:', error);
    }
  };

  const liquidacionesFiltradas = liquidaciones.filter(liq => {
    const fechaLiq = new Date(liq.fecha_generacion);
    const fechaDesde = filtros.fechaDesde ? new Date(filtros.fechaDesde) : null;
    const fechaHasta = filtros.fechaHasta ? new Date(filtros.fechaHasta) : null;
    
    if (fechaDesde && fechaLiq < fechaDesde) return false;
    if (fechaHasta && fechaLiq > fechaHasta) return false;
    if (filtros.cliente && !liq.cotizacion.cliente.nombre.toLowerCase().includes(filtros.cliente.toLowerCase())) return false;
    
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">
            <FaBalanceScale className="me-2 text-primary" />
            Dashboard de Liquidaciones
          </h2>
          <small className="text-muted">Gestión de clasificación fiscal y liquidaciones</small>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={cargarLiquidaciones}
            disabled={loading}
          >
            <FaSync className={loading ? 'fa-spin' : ''} />
          </button>
          <button 
            className="btn btn-success"
            onClick={exportarTodas}
            disabled={liquidaciones.length === 0}
          >
            <FaDownload className="me-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <FaFileInvoice className="fa-2x mb-2" />
              <h4>{estadisticas.total_liquidaciones}</h4>
              <p className="mb-0">Total Liquidaciones</p>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-dark text-white">
            <div className="card-body text-center">
              <FaMoneyBillWave className="fa-2x mb-2" />
              <h4>{liquidacionesService.formatearPrecio(estadisticas.total_negro)}</h4>
              <p className="mb-0">Total Negro</p>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-secondary text-white">
            <div className="card-body text-center">
              <FaMoneyBillWave className="fa-2x mb-2" />
              <h4>{liquidacionesService.formatearPrecio(estadisticas.total_blanco)}</h4>
              <p className="mb-0">Total Blanco</p>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <FaExclamationTriangle className="fa-2x mb-2" />
              <h4>{estadisticas.cotizaciones_pendientes}</h4>
              <p className="mb-0">Pendientes Clasificar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">
            <FaFilter className="me-2" />
            Filtros
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Fecha Desde</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha Hasta</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre de cliente..."
                value={filtros.cliente}
                onChange={(e) => setFiltros({...filtros, cliente: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">&nbsp;</label>
              <button 
                className="btn btn-primary d-block w-100"
                onClick={aplicarFiltros}
              >
                <FaSearch className="me-2" />
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Liquidaciones */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Liquidaciones Generadas</h6>
              <span className="badge bg-primary">{liquidacionesFiltradas.length} registros</span>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2">Cargando liquidaciones...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger m-3">
                  <FaExclamationTriangle className="me-2" />
                  {error}
                </div>
              ) : liquidacionesFiltradas.length === 0 ? (
                <div className="text-center p-4">
                  <FaFileInvoice className="fa-3x text-muted mb-3" />
                  <h5 className="text-muted">No hay liquidaciones generadas</h5>
                  <p className="text-muted">Las liquidaciones aparecerán aquí cuando se clasifiquen las cotizaciones aceptadas.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Fecha</th>
                        <th>Cotización</th>
                        <th>Cliente</th>
                        <th>Total Negro</th>
                        <th>Total Blanco</th>
                        <th>Total General</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liquidacionesFiltradas.map((liquidacion, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaCalendarAlt className="text-muted me-2" />
                              {new Date(liquidacion.fecha_generacion).toLocaleDateString('es-AR')}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {liquidacion.cotizacion.numero_cotizacion}
                            </span>
                          </td>
                          <td>
                            <div>
                              <div className="fw-bold">{liquidacion.cotizacion.cliente.nombre}</div>
                              <small className="text-muted">{liquidacion.cotizacion.cliente.cuit}</small>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-dark">
                              {liquidacionesService.formatearPrecio(liquidacion.totales.total_negro)}
                            </span>
                            <div className="small text-muted">
                              {liquidacion.totales.porcentaje_negro.toFixed(1)}%
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {liquidacionesService.formatearPrecio(liquidacion.totales.total_blanco)}
                            </span>
                            <div className="small text-muted">
                              {liquidacion.totales.porcentaje_blanco.toFixed(1)}%
                            </div>
                          </td>
                          <td>
                            <span className="fw-bold text-success">
                              {liquidacionesService.formatearPrecio(liquidacion.totales.total_general)}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => setSelectedLiquidacion(
                                  selectedLiquidacion?.id_liquidacion === liquidacion.id_liquidacion 
                                    ? null 
                                    : liquidacion
                                )}
                                title="Ver detalle"
                              >
                                <FaEye />
                              </button>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => navigate(`/cotizaciones/${liquidacion.cotizacion.id_cotizacion}`)}
                                title="Ver cotización"
                              >
                                <FaFileInvoice />
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

        {/* Panel de detalle */}
        <div className="col-lg-4">
          {selectedLiquidacion ? (
            <ResumenLiquidacion 
              cotizacionId={selectedLiquidacion.cotizacion.id_cotizacion}
              mostrarDetalle={false}
            />
          ) : (
            <div className="card">
              <div className="card-body text-center">
                <FaChartBar className="fa-3x text-muted mb-3" />
                <h6 className="text-muted">Seleccione una liquidación</h6>
                <p className="text-muted small">
                  Haga clic en el botón "Ver detalle" de cualquier liquidación para mostrar su información completa.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiquidacionesDashboard;