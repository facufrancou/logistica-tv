import React, { useState, useEffect } from 'react';
import { planesVacunalesApi } from '../../services/planesVacunalesApi';
import './Facturacion.css';

const ConfiguracionFacturacion = () => {
    const [configuracion, setConfiguracion] = useState({
        empresa: {
            razonSocial: '',
            nombreFantasia: '',
            cuit: '',
            condicionIVA: '',
            direccion: '',
            telefono: '',
            email: '',
            sitioWeb: '',
            logo: null
        },
        numeracion: {
            puntoVenta: '0001',
            proximoNumeroA: 1,
            proximoNumeroB: 1,
            proximoNumeroC: 1,
            formatoFactura: 'XXXX-XXXXXXXX'
        },
        configuracionGeneral: {
            monedaDefecto: 'ARS',
            idioma: 'es',
            zonaHoraria: 'America/Argentina/Buenos_Aires',
            diasVencimientoDefecto: 30,
            enviarEmailAutomatico: false,
            generarPDFAutomatico: true,
            permitirFacturasSinStock: false
        },
        integracionAFIP: {
            habilitado: false,
            certificado: null,
            clavePrivada: null,
            ambiente: 'testing', // testing, production
            cuit: '',
            ultimaSincronizacion: null
        },
        plantillasEmail: {
            asuntoFactura: 'Factura {{numero}} - {{empresa}}',
            cuerpoFactura: `Estimado/a {{cliente}},

Adjuntamos la factura {{numero}} correspondiente a los servicios prestados.

Detalles de la factura:
- Número: {{numero}}
- Fecha: {{fecha}}
- Vencimiento: {{vencimiento}}
- Total: {{total}}

Agradecemos su confianza.

Saludos cordiales,
{{empresa}}`
        },
        terminosCondiciones: {
            textoFactura: 'Los pagos deberán efectuarse dentro del plazo establecido. Caso contrario se aplicarán los intereses correspondientes.',
            politicaDevolucion: '',
            garantia: ''
        }
    });
    
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [tabActiva, setTabActiva] = useState('empresa');
    const [mensajeGuardado, setMensajeGuardado] = useState('');

    useEffect(() => {
        cargarConfiguracion();
    }, []);

    const cargarConfiguracion = async () => {
        try {
            setLoading(true);
            const config = await planesVacunalesApi.getConfiguracionFacturacion();
            setConfiguracion(config);
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (seccion, campo, valor) => {
        setConfiguracion(prev => ({
            ...prev,
            [seccion]: {
                ...prev[seccion],
                [campo]: valor
            }
        }));
    };

    const guardarConfiguracion = async () => {
        try {
            setGuardando(true);
            await planesVacunalesApi.actualizarConfiguracionFacturacion(configuracion);
            setMensajeGuardado('Configuración guardada correctamente');
            setTimeout(() => setMensajeGuardado(''), 3000);
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            alert('Error al guardar la configuración');
        } finally {
            setGuardando(false);
        }
    };

    const subirLogo = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const formData = new FormData();
                formData.append('logo', file);
                const logoUrl = await planesVacunalesApi.subirLogoEmpresa(formData);
                handleInputChange('empresa', 'logo', logoUrl);
            } catch (error) {
                console.error('Error al subir logo:', error);
                alert('Error al subir el logo');
            }
        }
    };

    const subirCertificadoAFIP = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const formData = new FormData();
                formData.append('certificado', file);
                const certificadoUrl = await planesVacunalesApi.subirCertificadoAFIP(formData);
                handleInputChange('integracionAFIP', 'certificado', certificadoUrl);
            } catch (error) {
                console.error('Error al subir certificado:', error);
                alert('Error al subir el certificado');
            }
        }
    };

    const probarConexionAFIP = async () => {
        try {
            const resultado = await planesVacunalesApi.probarConexionAFIP();
            if (resultado.exito) {
                alert('Conexión con AFIP exitosa');
            } else {
                alert(`Error de conexión: ${resultado.mensaje}`);
            }
        } catch (error) {
            console.error('Error al probar conexión AFIP:', error);
            alert('Error al conectar con AFIP');
        }
    };

    const resetearNumeracion = async (tipo) => {
        if (window.confirm(`¿Está seguro de resetear la numeración de facturas tipo ${tipo}?`)) {
            try {
                await planesVacunalesApi.resetearNumeracionFactura(tipo);
                cargarConfiguracion();
                alert('Numeración reseteada correctamente');
            } catch (error) {
                console.error('Error al resetear numeración:', error);
                alert('Error al resetear la numeración');
            }
        }
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
        <div className="container-fluid configuracion-facturacion">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="mb-0 text-dark">Configuración de Facturación</h2>
                        <div>
                            {mensajeGuardado && (
                                <span className="text-success me-3">
                                    <i className="bi bi-check-circle me-1"></i>
                                    {mensajeGuardado}
                                </span>
                            )}
                            <button 
                                className="btn btn-primary"
                                onClick={guardarConfiguracion}
                                disabled={guardando}
                            >
                                {guardando ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs de navegación */}
            <div className="row">
                <div className="col-12">
                    <ul className="nav nav-tabs" role="tablist">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${tabActiva === 'empresa' ? 'active' : ''}`}
                                onClick={() => setTabActiva('empresa')}
                            >
                                <i className="bi bi-building me-2"></i>
                                Datos de Empresa
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${tabActiva === 'numeracion' ? 'active' : ''}`}
                                onClick={() => setTabActiva('numeracion')}
                            >
                                <i className="bi bi-hash me-2"></i>
                                Numeración
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${tabActiva === 'general' ? 'active' : ''}`}
                                onClick={() => setTabActiva('general')}
                            >
                                <i className="bi bi-gear me-2"></i>
                                General
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${tabActiva === 'afip' ? 'active' : ''}`}
                                onClick={() => setTabActiva('afip')}
                            >
                                <i className="bi bi-shield-check me-2"></i>
                                AFIP
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${tabActiva === 'plantillas' ? 'active' : ''}`}
                                onClick={() => setTabActiva('plantillas')}
                            >
                                <i className="bi bi-envelope me-2"></i>
                                Plantillas Email
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${tabActiva === 'terminos' ? 'active' : ''}`}
                                onClick={() => setTabActiva('terminos')}
                            >
                                <i className="bi bi-file-text me-2"></i>
                                Términos y Condiciones
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-12">
                    {/* Tab Datos de Empresa */}
                    {tabActiva === 'empresa' && (
                        <div className="card">
                            <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-building me-2"></i>
                                    Información de la Empresa
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-8">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Razón Social *</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={configuracion.empresa.razonSocial}
                                                        onChange={(e) => handleInputChange('empresa', 'razonSocial', e.target.value)}
                                                        placeholder="Empresa S.A."
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Nombre de Fantasía</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={configuracion.empresa.nombreFantasia}
                                                        onChange={(e) => handleInputChange('empresa', 'nombreFantasia', e.target.value)}
                                                        placeholder="Mi Empresa"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">CUIT *</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={configuracion.empresa.cuit}
                                                        onChange={(e) => handleInputChange('empresa', 'cuit', e.target.value)}
                                                        placeholder="20-12345678-9"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Condición IVA *</label>
                                                    <select
                                                        className="form-select"
                                                        value={configuracion.empresa.condicionIVA}
                                                        onChange={(e) => handleInputChange('empresa', 'condicionIVA', e.target.value)}
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                                                        <option value="Monotributista">Monotributista</option>
                                                        <option value="Exento">Exento</option>
                                                        <option value="Consumidor Final">Consumidor Final</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Dirección</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                value={configuracion.empresa.direccion}
                                                onChange={(e) => handleInputChange('empresa', 'direccion', e.target.value)}
                                                placeholder="Dirección completa de la empresa"
                                            />
                                        </div>
                                        <div className="row">
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Teléfono</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={configuracion.empresa.telefono}
                                                        onChange={(e) => handleInputChange('empresa', 'telefono', e.target.value)}
                                                        placeholder="(011) 1234-5678"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Email</label>
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        value={configuracion.empresa.email}
                                                        onChange={(e) => handleInputChange('empresa', 'email', e.target.value)}
                                                        placeholder="info@empresa.com"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Sitio Web</label>
                                                    <input
                                                        type="url"
                                                        className="form-control"
                                                        value={configuracion.empresa.sitioWeb}
                                                        onChange={(e) => handleInputChange('empresa', 'sitioWeb', e.target.value)}
                                                        placeholder="https://www.empresa.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-center">
                                            <label className="form-label text-dark">Logo de la Empresa</label>
                                            <div className="logo-upload-area border rounded p-3">
                                                {configuracion.empresa.logo ? (
                                                    <div>
                                                        <img 
                                                            src={configuracion.empresa.logo} 
                                                            alt="Logo" 
                                                            className="img-fluid mb-3"
                                                            style={{maxHeight: '150px'}}
                                                        />
                                                        <br />
                                                        <button 
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleInputChange('empresa', 'logo', null)}
                                                        >
                                                            Eliminar Logo
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <i className="bi bi-image display-4 text-muted"></i>
                                                        <p className="text-muted mt-2">Sin logo</p>
                                                    </div>
                                                )}
                                                <div className="mt-3">
                                                    <input
                                                        type="file"
                                                        className="form-control"
                                                        accept="image/*"
                                                        onChange={subirLogo}
                                                    />
                                                    <small className="text-muted">JPG, PNG - Máx. 2MB</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Numeración */}
                    {tabActiva === 'numeracion' && (
                        <div className="card">
                            <div className="card-header bg-success text-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-hash me-2"></i>
                                    Configuración de Numeración
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Punto de Venta</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={configuracion.numeracion.puntoVenta}
                                                onChange={(e) => handleInputChange('numeracion', 'puntoVenta', e.target.value)}
                                                placeholder="0001"
                                                maxLength="4"
                                            />
                                            <small className="text-muted">Número de 4 dígitos asignado por AFIP</small>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Formato de Factura</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={configuracion.numeracion.formatoFactura}
                                                onChange={(e) => handleInputChange('numeracion', 'formatoFactura', e.target.value)}
                                                placeholder="XXXX-XXXXXXXX"
                                                readOnly
                                            />
                                            <small className="text-muted">Formato estándar AFIP</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <h6 className="text-dark mb-3">Próximos Números</h6>
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-dark">Factura A</h6>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={configuracion.numeracion.proximoNumeroA}
                                                        onChange={(e) => handleInputChange('numeracion', 'proximoNumeroA', parseInt(e.target.value))}
                                                        min="1"
                                                    />
                                                    <button 
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => resetearNumeracion('A')}
                                                        title="Resetear numeración"
                                                    >
                                                        <i className="bi bi-arrow-clockwise"></i>
                                                    </button>
                                                </div>
                                                <small className="text-muted">
                                                    Próxima: {configuracion.numeracion.puntoVenta}-{String(configuracion.numeracion.proximoNumeroA).padStart(8, '0')}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-dark">Factura B</h6>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={configuracion.numeracion.proximoNumeroB}
                                                        onChange={(e) => handleInputChange('numeracion', 'proximoNumeroB', parseInt(e.target.value))}
                                                        min="1"
                                                    />
                                                    <button 
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => resetearNumeracion('B')}
                                                        title="Resetear numeración"
                                                    >
                                                        <i className="bi bi-arrow-clockwise"></i>
                                                    </button>
                                                </div>
                                                <small className="text-muted">
                                                    Próxima: {configuracion.numeracion.puntoVenta}-{String(configuracion.numeracion.proximoNumeroB).padStart(8, '0')}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-dark">Factura C</h6>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={configuracion.numeracion.proximoNumeroC}
                                                        onChange={(e) => handleInputChange('numeracion', 'proximoNumeroC', parseInt(e.target.value))}
                                                        min="1"
                                                    />
                                                    <button 
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => resetearNumeracion('C')}
                                                        title="Resetear numeración"
                                                    >
                                                        <i className="bi bi-arrow-clockwise"></i>
                                                    </button>
                                                </div>
                                                <small className="text-muted">
                                                    Próxima: {configuracion.numeracion.puntoVenta}-{String(configuracion.numeracion.proximoNumeroC).padStart(8, '0')}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Configuración General */}
                    {tabActiva === 'general' && (
                        <div className="card">
                            <div className="card-header bg-info text-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-gear me-2"></i>
                                    Configuración General
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Moneda por Defecto</label>
                                            <select
                                                className="form-select"
                                                value={configuracion.configuracionGeneral.monedaDefecto}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'monedaDefecto', e.target.value)}
                                            >
                                                <option value="ARS">Peso Argentino (ARS)</option>
                                                <option value="USD">Dólar Estadounidense (USD)</option>
                                                <option value="EUR">Euro (EUR)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Días de Vencimiento por Defecto</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={configuracion.configuracionGeneral.diasVencimientoDefecto}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'diasVencimientoDefecto', parseInt(e.target.value))}
                                                min="1"
                                                max="365"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Idioma</label>
                                            <select
                                                className="form-select"
                                                value={configuracion.configuracionGeneral.idioma}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'idioma', e.target.value)}
                                            >
                                                <option value="es">Español</option>
                                                <option value="en">Inglés</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-dark">Zona Horaria</label>
                                            <select
                                                className="form-select"
                                                value={configuracion.configuracionGeneral.zonaHoraria}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'zonaHoraria', e.target.value)}
                                            >
                                                <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
                                                <option value="America/Argentina/Cordoba">Córdoba</option>
                                                <option value="America/Argentina/Mendoza">Mendoza</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <h6 className="text-dark mb-3">Opciones Avanzadas</h6>
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="form-check mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.configuracionGeneral.enviarEmailAutomatico}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'enviarEmailAutomatico', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                Enviar email automáticamente al crear factura
                                            </label>
                                        </div>
                                        <div className="form-check mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.configuracionGeneral.generarPDFAutomatico}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'generarPDFAutomatico', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                Generar PDF automáticamente
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-check mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={configuracion.configuracionGeneral.permitirFacturasSinStock}
                                                onChange={(e) => handleInputChange('configuracionGeneral', 'permitirFacturasSinStock', e.target.checked)}
                                            />
                                            <label className="form-check-label text-dark">
                                                Permitir facturas sin stock disponible
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab AFIP */}
                    {tabActiva === 'afip' && (
                        <div className="card">
                            <div className="card-header bg-warning text-dark">
                                <h5 className="mb-0">
                                    <i className="bi bi-shield-check me-2"></i>
                                    Integración con AFIP
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="form-check mb-4">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={configuracion.integracionAFIP.habilitado}
                                        onChange={(e) => handleInputChange('integracionAFIP', 'habilitado', e.target.checked)}
                                    />
                                    <label className="form-check-label text-dark">
                                        <strong>Habilitar integración con AFIP</strong>
                                    </label>
                                </div>
                                
                                {configuracion.integracionAFIP.habilitado && (
                                    <>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">CUIT</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={configuracion.integracionAFIP.cuit}
                                                        onChange={(e) => handleInputChange('integracionAFIP', 'cuit', e.target.value)}
                                                        placeholder="20-12345678-9"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Ambiente</label>
                                                    <select
                                                        className="form-select"
                                                        value={configuracion.integracionAFIP.ambiente}
                                                        onChange={(e) => handleInputChange('integracionAFIP', 'ambiente', e.target.value)}
                                                    >
                                                        <option value="testing">Testing (Pruebas)</option>
                                                        <option value="production">Producción</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Certificado (.crt)</label>
                                                    <input
                                                        type="file"
                                                        className="form-control"
                                                        accept=".crt,.pem"
                                                        onChange={subirCertificadoAFIP}
                                                    />
                                                    {configuracion.integracionAFIP.certificado && (
                                                        <small className="text-success">
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            Certificado cargado
                                                        </small>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label text-dark">Clave Privada (.key)</label>
                                                    <input
                                                        type="file"
                                                        className="form-control"
                                                        accept=".key,.pem"
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                // Procesar archivo de clave privada
                                                                handleInputChange('integracionAFIP', 'clavePrivada', file.name);
                                                            }
                                                        }}
                                                    />
                                                    {configuracion.integracionAFIP.clavePrivada && (
                                                        <small className="text-success">
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            Clave privada cargada
                                                        </small>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="row">
                                            <div className="col-md-6">
                                                <button 
                                                    className="btn btn-outline-primary"
                                                    onClick={probarConexionAFIP}
                                                >
                                                    <i className="bi bi-wifi me-2"></i>
                                                    Probar Conexión
                                                </button>
                                            </div>
                                            <div className="col-md-6">
                                                {configuracion.integracionAFIP.ultimaSincronizacion && (
                                                    <p className="text-muted">
                                                        <small>
                                                            Última sincronización: {configuracion.integracionAFIP.ultimaSincronizacion}
                                                        </small>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="alert alert-info mt-3">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <strong>Importante:</strong> Para habilitar la integración con AFIP necesita:
                                            <ul className="mb-0 mt-2">
                                                <li>Certificado digital válido (.crt)</li>
                                                <li>Clave privada correspondiente (.key)</li>
                                                <li>CUIT habilitado para facturación electrónica</li>
                                                <li>Punto de venta autorizado por AFIP</li>
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab Plantillas Email */}
                    {tabActiva === 'plantillas' && (
                        <div className="card">
                            <div className="card-header bg-secondary text-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-envelope me-2"></i>
                                    Plantillas de Email
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="mb-4">
                                    <label className="form-label text-dark">Asunto de la Factura</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={configuracion.plantillasEmail.asuntoFactura}
                                        onChange={(e) => handleInputChange('plantillasEmail', 'asuntoFactura', e.target.value)}
                                        placeholder="Factura {{numero}} - {{empresa}}"
                                    />
                                    <small className="text-muted">
                                        Variables disponibles: {{numero}}, {{empresa}}, {{cliente}}, {{fecha}}, {{total}}
                                    </small>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="form-label text-dark">Cuerpo del Email</label>
                                    <textarea
                                        className="form-control"
                                        rows="10"
                                        value={configuracion.plantillasEmail.cuerpoFactura}
                                        onChange={(e) => handleInputChange('plantillasEmail', 'cuerpoFactura', e.target.value)}
                                    />
                                    <small className="text-muted">
                                        Use las variables {{numero}}, {{empresa}}, {{cliente}}, {{fecha}}, {{vencimiento}}, {{total}} para personalizar el mensaje
                                    </small>
                                </div>
                                
                                <div className="card bg-light">
                                    <div className="card-header">
                                        <h6 className="mb-0 text-dark">Vista Previa</h6>
                                    </div>
                                    <div className="card-body">
                                        <strong>Asunto:</strong> {configuracion.plantillasEmail.asuntoFactura.replace('{{numero}}', '0001-00000123').replace('{{empresa}}', configuracion.empresa.razonSocial || 'Mi Empresa')}<br />
                                        <strong>Cuerpo:</strong>
                                        <div className="mt-2" style={{whiteSpace: 'pre-wrap'}}>
                                            {configuracion.plantillasEmail.cuerpoFactura
                                                .replace(/{{numero}}/g, '0001-00000123')
                                                .replace(/{{empresa}}/g, configuracion.empresa.razonSocial || 'Mi Empresa')
                                                .replace(/{{cliente}}/g, 'Cliente Ejemplo')
                                                .replace(/{{fecha}}/g, new Date().toLocaleDateString())
                                                .replace(/{{vencimiento}}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString())
                                                .replace(/{{total}}/g, '$15.000,00')
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Términos y Condiciones */}
                    {tabActiva === 'terminos' && (
                        <div className="card">
                            <div className="card-header bg-dark text-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-file-text me-2"></i>
                                    Términos y Condiciones
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="mb-4">
                                    <label className="form-label text-dark">Texto para Facturas</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={configuracion.terminosCondiciones.textoFactura}
                                        onChange={(e) => handleInputChange('terminosCondiciones', 'textoFactura', e.target.value)}
                                        placeholder="Términos y condiciones que aparecerán en las facturas..."
                                    />
                                    <small className="text-muted">Este texto aparecerá en el pie de todas las facturas</small>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="form-label text-dark">Política de Devolución</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={configuracion.terminosCondiciones.politicaDevolucion}
                                        onChange={(e) => handleInputChange('terminosCondiciones', 'politicaDevolucion', e.target.value)}
                                        placeholder="Política de devolución de productos/servicios..."
                                    />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="form-label text-dark">Garantía</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={configuracion.terminosCondiciones.garantia}
                                        onChange={(e) => handleInputChange('terminosCondiciones', 'garantia', e.target.value)}
                                        placeholder="Términos de garantía..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfiguracionFacturacion;