import React, { useEffect, useState, useContext } from "react";
import {
  getVacunasNuevas,
  getStockVacunas,
  getAlertasStockVacunas,
  getPatologias,
  getPresentaciones,
  getViasAplicacion,
  getProveedores
} from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import VacunasList from "../vacunas/VacunasList";
import StockVacunas from "../vacunas/StockVacunas";
import CatalogosVacunas from "../vacunas/CatalogosVacunas";
import MovimientosStock from "../vacunas/MovimientosStock";

function AdminVacunas() {
  const { usuario } = useContext(AuthContext);
  
  // Estados principales
  const [vistaActiva, setVistaActiva] = useState("dashboard");
  const [vacunas, setVacunas] = useState([]);
  const [stockResumen, setStockResumen] = useState([]);
  const [alertas, setAlertas] = useState({});
  const [loading, setLoading] = useState(false);

  // Estados para estadísticas del dashboard
  const [estadisticas, setEstadisticas] = useState({
    totalVacunas: 0,
    vacunasActivas: 0,
    totalStock: 0,
    alertasTotal: 0,
    proveedores: 0,
    patologias: 0,
    presentaciones: 0,
    viasAplicacion: 0
  });

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    setLoading(true);
    try {
      const [
        vacunasData, 
        stockData, 
        alertasData, 
        proveedoresData,
        patologiasData,
        presentacionesData,
        viasData
      ] = await Promise.all([
        getVacunasNuevas(),
        getStockVacunas(),
        getAlertasStockVacunas(),
        getProveedores(),
        getPatologias(),
        getPresentaciones(), 
        getViasAplicacion()
      ]);

      const vacunasArray = vacunasData.data || vacunasData;
      const stockArray = stockData.data || stockData;
      const alertasObj = alertasData.alertas || {};

      setVacunas(vacunasArray);
      setStockResumen(stockArray);
      setAlertas(alertasObj);

      // Calcular estadísticas
      const totalAlertas = Object.values(alertasObj).reduce((total, arr) => 
        total + (Array.isArray(arr) ? arr.length : 0), 0);

      setEstadisticas({
        totalVacunas: vacunasArray.length,
        vacunasActivas: vacunasArray.filter(v => v.activa).length,
        totalStock: stockArray.reduce((total, item) => total + (item.stock_actual || 0), 0),
        alertasTotal: totalAlertas,
        proveedores: (proveedoresData.data || proveedoresData).length,
        patologias: (patologiasData.data || patologiasData).length,
        presentaciones: (presentacionesData.data || presentacionesData).length,
        viasAplicacion: (viasData.data || viasData).length
      });

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="container-fluid">
      {/* Métricas principales */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-primary mb-1">{estadisticas.totalVacunas}</h3>
              <p className="mb-1">Total Vacunas</p>
              <small className="text-muted">{estadisticas.vacunasActivas} activas</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-info mb-1">{estadisticas.totalStock.toLocaleString()}</h3>
              <p className="mb-1">Dosis en Stock</p>
              <small className="text-muted">{stockResumen.length} lotes</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-warning mb-1">{estadisticas.alertasTotal}</h3>
              <p className="mb-1">Alertas Activas</p>
              <small className="text-muted">Stock y vencimientos</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-success mb-1">{estadisticas.proveedores}</h3>
              <p className="mb-1">Proveedores</p>
              <small className="text-muted">Laboratorios activos</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Alertas críticas */}
        {estadisticas.alertasTotal > 0 && (
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Alertas Críticas</h6>
              </div>
              <div className="card-body">
                {alertas.vencidas && alertas.vencidas.length > 0 && (
                  <div className="alert alert-danger mb-3">
                    <strong>{alertas.vencidas.length}</strong> vacuna(s) vencida(s)
                  </div>
                )}
                {alertas.stock_bajo && alertas.stock_bajo.length > 0 && (
                  <div className="alert alert-warning mb-3">
                    <strong>{alertas.stock_bajo.length}</strong> vacuna(s) con stock bajo
                  </div>
                )}
                {alertas.proximos_vencimientos && alertas.proximos_vencimientos.length > 0 && (
                  <div className="alert alert-info mb-3">
                    <strong>{alertas.proximos_vencimientos.length}</strong> vacuna(s) próximas a vencer
                  </div>
                )}
                <button 
                  className="btn btn-warning btn-sm"
                  onClick={() => setVistaActiva("stock")}
                >
                  Ver Detalles de Stock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resumen de catálogos */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Estado de Catálogos</h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 mb-3">
                  <h5 className="text-info mb-1">{estadisticas.patologias}</h5>
                  <small>Patologías</small>
                </div>
                <div className="col-6 mb-3">
                  <h5 className="text-info mb-1">{estadisticas.presentaciones}</h5>
                  <small>Presentaciones</small>
                </div>
              </div>
              <div className="row text-center">
                <div className="col-12 mb-3">
                  <h5 className="text-info mb-1">{estadisticas.viasAplicacion}</h5>
                  <small>Vías de Aplicación</small>
                </div>
              </div>
              <button 
                className="btn btn-info btn-sm btn-block"
                onClick={() => setVistaActiva("catalogos")}
              >
                Administrar Catálogos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{minHeight: "400px"}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="sr-only">Cargando...</span>
          </div>
          <p className="text-muted">Cargando datos del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {/* Header principal */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-dark">Administración de Vacunas</h2>
      </div>

      {/* Navegación por pestañas */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${vistaActiva === "dashboard" ? "active" : ""}`}
                onClick={() => setVistaActiva("dashboard")}
                style={{
                  backgroundColor: vistaActiva === "dashboard" ? "var(--color-principal)" : "transparent",
                  color: vistaActiva === "dashboard" ? "white" : "#495057",
                  border: "none"
                }}
              >
                Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${vistaActiva === "vacunas" ? "active" : ""}`}
                onClick={() => setVistaActiva("vacunas")}
                style={{
                  backgroundColor: vistaActiva === "vacunas" ? "var(--color-principal)" : "transparent",
                  color: vistaActiva === "vacunas" ? "white" : "#495057",
                  border: "none"
                }}
              >
                Vacunas
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${vistaActiva === "stock" ? "active" : ""}`}
                onClick={() => setVistaActiva("stock")}
                style={{
                  backgroundColor: vistaActiva === "stock" ? "var(--color-principal)" : "transparent",
                  color: vistaActiva === "stock" ? "white" : "#495057",
                  border: "none"
                }}
              >
                Stock
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${vistaActiva === "movimientos" ? "active" : ""}`}
                onClick={() => setVistaActiva("movimientos")}
                style={{
                  backgroundColor: vistaActiva === "movimientos" ? "var(--color-principal)" : "transparent",
                  color: vistaActiva === "movimientos" ? "white" : "#495057",
                  border: "none"
                }}
              >
                Movimientos
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${vistaActiva === "catalogos" ? "active" : ""}`}
                onClick={() => setVistaActiva("catalogos")}
                style={{
                  backgroundColor: vistaActiva === "catalogos" ? "var(--color-principal)" : "transparent",
                  color: vistaActiva === "catalogos" ? "white" : "#495057",
                  border: "none"
                }}
              >
                Catálogos
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Contenido según vista activa */}
      <div className="tab-content">
        {vistaActiva === "dashboard" && renderDashboard()}
        {vistaActiva === "vacunas" && (
          <VacunasList 
            vacunas={vacunas} 
            onRefresh={cargarDatosDashboard}
          />
        )}
        {vistaActiva === "stock" && (
          <StockVacunas 
            stock={stockResumen}
            alertas={alertas}
            onRefresh={cargarDatosDashboard}
          />
        )}
        {vistaActiva === "movimientos" && (
          <MovimientosStock 
            onRefresh={cargarDatosDashboard}
          />
        )}
        {vistaActiva === "catalogos" && (
          <CatalogosVacunas onRefresh={cargarDatosDashboard} />
        )}
      </div>
    </div>
  );
}

export default AdminVacunas;