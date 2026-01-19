import React, { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave, 
  FaCheck, 
  FaTimes, 
  FaInfoCircle,
  FaCalculator,
  FaSave,
  FaExclamationTriangle,
  FaSpinner
} from 'react-icons/fa';
import './ClasificacionFiscal.css';

const ClasificacionFiscalSimple = ({ cotizacionId, onClasificacionCompleta }) => {
  const [items, setItems] = useState([]);
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('ClasificacionFiscal - cotizacionId:', cotizacionId);
    if (cotizacionId) {
      cargarItems();
    }
  }, [cotizacionId]);

  const cargarItems = async () => {
    try {
      console.log('Cargando items para cotización:', cotizacionId);
      setLoading(true);
      setError(null);
      
      const API_BASE = "http://localhost:3001";
      const response = await fetch(`${API_BASE}/liquidaciones/cotizacion/${cotizacionId}/items`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Datos recibidos:', data);
      
      setCotizacion(data.cotizacion);
      setItems(data.items);
    } catch (error) {
      console.error('Error al cargar items:', error);
      setError(`Error al cargar los items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clasificarItem = async (itemId, tipo) => {
    try {
      console.log('Clasificando item:', itemId, 'como:', tipo);
      
      const API_BASE = "http://localhost:3001";
      const response = await fetch(`${API_BASE}/liquidaciones/item/${itemId}/clasificar`, {
        method: 'PUT',
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tipo_facturacion: tipo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Actualizar estado local
      const itemsActualizados = items.map(item => 
        item.id_detalle_cotizacion === itemId 
          ? { ...item, facturacion_tipo: tipo }
          : item
      );
      setItems(itemsActualizados);

    } catch (error) {
      console.error('Error al clasificar item:', error);
      alert(`Error al clasificar item: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <FaSpinner className="fa-spin me-2" />
        <span>Cargando items para clasificación...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <FaExclamationTriangle className="me-2" />
        {error}
        <br />
        <button 
          className="btn btn-outline-danger btn-sm mt-2"
          onClick={cargarItems}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="alert alert-info">
        <FaInfoCircle className="me-2" />
        No hay items pendientes de clasificación para esta cotización.
      </div>
    );
  }

  const calcularTotales = () => {
    const negro = items.filter(item => item.facturacion_tipo === 'negro').reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const blanco = items.filter(item => item.facturacion_tipo === 'blanco').reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const pendiente = items.filter(item => item.facturacion_tipo === 'pendiente').reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const total = negro + blanco + pendiente;

    return {
      negro,
      blanco,
      pendiente,
      total,
      porcentaje_negro: total > 0 ? (negro / total) * 100 : 0,
      porcentaje_blanco: total > 0 ? (blanco / total) * 100 : 0
    };
  };

  const totales = calcularTotales();

  return (
    <>
      <div className="clasificacion-fiscal">
        {/* Header del componente */}
        <div className="row mb-4">
          <div className="col-md-8">
            <h4 className="mb-1">
              <FaMoneyBillWave className="me-2 text-primary" />
              Clasificación Fiscal
            </h4>
            <p className="text-muted mb-0">
              Cotización {cotizacion?.numero_cotizacion || 'N/A'} • {cotizacion?.cliente?.nombre || 'N/A'}
            </p>
          </div>
        </div>

        {/* Información general y totales */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card border-success shadow-sm h-100">
              <div className="card-body bg-light">
                <h6 className="card-title text-success fw-bold">
                  <FaInfoCircle className="me-2" />
                  Información General
                </h6>
                <div className="row">
                  <div className="col-6">
                    <small className="text-muted">Cliente</small>
                    <div className="fw-bold text-dark">{cotizacion?.cliente?.nombre || 'N/A'}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">CUIT</small>
                    <div className="fw-bold text-dark">{cotizacion?.cliente?.cuit || 'No especificado'}</div>
                  </div>
                  <div className="col-6 mt-2">
                    <small className="text-muted">Estado</small>
                    <div>
                      {totales.pendiente > 0 ? (
                        <span className="badge bg-warning">Pendiente</span>
                      ) : (
                        <span className="badge bg-success">Clasificado</span>
                      )}
                    </div>
                  </div>
                  <div className="col-6 mt-2">
                    <small className="text-muted">Items</small>
                    <div className="fw-bold text-dark">{items.length} productos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card border-success shadow-sm h-100">
              <div className="card-body bg-light">
                <h6 className="card-title text-success fw-bold">
                  <FaCalculator className="me-2" />
                  Totales de Clasificación
                </h6>
                <div className="row">
                  <div className="col-6">
                    <small className="text-muted">Vía 2 (Negro)</small>
                    <div className="h5 fw-bold text-dark mb-0">${totales.negro.toLocaleString()}</div>
                    <small className="text-muted">{totales.porcentaje_negro.toFixed(1)}%</small>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Vía 1 (Blanco)</small>
                    <div className="h5 fw-bold text-dark mb-0">${totales.blanco.toLocaleString()}</div>
                    <small className="text-muted">{totales.porcentaje_blanco.toFixed(1)}%</small>
                  </div>
                </div>
                <hr className="my-2" />
                <div className="mt-2">
                  <small className="text-muted">Total General</small>
                  <div className="h4 fw-bold text-success mb-0">${totales.total.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Tabla de items */}
      <div className="table-responsive">
        <table className="table table-sm table-hover">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-center">Cantidad</th>
              <th className="text-end">Precio Base</th>
              <th className="text-end">Recargo</th>
              <th className="text-end">Precio Final</th>
              <th className="text-end">Subtotal</th>
              <th className="text-center">Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  <strong>{item.producto?.nombre}</strong>
                  <br />
                  <small className="text-muted">{item.producto?.descripcion}</small>
                </td>
                <td className="text-center">{item.cantidad_total}</td>
                <td className="text-end">${parseFloat(item.precio_base_producto).toLocaleString()}</td>
                <td className="text-end">
                  {item.porcentaje_aplicado ? `+${item.porcentaje_aplicado}%` : 'Sin recargo'}
                </td>
                <td className="text-end">${parseFloat(item.precio_final_calculado).toLocaleString()}</td>
                <td className="text-end fw-bold">${parseFloat(item.subtotal).toLocaleString()}</td>
                <td className="text-center">
                  {item.facturacion_tipo === 'pendiente' && (
                    <span className="badge bg-warning">Pendiente</span>
                  )}
                  {item.facturacion_tipo === 'negro' && (
                    <span className="badge bg-dark">Vía 2</span>
                  )}
                  {item.facturacion_tipo === 'blanco' && (
                    <span className="badge bg-light text-dark">Vía 1</span>
                  )}
                </td>
                <td className="text-center">
                  <div className="btn-group btn-group-sm">
                    <button
                      className={`btn ${item.facturacion_tipo === 'negro' ? 'btn-dark' : 'btn-outline-dark'}`}
                      onClick={() => clasificarItem(item.id_detalle_cotizacion, 'negro')}
                      title="Vía 2"
                    >
                      Vía 2
                    </button>
                    <button
                      className={`btn ${item.facturacion_tipo === 'blanco' ? 'btn-light' : 'btn-outline-light'}`}
                      onClick={() => clasificarItem(item.id_detalle_cotizacion, 'blanco')}
                      title="Vía 1"
                    >
                      Vía 1
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </div>

      {/* Botones de acción al final */}
      <div className="liquidacion-modal-actions">
        <button 
          className="btn btn-success"
          onClick={onClasificacionCompleta}
          disabled={totales.pendiente > 0}
        >
          <FaSave className="me-2" />
          Guardar Clasificación
        </button>
        <button 
          className="btn btn-secondary"
          onClick={onClasificacionCompleta}
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

export default ClasificacionFiscalSimple;