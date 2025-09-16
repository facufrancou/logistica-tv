import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Seguimiento.css';

const SeguimientoDashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        estadisticas: {
            totalAplicaciones: 0,
            aplicacionesHoy: 0,
            cumplimientoPromedio: 0,
            alertasVencimiento: 0
        },
        proximasAplicaciones: [],
        alertas: [],
        graficosCumplimiento: []
    });
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        periodo: '30', // últimos 30 días
        cliente: '',
        producto: ''
    });

    useEffect(() => {
        cargarDashboard();
    }, [filtros]);

    const cargarDashboard = async () => {
        try {
            setLoading(true);
            const data = await planesVacunalesApi.getSeguimientoDashboard(filtros);
            setDashboardData(data);
        } catch (error) {
            console.error('Error al cargar dashboard de seguimiento:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFiltroChange = (campo, valor) => {
        setFiltros(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    if (loading) {
        return (
            <div className="container-fluid">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border" role="status">
                        <span className="sr-only">Cargando...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid seguimiento-dashboard">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Dashboard de Seguimiento</h2>
                        <div className="d-flex gap-3">
                            <select 
                                className="form-select"
                                value={filtros.periodo}
                                onChange={(e) => handleFiltroChange('periodo', e.target.value)}
                            >
                                <option value="7">Últimos 7 días</option>
                                <option value="30">Últimos 30 días</option>
                                <option value="90">Últimos 90 días</option>
                                <option value="365">Último año</option>
                            </select>
                            <button 
                                className="btn btn-primary"
                                onClick={cargarDashboard}
                            >
                                <i className="bi bi-arrow-clockwise"></i> Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estadísticas principales */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-primary mb-3">
                                <i className="bi bi-syringe text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{dashboardData.estadisticas.totalAplicaciones}</h3>
                            <p className="stats-label text-muted">Total Aplicaciones</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-success mb-3">
                                <i className="bi bi-calendar-check text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{dashboardData.estadisticas.aplicacionesHoy}</h3>
                            <p className="stats-label text-muted">Aplicaciones Hoy</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-info mb-3">
                                <i className="bi bi-graph-up text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{dashboardData.estadisticas.cumplimientoPromedio}%</h3>
                            <p className="stats-label text-muted">Cumplimiento</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-warning mb-3">
                                <i className="bi bi-exclamation-triangle text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{dashboardData.estadisticas.alertasVencimiento}</h3>
                            <p className="stats-label text-muted">Alertas Vencimiento</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Próximas aplicaciones */}
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-calendar-event me-2"></i>
                                Próximas Aplicaciones
                            </h5>
                        </div>
                        <div className="card-body">
                            {dashboardData.proximasAplicaciones.length === 0 ? (
                                <p className="text-muted text-center">No hay aplicaciones programadas</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th className="text-dark">Cliente</th>
                                                <th className="text-dark">Producto</th>
                                                <th className="text-dark">Fecha Programada</th>
                                                <th className="text-dark">Días Restantes</th>
                                                <th className="text-dark">Estado</th>
                                                <th className="text-dark">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.proximasAplicaciones.map((aplicacion, index) => (
                                                <tr key={index}>
                                                    <td className="text-dark">{aplicacion.cliente}</td>
                                                    <td className="text-dark">{aplicacion.producto}</td>
                                                    <td className="text-dark">{aplicacion.fechaProgramada}</td>
                                                    <td>
                                                        <span className={`badge ${aplicacion.diasRestantes <= 3 ? 'bg-danger' : aplicacion.diasRestantes <= 7 ? 'bg-warning' : 'bg-success'}`}>
                                                            {aplicacion.diasRestantes} días
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${aplicacion.estado === 'Programada' ? 'bg-info' : aplicacion.estado === 'Pendiente' ? 'bg-warning' : 'bg-success'}`}>
                                                            {aplicacion.estado}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="btn-group btn-group-sm">
                                                            <button className="btn btn-outline-primary btn-sm">
                                                                <i className="bi bi-eye"></i>
                                                            </button>
                                                            <button className="btn btn-outline-success btn-sm">
                                                                <i className="bi bi-check2"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel de alertas */}
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-header bg-warning">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-bell me-2"></i>
                                Alertas y Notificaciones
                            </h5>
                        </div>
                        <div className="card-body">
                            {dashboardData.alertas.length === 0 ? (
                                <p className="text-muted text-center">No hay alertas activas</p>
                            ) : (
                                <div className="alertas-list">
                                    {dashboardData.alertas.map((alerta, index) => (
                                        <div key={index} className={`alert alert-${alerta.tipo} d-flex align-items-center`}>
                                            <i className={`bi ${alerta.icono} me-2`}></i>
                                            <div className="flex-grow-1">
                                                <small className="fw-bold text-dark d-block">{alerta.titulo}</small>
                                                <small className="text-dark">{alerta.mensaje}</small>
                                            </div>
                                            <button className="btn btn-sm btn-outline-secondary ms-2">
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resumen de cumplimiento */}
                    <div className="card mt-3">
                        <div className="card-header bg-info">
                            <h5 className="mb-0 text-white">
                                <i className="bi bi-pie-chart me-2"></i>
                                Resumen de Cumplimiento
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="cumplimiento-summary">
                                <div className="progress mb-3">
                                    <div 
                                        className="progress-bar bg-success" 
                                        style={{width: `${dashboardData.estadisticas.cumplimientoPromedio}%`}}
                                    >
                                        {dashboardData.estadisticas.cumplimientoPromedio}%
                                    </div>
                                </div>
                                <div className="row text-center">
                                    <div className="col-4">
                                        <small className="text-muted d-block">Completadas</small>
                                        <strong className="text-success">85%</strong>
                                    </div>
                                    <div className="col-4">
                                        <small className="text-muted d-block">Pendientes</small>
                                        <strong className="text-warning">10%</strong>
                                    </div>
                                    <div className="col-4">
                                        <small className="text-muted d-block">Vencidas</small>
                                        <strong className="text-danger">5%</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accesos rápidos */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-lightning me-2"></i>
                                Accesos Rápidos
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-3">
                                    <button className="btn btn-outline-primary w-100 mb-2">
                                        <i className="bi bi-plus-circle me-2"></i>
                                        Nueva Aplicación
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-success w-100 mb-2">
                                        <i className="bi bi-calendar-check me-2"></i>
                                        Registrar Cumplimiento
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-info w-100 mb-2">
                                        <i className="bi bi-graph-up me-2"></i>
                                        Ver Reportes
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-warning w-100 mb-2">
                                        <i className="bi bi-bell me-2"></i>
                                        Configurar Alertas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeguimientoDashboard;