import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaPlus, 
  FaTrash, 
  FaSearch,
  FaSave,
  FaEdit,
  FaBoxOpen,
  FaUser,
  FaDollarSign,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaCalculator
} from 'react-icons/fa';
import { useNotification } from '../../context/NotificationContext';
import './VentasDirectas.css';

const VentasDirectasView = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showConfirmarVenta, setShowConfirmarVenta] = useState(false);
  const [descuentoGeneral, setDescuentoGeneral] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/productos/disponibles', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      setProductos(data.data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      showError('Error', 'No se pudieron cargar los productos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.id_producto === producto.id_producto);
    
    if (itemExistente) {
      setCarrito(prev => prev.map(item => 
        item.id_producto === producto.id_producto 
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito(prev => [...prev, {
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio_unitario: producto.precio_venta,
        cantidad: 1,
        stock_disponible: producto.stock_actual,
        categoria: producto.categoria
      }]);
    }
    
    showSuccess('Agregado', `${producto.nombre} agregado al carrito`);
  };

  const modificarCantidad = (idProducto, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(idProducto);
      return;
    }

    const producto = productos.find(p => p.id_producto === idProducto);
    if (producto && nuevaCantidad > producto.stock_actual) {
      showWarning('Stock insuficiente', `Solo hay ${producto.stock_actual} unidades disponibles`);
      return;
    }

    setCarrito(prev => prev.map(item => 
      item.id_producto === idProducto 
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (idProducto) => {
    setCarrito(prev => prev.filter(item => item.id_producto !== idProducto));
  };

  const calcularSubtotal = () => {
    return carrito.reduce((total, item) => total + (item.precio_unitario * item.cantidad), 0);
  };

  const calcularDescuento = () => {
    return calcularSubtotal() * (descuentoGeneral / 100);
  };

  const calcularTotal = () => {
    return calcularSubtotal() - calcularDescuento();
  };

  const validarVenta = () => {
    if (carrito.length === 0) {
      showError('Error', 'El carrito está vacío');
      return false;
    }

    if (!cliente.nombre.trim()) {
      showError('Error', 'Debe ingresar el nombre del cliente');
      return false;
    }

    // Verificar stock
    for (const item of carrito) {
      const producto = productos.find(p => p.id_producto === item.id_producto);
      if (!producto || item.cantidad > producto.stock_actual) {
        showError('Error', `Stock insuficiente para ${item.nombre}`);
        return false;
      }
    }

    return true;
  };

  const confirmarVenta = async () => {
    if (!validarVenta()) return;

    try {
      setLoading(true);
      
      const ventaData = {
        cliente: cliente,
        items: carrito,
        descuento_porcentaje: descuentoGeneral,
        subtotal: calcularSubtotal(),
        descuento_monto: calcularDescuento(),
        total: calcularTotal(),
        metodo_pago: metodoPago,
        observaciones: observaciones
      };

      const response = await fetch('http://localhost:3001/ventas-directas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(ventaData)
      });

      if (!response.ok) {
        throw new Error('Error al procesar la venta');
      }

      const data = await response.json();
      showSuccess('Venta Exitosa', `Venta N° ${data.data.numero_venta} procesada correctamente`);
      
      // Limpiar formulario
      setCarrito([]);
      setCliente({ nombre: '', email: '', telefono: '', direccion: '' });
      setDescuentoGeneral(0);
      setObservaciones('');
      setShowConfirmarVenta(false);
      
      // Recargar productos para actualizar stock
      await cargarProductos();
      
    } catch (error) {
      console.error('Error procesando venta:', error);
      showError('Error', 'No se pudo procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(producto => {
    const matchBusqueda = producto.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
                         producto.codigo?.toLowerCase().includes(busquedaProducto.toLowerCase());
    const matchCategoria = !filtroCategoria || producto.categoria === filtroCategoria;
    return matchBusqueda && matchCategoria && producto.stock_actual > 0;
  });

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  if (loading && productos.length === 0) {
    return (
      <div className="ventas-loading">
        <div className="ventas-spinner"></div>
        <p>Cargando productos...</p>
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
              <FaShoppingCart className="me-2 text-primary" size={24} />
              <div>
                <h3 className="mb-0">Ventas Directas</h3>
                <small className="text-muted">Venta de productos sin plan de vacunación</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/ventas')}
              >
                Ver Ventas
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Columna Productos */}
        <div className="col-lg-8">
          {/* Filtros */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label">Buscar Producto</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaSearch />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nombre o código del producto..."
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map(categoria => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Productos */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Productos Disponibles</h5>
            </div>
            <div className="card-body">
              {productosFiltrados.length === 0 ? (
                <div className="text-center py-5">
                  <FaExclamationTriangle className="text-warning mb-3" size={48} />
                  <h4>No hay productos disponibles</h4>
                  <p className="text-muted">
                    {busquedaProducto || filtroCategoria 
                      ? 'No se encontraron productos con los filtros aplicados'
                      : 'No hay productos en stock disponibles para venta'
                    }
                  </p>
                </div>
              ) : (
                <div className="row">
                  {productosFiltrados.map((producto) => (
                    <div key={producto.id_producto} className="col-md-6 col-lg-4 mb-3">
                      <div className="card producto-card h-100">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="card-title mb-0">{producto.nombre}</h6>
                            <span className="badge bg-secondary">{producto.categoria}</span>
                          </div>
                          
                          {producto.codigo && (
                            <p className="text-muted small mb-2">Código: {producto.codigo}</p>
                          )}
                          
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-success fw-bold">
                              ${producto.precio_venta?.toLocaleString() || '0'}
                            </span>
                            <div className="d-flex align-items-center">
                              <FaBoxOpen className="text-info me-1" size={12} />
                              <small className={`${producto.stock_actual <= 10 ? 'text-danger' : 'text-success'}`}>
                                Stock: {producto.stock_actual}
                              </small>
                            </div>
                          </div>
                          
                          {producto.descripcion && (
                            <p className="card-text small text-muted mb-3">
                              {producto.descripcion.length > 60 
                                ? `${producto.descripcion.substring(0, 60)}...`
                                : producto.descripcion
                              }
                            </p>
                          )}
                          
                          <button
                            className="btn btn-primary btn-sm w-100"
                            onClick={() => agregarAlCarrito(producto)}
                            disabled={producto.stock_actual === 0}
                          >
                            <FaPlus className="me-1" />
                            Agregar al Carrito
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Carrito */}
        <div className="col-lg-4">
          {/* Información del Cliente */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaUser className="me-2" />
                Cliente
              </h6>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowClienteModal(true)}
              >
                <FaEdit />
              </button>
            </div>
            <div className="card-body">
              {cliente.nombre ? (
                <div>
                  <div className="fw-bold">{cliente.nombre}</div>
                  {cliente.email && <div className="text-muted small">{cliente.email}</div>}
                  {cliente.telefono && <div className="text-muted small">{cliente.telefono}</div>}
                </div>
              ) : (
                <div className="text-center text-muted">
                  <FaInfoCircle className="mb-2" size={24} />
                  <p className="mb-0">Haga clic en editar para agregar datos del cliente</p>
                </div>
              )}
            </div>
          </div>

          {/* Carrito */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <FaShoppingCart className="me-2" />
                Carrito ({carrito.length})
              </h6>
            </div>
            <div className="card-body">
              {carrito.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaShoppingCart className="mb-2" size={32} />
                  <p className="mb-0">El carrito está vacío</p>
                </div>
              ) : (
                <div>
                  {carrito.map((item) => (
                    <div key={item.id_producto} className="d-flex align-items-center mb-3 border-bottom pb-2">
                      <div className="flex-grow-1">
                        <div className="fw-bold">{item.nombre}</div>
                        <div className="text-success small">
                          ${item.precio_unitario.toLocaleString()} c/u
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <input
                          type="number"
                          className="form-control form-control-sm me-2"
                          style={{ width: '60px' }}
                          value={item.cantidad}
                          min="1"
                          max={item.stock_disponible}
                          onChange={(e) => modificarCantidad(item.id_producto, parseInt(e.target.value) || 0)}
                        />
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminarDelCarrito(item.id_producto)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Descuento */}
                  <div className="mb-3">
                    <label className="form-label small">Descuento (%)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={descuentoGeneral}
                      min="0"
                      max="100"
                      onChange={(e) => setDescuentoGeneral(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Totales */}
                  <div className="border-top pt-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Subtotal:</span>
                      <span>${calcularSubtotal().toLocaleString()}</span>
                    </div>
                    {descuentoGeneral > 0 && (
                      <div className="d-flex justify-content-between mb-1 text-danger">
                        <span>Descuento ({descuentoGeneral}%):</span>
                        <span>-${calcularDescuento().toLocaleString()}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold border-top pt-2">
                      <span>Total:</span>
                      <span className="text-success">${calcularTotal().toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-success w-100 mt-3"
                    onClick={() => setShowConfirmarVenta(true)}
                    disabled={!cliente.nombre.trim()}
                  >
                    <FaCalculator className="me-1" />
                    Procesar Venta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cliente */}
      {showClienteModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaUser className="me-2" />
                  Datos del Cliente
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowClienteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cliente.nombre}
                    onChange={(e) => setCliente(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre completo del cliente"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={cliente.email}
                    onChange={(e) => setCliente(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={cliente.telefono}
                    onChange={(e) => setCliente(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Número de teléfono"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Dirección</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={cliente.direccion}
                    onChange={(e) => setCliente(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Dirección completa"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowClienteModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => setShowClienteModal(false)}
                  disabled={!cliente.nombre.trim()}
                >
                  <FaSave className="me-1" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Venta */}
      {showConfirmarVenta && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaCheckCircle className="me-2" />
                  Confirmar Venta
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowConfirmarVenta(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Resumen Cliente */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Cliente</h6>
                  </div>
                  <div className="card-body">
                    <div className="fw-bold">{cliente.nombre}</div>
                    {cliente.email && <div>{cliente.email}</div>}
                    {cliente.telefono && <div>{cliente.telefono}</div>}
                  </div>
                </div>

                {/* Resumen Productos */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Productos</h6>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carrito.map((item) => (
                            <tr key={item.id_producto}>
                              <td>{item.nombre}</td>
                              <td>{item.cantidad}</td>
                              <td>${item.precio_unitario.toLocaleString()}</td>
                              <td>${(item.precio_unitario * item.cantidad).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="mb-3">
                  <label className="form-label">Método de Pago</label>
                  <select
                    className="form-select"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {/* Observaciones */}
                <div className="mb-3">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                {/* Totales */}
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Subtotal:</span>
                      <span>${calcularSubtotal().toLocaleString()}</span>
                    </div>
                    {descuentoGeneral > 0 && (
                      <div className="d-flex justify-content-between mb-1 text-danger">
                        <span>Descuento ({descuentoGeneral}%):</span>
                        <span>-${calcularDescuento().toLocaleString()}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold border-top pt-2">
                      <span>Total:</span>
                      <span className="text-success h5">${calcularTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowConfirmarVenta(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={confirmarVenta}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <FaDollarSign className="me-1" />
                      Confirmar Venta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasDirectasView;