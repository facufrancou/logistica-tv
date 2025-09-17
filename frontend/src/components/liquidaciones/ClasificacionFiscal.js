import React, { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave, 
  FaCheck, 
  FaTimes, 
  FaInfoCircle,
  FaCalculator,
  FaSave,
  FaExclamationTriangle
} from 'react-icons/fa';
import liquidacionesService from '../../services/liquidacionesService';
import './ClasificacionFiscal.css';

const ClasificacionFiscal = ({ cotizacionId, onClasificacionCompleta }) => {
  const [items, setItems] = useState([]);
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [totales, setTotales] = useState({
    negro: 0,
    blanco: 0,
    pendiente: 0,
    total: 0,
    porcentaje_negro: 0,
    porcentaje_blanco: 0
  });

  useEffect(() => {
    if (cotizacionId) {
      cargarItems();
    }
  }, [cotizacionId]);

  useEffect(() => {
    // Recalcular totales cuando cambian los items
    const nuevos_totales = liquidacionesService.calcularTotalesClasificacion(items);
    setTotales(nuevos_totales);
  }, [items]);

  const cargarItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await liquidacionesService.obtenerItemsClasificacion(cotizacionId);
      setCotizacion(data.cotizacion);
      setItems(data.items);
    } catch (error) {
      console.error('Error al cargar items:', error);
      setError('Error al cargar los items para clasificación');
    } finally {
      setLoading(false);
    }
  };

  const clasificarItem = async (itemId, tipo) => {
    try {
      setSaving(true);
      
      // Actualizar localmente primero para UX
      const itemsActualizados = items.map(item => 
        item.id_detalle_cotizacion === itemId 
          ? { ...item, facturacion_tipo: tipo }
          : item
      );
      setItems(itemsActualizados);

      // Enviar al servidor
      await liquidacionesService.clasificarItem(itemId, tipo);

      // Verificar si todos están clasificados
      if (liquidacionesService.todosItemsClasificados(itemsActualizados) && onClasificacionCompleta) {
        onClasificacionCompleta();
      }

    } catch (error) {
      console.error('Error al clasificar item:', error);
      setError('Error al clasificar item');
      // Recargar items para revertir cambio local
      cargarItems();
    } finally {
      setSaving(false);
    }
  };

  const clasificarTodos = async (tipo) => {
    try {
      setSaving(true);
      
      const itemsPendientes = items.filter(item => item.facturacion_tipo === 'pendiente');
      const itemsParaClasificar = itemsPendientes.map(item => ({
        id_detalle_cotizacion: item.id_detalle_cotizacion,
        tipo_facturacion: tipo
      }));

      if (itemsParaClasificar.length === 0) {
        return;
      }

      await liquidacionesService.clasificarMultiplesItems(itemsParaClasificar);
      await cargarItems(); // Recargar para obtener datos actualizados

    } catch (error) {
      console.error('Error al clasificar todos los items:', error);
      setError('Error al clasificar múltiples items');
    } finally {
      setSaving(false);
    }
  };

  const obtenerColorBadge = (tipo) => {
    switch (tipo) {
      case 'negro': return 'bg-dark text-white'; // Vía 2
      case 'blanco': return 'bg-light text-dark border'; // Vía 1
      case 'pendiente': return 'bg-warning text-dark';
      default: return 'bg-light text-dark';
    }
  };

  const obtenerTextoTipo = (tipo) => {
    switch (tipo) {
      case 'negro': return 'Vía 2';
      case 'blanco': return 'Vía 1';
      case 'pendiente': return 'Pendiente';
      default: return 'Sin clasificar';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando items para clasificación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-danger d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            {error}
          </div>
          <button className="btn btn-primary" onClick={cargarItems}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const todosClasificados = liquidacionesService.todosItemsClasificados(items);
  const hayPendientes = items.some(item => item.facturacion_tipo === 'pendiente');

  return (
    <div className="clasificacion-fiscal">
      {/* Header con información de la cotización */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaCalculator className="me-2" />
            Clasificación Fiscal - {cotizacion?.numero_cotizacion}
          </h5>
          <div className="d-flex gap-2">
            {hayPendientes && (
              <>
                <button 
                  className="btn btn-sm btn-light text-dark"
                  onClick={() => clasificarTodos('blanco')}
                  disabled={saving}
                >
                  Marcar Todos Vía 1
                </button>
                <button 
                  className="btn btn-sm btn-dark"
                  onClick={() => clasificarTodos('negro')}
                  disabled={saving}
                >
                  Marcar Todos Vía 2
                </button>
              </>
            )}
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p className="mb-1"><strong>Cliente:</strong> {cotizacion?.cliente?.nombre}</p>
              <p className="mb-0"><strong>Total Cotización:</strong> {liquidacionesService.formatearPrecio(cotizacion?.precio_total)}</p>
            </div>
            <div className="col-md-6">
              <div className="alert alert-info mb-0">
                <FaInfoCircle className="me-2" />
                Clasifica cada producto como <strong>Vía 1</strong> (formal) o <strong>Vía 2</strong> (informal) según tu facturación
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de items para clasificar */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Items para Clasificar</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Base</th>
                  <th>Recargo</th>
                  <th>Precio Final</th>
                  <th>Subtotal</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id_detalle_cotizacion} className="align-middle">
                    <td>
                      <div>
                        <strong>{item.producto.nombre}</strong>
                        {item.producto.descripcion && (
                          <div className="text-muted small">{item.producto.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-primary">{item.cantidad_total}</span>
                    </td>
                    <td>{liquidacionesService.formatearPrecio(item.precio_base_producto)}</td>
                    <td>
                      {item.porcentaje_aplicado > 0 ? (
                        <span className="text-success">+{item.porcentaje_aplicado}%</span>
                      ) : (
                        <span className="text-muted">0%</span>
                      )}
                    </td>
                    <td>{liquidacionesService.formatearPrecio(item.precio_final_calculado)}</td>
                    <td>
                      <strong>{liquidacionesService.formatearPrecio(item.subtotal)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${obtenerColorBadge(item.facturacion_tipo)}`}>
                        {obtenerTextoTipo(item.facturacion_tipo)}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        <button
                          className={`btn btn-sm ${item.facturacion_tipo === 'blanco' ? 'btn-light text-dark border-primary' : 'btn-outline-light text-dark'}`}
                          onClick={() => clasificarItem(item.id_detalle_cotizacion, 'blanco')}
                          disabled={saving}
                          title="Marcar como Vía 1 (Formal)"
                        >
                          Vía 1
                        </button>
                        <button
                          className={`btn btn-sm ${item.facturacion_tipo === 'negro' ? 'btn-dark' : 'btn-outline-dark'}`}
                          onClick={() => clasificarItem(item.id_detalle_cotizacion, 'negro')}
                          disabled={saving}
                          title="Marcar como Vía 2 (Informal)"
                        >
                          Vía 2
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Resumen de Clasificación</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <div className="text-center p-3 border rounded bg-dark text-white">
                <h4 className="mb-1">{liquidacionesService.formatearPrecio(totales.negro)}</h4>
                <div>Negro ({totales.porcentaje_negro.toFixed(1)}%)</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 border rounded bg-secondary text-white">
                <h4 className="mb-1">{liquidacionesService.formatearPrecio(totales.blanco)}</h4>
                <div>Blanco ({totales.porcentaje_blanco.toFixed(1)}%)</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 border rounded bg-warning">
                <h4 className="mb-1">{liquidacionesService.formatearPrecio(totales.pendiente)}</h4>
                <div>Pendiente</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 border rounded bg-light">
                <h4 className="mb-1">{liquidacionesService.formatearPrecio(totales.total)}</h4>
                <div>Total General</div>
              </div>
            </div>
          </div>

          {todosClasificados && (
            <div className="alert alert-success mt-3 d-flex align-items-center">
              <FaCheck className="me-2" />
              <strong>¡Clasificación completa!</strong> Todos los items han sido clasificados.
            </div>
          )}

          {saving && (
            <div className="text-center mt-3">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span className="visually-hidden">Guardando...</span>
              </div>
              Guardando clasificación...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClasificacionFiscal;