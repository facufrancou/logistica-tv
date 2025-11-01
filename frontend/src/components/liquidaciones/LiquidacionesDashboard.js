import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFileInvoice, 
  FaSearch,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaBuilding,
  FaBalanceScale,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEye,
  FaMoneyBillWave,
  FaPrint,
  FaFileExport,
  FaChevronDown,
  FaChevronUp,
  FaFileExcel
} from 'react-icons/fa';
import liquidacionesService from '../../services/liquidacionesService';
import './LiquidacionesDashboard.css';

// Helper para formatear precios
const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const LiquidacionesDashboard = () => {
  const navigate = useNavigate();
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    busqueda: '',
    numeroCotizacion: '',
    tipoVia: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [mostrarTodas, setMostrarTodas] = useState(false);

  useEffect(() => {
    cargarLiquidaciones();
  }, []);

  const cargarLiquidaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await liquidacionesService.obtenerTodasLiquidaciones(filtros);
      setLiquidaciones(data.resumenes || data.liquidaciones || []);
    } catch (error) {
      console.error('Error cargando liquidaciones:', error);
      setError(`Error al cargar las liquidaciones: ${error.message}`);
      setLiquidaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async () => {
    try {
      setExportando(true);
      await liquidacionesService.exportarExcel(filtros);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al exportar a Excel: ' + error.message);
    } finally {
      setExportando(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaDesde: '',
      fechaHasta: '',
      busqueda: '',
      numeroCotizacion: '',
      tipoVia: ''
    });
  };

  // Primero filtrar según los criterios
  const liquidacionesFiltradas = liquidaciones.filter(liq => {
    // Filtro por rango de fechas (normalizar a fecha sin hora)
    if (filtros.fechaDesde || filtros.fechaHasta) {
      // Convertir la fecha de la liquidación a formato YYYY-MM-DD en zona horaria local
      const fechaLiq = new Date(liq.fecha_generacion);
      const year = fechaLiq.getFullYear();
      const month = String(fechaLiq.getMonth() + 1).padStart(2, '0');
      const day = String(fechaLiq.getDate()).padStart(2, '0');
      const fechaLiqStr = `${year}-${month}-${day}`;
      
      if (filtros.fechaDesde && fechaLiqStr < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && fechaLiqStr > filtros.fechaHasta) return false;
    }

    // Filtro por búsqueda de cliente o cotización
    if (filtros.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase();
      const nombreCliente = liq.cotizacion?.cliente?.nombre?.toLowerCase() || '';
      const cuitCliente = liq.cotizacion?.cliente?.cuit?.toLowerCase() || '';
      const numeroCotizacion = liq.cotizacion?.numero_cotizacion?.toLowerCase() || '';
      
      if (!nombreCliente.includes(busquedaLower) && 
          !cuitCliente.includes(busquedaLower) && 
          !numeroCotizacion.includes(busquedaLower)) {
        return false;
      }
    }
    
    // Filtro por tipo de vía
    if (filtros.tipoVia === 'negro' && liq.totales.total_negro === 0) return false;
    if (filtros.tipoVia === 'blanco' && liq.totales.total_blanco === 0) return false;
    
    return true;
  });

  // Verificar si hay filtros activos
  const hayFiltrosActivos = filtros.fechaDesde || filtros.fechaHasta || filtros.busqueda || filtros.tipoVia;

  // Limitar a 10 resultados solo si NO hay filtros activos y NO se presionó "Ver todas"
  const liquidacionesParaMostrar = (!hayFiltrosActivos && !mostrarTodas) 
    ? liquidacionesFiltradas.slice(0, 10) 
    : liquidacionesFiltradas;

  const calcularTotales = () => {
    const total = liquidacionesParaMostrar.length;
    const totalCompleto = liquidacionesFiltradas.length;
    const totalNegro = liquidacionesParaMostrar.reduce((sum, liq) => sum + parseFloat(liq.totales.total_negro || 0), 0);
    const totalBlanco = liquidacionesParaMostrar.reduce((sum, liq) => sum + parseFloat(liq.totales.total_blanco || 0), 0);
    const totalGeneral = liquidacionesParaMostrar.reduce((sum, liq) => sum + parseFloat(liq.totales.total_general || 0), 0);
    
    return { total, totalCompleto, totalNegro, totalBlanco, totalGeneral, hayFiltros: hayFiltrosActivos };
  };

  const totales = calcularTotales();

  if (loading) {
    return (
      <div className="stock-loading">
        <div className="stock-spinner"></div>
        <p>Cargando liquidaciones...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header con estilo consistente */}
      <div className="card mb-3 shadow-sm" style={{ backgroundColor: 'var(--color-principal)' }}>
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 text-white">
              <FaBalanceScale className="me-2" />
              Dashboard de Liquidaciones
            </h4>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-light btn-sm"
                onClick={cargarLiquidaciones}
                disabled={loading}
              >
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                Actualizar
              </button>
              <button 
                className="btn btn-success btn-sm"
                onClick={exportarExcel}
                disabled={liquidaciones.length === 0 || exportando}
              >
                <FaFileExcel className="me-1" />
                {exportando ? 'Exportando...' : 'Exportar Excel'}
              </button>
              <button 
                className="btn btn-warning btn-sm"
                onClick={() => navigate('/liquidaciones/pendientes')}
              >
                <FaExclamationTriangle className="me-1" />
                Pendientes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">
            <FaFilter className="me-2" />
            Filtros de Búsqueda
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small">Fecha Desde</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Fecha Hasta</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Buscar Cliente o Cotización</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre de cliente, CUIT..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small">Tipo de Vía</label>
              <select 
                className="form-select"
                value={filtros.tipoVia}
                onChange={(e) => setFiltros({...filtros, tipoVia: e.target.value})}
              >
                <option value="">Todas</option>
                <option value="negro">Solo Vía 2 (Negro)</option>
                <option value="blanco">Solo Vía 1 (Blanco)</option>
              </select>
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button 
                className="btn btn-secondary w-100"
                onClick={limpiarFiltros}
                title="Limpiar filtros"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Liquidaciones */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <FaFileInvoice className="me-2" />
              Liquidaciones Generadas
              {totales.hayFiltros && (
                <span className="badge bg-info ms-2">
                  {totales.total} resultados
                </span>
              )}
              {!totales.hayFiltros && !mostrarTodas && totales.totalCompleto > 10 && (
                <span className="badge bg-secondary ms-2">
                  Mostrando {totales.total} de {totales.totalCompleto}
                </span>
              )}
            </h5>
          </div>
          <div className="text-muted">
            <small>
              Total mostrado: <strong>{liquidacionesService.formatearPrecio(totales.totalGeneral)}</strong>
            </small>
          </div>
        </div>
        <div className="card-body p-0">
          {error ? (
            <div className="alert alert-danger m-4">
              <FaExclamationTriangle className="me-2" />
              {error}
              <button 
                className="btn btn-sm btn-outline-danger ms-3"
                onClick={cargarLiquidaciones}
              >
                Reintentar
              </button>
            </div>
          ) : liquidacionesParaMostrar.length === 0 ? (
            <div className="text-center p-5">
              <FaFileInvoice className="fa-4x text-muted mb-3" />
              <h5 className="text-muted">No hay liquidaciones generadas</h5>
              <p className="text-muted mb-4">
                Las liquidaciones aparecerán aquí cuando se clasifiquen las cotizaciones aceptadas.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/liquidaciones/pendientes')}
              >
                <FaExclamationTriangle className="me-2" />
                Ver Cotizaciones Pendientes
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th style={{width: '120px'}}>
                        <FaCalendarAlt className="me-2" />
                        Fecha
                      </th>
                      <th style={{width: '140px'}}>Cotización</th>
                      <th>Cliente</th>
                      <th style={{width: '150px'}} className="text-center">
                        Vía 2 (Negro)
                      </th>
                      <th style={{width: '150px'}} className="text-center">
                        Vía 1 (Blanco)
                      </th>
                      <th style={{width: '150px'}} className="text-end">
                        Total General
                      </th>
                      <th style={{width: '120px'}} className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidacionesParaMostrar.map((liquidacion, index) => (
                      <React.Fragment key={index}>
                        <tr 
                          className={`${selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? 'table-active' : ''} ${index > 0 ? 'border-top border-3' : ''}`}
                          style={{cursor: 'pointer', borderColor: '#dee2e6'}}
                        >
                          <td onClick={() => setSelectedLiquidacion(
                            selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                          )}>
                            <div className="d-flex align-items-center">
                              <div>
                                <div className="fw-bold">
                                  {new Date(liquidacion.fecha_generacion).toLocaleDateString('es-AR')}
                                </div>
                                <small className="text-muted">
                                  {new Date(liquidacion.fecha_generacion).toLocaleTimeString('es-AR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td onClick={() => setSelectedLiquidacion(
                            selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                          )}>
                            <span className="badge bg-primary fs-6">
                              {liquidacion.cotizacion.numero_cotizacion}
                            </span>
                          </td>
                          <td onClick={() => setSelectedLiquidacion(
                            selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                          )}>
                            <div>
                              <div className="fw-bold text-dark">
                                <FaBuilding className="me-2 text-primary" />
                                {liquidacion.cotizacion.cliente.nombre}
                              </div>
                              <small className="text-muted">
                                CUIT: {liquidacion.cotizacion.cliente.cuit}
                              </small>
                            </div>
                          </td>
                          <td className="text-center" onClick={() => setSelectedLiquidacion(
                            selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                          )}>
                            <div>
                              <span className="badge bg-dark fs-6 mb-1">
                                {liquidacionesService.formatearPrecio(liquidacion.totales.total_negro)}
                              </span>
                              <div>
                                <span className="badge bg-secondary">
                                  {liquidacion.totales.porcentaje_negro.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-center" onClick={() => setSelectedLiquidacion(
                            selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                          )}>
                            <div>
                              <span className="badge bg-light text-dark border fs-6 mb-1">
                                {liquidacionesService.formatearPrecio(liquidacion.totales.total_blanco)}
                              </span>
                              <div>
                                <span className="badge bg-secondary">
                                  {liquidacion.totales.porcentaje_blanco.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-end" onClick={() => setSelectedLiquidacion(
                            selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                          )}>
                            <span className="fw-bold text-success fs-5">
                              {liquidacionesService.formatearPrecio(liquidacion.totales.total_general)}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm">
                              <button
                                className={`btn ${selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setSelectedLiquidacion(
                                  selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? null : liquidacion
                                )}
                                title={selectedLiquidacion?.id_resumen === liquidacion.id_resumen ? 'Ocultar detalle' : 'Ver detalle'}
                              >
                                <FaEye />
                              </button>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => {
                                  console.log('Navegando a cotización:', liquidacion.cotizacion.id_cotizacion);
                                  console.log('Liquidación completa:', liquidacion);
                                  navigate(`/cotizaciones/${liquidacion.cotizacion.id_cotizacion}`);
                                }}
                                title="Ver cotización completa"
                              >
                                <FaFileInvoice />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {selectedLiquidacion?.id_resumen === liquidacion.id_resumen && (
                          <tr className="border-bottom border-3" style={{borderColor: '#0d6efd'}}>
                            <td colSpan="7" className="p-0">
                              <div className="bg-light border-start border-end border-4 border-primary" style={{margin: '0 10px'}}>
                                <div className="table-responsive p-3">
                                  <table className="table table-sm mb-0 table-bordered">
                                    <thead className="table-dark">
                                      <tr>
                                        <th style={{width: '50%'}}>Producto</th>
                                        <th className="text-center" style={{width: '10%'}}>Cantidad</th>
                                        <th className="text-end" style={{width: '15%'}}>Precio Unit.</th>
                                        <th className="text-end" style={{width: '15%'}}>Subtotal</th>
                                        <th className="text-center" style={{width: '10%'}}>Tipo Fact.</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {liquidacion.detalle_items && liquidacion.detalle_items.length > 0 ? (
                                        liquidacion.detalle_items.map((item, idx) => (
                                          <tr key={idx}>
                                            <td>
                                              <div className="fw-semibold">{item.nombre_producto}</div>
                                              {item.laboratorio && (
                                                <small className="text-muted">Lab: {item.laboratorio}</small>
                                              )}
                                            </td>
                                            <td className="text-center">
                                              <span className="badge bg-secondary">{item.cantidad}</span>
                                            </td>
                                            <td className="text-end">
                                              {liquidacionesService.formatearPrecio(item.precio_unitario)}
                                            </td>
                                            <td className="text-end fw-semibold">
                                              {liquidacionesService.formatearPrecio(item.subtotal)}
                                            </td>
                                            <td className="text-center">
                                              <span className={`badge ${item.tipo_facturacion === 'negro' ? 'bg-dark' : 'bg-light text-dark border'}`}>
                                                {item.tipo_facturacion === 'negro' ? 'Vía 2' : 'Vía 1'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan="5" className="text-center text-muted py-3">
                                            No hay items en esta liquidación
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Botón Ver Todas si hay más de 10 y no hay filtros */}
              {!hayFiltrosActivos && !mostrarTodas && totales.totalCompleto > 10 && (
                <div className="text-center p-3 border-top">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => setMostrarTodas(true)}
                  >
                    Ver todas las liquidaciones ({totales.totalCompleto - 10} más)
                  </button>
                </div>
              )}

              {/* Resumen total al pie */}
              <div className="card-footer bg-light">
                <div className="row text-center">
                  <div className="col-md-4">
                    <div className="p-2">
                      <small className="text-muted d-block mb-1">Total Vía 2 (Negro)</small>
                      <h5 className="mb-0 text-dark">
                        {liquidacionesService.formatearPrecio(
                          liquidacionesParaMostrar.reduce((sum, liq) => sum + parseFloat(liq.totales.total_negro || 0), 0)
                        )}
                      </h5>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-2">
                      <small className="text-muted d-block mb-1">Total Vía 1 (Blanco)</small>
                      <h5 className="mb-0 text-dark">
                        {liquidacionesService.formatearPrecio(
                          liquidacionesParaMostrar.reduce((sum, liq) => sum + parseFloat(liq.totales.total_blanco || 0), 0)
                        )}
                      </h5>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-2 border-start">
                      <small className="text-muted d-block mb-1">Total General</small>
                      <h4 className="mb-0 text-success">
                        {liquidacionesService.formatearPrecio(
                          liquidacionesParaMostrar.reduce((sum, liq) => sum + parseFloat(liq.totales.total_general || 0), 0)
                        )}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiquidacionesDashboard;