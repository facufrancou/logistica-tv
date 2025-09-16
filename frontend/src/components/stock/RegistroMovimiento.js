import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FaSave, 
  FaTimes, 
  FaBoxOpen,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle
} from 'react-icons/fa';
import { registrarMovimiento } from '../../services/planesVacunalesApi';
import { getProductos } from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const RegistroMovimiento = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productoPreseleccionado = searchParams.get('producto');
  
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id_producto: productoPreseleccionado || '',
    tipo_movimiento: '',
    cantidad: '',
    motivo: '',
    observaciones: ''
  });

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const productosData = await getProductos();
      setProductos(productosData.filter(p => p.requiere_control_stock));
    } catch (error) {
      console.error('Error cargando productos:', error);
      showError('Error', 'No se pudieron cargar los productos');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.id_producto || !formData.tipo_movimiento || !formData.cantidad || !formData.motivo) {
      showError('Error', 'Por favor complete todos los campos obligatorios');
      return;
    }

    if (parseFloat(formData.cantidad) <= 0) {
      showError('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      
      const movimiento = {
        id_producto: parseInt(formData.id_producto),
        tipo_movimiento: formData.tipo_movimiento,
        cantidad: parseFloat(formData.cantidad),
        motivo: formData.motivo,
        observaciones: formData.observaciones || null
      };

      await registrarMovimiento(movimiento);
      
      showSuccess('Éxito', 'Movimiento registrado correctamente');
      navigate('/stock/movimientos');
      
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      showError('Error', error.message || 'No se pudo registrar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const tiposMovimiento = [
    { value: 'ingreso', label: 'Ingreso', icon: <FaArrowUp />, description: 'Entrada de productos al stock' },
    { value: 'egreso', label: 'Egreso', icon: <FaArrowDown />, description: 'Salida de productos del stock' },
    { value: 'ajuste_positivo', label: 'Ajuste Positivo', icon: <FaArrowUp />, description: 'Corrección que aumenta el stock' },
    { value: 'ajuste_negativo', label: 'Ajuste Negativo', icon: <FaArrowDown />, description: 'Corrección que disminuye el stock' }
  ];

  const productoSeleccionado = productos.find(p => p.id_producto == formData.id_producto);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center">
            <FaBoxOpen className="me-2 text-primary" />
            <h3 className="mb-0 text-dark">Registrar Movimiento de Stock</h3>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Formulario Principal */}
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0 text-dark">Información del Movimiento</h5>
              </div>
              <div className="card-body stock-form">
                {/* Producto */}
                <div className="form-floating mb-3">
                  <select
                    id="id_producto"
                    name="id_producto"
                    className="form-select"
                    value={formData.id_producto}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map((producto) => (
                      <option key={producto.id_producto} value={producto.id_producto}>
                        {producto.nombre} (Stock actual: {producto.stock || 0})
                      </option>
                    ))}
                  </select>
                  <label htmlFor="id_producto">
                    Producto <span className="text-danger">*</span>
                  </label>
                </div>

                {/* Tipo de Movimiento */}
                <div className="mb-3">
                  <label className="form-label">
                    Tipo de Movimiento <span className="text-danger">*</span>
                  </label>
                  <div className="row">
                    {tiposMovimiento.map((tipo) => (
                      <div key={tipo.value} className="col-md-6 mb-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="tipo_movimiento"
                            id={tipo.value}
                            value={tipo.value}
                            checked={formData.tipo_movimiento === tipo.value}
                            onChange={handleChange}
                            required
                          />
                          <label className="form-check-label" htmlFor={tipo.value}>
                            <div className="d-flex align-items-center">
                              {tipo.icon}
                              <span className="ms-2">{tipo.label}</span>
                            </div>
                            <small className="text-muted d-block">{tipo.description}</small>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cantidad */}
                <div className="form-floating mb-3">
                  <input
                    type="number"
                    id="cantidad"
                    name="cantidad"
                    className="form-control"
                    placeholder="Cantidad"
                    value={formData.cantidad}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    required
                  />
                  <label htmlFor="cantidad">
                    Cantidad <span className="text-danger">*</span>
                  </label>
                </div>

                {/* Motivo */}
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    id="motivo"
                    name="motivo"
                    className="form-control"
                    placeholder="Motivo del movimiento"
                    value={formData.motivo}
                    onChange={handleChange}
                    maxLength="255"
                    required
                  />
                  <label htmlFor="motivo">
                    Motivo <span className="text-danger">*</span>
                  </label>
                </div>

                {/* Observaciones */}
                <div className="form-floating mb-3">
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    className="form-control"
                    placeholder="Observaciones adicionales"
                    value={formData.observaciones}
                    onChange={handleChange}
                    style={{ height: '100px' }}
                    maxLength="500"
                  ></textarea>
                  <label htmlFor="observaciones">Observaciones</label>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral - Información */}
          <div className="col-lg-4">
            {/* Información del Producto */}
            {productoSeleccionado && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0 text-dark">
                    <FaInfoCircle className="me-2" />
                    Información del Producto
                  </h5>
                </div>
                <div className="card-body">
                  <h6 className="text-primary">{productoSeleccionado.nombre}</h6>
                  
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Stock Actual:</span>
                      <span className="fw-bold">{productoSeleccionado.stock || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Stock Mínimo:</span>
                      <span>{productoSeleccionado.stock_minimo || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Stock Reservado:</span>
                      <span className="text-warning">{productoSeleccionado.stock_reservado || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Stock Disponible:</span>
                      <span className="fw-bold text-success">
                        {(productoSeleccionado.stock || 0) - (productoSeleccionado.stock_reservado || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Previsualización del resultado */}
                  {formData.cantidad && formData.tipo_movimiento && (
                    <div className="mt-3 p-3 bg-light rounded">
                      <h6>Stock después del movimiento:</h6>
                      <div className="d-flex justify-content-between">
                        <span>Nuevo Stock:</span>
                        <span className="fw-bold">
                          {(() => {
                            const stockActual = productoSeleccionado.stock || 0;
                            const cantidad = parseFloat(formData.cantidad) || 0;
                            
                            if (['ingreso', 'ajuste_positivo'].includes(formData.tipo_movimiento)) {
                              return stockActual + cantidad;
                            } else {
                              return Math.max(0, stockActual - cantidad);
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ayuda */}
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0 text-dark">
                  <FaInfoCircle className="me-2" />
                  Ayuda
                </h5>
              </div>
              <div className="card-body">
                <h6>Tipos de Movimiento:</h6>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <FaArrowUp className="text-success me-2" />
                    <strong>Ingreso:</strong> Compras, devoluciones
                  </li>
                  <li className="mb-2">
                    <FaArrowDown className="text-danger me-2" />
                    <strong>Egreso:</strong> Ventas, consumos
                  </li>
                  <li className="mb-2">
                    <FaArrowUp className="text-info me-2" />
                    <strong>Ajuste +:</strong> Correcciones de inventario
                  </li>
                  <li>
                    <FaArrowDown className="text-warning me-2" />
                    <strong>Ajuste -:</strong> Pérdidas, vencimientos
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="card mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/stock/movimientos')}
              >
                <FaTimes className="me-2" />
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <FaSave className="me-2" />
                {loading ? 'Registrando...' : 'Registrar Movimiento'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RegistroMovimiento;