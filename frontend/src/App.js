import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import RutaPrivada from './components/RutaPrivada';

import Login from './components/Login';
import ClienteList from './components/ClienteList';
import ProductoList from './components/ProductoList';
import PedidoList from './components/PedidoList';
import PedidoForm from './components/PedidoForm';
import PedidoAcceso from './components/PedidoAcceso';
import { getPedidos } from './services/api';
import { useEffect, useState, useContext } from 'react';

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
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/">Tierra Volga</Link>

      {usuario && (
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/pedidos">PEDIDOS</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/clientes">CLIENTES</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/productos">PRODUCTOS</Link>
            </li>
          </ul>
          <span className="navbar-text me-3 text-white">
            {usuario.nombre}
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={cerrarSesion}>
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
        <Route path="/" element={
          <RutaPrivada>
            <PedidoForm onPedidoCreado={loadPedidos} />
            <PedidoList pedidos={pedidos} onActualizar={loadPedidos} />
          </RutaPrivada>
        } />
        <Route path="/pedidos" element={
          <RutaPrivada>
            <PedidoList pedidos={pedidos} onActualizar={loadPedidos} />
          </RutaPrivada>
        } />
        <Route path="/clientes" element={
          <RutaPrivada>
            <ClienteList />
          </RutaPrivada>
        } />
        <Route path="/productos" element={
          <RutaPrivada>
            <ProductoList />
          </RutaPrivada>
        } />
      </Routes>
    </div>
  );
}

export default App;
