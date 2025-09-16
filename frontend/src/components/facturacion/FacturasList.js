import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Facturacion.css';

const FacturasList = () => {
    const [facturas, setFacturas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        busqueda: '',
        cliente: '',
        estado: '',
        fechaDesde: '',
        fechaHasta: '',
        montoMin: '',
        montoMax: '',
        ordenarPor: 'fecha',
        orden: 'desc'
    });
    const [paginacion, setPaginacion] = useState({
        pagina: 1,
        porPagina: 10,
        total: 0
    });
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [accionModal, setAccionModal] = useState(''); // 'ver', 'editar', 'eliminar', 'pago'

    useEffect(() => {
        cargarFacturas();
    }, [filtros, paginacion.pagina, paginacion.porPagina]);

    const cargarFacturas = async () => {
        try {
            setLoading(true);
            const params = {
                ...filtros,
                pagina: paginacion.pagina,
                porPagina: paginacion.porPagina
            };
            const response = await planesVacunalesApi.getFacturas(params);
            setFacturas(response.facturas);
            setPaginacion(prev => ({
                ...prev,
                total: response.total
            }));
        } catch (error) {
            console.error('Error al cargar facturas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFiltroChange = (campo, valor) => {
        setFiltros(prev => ({
            ...prev,
            [campo]: valor
        }));
        setPaginacion(prev => ({
            ...prev,
            pagina: 1
        }));
    };

    const limpiarFiltros = () => {
        setFiltros({
            busqueda: '',
            cliente: '',
            estado: '',
            fechaDesde: '',
            fechaHasta: '',
            montoMin: '',
            montoMax: '',
            ordenarPor: 'fecha',
            orden: 'desc'
        });
    };

    const abrirModal = (accion, factura = null) => {
        setAccionModal(accion);
        setFacturaSeleccionada(factura);
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setFacturaSeleccionada(null);
        setAccionModal('');
    };

    const eliminarFactura = async (facturaId) => {
        if (window.confirm('¿Está seguro de eliminar esta factura?')) {
            try {
                await planesVacunalesApi.eliminarFactura(facturaId);
                cargarFacturas();
                cerrarModal();
            } catch (error) {
                console.error('Error al eliminar factura:', error);
                alert('Error al eliminar la factura');
            }
        }
    };

    const cambiarEstadoFactura = async (facturaId, nuevoEstado) => {
        try {
            await planesVacunalesApi.actualizarEstadoFactura(facturaId, nuevoEstado);
            cargarFacturas();
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            alert('Error al cambiar el estado de la factura');
        }
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

    const calcularTotalPaginas = () => {
        return Math.ceil(paginacion.total / paginacion.porPagina);
    };

    const irAPagina = (pagina) => {
        setPaginacion(prev => ({
            ...prev,
            pagina
        }));
    };

    return (
        <div className="container-fluid facturas-list">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Gestión de Facturas</h2>
                        <button 
                            className="btn btn-primary"
                            onClick={() => abrirModal('crear')}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Nueva Factura
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="card mb-4">
                <div className="card-header bg-light">
                    <h5 className="mb-0 text-dark">
                        <i className="bi bi-funnel me-2"></i>
                        Filtros de Búsqueda
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-3">
                            <label className="form-label text-dark">Búsqueda General</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Número, cliente, concepto..."
                                value={filtros.busqueda}
                                onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-dark">Cliente</label>
                            <select
                                className="form-select"
                                value={filtros.cliente}
                                onChange={(e) => handleFiltroChange('cliente', e.target.value)}
                            >
                                <option value="">Todos los clientes</option>
                                <option value="cliente1">Cliente Ejemplo 1</option>
                                <option value="cliente2">Cliente Ejemplo 2</option>
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
                                <option value="Pendiente">Pendiente</option>
                                <option value="Pagada">Pagada</option>
                                <option value="Vencida">Vencida</option>
                                <option value="Cancelada">Cancelada</option>
                                <option value="Parcial">Parcial</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Fecha Desde</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filtros.fechaDesde}
                                onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Fecha Hasta</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filtros.fechaHasta}
                                onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col-md-2">
                            <label className="form-label text-dark">Monto Mínimo</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="0.00"
                                value={filtros.montoMin}
                                onChange={(e) => handleFiltroChange('montoMin', e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Monto Máximo</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="0.00"
                                value={filtros.montoMax}
                                onChange={(e) => handleFiltroChange('montoMax', e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Ordenar por</label>
                            <select
                                className="form-select"
                                value={filtros.ordenarPor}
                                onChange={(e) => handleFiltroChange('ordenarPor', e.target.value)}
                            >
                                <option value="fecha">Fecha</option>
                                <option value="numero">Número</option>
                                <option value="cliente">Cliente</option>
                                <option value="monto">Monto</option>
                                <option value="estado">Estado</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Orden</label>
                            <select
                                className="form-select"
                                value={filtros.orden}
                                onChange={(e) => handleFiltroChange('orden', e.target.value)}
                            >
                                <option value="desc">Descendente</option>
                                <option value="asc">Ascendente</option>
                            </select>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                            <button 
                                className="btn btn-outline-secondary me-2"
                                onClick={limpiarFiltros}
                            >
                                <i className="bi bi-x-circle me-2"></i>
                                Limpiar
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={cargarFacturas}
                            >
                                <i className="bi bi-search me-2"></i>
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-dark">{paginacion.total}</h4>
                            <p className="text-muted mb-0">Total Facturas</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-warning">{facturas.filter(f => f.estado === 'Pendiente').length}</h4>
                            <p className="text-muted mb-0">Pendientes</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-danger">{facturas.filter(f => f.estado === 'Vencida').length}</h4>
                            <p className="text-muted mb-0">Vencidas</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-success">{facturas.filter(f => f.estado === 'Pagada').length}</h4>
                            <p className="text-muted mb-0">Pagadas</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de facturas */}
            <div className="card">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-dark">
                        <i className="bi bi-file-earmark-text me-2"></i>
                        Lista de Facturas
                    </h5>
                    <div className="d-flex align-items-center">
                        <span className="text-muted me-3">
                            Mostrando {((paginacion.pagina - 1) * paginacion.porPagina) + 1} - {Math.min(paginacion.pagina * paginacion.porPagina, paginacion.total)} de {paginacion.total}
                        </span>
                        <select
                            className="form-select form-select-sm"
                            style={{width: 'auto'}}
                            value={paginacion.porPagina}
                            onChange={(e) => setPaginacion(prev => ({...prev, porPagina: parseInt(e.target.value), pagina: 1}))}
                        >
                            <option value={10}>10 por página</option>
                            <option value={25}>25 por página</option>
                            <option value={50}>50 por página</option>
                        </select>
                    </div>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" role="status">
                                <span className="sr-only">Cargando...</span>
                            </div>
                        </div>
                    ) : facturas.length === 0 ? (
                        <div className="text-center py-4">
                            <i className="bi bi-inbox display-1 text-muted"></i>
                            <p className="text-muted mt-3">No se encontraron facturas con los filtros aplicados</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th className="text-dark">
                                                <input type="checkbox" className="form-check-input" />
                                            </th>
                                            <th className="text-dark">Número</th>
                                            <th className="text-dark">Fecha</th>
                                            <th className="text-dark">Cliente</th>
                                            <th className="text-dark">Concepto</th>
                                            <th className="text-dark">Vencimiento</th>
                                            <th className="text-dark">Monto</th>
                                            <th className="text-dark">Estado</th>
                                            <th className="text-dark">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facturas.map((factura) => {
                                            const diasVencimiento = Math.ceil((new Date(factura.fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <tr key={factura.id}>
                                                    <td>
                                                        <input type="checkbox" className="form-check-input" />
                                                    </td>
                                                    <td className="text-dark font-weight-bold">{factura.numero}</td>
                                                    <td className="text-dark">{factura.fecha}</td>
                                                    <td className="text-dark">{factura.cliente}</td>
                                                    <td className="text-dark">{factura.concepto}</td>
                                                    <td className="text-dark">
                                                        {factura.fechaVencimiento}
                                                        {factura.estado !== 'Pagada' && factura.estado !== 'Cancelada' && (
                                                            <small className={`d-block ${diasVencimiento < 0 ? 'text-danger' : diasVencimiento <= 5 ? 'text-warning' : 'text-success'}`}>
                                                                {diasVencimiento < 0 ? `${Math.abs(diasVencimiento)} días vencida` : `${diasVencimiento} días restantes`}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td className="text-dark">{formatearMoneda(factura.monto)}</td>
                                                    <td>
                                                        <span className={`badge ${getEstadoBadge(factura.estado)}`}>
                                                            {factura.estado}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="dropdown">
                                                            <button 
                                                                className="btn btn-outline-primary btn-sm dropdown-toggle"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                            >
                                                                <i className="bi bi-three-dots"></i>
                                                            </button>
                                                            <ul className="dropdown-menu">
                                                                <li>
                                                                    <button 
                                                                        className="dropdown-item"
                                                                        onClick={() => abrirModal('ver', factura)}
                                                                    >
                                                                        <i className="bi bi-eye me-2"></i>Ver Detalle
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button 
                                                                        className="dropdown-item"
                                                                        onClick={() => abrirModal('editar', factura)}
                                                                    >
                                                                        <i className="bi bi-pencil me-2"></i>Editar
                                                                    </button>
                                                                </li>
                                                                <li><hr className="dropdown-divider" /></li>
                                                                <li>
                                                                    <button 
                                                                        className="dropdown-item"
                                                                        onClick={() => abrirModal('pago', factura)}
                                                                    >
                                                                        <i className="bi bi-credit-card me-2"></i>Registrar Pago
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item">
                                                                        <i className="bi bi-printer me-2"></i>Imprimir
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item">
                                                                        <i className="bi bi-envelope me-2"></i>Enviar por Email
                                                                    </button>
                                                                </li>
                                                                <li><hr className="dropdown-divider" /></li>
                                                                {factura.estado === 'Pendiente' && (
                                                                    <li>
                                                                        <button 
                                                                            className="dropdown-item"
                                                                            onClick={() => cambiarEstadoFactura(factura.id, 'Pagada')}
                                                                        >
                                                                            <i className="bi bi-check-circle me-2"></i>Marcar como Pagada
                                                                        </button>
                                                                    </li>
                                                                )}
                                                                <li>
                                                                    <button 
                                                                        className="dropdown-item text-danger"
                                                                        onClick={() => abrirModal('eliminar', factura)}
                                                                    >
                                                                        <i className="bi bi-trash me-2"></i>Eliminar
                                                                    </button>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {calcularTotalPaginas() > 1 && (
                                <nav className="mt-4">
                                    <ul className="pagination justify-content-center">
                                        <li className={`page-item ${paginacion.pagina === 1 ? 'disabled' : ''}`}>
                                            <button 
                                                className="page-link"
                                                onClick={() => irAPagina(paginacion.pagina - 1)}
                                                disabled={paginacion.pagina === 1}
                                            >
                                                <i className="bi bi-chevron-left"></i>
                                            </button>
                                        </li>
                                        {[...Array(calcularTotalPaginas())].map((_, index) => {
                                            const numeroPagina = index + 1;
                                            if (
                                                numeroPagina === 1 ||
                                                numeroPagina === calcularTotalPaginas() ||
                                                (numeroPagina >= paginacion.pagina - 2 && numeroPagina <= paginacion.pagina + 2)
                                            ) {
                                                return (
                                                    <li key={numeroPagina} className={`page-item ${paginacion.pagina === numeroPagina ? 'active' : ''}`}>
                                                        <button 
                                                            className="page-link"
                                                            onClick={() => irAPagina(numeroPagina)}
                                                        >
                                                            {numeroPagina}
                                                        </button>
                                                    </li>
                                                );
                                            } else if (
                                                numeroPagina === paginacion.pagina - 3 ||
                                                numeroPagina === paginacion.pagina + 3
                                            ) {
                                                return <li key={numeroPagina} className="page-item disabled"><span className="page-link">...</span></li>;
                                            }
                                            return null;
                                        })}
                                        <li className={`page-item ${paginacion.pagina === calcularTotalPaginas() ? 'disabled' : ''}`}>
                                            <button 
                                                className="page-link"
                                                onClick={() => irAPagina(paginacion.pagina + 1)}
                                                disabled={paginacion.pagina === calcularTotalPaginas()}
                                            >
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            {mostrarModal && accionModal === 'eliminar' && (
                <div className="modal show d-block" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">Confirmar Eliminación</h5>
                                <button type="button" className="btn-close" onClick={cerrarModal}></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-dark">¿Está seguro de que desea eliminar la factura <strong>{facturaSeleccionada?.numero}</strong>?</p>
                                <p className="text-muted">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-danger"
                                    onClick={() => eliminarFactura(facturaSeleccionada.id)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacturasList;