import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import { 
  FaSyringe, 
  FaWarehouse, 
  FaChartBar, 
  FaFileInvoiceDollar,
  FaTruck,
  FaCog,
  FaShoppingCart,
  FaBuilding,
  FaFlask,
  FaUsers,
  FaCalendarAlt,
  FaBell,
  FaArrowRight,
  FaChartLine,
  FaStethoscope,
  FaEye
} from "react-icons/fa";

function Dashboard() {
  const { usuario } = useContext(AuthContext);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Mostrar modal de bienvenida solo si acabamos de iniciar sesión
    if (usuario) {
      const welcomeShown = sessionStorage.getItem(`welcomeModalShown_${usuario.id || usuario.nombre}`);
      if (!welcomeShown) {
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 500); // Pequeño delay para mejor UX
        sessionStorage.setItem(`welcomeModalShown_${usuario.id || usuario.nombre}`, 'true');
      }
    }
  }, [usuario]);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
  };

  const quickActions = [
    {
      title: "Nuevo Pedido",
      description: "Crear un nuevo pedido de productos",
      icon: FaShoppingCart,
      link: "/logistica/nuevo-pedido",
      color: "dark",
      urgent: true
    },
    {
      title: "Ver Pedidos",
      description: "Consultar pedidos realizados",
      icon: FaEye,
      link: "/pedidos",
      color: "warning"
    },
    {
      title: "Ver Stock",
      description: "Consultar inventario actual",
      icon: FaWarehouse,
      link: "/stock",
      color: "secondary"
    },
    {
      title: "Nuevo Plan Vacunal",
      description: "Crear plan de vacunación",
      icon: FaStethoscope,
      link: "/planes-vacunales/nuevo",
      color: "info"
      }
  ];

  const modules = [
    {
      title: "Planes Vacunales",
      description: "Gestión completa de planes de vacunación y cotizaciones",
      icon: FaSyringe,
      link: "/planes-vacunales",
      color: "gradient-success",
      stats: ""
    },
    {
      title: "Stock & Inventario",
      description: "Control de inventario, movimientos y alertas de stock",
      icon: FaWarehouse,
      link: "/stock",
      color: "gradient-info",
      stats: ""
    },
    {
      title: "Seguimiento",
      description: "Seguimiento de dosis y cumplimiento de vacunación",
      icon: FaChartBar,
      link: "/seguimiento",
      color: "gradient-warning",
      stats: ""
    },
    {
      title: "Facturación",
      description: "Sistema de facturación e integración con AFIP",
      icon: FaFileInvoiceDollar,
      link: "/facturacion",
      color: "gradient-secondary",
      stats: ""
    },
    {
      title: "Logística",
      description: "Gestión de pedidos, clientes, proveedores y productos",
      icon: FaTruck,
      link: "/pedidos",
      color: "gradient-dark",
      stats: ""
    },
    {
      title: "Sistema",
      description: "Reportes avanzados y administración del sistema",
      icon: FaCog,
      link: "/sistema",
      color: "gradient-muted",
      stats: ""
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Header Section - Simplificado */}
      <div className="dashboard-header mb-5">
        <div className="row align-items-center">
          <div className="col-md-8 ">
            <h3 className="display-6 fw-bold text-dark mb-1  ">
              Sistema de Gestión
            </h3>
          </div>
          
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-5">
        <h3 className="h4 mb-3 text-dark">
          <FaArrowRight className="me-2" />
          Accesos Rápidos
        </h3>
        <div className="row g-3">
          {quickActions.map((action, index) => (
            <div key={index} className="col-md-6 col-lg-3">
              <Link to={action.link} className="text-decoration-none">
                <div className={`card h-100 border-0 shadow-sm hover-lift ${action.urgent ? 'border-start border-5 border-dark' : ''}`}>
                  <div className="card-body text-center">
                    <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 bg-${action.color} text-white`}
                         style={{ width: '60px', height: '60px' }}>
                      <action.icon size={24} />
                    </div>
                    <h6 className="card-title fw-semibold">{action.title}</h6>
                    <p className="card-text text-muted small">{action.description}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="mb-5">
        <h3 className="h4 mb-4 text-dark">
          <FaChartLine className="me-2" />
          Módulos del Sistema
        </h3>
        <div className="row g-4">
          {modules.map((module, index) => (
            <div key={index} className="col-md-6 col-lg-4">
              <Link to={module.link} className="text-decoration-none">
                <div className={`card h-100 border-0 shadow module-card ${module.color}`}>
                  <div className="card-body text-white">
                    <div className="d-flex align-items-start mb-3">
                      <div className="module-icon me-3">
                        <module.icon size={32} />
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="card-title fw-bold mb-1">{module.title}</h5>
                        <small className="opacity-75">{module.stats}</small>
                      </div>
                    </div>
                    <p className="card-text opacity-90">{module.description}</p>
                    <div className="mt-auto">
                      <small className="opacity-75">
                        <FaArrowRight className="me-1" />
                        Acceder al módulo
                      </small>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="row mt-5 pt-4 border-top">
        <div className="col-12 text-center">
          <h6 className="text-dark mb-3">Sistema de Gestión</h6>
          <p className="text-muted small mb-1">
            Plataforma integral para la gestión de planes vacunales, 
            inventario, facturación y logística de productos veterinarios.
          </p>
          <small className="text-muted">
            <strong>Versión 2.4 Septiembre 2025</strong> - By Facundo Francou © 2025
          </small>
        </div>
      </div>

      {/* Modal de Bienvenida */}
      {showWelcomeModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white border-0">
                <h5 className="modal-title fw-bold">
                  <FaStethoscope className="me-2" />
                  ¡Bienvenido al Sistema!
                </h5>
              </div>
              <div className="modal-body text-center p-4">
                <div className="mb-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center bg-dark bg-opacity-10 mb-3"
                       style={{ width: '80px', height: '80px' }}>
                    <FaUsers size={40} className="text-dark" />
                  </div>
                  <h4 className="text-dark mb-3">
                    Hola, <strong>{usuario?.nombre}</strong>
                  </h4>
                  <p className="text-muted mb-3">
                    Te damos la bienvenida al <strong>Sistema de Gestión</strong>
                  </p>
                  <div className="bg-light p-3 rounded mb-3">
                    <small className="text-muted d-block">
                      <FaCalendarAlt className="me-1" />
                      {currentTime.toLocaleDateString('es-AR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </small>
                  </div>
                  <p className="small text-muted">
                    Plataforma integral para la gestión de planes vacunales, 
                    inventario, facturación y logística veterinaria.
                  </p>
                </div>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-dark btn-lg px-4"
                  onClick={handleCloseWelcomeModal}
                >
                  <FaArrowRight className="me-2" />
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;