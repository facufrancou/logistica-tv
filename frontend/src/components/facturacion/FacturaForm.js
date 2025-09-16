import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Facturacion.css';

const FacturaForm = ({ facturaId = null, onGuardar, onCancelar }) => {
    const [factura, setFactura] = useState({
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
        clienteId: '',
        cliente: {
            nombre: '',
            documento: '',
            email: '',
            telefono: '',
            direccion: ''
        },
        concepto: '',
        observaciones: '',
        items: [],
        subtotal: 0,
        impuestos: {
            iva21: 0,
            iva105: 0,
            percepcionesIIBB: 0,
            otras: 0
        },
        descuentos: {
            porcentaje: 0,
            monto: 0
        },
        total: 0,
        estado: 'Pendiente',
        metodoPago: '',
        condicionesPago: '',
        tipoFactura: 'A' // A, B, C
    });
    
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [mostrarProductos, setMostrarProductos] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    useEffect(() => {
        cargarDatosIniciales();
        if (facturaId) {
            cargarFactura();
        } else {
            generarNumeroFactura();
        }
    }, [facturaId]);

    useEffect(() => {
        calcularTotales();
    }, [factura.items, factura.descuentos, factura.impuestos]);

    const cargarDatosIniciales = async () => {
        try {
            const [productosData, clientesData] = await Promise.all([
                planesVacunalesApi.getProductos(),
                planesVacunalesApi.getClientes()
            ]);
            setProductos(productosData);
            setClientes(clientesData);
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
        }
    };

    const cargarFactura = async () => {
        try {
            setLoading(true);
            const facturaData = await planesVacunalesApi.getFacturaById(facturaId);
            setFactura(facturaData);
        } catch (error) {
            console.error('Error al cargar factura:', error);
        } finally {
            setLoading(false);
        }
    };

    const generarNumeroFactura = async () => {
        try {
            const numero = await planesVacunalesApi.generarNumeroFactura();
            setFactura(prev => ({
                ...prev,
                numero
            }));
        } catch (error) {
            console.error('Error al generar número de factura:', error);
        }
    };

    const handleInputChange = (campo, valor, seccion = null) => {
        if (seccion) {
            setFactura(prev => ({
                ...prev,
                [seccion]: {
                    ...prev[seccion],
                    [campo]: valor
                }
            }));
        } else {
            setFactura(prev => ({
                ...prev,
                [campo]: valor
            }));
        }
        
        // Limpiar error del campo
        if (errors[campo]) {
            setErrors(prev => ({
                ...prev,
                [campo]: ''
            }));
        }
    };

    const agregarItem = () => {
        setFactura(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: Date.now(),
                    productoId: '',
                    descripcion: '',
                    cantidad: 1,
                    precio: 0,
                    descuento: 0,
                    total: 0
                }
            ]
        }));
    };

    const eliminarItem = (index) => {
        setFactura(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const actualizarItem = (index, campo, valor) => {
        setFactura(prev => {
            const nuevosItems = [...prev.items];
            nuevosItems[index] = {
                ...nuevosItems[index],
                [campo]: valor
            };
            
            // Recalcular total del item
            if (campo === 'cantidad' || campo === 'precio' || campo === 'descuento') {
                const item = nuevosItems[index];
                const subtotalItem = item.cantidad * item.precio;
                const descuentoItem = (subtotalItem * item.descuento) / 100;
                nuevosItems[index].total = subtotalItem - descuentoItem;
            }
            
            // Si se selecciona un producto, llenar datos automáticamente
            if (campo === 'productoId' && valor) {
                const producto = productos.find(p => p.id === valor);
                if (producto) {
                    nuevosItems[index].descripcion = producto.nombre;
                    nuevosItems[index].precio = producto.precio;
                    nuevosItems[index].total = nuevosItems[index].cantidad * producto.precio;
                }
            }
            
            return {
                ...prev,
                items: nuevosItems
            };
        });
    };

    const calcularTotales = () => {
        const subtotal = factura.items.reduce((sum, item) => sum + (item.total || 0), 0);
        
        // Aplicar descuento general
        const descuentoMonto = factura.descuentos.porcentaje > 0 
            ? (subtotal * factura.descuentos.porcentaje) / 100 
            : factura.descuentos.monto || 0;
        
        const subtotalConDescuento = subtotal - descuentoMonto;
        
        // Calcular impuestos
        const totalImpuestos = Object.values(factura.impuestos).reduce((sum, imp) => sum + (imp || 0), 0);
        
        const total = subtotalConDescuento + totalImpuestos;
        
        setFactura(prev => ({
            ...prev,
            subtotal,
            total
        }));
    };

    const seleccionarCliente = (clienteId) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            setFactura(prev => ({
                ...prev,
                clienteId,
                cliente: {
                    nombre: cliente.nombre,
                    documento: cliente.documento,
                    email: cliente.email,
                    telefono: cliente.telefono,
                    direccion: cliente.direccion
                }
            }));
        }
    };

    const validarFormulario = () => {
        const nuevosErrors = {};
        
        if (!factura.numero) nuevosErrors.numero = 'El número de factura es requerido';
        if (!factura.fecha) nuevosErrors.fecha = 'La fecha es requerida';
        if (!factura.fechaVencimiento) nuevosErrors.fechaVencimiento = 'La fecha de vencimiento es requerida';
        if (!factura.cliente.nombre) nuevosErrors.cliente = 'Los datos del cliente son requeridos';
        if (factura.items.length === 0) nuevosErrors.items = 'Debe agregar al menos un item';
        
        // Validar que todos los items tengan datos completos
        factura.items.forEach((item, index) => {
            if (!item.descripcion) nuevosErrors[`item_${index}_descripcion`] = 'Descripción requerida';
            if (item.cantidad <= 0) nuevosErrors[`item_${index}_cantidad`] = 'Cantidad debe ser mayor a 0';
            if (item.precio <= 0) nuevosErrors[`item_${index}_precio`] = 'Precio debe ser mayor a 0';
        });
        
        setErrors(nuevosErrors);
        return Object.keys(nuevosErrors).length === 0;
    };

    const guardarFactura = async () => {
        if (!validarFormulario()) {
            return;
        }
        
        try {
            setLoading(true);
            
            if (facturaId) {
                await planesVacunalesApi.actualizarFactura(facturaId, factura);
            } else {
                await planesVacunalesApi.crearFactura(factura);
            }
            
            if (onGuardar) {
                onGuardar();
            }
        } catch (error) {
            console.error('Error al guardar factura:', error);
            alert('Error al guardar la factura');
        } finally {
            setLoading(false);
        }
    };

    const formatearMoneda = (monto) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(monto);
    };

    if (loading && facturaId) {
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
        <div className="container-fluid factura-form">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">
                            {facturaId ? 'Editar Factura' : 'Nueva Factura'}
                        </h2>
                        <div>
                            <button 
                                className="btn btn-outline-secondary me-2"
                                onClick={onCancelar}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={guardarFactura}
                                disabled={loading}
                            >
                                {loading ? 'Guardando...' : 'Guardar Factura'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Información básica */}
                <div className="col-md-8">
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-file-earmark-text me-2"></i>
                                Información de la Factura
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Número de Factura *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.numero ? 'is-invalid' : ''}`}
                                        value={factura.numero}
                                        onChange={(e) => handleInputChange('numero', e.target.value)}
                                        placeholder="0001-00000001"
                                    />
                                    {errors.numero && <div className="invalid-feedback">{errors.numero}</div>}
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-dark">Tipo *</label>
                                    <select
                                        className="form-select"
                                        value={factura.tipoFactura}
                                        onChange={(e) => handleInputChange('tipoFactura', e.target.value)}
                                    >
                                        <option value="A">Factura A</option>
                                        <option value="B">Factura B</option>
                                        <option value="C">Factura C</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Fecha de Emisión *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${errors.fecha ? 'is-invalid' : ''}`}
                                        value={factura.fecha}
                                        onChange={(e) => handleInputChange('fecha', e.target.value)}
                                    />
                                    {errors.fecha && <div className="invalid-feedback">{errors.fecha}</div>}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-dark">Fecha de Vencimiento *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${errors.fechaVencimiento ? 'is-invalid' : ''}`}
                                        value={factura.fechaVencimiento}
                                        onChange={(e) => handleInputChange('fechaVencimiento', e.target.value)}
                                    />
                                    {errors.fechaVencimiento && <div className="invalid-feedback">{errors.fechaVencimiento}</div>}
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-md-6">
                                    <label className="form-label text-dark">Concepto</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={factura.concepto}
                                        onChange={(e) => handleInputChange('concepto', e.target.value)}
                                        placeholder="Concepto de la factura"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Método de Pago</label>
                                    <select
                                        className="form-select"
                                        value={factura.metodoPago}
                                        onChange={(e) => handleInputChange('metodoPago', e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Contado">Contado</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Tarjeta">Tarjeta de Crédito</option>
                                        <option value="Cuenta Corriente">Cuenta Corriente</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label text-dark">Estado</label>
                                    <select
                                        className="form-select"
                                        value={factura.estado}
                                        onChange={(e) => handleInputChange('estado', e.target.value)}
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Pagada">Pagada</option>
                                        <option value="Vencida">Vencida</option>
                                        <option value="Cancelada">Cancelada</option>
                                        <option value="Parcial">Parcial</option>
                                    </select>
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-12">
                                    <label className="form-label text-dark">Observaciones</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={factura.observaciones}
                                        onChange={(e) => handleInputChange('observaciones', e.target.value)}
                                        placeholder="Observaciones adicionales..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items de la factura */}
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <i className="bi bi-list-task me-2"></i>
                                Items de la Factura
                            </h5>
                            <button 
                                className="btn btn-light btn-sm"
                                onClick={agregarItem}
                            >
                                <i className="bi bi-plus me-2"></i>
                                Agregar Item
                            </button>
                        </div>
                        <div className="card-body">
                            {errors.items && (
                                <div className="alert alert-danger">
                                    {errors.items}
                                </div>
                            )}
                            
                            {factura.items.length === 0 ? (
                                <div className="text-center py-4">
                                    <i className="bi bi-inbox display-4 text-muted"></i>
                                    <p className="text-muted mt-3">No hay items agregados. Haga clic en "Agregar Item" para comenzar.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th className="text-dark">Producto</th>
                                                <th className="text-dark">Descripción</th>
                                                <th className="text-dark">Cantidad</th>
                                                <th className="text-dark">Precio Unit.</th>
                                                <th className="text-dark">Desc. %</th>
                                                <th className="text-dark">Total</th>
                                                <th className="text-dark">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {factura.items.map((item, index) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <select
                                                            className={`form-select form-select-sm ${errors[`item_${index}_producto`] ? 'is-invalid' : ''}`}
                                                            value={item.productoId}
                                                            onChange={(e) => actualizarItem(index, 'productoId', e.target.value)}
                                                        >
                                                            <option value="">Seleccionar producto...</option>
                                                            {productos.map(producto => (
                                                                <option key={producto.id} value={producto.id}>
                                                                    {producto.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className={`form-control form-control-sm ${errors[`item_${index}_descripcion`] ? 'is-invalid' : ''}`}
                                                            value={item.descripcion}
                                                            onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                                                            placeholder="Descripción del item"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className={`form-control form-control-sm ${errors[`item_${index}_cantidad`] ? 'is-invalid' : ''}`}
                                                            value={item.cantidad}
                                                            onChange={(e) => actualizarItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className={`form-control form-control-sm ${errors[`item_${index}_precio`] ? 'is-invalid' : ''}`}
                                                            value={item.precio}
                                                            onChange={(e) => actualizarItem(index, 'precio', parseFloat(e.target.value) || 0)}
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            value={item.descuento}
                                                            onChange={(e) => actualizarItem(index, 'descuento', parseFloat(e.target.value) || 0)}
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                        />
                                                    </td>
                                                    <td className="text-dark font-weight-bold">
                                                        {formatearMoneda(item.total || 0)}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => eliminarItem(index)}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
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

                {/* Panel lateral */}
                <div className="col-md-4">
                    {/* Información del cliente */}
                    <div className="card mb-4">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-person me-2"></i>
                                Información del Cliente
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label text-dark">Seleccionar Cliente</label>
                                <select
                                    className="form-select"
                                    value={factura.clienteId}
                                    onChange={(e) => seleccionarCliente(e.target.value)}
                                >
                                    <option value="">Seleccionar cliente existente...</option>
                                    {clientes.map(cliente => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {cliente.nombre} - {cliente.documento}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label text-dark">Nombre/Razón Social *</label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.cliente ? 'is-invalid' : ''}`}
                                    value={factura.cliente.nombre}
                                    onChange={(e) => handleInputChange('nombre', e.target.value, 'cliente')}
                                    placeholder="Nombre del cliente"
                                />
                                {errors.cliente && <div className="invalid-feedback">{errors.cliente}</div>}
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label text-dark">CUIT/DNI</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={factura.cliente.documento}
                                    onChange={(e) => handleInputChange('documento', e.target.value, 'cliente')}
                                    placeholder="20-12345678-9"
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label text-dark">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={factura.cliente.email}
                                    onChange={(e) => handleInputChange('email', e.target.value, 'cliente')}
                                    placeholder="cliente@email.com"
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label text-dark">Teléfono</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={factura.cliente.telefono}
                                    onChange={(e) => handleInputChange('telefono', e.target.value, 'cliente')}
                                    placeholder="(011) 1234-5678"
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label text-dark">Dirección</label>
                                <textarea
                                    className="form-control"
                                    rows="2"
                                    value={factura.cliente.direccion}
                                    onChange={(e) => handleInputChange('direccion', e.target.value, 'cliente')}
                                    placeholder="Dirección del cliente"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="card">
                        <div className="card-header bg-warning text-dark">
                            <h5 className="mb-0">
                                <i className="bi bi-calculator me-2"></i>
                                Totales
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-dark">Subtotal:</span>
                                <strong className="text-dark">{formatearMoneda(factura.subtotal)}</strong>
                            </div>
                            
                            {/* Descuentos */}
                            <div className="mb-3">
                                <label className="form-label text-dark">Descuento</label>
                                <div className="row">
                                    <div className="col-6">
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            placeholder="% Descuento"
                                            value={factura.descuentos.porcentaje}
                                            onChange={(e) => handleInputChange('porcentaje', parseFloat(e.target.value) || 0, 'descuentos')}
                                            min="0"
                                            max="100"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-6">
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            placeholder="$ Monto"
                                            value={factura.descuentos.monto}
                                            onChange={(e) => handleInputChange('monto', parseFloat(e.target.value) || 0, 'descuentos')}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
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
                                            value={factura.impuestos.iva21}
                                            onChange={(e) => handleInputChange('iva21', parseFloat(e.target.value) || 0, 'impuestos')}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-6">
                                        <small className="text-muted">IVA 10.5%</small>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={factura.impuestos.iva105}
                                            onChange={(e) => handleInputChange('iva105', parseFloat(e.target.value) || 0, 'impuestos')}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div className="row mt-2">
                                    <div className="col-6">
                                        <small className="text-muted">Perc. IIBB</small>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={factura.impuestos.percepcionesIIBB}
                                            onChange={(e) => handleInputChange('percepcionesIIBB', parseFloat(e.target.value) || 0, 'impuestos')}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-6">
                                        <small className="text-muted">Otras</small>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={factura.impuestos.otras}
                                            onChange={(e) => handleInputChange('otras', parseFloat(e.target.value) || 0, 'impuestos')}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                            
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
    );
};

export default FacturaForm;