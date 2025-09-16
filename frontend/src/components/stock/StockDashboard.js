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
  getMovimientosStock,
  getReservasStock,
  liberarReserva 
} from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const StockDashboard = () => {
  const [estadoStock, setEstadoStock] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [movimientosRecientes, setMovimientosRecientes] = useState([]);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    mostrarSoloControladoStock: false,
    estadoStock: ''
  });
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar estado de stock
      const filtroEstado = filtros.mostrarSoloControladoStock ? 
        { requiere_control_stock: true } : {};
      
      const [stockData, alertasData, movimientosData, reservasData] = await Promise.all([
        getEstadoStock(filtroEstado),
        getAlertasStock(),
        getMovimientosStock({ fecha_desde: getFecha7DiasAtras() }),
        getReservasStock({ estado_reserva: 'activa' })
      ]);
      
      let stockFiltrado = stockData;
      if (filtros.estadoStock) {
        stockFiltrado = stockData.filter(item => item.estado_stock === filtros.estadoStock);
      }
      
      setEstadoStock(stockFiltrado);
      setAlertas(alertasData);
      setMovimientosRecientes(movimientosData.slice(0, 10)); // Últimos 10 movimientos
      setReservasActivas(reservasData.slice(0, 5)); // Últimas 5 reservas activas
      
    } catch (error) {
      console.error('Error cargando datos de stock:', error);
      showError('Error', 'No se pudieron cargar los datos de stock');
    } finally {
      setLoading(false);
    }
  };

  const getFecha7DiasAtras = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 7);
    return fecha.toISOString().split('T')[0];
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

  const getTipoMovimientoBadge = (tipo) => {
    const tipos = {
      'ingreso': { class: 'bg-success', text: 'Ingreso' },
      'egreso': { class: 'bg-danger', text: 'Egreso' },
      'ajuste_positivo': { class: 'bg-info', text: 'Ajuste +' },
      'ajuste_negativo': { class: 'bg-warning', text: 'Ajuste -' },
      'reserva': { class: 'bg-primary', text: 'Reserva' },
      'liberacion_reserva': { class: 'bg-secondary', text: 'Liberación' }
    };
    return tipos[tipo] || { class: 'bg-secondary', text: tipo };
  };

  const calcularTotales = () => {
    const total = estadoStock.length;
    const criticos = estadoStock.filter(item => item.estado_stock === 'critico').length;
    const bajos = estadoStock.filter(item => item.estado_stock === 'bajo').length;
    const normales = estadoStock.filter(item => item.estado_stock === 'normal').length;
    
    return { total, criticos, bajos, normales };
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
                  <h6 className="card-title text-white">Total Productos</h6>
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
                  <h6 className="card-title text-white">Stock Crítico</h6>
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
                  <h6 className="card-title text-dark">Stock Bajo</h6>
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
                  <h6 className="card-title text-white">Stock Normal</h6>
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
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-dark">
                <FaWarehouse className="me-2" />
                Estado de Stock
              </h5>
              <div className="d-flex gap-2">
                <select 
                  className="form-select form-select-sm"
                  value={filtros.estadoStock}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estadoStock: e.target.value }))}
                  style={{ width: 'auto' }}
                >
                  <option value="">Todos los estados</option>
                  <option value="critico">Crítico</option>
                  <option value="bajo">Bajo</option>
                  <option value="normal">Normal</option>
                  <option value="alto">Alto</option>
                </select>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="soloControlados"
                    checked={filtros.mostrarSoloControladoStock}
                    onChange={(e) => setFiltros(prev => ({ ...prev, mostrarSoloControladoStock: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="soloControlados">
                    Solo controlados
                  </label>
                </div>
              </div>
            </div>
            <div className="card-body">
              {estadoStock.length === 0 ? (
                <div className="text-center py-4">
                  <FaBoxOpen className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                  <h5 className="text-muted">No hay productos</h5>
                  <p className="text-muted">No se encontraron productos con los filtros aplicados</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Stock Actual</th>
                        <th>Stock Mínimo</th>
                        <th>Reservado</th>
                        <th>Disponible</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadoStock.map((item) => {
                        const estadoBadge = getEstadoStockBadge(item.estado_stock);
                        return (
                          <tr key={item.id_producto}>
                            <td>
                              <strong>{item.nombre}</strong>
                              {!item.requiere_control_stock && (
                                <small className="d-block text-muted">Sin control de stock</small>
                              )}
                            </td>
                            <td>
                              <span className="fw-bold">{item.stock}</span>
                            </td>
                            <td>{item.stock_minimo}</td>
                            <td>
                              {item.stock_reservado > 0 ? (
                                <span className="text-warning fw-bold">{item.stock_reservado}</span>
                              ) : (
                                <span className="text-muted">0</span>
                              )}
                            </td>
                            <td>
                              <span className="fw-bold text-success">{item.stock_disponible}</span>
                            </td>
                            <td>
                              <span className={`badge ${estadoBadge.class}`}>
                                {estadoBadge.text}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group">
                                <Link
                                  to={`/stock/producto/${item.id_producto}`}
                                  className="btn btn-sm btn-outline-primary"
                                  title="Ver detalles"
                                >
                                  <FaChartBar />
                                </Link>
                                <Link
                                  to={`/stock/movimientos/nuevo?producto=${item.id_producto}`}
                                  className="btn btn-sm btn-outline-success"
                                  title="Registrar movimiento"
                                >
                                  <FaPlus />
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

        {/* Movimientos Recientes */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0 text-dark">
                <FaList className="me-2" />
                Movimientos Recientes
              </h5>
            </div>
            <div className="card-body">
              {movimientosRecientes.length === 0 ? (
                <div className="text-center py-4">
                  <FaList className="text-muted mb-2" style={{ fontSize: '2rem' }} />
                  <p className="text-muted">No hay movimientos recientes</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {movimientosRecientes.map((movimiento, index) => {
                    const tipoBadge = getTipoMovimientoBadge(movimiento.tipo_movimiento);
                    return (
                      <div key={index} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{movimiento.producto?.nombre}</h6>
                            <p className="mb-1 small">
                              <span className={`badge ${tipoBadge.class} me-2`}>
                                {tipoBadge.text}
                              </span>
                              Cantidad: {movimiento.cantidad}
                            </p>
                            <small className="text-muted">
                              {new Date(movimiento.created_at).toLocaleDateString('es-ES')}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {movimientosRecientes.length > 0 && (
                <div className="text-center mt-3">
                  <Link to="/stock/movimientos" className="btn btn-sm btn-outline-primary">
                    Ver todos los movimientos
                  </Link>
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