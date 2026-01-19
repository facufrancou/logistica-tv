import React, { useState, useEffect, useCallback } from 'react';
import {
  getOrdenesCompra,
  getProveedoresOrden,
  cambiarEstadoOrden,
  eliminarOrdenCompra
} from '../../services/api';
import OrdenCompraForm from './OrdenCompraForm';
import OrdenCompraDetalle from './OrdenCompraDetalle';
import IngresoOrdenCompra from './IngresoOrdenCompra';
import { FaShoppingCart, FaPlus, FaSync } from 'react-icons/fa';
import './OrdenesCompra.css';

const OrdenesCompra = () => {
  // Estados
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0
  });

  // Filtros
  const [filtros, setFiltros] = useState({
    estado: '',
    id_proveedor: '',
    fecha_desde: '',
    fecha_hasta: '',
    search: ''
  });

  // Modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState(null);

  // Dropdown de acciones
  const [openDropdown, setOpenDropdown] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    cargarOrdenes();
  }, [filtros, pagination.current_page]);

  const cargarProveedores = async () => {
    try {
      const response = await getProveedoresOrden();
      if (response.success) {
        setProveedores(response.data);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    }
  };

  const cargarOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filtros,
        page: pagination.current_page,
        limit: 15
      };
      const response = await getOrdenesCompra(params);
      if (response.success) {
        setOrdenes(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagination.current_page]);

  // Handlers de filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      estado: '',
      id_proveedor: '',
      fecha_desde: '',
      fecha_hasta: '',
      search: ''
    });
  };

  // Handlers de acciones
  const handleNuevaOrden = () => {
    setSelectedOrden(null);
    setShowFormModal(true);
  };

  const handleVerDetalle = (orden) => {
    setSelectedOrden(orden);
    setShowDetalleModal(true);
    setOpenDropdown(null);
  };

  const handleEditar = (orden) => {
    setSelectedOrden(orden);
    setShowFormModal(true);
    setOpenDropdown(null);
  };

  const handleRegistrarIngreso = (orden) => {
    setSelectedOrden(orden);
    setShowIngresoModal(true);
    setOpenDropdown(null);
  };

  const handleCambiarEstado = async (orden, nuevoEstado) => {
    try {
      await cambiarEstadoOrden(orden.id_orden_compra, nuevoEstado);
      cargarOrdenes();
    } catch (error) {
      alert(error.message);
    }
    setOpenDropdown(null);
  };

  const handleEliminar = async (orden) => {
    if (!window.confirm('¿Está seguro de eliminar esta orden de compra?')) {
      return;
    }
    try {
      await eliminarOrdenCompra(orden.id_orden_compra);
      cargarOrdenes();
    } catch (error) {
      alert(error.message);
    }
    setOpenDropdown(null);
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setSelectedOrden(null);
    cargarOrdenes();
  };

  const handleIngresoSuccess = () => {
    setShowIngresoModal(false);
    setSelectedOrden(null);
    cargarOrdenes();
  };

  // Calcular stats
  const stats = {
    pendientes: ordenes.filter(o => o.estado === 'pendiente' || o.estado === 'confirmada').length,
    parciales: ordenes.filter(o => o.estado === 'parcial').length,
    ingresadas: ordenes.filter(o => o.estado === 'ingresada').length,
    total: pagination.total_count
  };

  // Formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  // Formatear moneda
  const formatMoney = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  // Obtener texto de estado
  const getEstadoTexto = (estado) => {
    const estados = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      parcial: 'Parcial',
      ingresada: 'Ingresada',
      cancelada: 'Cancelada'
    };
    return estados[estado] || estado;
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="container-fluid p-4">
      {/* Header con estilo consistente */}
      <div className="card mb-3 shadow-sm" style={{ backgroundColor: 'var(--color-principal)' }}>
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 text-white">
              <FaShoppingCart className="me-2" />
              Órdenes de Compra
            </h4>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-light btn-sm"
                onClick={cargarOrdenes}
                disabled={loading}
              >
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                Actualizar
              </button>
              <button className="btn btn-success btn-sm" onClick={handleNuevaOrden}>
                <FaPlus className="me-1" />
                Nueva Orden
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card pendiente">
          <div className="stat-info">
            <h3>{stats.pendientes}</h3>
            <p>Pendientes/Confirmadas</p>
          </div>
        </div>
        <div className="stat-card parcial">
          <div className="stat-info">
            <h3>{stats.parciales}</h3>
            <p>Ingresos Parciales</p>
          </div>
        </div>
        <div className="stat-card ingresada">
          <div className="stat-info">
            <h3>{stats.ingresadas}</h3>
            <p>Completadas</p>
          </div>
        </div>
        <div className="stat-card confirmada">
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Órdenes</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtros-grid">
          <div className="filtro-group">
            <label>Buscar</label>
            <input
              type="text"
              name="search"
              placeholder="Nº orden..."
              value={filtros.search}
              onChange={handleFiltroChange}
            />
          </div>
          <div className="filtro-group">
            <label>Estado</label>
            <select name="estado" value={filtros.estado} onChange={handleFiltroChange}>
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="parcial">Parcial</option>
              <option value="ingresada">Ingresada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="filtro-group">
            <label>Proveedor</label>
            <select name="id_proveedor" value={filtros.id_proveedor} onChange={handleFiltroChange}>
              <option value="">Todos</option>
              {proveedores.map(p => (
                <option key={p.id_proveedor} value={p.id_proveedor}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro-group">
            <label>Desde</label>
            <input
              type="date"
              name="fecha_desde"
              value={filtros.fecha_desde}
              onChange={handleFiltroChange}
            />
          </div>
          <div className="filtro-group">
            <label>Hasta</label>
            <input
              type="date"
              name="fecha_hasta"
              value={filtros.fecha_hasta}
              onChange={handleFiltroChange}
            />
          </div>
          <div className="filtros-actions">
            <button className="btn btn-secondary btn-sm" onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="ordenes-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="empty-state">
            <h3>No hay órdenes de compra</h3>
            <p>Crea tu primera orden de compra para gestionar el stock</p>
            <button className="btn btn-primary" onClick={handleNuevaOrden}>
              Nueva Orden
            </button>
          </div>
        ) : (
          <>
            <table className="ordenes-table">
              <thead>
                <tr>
                  <th>Nº Orden</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Proveedores</th>
                  <th>Items</th>
                  <th>Progreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(orden => (
                  <tr key={orden.id_orden_compra}>
                    <td>
                      <span className="orden-numero">{orden.numero_orden}</span>
                      {orden.cotizacion_info && (
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                          {orden.cotizacion_info.numero} - {orden.cotizacion_info.cliente}
                        </div>
                      )}
                    </td>
                    <td>{formatFecha(orden.fecha_creacion)}</td>
                    <td>
                      <span className={`estado-badge ${orden.estado}`}>
                        {getEstadoTexto(orden.estado)}
                      </span>
                    </td>
                    <td>
                      <div className="proveedores-list">
                        {orden.resumen?.proveedores?.slice(0, 3).map(p => (
                          <span key={p.id_proveedor} className="proveedor-pill">
                            {p.nombre}
                            <span className="cantidad">{p.items}</span>
                          </span>
                        ))}
                        {orden.resumen?.proveedores?.length > 3 && (
                          <span className="proveedor-pill">
                            +{orden.resumen.proveedores.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {orden.resumen?.total_items} items
                      <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                        {orden.resumen?.total_dosis_solicitadas?.toLocaleString()} dosis
                      </div>
                    </td>
                    <td>
                      <div className="progreso-container">
                        <div className="progreso-bar">
                          <div
                            className={`progreso-fill ${
                              orden.resumen?.porcentaje_recibido < 30 ? 'bajo' :
                              orden.resumen?.porcentaje_recibido < 70 ? 'medio' : 'alto'
                            }`}
                            style={{ width: `${orden.resumen?.porcentaje_recibido || 0}%` }}
                          />
                        </div>
                        <span className="progreso-text">
                          {orden.resumen?.porcentaje_recibido || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="acciones-cell">
                      <button
                        className="acciones-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === orden.id_orden_compra ? null : orden.id_orden_compra);
                        }}
                      >
                        ⋮
                      </button>
                      {openDropdown === orden.id_orden_compra && (
                        <div className="acciones-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleVerDetalle(orden)}>
                            Ver Detalle
                          </button>
                          {['borrador', 'pendiente'].includes(orden.estado) && (
                            <button onClick={() => handleEditar(orden)}>
                              Editar
                            </button>
                          )}
                          {orden.estado === 'borrador' && (
                            <button onClick={() => handleCambiarEstado(orden, 'pendiente')}>
                              Enviar a Pendiente
                            </button>
                          )}
                          {orden.estado === 'pendiente' && (
                            <button onClick={() => handleCambiarEstado(orden, 'confirmada')}>
                              Confirmar
                            </button>
                          )}
                          {['confirmada', 'parcial'].includes(orden.estado) && (
                            <button onClick={() => handleRegistrarIngreso(orden)}>
                              Registrar Ingreso
                            </button>
                          )}
                          {['borrador', 'pendiente', 'confirmada', 'parcial'].includes(orden.estado) && (
                            <button onClick={() => handleCambiarEstado(orden, 'cancelada')} className="danger">
                              Cancelar
                            </button>
                          )}
                          {orden.estado === 'borrador' && (
                            <button onClick={() => handleEliminar(orden)} className="danger">
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            {pagination.total_pages > 1 && (
              <div className="pagination">
                <button
                  disabled={pagination.current_page === 1}
                  onClick={() => setPagination(p => ({ ...p, current_page: p.current_page - 1 }))}
                >
                  ← Anterior
                </button>
                {[...Array(pagination.total_pages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={pagination.current_page === i + 1 ? 'active' : ''}
                    onClick={() => setPagination(p => ({ ...p, current_page: i + 1 }))}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={pagination.current_page === pagination.total_pages}
                  onClick={() => setPagination(p => ({ ...p, current_page: p.current_page + 1 }))}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Formulario */}
      {showFormModal && (
        <OrdenCompraForm
          orden={selectedOrden}
          onClose={() => {
            setShowFormModal(false);
            setSelectedOrden(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal: Detalle */}
      {showDetalleModal && selectedOrden && (
        <OrdenCompraDetalle
          ordenId={selectedOrden.id_orden_compra}
          onClose={() => {
            setShowDetalleModal(false);
            setSelectedOrden(null);
          }}
          onRegistrarIngreso={() => {
            setShowDetalleModal(false);
            setShowIngresoModal(true);
          }}
        />
      )}

      {/* Modal: Ingreso */}
      {showIngresoModal && selectedOrden && (
        <IngresoOrdenCompra
          ordenId={selectedOrden.id_orden_compra}
          onClose={() => {
            setShowIngresoModal(false);
            setSelectedOrden(null);
          }}
          onSuccess={handleIngresoSuccess}
        />
      )}
    </div>
  );
};

export default OrdenesCompra;
