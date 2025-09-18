import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaWarehouse, 
  FaExclamationTriangle, 
  FaPlus, 
  FaList, 
  FaChartBar,
  FaBoxOpen,
  FaSync,
  FaFilter
} from 'react-icons/fa';
import { 
  getEstadoStock, 
  getAlertasStock, 
  getReservasStock,
  liberarReserva 
} from '../../services/stock/stockApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

// Helper function para formatear números con separador de miles
const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const StockDashboard = () => {
  const [estadoStock, setEstadoStock] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    mostrarSoloControladoStock: false,
    estadoStock: '',
    tipoProducto: ''
  });
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar estado de stock
      const filtroEstado = {};
      if (filtros.mostrarSoloControladoStock) {
        filtroEstado.requiere_control_stock = true;
      }
      if (filtros.tipoProducto) {
        filtroEstado.tipo_producto = filtros.tipoProducto;
      }
      
      const [stockData, alertasData, reservasData] = await Promise.all([
        getEstadoStock(filtroEstado),
        getAlertasStock(filtros.tipoProducto ? { tipo_producto: filtros.tipoProducto } : {}),
        getReservasStock({ estado_reserva: 'activa' })
      ]);
      
      // Los datos ya vienen filtrados del backend por tipo_producto y requiere_control_stock
      // Solo aplicamos filtro adicional de estado si está especificado
      let stockFiltrado = stockData;
      if (filtros.estadoStock) {
        stockFiltrado = stockData.filter(item => item.estado_stock === filtros.estadoStock);
      }
      
      setEstadoStock(stockFiltrado);
      setAlertas(alertasData);
      setReservasActivas(reservasData.slice(0, 5)); // Últimas 5 reservas activas
      
    } catch (error) {
      console.error('Error cargando datos de stock:', error);
      showError('Error', 'No se pudieron cargar los datos de stock');
    } finally {
      setLoading(false);
    }
  };

  const getTipoProductoBadge = (tipo) => {
    const tipos = {
      'vacuna': { class: 'bg-success', text: 'Vacuna', icon: '💉' },
      'medicamento': { class: 'bg-primary', text: 'Medicamento', icon: '💊' },
      'suplemento': { class: 'bg-info', text: 'Suplemento', icon: '🧪' },
      'insecticida': { class: 'bg-warning', text: 'Insecticida', icon: '🦟' },
      'desinfectante': { class: 'bg-secondary', text: 'Desinfectante', icon: '🧽' },
      'otros': { class: 'bg-dark', text: 'Otros', icon: '📦' }
    };
    return tipos[tipo] || { class: 'bg-secondary', text: tipo, icon: '📦' };
  };

  const getEstadoStockBadge = (estado) => {
    const estados = {
      'critico': { class: 'bg-danger', text: 'Crítico' },
      'bajo': { class: 'bg-warning', text: 'Bajo' },
      'normal': { class: 'bg-success', text: 'Normal' },
      'alto': { class: 'bg-info', text: 'Alto' }
    };
    return estados[estado] || { class: 'bg-secondary', text: estado };
  };

  const calcularTotales = () => {
    const total = estadoStock.length;
    const criticos = estadoStock.filter(item => item.estado_stock === 'critico').length;
    const bajos = estadoStock.filter(item => item.estado_stock === 'bajo').length;
    const normales = estadoStock.filter(item => item.estado_stock === 'normal').length;
    
    // Determinar si hay filtros activos
    const hayFiltros = filtros.tipoProducto || filtros.estadoStock || filtros.mostrarSoloControladoStock;
    
    return { total, criticos, bajos, normales, hayFiltros };
  };

  const handleLiberarReserva = async (idReserva, nombreProducto) => {
    if (window.confirm(`¿Está seguro que desea liberar la reserva para ${nombreProducto}?`)) {
      try {
        const motivo = prompt('Motivo de liberación (opcional):');
        await liberarReserva(idReserva, motivo);
        showSuccess('Éxito', 'Reserva liberada correctamente');
        cargarDatos(); // Recargar datos
      } catch (error) {
        console.error('Error liberando reserva:', error);
        showError('Error', 'No se pudo liberar la reserva');
      }
    }
  };

  const totales = calcularTotales();

  if (loading) {
    return (
      <div className="stock-loading">
        <div className="stock-spinner"></div>
        <p>Cargando información de stock...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaWarehouse className="me-2 text-primary" />
            <h3 className="mb-0 text-dark">Gestión de Stock</h3>
          </div>
          <div className="d-flex gap-2">
            <Link to="/stock/movimientos/nuevo" className="btn btn-primary d-flex align-items-center">
              <FaPlus className="me-2" />
              Registrar Movimiento
            </Link>
            <Link to="/stock/movimientos" className="btn btn-outline-primary d-flex align-items-center">
              <FaList className="me-2" />
              Ver Movimientos
            </Link>
            <button 
              className="btn btn-outline-secondary d-flex align-items-center"
              onClick={cargarDatos}
            >
              <FaSync className="me-2" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card stats-card primary">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-white">
                    Total Productos
                    {totales.hayFiltros && <small className="d-block">(filtrados)</small>}
                  </h6>
                  <h4 className="text-white">{totales.total}</h4>
                </div>
                <FaBoxOpen style={{ fontSize: '2rem', opacity: 0.7, color: 'white' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card danger">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-white">
                    Stock Crítico
                    {totales.hayFiltros && <small className="d-block">(filtrados)</small>}
                  </h6>
                  <h4 className="text-white">{totales.criticos}</h4>
                </div>
                <FaExclamationTriangle style={{ fontSize: '2rem', opacity: 0.7, color: 'white' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card warning">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-dark">
                    Stock Bajo
                    {totales.hayFiltros && <small className="d-block">(filtrados)</small>}
                  </h6>
                  <h4 className="text-dark">{totales.bajos}</h4>
                </div>
                <FaExclamationTriangle style={{ fontSize: '2rem', opacity: 0.7, color: '#212529' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card success">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-white">
                    Stock Normal
                    {totales.hayFiltros && <small className="d-block">(filtrados)</small>}
                  </h6>
                  <h4 className="text-white">{totales.normales}</h4>
                </div>
                <FaChartBar style={{ fontSize: '2rem', opacity: 0.7, color: 'white' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Alertas */}
      {alertas.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0 text-dark">
              <FaExclamationTriangle className="me-2 text-warning" />
              Alertas de Stock Bajo ({alertas.length})
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              {alertas.slice(0, 6).map((alerta) => (
                <div key={alerta.id_producto} className="col-md-4 mb-3">
                  <div className="alert alert-warning d-flex justify-content-between align-items-center">
                    <div>
                      <strong className="text-dark">{alerta.nombre}</strong>
                      <div className="small text-dark">
                        Stock: {alerta.stock} | Mínimo: {alerta.stock_minimo}
                      </div>
                    </div>
                    <Link 
                      to={`/stock/producto/${alerta.id_producto}`}
                      className="btn btn-sm btn-outline-warning"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {alertas.length > 6 && (
              <div className="text-center">
                <Link to="/stock/alertas" className="btn btn-warning">
                  Ver todas las alertas ({alertas.length})
                </Link>
              </div>
            )}
          </div>
        </div>
      )}      <div className="row">
        {/* Estado de Stock */}
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 text-dark">
                  <FaWarehouse className="me-2" />
                  Estado de Stock
                </h5>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <select 
                  className="form-select form-select-sm"
                  value={filtros.tipoProducto}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipoProducto: e.target.value }))}
                  style={{ width: '160px' }}
                >
                  <option value="">Todos los tipos</option>
                  <option value="vacuna">💉 Solo Vacunas</option>
                  <option value="medicamento">💊 Solo Medicamentos</option>
                  <option value="suplemento">🧪 Solo Suplementos</option>
                  <option value="insecticida">🦟 Solo Insecticidas</option>
                  <option value="desinfectante">🧽 Solo Desinfectantes</option>
                  <option value="otros">📦 Otros</option>
                </select>
                <select 
                  className="form-select form-select-sm"
                  value={filtros.estadoStock}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estadoStock: e.target.value }))}
                  style={{ width: '150px' }}
                >
                  <option value="">Todos los estados</option>
                  <option value="critico">🔴 Crítico</option>
                  <option value="bajo">🟡 Bajo</option>
                  <option value="normal">🟢 Normal</option>
                  <option value="alto">🔵 Alto</option>
                </select>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="soloControlados"
                    checked={filtros.mostrarSoloControladoStock}
                    onChange={(e) => setFiltros(prev => ({ ...prev, mostrarSoloControladoStock: e.target.checked }))}
                  />
                  <label className="form-check-label text-nowrap" htmlFor="soloControlados">
                    📊 Solo con control de stock
                  </label>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {estadoStock.length === 0 ? (
                <div className="text-center py-4">
                  <FaBoxOpen className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                  <h5 className="text-muted">No hay productos</h5>
                  <p className="text-muted">No se encontraron productos con los filtros aplicados</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-hover table-sm" style={{ minWidth: '1000px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%', minWidth: '150px' }}>Producto</th>
                        <th style={{ width: '10%', minWidth: '80px' }}>Tipo</th>
                        <th style={{ width: '8%', minWidth: '70px' }}>Stock Mínimo</th>
                        <th style={{ width: '8%', minWidth: '70px' }}>Reservado</th>
                        <th style={{ width: '8%', minWidth: '70px' }}>Afectado</th>
                        <th style={{ width: '8%', minWidth: '70px' }}>Faltante</th>
                        <th style={{ width: '10%', minWidth: '80px' }}>Disponible</th>
                        <th style={{ width: '8%', minWidth: '70px' }}>Total</th>
                        <th style={{ width: '10%', minWidth: '80px' }}>Estado</th>
                        <th style={{ width: '15%', minWidth: '120px' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadoStock.map((item) => {
                        const estadoBadge = getEstadoStockBadge(item.estado_stock);
                        const tipoBadge = getTipoProductoBadge(item.tipo_producto);
                        return (
                          <tr key={item.id_producto}>
                            <td>
                              <div>
                                <strong>{item.nombre}</strong>
                                {item.descripcion && (
                                  <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                                    {item.descripcion}
                                  </small>
                                )}
                                {!item.requiere_control_stock && (
                                  <small className="d-block text-warning" style={{ fontSize: '0.7rem' }}>
                                    Sin control de stock
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${tipoBadge.class}`}>
                                {tipoBadge.icon} {tipoBadge.text}
                              </span>
                            </td>
                            <td>{formatNumber(item.stock_minimo)}</td>
                            <td>
                              {item.stock_reservado > 0 ? (
                                <span className="text-warning fw-bold">{formatNumber(item.stock_reservado)}</span>
                              ) : (
                                <span className="text-muted">0</span>
                              )}
                            </td>
                            <td>
                              {item.stock_afectado > 0 ? (
                                <span className="text-info fw-bold">{formatNumber(item.stock_afectado)}</span>
                              ) : (
                                <span className="text-muted">0</span>
                              )}
                            </td>
                            <td>
                              {item.stock_faltante > 0 ? (
                                <span className="text-danger fw-bold">{formatNumber(item.stock_faltante)}</span>
                              ) : (
                                <span className="text-muted">0</span>
                              )}
                            </td>
                            <td>
                              <span className="fw-bold text-success">{formatNumber(item.stock_disponible)}</span>
                            </td>
                            <td>
                              <span className="fw-bold">{formatNumber(item.stock)}</span>
                            </td>
                            <td>
                              <span className={`badge ${estadoBadge.class}`}>
                                {estadoBadge.text}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <Link
                                  to={`/stock/producto/${item.id_producto}`}
                                  className="btn btn-xs btn-outline-primary"
                                  title="Ver detalles"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                                >
                                  <FaChartBar size={12} />
                                </Link>
                                <Link
                                  to={`/stock/movimientos/nuevo?producto=${item.id_producto}`}
                                  className="btn btn-xs btn-outline-success"
                                  title="Registrar movimiento"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                                >
                                  <FaPlus size={12} />
                                </Link>
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
        </div>
      </div>

      {/* Reservas Activas */}
      {reservasActivas.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-dark">
                  <FaBoxOpen className="me-2 text-info" />
                  Reservas Activas ({reservasActivas.length})
                </h5>
                <Link to="/stock/reservas" className="btn btn-sm btn-outline-info">
                  Ver todas las reservas
                </Link>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad Reservada</th>
                        <th>Cotización</th>
                        <th>Fecha Creación</th>
                        <th>Vencimiento</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservasActivas.map((reserva) => (
                        <tr key={reserva.id_reserva}>
                          <td>
                            <strong>{reserva.producto?.nombre}</strong>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {reserva.cantidad_reservada}
                            </span>
                          </td>
                          <td>
                            <Link 
                              to={`/cotizaciones/${reserva.id_cotizacion}`}
                              className="text-decoration-none"
                            >
                              COT-{reserva.id_cotizacion}
                            </Link>
                          </td>
                          <td>
                            <small className="text-muted">
                              {new Date(reserva.created_at).toLocaleDateString('es-ES')}
                            </small>
                          </td>
                          <td>
                            {reserva.fecha_vencimiento ? (
                              <small className={
                                new Date(reserva.fecha_vencimiento) < new Date() 
                                  ? 'text-danger' 
                                  : 'text-muted'
                              }>
                                {new Date(reserva.fecha_vencimiento).toLocaleDateString('es-ES')}
                              </small>
                            ) : (
                              <small className="text-muted">Sin vencimiento</small>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => handleLiberarReserva(reserva.id_reserva, reserva.producto?.nombre)}
                              title="Liberar reserva"
                            >
                              Liberar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDashboard;