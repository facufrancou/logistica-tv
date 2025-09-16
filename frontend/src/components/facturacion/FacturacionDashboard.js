import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Facturacion.css';

const FacturacionDashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        estadisticas: {
            totalFacturado: 0,
            facturasPendientes: 0,
            facturasVencidas: 0,
            montoPromedio: 0,
            crecimientoMensual: 0
        },
        facturasPendientes: [],
        facturasRecientes: [],
        topClientes: [],
        tendenciasVentas: []
    });
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        periodo: '30', // últimos 30 días
        cliente: '',
        estado: ''
    });

    useEffect(() => {
        cargarDashboard();
    }, [filtros]);

    const cargarDashboard = async () => {
        try {
            setLoading(true);
            const data = await planesVacunalesApi.getFacturacionDashboard(filtros);
            setDashboardData(data);
        } catch (error) {
            console.error('Error al cargar dashboard de facturación:', error);
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

    const formatearMoneda = (monto) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(monto);
    };

    const getEstadoBadge = (estado) => {
        const estados = {
            'Pendiente': 'bg-warning',
            'Pagada': 'bg-success',
            'Vencida': 'bg-danger',
            'Cancelada': 'bg-secondary',
            'Parcial': 'bg-info'
        };
        return estados[estado] || 'bg-secondary';
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
        <div className="container-fluid facturacion-dashboard">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Dashboard de Facturación</h2>
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
                            <div className="stats-icon bg-success mb-3">
                                <i className="bi bi-currency-dollar text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{formatearMoneda(dashboardData.estadisticas.totalFacturado)}</h3>
                            <p className="stats-label text-muted">Total Facturado</p>
                            <small className={`text-${dashboardData.estadisticas.crecimientoMensual >= 0 ? 'success' : 'danger'}`}>
                                <i className={`bi bi-arrow-${dashboardData.estadisticas.crecimientoMensual >= 0 ? 'up' : 'down'}`}></i>
                                {Math.abs(dashboardData.estadisticas.crecimientoMensual)}% vs mes anterior
                            </small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-warning mb-3">
                                <i className="bi bi-clock text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{dashboardData.estadisticas.facturasPendientes}</h3>
                            <p className="stats-label text-muted">Facturas Pendientes</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-danger mb-3">
                                <i className="bi bi-exclamation-triangle text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{dashboardData.estadisticas.facturasVencidas}</h3>
                            <p className="stats-label text-muted">Facturas Vencidas</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-info mb-3">
                                <i className="bi bi-graph-up text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{formatearMoneda(dashboardData.estadisticas.montoPromedio)}</h3>
                            <p className="stats-label text-muted">Monto Promedio</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Facturas pendientes */}
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-file-earmark-text me-2"></i>
                                Facturas Pendientes de Pago
                            </h5>
                        </div>
                        <div className="card-body">
                            {dashboardData.facturasPendientes.length === 0 ? (
                                <p className="text-muted text-center">No hay facturas pendientes</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th className="text-dark">Nº Factura</th>
                                                <th className="text-dark">Cliente</th>
                                                <th className="text-dark">Fecha</th>
                                                <th className="text-dark">Vencimiento</th>
                                                <th className="text-dark">Monto</th>
                                                <th className="text-dark">Estado</th>
                                                <th className="text-dark">Días</th>
                                                <th className="text-dark">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.facturasPendientes.map((factura, index) => {
                                                const diasVencimiento = Math.ceil((new Date(factura.fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                                                return (
                                                    <tr key={index}>
                                                        <td className="text-dark font-weight-bold">{factura.numero}</td>
                                                        <td className="text-dark">{factura.cliente}</td>
                                                        <td className="text-dark">{factura.fecha}</td>
                                                        <td className="text-dark">{factura.fechaVencimiento}</td>
                                                        <td className="text-dark">{formatearMoneda(factura.monto)}</td>
                                                        <td>
                                                            <span className={`badge ${getEstadoBadge(factura.estado)}`}>
                                                                {factura.estado}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${diasVencimiento < 0 ? 'bg-danger' : diasVencimiento <= 5 ? 'bg-warning' : 'bg-success'}`}>
                                                                {diasVencimiento < 0 ? `${Math.abs(diasVencimiento)} vencidos` : `${diasVencimiento} días`}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="btn-group btn-group-sm">
                                                                <button className="btn btn-outline-primary btn-sm">
                                                                    <i className="bi bi-eye"></i>
                                                                </button>
                                                                <button className="btn btn-outline-success btn-sm">
                                                                    <i className="bi bi-envelope"></i>
                                                                </button>
                                                                <button className="btn btn-outline-info btn-sm">
                                                                    <i className="bi bi-printer"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel lateral con información adicional */}
                <div className="col-md-4">
                    {/* Top clientes */}
                    <div className="card mb-3">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-star me-2"></i>
                                Top Clientes
                            </h5>
                        </div>
                        <div className="card-body">
                            {dashboardData.topClientes.length === 0 ? (
                                <p className="text-muted text-center">No hay datos disponibles</p>
                            ) : (
                                <div className="top-clientes-list">
                                    {dashboardData.topClientes.map((cliente, index) => (
                                        <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                            <div>
                                                <h6 className="mb-0 text-dark">{cliente.nombre}</h6>
                                                <small className="text-muted">{cliente.facturas} facturas</small>
                                            </div>
                                            <div className="text-end">
                                                <strong className="text-dark">{formatearMoneda(cliente.monto)}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Facturas recientes */}
                    <div className="card">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-clock-history me-2"></i>
                                Actividad Reciente
                            </h5>
                        </div>
                        <div className="card-body">
                            {dashboardData.facturasRecientes.length === 0 ? (
                                <p className="text-muted text-center">No hay actividad reciente</p>
                            ) : (
                                <div className="actividad-reciente">
                                    {dashboardData.facturasRecientes.map((factura, index) => (
                                        <div key={index} className="d-flex align-items-center py-2 border-bottom">
                                            <div className={`activity-icon bg-${factura.tipo === 'creada' ? 'success' : factura.tipo === 'pagada' ? 'info' : 'warning'} me-3`}>
                                                <i className={`bi ${factura.tipo === 'creada' ? 'bi-plus' : factura.tipo === 'pagada' ? 'bi-check' : 'bi-clock'} text-white`}></i>
                                            </div>
                                            <div className="flex-grow-1">
                                                <h6 className="mb-0 text-dark">Factura {factura.numero}</h6>
                                                <small className="text-muted">
                                                    {factura.accion} - {factura.cliente}
                                                </small>
                                                <div className="text-muted" style={{fontSize: '0.75rem'}}>
                                                    {factura.fecha}
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <small className="text-dark">{formatearMoneda(factura.monto)}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráfico de tendencias */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-graph-up me-2"></i>
                                Tendencias de Facturación
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-8">
                                    {/* Aquí iría el gráfico de tendencias */}
                                    <div className="chart-placeholder bg-light p-5 rounded text-center">
                                        <i className="bi bi-graph-up display-1 text-muted"></i>
                                        <p className="text-muted mt-3">Gráfico de tendencias de facturación</p>
                                        <small className="text-muted">Mostrando datos de los últimos {filtros.periodo} días</small>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="tendencias-summary">
                                        <h6 className="text-dark mb-3">Resumen del Período</h6>
                                        <div className="row text-center">
                                            <div className="col-12 mb-3">
                                                <div className="bg-light p-3 rounded">
                                                    <i className="bi bi-currency-dollar text-success mb-2 d-block" style={{fontSize: '1.5rem'}}></i>
                                                    <strong className="text-dark d-block">{formatearMoneda(dashboardData.estadisticas.totalFacturado)}</strong>
                                                    <small className="text-muted">Ingresos Totales</small>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="bg-light p-2 rounded">
                                                    <strong className="text-dark d-block">{dashboardData.estadisticas.facturasPendientes + dashboardData.estadisticas.facturasVencidas}</strong>
                                                    <small className="text-muted">Facturas Emitidas</small>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="bg-light p-2 rounded">
                                                    <strong className="text-dark d-block">{formatearMoneda(dashboardData.estadisticas.montoPromedio)}</strong>
                                                    <small className="text-muted">Ticket Promedio</small>
                                                </div>
                                            </div>
                                        </div>
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
                                    <button className="btn btn-primary w-100 mb-2">
                                        <i className="bi bi-plus-circle me-2"></i>
                                        Nueva Factura
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-success w-100 mb-2">
                                        <i className="bi bi-credit-card me-2"></i>
                                        Registrar Pago
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-info w-100 mb-2">
                                        <i className="bi bi-file-earmark-pdf me-2"></i>
                                        Exportar Reportes
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-warning w-100 mb-2">
                                        <i className="bi bi-gear me-2"></i>
                                        Configuración
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

export default FacturacionDashboard;