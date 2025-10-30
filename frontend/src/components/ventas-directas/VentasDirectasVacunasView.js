import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSyringe, 
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
  FaCalculator,
  FaFilePdf,
  FaTruck,
  FaWarehouse,
  FaClock,
  FaBan,
  FaShoppingCart,
  FaBox
} from 'react-icons/fa';
import { useNotification } from '../../context/NotificationContext';
import './VentasDirectasVacunas.css';

const VentasDirectasVacunasView = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [stocksVacunas, setStocksVacunas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaVacuna, setBusquedaVacuna] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [ventasDirectas, setVentasDirectas] = useState([]);
  
  // Estados para modales
  const [showStockModal, setShowStockModal] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showConfirmarVenta, setShowConfirmarVenta] = useState(false);
  const [showVentasModal, setShowVentasModal] = useState(false);
  const [busquedaVentas, setBusquedaVentas] = useState('');

  // Estados para la venta
  const [observaciones, setObservaciones] = useState('');
  const [responsableEntrega, setResponsableEntrega] = useState('');
  const [responsableRecibe, setResponsableRecibe] = useState('');

  // Estados para listas de precios
  const [listasPrecios, setListasPrecios] = useState([]);
  const [listaPrecioSeleccionada, setListaPrecioSeleccionada] = useState(null);

  // Estados para filtros
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroVencimiento, setFiltroVencimiento] = useState('');

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Set responsable recibe when client is selected
  useEffect(() => {
    if (clienteSeleccionado && typeof clienteSeleccionado.nombre === 'string') {
      setResponsableRecibe(clienteSeleccionado.nombre);
    }
  }, [clienteSeleccionado]);

  const cargarDatosIniciales = async () => {
    await Promise.all([
      cargarStocksDisponibles(),
      cargarClientes(),
      cargarVentasDirectas(),
      cargarListasPrecios()
    ]);
  };

  const cargarStocksDisponibles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/ventas-directas-vacunas/stocks-disponibles', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar stocks de vacunas');
      }

      const data = await response.json();
      setStocksVacunas(data.data || []);
    } catch (error) {
      console.error('Error cargando stocks:', error);
      showError('Error al cargar el inventario de vacunas');
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await fetch('http://localhost:3001/clientes', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }

      const data = await response.json();
      // El backend devuelve directamente el array, no envuelto en un objeto
      setClientes(Array.isArray(data) ? data : (data.clientes || []));
    } catch (error) {
      console.error('Error cargando clientes:', error);
      showError('Error al cargar la lista de clientes');
    }
  };

  const cargarVentasDirectas = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ventas-directas-vacunas', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar ventas directas');
      }

      const data = await response.json();
      // Asegurar que siempre sea un array
      const ventasArray = Array.isArray(data.data) ? data.data : 
                         Array.isArray(data) ? data : [];
      setVentasDirectas(ventasArray);
    } catch (error) {
      console.error('Error cargando ventas directas:', error);
      setVentasDirectas([]); // Asegurar que sea un array vacío en caso de error
      showWarning('No se pudieron cargar las ventas directas previas');
    }
  };

  const cargarListasPrecios = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ventas-directas-vacunas/listas-precios', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar listas de precios');
      }

      const result = await response.json();
      // El backend devuelve {success: true, data: [...]}
      const listas = result.success && result.data ? result.data : [];
      
      // Mapear los campos para que coincidan con lo que espera el frontend
      const listasMapeadas = listas.map(lista => ({
        id_lista: lista.id,
        tipo: lista.tipo,
        nombre: lista.nombre,
        descripcion: lista.descripcion,
        porcentaje_recargo: lista.porcentajeRecargo
      }));
      
      setListasPrecios(listasMapeadas);
      console.log('Listas de precios cargadas:', listasMapeadas);
    } catch (error) {
      console.error('Error cargando listas de precios:', error);
      setListasPrecios([]);
      showWarning('No se pudieron cargar las listas de precios');
    }
  };

  const agregarAlCarrito = (stock) => {
    const existeEnCarrito = carrito.find(item => item.stockId === stock.id);
    
    if (existeEnCarrito) {
      showWarning('Esta vacuna ya está en el carrito');
      return;
    }

    // Verificar que la vacuna existe
    if (!stock.vacuna) {
      showError('Error: datos de vacuna no disponibles');
      return;
    }

    const nuevoItem = {
      stockId: stock.id,
      vacuna: stock.vacuna,
      lote: stock.lote,
      fechaVencimiento: stock.fechaVencimiento,
      cantidadDisponible: stock.cantidadDisponible,
      cantidadVenta: 1,
      precioUnitario: stock.precioVenta || 0
    };

    setCarrito([...carrito, nuevoItem]);
    showSuccess(`${typeof stock.vacuna?.nombre === 'string' ? stock.vacuna.nombre : 'Vacuna'} agregada al carrito`);
  };

  const actualizarCantidadCarrito = (stockId, nuevaCantidad) => {
    const stock = stocksVacunas.find(s => s.id === stockId);
    
    if (nuevaCantidad > stock.cantidadDisponible) {
      showWarning(`Solo hay ${stock.cantidadDisponible} frascos disponibles`);
      return;
    }

    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(stockId);
      return;
    }

    setCarrito(carrito.map(item => 
      item.stockId === stockId 
        ? { ...item, cantidadVenta: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (stockId) => {
    setCarrito(carrito.filter(item => item.stockId !== stockId));
  };

  const calcularTotales = () => {
    const subtotal = carrito.reduce((suma, item) => 
      suma + (item.cantidadVenta * item.precioUnitario), 0
    );
    
    // Aplicar recargo de lista de precios si está seleccionada
    const recargo = listaPrecioSeleccionada ? 
      subtotal * (parseFloat(listaPrecioSeleccionada.porcentaje_recargo) / 100) : 0;
    
    // El total es subtotal + recargo (sin IVA)
    const total = subtotal + recargo;
    const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidadVenta, 0);

    return { subtotal, recargo, total, cantidadTotal };
  };

  const confirmarVenta = async () => {
    try {
      if (!clienteSeleccionado) {
        showError('Debe seleccionar un cliente');
        return;
      }

      if (carrito.length === 0) {
        showError('El carrito está vacío');
        return;
      }

      setLoading(true);

      const ventaData = {
        id_cliente: clienteSeleccionado.id_cliente || clienteSeleccionado.id,
        id_lista_precio: listaPrecioSeleccionada?.id_lista || null,
        observaciones_venta: observaciones,
        responsable_entrega: responsableEntrega,
        responsable_recibe: responsableRecibe,
        vacunas: carrito.map(item => ({
          id_stock_vacuna: item.stockId,
          cantidad: item.cantidadVenta,
          precio_unitario: item.precioUnitario
        }))
      };

      const response = await fetch('http://localhost:3001/api/ventas-directas-vacunas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(ventaData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la venta');
      }

      const data = await response.json();
      
      showSuccess('¡Venta directa creada exitosamente!');
      
      // Limpiar formulario
      setCarrito([]);
      setClienteSeleccionado(null);
      setObservaciones('');
      setResponsableEntrega('');
      setResponsableRecibe('');
      setListaPrecioSeleccionada(null);
      setShowConfirmarVenta(false);
      
      // Recargar datos
      await cargarDatosIniciales();

    } catch (error) {
      console.error('Error creando venta directa:', error);
      showError('Error al crear la venta directa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarRemitoPdf = async (ventaId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:3001/api/ventas-directas-vacunas/${ventaId}/remito-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          responsableEntrega,
          responsableRecibe
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar el remito PDF');
      }

      // Descargar el PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `remito-venta-directa-${ventaId}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess('Remito PDF generado y descargado');

    } catch (error) {
      console.error('Error generando PDF:', error);
      showError('Error al generar el remito PDF');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEntrega = async (ventaId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/ventas-directas-vacunas/${ventaId}/confirmar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          responsableEntrega,
          responsableRecibe
        })
      });

      if (!response.ok) {
        throw new Error('Error al confirmar la entrega');
      }

      showSuccess('Entrega confirmada exitosamente');
      await cargarVentasDirectas();

    } catch (error) {
      console.error('Error confirmando entrega:', error);
      showError('Error al confirmar la entrega');
    }
  };

  // Filtros para stocks
  const stocksFiltrados = stocksVacunas.filter(stock => {
    // Verificar que la vacuna existe
    if (!stock.vacuna) return false;
    
    const nombreVacuna = typeof stock.vacuna.nombre === 'string' ? stock.vacuna.nombre : '';
    const proveedorVacuna = typeof stock.vacuna.proveedor === 'string' ? stock.vacuna.proveedor : '';
    
    const matchNombre = nombreVacuna.toLowerCase().includes(busquedaVacuna.toLowerCase());
    const matchProveedor = !filtroProveedor || proveedorVacuna.includes(filtroProveedor);
    const matchVencimiento = !filtroVencimiento || (stock.fechaVencimiento && new Date(stock.fechaVencimiento) > new Date(filtroVencimiento));
    
    return matchNombre && matchProveedor && matchVencimiento;
  });

  // Filtros para clientes
  const clientesFiltrados = clientes.filter(cliente => {
    const nombre = typeof cliente.nombre === 'string' ? cliente.nombre : '';
    const email = typeof cliente.email === 'string' ? cliente.email : '';
    return nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
           email.toLowerCase().includes(busquedaCliente.toLowerCase());
  });

  // Filtros y ordenamiento para ventas directas (últimas 5 + buscador)
  const ventasFiltradas = ventasDirectas
    .filter(venta => {
      if (!busquedaVentas.trim()) return true;
      const busqueda = busquedaVentas.toLowerCase();
      const numeroVenta = (venta.numeroVenta || '').toLowerCase();
      const nombreCliente = (venta.cliente?.nombre || '').toLowerCase();
      return numeroVenta.includes(busqueda) || nombreCliente.includes(busqueda);
    })
    .sort((a, b) => new Date(b.fechaVenta || 0) - new Date(a.fechaVenta || 0))
    .slice(0, 5);

  const { subtotal, recargo, total, cantidadTotal } = calcularTotales();

  return (
    <div className="ventas-directas-vacunas-container">
      {/* Header */}
      <div className="header-section">
        <div className="title-section">
          <h1>
            <FaSyringe className="title-icon" />
            Entregas Fuera de Plan
          </h1>
          <p className="subtitle">Ventas directas de vacunas sin plan previo</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={() => {
              setBusquedaVentas('');
              cargarVentasDirectas();
              setShowVentasModal(true);
            }}
          >
            <FaBoxOpen /> Ver Ventas Directas
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/dashboard')}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Cliente seleccionado */}
      {clienteSeleccionado && (
        <div className="cliente-seleccionado">
          <div className="cliente-info">
            <FaUser className="cliente-icon" />
            <div>
              <h3>{typeof clienteSeleccionado?.nombre === 'string' ? clienteSeleccionado.nombre : 'Cliente sin nombre'}</h3>
              <p>{typeof clienteSeleccionado?.email === 'string' ? clienteSeleccionado.email : 'Sin email'} | {typeof clienteSeleccionado?.telefono === 'string' ? clienteSeleccionado.telefono : 'Sin teléfono'}</p>
            </div>
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowClienteModal(true)}
          >
            Cambiar Cliente
          </button>
        </div>
      )}

      <div className="main-content">
        {/* Panel de Inventario */}
        <div className="inventory-panel">
          <div className="panel-header">
            <h2>
              <FaWarehouse className="panel-icon" />
              Inventario de Vacunas Disponibles
            </h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowStockModal(true)}
            >
              <FaSearch /> Buscar Vacunas
            </button>
          </div>

          {/* Filtros rápidos */}
          <div className="quick-filters">
            <input
              type="text"
              placeholder="Buscar vacuna..."
              className="filter-input"
              value={busquedaVacuna}
              onChange={(e) => setBusquedaVacuna(e.target.value)}
            />
            <select
              className="filter-select"
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {[...new Set(stocksVacunas
                .filter(s => s.vacuna && typeof s.vacuna.proveedor === 'string' && s.vacuna.proveedor)
                .map(s => s.vacuna.proveedor)
              )].map(proveedor => (
                <option key={proveedor} value={proveedor}>{proveedor}</option>
              ))}
            </select>
          </div>

          {/* Lista de stocks */}
          <div className="stocks-grid">
            {loading ? (
              <div className="loading-state">Cargando inventario...</div>
            ) : stocksFiltrados.length === 0 ? (
              <div className="empty-state">
                <FaExclamationTriangle />
                <p>No hay vacunas disponibles que coincidan con los filtros</p>
              </div>
            ) : (
              stocksFiltrados.map(stock => (
                <div key={stock.id} className="stock-card">
                  <div className="stock-header">
                    <h4>{typeof stock.vacuna?.nombre === 'string' ? stock.vacuna.nombre : 'Vacuna sin nombre'}</h4>
                    <span className="stock-disponible">
                      {stock.cantidadDisponible || 0} frascos disponibles
                    </span>
                  </div>
                  
                  <div className="stock-details">
                    <p><strong>Código:</strong> {typeof stock.vacuna?.codigo === 'string' ? stock.vacuna.codigo : 'Sin código'}</p>
                    <p><strong>Lote:</strong> {typeof stock.lote === 'string' ? stock.lote : 'Sin lote'}</p>
                    <p><strong>Vencimiento:</strong> {stock.fechaVencimiento ? new Date(stock.fechaVencimiento).toLocaleDateString() : 'Sin fecha'}</p>
                    <p><strong>Proveedor:</strong> {typeof stock.vacuna?.proveedor === 'string' ? stock.vacuna.proveedor : 'Sin proveedor'}</p>
                    <p><strong>Precio:</strong> ${stock.precioVenta || 0}</p>
                  </div>

                  <div className="stock-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => agregarAlCarrito(stock)}
                      disabled={stock.cantidadDisponible === 0}
                    >
                      <FaPlus /> Agregar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel del Carrito */}
        <div className="cart-panel">
          <div className="panel-header">
            <h2>
              <FaShoppingCart className="panel-icon" />
              Carrito de Venta ({carrito.length})
            </h2>
            {!clienteSeleccionado && (
              <button 
                className="btn btn-success"
                onClick={() => setShowClienteModal(true)}
              >
                <FaUser /> Seleccionar Cliente
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="empty-cart">
              <FaShoppingCart className="empty-icon" />
              <p>Carrito vacío</p>
              <small>Agregue vacunas del inventario</small>
            </div>
          ) : (
            <>
              {/* Items del carrito */}
              <div className="cart-items">
                {carrito.map(item => (
                  <div key={item.stockId} className="cart-item">
                    <div className="item-info">
                      <h4>{typeof item.vacuna?.nombre === 'string' ? item.vacuna.nombre : 'Vacuna sin nombre'}</h4>
                      <p>Lote: {typeof item.lote === 'string' ? item.lote : 'Sin lote'} | Vence: {item.fechaVencimiento ? new Date(item.fechaVencimiento).toLocaleDateString() : 'Sin fecha'}</p>
                    </div>
                    
                    <div className="item-controls">
                      <div className="quantity-control">
                        <button
                          onClick={() => actualizarCantidadCarrito(item.stockId, item.cantidadVenta - 1)}
                          disabled={item.cantidadVenta <= 1}
                        >
                          -
                        </button>
                        <span>{item.cantidadVenta}</span>
                        <button
                          onClick={() => actualizarCantidadCarrito(item.stockId, item.cantidadVenta + 1)}
                          disabled={item.cantidadVenta >= item.cantidadDisponible}
                        >
                          +
                        </button>
                      </div>
                      
                      <div className="item-price">
                        ${(item.cantidadVenta * item.precioUnitario).toFixed(2)}
                      </div>
                      
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => eliminarDelCarrito(item.stockId)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="cart-totals">
                <div className="total-line">
                  <span>Subtotal ({cantidadTotal} frascos):</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {listaPrecioSeleccionada && recargo > 0 && (
                  <div className="total-line">
                    <span>Recargo {listaPrecioSeleccionada.tipo} ({listaPrecioSeleccionada.porcentaje_recargo}%):</span>
                    <span>${recargo.toFixed(2)}</span>
                  </div>
                )}
                <div className="total-line total-final">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Observaciones */}
              <div className="observaciones-section">
                <label>Observaciones:</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              {/* Botón de confirmar */}
              <button
                className="btn btn-success btn-lg cart-confirm"
                onClick={() => setShowConfirmarVenta(true)}
                disabled={!clienteSeleccionado || carrito.length === 0}
              >
                <FaSave /> Confirmar Venta Directa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal de selección de cliente */}
      {showClienteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Seleccionar Cliente</h3>
              <button 
                className="modal-close"
                onClick={() => setShowClienteModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="search-input"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
              />
              
              <div className="clientes-list">
                {clientesFiltrados.map(cliente => (
                  <div 
                    key={cliente.id_cliente || cliente.id} 
                    className={`cliente-item ${(clienteSeleccionado?.id_cliente || clienteSeleccionado?.id) === (cliente.id_cliente || cliente.id) ? 'selected' : ''}`}
                    onClick={() => {
                      setClienteSeleccionado(cliente);
                      setShowClienteModal(false);
                      setBusquedaCliente('');
                    }}
                  >
                    <h4>{typeof cliente.nombre === 'string' ? cliente.nombre : 'Cliente sin nombre'}</h4>
                    <p>{typeof cliente.email === 'string' ? cliente.email : 'Sin email'} | {typeof cliente.telefono === 'string' ? cliente.telefono : 'Sin teléfono'}</p>
                    <p>{typeof cliente.direccion === 'string' ? cliente.direccion : 'Sin dirección'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de venta */}
      {showConfirmarVenta && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmar Venta Directa</h3>
              <button 
                className="modal-close"
                onClick={() => setShowConfirmarVenta(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="confirmation-summary">
                <h4>Resumen de la Venta</h4>
                <p><strong>Cliente:</strong> {clienteSeleccionado?.nombre || 'Cliente sin nombre'}</p>
                <p><strong>Total de productos:</strong> {carrito.length}</p>
                <p><strong>Total de frascos:</strong> {cantidadTotal}</p>
                <p><strong>Subtotal:</strong> ${subtotal.toFixed(2)}</p>
                {listaPrecioSeleccionada && recargo > 0 && (
                  <p><strong>Recargo {listaPrecioSeleccionada.tipo}:</strong> ${recargo.toFixed(2)}</p>
                )}
                <p><strong>Monto total:</strong> ${total.toFixed(2)}</p>
              </div>

              <div className="lista-precios-section">
                <div className="form-group">
                  <label>Lista de Precios (Opcional):</label>
                  <select
                    value={listaPrecioSeleccionada?.id_lista || ''}
                    onChange={(e) => {
                      const listaId = e.target.value;
                      const lista = listasPrecios.find(l => l.id_lista == listaId);
                      setListaPrecioSeleccionada(lista || null);
                    }}
                  >
                    <option value="">Sin recargo adicional</option>
                    {listasPrecios.length === 0 ? (
                      <option disabled>Cargando listas de precios...</option>
                    ) : (
                      listasPrecios.map(lista => (
                        <option key={lista.id_lista} value={lista.id_lista}>
                          {lista.tipo} - {lista.nombre} (+{lista.porcentaje_recargo}%)
                        </option>
                      ))
                    )}
                  </select>
                  {listaPrecioSeleccionada && (
                    <small className="form-text text-muted">
                      Se aplicará un recargo del {listaPrecioSeleccionada.porcentaje_recargo}% sobre el subtotal
                    </small>
                  )}
                  {/* Debug temporal */}
                  <small style={{color: 'blue'}}>
                    Debug: {listasPrecios.length} listas cargadas
                  </small>
                </div>
              </div>

              <div className="responsables-section">
                <div className="form-group">
                  <label>Responsable de Entrega:</label>
                  <input
                    type="text"
                    value={responsableEntrega}
                    onChange={(e) => setResponsableEntrega(e.target.value)}
                    placeholder="Nombre del responsable de entrega"
                  />
                </div>
                <div className="form-group">
                  <label>Responsable que Recibe:</label>
                  <input
                    type="text"
                    value={responsableRecibe}
                    onChange={(e) => setResponsableRecibe(e.target.value)}
                    placeholder="Nombre del responsable que recibe"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setShowConfirmarVenta(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-success"
                onClick={confirmarVenta}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ventas directas */}
      {showVentasModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>📦 Últimas Entregas Registradas</h3>
              <button 
                className="modal-close"
                onClick={() => setShowVentasModal(false)}
                style={{ color: 'white', fontSize: '24px' }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Buscador */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaSearch style={{ color: '#6c757d' }} />
                  <input
                    type="text"
                    placeholder="Buscar por número de venta o cliente..."
                    value={busquedaVentas}
                    onChange={(e) => setBusquedaVentas(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {busquedaVentas && (
                    <button
                      onClick={() => setBusquedaVentas('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6c757d',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <small style={{ color: '#6c757d', marginTop: '5px', display: 'block' }}>
                  Mostrando las últimas 5 entregas{busquedaVentas ? ' que coinciden con la búsqueda' : ''}
                </small>
              </div>

              <div className="ventas-table">
                <table>
                  <thead>
                    <tr>
                      <th>N° Venta</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Total</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(ventasFiltradas) && ventasFiltradas.length > 0 ? (
                      ventasFiltradas.map(venta => (
                        <tr key={venta.id}>
                          <td style={{ fontWeight: '600', color: '#495057' }}>{venta.numeroVenta}</td>
                          <td>{venta.cliente?.nombre || 'Sin cliente'}</td>
                          <td>{new Date(venta.fechaVenta).toLocaleDateString('es-ES')}</td>
                          <td>
                            <span className={`estado-badge estado-${typeof venta.estado === 'string' ? venta.estado.toLowerCase() : 'pendiente'}`}>
                              {typeof venta.estado === 'string' ? venta.estado : 'PENDIENTE'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600', color: '#28a745' }}>${venta.montoTotal?.toFixed(2) || '0.00'}</td>
                          <td className="acciones-cell">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => generarRemitoPdf(venta.id)}
                              title="Generar Remito PDF"
                            >
                              <FaFilePdf />
                            </button>
                            {(typeof venta.estado === 'string' ? venta.estado : 'PENDIENTE') === 'PENDIENTE' && (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => confirmarEntrega(venta.id)}
                                title="Confirmar Entrega"
                              >
                                <FaTruck />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center" style={{ padding: '40px', color: '#6c757d' }}>
                          {busquedaVentas ? 
                            <>
                              <FaSearch style={{ fontSize: '24px', marginBottom: '10px' }} />
                              <div>No se encontraron ventas que coincidan con "{busquedaVentas}"</div>
                            </> : 
                            <>
                              <FaBox style={{ fontSize: '24px', marginBottom: '10px' }} />
                              <div>No hay ventas directas registradas</div>
                            </>
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <FaClock className="spin" />
            <p>Procesando...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasDirectasVacunasView;