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
  FaEye,
  FaChartPie,
  FaSync
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { planesVacunalesApi } from "../services/planesVacunalesApi";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const { usuario } = useContext(AuthContext);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [graficosData, setGraficosData] = useState(null);
  const [loadingGraficos, setLoadingGraficos] = useState(true);
  const [periodoGraficos, setPeriodoGraficos] = useState('30d');

  // Cargar datos de gráficos
  const cargarGraficos = async () => {
    try {
      setLoadingGraficos(true);
      const response = await planesVacunalesApi.getGraficosPrincipales({ periodo: periodoGraficos });
      if (response.success) {
        setGraficosData(response.data);
      }
    } catch (error) {
      console.error('Error cargando gráficos:', error);
    } finally {
      setLoadingGraficos(false);
    }
  };

  useEffect(() => {
    cargarGraficos();
  }, [periodoGraficos]);

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
      title: "Vacunas",
      description: "Gestión de vacunas, stock especializado y catálogos",
      icon: FaSyringe,
      link: "/vacunas",
      color: "gradient-primary",
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

      {/* Sección de Gráficos */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="h4 mb-0 text-dark">
            <FaChartPie className="me-2" />
            Estadísticas y Gráficos
          </h3>
          <div className="d-flex align-items-center gap-3">
            <select 
              className="form-select form-select-sm" 
              style={{ width: 'auto' }}
              value={periodoGraficos}
              onChange={(e) => setPeriodoGraficos(e.target.value)}
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
            <button 
              className="btn btn-outline-dark btn-sm"
              onClick={cargarGraficos}
              disabled={loadingGraficos}
            >
              <FaSync className={loadingGraficos ? 'fa-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingGraficos ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2 text-muted">Cargando estadísticas...</p>
          </div>
        ) : graficosData ? (
          <>
            {/* Tarjetas de resumen */}
            <div className="row g-3 mb-4">
              <div className="col-md-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient">
                  <div className="card-body text-white">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="text-white-50 mb-1">Cotizaciones</h6>
                        <h3 className="mb-0">{graficosData.totales?.total_cotizaciones || 0}</h3>
                      </div>
                      <div className="align-self-center">
                        <FaFileInvoiceDollar size={32} className="opacity-50" />
                      </div>
                    </div>
                    <small className="text-white-50">
                      ${(graficosData.totales?.monto_cotizaciones || 0).toLocaleString('es-AR')}
                    </small>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100 bg-success bg-gradient">
                  <div className="card-body text-white">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="text-white-50 mb-1">Ventas Directas</h6>
                        <h3 className="mb-0">{graficosData.totales?.total_ventas_directas || 0}</h3>
                      </div>
                      <div className="align-self-center">
                        <FaShoppingCart size={32} className="opacity-50" />
                      </div>
                    </div>
                    <small className="text-white-50">
                      ${(graficosData.totales?.monto_ventas_directas || 0).toLocaleString('es-AR')}
                    </small>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100 bg-info bg-gradient">
                  <div className="card-body text-white">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="text-white-50 mb-1">Clientes Activos</h6>
                        <h3 className="mb-0">{graficosData.totales?.clientes_activos || 0}</h3>
                      </div>
                      <div className="align-self-center">
                        <FaUsers size={32} className="opacity-50" />
                      </div>
                    </div>
                    <small className="text-white-50">en el período</small>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100 bg-warning bg-gradient">
                  <div className="card-body text-white">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="text-white-50 mb-1">Facturación Total</h6>
                        <h3 className="mb-0">
                          ${((graficosData.totales?.monto_cotizaciones || 0) + 
                             (graficosData.totales?.monto_ventas_directas || 0)).toLocaleString('es-AR', {maximumFractionDigits: 0})}
                        </h3>
                      </div>
                      <div className="align-self-center">
                        <FaChartLine size={32} className="opacity-50" />
                      </div>
                    </div>
                    <small className="text-white-50">cotizaciones + ventas</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="row g-4">
              {/* Gráfico 1: Vacunas más vendidas */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="card-title mb-0">
                      <FaSyringe className="me-2 text-primary" />
                      Vacunas más vendidas (Cotizaciones)
                    </h5>
                  </div>
                  <div className="card-body">
                    {graficosData.vacunas_mas_vendidas?.length > 0 ? (
                      <div style={{ height: '300px', position: 'relative' }}>
                      <Bar
                        data={{
                          labels: graficosData.vacunas_mas_vendidas.map(v => 
                            v.nombre.length > 20 ? v.nombre.substring(0, 20) + '...' : v.nombre
                          ),
                          datasets: [{
                            label: 'Cantidad Total',
                            data: graficosData.vacunas_mas_vendidas.map(v => v.cantidad_total),
                            backgroundColor: [
                              'rgba(54, 162, 235, 0.8)',
                              'rgba(75, 192, 192, 0.8)',
                              'rgba(153, 102, 255, 0.8)',
                              'rgba(255, 159, 64, 0.8)',
                              'rgba(255, 99, 132, 0.8)',
                              'rgba(201, 203, 207, 0.8)',
                              'rgba(255, 205, 86, 0.8)',
                              'rgba(75, 192, 192, 0.8)',
                              'rgba(54, 162, 235, 0.8)',
                              'rgba(153, 102, 255, 0.8)'
                            ],
                            borderColor: [
                              'rgba(54, 162, 235, 1)',
                              'rgba(75, 192, 192, 1)',
                              'rgba(153, 102, 255, 1)',
                              'rgba(255, 159, 64, 1)',
                              'rgba(255, 99, 132, 1)',
                              'rgba(201, 203, 207, 1)',
                              'rgba(255, 205, 86, 1)',
                              'rgba(75, 192, 192, 1)',
                              'rgba(54, 162, 235, 1)',
                              'rgba(153, 102, 255, 1)'
                            ],
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                afterLabel: (context) => {
                                  const item = graficosData.vacunas_mas_vendidas[context.dataIndex];
                                  return [
                                    `Monto: $${item.monto_total.toLocaleString('es-AR')}`,
                                    `Veces cotizada: ${item.veces_cotizada}`
                                  ];
                                }
                              }
                            }
                          },
                          scales: {
                            y: { beginAtZero: true },
                            x: {
                              ticks: {
                                maxRotation: 45,
                                minRotation: 45
                              }
                            }
                          }
                        }}
                      />
                      </div>
                    ) : (
                      <div className="text-center text-muted py-5">
                        <FaSyringe size={48} className="mb-3 opacity-25" />
                        <p>No hay datos de vacunas para este período</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico 2: Cotizaciones por cliente */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="card-title mb-0">
                      <FaUsers className="me-2 text-success" />
                      Cotizaciones por Cliente
                    </h5>
                  </div>
                  <div className="card-body">
                    {graficosData.cotizaciones_por_cliente?.length > 0 ? (
                      <div style={{ height: '300px', position: 'relative' }}>
                      <Doughnut
                        data={{
                          labels: graficosData.cotizaciones_por_cliente.map(c => 
                            c.nombre.length > 25 ? c.nombre.substring(0, 25) + '...' : c.nombre
                          ),
                          datasets: [{
                            data: graficosData.cotizaciones_por_cliente.map(c => c.cantidad_cotizaciones),
                            backgroundColor: [
                              'rgba(255, 99, 132, 0.8)',
                              'rgba(54, 162, 235, 0.8)',
                              'rgba(255, 206, 86, 0.8)',
                              'rgba(75, 192, 192, 0.8)',
                              'rgba(153, 102, 255, 0.8)',
                              'rgba(255, 159, 64, 0.8)',
                              'rgba(199, 199, 199, 0.8)',
                              'rgba(83, 102, 255, 0.8)',
                              'rgba(255, 99, 255, 0.8)',
                              'rgba(99, 255, 132, 0.8)'
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                              labels: { 
                                boxWidth: 12,
                                font: { size: 11 }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                afterLabel: (context) => {
                                  const item = graficosData.cotizaciones_por_cliente[context.dataIndex];
                                  return `Monto: $${item.monto_total.toLocaleString('es-AR')}`;
                                }
                              }
                            }
                          }
                        }}
                      />
                      </div>
                    ) : (
                      <div className="text-center text-muted py-5">
                        <FaUsers size={48} className="mb-3 opacity-25" />
                        <p>No hay cotizaciones para este período</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico 3: Ventas directas por cliente */}}
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="card-title mb-0">
                      <FaShoppingCart className="me-2 text-warning" />
                      Ventas Directas por Cliente
                    </h5>
                  </div>
                  <div className="card-body">
                    {graficosData.ventas_directas_por_cliente?.length > 0 ? (
                      <div style={{ height: '280px', position: 'relative' }}>
                      <Bar
                        data={{
                          labels: graficosData.ventas_directas_por_cliente.map(v => 
                            v.nombre.length > 25 ? v.nombre.substring(0, 25) + '...' : v.nombre
                          ),
                          datasets: [
                            {
                              label: 'Cantidad de Ventas',
                              data: graficosData.ventas_directas_por_cliente.map(v => v.cantidad_ventas),
                              backgroundColor: 'rgba(255, 159, 64, 0.8)',
                              borderColor: 'rgba(255, 159, 64, 1)',
                              borderWidth: 1,
                              yAxisID: 'y'
                            },
                            {
                              label: 'Monto Total ($)',
                              data: graficosData.ventas_directas_por_cliente.map(v => v.monto_total),
                              backgroundColor: 'rgba(75, 192, 192, 0.8)',
                              borderColor: 'rgba(75, 192, 192, 1)',
                              borderWidth: 1,
                              yAxisID: 'y1'
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index',
                            intersect: false,
                          },
                          plugins: {
                            legend: {
                              position: 'top'
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  if (context.datasetIndex === 1) {
                                    return `${context.dataset.label}: $${context.raw.toLocaleString('es-AR')}`;
                                  }
                                  return `${context.dataset.label}: ${context.raw}`;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Cantidad'
                              },
                              beginAtZero: true
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: {
                                display: true,
                                text: 'Monto ($)'
                              },
                              beginAtZero: true,
                              grid: {
                                drawOnChartArea: false
                              }
                            },
                            x: {
                              ticks: {
                                maxRotation: 45,
                                minRotation: 0
                              }
                            }
                          }
                        }}
                      />
                      </div>
                    ) : (
                      <div className="text-center text-muted py-5">
                        <FaShoppingCart size={48} className="mb-3 opacity-25" />
                        <p>No hay ventas directas para este período</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="alert alert-warning">
            <FaBell className="me-2" />
            No se pudieron cargar las estadísticas. Intente nuevamente.
          </div>
        )}
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
              <div className="modal-header">
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