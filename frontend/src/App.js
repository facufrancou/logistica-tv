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
  FaChartLine
} from "react-icons/fa";

import Login from "./components/Login";
import ClienteList from "./components/ClienteList";
import ProductoList from "./components/ProductoList";
import PedidoList from "./components/PedidoList";
import PedidoForm from "./components/PedidoForm";
import PedidoAcceso from "./components/PedidoAcceso";
import RecordatoriosView from "./components/RecordatoriosView";
import ReportesView from "./components/ReportesView";
import VistaSemanal from "./components/VistaSemanal";
import ProveedorList from "./components/ProveedorList";
import SistemaView from "./components/SistemaView";
import UsuarioForm from "./components/UsuarioForm";
import CtaCteForm from "./components/CtaCteForm";

// Nuevos componentes para Planes Vacunales
import PlanesVacunalesList from "./components/planesVacunales/PlanesVacunalesList";
import PlanVacunalForm from "./components/planesVacunales/PlanVacunalForm";
import PlanVacunalDetalle from "./components/planesVacunales/PlanVacunalDetalle";
import ListasPreciosList from "./components/planesVacunales/ListasPreciosList";
import CotizacionesList from "./components/planesVacunales/CotizacionesList";
import CotizacionForm from "./components/planesVacunales/CotizacionForm";
import CotizacionDetalle from "./components/planesVacunales/CotizacionDetalle";

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
            <li className="nav-item">
              <Link className="nav-link d-flex align-items-center" to="/">
                <FaHome className="me-1" />
                <span>Home</span>
              </Link>
            </li>

            {/* Dropdown de Planes Vacunales */}
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
                <li><Link className="dropdown-item d-flex align-items-center" to="/planes-vacunales"><FaSyringe className="me-2" /> Gestión de Planes</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/cotizaciones"><FaFileInvoice className="me-2" /> Cotizaciones</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/listas-precios"><FaClipboardList className="me-2" /> Listas de Precios</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/stock"><FaWarehouse className="me-2" /> Gestión de Stock</Link></li>
              </ul>
            </li>

            {/* Dropdown de Seguimiento de Dosis */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="seguimientoDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaClipboardList className="me-1" />
                <span>Seguimiento</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="seguimientoDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento"><FaChartBar className="me-2" /> Dashboard</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/aplicaciones"><FaSyringe className="me-2" /> Aplicaciones</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/retiros"><FaTruck className="me-2" /> Retiros de Campo</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/cumplimiento"><FaChartBar className="me-2" /> Cumplimiento</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/seguimiento/notificaciones"><FaBell className="me-2" /> Notificaciones</Link></li>
              </ul>
            </li>

            {/* Dropdown de gestión */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="gestionDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaBoxOpen className="me-1" />
                <span>Gestión</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="gestionDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/pedidos"><FaBoxOpen className="me-2" /> Pedidos</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/clientes"><FaUsers className="me-2" /> Clientes</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/proveedores"><FaTruck className="me-2" /> Proveedores</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/productos"><FaBoxOpen className="me-2" /> Productos</Link></li>
              </ul>
            </li>

            {/* Admin: reportes, recordatorios, semanal */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                id="adminDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaChartBar className="me-1" />
                <span>Admin</span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="adminDropdown">
                <li><Link className="dropdown-item d-flex align-items-center" to="/reportes"><FaChartBar className="me-2" /> Reportes</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/recordatorios"><FaBell className="me-2" /> Próximos pedidos</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/semanal"><FaCalendarAlt className="me-2" /> Vista Semanal</Link></li>
              </ul>
            </li>

            {/* Facturación */}
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
                <li><Link className="dropdown-item d-flex align-items-center" to="/facturacion"><FaFileInvoiceDollar className="me-2" /> Dashboard Facturación</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/facturas"><FaFileInvoice className="me-2" /> Gestión de Facturas</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/cobros"><FaMoneyBill className="me-2" /> Gestión de Cobros</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/notas-credito-debito"><FaFileAlt className="me-2" /> Notas Créd./Déb.</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/configuracion-facturacion"><FaCog className="me-2" /> Configuración AFIP</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/reportes-facturacion"><FaChartLine className="me-2" /> Reportes Fiscales</Link></li>
              </ul>
            </li>

            {/* Sistema: usuarios y cuentas corrientes */}
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
                <li><Link className="dropdown-item d-flex align-items-center" to="/sistema"><FaCog className="me-2" /> Panel Sistema</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/sistema/usuarios"><FaUsers className="me-2" /> Crear usuario</Link></li>
                <li><Link className="dropdown-item d-flex align-items-center" to="/sistema/ctacte"><FaChartBar className="me-2" /> Crear Cta. Cte.</Link></li>
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
    <div className="container-fluid px-3 px-md-4 py-4">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pedido/acceso" element={<PedidoAcceso />} />

        {/* 🔐 Rutas protegidas - Sistema Legacy */}
        <Route
          path="/"
          element={
            <RutaPrivada>
              <PedidoForm onPedidoCreado={loadPedidos} />
              {/* <PedidoList pedidos={pedidos} onActualizar={loadPedidos} /> */}
            </RutaPrivada>
          }
        />
        <Route
          path="/pedidos"
          element={
            <RutaPrivada>
              <PedidoList pedidos={pedidos} onActualizar={loadPedidos} />
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
          path="/reportes"
          element={
            <RutaPrivada>
              <ReportesView />
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
        <Route
          path="/proveedores"
          element={
            <RutaPrivada>
              <ProveedorList />
            </RutaPrivada>
          }
        />
        <Route path="/sistema" element={<RutaPrivada><SistemaView /></RutaPrivada>} />
        <Route path="/sistema/usuarios" element={<RutaPrivada><UsuarioForm /></RutaPrivada>} />
        <Route path="/sistema/ctacte" element={<RutaPrivada><CtaCteForm /></RutaPrivada>} />

        {/* 🔐 Rutas protegidas - Planes Vacunales (Nuevo Sistema) */}
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

        {/* 🗂️ Rutas de Stock (Sprint 3) */}
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

        {/* 📊 Rutas de Seguimiento de Dosis (Sprint 4) */}
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
        
        {/* 💰 Rutas de Facturación (Sprint 5) */}
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
      </Routes>
    </div>
  );
}

export default App;
