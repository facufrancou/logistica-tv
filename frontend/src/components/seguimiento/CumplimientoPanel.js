import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Seguimiento.css';

const CumplimientoPanel = () => {
    const [datosPanel, setDatosPanel] = useState({
        resumenGeneral: {
            totalPlanesActivos: 0,
            cumplimientoPromedio: 0,
            aplicacionesCompletadas: 0,
            aplicacionesPendientes: 0
        },
        cumplimientoPorCliente: [],
        cumplimientoPorProducto: [],
        tendenciasTemporales: [],
        alertasCumplimiento: []
    });
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        periodo: '30',
        clienteId: '',
        productoId: '',
        tipoAnalisis: 'general'
    });
    const [vistaActiva, setVistaActiva] = useState('resumen');

    useEffect(() => {
        cargarDatosCumplimiento();
    }, [filtros]);

    const cargarDatosCumplimiento = async () => {
        try {
            setLoading(true);
            const data = await planesVacunalesApi.getCumplimiento(filtros);
            setDatosPanel(data);
        } catch (error) {
            console.error('Error al cargar datos de cumplimiento:', error);
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

    const getCumplimientoColor = (porcentaje) => {
        if (porcentaje >= 90) return 'text-success';
        if (porcentaje >= 70) return 'text-warning';
        return 'text-danger';
    };

    const getCumplimientoBadge = (porcentaje) => {
        if (porcentaje >= 90) return 'bg-success';
        if (porcentaje >= 70) return 'bg-warning';
        return 'bg-danger';
    };

    const generarReporte = () => {
        // Función para generar reporte de cumplimiento
        console.log('Generando reporte de cumplimiento...');
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
        <div className="container-fluid cumplimiento-panel">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Panel de Cumplimiento</h2>
                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-outline-primary"
                                onClick={generarReporte}
                            >
                                <i className="bi bi-file-earmark-pdf me-2"></i>
                                Generar Reporte
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={cargarDatosCumplimiento}
                            >
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-sliders me-2"></i>
                                Configuración de Análisis
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Período</label>
                                    <select
                                        className="form-select"
                                        value={filtros.periodo}
                                        onChange={(e) => handleFiltroChange('periodo', e.target.value)}
                                    >
                                        <option value="7">Últimos 7 días</option>
                                        <option value="30">Últimos 30 días</option>
                                        <option value="90">Últimos 90 días</option>
                                        <option value="180">Últimos 6 meses</option>
                                        <option value="365">Último año</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Tipo de Análisis</label>
                                    <select
                                        className="form-select"
                                        value={filtros.tipoAnalisis}
                                        onChange={(e) => handleFiltroChange('tipoAnalisis', e.target.value)}
                                    >
                                        <option value="general">General</option>
                                        <option value="cliente">Por Cliente</option>
                                        <option value="producto">Por Producto</option>
                                        <option value="veterinario">Por Veterinario</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Cliente</label>
                                    <select
                                        className="form-select"
                                        value={filtros.clienteId}
                                        onChange={(e) => handleFiltroChange('clienteId', e.target.value)}
                                    >
                                        <option value="">Todos los clientes</option>
                                        {/* Aquí irían los clientes */}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Producto</label>
                                    <select
                                        className="form-select"
                                        value={filtros.productoId}
                                        onChange={(e) => handleFiltroChange('productoId', e.target.value)}
                                    >
                                        <option value="">Todos los productos</option>
                                        {/* Aquí irían los productos */}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navegación de vistas */}
            <div className="row mb-4">
                <div className="col-12">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${vistaActiva === 'resumen' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('resumen')}
                            >
                                <i className="bi bi-speedometer2 me-2"></i>
                                Resumen General
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${vistaActiva === 'clientes' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('clientes')}
                            >
                                <i className="bi bi-people me-2"></i>
                                Por Cliente
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${vistaActiva === 'productos' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('productos')}
                            >
                                <i className="bi bi-box me-2"></i>
                                Por Producto
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${vistaActiva === 'tendencias' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('tendencias')}
                            >
                                <i className="bi bi-graph-up me-2"></i>
                                Tendencias
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Vista Resumen General */}
            {vistaActiva === 'resumen' && (
                <>
                    {/* Métricas principales */}
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card stats-card">
                                <div className="card-body text-center">
                                    <div className="stats-icon bg-primary mb-3">
                                        <i className="bi bi-clipboard-check text-white"></i>
                                    </div>
                                    <h3 className="stats-number text-dark">{datosPanel.resumenGeneral.totalPlanesActivos}</h3>
                                    <p className="stats-label text-muted">Planes Activos</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card stats-card">
                                <div className="card-body text-center">
                                    <div className="stats-icon bg-success mb-3">
                                        <i className="bi bi-check-circle text-white"></i>
                                    </div>
                                    <h3 className="stats-number text-dark">{datosPanel.resumenGeneral.aplicacionesCompletadas}</h3>
                                    <p className="stats-label text-muted">Completadas</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card stats-card">
                                <div className="card-body text-center">
                                    <div className="stats-icon bg-warning mb-3">
                                        <i className="bi bi-clock text-white"></i>
                                    </div>
                                    <h3 className="stats-number text-dark">{datosPanel.resumenGeneral.aplicacionesPendientes}</h3>
                                    <p className="stats-label text-muted">Pendientes</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card stats-card">
                                <div className="card-body text-center">
                                    <div className={`stats-icon mb-3 ${getCumplimientoBadge(datosPanel.resumenGeneral.cumplimientoPromedio)}`}>
                                        <i className="bi bi-graph-up text-white"></i>
                                    </div>
                                    <h3 className={`stats-number ${getCumplimientoColor(datosPanel.resumenGeneral.cumplimientoPromedio)}`}>
                                        {datosPanel.resumenGeneral.cumplimientoPromedio}%
                                    </h3>
                                    <p className="stats-label text-muted">Cumplimiento</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alertas de cumplimiento */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card">
                                <div className="card-header bg-warning">
                                    <h5 className="mb-0 text-dark">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        Alertas de Cumplimiento
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {datosPanel.alertasCumplimiento.length === 0 ? (
                                        <p className="text-muted text-center">No hay alertas de cumplimiento</p>
                                    ) : (
                                        <div className="row">
                                            {datosPanel.alertasCumplimiento.map((alerta, index) => (
                                                <div key={index} className="col-md-6 mb-3">
                                                    <div className={`alert alert-${alerta.nivel} d-flex align-items-center`}>
                                                        <i className={`bi ${alerta.icono} me-3`}></i>
                                                        <div className="flex-grow-1">
                                                            <strong className="text-dark">{alerta.titulo}</strong>
                                                            <p className="mb-0 text-dark">{alerta.descripcion}</p>
                                                            <small className="text-muted">{alerta.cliente} - {alerta.producto}</small>
                                                        </div>
                                                        <span className={`badge ${getCumplimientoBadge(alerta.porcentaje)}`}>
                                                            {alerta.porcentaje}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Vista Por Cliente */}
            {vistaActiva === 'clientes' && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header bg-light">
                                <h5 className="mb-0 text-dark">
                                    <i className="bi bi-people me-2"></i>
                                    Cumplimiento por Cliente
                                </h5>
                            </div>
                            <div className="card-body">
                                {datosPanel.cumplimientoPorCliente.length === 0 ? (
                                    <p className="text-muted text-center">No hay datos disponibles</p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th className="text-dark">Cliente</th>
                                                    <th className="text-dark">Planes Activos</th>
                                                    <th className="text-dark">Completadas</th>
                                                    <th className="text-dark">Pendientes</th>
                                                    <th className="text-dark">Vencidas</th>
                                                    <th className="text-dark">Cumplimiento</th>
                                                    <th className="text-dark">Tendencia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {datosPanel.cumplimientoPorCliente.map((cliente, index) => (
                                                    <tr key={index}>
                                                        <td className="text-dark font-weight-bold">{cliente.nombre}</td>
                                                        <td className="text-dark">{cliente.planesActivos}</td>
                                                        <td className="text-dark">
                                                            <span className="badge bg-success">{cliente.completadas}</span>
                                                        </td>
                                                        <td className="text-dark">
                                                            <span className="badge bg-warning">{cliente.pendientes}</span>
                                                        </td>
                                                        <td className="text-dark">
                                                            <span className="badge bg-danger">{cliente.vencidas}</span>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="progress flex-grow-1 me-2" style={{height: '20px'}}>
                                                                    <div 
                                                                        className={`progress-bar ${getCumplimientoBadge(cliente.porcentajeCumplimiento)}`}
                                                                        style={{width: `${cliente.porcentajeCumplimiento}%`}}
                                                                    >
                                                                        {cliente.porcentajeCumplimiento}%
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <i className={`bi ${cliente.tendencia === 'up' ? 'bi-arrow-up text-success' : cliente.tendencia === 'down' ? 'bi-arrow-down text-danger' : 'bi-arrow-right text-warning'}`}></i>
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
                </div>
            )}

            {/* Vista Por Producto */}
            {vistaActiva === 'productos' && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header bg-light">
                                <h5 className="mb-0 text-dark">
                                    <i className="bi bi-box me-2"></i>
                                    Cumplimiento por Producto
                                </h5>
                            </div>
                            <div className="card-body">
                                {datosPanel.cumplimientoPorProducto.length === 0 ? (
                                    <p className="text-muted text-center">No hay datos disponibles</p>
                                ) : (
                                    <div className="row">
                                        {datosPanel.cumplimientoPorProducto.map((producto, index) => (
                                            <div key={index} className="col-md-6 mb-4">
                                                <div className="card h-100">
                                                    <div className="card-body">
                                                        <h6 className="card-title text-dark">{producto.nombre}</h6>
                                                        <div className="row text-center mb-3">
                                                            <div className="col-4">
                                                                <small className="text-muted d-block">Total</small>
                                                                <strong className="text-dark">{producto.totalAplicaciones}</strong>
                                                            </div>
                                                            <div className="col-4">
                                                                <small className="text-muted d-block">Completadas</small>
                                                                <strong className="text-success">{producto.completadas}</strong>
                                                            </div>
                                                            <div className="col-4">
                                                                <small className="text-muted d-block">Pendientes</small>
                                                                <strong className="text-warning">{producto.pendientes}</strong>
                                                            </div>
                                                        </div>
                                                        <div className="progress mb-2">
                                                            <div 
                                                                className={`progress-bar ${getCumplimientoBadge(producto.porcentajeCumplimiento)}`}
                                                                style={{width: `${producto.porcentajeCumplimiento}%`}}
                                                            >
                                                                {producto.porcentajeCumplimiento}%
                                                            </div>
                                                        </div>
                                                        <small className="text-muted">
                                                            Última aplicación: {producto.ultimaAplicacion}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vista Tendencias */}
            {vistaActiva === 'tendencias' && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header bg-light">
                                <h5 className="mb-0 text-dark">
                                    <i className="bi bi-graph-up me-2"></i>
                                    Tendencias de Cumplimiento
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row mb-4">
                                    <div className="col-12 text-center">
                                        <p className="text-muted">
                                            <i className="bi bi-info-circle me-2"></i>
                                            Gráfico de tendencias de cumplimiento en los últimos {filtros.periodo} días
                                        </p>
                                        {/* Aquí iría el gráfico de tendencias */}
                                        <div className="bg-light p-5 rounded">
                                            <i className="bi bi-graph-up display-1 text-muted"></i>
                                            <p className="text-muted mt-3">Gráfico de tendencias se mostraría aquí</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Análisis de tendencias */}
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="card border-success">
                                            <div className="card-body text-center">
                                                <i className="bi bi-arrow-up-circle-fill text-success display-4"></i>
                                                <h6 className="mt-2 text-dark">Mejor Performance</h6>
                                                <p className="text-muted">Cliente XYZ con 95% de cumplimiento</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card border-warning">
                                            <div className="card-body text-center">
                                                <i className="bi bi-exclamation-triangle-fill text-warning display-4"></i>
                                                <h6 className="mt-2 text-dark">Requiere Atención</h6>
                                                <p className="text-muted">3 clientes con cumplimiento &lt; 70%</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card border-info">
                                            <div className="card-body text-center">
                                                <i className="bi bi-graph-up text-info display-4"></i>
                                                <h6 className="mt-2 text-dark">Tendencia General</h6>
                                                <p className="text-muted">Mejora del 5% en el último mes</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CumplimientoPanel;