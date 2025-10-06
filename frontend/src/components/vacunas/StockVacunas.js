import React, { useEffect, useState, useContext } from "react";
import {
  getStockVacunas,
  getAlertasStockVacunas,
  getVacunasNuevas,
} from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

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
      return { clase: "danger", texto: "Vencido", icono: "❌" };
    } else if (item.stock_actual <= item.stock_minimo) {
      return { clase: "warning", texto: "Stock Crítico", icono: "⚠️" };
    } else if (diasVencimiento <= 30) {
      return { clase: "info", texto: "Próximo a vencer", icono: "⏰" };
    }
    return { clase: "success", texto: "OK", icono: "✅" };
  };

  const getNombreVacuna = (id) => {
    const vacuna = vacunas.find(v => v.id_vacuna === id);
    return vacuna?.nombre || "—";
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
        <h4 className="mb-0">📦 Stock de Vacunas</h4>
        <div className="btn-group">
          <button
            className={`btn ${vistaActiva === "stock" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setVistaActiva("stock")}
          >
            📦 Stock ({stock.length})
          </button>
          <button
            className={`btn ${vistaActiva === "alertas" ? "btn-warning" : "btn-outline-warning"}`}
            onClick={() => setVistaActiva("alertas")}
          >
            ⚠️ Alertas ({Object.keys(alertas).length})
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="row mb-3">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Buscar por lote o vacuna..."
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
            <option value="ok">✅ OK</option>
            <option value="critico">⚠️ Stock Crítico</option>
            <option value="vencido">❌ Vencido</option>
          </select>
        </div>
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="📍 Filtrar por ubicación..."
            value={filtros.ubicacion}
            onChange={(e) => setFiltros({...filtros, ubicacion: e.target.value})}
          />
        </div>
        <div className="col-md-2 text-right">
          <button className="btn btn-outline-secondary" onClick={handleRefresh}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {vistaActiva === "stock" && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="thead-light">
              <tr>
                <th className="text-dark">Vacuna</th>
                <th className="text-dark">Lote</th>
                <th className="text-dark">Stock Actual</th>
                <th className="text-dark">Stock Mínimo</th>
                <th className="text-dark">Fecha Vencimiento</th>
                <th className="text-dark">Estado</th>
                <th className="text-dark">Ubicación</th>
                <th className="text-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stockFiltrado.map((item, index) => {
                const estado = getEstadoStock(item);
                return (
                  <tr key={item.id || index} className={estado.clase === "danger" ? "table-danger" : ""}>
                    <td>
                      <strong>{getNombreVacuna(item.id_vacuna)}</strong>
                    </td>
                    <td>
                      <code>{item.lote}</code>
                    </td>
                    <td>
                      <span className="badge bg-dark text-white">{item.stock_actual}</span>
                    </td>
                    <td>
                      <span className="badge bg-secondary text-white">{item.stock_minimo}</span>
                    </td>
                    <td>
                      {formatearFecha(item.fecha_vencimiento)}
                    </td>
                    <td>
                      <span className={`badge bg-${estado.clase} text-white`}>
                        {estado.icono} {estado.texto}
                      </span>
                    </td>
                    <td>
                      <small className="text-muted">{item.ubicacion}</small>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary">
                        👁️ Ver
                      </button>
                    </td>
                  </tr>
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
                    ⚠️ {alerta.tipo || "Alerta de Stock"}
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
                <h5>✅ No hay alertas pendientes</h5>
                <p>Todos los stocks están en niveles adecuados</p>
              </div>
            </div>
          )}
        </div>
      )}

      {stockFiltrado.length === 0 && vistaActiva === "stock" && (
        <div className="text-center text-muted py-4">
          <p>📭 No se encontraron registros de stock</p>
        </div>
      )}
    </div>
  );
}

export default StockVacunas;