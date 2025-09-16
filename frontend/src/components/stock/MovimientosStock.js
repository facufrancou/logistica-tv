import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FaList, 
  FaPlus, 
  FaFilter, 
  FaSearch,
  FaArrowUp,
  FaArrowDown,
  FaSync,
  FaFileExport
} from 'react-icons/fa';
import { getMovimientosStock } from '../../services/planesVacunalesApi';
import { getProductos } from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const MovimientosStock = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams] = useSearchParams();
  
  const [filtros, setFiltros] = useState({
    id_producto: searchParams.get('producto') || '',
    tipo_movimiento: '',
    fecha_desde: '',
    fecha_hasta: '',
    busqueda: ''
  });

  const { showError } = useNotification();

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (filtros.id_producto || filtros.tipo_movimiento || filtros.fecha_desde || filtros.fecha_hasta) {
      aplicarFiltros();
    }
  }, [filtros.id_producto, filtros.tipo_movimiento, filtros.fecha_desde, filtros.fecha_hasta]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [movimientosData, productosData] = await Promise.all([
        getMovimientosStock(),
        getProductos()
      ]);
      
      setMovimientos(movimientosData);
      setProductos(productosData);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
      showError('Error', 'No se pudieron cargar los movimientos de stock');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      
      const filtrosActivos = {};
      if (filtros.id_producto) filtrosActivos.id_producto = filtros.id_producto;
      if (filtros.tipo_movimiento) filtrosActivos.tipo_movimiento = filtros.tipo_movimiento;
      if (filtros.fecha_desde) filtrosActivos.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) filtrosActivos.fecha_hasta = filtros.fecha_hasta;
      
      const movimientosData = await getMovimientosStock(filtrosActivos);
      setMovimientos(movimientosData);
    } catch (error) {
      console.error('Error aplicando filtros:', error);
      showError('Error', 'No se pudieron aplicar los filtros');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({ 
      id_producto: '', 
      tipo_movimiento: '', 
      fecha_desde: '', 
      fecha_hasta: '', 
      busqueda: '' 
    });
    cargarDatos();
  };

  const getTipoMovimientoBadge = (tipo) => {
    const tipos = {
      'ingreso': { class: 'bg-success', text: 'Ingreso', icon: <FaArrowUp /> },
      'egreso': { class: 'bg-danger', text: 'Egreso', icon: <FaArrowDown /> },
      'ajuste_positivo': { class: 'bg-info', text: 'Ajuste +', icon: <FaArrowUp /> },
      'ajuste_negativo': { class: 'bg-warning text-dark', text: 'Ajuste -', icon: <FaArrowDown /> },
      'reserva': { class: 'bg-primary', text: 'Reserva', icon: <FaSync /> },
      'liberacion_reserva': { class: 'bg-secondary', text: 'Liberación', icon: <FaSync /> }
    };
    return tipos[tipo] || { class: 'bg-secondary', text: tipo, icon: null };
  };

  // Filtrar por búsqueda de texto
  const movimientosFiltrados = movimientos.filter(movimiento => {
    if (!filtros.busqueda) return true;
    
    const termino = filtros.busqueda.toLowerCase();
    return (
      movimiento.producto?.nombre?.toLowerCase().includes(termino) ||
      movimiento.motivo?.toLowerCase().includes(termino) ||
      movimiento.observaciones?.toLowerCase().includes(termino)
    );
  });

  if (loading) {
    return (
      <div className="stock-loading">
        <div className="stock-spinner"></div>
        <p>Cargando movimientos de stock...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaList className="me-2 text-primary" />
            <h3 className="mb-0 text-dark">Movimientos de Stock</h3>
          </div>
          <div className="d-flex gap-2">
            <Link to="/stock/movimientos/nuevo" className="btn btn-primary d-flex align-items-center">
              <FaPlus className="me-2" />
              Nuevo Movimiento
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
          <div className="card-body stock-filters">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Buscar</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Producto, motivo..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label">Producto</label>
                <select
                  className="form-select"
                  value={filtros.id_producto}
                  onChange={(e) => setFiltros(prev => ({ ...prev, id_producto: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {productos.map((producto) => (
                    <option key={producto.id_producto} value={producto.id_producto}>
                      {producto.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={filtros.tipo_movimiento}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipo_movimiento: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="ajuste_positivo">Ajuste Positivo</option>
                  <option value="ajuste_negativo">Ajuste Negativo</option>
                  <option value="reserva">Reserva</option>
                  <option value="liberacion_reserva">Liberación Reserva</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Fecha Desde</label>
                <input
                  type="date"
                  className="form-control"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Fecha Hasta</label>
                <input
                  type="date"
                  className="form-control"
                  value={filtros.fecha_hasta}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                />
              </div>
              <div className="col-md-1 d-flex align-items-end">
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={limpiarFiltros}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Movimientos */}
      <div className="card">
        <div className="card-body">
          {movimientosFiltrados.length === 0 ? (
            <div className="text-center py-5">
              <FaList className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay movimientos</h5>
              <p className="text-muted">
                {filtros.busqueda || filtros.id_producto || filtros.tipo_movimiento || filtros.fecha_desde || filtros.fecha_hasta
                  ? 'No se encontraron movimientos con los filtros aplicados'
                  : 'No hay movimientos de stock registrados'
                }
              </p>
              {!filtros.busqueda && !filtros.id_producto && !filtros.tipo_movimiento && !filtros.fecha_desde && !filtros.fecha_hasta && (
                <Link to="/stock/movimientos/nuevo" className="btn btn-primary">
                  <FaPlus className="me-2" />
                  Registrar Primer Movimiento
                </Link>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Stock Anterior</th>
                    <th>Stock Posterior</th>
                    <th>Motivo</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((movimiento) => {
                    const tipoBadge = getTipoMovimientoBadge(movimiento.tipo_movimiento);
                    
                    return (
                      <tr key={movimiento.id_movimiento}>
                        <td>
                          <div>{new Date(movimiento.created_at).toLocaleDateString('es-ES')}</div>
                          <small className="text-muted">
                            {new Date(movimiento.created_at).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </small>
                        </td>
                        <td>
                          <strong>{movimiento.producto?.nombre || 'Producto no encontrado'}</strong>
                          {movimiento.cotizacion && (
                            <small className="d-block text-muted">
                              Cotización: {movimiento.cotizacion.numero_cotizacion}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${tipoBadge.class} d-flex align-items-center gap-1`}>
                            {tipoBadge.icon}
                            {tipoBadge.text}
                          </span>
                        </td>
                        <td>
                          <span className={`fw-bold ${
                            ['ingreso', 'ajuste_positivo'].includes(movimiento.tipo_movimiento) 
                              ? 'text-success' 
                              : 'text-danger'
                          }`}>
                            {['ingreso', 'ajuste_positivo'].includes(movimiento.tipo_movimiento) ? '+' : '-'}
                            {movimiento.cantidad}
                          </span>
                        </td>
                        <td>{movimiento.stock_anterior}</td>
                        <td>
                          <span className="fw-bold">{movimiento.stock_posterior}</span>
                        </td>
                        <td>
                          <div>{movimiento.motivo}</div>
                          {movimiento.observaciones && (
                            <small className="text-muted">{movimiento.observaciones}</small>
                          )}
                        </td>
                        <td>
                          {movimiento.usuario?.nombre || 'Sistema'}
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

      {/* Estadísticas */}
      {movimientosFiltrados.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="metric-box">
              <div className="metric-value">{movimientosFiltrados.length}</div>
              <div className="metric-label">Total Movimientos</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-box">
              <div className="metric-value text-success">
                {movimientosFiltrados.filter(m => ['ingreso', 'ajuste_positivo'].includes(m.tipo_movimiento)).length}
              </div>
              <div className="metric-label">Ingresos</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-box">
              <div className="metric-value text-danger">
                {movimientosFiltrados.filter(m => ['egreso', 'ajuste_negativo'].includes(m.tipo_movimiento)).length}
              </div>
              <div className="metric-label">Egresos</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-box">
              <div className="metric-value text-primary">
                {movimientosFiltrados.filter(m => m.tipo_movimiento === 'reserva').length}
              </div>
              <div className="metric-label">Reservas</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosStock;