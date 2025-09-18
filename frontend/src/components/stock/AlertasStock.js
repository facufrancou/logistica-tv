import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaExclamationTriangle, 
  FaSearch, 
  FaFilter,
  FaArrowLeft,
  FaWarehouse,
  FaBoxOpen,
  FaSync,
  FaExclamationCircle,
  FaCog,
  FaInfo,
  FaBan,
  FaLock
} from 'react-icons/fa';
import { 
  getAlertasStock,
  getEstadoStock,
  registrarMovimiento 
} from '../../services/stock/stockApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const AlertasStock = () => {
  const [alertas, setAlertas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    total_alertas: 0,
    alertas_criticas: 0,
    alertas_warning: 0,
    alertas_info: 0,
    productos_sin_configurar: 0
  });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    tipo_alerta: '',
    severidad: '',
    ordenPor: 'severidad'
  });
  const [procesandoAccion, setProcesandoAccion] = useState(null);
  const { showError, showSuccess, showWarning, showInfo } = useNotification();

  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      const response = await getAlertasStock();
      
      setAlertas(response.alertas || []);
      setEstadisticas({
        total_alertas: response.total_alertas || 0,
        alertas_criticas: response.alertas_criticas || 0,
        alertas_warning: response.alertas_warning || 0,
        alertas_info: response.alertas_info || 0,
        productos_sin_configurar: response.productos_sin_configurar || 0
      });
      
      // Mostrar notificación informativa sobre las alertas cargadas
      if (response.total_alertas > 0) {
        if (response.alertas_criticas > 0) {
          showWarning('Alertas Críticas', `Se encontraron ${response.alertas_criticas} alertas críticas de stock`);
        } else {
          showInfo('Alertas Actualizadas', `Se cargaron ${response.total_alertas} alertas de stock`);
        }
      } else {
        showSuccess('Todo en orden', 'No hay alertas de stock pendientes');
      }
      
    } catch (error) {
      console.error('Error cargando alertas:', error);
      showError('Error', 'No se pudieron cargar las alertas de stock');
    } finally {
      setLoading(false);
    }
  };
  const alertasFiltradas = alertas.filter(alerta => {
    if (filtros.busqueda && !alerta.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())) {
      return false;
    }
    if (filtros.tipo_alerta && alerta.tipo_alerta !== filtros.tipo_alerta) {
      return false;
    }
    if (filtros.severidad && alerta.severidad !== filtros.severidad) {
      return false;
    }
    return true;
  });

  // Ordenar alertas
  const alertasOrdenadas = [...alertasFiltradas].sort((a, b) => {
    switch (filtros.ordenPor) {
      case 'severidad':
        const prioridad = { 'error': 0, 'warning': 1, 'info': 2 };
        if (prioridad[a.severidad] !== prioridad[b.severidad]) {
          return prioridad[a.severidad] - prioridad[b.severidad];
        }
        return a.stock - b.stock;
      case 'nombre':
        return a.nombre.localeCompare(b.nombre);
      case 'stock':
        return a.stock - b.stock;
      default:
        return 0;
    }
  });

  const getAlertaInfo = (alerta) => {
    const configs = {
      'stock_agotado': { 
        class: 'border-danger bg-danger-subtle', 
        badgeClass: 'bg-danger', 
        text: 'Agotado', 
        icon: FaBan,
        color: 'text-danger'
      },
      'stock_critico': { 
        class: 'border-danger bg-danger-subtle', 
        badgeClass: 'bg-danger', 
        text: 'Crítico', 
        icon: FaExclamationCircle,
        color: 'text-danger'
      },
      'stock_bajo': { 
        class: 'border-warning bg-warning-subtle', 
        badgeClass: 'bg-warning text-dark', 
        text: 'Bajo', 
        icon: FaExclamationTriangle,
        color: 'text-warning'
      },
      'stock_reservado': { 
        class: 'border-info bg-info-subtle', 
        badgeClass: 'bg-info text-dark', 
        text: 'Reservado', 
        icon: FaLock,
        color: 'text-info'
      },
      'configuracion_faltante': { 
        class: 'border-secondary bg-light', 
        badgeClass: 'bg-secondary', 
        text: 'Sin Config.', 
        icon: FaCog,
        color: 'text-secondary'
      }
    };
    return configs[alerta.tipo_alerta] || configs['stock_bajo'];
  };

  const handleRegistrarIngreso = async (idProducto, nombreProducto) => {
    const cantidad = prompt(`¿Qué cantidad desea ingresar para ${nombreProducto}?`);
    if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
      return;
    }

    const motivo = prompt('Motivo del ingreso:', 'Reposición por stock bajo') || 'Reposición por stock bajo';

    try {
      setProcesandoAccion(idProducto);
      await registrarMovimiento({
        id_producto: idProducto,
        tipo_movimiento: 'ingreso',
        cantidad: parseInt(cantidad),
        motivo: motivo,
        observaciones: 'Ingreso desde alertas de stock'
      });
      
      showSuccess('Éxito', `Ingreso registrado para ${nombreProducto}`);
      cargarAlertas(); // Recargar para actualizar estado
    } catch (error) {
      console.error('Error registrando ingreso:', error);
      showError('Error', 'No se pudo registrar el ingreso');
    } finally {
      setProcesandoAccion(null);
    }
  };

  if (loading) {
    return (
      <div className="stock-loading">
        <div className="stock-spinner"></div>
        <p>Cargando alertas de stock...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header con estadísticas */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2 text-warning" />
            <h3 className="mb-0 text-dark">Alertas de Stock</h3>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-secondary d-flex align-items-center"
              onClick={cargarAlertas}
              disabled={loading}
            >
              <FaSync className="me-2" />
              Actualizar
            </button>
            <Link to="/stock" className="btn btn-outline-primary">
              <FaArrowLeft className="me-2" />
              Volver al Dashboard
            </Link>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <div className="text-center">
                <div className="h4 mb-1 text-primary">{estadisticas.total_alertas}</div>
                <small className="text-muted">Total Alertas</small>
              </div>
            </div>
            <div className="col-md-2">
              <div className="text-center">
                <div className="h4 mb-1 text-danger">{estadisticas.alertas_criticas}</div>
                <small className="text-muted">Críticas</small>
              </div>
            </div>
            <div className="col-md-2">
              <div className="text-center">
                <div className="h4 mb-1 text-warning">{estadisticas.alertas_warning}</div>
                <small className="text-muted">Advertencias</small>
              </div>
            </div>
            <div className="col-md-2">
              <div className="text-center">
                <div className="h4 mb-1 text-info">{estadisticas.alertas_info}</div>
                <small className="text-muted">Información</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="h4 mb-1 text-secondary">{estadisticas.productos_sin_configurar}</div>
                <small className="text-muted">Sin Stock Mínimo</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros mejorados */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <FaFilter className="me-2" />
            Filtros y Ordenamiento
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Buscar producto</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Buscar por nombre..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Tipo de Alerta</label>
              <select 
                className="form-select"
                value={filtros.tipo_alerta}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo_alerta: e.target.value }))}
              >
                <option value="">Todos los tipos</option>
                <option value="stock_agotado">Stock Agotado</option>
                <option value="stock_critico">Stock Crítico</option>
                <option value="stock_bajo">Stock Bajo</option>
                <option value="stock_reservado">Stock Reservado</option>
                <option value="configuracion_faltante">Sin Configuración</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Severidad</label>
              <select 
                className="form-select"
                value={filtros.severidad}
                onChange={(e) => setFiltros(prev => ({ ...prev, severidad: e.target.value }))}
              >
                <option value="">Todas</option>
                <option value="error">Error</option>
                <option value="warning">Advertencia</option>
                <option value="info">Información</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Ordenar por</label>
              <select 
                className="form-select"
                value={filtros.ordenPor}
                onChange={(e) => setFiltros(prev => ({ ...prev, ordenPor: e.target.value }))}
              >
                <option value="severidad">Severidad</option>
                <option value="nombre">Nombre</option>
                <option value="stock">Stock Actual</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => setFiltros({ busqueda: '', tipo_alerta: '', severidad: '', ordenPor: 'severidad' })}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Productos con Stock Bajo ({alertasOrdenadas.length})
          </h5>
        </div>
        <div className="card-body">
          {alertasOrdenadas.length === 0 ? (
            <div className="text-center py-5">
              <FaWarehouse className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay alertas de stock</h5>
              <p className="text-muted">
                {filtros.busqueda || filtros.tipo_alerta || filtros.severidad
                  ? 'No se encontraron alertas con los filtros aplicados'
                  : '¡Excelente! Todos los productos tienen stock suficiente'
                }
              </p>
              <Link to="/stock" className="btn btn-primary">
                Volver al Dashboard
              </Link>
            </div>
          ) : (
            <div className="row">
              {alertasOrdenadas.map((alerta) => {
                const alertaInfo = getAlertaInfo(alerta);
                const IconoAlerta = alertaInfo.icon;
                
                return (
                  <div key={alerta.id_producto} className="col-lg-6 col-xl-4 mb-4">
                    <div className={`card h-100 border-start border-4 ${alertaInfo.class}`}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="flex-grow-1">
                            <h6 className="card-title mb-1">
                              <Link 
                                to={`/stock/producto/${alerta.id_producto}`}
                                className="text-decoration-none"
                              >
                                {alerta.nombre}
                              </Link>
                            </h6>
                            <div className="d-flex gap-2 mb-2">
                              <span className={`badge ${alertaInfo.badgeClass}`}>
                                <IconoAlerta className="me-1" />
                                {alertaInfo.text}
                              </span>
                              {alerta.requiere_atencion_inmediata && (
                                <span className="badge bg-danger">
                                  <FaExclamationTriangle className="me-1" />
                                  Urgente
                                </span>
                              )}
                            </div>
                            <small className="text-muted">{alerta.mensaje}</small>
                          </div>
                        </div>
                        
                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <div className="border-end">
                              <div className={`fs-5 fw-bold ${alerta.stock === 0 ? 'text-danger' : alertaInfo.color}`}>
                                {alerta.stock}
                              </div>
                              <small className="text-muted">Stock Actual</small>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="border-end">
                              <div className="fs-6 fw-bold">{alerta.stock_minimo}</div>
                              <small className="text-muted">Mínimo</small>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="fs-6 fw-bold text-info">{alerta.stock_disponible || 0}</div>
                            <small className="text-muted">Disponible</small>
                          </div>
                        </div>

                        {alerta.stock_reservado > 0 && (
                          <div className="alert alert-info py-2 mb-3">
                            <small>
                              <FaLock className="me-1" />
                              {alerta.stock_reservado} unidades reservadas
                            </small>
                          </div>
                        )}

                        {alerta.proveedor_nombre && (
                          <div className="mb-3">
                            <small className="text-muted">
                              <strong>Proveedor:</strong> {alerta.proveedor_nombre}
                            </small>
                          </div>
                        )}

                        <div className="d-flex gap-2">
                          {alerta.tipo_alerta !== 'configuracion_faltante' ? (
                            <button
                              className="btn btn-success btn-sm flex-fill"
                              onClick={() => handleRegistrarIngreso(alerta.id_producto, alerta.nombre)}
                              disabled={procesandoAccion === alerta.id_producto}
                            >
                              {procesandoAccion === alerta.id_producto ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1"></span>
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <FaBoxOpen className="me-1" />
                                  Registrar Ingreso
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              className="btn btn-warning btn-sm flex-fill"
                              onClick={() => alert('Funcionalidad para configurar stock mínimo en desarrollo')}
                            >
                              <FaCog className="me-1" />
                              Configurar Mínimo
                            </button>
                          )}
                          <Link
                            to={`/stock/producto/${alerta.id_producto}`}
                            className="btn btn-outline-primary btn-sm"
                          >
                            Ver Detalle
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertasStock;