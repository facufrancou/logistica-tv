import React, { useState, useEffect } from 'react';
import {
  getStockVacunas,
  getVacunasNuevas,
  registrarIngresoStock,
  registrarEgresoStock,
  crearStockVacuna,
  getMovimientosStockVacuna
} from '../../services/api';
import FormularioIngresoStock from './FormularioIngresoStock';
import FormularioEgresoStock from './FormularioEgresoStock';
import FormularioNuevoLote from './FormularioNuevoLote';

function MovimientosStock({ onRefresh }) {
  const [vistaActiva, setVistaActiva] = useState('lotes');
  const [stockLotes, setStockLotes] = useState([]);
  const [vacunas, setVacunas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: 'todos',
    proximosVencer: false
  });

  // Estados para formularios
  const [mostrarFormIngreso, setMostrarFormIngreso] = useState(false);
  const [mostrarFormEgreso, setMostrarFormEgreso] = useState(false);
  const [mostrarFormNuevoLote, setMostrarFormNuevoLote] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [stockData, vacunasData] = await Promise.all([
        getStockVacunas(),
        getVacunasNuevas()
      ]);

      setStockLotes(stockData.data || []);
      setVacunas(vacunasData.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const manejarIngresoStock = async (datosIngreso) => {
    try {
      await registrarIngresoStock(loteSeleccionado.id_stock_vacuna, datosIngreso);
      await cargarDatos();
      if (onRefresh) onRefresh();
      alert('Ingreso registrado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const manejarEgresoStock = async (datosEgreso) => {
    try {
      await registrarEgresoStock(loteSeleccionado.id_stock_vacuna, datosEgreso);
      await cargarDatos();
      if (onRefresh) onRefresh();
      alert('Egreso registrado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const manejarNuevoLote = async (datosLote) => {
    try {
      await crearStockVacuna(datosLote);
      await cargarDatos();
      if (onRefresh) onRefresh();
      alert('Nuevo lote creado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const filtrarLotes = () => {
    let lotesFiltrados = stockLotes;

    // Filtro por búsqueda
    if (filtros.busqueda) {
      lotesFiltrados = lotesFiltrados.filter(lote =>
        lote.vacuna?.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        lote.vacuna?.codigo.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        lote.lote.toLowerCase().includes(filtros.busqueda.toLowerCase())
      );
    }

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      lotesFiltrados = lotesFiltrados.filter(lote => lote.estado_stock === filtros.estado);
    }

    // Filtro por próximos a vencer (30 días)
    if (filtros.proximosVencer) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      lotesFiltrados = lotesFiltrados.filter(lote => {
        const fechaVencimiento = new Date(lote.fecha_vencimiento);
        return fechaVencimiento <= fechaLimite && fechaVencimiento >= new Date();
      });
    }

    return lotesFiltrados.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
  };

  const obtenerEstadoColor = (estado) => {
    switch (estado) {
      case 'disponible': return 'success text-white';
      case 'reservado': return 'warning text-dark';
      case 'vencido': return 'danger text-white';
      case 'bloqueado': return 'secondary text-white';
      case 'en_transito': return 'info text-white';
      default: return 'dark text-white';
    }
  };

  const obtenerEstadoTexto = (estado) => {
    switch (estado) {
      case 'disponible': return 'DISPONIBLE';
      case 'reservado': return 'RESERVADO';
      case 'vencido': return 'VENCIDO';
      case 'bloqueado': return 'BLOQUEADO';
      case 'en_transito': return 'EN TRÁNSITO';
      default: return estado.toUpperCase();
    }
  };

  const obtenerDiasVencimiento = (fechaVencimiento) => {
    const dias = Math.ceil((new Date(fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const renderTablaLotes = () => {
    const lotesFiltrados = filtrarLotes();

    return (
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center bg-white">
          <h5 className="mb-0 text-dark">
            <i className="fas fa-boxes mr-2 text-primary"></i>
            Gestión de Lotes ({lotesFiltrados.length})
          </h5>
          <button
            className="btn btn-primary"
            onClick={() => setMostrarFormNuevoLote(true)}
          >
            <i className="fas fa-plus mr-2"></i>
            Nuevo Lote
          </button>
        </div>

        {/* Filtros */}
        <div className="card-body bg-light">
          <div className="row mb-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por vacuna, código o lote..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-control"
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              >
                <option value="todos">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vencido">Vencido</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>
            <div className="col-md-3">
              <div className="form-check pt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={filtros.proximosVencer}
                  onChange={(e) => setFiltros({...filtros, proximosVencer: e.target.checked})}
                />
                <label className="form-check-label text-dark">
                  Próximos a vencer (30 días)
                </label>
              </div>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary btn-block"
                onClick={() => setFiltros({busqueda: '', estado: 'todos', proximosVencer: false})}
              >
                <i className="fas fa-times mr-1"></i>
                Limpiar
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="thead-light">
                <tr>
                  <th>Vacuna</th>
                  <th>Lote</th>
                  <th>Stock</th>
                  <th>Reservado</th>
                  <th>Disponible</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lotesFiltrados.map(lote => {
                  const diasVencimiento = obtenerDiasVencimiento(lote.fecha_vencimiento);
                  const stockDisponible = lote.stock_actual - lote.stock_reservado;
                  
                  return (
                    <tr key={lote.id_stock_vacuna}>
                      <td>
                        <div>
                          <strong className="text-dark">{lote.vacuna?.codigo}</strong>
                          <br />
                          <small className="text-muted">{lote.vacuna?.nombre}</small>
                        </div>
                      </td>
                      <td>
                        <span className="text-dark font-weight-bold">
                          {lote.lote}
                        </span>
                      </td>
                      <td>
                        <span className="font-weight-bold text-dark">{lote.stock_actual}</span>
                      </td>
                      <td>
                        <span className="text-warning font-weight-bold">{lote.stock_reservado}</span>
                      </td>
                      <td>
                        <span className={`font-weight-bold ${stockDisponible > 0 ? 'text-success' : 'text-danger'}`}>
                          {stockDisponible}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className="text-dark">{new Date(lote.fecha_vencimiento).toLocaleDateString()}</span>
                          <br />
                          <small className={`${diasVencimiento <= 30 ? 'text-warning' : diasVencimiento <= 7 ? 'text-danger' : 'text-muted'}`}>
                            {diasVencimiento > 0 ? `${diasVencimiento} días` : `Vencido hace ${Math.abs(diasVencimiento)} días`}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="text-dark font-weight-bold">
                          {lote.estado_stock}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{lote.ubicacion_fisica || 'N/A'}</small>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-success"
                            onClick={() => {
                              setLoteSeleccionado(lote);
                              setMostrarFormIngreso(true);
                            }}
                            title="Registrar Ingreso"
                          >
                            <i className="fas fa-plus mr-1"></i>
                            INGRESO
                          </button>
                          <button
                            className="btn btn-warning"
                            onClick={() => {
                              setLoteSeleccionado(lote);
                              setMostrarFormEgreso(true);
                            }}
                            disabled={stockDisponible <= 0}
                            title="Registrar Egreso"
                          >
                            <i className="fas fa-minus mr-1"></i>
                            EGRESO
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lotesFiltrados.length === 0 && (
            <div className="text-center text-muted py-5">
              <i className="fas fa-box-open fa-3x mb-3 text-secondary"></i>
              <h5 className="text-muted">No se encontraron lotes</h5>
              <p className="text-muted">No se encontraron lotes con los filtros aplicados</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{minHeight: "400px"}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="sr-only">Cargando...</span>
          </div>
          <h5 className="text-muted">Cargando movimientos de stock...</h5>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Navegación */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${vistaActiva === 'lotes' ? 'active' : 'text-dark'}`}
                    onClick={() => setVistaActiva('lotes')}
                  >
                    <i className="fas fa-boxes mr-2"></i>
                    Gestión de Lotes
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${vistaActiva === 'movimientos' ? 'active' : 'text-dark'}`}
                    onClick={() => setVistaActiva('movimientos')}
                  >
                    <i className="fas fa-exchange-alt mr-2"></i>
                    Historial Movimientos
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {vistaActiva === 'lotes' && renderTablaLotes()}
      {vistaActiva === 'movimientos' && (
        <div className="card">
          <div className="card-header bg-white">
            <h5 className="mb-0 text-dark">
              <i className="fas fa-clock mr-2 text-info"></i>
              Historial de Movimientos
            </h5>
          </div>
          <div className="card-body text-center py-5">
            <i className="fas fa-clock fa-4x mb-4 text-secondary"></i>
            <h4 className="text-dark">Historial de Movimientos</h4>
            <p className="text-muted">Esta funcionalidad estará disponible próximamente</p>
            <small className="text-muted">Aquí podrás ver el historial completo de todos los movimientos de stock</small>
          </div>
        </div>
      )}

      {/* Formularios modales */}
      <FormularioIngresoStock
        lote={loteSeleccionado}
        show={mostrarFormIngreso}
        onClose={() => {
          setMostrarFormIngreso(false);
          setLoteSeleccionado(null);
        }}
        onSubmit={manejarIngresoStock}
      />

      <FormularioEgresoStock
        lote={loteSeleccionado}
        show={mostrarFormEgreso}
        onClose={() => {
          setMostrarFormEgreso(false);
          setLoteSeleccionado(null);
        }}
        onSubmit={manejarEgresoStock}
      />

      <FormularioNuevoLote
        vacunas={vacunas}
        show={mostrarFormNuevoLote}
        onClose={() => setMostrarFormNuevoLote(false)}
        onSubmit={manejarNuevoLote}
      />
    </div>
  );
}

export default MovimientosStock;