import React, { useState, useEffect, useRef } from 'react';
import {
  crearOrdenCompra,
  actualizarOrdenCompra,
  getStockGlobalVacunas,
  getCotizacionesDisponibles,
  getSugerenciaCotizacion,
  getProveedoresOrden
} from '../../services/api';

const OrdenCompraForm = ({ orden, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingVacunas, setLoadingVacunas] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    id_cotizacion: '',
    fecha_esperada: '',
    observaciones: ''
  });

  // Items de la orden
  const [items, setItems] = useState([]);

  // Datos auxiliares
  const [cotizaciones, setCotizaciones] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [vacunasDisponibles, setVacunasDisponibles] = useState([]);
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // Modal de selección de vacunas
  const [showVacunasModal, setShowVacunasModal] = useState(false);
  const [vacunasSeleccionadas, setVacunasSeleccionadas] = useState({});
  const [busquedaVacuna, setBusquedaVacuna] = useState('');

  // Búsqueda de cotización
  const [busquedaCotizacion, setBusquedaCotizacion] = useState('');
  const [showCotizacionDropdown, setShowCotizacionDropdown] = useState(false);
  const cotizacionRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar orden existente
  useEffect(() => {
    if (orden) {
      setFormData({
        id_cotizacion: orden.id_cotizacion || '',
        fecha_esperada: orden.fecha_esperada ? orden.fecha_esperada.split('T')[0] : '',
        observaciones: orden.observaciones || ''
      });
      // Cargar nombre de cotización si existe
      if (orden.id_cotizacion && orden.cotizacion) {
        setBusquedaCotizacion(`${orden.cotizacion.numero_cotizacion} - ${orden.cotizacion.cliente?.nombre || ''}`);
      }
      // Convertir detalle_orden a items
      if (orden.detalle_orden) {
        setItems(orden.detalle_orden.map(d => ({
          id_vacuna: d.id_vacuna,
          id_proveedor: d.id_proveedor,
          vacuna_nombre: d.vacuna?.nombre || '',
          proveedor_nombre: d.proveedor?.nombre || '',
          cantidad_solicitada: d.cantidad_solicitada,
          precio_estimado: d.precio_estimado || ''
        })));
      }
    }
  }, [orden]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cotizacionRef.current && !cotizacionRef.current.contains(event.target)) {
        setShowCotizacionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [cotizacionesRes, proveedoresRes] = await Promise.all([
        getCotizacionesDisponibles(),
        getProveedoresOrden()
      ]);

      if (cotizacionesRes.success) {
        setCotizaciones(cotizacionesRes.data);
      }
      if (proveedoresRes.success) {
        setProveedores(proveedoresRes.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  // Filtrar cotizaciones por búsqueda
  const cotizacionesFiltradas = cotizaciones.filter(cot => {
    if (!busquedaCotizacion.trim()) return true;
    const busqueda = busquedaCotizacion.toLowerCase().trim();
    const numeroCot = (cot.numero_cotizacion || '').toLowerCase();
    const clienteNombre = (cot.cliente_nombre || '').toLowerCase();
    const planNombre = (cot.plan_nombre || '').toLowerCase();
    return numeroCot.includes(busqueda) || 
           clienteNombre.includes(busqueda) || 
           planNombre.includes(busqueda);
  });

  // Seleccionar cotización
  const handleSeleccionarCotizacion = (cot) => {
    setFormData({ ...formData, id_cotizacion: cot.id_cotizacion });
    setBusquedaCotizacion(`${cot.numero_cotizacion} - ${cot.cliente_nombre} (${cot.plan_nombre})`);
    setShowCotizacionDropdown(false);
  };

  // Limpiar cotización
  const handleLimpiarCotizacion = () => {
    setFormData({ ...formData, id_cotizacion: '' });
    setBusquedaCotizacion('');
  };

  const cargarVacunas = async (idCotizacion = null) => {
    setLoadingVacunas(true);
    try {
      const response = await getStockGlobalVacunas(idCotizacion, mostrarTodas);
      if (response.success) {
        setVacunasDisponibles(response.data);
      }
    } catch (error) {
      console.error('Error cargando vacunas:', error);
    } finally {
      setLoadingVacunas(false);
    }
  };

  const handleCargarSugerencia = async () => {
    if (!formData.id_cotizacion) {
      alert('Seleccione una cotización primero');
      return;
    }

    setLoadingVacunas(true);
    try {
      const response = await getSugerenciaCotizacion(formData.id_cotizacion);
      if (response.success && response.data.items_sugeridos) {
        const nuevosItems = response.data.items_sugeridos.map(item => ({
          id_vacuna: item.id_vacuna,
          id_proveedor: item.id_proveedor,
          vacuna_nombre: item.vacuna_nombre,
          proveedor_nombre: item.proveedor_nombre,
          cantidad_solicitada: item.cantidad_sugerida,
          precio_estimado: item.precio_estimado || 0,
          stock_disponible: item.stock_disponible,
          dosis_necesarias: item.dosis_necesarias,
          faltante: item.faltante,
          detalle_lotes: item.detalle_lotes || [],
          detalle_stock: item.detalle_stock
        }));
        // Reemplazar items existentes
        setItems(nuevosItems);
      } else {
        alert('No se encontraron items en la cotización');
      }
    } catch (error) {
      alert('Error al cargar sugerencia: ' + error.message);
    } finally {
      setLoadingVacunas(false);
    }
  };

  const handleAbrirSelectorVacunas = () => {
    cargarVacunas(formData.id_cotizacion || null);
    setShowVacunasModal(true);
    setBusquedaVacuna(''); // Limpiar búsqueda al abrir
    // Marcar las ya seleccionadas
    const seleccionadas = {};
    items.forEach(item => {
      seleccionadas[item.id_vacuna] = true;
    });
    setVacunasSeleccionadas(seleccionadas);
  };

  const handleToggleVacuna = (vacuna) => {
    setVacunasSeleccionadas(prev => ({
      ...prev,
      [vacuna.id_vacuna]: !prev[vacuna.id_vacuna]
    }));
  };

  const handleConfirmarVacunas = () => {
    const nuevasVacunas = vacunasDisponibles
      .filter(v => vacunasSeleccionadas[v.id_vacuna] && !items.find(i => i.id_vacuna === v.id_vacuna))
      .map(v => ({
        id_vacuna: v.id_vacuna,
        id_proveedor: v.id_proveedor,
        vacuna_nombre: v.nombre,
        proveedor_nombre: v.proveedor_nombre,
        cantidad_solicitada: v.faltante_sugerido || 0,
        precio_estimado: v.precio_lista,
        stock_disponible: v.stock?.disponible || 0,
        detalle_lotes: v.detalle_lotes
      }));

    setItems(prev => [...prev, ...nuevasVacunas]);
    setShowVacunasModal(false);
  };

  const handleItemChange = (index, field, value) => {
    const nuevosItems = [...items];
    nuevosItems[index] = {
      ...nuevosItems[index],
      [field]: field === 'cantidad_solicitada' || field === 'precio_estimado'
        ? parseFloat(value) || 0
        : value
    };
    setItems(nuevosItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert('Debe agregar al menos un item a la orden');
      return;
    }

    // Validar items
    for (const item of items) {
      if (!item.cantidad_solicitada || item.cantidad_solicitada <= 0) {
        alert('Todos los items deben tener una cantidad válida');
        return;
      }
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        id_cotizacion: formData.id_cotizacion ? parseInt(formData.id_cotizacion) : null,
        items: items.map(item => ({
          id_vacuna: item.id_vacuna,
          id_proveedor: item.id_proveedor,
          cantidad_solicitada: parseInt(item.cantidad_solicitada),
          precio_estimado: parseFloat(item.precio_estimado) || null
        }))
      };

      if (orden) {
        await actualizarOrdenCompra(orden.id_orden_compra, data);
      } else {
        await crearOrdenCompra(data);
      }

      onSuccess();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales
  const calcularTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.cantidad_solicitada * (item.precio_estimado || 0));
    }, 0);
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value || 0);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1100px' }}>
        <div className="modal-header">
          <h2>
            {orden ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Datos Generales */}
          <div className="form-section">
            <div className="form-section-title">Datos Generales</div>
            <div className="form-grid">
              <div className="form-group" ref={cotizacionRef} style={{ position: 'relative' }}>
                <label>Cotización Asociada (opcional)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Buscar por nº cotización, cliente o plan..."
                    value={busquedaCotizacion}
                    onChange={(e) => {
                      setBusquedaCotizacion(e.target.value);
                      setShowCotizacionDropdown(true);
                      if (!e.target.value) {
                        setFormData({ ...formData, id_cotizacion: '' });
                      }
                    }}
                    onFocus={() => setShowCotizacionDropdown(true)}
                    style={{ paddingRight: formData.id_cotizacion ? '30px' : '10px' }}
                  />
                  {formData.id_cotizacion && (
                    <button
                      type="button"
                      onClick={handleLimpiarCotizacion}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#718096',
                        fontSize: '1.2rem',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                {showCotizacionDropdown && (
                  <div className="cotizacion-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    marginTop: '4px'
                  }}>
                    <div
                      className="cotizacion-option"
                      onClick={() => {
                        handleLimpiarCotizacion();
                        setShowCotizacionDropdown(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        backgroundColor: !formData.id_cotizacion ? '#ebf8ff' : 'white',
                        borderBottom: '1px solid #e2e8f0',
                        fontStyle: 'italic',
                        color: '#718096'
                      }}
                    >
                      Sin cotización
                    </div>
                    {cotizacionesFiltradas.length === 0 ? (
                      <div style={{ padding: '12px', color: '#a0aec0', textAlign: 'center' }}>
                        No se encontraron cotizaciones
                      </div>
                    ) : (
                      cotizacionesFiltradas.map(cot => (
                        <div
                          key={cot.id_cotizacion}
                          className="cotizacion-option"
                          onClick={() => handleSeleccionarCotizacion(cot)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            backgroundColor: formData.id_cotizacion === cot.id_cotizacion ? '#ebf8ff' : 'white',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f7fafc'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = formData.id_cotizacion === cot.id_cotizacion ? '#ebf8ff' : 'white'}
                        >
                          <div style={{ fontWeight: '600', color: '#2d3748' }}>
                            {cot.numero_cotizacion} - {cot.cliente_nombre}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                            {cot.plan_nombre}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Fecha Esperada de Entrega</label>
                <input
                  type="date"
                  value={formData.fecha_esperada}
                  onChange={(e) => setFormData({ ...formData, fecha_esperada: e.target.value })}
                />
              </div>
              {formData.id_cotizacion && (
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCargarSugerencia}
                    disabled={loadingVacunas}
                  >
                    {loadingVacunas ? 'Cargando...' : 'Cargar Sugerencia'}
                  </button>
                </div>
              )}
              <div className="form-group full-width">
                <label>Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="items-section">
            <div className="items-header">
              <div className="form-section-title" style={{ margin: 0 }}>
                Items de la Orden ({items.length})
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAbrirSelectorVacunas}
              >
                + Agregar Vacunas
              </button>
            </div>

            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <p>No hay items en la orden</p>
                <button className="btn btn-primary" onClick={handleAbrirSelectorVacunas}>
                  Seleccionar Vacunas
                </button>
              </div>
            ) : (
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Vacuna</th>
                    <th style={{ width: '25%' }}>Proveedor</th>
                    <th style={{ width: '18%' }}>Stock Disp.</th>
                    <th style={{ width: '15%' }}>Cantidad</th>
                    <th style={{ width: '7%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{item.vacuna_nombre}</strong>
                        {item.dosis_necesarias && (
                          <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '2px' }}>
                            Necesario: {item.dosis_necesarias?.toLocaleString()} dosis
                            {item.faltante > 0 && (
                              <span style={{ color: '#e53e3e', marginLeft: '8px' }}>
                                (Faltante: {item.faltante?.toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>{item.proveedor_nombre}</td>
                      <td>
                        <span className={`${(item.stock_disponible || 0) <= 0 ? 'danger' : ''}`}>
                          {item.stock_disponible?.toLocaleString() || 0} dosis
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad_solicitada}
                          onChange={(e) => handleItemChange(index, 'cantidad_solicitada', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveItem(index)}
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
          >
            {loading ? 'Guardando...' : (orden ? 'Actualizar Orden' : 'Crear Orden')}
          </button>
        </div>
      </div>

      {/* Modal Selector de Vacunas */}
      {showVacunasModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2>Seleccionar Vacunas</h2>
              <button className="modal-close" onClick={() => setShowVacunasModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Buscador de vacunas */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar vacuna por nombre, código o patología..."
                  value={busquedaVacuna}
                  onChange={(e) => setBusquedaVacuna(e.target.value)}
                  style={{ marginBottom: '12px' }}
                  autoFocus
                />
              </div>
              
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={mostrarTodas}
                    onChange={(e) => {
                      setMostrarTodas(e.target.checked);
                      cargarVacunas(formData.id_cotizacion || null);
                    }}
                  />
                  Mostrar todas las vacunas (no solo con faltante)
                </label>
                <span style={{ color: '#718096' }}>
                  {vacunasDisponibles.filter(v => {
                    if (!busquedaVacuna.trim()) return true;
                    const busqueda = busquedaVacuna.toLowerCase();
                    return (v.nombre || '').toLowerCase().includes(busqueda) ||
                           (v.codigo || '').toLowerCase().includes(busqueda) ||
                           (v.patologia || '').toLowerCase().includes(busqueda) ||
                           (v.proveedor_nombre || '').toLowerCase().includes(busqueda);
                  }).length} vacunas disponibles
                </span>
              </div>

              {loadingVacunas ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Vacuna</th>
                        <th>Proveedor</th>
                        <th>Stock Disp.</th>
                        <th>Faltante Sug.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacunasDisponibles
                        .filter(v => {
                          if (!busquedaVacuna.trim()) return true;
                          const busqueda = busquedaVacuna.toLowerCase();
                          return (v.nombre || '').toLowerCase().includes(busqueda) ||
                                 (v.codigo || '').toLowerCase().includes(busqueda) ||
                                 (v.patologia || '').toLowerCase().includes(busqueda) ||
                                 (v.proveedor_nombre || '').toLowerCase().includes(busqueda);
                        })
                        .map(vacuna => (
                        <tr
                          key={vacuna.id_vacuna}
                          style={{
                            background: vacunasSeleccionadas[vacuna.id_vacuna] ? '#ebf8ff' : 'white',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleToggleVacuna(vacuna)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={!!vacunasSeleccionadas[vacuna.id_vacuna]}
                              onChange={() => handleToggleVacuna(vacuna)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td>
                            <strong>{vacuna.nombre}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                              {vacuna.codigo} - {vacuna.patologia}
                            </div>
                          </td>
                          <td>{vacuna.proveedor_nombre}</td>
                          <td>
                            <span className={vacuna.stock?.disponible <= 0 ? 'danger' : ''}>
                              {vacuna.stock?.disponible?.toLocaleString() || 0}
                            </span>
                            {vacuna.detalle_lotes?.length > 0 && (
                              <div style={{ fontSize: '0.7rem', color: '#718096' }}>
                                {vacuna.detalle_lotes.length} lotes
                              </div>
                            )}
                          </td>
                          <td>
                            <strong style={{ color: vacuna.faltante_sugerido > 0 ? '#e53e3e' : '#38a169' }}>
                              {vacuna.faltante_sugerido?.toLocaleString() || 0}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVacunasModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleConfirmarVacunas}>
                Agregar Seleccionadas ({Object.values(vacunasSeleccionadas).filter(Boolean).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdenCompraForm;
