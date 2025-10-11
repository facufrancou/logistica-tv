import React, { useEffect, useState, useContext } from "react";
import {
  getStockVacunas,
  getAlertasStockVacunas,
  getVacunasNuevas,
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
  FaInbox 
} from 'react-icons/fa';

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
      item.ubicacion?.toLowerCase().includes(filtros.ubicacion.toLowerCase());

    const cumpleEstado = !filtros.estado || 
      (filtros.estado === "critico" && item.stock_actual <= item.stock_minimo) ||
      (filtros.estado === "vencido" && new Date(item.fecha_vencimiento) < new Date()) ||
      (filtros.estado === "ok" && item.stock_actual > item.stock_minimo && new Date(item.fecha_vencimiento) > new Date());

    return cumpleBusqueda && cumpleVacuna && cumpleUbicacion && cumpleEstado;
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
    if (!grupos[nombreVacuna]) {
      grupos[nombreVacuna] = {
        nombre: nombreVacuna,
        id_vacuna: item.id_vacuna,
        lotes: [],
        stockTotal: 0,
        stockMinimoTotal: 0,
        estadoGeneral: 'success'
      };
    }
    
    grupos[nombreVacuna].lotes.push(item);
    grupos[nombreVacuna].stockTotal += item.stock_actual || 0;
    grupos[nombreVacuna].stockMinimoTotal += item.stock_minimo || 0;
    
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
                <th className="text-dark">Stock Total</th>
                <th className="text-dark">Stock Mínimo Total</th>
                <th className="text-dark">Lotes</th>
                <th className="text-dark">Estado General</th>
                <th className="text-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vacunasAgrupadas.map((vacunaGroup) => {
                const estadoGeneral = getEstadoVacunaGeneral(vacunaGroup.estadoGeneral);
                const estaExpandida = vacunasExpandidas.has(vacunaGroup.nombre);
                
                return (
                  <React.Fragment key={vacunaGroup.nombre}>
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
                          {vacunaGroup.lotes.length} lote{vacunaGroup.lotes.length !== 1 ? 's' : ''}
                        </small>
                      </td>
                      <td>
                        <span className="badge bg-primary text-white fs-6">
                          {vacunaGroup.stockTotal.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary text-white">
                          {vacunaGroup.stockMinimoTotal.toLocaleString()}
                        </span>
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
                    {estaExpandida && vacunaGroup.lotes.map((item, index) => {
                      const estado = getEstadoStock(item);
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
                            <span className="badge bg-dark text-white">{item.stock_actual}</span>
                          </td>
                          <td>
                            <span className="badge bg-secondary text-white">{item.stock_minimo}</span>
                          </td>
                          <td>
                            <small>
                              <strong>Venc:</strong> {formatearFecha(item.fecha_vencimiento)}
                              <br />
                              <strong>Ubic:</strong> {item.ubicacion || '—'}
                            </small>
                          </td>
                          <td>
                            <span className={`badge bg-${estado.clase} text-white`}>
                              {estado.icono} {estado.texto}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary">
                              <FaEye className="mr-1" />Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}

export default StockVacunas;