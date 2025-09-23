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
  FaExclamationCircle
} from 'react-icons/fa';
import { 
  getAlertasStock,
  getEstadoStock,
  registrarMovimiento 
} from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const AlertasStock = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    gravedad: '',
    ordenPor: 'gravedad' // gravedad, nombre, stock
  });
  const [procesandoAccion, setProcesandoAccion] = useState(null);
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      const [alertasData, estadoStockData] = await Promise.all([
        getAlertasStock(),
        getEstadoStock()
      ]);
      
      // Enriquecer alertas con información adicional del estado de stock
      const alertasEnriquecidas = alertasData.map(alerta => {
        const productoStock = estadoStockData.find(p => p.id_producto === alerta.id_producto);
        return {
          ...alerta,
          stock_reservado: productoStock?.stock_reservado || 0,
          stock_disponible: productoStock?.stock_disponible || 0,
          ultimo_movimiento: productoStock?.ultimo_movimiento || null
        };
      });
      
      setAlertas(alertasEnriquecidas);
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
    if (filtros.gravedad && alerta.estado_stock !== filtros.gravedad) {
      return false;
    }
    return true;
  });

  // Ordenar alertas
  const alertasOrdenadas = [...alertasFiltradas].sort((a, b) => {
    switch (filtros.ordenPor) {
      case 'gravedad':
        const gravedadOrder = { 'critico': 0, 'bajo': 1 };
        return gravedadOrder[a.estado_stock] - gravedadOrder[b.estado_stock];
      case 'nombre':
        return a.nombre.localeCompare(b.nombre);
      case 'stock':
        return a.stock - b.stock;
      default:
        return 0;
    }
  });

  const getGravedadBadge = (estado) => {
    const estados = {
      'critico': { class: 'bg-danger', text: 'Crítico', icon: FaExclamationCircle },
      'bajo': { class: 'bg-warning text-dark', text: 'Bajo', icon: FaExclamationTriangle }
    };
    return estados[estado] || { class: 'bg-secondary', text: estado, icon: FaBoxOpen };
  };

  const calcularDiasStock = (stock, stockMinimo) => {
    // Estimación simple: si está por debajo del mínimo, calcular días restantes
    if (stock <= stockMinimo) {
      return Math.floor(stock / (stockMinimo * 0.1)) || 0; // Estimación básica
    }
    return null;
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
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2 text-warning" />
            <h3 className="mb-0 text-dark">Alertas de Stock</h3>
            <span className="badge bg-danger ms-3">{alertas.length} alertas activas</span>
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
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <FaFilter className="me-2" />
            Filtros y Ordenamiento
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
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
              <label className="form-label">Gravedad</label>
              <select 
                className="form-select"
                value={filtros.gravedad}
                onChange={(e) => setFiltros(prev => ({ ...prev, gravedad: e.target.value }))}
              >
                <option value="">Todas las alertas</option>
                <option value="critico">Solo Críticas</option>
                <option value="bajo">Solo Stock Bajo</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Ordenar por</label>
              <select 
                className="form-select"
                value={filtros.ordenPor}
                onChange={(e) => setFiltros(prev => ({ ...prev, ordenPor: e.target.value }))}
              >
                <option value="gravedad">Gravedad</option>
                <option value="nombre">Nombre</option>
                <option value="stock">Stock Actual</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => setFiltros({ busqueda: '', gravedad: '', ordenPor: 'gravedad' })}
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
                {filtros.busqueda || filtros.gravedad 
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
                const gravedadBadge = getGravedadBadge(alerta.estado_stock);
                const diasStock = calcularDiasStock(alerta.stock, alerta.stock_minimo);
                const IconoGravedad = gravedadBadge.icon;
                
                return (
                  <div key={alerta.id_producto} className="col-lg-6 col-xl-4 mb-4">
                    <div className={`card h-100 border-start border-4 ${
                      alerta.estado_stock === 'critico' ? 'border-danger' : 'border-warning'
                    }`}>
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
                            <span className={`badge ${gravedadBadge.class} mb-2`}>
                              <IconoGravedad className="me-1" />
                              {gravedadBadge.text}
                            </span>
                          </div>
                        </div>
                        
                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <div className="border-end">
                              <div className="fs-5 fw-bold text-danger">{alerta.stock}</div>
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

                        {diasStock !== null && (
                          <div className="alert alert-danger py-2 mb-3">
                            <small>
                              <FaExclamationTriangle className="me-1" />
                              Estimado: {diasStock} días de stock restante
                            </small>
                          </div>
                        )}

                        <div className="d-flex gap-2">
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