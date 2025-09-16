import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Seguimiento.css';

const RetirosCampo = () => {
    const [retiros, setRetiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        fechaDesde: '',
        fechaHasta: '',
        cliente: '',
        producto: '',
        estado: '',
        tipoRetiro: ''
    });
    const [modalRetiro, setModalRetiro] = useState(false);
    const [retiroSeleccionado, setRetiroSeleccionado] = useState(null);
    const [nuevoRetiro, setNuevoRetiro] = useState({
        clienteId: '',
        productoId: '',
        fechaProgramada: '',
        fechaRetiro: '',
        cantidadProgramada: '',
        cantidadRetirada: '',
        responsable: '',
        tipoRetiro: 'Programado',
        observaciones: '',
        estado: 'Programado',
        ubicacion: '',
        temperatura: '',
        condicionesTransporte: ''
    });

    useEffect(() => {
        cargarRetiros();
    }, [filtros]);

    const cargarRetiros = async () => {
        try {
            setLoading(true);
            const data = await planesVacunalesApi.getRetirosCampo(filtros);
            setRetiros(data);
        } catch (error) {
            console.error('Error al cargar retiros:', error);
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

    const abrirModalRetiro = (retiro = null) => {
        if (retiro) {
            setRetiroSeleccionado(retiro);
            setNuevoRetiro({...retiro});
        } else {
            setRetiroSeleccionado(null);
            setNuevoRetiro({
                clienteId: '',
                productoId: '',
                fechaProgramada: '',
                fechaRetiro: '',
                cantidadProgramada: '',
                cantidadRetirada: '',
                responsable: '',
                tipoRetiro: 'Programado',
                observaciones: '',
                estado: 'Programado',
                ubicacion: '',
                temperatura: '',
                condicionesTransporte: ''
            });
        }
        setModalRetiro(true);
    };

    const cerrarModal = () => {
        setModalRetiro(false);
        setRetiroSeleccionado(null);
    };

    const guardarRetiro = async () => {
        try {
            if (retiroSeleccionado) {
                await planesVacunalesApi.actualizarRetiroCampo(retiroSeleccionado.id, nuevoRetiro);
            } else {
                await planesVacunalesApi.crearRetiroCampo(nuevoRetiro);
            }
            cerrarModal();
            cargarRetiros();
        } catch (error) {
            console.error('Error al guardar retiro:', error);
        }
    };

    const marcarComoRetirado = async (retiro) => {
        try {
            await planesVacunalesApi.marcarRetiroCompleto(retiro.id, {
                fechaRetiro: new Date().toISOString().split('T')[0],
                estado: 'Retirado'
            });
            cargarRetiros();
        } catch (error) {
            console.error('Error al marcar retiro:', error);
        }
    };

    const getEstadoBadge = (estado) => {
        const estados = {
            'Programado': 'bg-info',
            'Retirado': 'bg-success',
            'Vencido': 'bg-danger',
            'Cancelado': 'bg-secondary',
            'En Transito': 'bg-warning',
            'Pendiente': 'bg-warning'
        };
        return estados[estado] || 'bg-secondary';
    };

    const getTipoRetiroBadge = (tipo) => {
        const tipos = {
            'Programado': 'bg-primary',
            'Urgente': 'bg-danger',
            'Preventivo': 'bg-success',
            'Correctivo': 'bg-warning'
        };
        return tipos[tipo] || 'bg-secondary';
    };

    const calcularDiasVencimiento = (fechaProgramada) => {
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
        <div className="container-fluid retiros-campo">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Retiros de Campo</h2>
                        <button 
                            className="btn btn-primary"
                            onClick={() => abrirModalRetiro()}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Nuevo Retiro
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-info mb-3">
                                <i className="bi bi-calendar-event text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{retiros.filter(r => r.estado === 'Programado').length}</h3>
                            <p className="stats-label text-muted">Programados</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-warning mb-3">
                                <i className="bi bi-truck text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{retiros.filter(r => r.estado === 'En Transito').length}</h3>
                            <p className="stats-label text-muted">En Tránsito</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-success mb-3">
                                <i className="bi bi-check-circle text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{retiros.filter(r => r.estado === 'Retirado').length}</h3>
                            <p className="stats-label text-muted">Completados</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card">
                        <div className="card-body text-center">
                            <div className="stats-icon bg-danger mb-3">
                                <i className="bi bi-exclamation-triangle text-white"></i>
                            </div>
                            <h3 className="stats-number text-dark">{retiros.filter(r => r.tipoRetiro === 'Urgente').length}</h3>
                            <p className="stats-label text-muted">Urgentes</p>
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
                                        <option value="Programado">Programado</option>
                                        <option value="En Transito">En Tránsito</option>
                                        <option value="Retirado">Retirado</option>
                                        <option value="Vencido">Vencido</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Tipo</label>
                                    <select
                                        className="form-select"
                                        value={filtros.tipoRetiro}
                                        onChange={(e) => handleFiltroChange('tipoRetiro', e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="Programado">Programado</option>
                                        <option value="Urgente">Urgente</option>
                                        <option value="Preventivo">Preventivo</option>
                                        <option value="Correctivo">Correctivo</option>
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
                            </div>
                            <div className="row mt-3">
                                <div className="col-12">
                                    <button 
                                        className="btn btn-primary me-2"
                                        onClick={cargarRetiros}
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
                                            tipoRetiro: ''
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

            {/* Lista de retiros */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-truck me-2"></i>
                                Lista de Retiros ({retiros.length})
                            </h5>
                        </div>
                        <div className="card-body">
                            {retiros.length === 0 ? (
                                <p className="text-muted text-center">No se encontraron retiros</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th className="text-dark">Cliente</th>
                                                <th className="text-dark">Producto</th>
                                                <th className="text-dark">Fecha Programada</th>
                                                <th className="text-dark">Fecha Retiro</th>
                                                <th className="text-dark">Cantidad</th>
                                                <th className="text-dark">Responsable</th>
                                                <th className="text-dark">Tipo</th>
                                                <th className="text-dark">Estado</th>
                                                <th className="text-dark">Tiempo</th>
                                                <th className="text-dark">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {retiros.map((retiro, index) => {
                                                const diasVencimiento = calcularDiasVencimiento(retiro.fechaProgramada);
                                                return (
                                                    <tr key={index}>
                                                        <td className="text-dark">{retiro.cliente}</td>
                                                        <td className="text-dark">{retiro.producto}</td>
                                                        <td className="text-dark">{retiro.fechaProgramada}</td>
                                                        <td className="text-dark">{retiro.fechaRetiro || '-'}</td>
                                                        <td className="text-dark">
                                                            {retiro.cantidadRetirada || retiro.cantidadProgramada} unidades
                                                        </td>
                                                        <td className="text-dark">{retiro.responsable}</td>
                                                        <td>
                                                            <span className={`badge ${getTipoRetiroBadge(retiro.tipoRetiro)}`}>
                                                                {retiro.tipoRetiro}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getEstadoBadge(retiro.estado)}`}>
                                                                {retiro.estado}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {retiro.estado === 'Programado' && (
                                                                <span className={`badge ${diasVencimiento <= 0 ? 'bg-danger' : diasVencimiento <= 2 ? 'bg-warning' : 'bg-success'}`}>
                                                                    {diasVencimiento <= 0 ? 'Vencido' : `${diasVencimiento} días`}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="btn-group btn-group-sm">
                                                                <button 
                                                                    className="btn btn-outline-primary btn-sm"
                                                                    onClick={() => abrirModalRetiro(retiro)}
                                                                    title="Editar"
                                                                >
                                                                    <i className="bi bi-pencil"></i>
                                                                </button>
                                                                {retiro.estado === 'Programado' && (
                                                                    <button 
                                                                        className="btn btn-outline-success btn-sm"
                                                                        onClick={() => marcarComoRetirado(retiro)}
                                                                        title="Marcar como retirado"
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
            {modalRetiro && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">
                                    {retiroSeleccionado ? 'Editar Retiro' : 'Nuevo Retiro'}
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
                                            value={nuevoRetiro.clienteId}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, clienteId: e.target.value})}
                                        >
                                            <option value="">Seleccionar cliente...</option>
                                            {/* Aquí irían los clientes */}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Producto</label>
                                        <select
                                            className="form-select"
                                            value={nuevoRetiro.productoId}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, productoId: e.target.value})}
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
                                            value={nuevoRetiro.fechaProgramada}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, fechaProgramada: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Fecha de Retiro</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={nuevoRetiro.fechaRetiro}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, fechaRetiro: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-4">
                                        <label className="form-label text-dark">Cantidad Programada</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={nuevoRetiro.cantidadProgramada}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, cantidadProgramada: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label text-dark">Cantidad Retirada</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={nuevoRetiro.cantidadRetirada}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, cantidadRetirada: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label text-dark">Temperatura (°C)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="form-control"
                                            value={nuevoRetiro.temperatura}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, temperatura: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-4">
                                        <label className="form-label text-dark">Tipo de Retiro</label>
                                        <select
                                            className="form-select"
                                            value={nuevoRetiro.tipoRetiro}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, tipoRetiro: e.target.value})}
                                        >
                                            <option value="Programado">Programado</option>
                                            <option value="Urgente">Urgente</option>
                                            <option value="Preventivo">Preventivo</option>
                                            <option value="Correctivo">Correctivo</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label text-dark">Estado</label>
                                        <select
                                            className="form-select"
                                            value={nuevoRetiro.estado}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, estado: e.target.value})}
                                        >
                                            <option value="Programado">Programado</option>
                                            <option value="En Transito">En Tránsito</option>
                                            <option value="Retirado">Retirado</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label text-dark">Responsable</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoRetiro.responsable}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, responsable: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Ubicación</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoRetiro.ubicacion}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, ubicacion: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-dark">Condiciones de Transporte</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoRetiro.condicionesTransporte}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, condicionesTransporte: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-12">
                                        <label className="form-label text-dark">Observaciones</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={nuevoRetiro.observaciones}
                                            onChange={(e) => setNuevoRetiro({...nuevoRetiro, observaciones: e.target.value})}
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
                                    onClick={guardarRetiro}
                                >
                                    {retiroSeleccionado ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RetirosCampo;