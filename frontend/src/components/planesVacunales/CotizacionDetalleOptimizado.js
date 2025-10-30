import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { useNotification } from '../../context/NotificationContext';
import * as planesApi from '../../services/planesVacunalesApi';
import { 
  FaFileInvoice, 
  FaEdit, 
  FaCalendarAlt, 
  FaUser, 
  FaClock, 
  FaMoneyBillWave,
  FaFileExport,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaEye,
  FaArrowLeft,
  FaInfoCircle,
  FaCalculator,
  FaBalanceScale,
  FaPaw,
  FaClipboardList,
  FaPrint
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ClasificacionFiscal from '../liquidaciones/ClasificacionFiscalSimple';
import ResumenLiquidacion from '../liquidaciones/ResumenLiquidacionSimple';
import './PlanesVacunales.css';

const CotizacionDetalleOptimizado = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    cotizaciones, 
    cargarCotizaciones, 
    cambiarEstadoCotizacion,
    eliminarCotizacion
  } = usePlanesVacunales();

  const { showError, showSuccess } = useNotification();

  const [cotizacion, setCotizacion] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState({ show: false, accion: null });
  const [observacionesEstado, setObservacionesEstado] = useState('');
  const [mostrarClasificacion, setMostrarClasificacion] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  
  // Refs para mantener la posición en la página
  const clasificacionRef = useRef(null);
  const resumenRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    if (!id) return;
    
    try {
      setLocalLoading(true);
      console.log('Cargando cotización ID:', id);
      
      // Cargar cotización específica con datos completos
      const cotizacionCompleta = await planesApi.getCotizacionById(id);
      console.log('Cotización cargada:', cotizacionCompleta);
      
      setCotizacion(cotizacionCompleta);
      
      if (!cotizacionCompleta) {
        showError('Error', 'No se encontró la cotización solicitada');
        setTimeout(() => navigate('/cotizaciones'), 3000);
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
      showError('Error', 'No se pudo cargar la cotización');
      setTimeout(() => navigate('/cotizaciones'), 3000);
    } finally {
      setLocalLoading(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      'en_proceso': { class: 'bg-warning text-dark', text: 'En Proceso' },
      'enviada': { class: 'bg-info', text: 'Enviada' },
      'aceptada': { class: 'bg-success', text: 'Aceptada' },
      'rechazada': { class: 'bg-danger', text: 'Rechazada' }
    };
    
    const estadoInfo = estados[estado] || { class: 'bg-secondary', text: estado };
    return (
      <span className={`badge ${estadoInfo.class}`}>
        {estadoInfo.text}
      </span>
    );
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    try {
      const datos = { 
        estado: nuevoEstado,
        observaciones: observacionesEstado || null
      };
      
      await cambiarEstadoCotizacion(id, datos);
      
      // Mantener la posición si hay clasificación o resumen abierto
      const scrollPosition = window.pageYOffset;
      
      await cargarDatos();
      
      if (nuevoEstado === 'aceptada') {
        showSuccess('Cotización aceptada exitosamente. Podrás asignar lotes en el calendario.');
      } else {
        showSuccess(`Estado cambiado a ${nuevoEstado} exitosamente`);
      }
      
      // Restaurar posición
      window.scrollTo(0, scrollPosition);
      
      setModalConfirmacion({ show: false, accion: null });
      setObservacionesEstado('');
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      showError(error.response?.data?.error || 'Error al cambiar estado de la cotización');
    }
  };

  const confirmarAccion = async () => {
    const accion = modalConfirmacion.accion;
    
    if (accion === 'eliminar esta cotización') {
      try {
        await eliminarCotizacion(id);
        showSuccess('Cotización eliminada exitosamente');
        navigate('/cotizaciones');
      } catch (error) {
        showError('Error al eliminar la cotización');
      }
    } else if (accion?.includes('cambiar estado a')) {
      const nuevoEstado = accion.split('cambiar estado a ')[1];
      await handleCambiarEstado(nuevoEstado);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No definida';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaCorta = (fecha) => {
    if (!fecha) return 'No definida';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  // Función para cargar el logo
  const cargarLogo = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Usar dimensiones originales del logo
        const width = img.width;
        const height = img.height;
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = '/img/LOGO.PNG';
    });
  };

  // Función para exportar cotización a PDF
  const handleExportarCotizacionPDF = async () => {
    if (!cotizacion) {
      showError('Error', 'No hay datos de cotización para exportar');
      return;
    }

    try {
      setGenerandoPDF(true);
      
      // Cargar logo de la empresa
      const logoDataUrl = await cargarLogo();
      
      // Crear instancia del documento en formato A4 vertical
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configuración del documento
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Colores corporativos
      const primaryColor = [64, 64, 64];
      const secondaryColor = [96, 96, 96];
      const lightGray = [245, 245, 245];
      const accentColor = [128, 128, 128];

      // ENCABEZADO
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, 'F');

      // Logo de la empresa centrado verticalmente
      if (logoDataUrl) {
        const logoWidth = 55;
        const logoHeight = 15; // Mantiene relación aproximada 3.67:1
        const logoY = (35 - logoHeight) / 2; // Centrado vertical en el header de 35mm
        doc.addImage(logoDataUrl, 'PNG', margin, logoY, logoWidth, logoHeight);
      } else {
        // Texto alternativo si no hay logo
        const logoBoxHeight = 18;
        const logoY = (35 - logoBoxHeight) / 2; // Centrado vertical
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, logoY, 55, logoBoxHeight, 'F');
        doc.setTextColor(64, 64, 64);
        doc.setFontSize(9);
        doc.setFont('courier', 'bold');
        doc.text('TERMOPLAST', margin + 27.5, logoY + 6, { align: 'center' });
        doc.text('LOGÍSTICA', margin + 27.5, logoY + 11, { align: 'center' });
        doc.text('VETERINARIA', margin + 27.5, logoY + 16, { align: 'center' });
      }

      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('courier', 'bold');
      doc.text('COTIZACIÓN', pageWidth / 2, 16, { align: 'center' });

      // Subtítulo
      doc.setFontSize(12);
      doc.setFont('courier', 'normal');
      doc.text(`#${cotizacion.numero_cotizacion || cotizacion.id_cotizacion}`, pageWidth / 2, 25, { align: 'center' });

      // ENCABEZADO PROFESIONAL UNIFICADO
      let yPos = 50;
      const infoBoxWidth = pageWidth - 2 * margin;
      const infoBoxHeight = 45;

      // Recuadro principal con toda la información
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, infoBoxWidth, infoBoxHeight, 'F');
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.8);
      doc.rect(margin, yPos, infoBoxWidth, infoBoxHeight, 'S');

      // Título del recuadro
      doc.setFillColor(...accentColor);
      doc.rect(margin, yPos, infoBoxWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('courier', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('DATOS DE LA COTIZACIÓN', pageWidth / 2, yPos + 5.5, { align: 'center' });

      // Información en dos columnas
      const leftColX = margin + 5;
      const rightColX = margin + (infoBoxWidth / 2) + 10;
      const infoY = yPos + 15;
      const labelWidth = 42;

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      
      // Valores columna izquierda - calcular primero para determinar posiciones
      const nombreCliente = cotizacion.cliente?.nombre || 'N/A';
      const emailCliente = cotizacion.cliente?.email || 'No especificado';
      const telefonoCliente = cotizacion.cliente?.telefono || 'No especificado';
      const cantidadPollos = (cotizacion.cantidad_animales || 0).toLocaleString('es-ES');
      
      // Calcular ancho máximo disponible para la columna izquierda (sin invadir columna derecha)
      const maxWidthLeftCol = (infoBoxWidth / 2) - 8; // Dejar margen entre columnas
      
      // Nombre del cliente (puede ocupar múltiples líneas)
      const nombreClienteLineas = doc.splitTextToSize(nombreCliente, maxWidthLeftCol - labelWidth);
      const nombreClienteAltura = nombreClienteLineas.length * 5; // 5mm por línea aproximadamente
      const offsetEmail = Math.max(6, nombreClienteAltura);
      
      // Email
      const emailLineas = doc.splitTextToSize(emailCliente, maxWidthLeftCol - labelWidth);
      const emailAltura = emailLineas.length * 5;
      const offsetTelefono = offsetEmail + Math.max(6, emailAltura);
      
      const offsetCantidad = offsetTelefono + 6;
      
      // Columna izquierda - Labels (con offset dinámico)
      doc.text('CLIENTE:', leftColX, infoY);
      doc.text('EMAIL:', leftColX, infoY + offsetEmail);
      doc.text('TELÉFONO:', leftColX, infoY + offsetTelefono);
      doc.text('CANTIDAD POLLOS:', leftColX, infoY + offsetCantidad);
      
      // Columna derecha - Labels (posición fija)
      doc.text('PLAN VACUNAL:', rightColX, infoY);
      doc.text('DURACIÓN:', rightColX, infoY + 6);
      doc.text('FECHA NACIMIENTO:', rightColX, infoY + 12);
      doc.text('FECHA COTIZACIÓN:', rightColX, infoY + 18);

      // Valores
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      
      // Valores columna izquierda (con offset dinámico)
      doc.text(nombreClienteLineas, leftColX + labelWidth, infoY);
      doc.text(emailLineas, leftColX + labelWidth, infoY + offsetEmail);
      doc.text(telefonoCliente, leftColX + labelWidth, infoY + offsetTelefono);
      doc.text(cantidadPollos, leftColX + labelWidth, infoY + offsetCantidad);
      
      // Valores columna derecha
      const nombrePlan = cotizacion.plan?.nombre || 'Plan para 25000';
      const duracionSemanas = `${cotizacion.plan?.duracion_semanas || 'N/A'} semanas`;
      const fechaNacimiento = cotizacion.fecha_inicio_plan ? new Date(cotizacion.fecha_inicio_plan).toLocaleDateString('es-ES') : 'No especificada';
      const fechaCotizacion = cotizacion.created_at ? new Date(cotizacion.created_at).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
      
      doc.text(nombrePlan.length > 22 ? nombrePlan.substring(0, 22) + '...' : nombrePlan, rightColX + labelWidth, infoY);
      doc.text(duracionSemanas, rightColX + labelWidth, infoY + 6);
      doc.text(fechaNacimiento, rightColX + labelWidth, infoY + 12);
      doc.text(fechaCotizacion, rightColX + labelWidth, infoY + 18);

      // Separador
      yPos += 55;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      // TABLA DE PRODUCTOS
      yPos += 10;

      let tableData = [];
      
      // Usar datos del detalle_productos que ya trae los nombres correctos
      if (cotizacion.detalle_productos && cotizacion.detalle_productos.length > 0) {
        tableData = cotizacion.detalle_productos.map(detalle => {
          const precioUnitario = parseFloat(detalle.precio_unitario || 0);
          const subtotal = parseFloat(detalle.subtotal || 0);
          const totalFrascos = detalle.cantidad_total || 0;

          return [
            detalle.nombre_producto || 'Producto no encontrado',
            totalFrascos.toLocaleString(),
            `$${precioUnitario.toFixed(2)}`,
            `$${subtotal.toLocaleString()}`
          ];
        });
      } else if (cotizacion.detalle_cotizacion && cotizacion.detalle_cotizacion.length > 0) {
        // Fallback: usar detalle_cotizacion si no está detalle_productos
        tableData = cotizacion.detalle_cotizacion.map(detalle => {
          const precioUnitario = parseFloat(detalle.precio_final_calculado || detalle.precio_unitario || 0);
          const subtotal = parseFloat(detalle.subtotal || 0);
          const totalFrascos = detalle.cantidad_total || 0;

          return [
            detalle.producto?.nombre || 'Producto no encontrado',
            totalFrascos.toLocaleString(),
            `$${precioUnitario.toFixed(2)}`,
            `$${subtotal.toLocaleString()}`
          ];
        });
      } else if (cotizacion.plan?.vacunas_plan && cotizacion.plan.vacunas_plan.length > 0) {
        // Último fallback: usar datos del plan de vacunas
        tableData = cotizacion.plan.vacunas_plan.map(vp => {
          const cantidadAnimales = cotizacion.cantidad_animales || 0;
          const dosisNecesarias = cantidadAnimales; // 1 dosis por animal
          const dosisPorFrasco = vp.vacuna?.presentacion?.dosis_por_frasco || 1000;
          const frascosNecesarios = Math.ceil(dosisNecesarias / dosisPorFrasco);
          const precioUnitario = parseFloat(vp.vacuna?.precio_lista || 0);
          const subtotal = frascosNecesarios * precioUnitario;

          return [
            vp.vacuna?.nombre || 'Vacuna no encontrada',
            frascosNecesarios.toLocaleString(),
            `$${precioUnitario.toFixed(2)}`,
            `$${subtotal.toLocaleString()}`
          ];
        });
      }

      // Crear la tabla
      autoTable(doc, {
        startY: yPos,
        head: [['Producto/Vacuna', 'Total Frascos', 'Precio Unit.', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: secondaryColor
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' }
        },
        // Agregar fila del total como parte de la tabla
        foot: cotizacion.precio_total ? [[
          { content: 'TOTAL', colSpan: 3, styles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' } },
          { content: `$${parseFloat(cotizacion.precio_total).toLocaleString()}`, styles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' } }
        ]] : undefined
      });

      // PIE DE PÁGINA
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.setFont('courier', 'bold');
      doc.text('Sistema de Gestión - Tierra Volga', margin, pageHeight - 15);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')} | contacto@tierravolga.com.ar`, margin, pageHeight - 10);
      doc.text('Documento de uso profesional - Prohibida su reproducción sin autorización', margin, pageHeight - 5);
      
      // Descargar el PDF
      const clienteNombre = cotizacion.cliente?.nombre?.replace(/[^a-zA-Z0-9]/g, '-') || 'cliente';
      const numeroCotizacion = cotizacion.numero_cotizacion || cotizacion.id_cotizacion;
      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `cotizacion-${numeroCotizacion}-${clienteNombre}-${fecha}.pdf`;
      
      doc.save(fileName);
      
      showSuccess('Éxito', 'PDF de cotización generado correctamente');
      
    } catch (error) {
      console.error('Error generando PDF de cotización:', error);
      showError('Error', 'No se pudo generar el PDF de la cotización');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const calcularFechaFinalizacion = (fechaInicio, duracionSemanas) => {
    if (!fechaInicio || !duracionSemanas) return null;
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + (duracionSemanas * 7));
    return fecha;
  };

  // Función para hacer scroll suave a la clasificación
  const scrollToClasificacion = () => {
    setMostrarClasificacion(true);
    setTimeout(() => {
      if (clasificacionRef.current) {
        clasificacionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  if (localLoading || !cotizacion) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner"></div>
        <p>Cargando cotización...</p>
      </div>
    );
  }

  const fechaFinalizacion = calcularFechaFinalizacion(
    cotizacion.fecha_inicio_plan, 
    cotizacion.plan?.duracion_semanas
  );

  return (
    <div className="container-fluid py-1">
      {/* Header Compacto */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm me-3"
                onClick={() => navigate('/cotizaciones')}
              >
                <FaArrowLeft />
              </button>
              <div>
                <h4 className="mb-1">Cotización #{cotizacion.id_cotizacion}</h4>
                <small className="text-muted">
                  {cotizacion.numero_cotizacion} • {formatearFechaCorta(cotizacion.created_at)}
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {getEstadoBadge(cotizacion.estado)}
              
              {/* Botón de Imprimir PDF */}
              <button
                className="btn btn-outline-success btn-sm"
                onClick={handleExportarCotizacionPDF}
                disabled={generandoPDF}
                title="Exportar cotización a PDF"
              >
                {generandoPDF ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-1" role="status">
                      <span className="visually-hidden">Generando...</span>
                    </div>
                    PDF...
                  </>
                ) : (
                  <>
                    <FaPrint className="me-1" />
                    PDF
                  </>
                )}
              </button>
              
              {cotizacion.estado === 'en_proceso' && (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                >
                  <FaEdit className="me-1" />
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Principal Optimizado */}
      <div className="row g-3">
        {/* Columna Principal - Información y Acciones */}
        <div className="col-lg-8">
          
          {/* Card Compacta: Información Esencial */}
          <div className="card mb-3 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                {/* Cliente */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaUser className="text-primary me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Cliente</small>
                      <strong className="h6 mb-0">{cotizacion.cliente?.nombre}</strong>
                      {cotizacion.cliente?.cuit && (
                        <small className="text-muted d-block">CUIT: {cotizacion.cliente.cuit}</small>
                      )}
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaPaw className="text-success me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Plan Vacunal</small>
                      <strong className="h6 mb-0">{cotizacion.plan?.nombre}</strong>
                      <small className="text-muted d-block">
                        {cotizacion.cantidad_animales ? `${cotizacion.cantidad_animales} animales` : ''} • {cotizacion.plan?.duracion_semanas} semanas
                      </small>
                    </div>
                  </div>
                </div>

                {/* Fechas */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaCalendarAlt className="text-info me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Período del Plan</small>
                      <strong className="h6 mb-0">{formatearFechaCorta(cotizacion.fecha_inicio_plan)}</strong>
                      <small className="text-muted d-block">hasta {formatearFechaCorta(fechaFinalizacion)}</small>
                    </div>
                  </div>
                </div>

                {/* Precio */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <FaMoneyBillWave className="text-warning me-2 fs-5" />
                    <div>
                      <small className="text-muted d-block">Precio Total</small>
                      <strong className="h5 mb-0 text-success">${cotizacion.precio_total?.toLocaleString()}</strong>
                      {cotizacion.lista_precio && (
                        <small className="text-muted d-block">Lista {cotizacion.lista_precio.tipo}</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones si existen */}
              {cotizacion.observaciones && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex align-items-start">
                    <FaInfoCircle className="text-muted me-2 mt-1" />
                    <div className="flex-grow-1">
                      <small className="text-muted d-block">Observaciones</small>
                      <p className="mb-0 small">{cotizacion.observaciones}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vacunas del Plan - Tabla Compacta */}
          {cotizacion.detalle_productos && cotizacion.detalle_productos.length > 0 && (
            <div className="card mb-3 shadow-sm">
              <div className="card-header py-2">
                <h6 className="mb-0">
                  <FaClipboardList className="me-2" />
                  Vacunas del Plan ({cotizacion.detalle_productos.length})
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Vacuna</th>
                        <th className="text-center">Semana</th>
                        <th className="text-end">Precio</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizacion.detalle_productos.map((detalle, index) => {
                        const subtotal = parseFloat(detalle.subtotal);
                        
                        return (
                          <tr key={index}>
                            <td>
                              <div>
                                <strong className="small">{detalle.nombre_producto}</strong>
                                <small className="text-muted d-block">{detalle.descripcion_producto}</small>
                                {detalle.tipo === 'vacuna' && (
                                  <span className="badge bg-success bg-opacity-10 text-success small">Vacuna</span>
                                )}
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-primary bg-opacity-75 small">
                                {detalle.semana_inicio === detalle.semana_fin ? 
                                  `S${detalle.semana_inicio}` : 
                                  `S${detalle.semana_inicio}-${detalle.semana_fin}`}
                              </span>
                            </td>
                            <td className="text-end small">${parseFloat(detalle.precio_unitario).toLocaleString()}</td>
                            <td className="text-end fw-bold small">${subtotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Clasificación Fiscal */}
          {cotizacion.estado === 'aceptada' && mostrarClasificacion && (
            <div className="card shadow-sm" ref={clasificacionRef}>
              <div className="card-header py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <FaBalanceScale className="me-2" />
                    Clasificación Fiscal
                  </h6>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setMostrarClasificacion(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <ClasificacionFiscal 
                  cotizacionId={cotizacion.id_cotizacion} 
                  onClasificacionCompleta={() => {
                    setMostrarClasificacion(false);
                    cargarDatos();
                  }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Derecho - Acciones y Estado */}
        <div className="col-lg-4">
          
          {/* Card de Acciones Principales */}
          <div className="card mb-3 shadow-sm" style={{ position: 'sticky', top: '80px', zIndex: 999 }}>
            <div className="card-header py-2">
              <h6 className="mb-0">
                <FaCalculator className="me-2" />
                Acciones
              </h6>
            </div>
            <div className="card-body">
              
              {/* Estado y Precio Destacados */}
              <div className="text-center mb-3 p-2 bg-light rounded">
                <div className="mb-2">{getEstadoBadge(cotizacion.estado)}</div>
                <div className="h4 text-success mb-0">${cotizacion.precio_total?.toLocaleString()}</div>
                <small className="text-muted">
                  {cotizacion.lista_precio ? `Lista ${cotizacion.lista_precio.tipo}` : 'Sin lista aplicada'}
                </small>
              </div>
              
              {/* Acciones por Estado */}
              <div className="d-grid gap-2">
                {cotizacion.estado === 'en_proceso' && (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleCambiarEstado('enviada')}
                    >
                      <FaFileExport className="me-1" />
                      Enviar al Cliente
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                    >
                      <FaEdit className="me-1" />
                      Editar
                    </button>
                  </>
                )}

                {cotizacion.estado === 'enviada' && (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleCambiarEstado('aceptada')}
                    >
                      <FaCheck className="me-1" />
                      Marcar Aceptada
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCambiarEstado('rechazada')}
                    >
                      <FaTimes className="me-1" />
                      Marcar Rechazada
                    </button>
                    <hr className="my-2" />
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                    >
                      <FaEdit className="me-1" />
                      Editar
                    </button>
                  </>
                )}

                {cotizacion.estado === 'aceptada' && (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/planes-vacunales/calendario/${id}`)}
                    >
                      <FaCalendarAlt className="me-1" />
                      Ver Calendario
                    </button>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={scrollToClasificacion}
                    >
                      <FaBalanceScale className="me-1" />
                      Clasificar para Facturación
                    </button>
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => setMostrarResumen(true)}
                    >
                      <FaFileInvoice className="me-1" />
                      Resumen de Liquidación
                    </button>
                  </>
                )}

                {cotizacion.estado === 'rechazada' && (
                  <div className="alert alert-danger alert-sm mb-0 text-center">
                    <FaTimes className="me-1" />
                    Cotización Rechazada
                  </div>
                )}

                {/* Acción de Eliminar */}
                <hr className="my-2" />
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setModalConfirmacion({
                    show: true,
                    accion: 'eliminar esta cotización'
                  })}
                >
                  <FaTimes className="me-1" />
                  Eliminar
                </button>
              </div>

            </div>
          </div>

          {/* Card de Información Adicional */}
          <div className="card shadow-sm">
            <div className="card-header py-2">
              <h6 className="mb-0">
                <FaClock className="me-2" />
                Información
              </h6>
            </div>
            <div className="card-body">
              
              {/* Validez */}
              <div className="mb-3">
                <small className="text-muted d-block">Validez</small>
                <div className="fw-bold small">
                  {cotizacion.fecha_validez ? 
                    formatearFechaCorta(cotizacion.fecha_validez) : 
                    '30 días desde creación'
                  }
                </div>
              </div>

              {/* Timeline Compacto */}
              <div className="timeline-compact">
                <div className="timeline-item">
                  <div className="timeline-dot bg-primary"></div>
                  <div className="timeline-content">
                    <small className="text-muted">Creada</small>
                    <div className="fw-bold small">{formatearFechaCorta(cotizacion.created_at)}</div>
                  </div>
                </div>

                {cotizacion.fecha_envio && (
                  <div className="timeline-item">
                    <div className="timeline-dot bg-info"></div>
                    <div className="timeline-content">
                      <small className="text-muted">Enviada</small>
                      <div className="fw-bold small">{formatearFechaCorta(cotizacion.fecha_envio)}</div>
                    </div>
                  </div>
                )}

                {cotizacion.fecha_aceptacion && (
                  <div className="timeline-item">
                    <div className="timeline-dot bg-success"></div>
                    <div className="timeline-content">
                      <small className="text-muted">Aceptada</small>
                      <div className="fw-bold small">{formatearFechaCorta(cotizacion.fecha_aceptacion)}</div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Modal de Resumen de Liquidación */}
      {mostrarResumen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resumen de Liquidación</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarResumen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <ResumenLiquidacion 
                  cotizacionId={cotizacion.id_cotizacion} 
                  onClose={() => setMostrarResumen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {modalConfirmacion.show && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Acción</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalConfirmacion({ show: false, accion: null })}
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que quieres {modalConfirmacion.accion}?</p>
                {modalConfirmacion.accion?.includes('eliminar') && (
                  <div className="alert alert-warning">
                    <FaExclamationTriangle className="me-2" />
                    Esta acción no se puede deshacer.
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Observaciones (opcional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={observacionesEstado}
                    onChange={(e) => setObservacionesEstado(e.target.value)}
                    placeholder="Agrega observaciones sobre este cambio..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalConfirmacion({ show: false, accion: null })}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmarAccion}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CotizacionDetalleOptimizado;