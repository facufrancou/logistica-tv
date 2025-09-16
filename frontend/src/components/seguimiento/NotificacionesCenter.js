import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Seguimiento.css';

const NotificacionesCenter = () => {
    const [notificaciones, setNotificaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        tipo: '',
        estado: '',
        prioridad: '',
        fechaDesde: '',
        fechaHasta: ''
    });
    const [configuracion, setConfiguracion] = useState({
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        horasAnticipacion: 24,
        diasRecordatorio: 3,
        aplicacionesVencidas: true,
        stockBajo: true,
        planesProximosVencer: true
    });
    const [vistaActiva, setVistaActiva] = useState('notificaciones');
    const [modalConfiguracion, setModalConfiguracion] = useState(false);

    useEffect(() => {
        cargarNotificaciones();
    }, [filtros]);

    const cargarNotificaciones = async () => {
        try {
            setLoading(true);
            const data = await planesVacunalesApi.getNotificaciones(filtros);
            setNotificaciones(data);
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const marcarComoLeida = async (notificacionId) => {
        try {
            await planesVacunalesApi.marcarNotificacionLeida(notificacionId);
            setNotificaciones(prev => 
                prev.map(notif => 
                    notif.id === notificacionId 
                        ? {...notif, leida: true} 
                        : notif
                )
            );
        } catch (error) {
            console.error('Error al marcar notificación:', error);
        }
    };

    const marcarTodasComoLeidas = async () => {
        try {
            await planesVacunalesApi.marcarTodasNotificacionesLeidas();
            setNotificaciones(prev => 
                prev.map(notif => ({...notif, leida: true}))
            );
        } catch (error) {
            console.error('Error al marcar todas las notificaciones:', error);
        }
    };

    const eliminarNotificacion = async (notificacionId) => {
        try {
            await planesVacunalesApi.eliminarNotificacion(notificacionId);
            setNotificaciones(prev => 
                prev.filter(notif => notif.id !== notificacionId)
            );
        } catch (error) {
            console.error('Error al eliminar notificación:', error);
        }
    };

    const guardarConfiguracion = async () => {
        try {
            await planesVacunalesApi.actualizarConfiguracionNotificaciones(configuracion);
            setModalConfiguracion(false);
        } catch (error) {
            console.error('Error al guardar configuración:', error);
        }
    };

    const getPrioridadBadge = (prioridad) => {
        const prioridades = {
            'Alta': 'bg-danger',
            'Media': 'bg-warning',
            'Baja': 'bg-success'
        };
        return prioridades[prioridad] || 'bg-secondary';
    };

    const getTipoIcon = (tipo) => {
        const iconos = {
            'aplicacion_vencida': 'bi-exclamation-triangle-fill text-danger',
            'stock_bajo': 'bi-box text-warning',
            'plan_proximo_vencer': 'bi-calendar-x text-warning',
            'recordatorio': 'bi-bell text-info',
            'sistema': 'bi-gear text-secondary',
            'cliente': 'bi-person text-primary'
        };
        return iconos[tipo] || 'bi-info-circle text-info';
    };

    const handleFiltroChange = (campo, valor) => {
        setFiltros(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    const handleConfiguracionChange = (campo, valor) => {
        setConfiguracion(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

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
        <div className="container-fluid notificaciones-center">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">
                            Centro de Notificaciones
                            {notificacionesNoLeidas > 0 && (
                                <span className="badge bg-danger ms-2">{notificacionesNoLeidas}</span>
                            )}
                        </h2>
                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-outline-primary"
                                onClick={() => setModalConfiguracion(true)}
                            >
                                <i className="bi bi-gear me-2"></i>
                                Configuración
                            </button>
                            <button 
                                className="btn btn-outline-success"
                                onClick={marcarTodasComoLeidas}
                                disabled={notificacionesNoLeidas === 0}
                            >
                                <i className="bi bi-check-all me-2"></i>
                                Marcar todas como leídas
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={cargarNotificaciones}
                            >
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Actualizar
                            </button>
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
                                className={`nav-link ${vistaActiva === 'notificaciones' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('notificaciones')}
                            >
                                <i className="bi bi-bell me-2"></i>
                                Notificaciones
                                {notificacionesNoLeidas > 0 && (
                                    <span className="badge bg-danger ms-2">{notificacionesNoLeidas}</span>
                                )}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${vistaActiva === 'alertas' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('alertas')}
                            >
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                Alertas Críticas
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${vistaActiva === 'recordatorios' ? 'active' : ''}`}
                                onClick={() => setVistaActiva('recordatorios')}
                            >
                                <i className="bi bi-calendar-check me-2"></i>
                                Recordatorios
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Filtros */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-funnel me-2"></i>
                                Filtros
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Tipo</label>
                                    <select
                                        className="form-select"
                                        value={filtros.tipo}
                                        onChange={(e) => handleFiltroChange('tipo', e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="aplicacion_vencida">Aplicación Vencida</option>
                                        <option value="stock_bajo">Stock Bajo</option>
                                        <option value="plan_proximo_vencer">Plan Próximo a Vencer</option>
                                        <option value="recordatorio">Recordatorio</option>
                                        <option value="sistema">Sistema</option>
                                        <option value="cliente">Cliente</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Estado</label>
                                    <select
                                        className="form-select"
                                        value={filtros.estado}
                                        onChange={(e) => handleFiltroChange('estado', e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="no_leida">No leídas</option>
                                        <option value="leida">Leídas</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Prioridad</label>
                                    <select
                                        className="form-select"
                                        value={filtros.prioridad}
                                        onChange={(e) => handleFiltroChange('prioridad', e.target.value)}
                                    >
                                        <option value="">Todas</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Media">Media</option>
                                        <option value="Baja">Baja</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Fecha Desde</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filtros.fechaDesde}
                                        onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Fecha Hasta</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filtros.fechaHasta}
                                        onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-list me-2"></i>
                                Notificaciones ({notificaciones.length})
                            </h5>
                        </div>
                        <div className="card-body">
                            {notificaciones.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-bell-slash display-1 text-muted"></i>
                                    <p className="text-muted mt-3">No hay notificaciones</p>
                                </div>
                            ) : (
                                <div className="notificaciones-list">
                                    {notificaciones.map((notificacion, index) => (
                                        <div 
                                            key={index} 
                                            className={`notification-item p-3 border rounded mb-3 ${!notificacion.leida ? 'border-primary bg-light' : 'border-light'}`}
                                        >
                                            <div className="d-flex align-items-start">
                                                <div className="notification-icon me-3">
                                                    <i className={`bi ${getTipoIcon(notificacion.tipo)} fs-4`}></i>
                                                </div>
                                                <div className="notification-content flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <h6 className={`mb-1 ${!notificacion.leida ? 'fw-bold text-dark' : 'text-dark'}`}>
                                                            {notificacion.titulo}
                                                        </h6>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className={`badge ${getPrioridadBadge(notificacion.prioridad)}`}>
                                                                {notificacion.prioridad}
                                                            </span>
                                                            <small className="text-muted">{notificacion.fecha}</small>
                                                        </div>
                                                    </div>
                                                    <p className="text-dark mb-2">{notificacion.mensaje}</p>
                                                    {notificacion.detalles && (
                                                        <div className="notification-details">
                                                            <small className="text-muted">
                                                                <strong>Cliente:</strong> {notificacion.detalles.cliente} | 
                                                                <strong> Producto:</strong> {notificacion.detalles.producto}
                                                                {notificacion.detalles.fechaVencimiento && (
                                                                    <span> | <strong>Vence:</strong> {notificacion.detalles.fechaVencimiento}</span>
                                                                )}
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="notification-actions ms-3">
                                                    <div className="btn-group btn-group-sm">
                                                        {!notificacion.leida && (
                                                            <button 
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => marcarComoLeida(notificacion.id)}
                                                                title="Marcar como leída"
                                                            >
                                                                <i className="bi bi-check"></i>
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => eliminarNotificacion(notificacion.id)}
                                                            title="Eliminar"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
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

            {/* Modal de configuración */}
            {modalConfiguracion && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">Configuración de Notificaciones</h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setModalConfiguracion(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <h6 className="text-dark mb-3">Canales de Notificación</h6>
                                <div className="row mb-4">
                                    <div className="col-md-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.emailEnabled}
                                                onChange={(e) => handleConfiguracionChange('emailEnabled', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                <i className="bi bi-envelope me-2"></i>
                                                Email
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.smsEnabled}
                                                onChange={(e) => handleConfiguracionChange('smsEnabled', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                <i className="bi bi-phone me-2"></i>
                                                SMS
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.pushEnabled}
                                                onChange={(e) => handleConfiguracionChange('pushEnabled', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                <i className="bi bi-bell me-2"></i>
                                                Push
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <h6 className="text-dark mb-3">Configuración de Tiempo</h6>
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Horas de Anticipación</label>
                                        <select
                                            className="form-select"
                                            value={configuracion.horasAnticipacion}
                                            onChange={(e) => handleConfiguracionChange('horasAnticipacion', parseInt(e.target.value))}
                                        >
                                            <option value={12}>12 horas</option>
                                            <option value={24}>24 horas</option>
                                            <option value={48}>48 horas</option>
                                            <option value={72}>72 horas</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Días de Recordatorio</label>
                                        <select
                                            className="form-select"
                                            value={configuracion.diasRecordatorio}
                                            onChange={(e) => handleConfiguracionChange('diasRecordatorio', parseInt(e.target.value))}
                                        >
                                            <option value={1}>1 día</option>
                                            <option value={3}>3 días</option>
                                            <option value={7}>7 días</option>
                                            <option value={14}>14 días</option>
                                        </select>
                                    </div>
                                </div>

                                <h6 className="text-dark mb-3">Tipos de Alertas</h6>
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.aplicacionesVencidas}
                                                onChange={(e) => handleConfiguracionChange('aplicacionesVencidas', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                Aplicaciones Vencidas
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.stockBajo}
                                                onChange={(e) => handleConfiguracionChange('stockBajo', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                Stock Bajo
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.planesProximosVencer}
                                                onChange={(e) => handleConfiguracionChange('planesProximosVencer', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                Planes Próximos a Vencer
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setModalConfiguracion(false)}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={guardarConfiguracion}
                                >
                                    Guardar Configuración
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificacionesCenter;