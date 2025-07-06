import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import RutaPrivada from "./components/RutaPrivada";

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

import { getPedidos } from "./services/api";
import { useEffect, useState, useContext } from "react";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <MainRoutes />
      </Router>
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

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/">
        Tierra Volga
      </Link>

      {usuario && (
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>

            {/* Dropdown de gestión */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="gestionDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Gestión
              </a>
              <ul className="dropdown-menu" aria-labelledby="gestionDropdown">
                <li>
                  <Link className="dropdown-item" to="/pedidos">
                    Pedidos
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/clientes">
                    Clientes
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/productos">
                    Productos
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/proveedores">
                    Proveedores
                  </Link>
                </li>
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="gestionDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Admin
              </a>
              <ul className="dropdown-menu" aria-labelledby="gestionDropdown">
                <li>
                  <Link className="dropdown-item" to="/reportes">
                    Reportes
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/recordatorios">
                    Próximos pedidos
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/semanal">
                    Vista Semanal
                  </Link>
                </li>
              </ul>
            </li>
          </ul>

          <span className="navbar-text me-3 text-white">{usuario.nombre}</span>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
}

// ✅ Contenedor principal de rutas
function MainRoutes() {
  const [pedidos, setPedidos] = useState([]);
  const loadPedidos = () => getPedidos().then(setPedidos);

  useEffect(() => {
    loadPedidos();
  }, []);

  return (
    <div className="container mt-4">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pedido/acceso" element={<PedidoAcceso />} />

        {/* 🔐 Rutas protegidas */}
        <Route
          path="/"
          element={
            <RutaPrivada>
              <PedidoForm onPedidoCreado={loadPedidos} />
              <PedidoList pedidos={pedidos} onActualizar={loadPedidos} />
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
            // ✅ NUEVO
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
      </Routes>
    </div>
  );
}

export default App;
