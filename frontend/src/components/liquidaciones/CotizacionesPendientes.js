import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFileInvoice, 
  FaSearch,
  FaFilter,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCalendarAlt,
  FaBuilding,
  FaMoneyBillWave,
  FaBalanceScale,
  FaEye,
  FaClipboardList
} from 'react-icons/fa';
import './CotizacionesPendientes.css';

const CotizacionesPendientes = () => {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  useEffect(() => {
    cargarCotizacionesPendientes();
  }, []);

  const cargarCotizacionesPendientes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_BASE = "https://api.tierravolga.com.ar";
      
      // Obtener cotizaciones aceptadas
      const response = await fetch(`${API_BASE}/cotizaciones?estado=aceptada`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Cotizaciones aceptadas:', data);
      
      // Filtrar las que no tienen liquidación generada
      const cotizacionesSinLiquidacion = [];
      
      for (const cotizacion of data.cotizaciones || data || []) {
        try {
          // Verificar si ya tiene resumen de liquidación
          const resumenResponse = await fetch(
            `${API_BASE}/liquidaciones/cotizacion/${cotizacion.id_cotizacion}/resumen`,
            {
              credentials: "include",
              headers: { "Content-Type": "application/json" }
            }
          );

          // Si da 404, significa que no tiene liquidación
          if (resumenResponse.status === 404) {
            cotizacionesSinLiquidacion.push(cotizacion);
          }
        } catch (err) {
          // Si hay error, asumimos que no tiene liquidación
          cotizacionesSinLiquidacion.push(cotizacion);
        }
      }

      setCotizaciones(cotizacionesSinLiquidacion);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      setError(`Error al cargar cotizaciones: ${error.message}`);
      setCotizaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const irAClasificacion = (cotizacionId) => {
    navigate(`/cotizaciones/${cotizacionId}`);
  };

  const cotizacionesFiltradas = cotizaciones.filter(cot => {
    const cumpleBusqueda = !filtros.busqueda || 
      cot.numero_cotizacion?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      cot.cliente?.nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      cot.cliente?.cuit?.toLowerCase().includes(filtros.busqueda.toLowerCase());

    const fechaCot = new Date(cot.fecha_inicio_plan || cot.created_at);
    const fechaDesde = filtros.fechaDesde ? new Date(filtros.fechaDesde) : null;
    const fechaHasta = filtros.fechaHasta ? new Date(filtros.fechaHasta) : null;
    
    const cumpleFechaDesde = !fechaDesde || fechaCot >= fechaDesde;
    const cumpleFechaHasta = !fechaHasta || fechaCot <= fechaHasta;

    return cumpleBusqueda && cumpleFechaDesde && cumpleFechaHasta;
  });

  const formatearPrecio = (precio) => {
    if (typeof precio !== 'number') precio = parseFloat(precio) || 0;
    return `$${precio.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="container-fluid">
      {/* Header con estilo consistente */}
      <div className="card mb-3 shadow-sm" style={{ backgroundColor: 'var(--color-principal)' }}>
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1 text-white">
                <FaClipboardList className="me-2" />
                Cotizaciones Pendientes de Liquidar
              </h4>
              <small className="text-white opacity-75">
                Cotizaciones aceptadas que requieren clasificación fiscal
              </small>
            </div>
            <button 
              className="btn btn-light btn-sm"
              onClick={cargarCotizacionesPendientes}
              disabled={loading}
            >
              <FaSync className={loading ? 'fa-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas (eliminadas) */}

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
            <div className="col-md-4">
              <label className="form-label">Búsqueda</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nro. cotización, cliente o CUIT..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                />
              </div>
            </div>
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
            <div className="col-md-2">
              <label className="form-label">&nbsp;</label>
              <button 
                className="btn btn-secondary d-block w-100"
                onClick={() => setFiltros({ busqueda: '', fechaDesde: '', fechaHasta: '' })}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Cotizaciones */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Cotizaciones Listas para Liquidar</h6>
          <span className="badge bg-warning text-dark">
            {cotizacionesFiltradas.length} cotizaciones
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3">Cargando cotizaciones pendientes...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger m-3">
              <FaExclamationTriangle className="me-2" />
              {error}
              <button 
                className="btn btn-sm btn-outline-danger ms-3"
                onClick={cargarCotizacionesPendientes}
              >
                Reintentar
              </button>
            </div>
          ) : cotizacionesFiltradas.length === 0 ? (
            <div className="text-center p-5">
              <FaCheckCircle className="fa-4x text-success mb-3" />
              <h4 className="text-success">¡Excelente!</h4>
              <p className="text-muted">
                No hay cotizaciones pendientes de liquidar.
                <br />
                Todas las cotizaciones aceptadas ya tienen su liquidación generada.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Cotización</th>
                    <th>Cliente</th>
                    <th>Plan Vacunal</th>
                    <th>Fecha Inicio</th>
                    <th>Monto Total</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacionesFiltradas.map((cotizacion) => (
                    <tr key={cotizacion.id_cotizacion}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaFileInvoice className="text-primary me-2" />
                          <div>
                            <div className="fw-bold">{cotizacion.numero_cotizacion}</div>
                            <small className="text-muted">
                              ID: {cotizacion.id_cotizacion}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-bold">{cotizacion.cliente?.nombre || 'N/A'}</div>
                          <small className="text-muted">
                            <FaBuilding className="me-1" />
                            {cotizacion.cliente?.cuit || 'N/A'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div>{cotizacion.plan?.nombre || 'N/A'}</div>
                          <small className="text-muted">
                            {cotizacion.cantidad_animales || 0} animales
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-muted me-2" />
                          {cotizacion.fecha_inicio_plan 
                            ? new Date(cotizacion.fecha_inicio_plan).toLocaleDateString('es-AR')
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-success fs-6">
                          {formatearPrecio(cotizacion.precio_total)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning text-dark">
                          <FaExclamationTriangle className="me-1" />
                          Pendiente Liquidar
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => irAClasificacion(cotizacion.id_cotizacion)}
                          title="Ir a clasificar items"
                        >
                          <FaBalanceScale className="me-2" />
                          Liquidar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ayuda */}
      <div className="alert alert-info mt-4">
        <h6 className="alert-heading">
          <FaBalanceScale className="me-2" />
          ¿Cómo liquidar una cotización?
        </h6>
        <ol className="mb-0">
          <li>Haz clic en el botón <strong>"Liquidar"</strong> de la cotización que desees procesar</li>
          <li>En la vista de la cotización, ve a la pestaña <strong>"Clasificación Fiscal"</strong></li>
          <li>Clasifica cada item como <strong>"Vía 1 (Blanco)"</strong> o <strong>"Vía 2 (Negro)"</strong></li>
          <li>Una vez clasificados todos los items, genera el <strong>"Resumen de Liquidación"</strong></li>
          <li>La liquidación estará disponible en el Dashboard de Liquidaciones</li>
        </ol>
      </div>
    </div>
  );
};

export default CotizacionesPendientes;
