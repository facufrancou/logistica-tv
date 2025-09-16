import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaBox, 
  FaArrowLeft, 
  FaHistory,
  FaWarehouse,
  FaExclamationTriangle,
  FaPlus,
  FaMinus,
  FaEye,
  FaEdit,
  FaSync,
  FaCalendarAlt,
  FaTruck,
  FaShoppingCart
} from 'react-icons/fa';
import { 
  getResumenStock,
  getMovimientosStock,
  registrarMovimiento,
  getProductos
} from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const ProductoStock = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producto, setProducto] = useState(null);
  const [resumenStock, setResumenStock] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [showMovimientoForm, setShowMovimientoForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo_movimiento: 'ingreso',
    cantidad: '',
    motivo: '',
    observaciones: ''
  });
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    if (id) {
      cargarDatosProducto();
    }
  }, [id]);

  const cargarDatosProducto = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los productos y filtrar por ID
      const [todosProductos, resumenData] = await Promise.all([
        getProductos(),
        getResumenStock()
      ]);
      
      // Buscar el producto específico por ID
      const productoEncontrado = todosProductos.find(p => p.id.toString() === id);
      setProducto(productoEncontrado);
      
      // Buscar el resumen específico de este producto
      const resumenProducto = resumenData.find(r => r.id_producto.toString() === id);
      setResumenStock(resumenProducto);
      
      // Cargar movimientos del producto
      await cargarMovimientos();
      
    } catch (error) {
      console.error('Error cargando datos del producto:', error);
      showError('Error', 'No se pudieron cargar los datos del producto');
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientos = async () => {
    try {
      setLoadingMovimientos(true);
      const movimientosData = await getMovimientosStock({ id_producto: id });
      setMovimientos(movimientosData);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
      showError('Error', 'No se pudieron cargar los movimientos');
    } finally {
      setLoadingMovimientos(false);
    }
  };

  const handleSubmitMovimiento = async (e) => {
    e.preventDefault();
    
    if (!formData.cantidad || formData.cantidad <= 0) {
      showError('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await registrarMovimiento({
        id_producto: parseInt(id),
        tipo_movimiento: formData.tipo_movimiento,
        cantidad: parseInt(formData.cantidad),
        motivo: formData.motivo || 'Sin motivo especificado',
        observaciones: formData.observaciones
      });

      showSuccess('Éxito', 'Movimiento registrado correctamente');
      setShowMovimientoForm(false);
      setFormData({
        tipo_movimiento: 'ingreso',
        cantidad: '',
        motivo: '',
        observaciones: ''
      });
      
      // Recargar datos
      cargarDatosProducto();
      
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      showError('Error', 'No se pudo registrar el movimiento');
    }
  };

  const getEstadoStockBadge = () => {
    if (!resumenStock) return { class: 'bg-secondary', text: 'Sin datos' };
    
    const stock = resumenStock.stock_actual || 0;
    const minimo = resumenStock.stock_minimo || 0;
    
    if (stock === 0) {
      return { class: 'bg-danger', text: 'Sin Stock', icon: FaExclamationTriangle };
    } else if (stock <= minimo) {
      return { class: 'bg-warning text-dark', text: 'Stock Bajo', icon: FaExclamationTriangle };
    } else {
      return { class: 'bg-success', text: 'Stock OK', icon: FaWarehouse };
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIconoMovimiento = (tipo) => {
    switch (tipo) {
      case 'ingreso': return <FaPlus className="text-success" />;
      case 'egreso': return <FaMinus className="text-danger" />;
      case 'ajuste': return <FaEdit className="text-warning" />;
      case 'reserva': return <FaShoppingCart className="text-info" />;
      case 'devolucion': return <FaTruck className="text-primary" />;
      default: return <FaBox />;
    }
  };

  if (loading) {
    return (
      <div className="stock-loading">
        <div className="stock-spinner"></div>
        <p>Cargando información del producto...</p>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="container-fluid">
        <div className="card">
          <div className="card-body text-center py-5">
            <FaBox className="text-muted mb-3" style={{ fontSize: '3rem' }} />
            <h5 className="text-muted">Producto no encontrado</h5>
            <p className="text-muted">El producto solicitado no existe o no tienes permisos para verlo.</p>
            <Link to="/stock" className="btn btn-primary">
              Volver al Stock
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const estadoBadge = getEstadoStockBadge();
  const IconoEstado = estadoBadge.icon;

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaBox className="me-2 text-primary" />
            <div>
              <h3 className="mb-0 text-dark">{producto.nombre}</h3>
              <small className="text-muted">Código: {producto.codigo_producto || 'N/A'}</small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-success"
              onClick={() => setShowMovimientoForm(true)}
            >
              <FaPlus className="me-2" />
              Nuevo Movimiento
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={cargarDatosProducto}
            >
              <FaSync className="me-2" />
              Actualizar
            </button>
            <Link to="/stock" className="btn btn-outline-primary">
              <FaArrowLeft className="me-2" />
              Volver
            </Link>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Información del Producto */}
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <FaWarehouse className="me-2" />
                Estado de Stock
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-3">
                    <div className="me-3">
                      <span className={`badge ${estadoBadge.class} fs-6`}>
                        {IconoEstado && <IconoEstado className="me-1" />}
                        {estadoBadge.text}
                      </span>
                    </div>
                  </div>
                  
                  <div className="row text-center">
                    <div className="col-3">
                      <div className="border-end">
                        <div className="fs-4 fw-bold text-primary">
                          {resumenStock?.stock_actual || 0}
                        </div>
                        <small className="text-muted">Stock Actual</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="border-end">
                        <div className="fs-5 fw-bold">
                          {resumenStock?.stock_minimo || 0}
                        </div>
                        <small className="text-muted">Stock Mínimo</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="border-end">
                        <div className="fs-5 fw-bold text-warning">
                          {resumenStock?.stock_reservado || 0}
                        </div>
                        <small className="text-muted">Reservado</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="fs-5 fw-bold text-success">
                        {(resumenStock?.stock_actual || 0) - (resumenStock?.stock_reservado || 0)}
                      </div>
                      <small className="text-muted">Disponible</small>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <h6>Información del Producto</h6>
                  <div className="row">
                    <div className="col-6">
                      <strong>Precio:</strong><br />
                      <span className="text-success fs-5">
                        ${producto.precio ? parseFloat(producto.precio).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="col-6">
                      <strong>Proveedor:</strong><br />
                      <span>{producto.proveedor || 'No especificado'}</span>
                    </div>
                  </div>
                  
                  {resumenStock?.ultimo_movimiento && (
                    <div className="mt-3">
                      <strong>Último Movimiento:</strong><br />
                      <small className="text-muted">
                        <FaCalendarAlt className="me-1" />
                        {formatearFecha(resumenStock.ultimo_movimiento)}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Movimientos */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaHistory className="me-2" />
                Historial de Movimientos
              </h5>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={cargarMovimientos}
                disabled={loadingMovimientos}
              >
                <FaSync className="me-1" />
                Actualizar
              </button>
            </div>
            <div className="card-body">
              {loadingMovimientos ? (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2">Cargando movimientos...</p>
                </div>
              ) : movimientos.length === 0 ? (
                <div className="text-center py-4">
                  <FaHistory className="text-muted mb-3" style={{ fontSize: '2rem' }} />
                  <p className="text-muted">No hay movimientos registrados para este producto</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Motivo</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((movimiento, index) => (
                        <tr key={index}>
                          <td>
                            <small>{formatearFecha(movimiento.fecha)}</small>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              {getIconoMovimiento(movimiento.tipo_movimiento)}
                              <span className="ms-2 text-capitalize">
                                {movimiento.tipo_movimiento}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`fw-bold ${
                              movimiento.tipo_movimiento === 'ingreso' ? 'text-success' : 'text-danger'
                            }`}>
                              {movimiento.tipo_movimiento === 'ingreso' ? '+' : '-'}
                              {movimiento.cantidad}
                            </span>
                          </td>
                          <td>
                            <span className="text-truncate" style={{ maxWidth: '200px' }}>
                              {movimiento.motivo || 'Sin motivo'}
                            </span>
                          </td>
                          <td>
                            <small className="text-muted">
                              {movimiento.observaciones || '-'}
                            </small>
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

        {/* Sidebar - Acciones Rápidas */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Acciones Rápidas</h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link 
                  to={`/productos/${id}`}
                  className="btn btn-outline-info"
                >
                  <FaEye className="me-2" />
                  Ver Producto Completo
                </Link>
                <Link 
                  to="/stock/reservas"
                  className="btn btn-outline-warning"
                >
                  <FaShoppingCart className="me-2" />
                  Ver Reservas
                </Link>
                <Link 
                  to="/stock/movimientos"
                  className="btn btn-outline-secondary"
                >
                  <FaHistory className="me-2" />
                  Todos los Movimientos
                </Link>
                <Link 
                  to="/stock/alertas"
                  className="btn btn-outline-danger"
                >
                  <FaExclamationTriangle className="me-2" />
                  Alertas de Stock
                </Link>
              </div>
            </div>
          </div>

          {/* Alertas específicas del producto */}
          {resumenStock && (resumenStock.stock_actual <= resumenStock.stock_minimo) && (
            <div className="card mt-3 border-warning">
              <div className="card-header bg-warning text-dark">
                <h6 className="mb-0">
                  <FaExclamationTriangle className="me-2" />
                  Alerta de Stock
                </h6>
              </div>
              <div className="card-body">
                <p className="mb-2">
                  Este producto está por debajo del stock mínimo.
                </p>
                <p className="text-muted small mb-3">
                  Stock actual: {resumenStock.stock_actual} | 
                  Mínimo: {resumenStock.stock_minimo}
                </p>
                <button 
                  className="btn btn-warning btn-sm w-100"
                  onClick={() => setShowMovimientoForm(true)}
                >
                  <FaPlus className="me-1" />
                  Registrar Ingreso
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para nuevo movimiento */}
      {showMovimientoForm && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmitMovimiento}>
                <div className="modal-header">
                  <h5 className="modal-title">Registrar Movimiento de Stock</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => setShowMovimientoForm(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tipo de Movimiento</label>
                    <select 
                      className="form-select"
                      value={formData.tipo_movimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_movimiento: e.target.value }))}
                    >
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Cantidad</label>
                    <input 
                      type="number"
                      className="form-control"
                      min="1"
                      required
                      value={formData.cantidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, cantidad: e.target.value }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Motivo</label>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Motivo del movimiento"
                      value={formData.motivo}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Observaciones</label>
                    <textarea 
                      className="form-control"
                      rows="3"
                      placeholder="Observaciones adicionales (opcional)"
                      value={formData.observaciones}
                      onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowMovimientoForm(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Registrar Movimiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductoStock;