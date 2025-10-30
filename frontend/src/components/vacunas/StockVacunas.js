import React, { useEffect, useState, useContext } from "react";
import {
  getStockVacunas,
  getAlertasStockVacunas,
  getVacunasNuevas,
  registrarIngresoStock,
  registrarEgresoStock,
  crearStockVacuna,
} from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { 
  FaWarehouse, 
  FaExclamationTriangle, 
  FaSyncAlt, 
  FaEye, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaChevronDown, 
  FaChevronRight, 
  FaChevronUp, 
  FaInbox,
  FaPlus
} from 'react-icons/fa';
import FormularioIngresoStock from './FormularioIngresoStock';
import FormularioEgresoStock from './FormularioEgresoStock';
import FormularioNuevoLote from './FormularioNuevoLote';
import ModalReservasLote from './ModalReservasLote';

function StockVacunas({ stockData: stockProp, alertas: alertasProp, onRefresh }) {
  const { usuario } = useContext(AuthContext);
  const [stock, setStock] = useState([]);
  const [alertas, setAlertas] = useState({});
  const [vacunas, setVacunas] = useState([]);
  const [vistaActiva, setVistaActiva] = useState("stock");

  const [filtros, setFiltros] = useState({
    busqueda: "",
    vacuna: "",
    estado: "",
    ubicacion: ""
  });
  const [loading, setLoading] = useState(false);
  const [vacunasExpandidas, setVacunasExpandidas] = useState(new Set());
  const [mostrarStockCero, setMostrarStockCero] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const vacunasPorPagina = 5;

  // Estados para formularios
  const [mostrarFormIngreso, setMostrarFormIngreso] = useState(false);
  const [mostrarFormEgreso, setMostrarFormEgreso] = useState(false);
  const [mostrarFormNuevoLote, setMostrarFormNuevoLote] = useState(false);
  const [mostrarModalReservas, setMostrarModalReservas] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  useEffect(() => {
    if (stockProp) {
      setStock(stockProp);
    } else {
      cargarStock();
    }
    
    if (alertasProp) {
      setAlertas(alertasProp);
    } else {
      cargarAlertas();
    }
    
    cargarVacunas();
  }, [stockProp, alertasProp]);

  const cargarStock = async () => {
    setLoading(true);
    try {
      const response = await getStockVacunas();
      setStock(response.data || response);
    } catch (error) {
      console.error("Error cargando stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarAlertas = async () => {
    try {
      const response = await getAlertasStockVacunas();
      setAlertas(response.data || response);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    }
  };

  const cargarVacunas = async () => {
    try {
      const response = await getVacunasNuevas();
      setVacunas(response.data || response);
    } catch (error) {
      console.error("Error cargando vacunas:", error);
    }
  };

  const stockFiltrado = stock.filter((item) => {
    const cumpleBusqueda = !filtros.busqueda || 
      item.lote?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      item.vacuna_nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    const cumpleVacuna = !filtros.vacuna || 
      item.id_vacuna?.toString() === filtros.vacuna;
    
    const cumpleUbicacion = !filtros.ubicacion || 
      item.ubicacion_fisica?.toLowerCase().includes(filtros.ubicacion.toLowerCase());

    const cumpleEstado = !filtros.estado || 
      (filtros.estado === "critico" && item.stock_actual <= item.stock_minimo) ||
      (filtros.estado === "vencido" && new Date(item.fecha_vencimiento) < new Date()) ||
      (filtros.estado === "ok" && item.stock_actual > item.stock_minimo && new Date(item.fecha_vencimiento) > new Date());

    // Filtrar por stock cero (por defecto ocultos)
    const cumpleStockCero = mostrarStockCero || item.stock_actual > 0;

    return cumpleBusqueda && cumpleVacuna && cumpleUbicacion && cumpleEstado && cumpleStockCero;
  });

  const getEstadoStock = (item) => {
    const ahora = new Date();
    const vencimiento = new Date(item.fecha_vencimiento);
    const diasVencimiento = Math.ceil((vencimiento - ahora) / (1000 * 60 * 60 * 24));

    if (vencimiento < ahora) {
      return { clase: "danger", texto: "Vencido", icono: <FaTimesCircle /> };
    } else if (item.stock_actual <= item.stock_minimo) {
      return { clase: "warning", texto: "Stock Crítico", icono: <FaExclamationTriangle /> };
    } else if (diasVencimiento <= 30) {
      return { clase: "info", texto: "Próximo a vencer", icono: <FaClock /> };
    }
    return { clase: "success", texto: "OK", icono: <FaCheckCircle /> };
  };

  const getNombreVacuna = (id) => {
    const vacuna = vacunas.find(v => v.id_vacuna === id);
    return vacuna?.nombre || "—";
  };

  // Agrupar stock por vacuna (después de declarar las funciones)
  const stockAgrupado = stockFiltrado.reduce((grupos, item) => {
    const nombreVacuna = getNombreVacuna(item.id_vacuna);
    const dosisPorFrasco = item.dosis_por_frasco || 1;
    
    if (!grupos[nombreVacuna]) {
      grupos[nombreVacuna] = {
        nombre: nombreVacuna,
        id_vacuna: item.id_vacuna,
        lotes: [],
        stockTotalDosis: 0,
        stockMinimoDosis: 0,
        frascosTotal: 0,
        frascosMinimo: 0,
        frascosReservados: 0,
        stockReservadoDosis: 0,
        dosisPorFrasco: dosisPorFrasco,
        estadoGeneral: 'success'
      };
    }
    
    grupos[nombreVacuna].lotes.push(item);
    
    // Calcular frascos y dosis correctamente
    const frascosActuales = item.frascos_actuales || Math.floor((item.stock_actual || 0) / dosisPorFrasco);
    const frascosMinimos = item.frascos_minimo || Math.floor((item.stock_minimo || 0) / dosisPorFrasco);
    const frascosReservados = item.frascos_reservados || Math.floor((item.stock_reservado || 0) / dosisPorFrasco);
    
    grupos[nombreVacuna].frascosTotal += frascosActuales;
    grupos[nombreVacuna].frascosMinimo += frascosMinimos;
    grupos[nombreVacuna].frascosReservados += frascosReservados;
    
    // Usar SIEMPRE el stock real en dosis (no recalcular desde frascos)
    grupos[nombreVacuna].stockTotalDosis += (item.stock_actual || 0);
    grupos[nombreVacuna].stockMinimoDosis += (item.stock_minimo || 0);
    grupos[nombreVacuna].stockReservadoDosis += (item.stock_reservado || 0);
    
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

  const vacunasAgrupadas = Object.values(stockAgrupado);

  // Calcular paginación
  const totalPaginas = Math.ceil(vacunasAgrupadas.length / vacunasPorPagina);
  const indiceInicio = (paginaActual - 1) * vacunasPorPagina;
  const indiceFin = indiceInicio + vacunasPorPagina;
  const vacunasPaginadas = vacunasAgrupadas.slice(indiceInicio, indiceFin);

  const toggleVacunaExpansion = (nombreVacuna) => {
    const nuevasExpandidas = new Set(vacunasExpandidas);
    if (nuevasExpandidas.has(nombreVacuna)) {
      nuevasExpandidas.delete(nombreVacuna);
    } else {
      nuevasExpandidas.add(nombreVacuna);
    }
    setVacunasExpandidas(nuevasExpandidas);
  };

  const getEstadoVacunaGeneral = (estadoGeneral) => {
    switch (estadoGeneral) {
      case 'danger':
        return { clase: "danger", texto: "Crítico", icono: <FaTimesCircle /> };
      case 'warning':
        return { clase: "warning", texto: "Alerta", icono: <FaExclamationTriangle /> };
      case 'info':
        return { clase: "info", texto: "Atención", icono: <FaClock /> };
      default:
        return { clase: "success", texto: "OK", icono: <FaCheckCircle /> };
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const handleRefresh = () => {
    cargarStock();
    cargarAlertas();
    if (onRefresh) onRefresh();
  };

  const manejarIngresoStock = async (datosIngreso) => {
    try {
      await registrarIngresoStock(loteSeleccionado.id_stock_vacuna, datosIngreso);
      await cargarStock();
      await cargarAlertas();
      if (onRefresh) onRefresh();
      alert('Ingreso registrado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const manejarEgresoStock = async (datosEgreso) => {
    try {
      await registrarEgresoStock(loteSeleccionado.id_stock_vacuna, datosEgreso);
      await cargarStock();
      await cargarAlertas();
      if (onRefresh) onRefresh();
      alert('Egreso registrado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const manejarNuevoLote = async (datosLote) => {
    try {
      await crearStockVacuna(datosLote);
      await cargarStock();
      await cargarAlertas();
      if (onRefresh) onRefresh();
      alert('Nuevo lote creado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{minHeight: "300px"}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p className="text-muted">Cargando stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0"><FaWarehouse className="mr-2" />Stock de Vacunas</h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => setMostrarFormNuevoLote(true)}
          >
            <FaPlus className="mr-1" />Nuevo Lote
          </button>
          <button
            className={`btn ${mostrarStockCero ? "btn-secondary" : "btn-outline-secondary"}`}
            onClick={() => setMostrarStockCero(!mostrarStockCero)}
            title={mostrarStockCero ? "Ocultar lotes sin stock" : "Mostrar lotes sin stock"}
          >
            <FaEye className="mr-1" />
            {mostrarStockCero ? "Ocultar stock 0" : "Ver todos"}
          </button>
          <div className="btn-group">
            <button
              className={`btn ${vistaActiva === "stock" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setVistaActiva("stock")}
            >
              <FaWarehouse className="mr-1" />Stock ({vacunasAgrupadas.length} vacunas)
            </button>
            <button
              className={`btn ${vistaActiva === "alertas" ? "btn-warning" : "btn-outline-warning"}`}
              onClick={() => setVistaActiva("alertas")}
            >
              <FaExclamationTriangle className="mr-1" />Alertas ({Object.keys(alertas).length})
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="row mb-3">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por lote o vacuna..."
            value={filtros.busqueda}
            onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
          />
        </div>
        <div className="col-md-2">
          <select
            className="form-control"
            value={filtros.vacuna}
            onChange={(e) => setFiltros({...filtros, vacuna: e.target.value})}
          >
            <option value="">Todas las vacunas</option>
            {vacunas.map(vacuna => (
              <option key={vacuna.id_vacuna} value={vacuna.id_vacuna}>
                {vacuna.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-control"
            value={filtros.estado}
            onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
          >
            <option value="">Todos los estados</option>
            <option value="ok"><i className="fas fa-check"></i> OK</option>
            <option value="critico"><i className="fas fa-exclamation-triangle"></i> Stock Crítico</option>
            <option value="vencido"><i className="fas fa-times"></i> Vencido</option>
          </select>
        </div>
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Filtrar por ubicación..."
            value={filtros.ubicacion}
            onChange={(e) => setFiltros({...filtros, ubicacion: e.target.value})}
          />
        </div>
        <div className="col-md-2 text-right">
          <button className="btn btn-outline-secondary" onClick={handleRefresh}>
            <FaSyncAlt className="mr-1" />Actualizar
          </button>
        </div>
      </div>

      {vistaActiva === "stock" && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="thead-light">
              <tr>
                <th className="text-dark" style={{width: '30px'}}></th>
                <th className="text-dark">Vacuna</th>
                <th className="text-dark">Frascos Totales</th>
                <th className="text-dark">Frascos Reservados</th>
                <th className="text-dark" colSpan="2">Frascos Faltante</th>
                <th className="text-dark">Estado General</th>
                <th className="text-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vacunasPaginadas.map((vacunaGroup) => {
                const estadoGeneral = getEstadoVacunaGeneral(vacunaGroup.estadoGeneral);
                const estaExpandida = vacunasExpandidas.has(vacunaGroup.nombre);
                
                // Calcular frascos faltante = Reservados - Totales (si es negativo, hay déficit)
                const frascosFaltante = Math.max(0, vacunaGroup.frascosReservados - vacunaGroup.frascosTotal);
                const dosisFaltante = Math.max(0, vacunaGroup.stockReservadoDosis - vacunaGroup.stockTotalDosis);
                const tieneFaltante = frascosFaltante > 0;
                
                return (
                  <React.Fragment key={vacunaGroup.nombre}>
                    {/* Fila principal con totales */}
                    <tr 
                      className={`${estadoGeneral.clase === "danger" ? "table-danger" : ""} ${tieneFaltante ? "table-warning" : ""}`}
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
                          {vacunaGroup.lotes.length} lote{vacunaGroup.lotes.length !== 1 ? 's' : ''}
                        </small>
                      </td>
                      <td>
                        <span className="badge bg-primary text-white fs-6">
                          {vacunaGroup.frascosTotal.toLocaleString()} frascos
                        </span>
                        <br />
                        <small className="text-muted">
                          ({vacunaGroup.stockTotalDosis.toLocaleString()} dosis)
                        </small>
                      </td>
                      <td>
                        <span className={`badge ${vacunaGroup.frascosReservados > 0 ? 'bg-warning' : 'bg-secondary'} text-white`}>
                          {vacunaGroup.frascosReservados.toLocaleString()} frascos
                        </span>
                        <br />
                        <small className="text-muted">
                          ({vacunaGroup.stockReservadoDosis.toLocaleString()} dosis)
                        </small>
                      </td>
                      <td>
                        {tieneFaltante ? (
                          <>
                            <span className="badge bg-danger text-white fs-6">
                              <FaExclamationTriangle className="me-1" />
                              {frascosFaltante.toLocaleString()} frascos
                            </span>
                            <br />
                            <small className="text-danger">
                              ({dosisFaltante.toLocaleString()} dosis)
                            </small>
                          </>
                        ) : (
                          <span className="badge bg-success text-white">
                            <FaCheckCircle className="me-1" />
                            Sin faltante
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-info text-white">
                          {vacunaGroup.lotes.length}
                        </span>
                      </td>
                      <td>
                        <span className={`badge bg-${estadoGeneral.clase} text-white`}>
                          {estadoGeneral.icono} {estadoGeneral.texto}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => toggleVacunaExpansion(vacunaGroup.nombre)}
                          >
                            {estaExpandida ? <FaChevronUp className="me-1" /> : <FaChevronDown className="me-1" />}
                            {estaExpandida ? 'Contraer' : 'Expandir'}
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              setLoteSeleccionado({ 
                                id_vacuna: vacunaGroup.id_vacuna,
                                vacuna_nombre: vacunaGroup.nombre 
                              });
                              setMostrarFormNuevoLote(true);
                            }}
                            title="Agregar nuevo lote de esta vacuna"
                          >
                            <FaPlus className="me-1" />
                            Nuevo Lote
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Filas de detalle de lotes (si está expandida) */}
                    {estaExpandida && vacunaGroup.lotes.map((item, index) => {
                      const estado = getEstadoStock(item);
                      const frascosReservados = item.frascos_reservados || Math.floor((item.stock_reservado || 0) / (item.dosis_por_frasco || 1));
                      const frascosActuales = item.frascos_actuales || 0;
                      const dosisActuales = item.stock_actual || 0;
                      
                      return (
                        <tr 
                          key={`${vacunaGroup.nombre}-${item.lote}-${index}`}
                          className="bg-light"
                          style={{borderLeft: '4px solid #007bff'}}
                        >
                          <td></td>
                          <td style={{paddingLeft: '2rem'}}>
                            <small className="text-muted">Lote:</small>
                            <br />
                            <code>{item.lote}</code>
                          </td>
                          <td>
                            <span className="badge bg-dark text-white">
                              {item.frascos_actuales || 0} frascos
                            </span>
                            <br />
                            <small className="text-muted">
                              {item.stock_actual} dosis
                              {item.dosis_sobrantes > 0 && ` (+${item.dosis_sobrantes})`}
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-warning text-dark">
                              {frascosReservados} frascos
                            </span>
                            <br />
                            <small className="text-muted">{item.stock_reservado || 0} dosis</small>
                          </td>
                          <td colSpan="2">
                            <small>
                              <strong>Venc:</strong> {formatearFecha(item.fecha_vencimiento)}
                              <br />
                              <strong>Ubic:</strong> {item.ubicacion_fisica || '—'}
                              <br />
                              <strong>Total:</strong> <span className={frascosActuales > 0 ? 'text-success' : 'text-danger'}>
                                {frascosActuales} frascos ({dosisActuales} dosis)
                              </span>
                            </small>
                          </td>
                          <td>
                            <span className={`badge bg-${estado.clase} text-white`}>
                              {estado.icono} {estado.texto}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group-vertical w-100">
                              <button
                                className="btn btn-success btn-sm mb-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLoteSeleccionado(item);
                                  setMostrarFormIngreso(true);
                                }}
                                title="Registrar Ingreso"
                              >
                                INGRESO
                              </button>
                              <button
                                className="btn btn-warning btn-sm mb-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLoteSeleccionado(item);
                                  setMostrarFormEgreso(true);
                                }}
                                disabled={frascosActuales <= 0}
                                title="Registrar Egreso"
                              >
                                EGRESO
                              </button>
                              {frascosReservados > 0 && (
                                <button
                                  className="btn btn-info btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLoteSeleccionado(item);
                                    setMostrarModalReservas(true);
                                  }}
                                  title="Ver reservas de este lote"
                                >
                                  <FaEye className="me-1" />
                                  RESERVAS ({frascosReservados})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Controles de paginación */}
          {totalPaginas > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">
                Mostrando {indiceInicio + 1} - {Math.min(indiceFin, vacunasAgrupadas.length)} de {vacunasAgrupadas.length} vacunas
              </div>
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPaginaActual(paginaActual - 1)}
                      disabled={paginaActual === 1}
                    >
                      Anterior
                    </button>
                  </li>
                  {[...Array(totalPaginas)].map((_, index) => (
                    <li 
                      key={index + 1} 
                      className={`page-item ${paginaActual === index + 1 ? 'active' : ''}`}
                    >
                      <button 
                        className="page-link" 
                        onClick={() => setPaginaActual(index + 1)}
                      >
                        {index + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPaginaActual(paginaActual + 1)}
                      disabled={paginaActual === totalPaginas}
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}

      {vistaActiva === "alertas" && (
        <div className="row">
          {Object.entries(alertas).map(([key, alerta], index) => (
            <div key={index} className="col-md-6 mb-3">
              <div className="card border-warning">
                <div className="card-body">
                  <h6 className="card-title text-warning">
                    <FaExclamationTriangle className="mr-1" />{alerta.tipo || "Alerta de Stock"}
                  </h6>
                  <p className="card-text">{alerta.mensaje}</p>
                  <small className="text-muted">
                    {alerta.fecha && formatearFecha(alerta.fecha)}
                  </small>
                </div>
              </div>
            </div>
          ))}
          {Object.keys(alertas).length === 0 && (
            <div className="col-12 text-center py-4">
              <div className="text-muted">
                <h5><FaCheckCircle className="text-success mr-2" />No hay alertas pendientes</h5>
                <p>Todos los stocks están en niveles adecuados</p>
              </div>
            </div>
          )}
        </div>
      )}

      {vacunasAgrupadas.length === 0 && vistaActiva === "stock" && (
        <div className="text-center text-muted py-4">
          <p><FaInbox className="mr-2" />No se encontraron registros de stock</p>
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
        onClose={() => {
          setMostrarFormNuevoLote(false);
          setLoteSeleccionado(null);
        }}
        onSubmit={manejarNuevoLote}
        vacunaPreseleccionada={loteSeleccionado}
      />

      <ModalReservasLote
        show={mostrarModalReservas}
        onClose={() => {
          setMostrarModalReservas(false);
          setLoteSeleccionado(null);
        }}
        lote={loteSeleccionado}
      />
    </div>
  );
}

export default StockVacunas;