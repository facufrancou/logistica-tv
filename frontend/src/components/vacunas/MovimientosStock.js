import React, { useState, useEffect, Fragment } from 'react';
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
import { 
  FaChevronDown, 
  FaChevronRight, 
  FaChevronUp, 
  FaEye 
} from 'react-icons/fa';

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
  
  // Estado para manejo de expansión de vacunas
  const [vacunasExpandidas, setVacunasExpandidas] = useState(new Set());

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

  const agruparPorVacuna = (lotes) => {
    const stockAgrupado = lotes.reduce((grupos, item) => {
      const nombreVacuna = item.vacuna?.nombre || 'Vacuna sin nombre';
      
      if (!grupos[nombreVacuna]) {
        grupos[nombreVacuna] = {
          nombre: nombreVacuna,
          codigo: item.vacuna?.codigo,
          lotes: [],
          stockTotal: 0,
          stockReservadoTotal: 0,
          estadoGeneral: 'success'
        };
      }
      
      grupos[nombreVacuna].lotes.push(item);
      grupos[nombreVacuna].stockTotal += item.stock_actual || 0;
      grupos[nombreVacuna].stockReservadoTotal += item.stock_reservado || 0;
      
      // Determinar el estado general de la vacuna (el más crítico de todos sus lotes)
      const estadoLote = getEstadoStock(item);
      if (estadoLote.clase === 'danger' || grupos[nombreVacuna].estadoGeneral === 'danger') {
        grupos[nombreVacuna].estadoGeneral = 'danger';
      } else if (estadoLote.clase === 'warning' && grupos[nombreVacuna].estadoGeneral !== 'danger') {
        grupos[nombreVacuna].estadoGeneral = 'warning';
      } else if (estadoLote.clase === 'info' && grupos[nombreVacuna].estadoGeneral === 'success') {
        grupos[nombreVacuna].estadoGeneral = 'info';
      }
      
      return grupos;
    }, {});

    return Object.values(stockAgrupado);
  };

  const getEstadoStock = (lote) => {
    const diasVencimiento = obtenerDiasVencimiento(lote.fecha_vencimiento);
    const stockDisponible = lote.stock_actual - lote.stock_reservado;
    
    if (diasVencimiento < 0) {
      return { clase: "danger", texto: "Vencido", icono: "⚠️" };
    } else if (diasVencimiento <= 7) {
      return { clase: "danger", texto: "Por vencer", icono: "⚠️" };
    } else if (diasVencimiento <= 30) {
      return { clase: "warning", texto: "Próximo a vencer", icono: "⚠️" };
    } else if (stockDisponible <= 0) {
      return { clase: "warning", texto: "Sin stock", icono: "📦" };
    } else {
      return { clase: "success", texto: "Disponible", icono: "✅" };
    }
  };

  const getEstadoVacunaGeneral = (estadoGeneral) => {
    switch (estadoGeneral) {
      case 'danger':
        return { clase: "danger", texto: "Crítico", icono: "⚠️" };
      case 'warning':
        return { clase: "warning", texto: "Alerta", icono: "⚠️" };
      case 'info':
        return { clase: "info", texto: "Próximo a vencer", icono: "🔔" };
      default:
        return { clase: "success", texto: "OK", icono: "✅" };
    }
  };

  const toggleVacunaExpansion = (nombreVacuna) => {
    const nuevasExpandidas = new Set(vacunasExpandidas);
    if (nuevasExpandidas.has(nombreVacuna)) {
      nuevasExpandidas.delete(nombreVacuna);
    } else {
      nuevasExpandidas.add(nombreVacuna);
    }
    setVacunasExpandidas(nuevasExpandidas);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const renderTablaLotes = () => {
    const lotesFiltrados = filtrarLotes();

    return (
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center bg-white">
          <h5 className="mb-0 text-dark">
            <i className="fas fa-boxes mr-2 text-primary"></i>
            Gestión de Lotes ({agruparPorVacuna(lotesFiltrados).length} vacunas)
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
            <table className="table table-striped table-hover">
              <thead className="thead-light">
                <tr>
                  <th className="text-dark" style={{width: '30px'}}></th>
                  <th className="text-dark">Vacuna</th>
                  <th className="text-dark">Stock Total</th>
                  <th className="text-dark">Reservado Total</th>
                  <th className="text-dark">Lotes</th>
                  <th className="text-dark">Estado General</th>
                  <th className="text-dark">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {agruparPorVacuna(lotesFiltrados).map((vacunaGroup) => {
                  const estadoGeneral = getEstadoVacunaGeneral(vacunaGroup.estadoGeneral);
                  const estaExpandida = vacunasExpandidas.has(vacunaGroup.nombre);
                  const stockDisponibleTotal = vacunaGroup.stockTotal - vacunaGroup.stockReservadoTotal;
                  
                  return (
                    <Fragment key={vacunaGroup.nombre}>
                      {/* Fila principal con totales */}
                      <tr 
                        className={`${estadoGeneral.clase === "danger" ? "table-danger" : ""}`}
                        style={{
                          backgroundColor: estaExpandida ? '#f8f9fa' : 'inherit',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => toggleVacunaExpansion(vacunaGroup.nombre)}
                      >
                        <td>
                          <button
                            className="btn btn-sm btn-link p-0"
                            onClick={() => toggleVacunaExpansion(vacunaGroup.nombre)}
                            style={{textDecoration: 'none'}}
                          >
                            {estaExpandida ? <FaChevronDown /> : <FaChevronRight />}
                          </button>
                        </td>
                        <td>
                          <strong>{vacunaGroup.nombre}</strong>
                          <br />
                          <small className="text-muted">
                            {vacunaGroup.codigo} • {vacunaGroup.lotes.length} lote{vacunaGroup.lotes.length !== 1 ? 's' : ''}
                          </small>
                        </td>
                        <td>
                          <span className="badge bg-primary text-white fs-6">
                            {vacunaGroup.stockTotal.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {vacunaGroup.stockReservadoTotal.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-info text-white">
                            {vacunaGroup.lotes.length}
                          </span>
                          <br />
                          <small className="text-muted">
                            Disp: <span className={stockDisponibleTotal > 0 ? 'text-success' : 'text-danger'}>
                              {stockDisponibleTotal}
                            </span>
                          </small>
                        </td>
                        <td>
                          <span className={`badge bg-${estadoGeneral.clase} text-white`}>
                            {estadoGeneral.icono} {estadoGeneral.texto}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => toggleVacunaExpansion(vacunaGroup.nombre)}
                          >
                            {estaExpandida ? <FaChevronUp className="mr-1" /> : <FaChevronDown className="mr-1" />}
                            {estaExpandida ? 'Contraer' : 'Expandir'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Filas de detalle de lotes (si está expandida) */}
                      {estaExpandida && vacunaGroup.lotes.map((lote, index) => {
                        const estado = getEstadoStock(lote);
                        const stockDisponible = lote.stock_actual - lote.stock_reservado;
                        
                        return (
                          <tr 
                            key={`${vacunaGroup.nombre}-${lote.lote}-${index}`}
                            className="bg-light"
                            style={{borderLeft: '4px solid #007bff'}}
                          >
                            <td></td>
                            <td style={{paddingLeft: '2rem'}}>
                              <small className="text-muted">Lote:</small>
                              <br />
                              <code>{lote.lote}</code>
                            </td>
                            <td>
                              <span className="badge bg-dark text-white">{lote.stock_actual}</span>
                            </td>
                            <td>
                              <span className="badge bg-warning text-dark">{lote.stock_reservado}</span>
                            </td>
                            <td>
                              <small>
                                <strong>Venc:</strong> {formatearFecha(lote.fecha_vencimiento)}
                                <br />
                                <strong>Disp:</strong> <span className={stockDisponible > 0 ? 'text-success' : 'text-danger'}>
                                  {stockDisponible}
                                </span>
                              </small>
                            </td>
                            <td>
                              <span className={`badge bg-${estado.clase} text-white`}>
                                {estado.icono} {estado.texto}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group">
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => {
                                    setLoteSeleccionado(lote);
                                    setMostrarFormIngreso(true);
                                  }}
                                  title="Registrar Ingreso"
                                >
                                  INGRESO
                                </button>
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => {
                                    setLoteSeleccionado(lote);
                                    setMostrarFormEgreso(true);
                                  }}
                                  disabled={stockDisponible <= 0}
                                  title="Registrar Egreso"
                                >
                                  EGRESO
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
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
                    className={`nav-link ${vistaActiva === 'lotes' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('lotes')}
                    style={{
                      backgroundColor: vistaActiva === 'lotes' ? 'var(--color-principal)' : 'transparent',
                      color: vistaActiva === 'lotes' ? 'white' : '#495057',
                      border: 'none'
                    }}
                  >
                    Gestión de Lotes
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${vistaActiva === 'movimientos' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('movimientos')}
                    style={{
                      backgroundColor: vistaActiva === 'movimientos' ? 'var(--color-principal)' : 'transparent',
                      color: vistaActiva === 'movimientos' ? 'white' : '#495057',
                      border: 'none'
                    }}
                  >
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