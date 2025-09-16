import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Facturacion.css';

const NotasCreditoDebito = () => {
    const [notas, setNotas] = useState([]);
    const [facturas, setFacturas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [tipoModal, setTipoModal] = useState(''); // 'credito', 'debito'
    const [notaSeleccionada, setNotaSeleccionada] = useState(null);
    const [filtros, setFiltros] = useState({
        busqueda: '',
        tipo: '',
        estado: '',
        fechaDesde: '',
        fechaHasta: ''
    });
    const [paginacion, setPaginacion] = useState({
        pagina: 1,
        porPagina: 10,
        total: 0
    });
    const [nuevaNota, setNuevaNota] = useState({
        tipo: '', // 'credito', 'debito'
        facturaOriginalId: '',
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        motivo: '',
        observaciones: '',
        items: [],
        subtotal: 0,
        impuestos: {
            iva21: 0,
            iva105: 0,
            percepcionesIIBB: 0,
            otras: 0
        },
        total: 0,
        estado: 'Pendiente'
    });

    useEffect(() => {
        cargarNotas();
        cargarFacturas();
    }, [filtros, paginacion.pagina, paginacion.porPagina]);

    useEffect(() => {
        calcularTotalesNota();
    }, [nuevaNota.items, nuevaNota.impuestos]);

    const cargarNotas = async () => {
        try {
            setLoading(true);
            const params = {
                ...filtros,
                pagina: paginacion.pagina,
                porPagina: paginacion.porPagina
            };
            const response = await planesVacunalesApi.getNotasCreditoDebito(params);
            setNotas(response.notas);
            setPaginacion(prev => ({
                ...prev,
                total: response.total
            }));
        } catch (error) {
            console.error('Error al cargar notas:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarFacturas = async () => {
        try {
            const facturasData = await planesVacunalesApi.getFacturasParaNotas();
            setFacturas(facturasData);
        } catch (error) {
            console.error('Error al cargar facturas:', error);
        }
    };

    const abrirModal = (tipo, nota = null) => {
        setTipoModal(tipo);
        setNotaSeleccionada(nota);
        if (nota) {
            setNuevaNota(nota);
        } else {
            setNuevaNota({
                tipo: tipo,
                facturaOriginalId: '',
                numero: '',
                fecha: new Date().toISOString().split('T')[0],
                motivo: '',
                observaciones: '',
                items: [],
                subtotal: 0,
                impuestos: {
                    iva21: 0,
                    iva105: 0,
                    percepcionesIIBB: 0,
                    otras: 0
                },
                total: 0,
                estado: 'Pendiente'
            });
        }
        setMostrarModal(true);
        generarNumeroNota(tipo);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setTipoModal('');
        setNotaSeleccionada(null);
    };

    const generarNumeroNota = async (tipo) => {
        try {
            const numero = await planesVacunalesApi.generarNumeroNota(tipo);
            setNuevaNota(prev => ({
                ...prev,
                numero
            }));
        } catch (error) {
            console.error('Error al generar número de nota:', error);
        }
    };

    const seleccionarFacturaOriginal = async (facturaId) => {
        try {
            const factura = await planesVacunalesApi.getFacturaById(facturaId);
            setNuevaNota(prev => ({
                ...prev,
                facturaOriginalId: facturaId,
                items: factura.items.map(item => ({
                    ...item,
                    id: Date.now() + Math.random(),
                    cantidadNota: 0,
                    montoNota: 0,
                    aplicar: false
                }))
            }));
        } catch (error) {
            console.error('Error al cargar factura:', error);
        }
    };

    const actualizarItemNota = (index, campo, valor) => {
        setNuevaNota(prev => {
            const nuevosItems = [...prev.items];
            nuevosItems[index] = {
                ...nuevosItems[index],
                [campo]: valor
            };
            
            // Recalcular monto de la nota para el item
            if (campo === 'cantidadNota' || campo === 'aplicar') {
                const item = nuevosItems[index];
                if (item.aplicar) {
                    const proporcion = item.cantidadNota / item.cantidad;
                    nuevosItems[index].montoNota = item.total * proporcion;
                } else {
                    nuevosItems[index].montoNota = 0;
                }
            }
            
            return {
                ...prev,
                items: nuevosItems
            };
        });
    };

    const calcularTotalesNota = () => {
        const subtotal = nuevaNota.items
            .filter(item => item.aplicar)
            .reduce((sum, item) => sum + (item.montoNota || 0), 0);
        
        const totalImpuestos = Object.values(nuevaNota.impuestos).reduce((sum, imp) => sum + (imp || 0), 0);
        const total = subtotal + totalImpuestos;
        
        setNuevaNota(prev => ({
            ...prev,
            subtotal,
            total
        }));
    };

    const guardarNota = async () => {
        try {
            const itemsAplicados = nuevaNota.items.filter(item => item.aplicar && item.cantidadNota > 0);
            
            if (itemsAplicados.length === 0) {
                alert('Debe seleccionar al menos un item para la nota');
                return;
            }
            
            const notaData = {
                ...nuevaNota,
                items: itemsAplicados
            };
            
            if (notaSeleccionada) {
                await planesVacunalesApi.actualizarNotaCreditoDebito(notaSeleccionada.id, notaData);
            } else {
                await planesVacunalesApi.crearNotaCreditoDebito(notaData);
            }
            
            cerrarModal();
            cargarNotas();
        } catch (error) {
            console.error('Error al guardar nota:', error);
            alert('Error al guardar la nota');
        }
    };

    const anularNota = async (notaId) => {
        if (window.confirm('¿Está seguro de anular esta nota?')) {
            try {
                await planesVacunalesApi.anularNotaCreditoDebito(notaId);
                cargarNotas();
            } catch (error) {
                console.error('Error al anular nota:', error);
                alert('Error al anular la nota');
            }
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
            'Aplicada': 'bg-success',
            'Anulada': 'bg-danger'
        };
        return estados[estado] || 'bg-secondary';
    };

    const getTipoBadge = (tipo) => {
        return tipo === 'credito' ? 'bg-success' : 'bg-info';
    };

    return (
        <div className="container-fluid notas-credito-debito">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Notas de Crédito y Débito</h2>
                        <div className="btn-group">
                            <button 
                                className="btn btn-success"
                                onClick={() => abrirModal('credito')}
                            >
                                <i className="bi bi-plus-circle me-2"></i>
                                Nueva Nota de Crédito
                            </button>
                            <button 
                                className="btn btn-info"
                                onClick={() => abrirModal('debito')}
                            >
                                <i className="bi bi-plus-circle me-2"></i>
                                Nueva Nota de Débito
                            </button>
                        </div>
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
                            <label className="form-label text-dark">Búsqueda</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Número, motivo..."
                                value={filtros.busqueda}
                                onChange={(e) => setFiltros(prev => ({...prev, busqueda: e.target.value}))}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Tipo</label>
                            <select
                                className="form-select"
                                value={filtros.tipo}
                                onChange={(e) => setFiltros(prev => ({...prev, tipo: e.target.value}))}
                            >
                                <option value="">Todos</option>
                                <option value="credito">Nota de Crédito</option>
                                <option value="debito">Nota de Débito</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Estado</label>
                            <select
                                className="form-select"
                                value={filtros.estado}
                                onChange={(e) => setFiltros(prev => ({...prev, estado: e.target.value}))}
                            >
                                <option value="">Todos</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="Aplicada">Aplicada</option>
                                <option value="Anulada">Anulada</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Desde</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filtros.fechaDesde}
                                onChange={(e) => setFiltros(prev => ({...prev, fechaDesde: e.target.value}))}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-dark">Hasta</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filtros.fechaHasta}
                                onChange={(e) => setFiltros(prev => ({...prev, fechaHasta: e.target.value}))}
                            />
                        </div>
                        <div className="col-md-1 d-flex align-items-end">
                            <button 
                                className="btn btn-primary"
                                onClick={cargarNotas}
                            >
                                <i className="bi bi-search"></i>
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
                            <p className="text-muted mb-0">Total Notas</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-success">{notas.filter(n => n.tipo === 'credito').length}</h4>
                            <p className="text-muted mb-0">Notas de Crédito</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-info">{notas.filter(n => n.tipo === 'debito').length}</h4>
                            <p className="text-muted mb-0">Notas de Débito</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card stats-card-small">
                        <div className="card-body text-center">
                            <h4 className="text-warning">{notas.filter(n => n.estado === 'Pendiente').length}</h4>
                            <p className="text-muted mb-0">Pendientes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de notas */}
            <div className="card">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-dark">
                        <i className="bi bi-file-earmark-minus me-2"></i>
                        Lista de Notas
                    </h5>
                    <span className="text-muted">
                        Mostrando {((paginacion.pagina - 1) * paginacion.porPagina) + 1} - {Math.min(paginacion.pagina * paginacion.porPagina, paginacion.total)} de {paginacion.total}
                    </span>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" role="status">
                                <span className="sr-only">Cargando...</span>
                            </div>
                        </div>
                    ) : notas.length === 0 ? (
                        <div className="text-center py-4">
                            <i className="bi bi-inbox display-1 text-muted"></i>
                            <p className="text-muted mt-3">No se encontraron notas</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th className="text-dark">Número</th>
                                        <th className="text-dark">Tipo</th>
                                        <th className="text-dark">Fecha</th>
                                        <th className="text-dark">Factura Original</th>
                                        <th className="text-dark">Motivo</th>
                                        <th className="text-dark">Monto</th>
                                        <th className="text-dark">Estado</th>
                                        <th className="text-dark">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notas.map((nota) => (
                                        <tr key={nota.id}>
                                            <td className="text-dark font-weight-bold">{nota.numero}</td>
                                            <td>
                                                <span className={`badge ${getTipoBadge(nota.tipo)}`}>
                                                    {nota.tipo === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'}
                                                </span>
                                            </td>
                                            <td className="text-dark">{nota.fecha}</td>
                                            <td className="text-dark">{nota.facturaOriginal?.numero || 'N/A'}</td>
                                            <td className="text-dark">{nota.motivo}</td>
                                            <td className="text-dark">{formatearMoneda(nota.total)}</td>
                                            <td>
                                                <span className={`badge ${getEstadoBadge(nota.estado)}`}>
                                                    {nota.estado}
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
                                                                onClick={() => abrirModal(nota.tipo, nota)}
                                                            >
                                                                <i className="bi bi-eye me-2"></i>Ver Detalle
                                                            </button>
                                                        </li>
                                                        <li>
                                                            <button className="dropdown-item">
                                                                <i className="bi bi-printer me-2"></i>Imprimir
                                                            </button>
                                                        </li>
                                                        <li>
                                                            <button className="dropdown-item">
                                                                <i className="bi bi-file-earmark-pdf me-2"></i>Descargar PDF
                                                            </button>
                                                        </li>
                                                        <li><hr className="dropdown-divider" /></li>
                                                        <li>
                                                            <button 
                                                                className="dropdown-item text-danger"
                                                                onClick={() => anularNota(nota.id)}
                                                                disabled={nota.estado === 'Anulada'}
                                                            >
                                                                <i className="bi bi-x-circle me-2"></i>Anular
                                                            </button>
                                                        </li>
                                                    </ul>
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

            {/* Modal de crear/editar nota */}
            {mostrarModal && (
                <div className="modal show d-block" tabIndex="-1">
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">
                                    {notaSeleccionada ? 'Ver Detalle' : 'Nueva'} {tipoModal === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'}
                                </h5>
                                <button type="button" className="btn-close" onClick={cerrarModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-md-8">
                                        {/* Información básica */}
                                        <div className="card mb-3">
                                            <div className="card-header">
                                                <h6 className="mb-0 text-dark">Información Básica</h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-4">
                                                        <label className="form-label text-dark">Número</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={nuevaNota.numero}
                                                            readOnly
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label text-dark">Fecha</label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={nuevaNota.fecha}
                                                            onChange={(e) => setNuevaNota(prev => ({...prev, fecha: e.target.value}))}
                                                            disabled={!!notaSeleccionada}
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label text-dark">Factura Original</label>
                                                        <select
                                                            className="form-select"
                                                            value={nuevaNota.facturaOriginalId}
                                                            onChange={(e) => seleccionarFacturaOriginal(e.target.value)}
                                                            disabled={!!notaSeleccionada}
                                                        >
                                                            <option value="">Seleccionar factura...</option>
                                                            {facturas.map(factura => (
                                                                <option key={factura.id} value={factura.id}>
                                                                    {factura.numero} - {factura.cliente} - {formatearMoneda(factura.total)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="row mt-3">
                                                    <div className="col-md-6">
                                                        <label className="form-label text-dark">Motivo</label>
                                                        <select
                                                            className="form-select"
                                                            value={nuevaNota.motivo}
                                                            onChange={(e) => setNuevaNota(prev => ({...prev, motivo: e.target.value}))}
                                                            disabled={!!notaSeleccionada}
                                                        >
                                                            <option value="">Seleccionar motivo...</option>
                                                            {tipoModal === 'credito' ? (
                                                                <>
                                                                    <option value="Devolución de mercadería">Devolución de mercadería</option>
                                                                    <option value="Error en facturación">Error en facturación</option>
                                                                    <option value="Descuento comercial">Descuento comercial</option>
                                                                    <option value="Bonificación">Bonificación</option>
                                                                    <option value="Anulación parcial">Anulación parcial</option>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <option value="Intereses por mora">Intereses por mora</option>
                                                                    <option value="Gastos administrativos">Gastos administrativos</option>
                                                                    <option value="Corrección de precio">Corrección de precio</option>
                                                                    <option value="Servicios adicionales">Servicios adicionales</option>
                                                                    <option value="Ajuste por inflación">Ajuste por inflación</option>
                                                                </>
                                                            )}
                                                            <option value="Otros">Otros</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label text-dark">Observaciones</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows="2"
                                                            value={nuevaNota.observaciones}
                                                            onChange={(e) => setNuevaNota(prev => ({...prev, observaciones: e.target.value}))}
                                                            placeholder="Observaciones adicionales..."
                                                            disabled={!!notaSeleccionada}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        {nuevaNota.facturaOriginalId && (
                                            <div className="card">
                                                <div className="card-header">
                                                    <h6 className="mb-0 text-dark">Items de la Factura</h6>
                                                </div>
                                                <div className="card-body">
                                                    {nuevaNota.items.length === 0 ? (
                                                        <p className="text-muted text-center">Seleccione una factura para ver los items</p>
                                                    ) : (
                                                        <div className="table-responsive">
                                                            <table className="table table-sm">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="text-dark">Aplicar</th>
                                                                        <th className="text-dark">Descripción</th>
                                                                        <th className="text-dark">Cant. Original</th>
                                                                        <th className="text-dark">Precio Unit.</th>
                                                                        <th className="text-dark">Total Original</th>
                                                                        <th className="text-dark">Cant. Nota</th>
                                                                        <th className="text-dark">Monto Nota</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {nuevaNota.items.map((item, index) => (
                                                                        <tr key={item.id}>
                                                                            <td>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="form-check-input"
                                                                                    checked={item.aplicar || false}
                                                                                    onChange={(e) => actualizarItemNota(index, 'aplicar', e.target.checked)}
                                                                                    disabled={!!notaSeleccionada}
                                                                                />
                                                                            </td>
                                                                            <td className="text-dark">{item.descripcion}</td>
                                                                            <td className="text-dark">{item.cantidad}</td>
                                                                            <td className="text-dark">{formatearMoneda(item.precio)}</td>
                                                                            <td className="text-dark">{formatearMoneda(item.total)}</td>
                                                                            <td>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm"
                                                                                    style={{width: '80px'}}
                                                                                    value={item.cantidadNota || 0}
                                                                                    onChange={(e) => actualizarItemNota(index, 'cantidadNota', parseFloat(e.target.value) || 0)}
                                                                                    max={item.cantidad}
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    disabled={!item.aplicar || !!notaSeleccionada}
                                                                                />
                                                                            </td>
                                                                            <td className="text-dark">{formatearMoneda(item.montoNota || 0)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Panel lateral - Totales */}
                                    <div className="col-md-4">
                                        <div className="card">
                                            <div className="card-header bg-warning text-dark">
                                                <h6 className="mb-0">
                                                    <i className="bi bi-calculator me-2"></i>
                                                    Totales
                                                </h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="text-dark">Subtotal:</span>
                                                    <strong className="text-dark">{formatearMoneda(nuevaNota.subtotal)}</strong>
                                                </div>
                                                
                                                {/* Impuestos */}
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Impuestos</label>
                                                    <div className="row">
                                                        <div className="col-6">
                                                            <small className="text-muted">IVA 21%</small>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm"
                                                                value={nuevaNota.impuestos.iva21}
                                                                onChange={(e) => setNuevaNota(prev => ({
                                                                    ...prev,
                                                                    impuestos: {...prev.impuestos, iva21: parseFloat(e.target.value) || 0}
                                                                }))}
                                                                min="0"
                                                                step="0.01"
                                                                disabled={!!notaSeleccionada}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <small className="text-muted">IVA 10.5%</small>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm"
                                                                value={nuevaNota.impuestos.iva105}
                                                                onChange={(e) => setNuevaNota(prev => ({
                                                                    ...prev,
                                                                    impuestos: {...prev.impuestos, iva105: parseFloat(e.target.value) || 0}
                                                                }))}
                                                                min="0"
                                                                step="0.01"
                                                                disabled={!!notaSeleccionada}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <hr />
                                                <div className="d-flex justify-content-between">
                                                    <h5 className="text-dark">TOTAL:</h5>
                                                    <h5 className={`text-${tipoModal === 'credito' ? 'success' : 'info'}`}>
                                                        {tipoModal === 'credito' ? '-' : '+'}{formatearMoneda(nuevaNota.total)}
                                                    </h5>
                                                </div>
                                                
                                                <div className="mt-3 p-3 bg-light rounded">
                                                    <small className="text-muted">
                                                        <strong>Tipo:</strong> {tipoModal === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'}<br />
                                                        <strong>Efecto:</strong> {tipoModal === 'credito' ? 'Reduce el saldo de la factura' : 'Aumenta el saldo de la factura'}
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                                    {notaSeleccionada ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {!notaSeleccionada && (
                                    <button 
                                        type="button" 
                                        className={`btn btn-${tipoModal === 'credito' ? 'success' : 'info'}`}
                                        onClick={guardarNota}
                                    >
                                        Crear {tipoModal === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotasCreditoDebito;