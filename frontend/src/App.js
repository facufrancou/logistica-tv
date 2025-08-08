import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
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
  FaBars
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
        <Router>
          <Navbar />
          <MainRoutes />
        </Router>
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

        {/* 🔐 Rutas protegidas */}
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
      </Routes>
    </div>
  );
}

export default App;
