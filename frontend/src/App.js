import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { PlanesVacunalesProvider } from "./context/PlanesVacunalesContext";
import RutaPrivada from "./components/RutaPrivada";
import { NotificationProvider } from "./context/NotificationContext";
import { 
  FaHome, 
  FaBoxOpen, 
  FaUsers, 
  FaTruck, 
  FaChartBar,
  FaBell, 
  FaCalendarAlt, 
  FaCog, 
  FaSignOutAlt,
  FaBars,
  FaSyringe,
  FaFileInvoice,
  FaClipboardList,
  FaWarehouse,
  FaFileInvoiceDollar,
  FaMoneyBill,
  FaFileAlt,
  FaChartLine,
  FaShoppingCart,
  FaBuilding,
  FaFlask,
  FaStethoscope,
  FaSearch,
  FaEye,
  FaUserCog,
  FaBalanceScale
} from "react-icons/fa";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ClienteList from "./components/logistica/clientes/ClienteList";
import ProductoList from "./components/logistica/productos/ProductoList";
import PedidoList from "./components/logistica/pedidos/PedidoList";
import PedidoForm from "./components/logistica/pedidos/PedidoForm";
import NuevoPedido from "./components/logistica/pedidos/NuevoPedido";
import PedidoAcceso from "./components/logistica/pedidos/PedidoAcceso";
import RecordatoriosView from "./components/logistica/sistema/RecordatoriosView";
import ReportesView from "./components/ReportesView";
import VistaSemanal from "./components/logistica/sistema/VistaSemanal";
import ProveedorList from "./components/logistica/proveedores/ProveedorList";
import SistemaView from "./components/logistica/sistema/SistemaView";
import UsuarioForm from "./components/logistica/sistema/UsuarioForm";
import CtaCteForm from "./components/logistica/clientes/CtaCteForm";

// Nuevos componentes para Planes Vacunales
import PlanesVacunalesList from "./components/planesVacunales/PlanesVacunalesList";
import PlanVacunalForm from "./components/planesVacunales/PlanVacunalForm";
import PlanVacunalDetalle from "./components/planesVacunales/PlanVacunalDetalle";
import ListasPreciosList from "./components/planesVacunales/ListasPreciosList";
import CotizacionesList from "./components/planesVacunales/CotizacionesList";
import CotizacionForm from "./components/planesVacunales/CotizacionForm";
import CotizacionDetalle from "./components/planesVacunales/CotizacionDetalleOptimizado";
import CalendarioVacunacion from "./components/planesVacunales/CalendarioVacunacion";
import CalendariosVacunalesList from "./components/planesVacunales/CalendariosVacunalesList";

// Componentes de Liquidaciones
import LiquidacionesDashboard from "./components/liquidaciones/LiquidacionesDashboard";

// Componentes de Stock (Sprint 3)
import StockDashboard from "./components/stock/StockDashboard";
import MovimientosStock from "./components/stock/MovimientosStock";
import RegistroMovimiento from "./components/stock/RegistroMovimiento";
import ReservasStock from "./components/stock/ReservasStock";
import AlertasStock from "./components/stock/AlertasStock";
import ProductoStock from "./components/stock/ProductoStock";

// Componentes de Seguimiento (Sprint 4)
import SeguimientoDashboard from "./components/seguimiento/SeguimientoDashboard";
import AplicacionesDosis from "./components/seguimiento/AplicacionesDosis";
import RetirosCampo from "./components/seguimiento/RetirosCampo";
import CumplimientoPanel from "./components/seguimiento/CumplimientoPanel";
import NotificacionesCenter from "./components/seguimiento/NotificacionesCenter";

// Componentes de Facturación (Sprint 5)
import FacturacionDashboard from "./components/facturacion/FacturacionDashboard";
import FacturasList from "./components/facturacion/FacturasList";
import FacturaForm from "./components/facturacion/FacturaForm";
import FacturaDetalle from "./components/facturacion/FacturaDetalle";
import ConfiguracionFacturacion from "./components/facturacion/ConfiguracionFacturacion";
import NotasCreditoDebito from "./components/facturacion/NotasCreditoDebito";
// Crear componentes faltantes como alias temporales
const CobrosFacturacion = FacturasList; // Temporal - mismo componente
const ReportesFacturacion = ReportesView; // Temporal - usar reportes existente

// Nuevos componentes desarrollados
import RemitosGenerator from "./components/remitos/RemitosGenerator";
import VentasDirectasView from "./components/ventas-directas/VentasDirectasView";
import IndicadoresStockPlan from "./components/indicadores-stock/IndicadoresStockPlan";

// Componentes del Sistema de Vacunas
import VacunasList from "./components/vacunas/VacunasList";
import StockVacunas from "./components/vacunas/StockVacunas";
import CatalogosVacunas from "./components/vacunas/CatalogosVacunas";
import AdminVacunas from "./components/planesVacunales/AdminVacunas";
import CalendarioVacunacionEditor from "./components/planesVacunales/CalendarioVacunacionEditor";

import { getPedidos } from "./services/api";
import { useEffect, useState, useContext } from "react";
import { observeTableMutations } from './utils/responsiveTables';
// Importar el manejador de menús desplegables
import "./utils/dropdownHandler";

function App() {
  useEffect(() => {
    const obs = observeTableMutations('.table-mobile');
    return () => obs && obs.disconnect();
  }, []);
  return (
    <AuthProvider>
      <NotificationProvider>
        <PlanesVacunalesProvider>
          <Router>
            <Navbar />
            <MainRoutes />
          </Router>
        </PlanesVacunalesProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

// ✅ Navbar con usuario y logout
function Navbar() {
  const { usuario, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    await logout();
    navigate("/login");
  };

  // No mostrar la barra de navegación en la página de login
  if (!usuario) {
    return null;
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark px-3" style={{ backgroundColor: 'var(--color-principal)' }}>
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img src="/img/logo-b.svg" alt="Tierra Volga" className="navbar-logo me-2" />
          
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <FaBars />
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto">
            
            {/* 🏠 Dashboard Principal */}
            <li className="nav-item">
              <Link className="nav-link d-flex align-items-center" to="/">
                <FaHome className="me-1" />
                <span>Dashboard</span>
              </Link>
            </li>

            {/* 💉 Planes Vacunales (Sprint 1-2) */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="planesDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaSyringe className="me-1" />
                <span>Planes Vacunales</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="planesDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/planes-vacunales"><FaStethoscope className="me-2" /> Gestión de Planes</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/cotizaciones"><FaFileInvoice className="me-2" /> Cotizaciones</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/calendarios-vacunales"><FaCalendarAlt className="me-2" /> Calendarios Vacunales</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/listas-precios"><FaClipboardList className="me-2" /> Listas de Precios</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/admin-vacunas"><FaSyringe className="me-2" /> <strong>Administrar Vacunas</strong></Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/remitos/generar"><FaFileInvoice className="me-2" /> Generar Remitos</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/ventas-directas"><FaShoppingCart className="me-2" /> Ventas Directas</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/indicadores-stock"><FaChartBar className="me-2" /> Indicadores Stock</Link></li>
              </ul>
            </li>

            {/* 📦 Stock & Inventario (Sprint 3) */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="stockDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaWarehouse className="me-1" />
                <span>Stock</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="stockDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/stock"><FaChartBar className="me-2" /> Dashboard Stock</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/stock/movimientos"><FaTruck className="me-2" /> Movimientos</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/stock/alertas"><FaBell className="me-2" /> Alertas</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/stock/reservas"><FaClipboardList className="me-2" /> Reservas</Link></li>
              </ul>
            </li>

            {/* 💉 Vacunas */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="vacunasDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaSyringe className="me-1" />
                <span>Vacunas</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="vacunasDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/vacunas"><FaSyringe className="me-2" /> Gestión Vacunas</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/vacunas/stock"><FaWarehouse className="me-2" /> Stock Vacunas</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/vacunas/catalogos"><FaStethoscope className="me-2" /> Catálogos</Link></li>
              </ul>
            </li>

            {/* 📊 Seguimiento (Sprint 4) */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="seguimientoDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaChartBar className="me-1" />
                <span>Seguimiento</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="seguimientoDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento"><FaEye className="me-2" /> Dashboard</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/aplicaciones"><FaSyringe className="me-2" /> Aplicaciones Dosis</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/retiros"><FaTruck className="me-2" /> Retiros de Campo</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/cumplimiento"><FaClipboardList className="me-2" /> Cumplimiento</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/notificaciones"><FaBell className="me-2" /> Notificaciones</Link></li>
              </ul>
            </li>

            {/* 💰 Facturación (Sprint 5) */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="facturacionDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaFileInvoiceDollar className="me-1" />
                <span>Facturación</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="facturacionDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/facturacion"><FaChartLine className="me-2" /> Dashboard</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/facturas"><FaFileInvoice className="me-2" /> Gestión Facturas</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/cobros"><FaMoneyBill className="me-2" /> Gestión Cobros</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/notas-credito-debito"><FaFileAlt className="me-2" /> Notas Créd./Déb.</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/configuracion-facturacion"><FaCog className="me-2" /> Config. AFIP</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/reportes-facturacion"><FaFileAlt className="me-2" /> Reportes Fiscales</Link></li>
              </ul>
            </li>

            {/* ⚖️ Liquidaciones */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="liquidacionesDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaBalanceScale className="me-1" />
                <span>Liquidaciones</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="liquidacionesDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/liquidaciones"><FaChartBar className="me-2" /> Dashboard</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/cotizaciones"><FaFileInvoice className="me-2" /> Clasificar Cotizaciones</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/liquidaciones/reportes"><FaFileAlt className="me-2" /> Reportes Fiscales</Link></li>
              </ul>
            </li>

            {/* 🚚 Logística */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="logisticaDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaTruck className="me-1" />
                <span>Logística</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="logisticaDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/logistica/nuevo-pedido"><FaShoppingCart className="me-2" /> Nuevo Pedido</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/pedidos"><FaShoppingCart className="me-2" /> Gestión Pedidos</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/clientes"><FaBuilding className="me-2" /> Clientes</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/proveedores"><FaTruck className="me-2" /> Proveedores</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/productos"><FaFlask className="me-2" /> Productos</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/recordatorios"><FaBell className="me-2" /> Próximos Pedidos</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/semanal"><FaCalendarAlt className="me-2" /> Vista Semanal</Link></li>
              </ul>
            </li>

            {/* ⚙️ Sistema & Reportes (Sprint 6) */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="sistemaDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaCog className="me-1" />
                <span>Sistema</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="sistemaDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/reportes"><FaChartBar className="me-2" /> Reportes Avanzados</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/sistema"><FaCog className="me-2" /> Panel Sistema</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/sistema/usuarios"><FaUserCog className="me-2" /> Usuarios</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/sistema/ctacte"><FaFileInvoice className="me-2" /> Cuentas Corrientes</Link></li>
              </ul>
            </li>
          </ul>

          <div className="d-flex align-items-center">
            <span className="navbar-text me-3 text-white">{usuario.nombre}</span>
            <button className="btn btn-outline-light btn-sm d-flex align-items-center" onClick={cerrarSesion}>
              <FaSignOutAlt className="me-1" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ✅ Contenedor principal de rutas (corregido)
function MainRoutes() {
  const [pedidos, setPedidos] = useState([]);
  const { usuario, cargando } = useContext(AuthContext);

  const loadPedidos = () => getPedidos().then(setPedidos);

  useEffect(() => {
    if (usuario) loadPedidos();
  }, [usuario]);

  if (cargando) return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Cargando datos...</p>
    </div>
  );

  return (
    <div className="container-fluid px-2 py-2">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pedido/acceso" element={<PedidoAcceso />} />

        {/* 🏠 DASHBOARD PRINCIPAL */}
        <Route
          path="/"
          element={
            <RutaPrivada>
              <Dashboard />
            </RutaPrivada>
          }
        />

        {/* 💉 PLANES VACUNALES (Sprint 1-2) */}
        <Route
          path="/planes-vacunales"
          element={
            <RutaPrivada>
              <PlanesVacunalesList />
            </RutaPrivada>
          }
        />
        <Route
          path="/planes-vacunales/nuevo"
          element={
            <RutaPrivada>
              <PlanVacunalForm />
            </RutaPrivada>
          }
        />
        <Route
          path="/planes-vacunales/:id"
          element={
            <RutaPrivada>
              <PlanVacunalDetalle />
            </RutaPrivada>
          }
        />
        <Route
          path="/planes-vacunales/:id/editar"
          element={
            <RutaPrivada>
              <PlanVacunalForm />
            </RutaPrivada>
          }
        />
        <Route
          path="/listas-precios"
          element={
            <RutaPrivada>
              <ListasPreciosList />
            </RutaPrivada>
          }
        />
        <Route
          path="/cotizaciones"
          element={
            <RutaPrivada>
              <CotizacionesList />
            </RutaPrivada>
          }
        />
        <Route
          path="/cotizaciones/nueva"
          element={
            <RutaPrivada>
              <CotizacionForm />
            </RutaPrivada>
          }
        />
        <Route
          path="/cotizaciones/editar/:id"
          element={
            <RutaPrivada>
              <CotizacionForm />
            </RutaPrivada>
          }
        />
        <Route
          path="/cotizaciones/:id"
          element={
            <RutaPrivada>
              <CotizacionDetalle />
            </RutaPrivada>
          }
        />
        <Route
          path="/calendarios-vacunales"
          element={
            <RutaPrivada>
              <CalendariosVacunalesList />
            </RutaPrivada>
          }
        />
        <Route
          path="/planes-vacunales/calendario/:cotizacionId"
          element={
            <RutaPrivada>
              <CalendarioVacunacion />
            </RutaPrivada>
          }
        />
        <Route
          path="/admin-vacunas"
          element={
            <RutaPrivada>
              <AdminVacunas />
            </RutaPrivada>
          }
        />
        {/* RUTA DEPRECADA - Editor ahora integrado en el calendario principal 
        <Route
          path="/planes-vacunales/calendario/:cotizacionId/editar"
          element={
            <RutaPrivada>
              <CalendarioVacunacionEditor />
            </RutaPrivada>
          }
        />
        */}

        {/* 📋 REMITOS Y VENTAS DIRECTAS */}
        <Route
          path="/remitos/generar"
          element={
            <RutaPrivada>
              <RemitosGenerator />
            </RutaPrivada>
          }
        />
        <Route
          path="/ventas-directas"
          element={
            <RutaPrivada>
              <VentasDirectasView />
            </RutaPrivada>
          }
        />
        <Route
          path="/indicadores-stock"
          element={
            <RutaPrivada>
              <IndicadoresStockPlan />
            </RutaPrivada>
          }
        />

        {/* 📦 STOCK & INVENTARIO (Sprint 3) */}
        <Route
          path="/stock"
          element={
            <RutaPrivada>
              <StockDashboard />
            </RutaPrivada>
          }
        />
        <Route
          path="/stock/movimientos"
          element={
            <RutaPrivada>
              <MovimientosStock />
            </RutaPrivada>
          }
        />
        <Route
          path="/stock/movimientos/nuevo"
          element={
            <RutaPrivada>
              <RegistroMovimiento />
            </RutaPrivada>
          }
        />
        <Route
          path="/stock/reservas"
          element={
            <RutaPrivada>
              <ReservasStock />
            </RutaPrivada>
          }
        />
        <Route
          path="/stock/alertas"
          element={
            <RutaPrivada>
              <AlertasStock />
            </RutaPrivada>
          }
        />
        <Route
          path="/stock/producto/:id"
          element={
            <RutaPrivada>
              <ProductoStock />
            </RutaPrivada>
          }
        />

        {/* 💉 VACUNAS */}
        <Route
          path="/vacunas"
          element={
            <RutaPrivada>
              <VacunasList />
            </RutaPrivada>
          }
        />
        <Route
          path="/vacunas/stock"
          element={
            <RutaPrivada>
              <StockVacunas />
            </RutaPrivada>
          }
        />
        <Route
          path="/vacunas/catalogos"
          element={
            <RutaPrivada>
              <CatalogosVacunas />
            </RutaPrivada>
          }
        />

        {/* 📊 SEGUIMIENTO (Sprint 4) */}
        <Route
          path="/seguimiento"
          element={
            <RutaPrivada>
              <SeguimientoDashboard />
            </RutaPrivada>
          }
        />
        <Route
          path="/seguimiento/aplicaciones"
          element={
            <RutaPrivada>
              <AplicacionesDosis />
            </RutaPrivada>
          }
        />
        <Route
          path="/seguimiento/retiros"
          element={
            <RutaPrivada>
              <RetirosCampo />
            </RutaPrivada>
          }
        />
        <Route
          path="/seguimiento/cumplimiento"
          element={
            <RutaPrivada>
              <CumplimientoPanel />
            </RutaPrivada>
          }
        />
        <Route
          path="/seguimiento/notificaciones"
          element={
            <RutaPrivada>
              <NotificacionesCenter />
            </RutaPrivada>
          }
        />
        
        {/* 💰 FACTURACIÓN (Sprint 5) */}
        <Route
          path="/facturacion"
          element={
            <RutaPrivada>
              <FacturacionDashboard />
            </RutaPrivada>
          }
        />
        <Route
          path="/facturas"
          element={
            <RutaPrivada>
              <FacturasList />
            </RutaPrivada>
          }
        />
        <Route
          path="/cobros"
          element={
            <RutaPrivada>
              <CobrosFacturacion />
            </RutaPrivada>
          }
        />
        <Route
          path="/notas-credito-debito"
          element={
            <RutaPrivada>
              <NotasCreditoDebito />
            </RutaPrivada>
          }
        />
        <Route
          path="/configuracion-facturacion"
          element={
            <RutaPrivada>
              <ConfiguracionFacturacion />
            </RutaPrivada>
          }
        />
        <Route
          path="/reportes-facturacion"
          element={
            <RutaPrivada>
              <ReportesFacturacion />
            </RutaPrivada>
          }
        />

        {/* ⚖️ LIQUIDACIONES */}
        <Route
          path="/liquidaciones"
          element={
            <RutaPrivada>
              <LiquidacionesDashboard />
            </RutaPrivada>
          }
        />

        {/* 🚚 LOGÍSTICA */}
        <Route
          path="/pedidos"
          element={
            <RutaPrivada>
              <PedidoList pedidos={pedidos} onActualizar={loadPedidos} />
            </RutaPrivada>
          }
        />
        <Route
          path="/logistica/nuevo-pedido"
          element={
            <RutaPrivada>
              <NuevoPedido onPedidoCreado={loadPedidos} />
            </RutaPrivada>
          }
        />
        <Route
          path="/clientes"
          element={
            <RutaPrivada>
              <ClienteList />
            </RutaPrivada>
          }
        />
        <Route
          path="/proveedores"
          element={
            <RutaPrivada>
              <ProveedorList />
            </RutaPrivada>
          }
        />
        <Route
          path="/productos"
          element={
            <RutaPrivada>
              <ProductoList />
            </RutaPrivada>
          }
        />
        <Route
          path="/recordatorios"
          element={
            <RutaPrivada>
              <RecordatoriosView />
            </RutaPrivada>
          }
        />
        <Route
          path="/semanal"
          element={
            <RutaPrivada>
              <VistaSemanal />
            </RutaPrivada>
          }
        />

        {/* ⚙️ SISTEMA & REPORTES (Sprint 6) */}
        <Route
          path="/reportes"
          element={
            <RutaPrivada>
              <ReportesView />
            </RutaPrivada>
          }
        />
        <Route 
          path="/sistema" 
          element={
            <RutaPrivada>
              <SistemaView />
            </RutaPrivada>
          } 
        />
        <Route 
          path="/sistema/usuarios" 
          element={
            <RutaPrivada>
              <UsuarioForm />
            </RutaPrivada>
          } 
        />
        <Route 
          path="/sistema/ctacte" 
          element={
            <RutaPrivada>
              <CtaCteForm />
            </RutaPrivada>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
