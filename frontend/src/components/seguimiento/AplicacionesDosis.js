import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Seguimiento.css';

const AplicacionesDosis = () => {
    const [aplicaciones, setAplicaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        fechaDesde: '',
        fechaHasta: '',
        cliente: '',
        producto: '',
        estado: '',
        veterinario: ''
    });
    const [modalRegistro, setModalRegistro] = useState(false);
    const [aplicacionSeleccionada, setAplicacionSeleccionada] = useState(null);
    const [nuevaAplicacion, setNuevaAplicacion] = useState({
        clienteId: '',
        productoId: '',
        planVacunalId: '',
        fechaProgramada: '',
        fechaAplicacion: '',
        veterinario: '',
        dosis: '',
        lote: '',
        observaciones: '',
        estado: 'Programada'
    });

    useEffect(() => {
        cargarAplicaciones();
    }, [filtros]);

    const cargarAplicaciones = async () => {
        try {
            setLoading(true);
            const data = await planesVacunalesApi.getAplicaciones(filtros);
            setAplicaciones(data);
        } catch (error) {
            console.error('Error al cargar aplicaciones:', error);
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

    const abrirModalRegistro = (aplicacion = null) => {
        if (aplicacion) {
            setAplicacionSeleccionada(aplicacion);
            setNuevaAplicacion({
                ...aplicacion,
                fechaAplicacion: new Date().toISOString().split('T')[0]
            });
        } else {
            setAplicacionSeleccionada(null);
            setNuevaAplicacion({
                clienteId: '',
                productoId: '',
                planVacunalId: '',
                fechaProgramada: '',
                fechaAplicacion: '',
                veterinario: '',
                dosis: '',
                lote: '',
                observaciones: '',
                estado: 'Programada'
            });
        }
        setModalRegistro(true);
    };

    const cerrarModal = () => {
        setModalRegistro(false);
        setAplicacionSeleccionada(null);
    };

    const guardarAplicacion = async () => {
        try {
            if (aplicacionSeleccionada) {
                await planesVacunalesApi.actualizarAplicacion(aplicacionSeleccionada.id, nuevaAplicacion);
            } else {
                await planesVacunalesApi.crearAplicacion(nuevaAplicacion);
            }
            cerrarModal();
            cargarAplicaciones();
        } catch (error) {
            console.error('Error al guardar aplicación:', error);
        }
    };

    const marcarComoAplicada = async (aplicacion) => {
        try {
            await planesVacunalesApi.marcarAplicacionCompleta(aplicacion.id, {
                fechaAplicacion: new Date().toISOString().split('T')[0],
                estado: 'Aplicada'
            });
            cargarAplicaciones();
        } catch (error) {
            console.error('Error al marcar aplicación:', error);
        }
    };

    const getEstadoBadge = (estado) => {
        const estados = {
            'Programada': 'bg-info',
            'Aplicada': 'bg-success',
            'Vencida': 'bg-danger',
            'Cancelada': 'bg-secondary',
            'Pendiente': 'bg-warning'
        };
        return estados[estado] || 'bg-secondary';
    };

    const getDiasVencimiento = (fechaProgramada) => {
        const hoy = new Date();
        const fecha = new Date(fechaProgramada);
        const diferencia = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
        return diferencia;
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
        <div className="container-fluid aplicaciones-dosis">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Aplicaciones de Dosis</h2>
                        <button 
                            className="btn btn-primary"
                            onClick={() => abrirModalRegistro()}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Nueva Aplicación
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-funnel me-2"></i>
                                Filtros de Búsqueda
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
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
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Estado</label>
                                    <select
                                        className="form-select"
                                        value={filtros.estado}
                                        onChange={(e) => handleFiltroChange('estado', e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="Programada">Programada</option>
                                        <option value="Aplicada">Aplicada</option>
                                        <option value="Vencida">Vencida</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Cancelada">Cancelada</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Cliente</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Buscar cliente..."
                                        value={filtros.cliente}
                                        onChange={(e) => handleFiltroChange('cliente', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Veterinario</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Buscar veterinario..."
                                        value={filtros.veterinario}
                                        onChange={(e) => handleFiltroChange('veterinario', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-12">
                                    <button 
                                        className="btn btn-primary me-2"
                                        onClick={cargarAplicaciones}
                                    >
                                        <i className="bi bi-search me-2"></i>
                                        Buscar
                                    </button>
                                    <button 
                                        className="btn btn-outline-secondary"
                                        onClick={() => setFiltros({
                                            fechaDesde: '',
                                            fechaHasta: '',
                                            cliente: '',
                                            producto: '',
                                            estado: '',
                                            veterinario: ''
                                        })}
                                    >
                                        <i className="bi bi-x-circle me-2"></i>
                                        Limpiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de aplicaciones */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-list-check me-2"></i>
                                Lista de Aplicaciones ({aplicaciones.length})
                            </h5>
                        </div>
                        <div className="card-body">
                            {aplicaciones.length === 0 ? (
                                <p className="text-muted text-center">No se encontraron aplicaciones</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th className="text-dark">Cliente</th>
                                                <th className="text-dark">Producto</th>
                                                <th className="text-dark">Fecha Programada</th>
                                                <th className="text-dark">Fecha Aplicación</th>
                                                <th className="text-dark">Veterinario</th>
                                                <th className="text-dark">Dosis</th>
                                                <th className="text-dark">Estado</th>
                                                <th className="text-dark">Vencimiento</th>
                                                <th className="text-dark">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aplicaciones.map((aplicacion, index) => {
                                                const diasVencimiento = getDiasVencimiento(aplicacion.fechaProgramada);
                                                return (
                                                    <tr key={index}>
                                                        <td className="text-dark">{aplicacion.cliente}</td>
                                                        <td className="text-dark">{aplicacion.producto}</td>
                                                        <td className="text-dark">{aplicacion.fechaProgramada}</td>
                                                        <td className="text-dark">{aplicacion.fechaAplicacion || '-'}</td>
                                                        <td className="text-dark">{aplicacion.veterinario}</td>
                                                        <td className="text-dark">{aplicacion.dosis} ml</td>
                                                        <td>
                                                            <span className={`badge ${getEstadoBadge(aplicacion.estado)}`}>
                                                                {aplicacion.estado}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {aplicacion.estado === 'Programada' && (
                                                                <span className={`badge ${diasVencimiento <= 0 ? 'bg-danger' : diasVencimiento <= 3 ? 'bg-warning' : 'bg-success'}`}>
                                                                    {diasVencimiento <= 0 ? 'Vencida' : `${diasVencimiento} días`}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="btn-group btn-group-sm">
                                                                <button 
                                                                    className="btn btn-outline-primary btn-sm"
                                                                    onClick={() => abrirModalRegistro(aplicacion)}
                                                                    title="Editar"
                                                                >
                                                                    <i className="bi bi-pencil"></i>
                                                                </button>
                                                                {aplicacion.estado === 'Programada' && (
                                                                    <button 
                                                                        className="btn btn-outline-success btn-sm"
                                                                        onClick={() => marcarComoAplicada(aplicacion)}
                                                                        title="Marcar como aplicada"
                                                                    >
                                                                        <i className="bi bi-check-circle"></i>
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    className="btn btn-outline-info btn-sm"
                                                                    title="Ver detalles"
                                                                >
                                                                    <i className="bi bi-eye"></i>
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
            </div>

            {/* Modal de registro/edición */}
            {modalRegistro && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">
                                    {aplicacionSeleccionada ? 'Editar Aplicación' : 'Nueva Aplicación'}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={cerrarModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Cliente</label>
                                        <select
                                            className="form-select"
                                            value={nuevaAplicacion.clienteId}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, clienteId: e.target.value})}
                                        >
                                            <option value="">Seleccionar cliente...</option>
                                            {/* Aquí irían los clientes */}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Producto</label>
                                        <select
                                            className="form-select"
                                            value={nuevaAplicacion.productoId}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, productoId: e.target.value})}
                                        >
                                            <option value="">Seleccionar producto...</option>
                                            {/* Aquí irían los productos */}
                                        </select>
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Fecha Programada</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={nuevaAplicacion.fechaProgramada}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, fechaProgramada: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Fecha de Aplicación</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={nuevaAplicacion.fechaAplicacion}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, fechaAplicacion: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Veterinario</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevaAplicacion.veterinario}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, veterinario: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label text-dark">Dosis (ml)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={nuevaAplicacion.dosis}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, dosis: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label text-dark">Estado</label>
                                        <select
                                            className="form-select"
                                            value={nuevaAplicacion.estado}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, estado: e.target.value})}
                                        >
                                            <option value="Programada">Programada</option>
                                            <option value="Aplicada">Aplicada</option>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Cancelada">Cancelada</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Lote</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevaAplicacion.lote}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, lote: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Observaciones</label>
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            value={nuevaAplicacion.observaciones}
                                            onChange={(e) => setNuevaAplicacion({...nuevaAplicacion, observaciones: e.target.value})}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={guardarAplicacion}
                                >
                                    {aplicacionSeleccionada ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AplicacionesDosis;