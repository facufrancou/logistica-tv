import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Facturacion.css';

const FacturaDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [factura, setFactura] = useState(null);
    const [historialPagos, setHistorialPagos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarModalPago, setMostrarModalPago] = useState(false);
    const [mostrarModalEmail, setMostrarModalEmail] = useState(false);
    const [pagoData, setPagoData] = useState({
        monto: 0,
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: '',
        referencia: '',
        observaciones: ''
    });
    const [emailData, setEmailData] = useState({
        destinatario: '',
        asunto: '',
        mensaje: '',
        adjuntarPDF: true
    });

    useEffect(() => {
        cargarFactura();
        cargarHistorialPagos();
    }, [id]);

    const cargarFactura = async () => {
        try {
            setLoading(true);
            const facturaData = await planesVacunalesApi.getFacturaById(id);
            setFactura(facturaData);
            
            // Pre-llenar datos de email
            setEmailData(prev => ({
                ...prev,
                destinatario: facturaData.cliente.email || '',
                asunto: `Factura ${facturaData.numero} - ${facturaData.cliente.nombre}`
            }));
        } catch (error) {
            console.error('Error al cargar factura:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarHistorialPagos = async () => {
        try {
            const pagos = await planesVacunalesApi.getHistorialPagosFactura(id);
            setHistorialPagos(pagos);
        } catch (error) {
            console.error('Error al cargar historial de pagos:', error);
        }
    };

    const registrarPago = async () => {
        try {
            await planesVacunalesApi.registrarPagoFactura(id, pagoData);
            setMostrarModalPago(false);
            setPagoData({
                monto: 0,
                fecha: new Date().toISOString().split('T')[0],
                metodoPago: '',
                referencia: '',
                observaciones: ''
            });
            cargarFactura();
            cargarHistorialPagos();
        } catch (error) {
            console.error('Error al registrar pago:', error);
            alert('Error al registrar el pago');
        }
    };

    const enviarPorEmail = async () => {
        try {
            await planesVacunalesApi.enviarFacturaPorEmail(id, emailData);
            setMostrarModalEmail(false);
            alert('Factura enviada por email correctamente');
        } catch (error) {
            console.error('Error al enviar email:', error);
            alert('Error al enviar la factura por email');
        }
    };

    const imprimirFactura = () => {
        window.print();
    };

    const descargarPDF = async () => {
        try {
            const blob = await planesVacunalesApi.descargarFacturaPDF(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Factura_${factura.numero}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al descargar PDF:', error);
            alert('Error al descargar el PDF');
        }
    };

    const duplicarFactura = async () => {
        try {
            const nuevaFactura = await planesVacunalesApi.duplicarFactura(id);
            navigate(`/facturas/editar/${nuevaFactura.id}`);
        } catch (error) {
            console.error('Error al duplicar factura:', error);
            alert('Error al duplicar la factura');
        }
    };

    const anularFactura = async () => {
        if (window.confirm('¿Está seguro de anular esta factura? Esta acción no se puede deshacer.')) {
            try {
                await planesVacunalesApi.anularFactura(id);
                cargarFactura();
            } catch (error) {
                console.error('Error al anular factura:', error);
                alert('Error al anular la factura');
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
            'Pagada': 'bg-success',
            'Vencida': 'bg-danger',
            'Cancelada': 'bg-secondary',
            'Parcial': 'bg-info',
            'Anulada': 'bg-dark'
        };
        return estados[estado] || 'bg-secondary';
    };

    const calcularSaldoPendiente = () => {
        if (!factura) return 0;
        const totalPagado = historialPagos.reduce((sum, pago) => sum + pago.monto, 0);
        return factura.total - totalPagado;
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

    if (!factura) {
        return (
            <div className="container-fluid">
                <div className="alert alert-danger">
                    Factura no encontrada
                </div>
            </div>
        );
    }

    const saldoPendiente = calcularSaldoPendiente();
    const diasVencimiento = Math.ceil((new Date(factura.fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24));

    return (
        <div className="container-fluid factura-detalle">
            {/* Header con acciones */}
            <div className="row mb-4 no-print">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <button 
                                className="btn btn-outline-secondary me-2"
                                onClick={() => navigate('/facturas')}
                            >
                                <i className="bi bi-arrow-left me-2"></i>
                                Volver al Listado
                            </button>
                            <h2 className="d-inline text-dark">Factura {factura.numero}</h2>
                            <span className={`badge ${getEstadoBadge(factura.estado)} ms-3`}>
                                {factura.estado}
                            </span>
                        </div>
                        <div className="btn-group">
                            <button 
                                className="btn btn-primary"
                                onClick={() => navigate(`/facturas/editar/${id}`)}
                            >
                                <i className="bi bi-pencil me-2"></i>
                                Editar
                            </button>
                            <button 
                                className="btn btn-success"
                                onClick={() => setMostrarModalPago(true)}
                                disabled={factura.estado === 'Pagada' || factura.estado === 'Anulada'}
                            >
                                <i className="bi bi-credit-card me-2"></i>
                                Registrar Pago
                            </button>
                            <div className="dropdown">
                                <button 
                                    className="btn btn-outline-primary dropdown-toggle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                >
                                    <i className="bi bi-three-dots me-2"></i>
                                    Más Acciones
                                </button>
                                <ul className="dropdown-menu">
                                    <li>
                                        <button 
                                            className="dropdown-item"
                                            onClick={imprimirFactura}
                                        >
                                            <i className="bi bi-printer me-2"></i>Imprimir
                                        </button>
                                    </li>
                                    <li>
                                        <button 
                                            className="dropdown-item"
                                            onClick={descargarPDF}
                                        >
                                            <i className="bi bi-file-earmark-pdf me-2"></i>Descargar PDF
                                        </button>
                                    </li>
                                    <li>
                                        <button 
                                            className="dropdown-item"
                                            onClick={() => setMostrarModalEmail(true)}
                                        >
                                            <i className="bi bi-envelope me-2"></i>Enviar por Email
                                        </button>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <button 
                                            className="dropdown-item"
                                            onClick={duplicarFactura}
                                        >
                                            <i className="bi bi-files me-2"></i>Duplicar Factura
                                        </button>
                                    </li>
                                    <li>
                                        <button 
                                            className="dropdown-item text-danger"
                                            onClick={anularFactura}
                                            disabled={factura.estado === 'Anulada'}
                                        >
                                            <i className="bi bi-x-circle me-2"></i>Anular Factura
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertas de estado */}
            <div className="row mb-4 no-print">
                <div className="col-12">
                    {factura.estado === 'Vencida' && (
                        <div className="alert alert-danger">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            <strong>Factura Vencida:</strong> Esta factura venció hace {Math.abs(diasVencimiento)} días.
                        </div>
                    )}
                    {factura.estado === 'Pendiente' && diasVencimiento <= 5 && diasVencimiento > 0 && (
                        <div className="alert alert-warning">
                            <i className="bi bi-clock me-2"></i>
                            <strong>Próximo a Vencer:</strong> Esta factura vence en {diasVencimiento} días.
                        </div>
                    )}
                    {saldoPendiente > 0 && factura.estado !== 'Anulada' && (
                        <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>Saldo Pendiente:</strong> {formatearMoneda(saldoPendiente)}
                        </div>
                    )}
                </div>
            </div>

            <div className="row">
                {/* Información principal de la factura */}
                <div className="col-md-8">
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-file-earmark-text me-2"></i>
                                Detalles de la Factura
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <table className="table table-borderless">
                                        <tr>
                                            <td className="text-dark"><strong>Número:</strong></td>
                                            <td className="text-dark">{factura.numero}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-dark"><strong>Tipo:</strong></td>
                                            <td className="text-dark">Factura {factura.tipoFactura}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-dark"><strong>Fecha de Emisión:</strong></td>
                                            <td className="text-dark">{factura.fecha}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-dark"><strong>Fecha de Vencimiento:</strong></td>
                                            <td className="text-dark">{factura.fechaVencimiento}</td>
                                        </tr>
                                    </table>
                                </div>
                                <div className="col-md-6">
                                    <table className="table table-borderless">
                                        <tr>
                                            <td className="text-dark"><strong>Estado:</strong></td>
                                            <td>
                                                <span className={`badge ${getEstadoBadge(factura.estado)}`}>
                                                    {factura.estado}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="text-dark"><strong>Método de Pago:</strong></td>
                                            <td className="text-dark">{factura.metodoPago || 'No especificado'}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-dark"><strong>Concepto:</strong></td>
                                            <td className="text-dark">{factura.concepto || 'Sin concepto'}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-dark"><strong>Total:</strong></td>
                                            <td className="text-dark"><strong>{formatearMoneda(factura.total)}</strong></td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            
                            {factura.observaciones && (
                                <div className="mt-3">
                                    <h6 className="text-dark">Observaciones:</h6>
                                    <p className="text-muted">{factura.observaciones}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Información del cliente */}
                    <div className="card mb-4">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-person me-2"></i>
                                Información del Cliente
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <h6 className="text-dark">Datos Principales</h6>
                                    <p className="mb-1"><strong className="text-dark">Nombre:</strong> <span className="text-dark">{factura.cliente.nombre}</span></p>
                                    <p className="mb-1"><strong className="text-dark">CUIT/DNI:</strong> <span className="text-dark">{factura.cliente.documento || 'No especificado'}</span></p>
                                    <p className="mb-1"><strong className="text-dark">Email:</strong> <span className="text-dark">{factura.cliente.email || 'No especificado'}</span></p>
                                    <p className="mb-1"><strong className="text-dark">Teléfono:</strong> <span className="text-dark">{factura.cliente.telefono || 'No especificado'}</span></p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-dark">Dirección</h6>
                                    <p className="text-dark">{factura.cliente.direccion || 'No especificada'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items de la factura */}
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-list-task me-2"></i>
                                Items Facturados
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th className="text-dark">Descripción</th>
                                            <th className="text-dark">Cantidad</th>
                                            <th className="text-dark">Precio Unit.</th>
                                            <th className="text-dark">Descuento</th>
                                            <th className="text-dark">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {factura.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="text-dark">{item.descripcion}</td>
                                                <td className="text-dark">{item.cantidad}</td>
                                                <td className="text-dark">{formatearMoneda(item.precio)}</td>
                                                <td className="text-dark">{item.descuento}%</td>
                                                <td className="text-dark">{formatearMoneda(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Resumen de totales */}
                            <div className="row mt-4">
                                <div className="col-md-6"></div>
                                <div className="col-md-6">
                                    <div className="card bg-light">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-dark">Subtotal:</span>
                                                <span className="text-dark">{formatearMoneda(factura.subtotal)}</span>
                                            </div>
                                            {factura.descuentos && (factura.descuentos.porcentaje > 0 || factura.descuentos.monto > 0) && (
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="text-dark">Descuento:</span>
                                                    <span className="text-dark">
                                                        -{formatearMoneda(
                                                            factura.descuentos.porcentaje > 0 
                                                                ? (factura.subtotal * factura.descuentos.porcentaje) / 100
                                                                : factura.descuentos.monto
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {factura.impuestos && Object.values(factura.impuestos).some(imp => imp > 0) && (
                                                <>
                                                    {factura.impuestos.iva21 > 0 && (
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="text-dark">IVA 21%:</span>
                                                            <span className="text-dark">{formatearMoneda(factura.impuestos.iva21)}</span>
                                                        </div>
                                                    )}
                                                    {factura.impuestos.iva105 > 0 && (
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="text-dark">IVA 10.5%:</span>
                                                            <span className="text-dark">{formatearMoneda(factura.impuestos.iva105)}</span>
                                                        </div>
                                                    )}
                                                    {factura.impuestos.percepcionesIIBB > 0 && (
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="text-dark">Percepciones IIBB:</span>
                                                            <span className="text-dark">{formatearMoneda(factura.impuestos.percepcionesIIBB)}</span>
                                                        </div>
                                                    )}
                                                    {factura.impuestos.otras > 0 && (
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="text-dark">Otros Impuestos:</span>
                                                            <span className="text-dark">{formatearMoneda(factura.impuestos.otras)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <hr />
                                            <div className="d-flex justify-content-between">
                                                <h5 className="text-dark">TOTAL:</h5>
                                                <h5 className="text-dark">{formatearMoneda(factura.total)}</h5>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel lateral */}
                <div className="col-md-4">
                    {/* Historial de pagos */}
                    <div className="card mb-4">
                        <div className="card-header bg-warning text-dark">
                            <h5 className="mb-0">
                                <i className="bi bi-credit-card me-2"></i>
                                Historial de Pagos
                            </h5>
                        </div>
                        <div className="card-body">
                            {historialPagos.length === 0 ? (
                                <p className="text-muted text-center">No hay pagos registrados</p>
                            ) : (
                                <div className="pagos-timeline">
                                    {historialPagos.map((pago, index) => (
                                        <div key={index} className="pago-item border-bottom pb-3 mb-3">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 className="text-dark mb-1">{formatearMoneda(pago.monto)}</h6>
                                                    <small className="text-muted">{pago.fecha}</small>
                                                    <div className="text-muted" style={{fontSize: '0.8rem'}}>
                                                        {pago.metodoPago}
                                                    </div>
                                                    {pago.referencia && (
                                                        <div className="text-muted" style={{fontSize: '0.75rem'}}>
                                                            Ref: {pago.referencia}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="badge bg-success">Pagado</span>
                                            </div>
                                            {pago.observaciones && (
                                                <p className="text-muted mt-2 mb-0" style={{fontSize: '0.8rem'}}>
                                                    {pago.observaciones}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {saldoPendiente > 0 && factura.estado !== 'Anulada' && (
                                <div className="mt-3 p-3 bg-light rounded">
                                    <div className="d-flex justify-content-between">
                                        <span className="text-dark">Saldo Pendiente:</span>
                                        <strong className="text-danger">{formatearMoneda(saldoPendiente)}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Información de vencimiento */}
                    <div className="card mb-4">
                        <div className="card-header bg-secondary text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-calendar me-2"></i>
                                Estado de Vencimiento
                            </h5>
                        </div>
                        <div className="card-body text-center">
                            {factura.estado === 'Pagada' ? (
                                <div>
                                    <i className="bi bi-check-circle text-success display-4"></i>
                                    <h6 className="text-success mt-2">Factura Pagada</h6>
                                    <p className="text-muted">Completamente saldada</p>
                                </div>
                            ) : factura.estado === 'Anulada' ? (
                                <div>
                                    <i className="bi bi-x-circle text-dark display-4"></i>
                                    <h6 className="text-dark mt-2">Factura Anulada</h6>
                                    <p className="text-muted">Sin efecto</p>
                                </div>
                            ) : diasVencimiento < 0 ? (
                                <div>
                                    <i className="bi bi-exclamation-triangle text-danger display-4"></i>
                                    <h6 className="text-danger mt-2">Vencida</h6>
                                    <p className="text-muted">{Math.abs(diasVencimiento)} días de atraso</p>
                                </div>
                            ) : diasVencimiento <= 5 ? (
                                <div>
                                    <i className="bi bi-clock text-warning display-4"></i>
                                    <h6 className="text-warning mt-2">Por Vencer</h6>
                                    <p className="text-muted">{diasVencimiento} días restantes</p>
                                </div>
                            ) : (
                                <div>
                                    <i className="bi bi-calendar-check text-success display-4"></i>
                                    <h6 className="text-success mt-2">Vigente</h6>
                                    <p className="text-muted">{diasVencimiento} días restantes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="card no-print">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-dark">
                                <i className="bi bi-lightning me-2"></i>
                                Acciones Rápidas
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="d-grid gap-2">
                                <button 
                                    className="btn btn-outline-primary"
                                    onClick={imprimirFactura}
                                >
                                    <i className="bi bi-printer me-2"></i>
                                    Imprimir
                                </button>
                                <button 
                                    className="btn btn-outline-secondary"
                                    onClick={descargarPDF}
                                >
                                    <i className="bi bi-file-earmark-pdf me-2"></i>
                                    Descargar PDF
                                </button>
                                <button 
                                    className="btn btn-outline-info"
                                    onClick={() => setMostrarModalEmail(true)}
                                >
                                    <i className="bi bi-envelope me-2"></i>
                                    Enviar por Email
                                </button>
                                <button 
                                    className="btn btn-outline-success"
                                    onClick={duplicarFactura}
                                >
                                    <i className="bi bi-files me-2"></i>
                                    Duplicar Factura
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de registro de pago */}
            {mostrarModalPago && (
                <div className="modal show d-block" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">Registrar Pago</h5>
                                <button type="button" className="btn-close" onClick={() => setMostrarModalPago(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label text-dark">Monto a Pagar</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={pagoData.monto}
                                        onChange={(e) => setPagoData(prev => ({...prev, monto: parseFloat(e.target.value) || 0}))}
                                        max={saldoPendiente}
                                        step="0.01"
                                    />
                                    <small className="text-muted">Saldo pendiente: {formatearMoneda(saldoPendiente)}</small>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark">Fecha de Pago</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={pagoData.fecha}
                                        onChange={(e) => setPagoData(prev => ({...prev, fecha: e.target.value}))}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark">Método de Pago</label>
                                    <select
                                        className="form-select"
                                        value={pagoData.metodoPago}
                                        onChange={(e) => setPagoData(prev => ({...prev, metodoPago: e.target.value}))}
                                    >
                                        <option value="">Seleccionar método...</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia Bancaria</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Tarjeta">Tarjeta de Crédito</option>
                                        <option value="Débito">Tarjeta de Débito</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark">Referencia</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={pagoData.referencia}
                                        onChange={(e) => setPagoData(prev => ({...prev, referencia: e.target.value}))}
                                        placeholder="Número de operación, cheque, etc."
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark">Observaciones</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={pagoData.observaciones}
                                        onChange={(e) => setPagoData(prev => ({...prev, observaciones: e.target.value}))}
                                        placeholder="Observaciones adicionales..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModalPago(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn btn-success" onClick={registrarPago}>
                                    Registrar Pago
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de envío por email */}
            {mostrarModalEmail && (
                <div className="modal show d-block" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-dark">Enviar Factura por Email</h5>
                                <button type="button" className="btn-close" onClick={() => setMostrarModalEmail(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label text-dark">Destinatario</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={emailData.destinatario}
                                        onChange={(e) => setEmailData(prev => ({...prev, destinatario: e.target.value}))}
                                        placeholder="email@ejemplo.com"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark">Asunto</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={emailData.asunto}
                                        onChange={(e) => setEmailData(prev => ({...prev, asunto: e.target.value}))}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark">Mensaje</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={emailData.mensaje}
                                        onChange={(e) => setEmailData(prev => ({...prev, mensaje: e.target.value}))}
                                        placeholder="Mensaje del email..."
                                    />
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={emailData.adjuntarPDF}
                                        onChange={(e) => setEmailData(prev => ({...prev, adjuntarPDF: e.target.checked}))}
                                    />
                                    <label className="form-check-label text-dark">
                                        Adjuntar PDF de la factura
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModalEmail(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={enviarPorEmail}>
                                    Enviar Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacturaDetalle;