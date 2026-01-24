import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { useNotification } from '../../context/NotificationContext';
import * as planesApi from '../../services/planesVacunalesApi';
import { 
  FaFileInvoice, 
  FaEdit, 
  FaFileExport,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaArrowLeft,
  FaPrint,
  FaDownload,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaBalanceScale,
  FaEye
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
  
  // Estados para el panel de remitos
  const [remitos, setRemitos] = useState([]);
  const [loadingRemitos, setLoadingRemitos] = useState(false);
  const [generandoRemitoPDF, setGenerandoRemitoPDF] = useState(null);
  const [panelRemitosExpandido, setPanelRemitosExpandido] = useState(false);
  const [modalDetalleRemito, setModalDetalleRemito] = useState({ show: false, remito: null });
  
  // Estados para UI colapsables - solo cliente desplegado al inicio
  const [seccionExpandida, setSeccionExpandida] = useState({
    cliente: true,
    plan: false,
    vacunas: false
  });
  
  // Refs para mantener la posición en la página
  const clasificacionRef = useRef(null);
  const resumenRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  useEffect(() => {
    if (cotizacion && cotizacion.estado === 'aceptada') {
      cargarRemitos();
    }
  }, [cotizacion]);

  const cargarRemitos = async () => {
    try {
      setLoadingRemitos(true);
      const response = await fetch(`/documentos?id_cotizacion=${id}&tipo_documento=remito_entrega&limit=50`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRemitos(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando remitos:', error);
    } finally {
      setLoadingRemitos(false);
    }
  };

  const handleReimprimirRemito = async (documento) => {
    setGenerandoRemitoPDF(documento.id_documento);
    try {
      let url = '';
      let filename = '';
      
      if (documento.datos_snapshot) {
        url = `/documentos/${documento.id_documento}/reimprimir`;
        filename = `${documento.numero_documento}.pdf`;
      } else if (documento.id_calendario) {
        url = `/cotizaciones/calendario/${documento.id_calendario}/remito`;
        filename = `remito-${documento.numero_documento}.pdf`;
      }

      if (!url) {
        throw new Error('No se puede reimprimir este documento');
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

    } catch (error) {
      console.error('Error reimprimiendo remito:', error);
      showError('Error', 'No se pudo reimprimir el remito');
    } finally {
      setGenerandoRemitoPDF(null);
    }
  };

  const handleVerDetalleRemito = (remito) => {
    setModalDetalleRemito({ show: true, remito });
  };

  const cerrarModalDetalleRemito = () => {
    setModalDetalleRemito({ show: false, remito: null });
  };

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
      'en_proceso': { class: 'cotizacion-estado-badge cotizacion-estado-proceso', text: 'En Proceso' },
      'enviada': { class: 'cotizacion-estado-badge cotizacion-estado-enviada', text: 'Enviada' },
      'aceptada': { class: 'cotizacion-estado-badge cotizacion-estado-aceptada', text: 'Aceptada' },
      'rechazada': { class: 'cotizacion-estado-badge cotizacion-estado-rechazada', text: 'Rechazada' }
    };
    
    const estadoInfo = estados[estado] || { class: 'cotizacion-estado-badge', text: estado };
    
    return (
      <span className={estadoInfo.class}>
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
    
    try {
      // Si ya viene en formato string YYYY-MM-DD, formatear directamente
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [year, month, day] = fecha.split('-');
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`;
      }
      
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      // Usar métodos UTC
      const day = dateObj.getUTCDate();
      const month = dateObj.getUTCMonth();
      const year = dateObj.getUTCFullYear();
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      
      return `${day} de ${meses[month]} de ${year}`;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Error en fecha';
    }
  };

  const formatearFechaCorta = (fecha) => {
    if (!fecha) return 'No definida';
    
    try {
      // Si ya viene en formato string YYYY-MM-DD, formatear directamente
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [year, month, day] = fecha.split('-');
        return `${day}/${month}/${year}`;
      }
      
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      // Usar métodos UTC para evitar problemas de timezone
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const year = dateObj.getUTCFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Error en fecha';
    }
  };

  const formatearFechaHora = (fecha) => {
    if (!fecha) return '-';
    try {
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) return '-';
      
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const year = dateObj.getUTCFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  // Función para cargar el logo
  const cargarLogo = () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        ctx.drawImage(this, 0, 0);
        // Retornar dataURL junto con dimensiones originales
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: this.naturalWidth,
          height: this.naturalHeight,
          ratio: this.naturalWidth / this.naturalHeight
        });
      };
      img.onerror = () => {
        console.warn('No se pudo cargar logo.png, intentando Logo blanco.png');
        // Fallback al logo blanco
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = function() {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = this.naturalWidth;
          canvas.height = this.naturalHeight;
          ctx.drawImage(this, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width: this.naturalWidth,
            height: this.naturalHeight,
            ratio: this.naturalWidth / this.naturalHeight
          });
        };
        fallbackImg.onerror = () => {
          console.warn('No se pudo cargar ningún logo');
          resolve(null);
        };
        fallbackImg.src = '/img/Logo blanco.png';
      };
      // Intentar cargar logo.png primero
      img.src = '/img/logo.png';
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
      const logoData = await cargarLogo();
      
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

      // Colores corporativos - Bordó
      const primaryColor = [125, 12, 10]; // #7D0C0A
      const secondaryColor = [96, 96, 96];
      const lightGray = [245, 245, 245];
      const accentColor = [158, 15, 13]; // Bordó más claro para acentos

      // ENCABEZADO
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, 'F');

      // Logo de la empresa centrado verticalmente
      if (logoData) {
        try {
          // Calcular dimensiones manteniendo la proporción real del logo
          const maxLogoHeight = 15;
          const maxLogoWidth = 55;
          
          let logoWidth, logoHeight;
          
          // Calcular dimensiones respetando la proporción real
          if (logoData.ratio > (maxLogoWidth / maxLogoHeight)) {
            // Logo más ancho que alto - limitar por ancho
            logoWidth = maxLogoWidth;
            logoHeight = maxLogoWidth / logoData.ratio;
          } else {
            // Logo más alto que ancho - limitar por alto
            logoHeight = maxLogoHeight;
            logoWidth = maxLogoHeight * logoData.ratio;
          }
          
          const logoY = (35 - logoHeight) / 2; // Centrado vertical en el header de 35mm
          doc.addImage(logoData.dataUrl, 'PNG', margin, logoY, logoWidth, logoHeight, undefined, 'FAST');
          
          console.log(`Logo cargado en cotización: ${logoData.width}x${logoData.height}, ratio: ${logoData.ratio.toFixed(2)}`);
        } catch (error) {
          console.warn('Error al renderizar logo:', error);
          // Fallback a texto si hay error
          const logoBoxHeight = 18;
          const logoY = (35 - logoBoxHeight) / 2;
          doc.setFillColor(255, 255, 255);
          doc.rect(margin, logoY, 55, logoBoxHeight, 'F');
          doc.setTextColor(64, 64, 64);
          doc.setFontSize(9);
          doc.setFont('courier', 'bold');
          doc.text('TERMOPLAST', margin + 27.5, logoY + 6, { align: 'center' });
          doc.text('LOGÍSTICA', margin + 27.5, logoY + 11, { align: 'center' });
          doc.text('VETERINARIA', margin + 27.5, logoY + 16, { align: 'center' });
        }
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
      doc.text('CANTIDAD AVES:', leftColX, infoY + offsetCantidad);
      
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
      const fechaNacimiento = formatearFechaCorta(cotizacion.fecha_inicio_plan);
      const fechaCotizacion = cotizacion.created_at ? formatearFechaCorta(cotizacion.created_at) : formatearFechaCorta(new Date().toISOString().split('T')[0]);
      
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

      // Leyenda de precios justo debajo de la tabla
      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Los precios están expresados en pesos argentinos y no incluyen IVA', pageWidth - margin, finalY + 6, { align: 'right' });

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
      <div className="cotizacion-loading-container">
        <div className="cotizacion-loading-spinner"></div>
        <p className="cotizacion-loading-text">Cargando cotización...</p>
      </div>
    );
  }

  const fechaFinalizacion = calcularFechaFinalizacion(
    cotizacion.fecha_inicio_plan, 
    cotizacion.plan?.duracion_semanas
  );

  return (
    <div className="cotizacion-detalle-container">
      {/* Header Principal Mejorado */}
      <div className="cotizacion-header-card">
        <div className="cotizacion-header-content">
          <div className="cotizacion-header-left">
            <button
              className="cotizacion-back-btn"
              onClick={() => navigate('/cotizaciones')}
              title="Volver a cotizaciones"
            >
              <FaArrowLeft />
            </button>
            <div className="cotizacion-header-info">
              <div className="cotizacion-header-title">
                <h2>Cotización #{cotizacion.id_cotizacion}</h2>
                {getEstadoBadge(cotizacion.estado)}
              </div>
              <div className="cotizacion-header-subtitle">
                <span className="cotizacion-numero">{cotizacion.numero_cotizacion}</span>
                <span className="cotizacion-separator">•</span>
                <span className="cotizacion-fecha">{formatearFechaCorta(cotizacion.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="cotizacion-header-right">
            <div className="cotizacion-header-precio">
              <span className="cotizacion-precio-label">Total</span>
              <span className="cotizacion-precio-valor">${cotizacion.precio_total?.toLocaleString()}</span>
              {cotizacion.lista_precio && (
                <span className="cotizacion-lista-badge">Lista {cotizacion.lista_precio.tipo}</span>
              )}
            </div>
            <button
              className="cotizacion-pdf-btn"
              onClick={handleExportarCotizacionPDF}
              disabled={generandoPDF}
              title="Exportar cotización a PDF"
            >
              {generandoPDF ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  Generando...
                </>
              ) : (
                <>
                  <FaPrint className="me-2" />
                  Exportar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="cotizacion-layout">
        {/* Columna Principal - Información */}
        <div className="cotizacion-main-column">
          
          {/* Card Cliente */}
          <div className="cotizacion-info-card">
            <div 
              className="cotizacion-card-header"
              onClick={() => setSeccionExpandida(prev => ({ ...prev, cliente: !prev.cliente }))}
            >
              <div className="cotizacion-card-header-left">
                <h3>Información del Cliente</h3>
              </div>
              <button className="cotizacion-expand-btn">
                {seccionExpandida.cliente ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
            {seccionExpandida.cliente && (
              <div className="cotizacion-card-body">
                <div className="cotizacion-cliente-grid">
                  <div className="cotizacion-cliente-item principal">
                    <div className="cotizacion-item-content">
                      <span className="cotizacion-item-label">Nombre / Razón Social</span>
                      <span className="cotizacion-item-value destacado">{cotizacion.cliente?.nombre || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="cotizacion-cliente-item">
                    <div className="cotizacion-item-content">
                      <span className="cotizacion-item-label">CUIT</span>
                      <span className="cotizacion-item-value">{cotizacion.cliente?.cuit || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="cotizacion-cliente-item">
                    <div className="cotizacion-item-content">
                      <span className="cotizacion-item-label">Email</span>
                      <span className="cotizacion-item-value">{cotizacion.cliente?.email || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="cotizacion-cliente-item">
                    <div className="cotizacion-item-content">
                      <span className="cotizacion-item-label">Teléfono</span>
                      <span className="cotizacion-item-value">{cotizacion.cliente?.telefono || 'No especificado'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Plan Vacunal */}
          <div className="cotizacion-info-card">
            <div 
              className="cotizacion-card-header"
              onClick={() => setSeccionExpandida(prev => ({ ...prev, plan: !prev.plan }))}
            >
              <div className="cotizacion-card-header-left">
                <h3>Plan Vacunal</h3>
              </div>
              <button className="cotizacion-expand-btn">
                {seccionExpandida.plan ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
            {seccionExpandida.plan && (
              <div className="cotizacion-card-body">
                <div className="cotizacion-plan-grid">
                  <div className="cotizacion-plan-item destacado">
                    <div className="cotizacion-plan-content">
                      <span className="cotizacion-plan-label">Plan</span>
                      <span className="cotizacion-plan-value">{cotizacion.plan?.nombre || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="cotizacion-plan-stats">
                    <div className="cotizacion-stat-item">
                      <div className="cotizacion-stat-content">
                        <span className="cotizacion-stat-value">{cotizacion.cantidad_animales?.toLocaleString() || '0'}</span>
                        <span className="cotizacion-stat-label">Animales</span>
                      </div>
                    </div>
                    <div className="cotizacion-stat-item">
                      <div className="cotizacion-stat-content">
                        <span className="cotizacion-stat-value">{cotizacion.plan?.duracion_semanas || '0'}</span>
                        <span className="cotizacion-stat-label">Semanas</span>
                      </div>
                    </div>
                    <div className="cotizacion-stat-item">
                      <div className="cotizacion-stat-content">
                        <span className="cotizacion-stat-value">{cotizacion.detalle_productos?.length || '0'}</span>
                        <span className="cotizacion-stat-label">Vacunas</span>
                      </div>
                    </div>
                  </div>
                  <div className="cotizacion-fechas-row">
                    <div className="cotizacion-fecha-item">
                      <div className="cotizacion-fecha-content">
                        <span className="cotizacion-fecha-label">Inicio</span>
                        <span className="cotizacion-fecha-value">{formatearFechaCorta(cotizacion.fecha_inicio_plan)}</span>
                      </div>
                    </div>
                    <div className="cotizacion-fecha-divider">
                      <div className="cotizacion-fecha-line"></div>
                      <span className="cotizacion-fecha-duracion">{cotizacion.plan?.duracion_semanas} sem</span>
                      <div className="cotizacion-fecha-line"></div>
                    </div>
                    <div className="cotizacion-fecha-item">
                      <div className="cotizacion-fecha-content">
                        <span className="cotizacion-fecha-label">Finalización</span>
                        <span className="cotizacion-fecha-value">{formatearFechaCorta(fechaFinalizacion)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Vacunas del Plan */}
          {cotizacion.detalle_productos && cotizacion.detalle_productos.length > 0 && (
            <div className="cotizacion-info-card">
              <div 
                className="cotizacion-card-header"
                onClick={() => setSeccionExpandida(prev => ({ ...prev, vacunas: !prev.vacunas }))}
              >
                <div className="cotizacion-card-header-left">
                  <h3>Vacunas del Plan</h3>
                  <span className="cotizacion-badge-count">{cotizacion.detalle_productos.length}</span>
                </div>
                <button className="cotizacion-expand-btn">
                  {seccionExpandida.vacunas ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
              {seccionExpandida.vacunas && (
                <div className="cotizacion-card-body p-0">
                  <div className="cotizacion-vacunas-table-container">
                    <table className="cotizacion-vacunas-table">
                      <thead>
                        <tr>
                          <th>Vacuna</th>
                          <th className="text-center">Semana</th>
                          <th className="text-end">Precio Unit.</th>
                          <th className="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cotizacion.detalle_productos.map((detalle, index) => {
                          const subtotal = parseFloat(detalle.subtotal);
                          
                          return (
                            <tr key={index}>
                              <td>
                                <div className="cotizacion-vacuna-info">
                                  <span className="cotizacion-vacuna-nombre">{detalle.nombre_producto}</span>
                                  <span className="cotizacion-vacuna-desc">{detalle.descripcion_producto}</span>
                                  {detalle.tipo === 'vacuna' && (
                                    <span className="cotizacion-tipo-badge">Vacuna</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="cotizacion-semana-badge">
                                  {detalle.semana_inicio === detalle.semana_fin ? 
                                    `S${detalle.semana_inicio}` : 
                                    `S${detalle.semana_inicio}-${detalle.semana_fin}`}
                                </span>
                              </td>
                              <td className="text-end cotizacion-precio">${parseFloat(detalle.precio_unitario).toLocaleString()}</td>
                              <td className="text-end cotizacion-subtotal">${subtotal.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="cotizacion-total-row">
                          <td colSpan="3" className="text-end">
                            <strong>Total</strong>
                          </td>
                          <td className="text-end">
                            <strong className="cotizacion-total-valor">${cotizacion.precio_total?.toLocaleString()}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones si existen */}
          {cotizacion.observaciones && (
            <div className="cotizacion-info-card cotizacion-observaciones-card">
              <div className="cotizacion-card-header">
                <div className="cotizacion-card-header-left">
                  <div className="cotizacion-card-icon observaciones">
                    <FaInfoCircle />
                  </div>
                  <h3>Observaciones</h3>
                </div>
              </div>
              <div className="cotizacion-card-body">
                <p className="cotizacion-observaciones-text">{cotizacion.observaciones}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Remitos, Acciones e Información */}
        <div className="cotizacion-sidebar">
          
          {/* Card de Remitos de Entregas - Arriba de Acciones */}
          {cotizacion.estado === 'aceptada' && (
            <div className="cotizacion-sidebar-card cotizacion-remitos-card">
              <div 
                className="cotizacion-sidebar-header clickable"
                onClick={() => setPanelRemitosExpandido(!panelRemitosExpandido)}
              >
                <div className="cotizacion-sidebar-header-left">
                  <h4>Remitos de Entregas</h4>
                  {remitos.length > 0 && (
                    <span className="cotizacion-remitos-count">{remitos.length}</span>
                  )}
                </div>
                <button className="cotizacion-expand-btn">
                  {panelRemitosExpandido ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
              {panelRemitosExpandido && (
                <div className="cotizacion-sidebar-body">
                  {loadingRemitos ? (
                    <div className="cotizacion-remitos-loading">
                      <div className="spinner-border spinner-border-sm" role="status"></div>
                      <span>Cargando remitos...</span>
                    </div>
                  ) : remitos.length === 0 ? (
                    <div className="cotizacion-remitos-empty">
                      <p>No hay remitos generados</p>
                      <small>Los remitos aparecerán aquí cuando se realicen entregas desde el calendario</small>
                    </div>
                  ) : (
                    <div className="cotizacion-remitos-list">
                      {remitos.map((remito) => (
                        <div key={remito.id_documento} className="cotizacion-remito-item">
                          <div className="cotizacion-remito-info">
                            <div className="cotizacion-remito-header">
                              <span className="cotizacion-remito-numero">{remito.numero_documento}</span>
                            </div>
                            <div className="cotizacion-remito-fecha">
                              <span>{formatearFechaHora(remito.fecha_emision)}</span>
                            </div>
                            {remito.total_impresiones > 1 && (
                              <div className="cotizacion-remito-impresiones">
                                <span>{remito.total_impresiones} impresiones</span>
                              </div>
                            )}
                          </div>
                          <div className="cotizacion-remito-actions">
                            <button
                              className="cotizacion-remito-btn view"
                              onClick={() => handleVerDetalleRemito(remito)}
                              title="Ver detalle"
                            >
                              <FaEye />
                            </button>
                            <button
                              className="cotizacion-remito-btn download"
                              onClick={() => handleReimprimirRemito(remito)}
                              disabled={generandoRemitoPDF === remito.id_documento}
                              title="Descargar PDF"
                            >
                              {generandoRemitoPDF === remito.id_documento ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <FaDownload />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card de Acciones */}
          <div className="cotizacion-sidebar-card cotizacion-acciones-card">
            <div className="cotizacion-sidebar-header">
              <h4>Acciones</h4>
            </div>
            <div className="cotizacion-sidebar-body">
              
              {/* Estado y Precio Destacados */}
              <div className="cotizacion-estado-resumen">
                {getEstadoBadge(cotizacion.estado)}
                <div className="cotizacion-precio-grande">${cotizacion.precio_total?.toLocaleString()}</div>
                <span className="cotizacion-lista-info">
                  {cotizacion.lista_precio ? `Lista ${cotizacion.lista_precio.tipo}` : 'Sin lista aplicada'}
                </span>
              </div>
              
              {/* Acciones por Estado */}
              <div className="cotizacion-acciones-grid">
                {cotizacion.estado === 'en_proceso' && (
                  <>
                    <button
                      className="cotizacion-accion-btn primary"
                      onClick={() => handleCambiarEstado('enviada')}
                    >
                      <FaFileExport />
                      <span>Enviar al Cliente</span>
                    </button>
                    <button
                      className="cotizacion-accion-btn secondary"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                    >
                      <FaEdit />
                      <span>Editar</span>
                    </button>
                  </>
                )}

                {cotizacion.estado === 'enviada' && (
                  <>
                    <button
                      className="cotizacion-accion-btn success"
                      onClick={() => handleCambiarEstado('aceptada')}
                    >
                      <FaCheck />
                      <span>Marcar Aceptada</span>
                    </button>
                    <button
                      className="cotizacion-accion-btn danger"
                      onClick={() => handleCambiarEstado('rechazada')}
                    >
                      <FaTimes />
                      <span>Marcar Rechazada</span>
                    </button>
                    <button
                      className="cotizacion-accion-btn secondary"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                    >
                      <FaEdit />
                      <span>Editar</span>
                    </button>
                  </>
                )}

                {cotizacion.estado === 'aceptada' && (
                  <>
                    <button
                      className="cotizacion-accion-btn primary"
                      onClick={() => navigate(`/planes-vacunales/calendario/${id}`)}
                    >
                      <FaCalendarAlt />
                      <span>Ver Calendario</span>
                    </button>
                    <button
                      className="cotizacion-accion-btn warning"
                      onClick={scrollToClasificacion}
                    >
                      <FaBalanceScale />
                      <span>Clasificar para Facturación</span>
                    </button>
                    <button
                      className="cotizacion-accion-btn info"
                      onClick={() => setMostrarResumen(true)}
                    >
                      <FaFileInvoice />
                      <span>Resumen de Liquidación</span>
                    </button>
                  </>
                )}

                {cotizacion.estado === 'rechazada' && (
                  <div className="cotizacion-estado-rechazada">
                    <FaTimes />
                    <span>Cotización Rechazada</span>
                  </div>
                )}

                {/* Acción de Eliminar */}
                <button
                  className="cotizacion-accion-btn delete"
                  onClick={() => setModalConfirmacion({
                    show: true,
                    accion: 'eliminar esta cotización'
                  })}
                >
                  <FaTimes />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card de Información */}
          <div className="cotizacion-sidebar-card cotizacion-info-sidebar-card">
            <div className="cotizacion-sidebar-header">
              <h4>Información</h4>
            </div>
            <div className="cotizacion-sidebar-body">
              
              {/* Validez */}
              <div className="cotizacion-info-item">
                <span className="cotizacion-info-label">Validez</span>
                <span className="cotizacion-info-value">
                  {cotizacion.fecha_validez ? 
                    formatearFechaCorta(cotizacion.fecha_validez) : 
                    '30 días desde creación'
                  }
                </span>
              </div>

              {/* Timeline Mejorado */}
              <div className="cotizacion-timeline">
                <div className="cotizacion-timeline-item">
                  <div className="cotizacion-timeline-dot creada"></div>
                  <div className="cotizacion-timeline-content">
                    <span className="cotizacion-timeline-label">Creada</span>
                    <span className="cotizacion-timeline-date">{formatearFechaCorta(cotizacion.created_at)}</span>
                  </div>
                </div>

                {cotizacion.fecha_envio && (
                  <div className="cotizacion-timeline-item">
                    <div className="cotizacion-timeline-dot enviada"></div>
                    <div className="cotizacion-timeline-content">
                      <span className="cotizacion-timeline-label">Enviada</span>
                      <span className="cotizacion-timeline-date">{formatearFechaCorta(cotizacion.fecha_envio)}</span>
                    </div>
                  </div>
                )}

                {cotizacion.fecha_aceptacion && (
                  <div className="cotizacion-timeline-item">
                    <div className="cotizacion-timeline-dot aceptada"></div>
                    <div className="cotizacion-timeline-content">
                      <span className="cotizacion-timeline-label">Aceptada</span>
                      <span className="cotizacion-timeline-date">{formatearFechaCorta(cotizacion.fecha_aceptacion)}</span>
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
        <div className="liquidacion-modal-overlay">
          <div className="liquidacion-modal-container">
            <div className="liquidacion-modal-header">
              {<h5 className="liquidacion-modal-title"></h5>}
              <button
                type="button"
                className="liquidacion-modal-close"
                onClick={() => setMostrarResumen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="liquidacion-modal-body">
              <ResumenLiquidacion 
                cotizacionId={cotizacion.id_cotizacion} 
                onClose={() => setMostrarResumen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Clasificación Fiscal */}
      {mostrarClasificacion && (
        <div className="liquidacion-modal-overlay">
          <div className="liquidacion-modal-container">
            <div className="liquidacion-modal-header">
              <h5 className="liquidacion-modal-title"></h5>
              <button
                type="button"
                className="liquidacion-modal-close"
                onClick={() => setMostrarClasificacion(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="liquidacion-modal-body">
              <ClasificacionFiscal 
                cotizacionId={cotizacion.id_cotizacion} 
                onClasificacionCompleta={() => {
                  setMostrarClasificacion(false);
                  cargarDatos();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {modalConfirmacion.show && (
        <div className="cotizacion-modal-overlay">
          <div className="cotizacion-modal">
            <div className="cotizacion-modal-header">
              <h5>Confirmar Acción</h5>
              <button
                type="button"
                className="cotizacion-modal-close"
                onClick={() => setModalConfirmacion({ show: false, accion: null })}
              >
                ×
              </button>
            </div>
            <div className="cotizacion-modal-body">
              <p>¿Estás seguro de que quieres {modalConfirmacion.accion}?</p>
              {modalConfirmacion.accion?.includes('eliminar') && (
                <div className="cotizacion-modal-warning">
                  <FaExclamationTriangle />
                  <span>Esta acción no se puede deshacer.</span>
                </div>
              )}
              <div className="cotizacion-modal-textarea">
                <label>Observaciones (opcional)</label>
                <textarea
                  value={observacionesEstado}
                  onChange={(e) => setObservacionesEstado(e.target.value)}
                  placeholder="Agrega observaciones sobre este cambio..."
                />
              </div>
            </div>
            <div className="cotizacion-modal-footer">
              <button
                className="cotizacion-modal-btn cancel"
                onClick={() => setModalConfirmacion({ show: false, accion: null })}
              >
                Cancelar
              </button>
              <button
                className="cotizacion-modal-btn confirm"
                onClick={confirmarAccion}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle del Remito */}
      {modalDetalleRemito.show && modalDetalleRemito.remito && (
        <div className="cotizacion-modal-overlay" onClick={cerrarModalDetalleRemito}>
          <div className="cotizacion-modal remito-detalle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cotizacion-modal-header">
              <h3>Detalle del Remito</h3>
              <button className="cotizacion-modal-close" onClick={cerrarModalDetalleRemito}>
                ×
              </button>
            </div>
            <div className="cotizacion-modal-body">
              {/* Layout en 2 columnas */}
              <div className="remito-detalle-grid">
                {/* Columna Izquierda */}
                <div className="remito-detalle-columna">
                  {/* Información del Remito */}
                  <div className="remito-detalle-card">
                    <h4 className="remito-detalle-card-title">Remito</h4>
                    <div className="remito-detalle-card-body">
                      <div className="remito-detalle-row">
                        <span className="remito-detalle-label">Número</span>
                        <span className="remito-detalle-value destacado">{modalDetalleRemito.remito.numero_documento}</span>
                      </div>
                      <div className="remito-detalle-row">
                        <span className="remito-detalle-label">Emisión</span>
                        <span className="remito-detalle-value">{formatearFechaHora(modalDetalleRemito.remito.fecha_emision)}</span>
                      </div>
                      <div className="remito-detalle-row">
                        <span className="remito-detalle-label">Impresiones</span>
                        <span className="remito-detalle-value">{modalDetalleRemito.remito.total_impresiones || 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cliente */}
                  {modalDetalleRemito.remito.datos_snapshot?.cliente && (
                    <div className="remito-detalle-card">
                      <h4 className="remito-detalle-card-title">Cliente</h4>
                      <div className="remito-detalle-card-body">
                        <div className="remito-detalle-row">
                          <span className="remito-detalle-label">Nombre</span>
                          <span className="remito-detalle-value">{modalDetalleRemito.remito.datos_snapshot.cliente.nombre || modalDetalleRemito.remito.datos_snapshot.cliente}</span>
                        </div>
                        {modalDetalleRemito.remito.datos_snapshot.cliente.cuit && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">CUIT</span>
                            <span className="remito-detalle-value">{modalDetalleRemito.remito.datos_snapshot.cliente.cuit}</span>
                          </div>
                        )}
                        {modalDetalleRemito.remito.datos_snapshot.cliente.direccion && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">Dirección</span>
                            <span className="remito-detalle-value">{modalDetalleRemito.remito.datos_snapshot.cliente.direccion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entrega */}
                  {(modalDetalleRemito.remito.datos_snapshot?.plan || modalDetalleRemito.remito.datos_snapshot?.entrega) && (
                    <div className="remito-detalle-card">
                      <h4 className="remito-detalle-card-title">Entrega</h4>
                      <div className="remito-detalle-card-body">
                        {modalDetalleRemito.remito.datos_snapshot.plan?.numeroSemana && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">Semana</span>
                            <span className="remito-detalle-value">Semana {modalDetalleRemito.remito.datos_snapshot.plan.numeroSemana}</span>
                          </div>
                        )}
                        {modalDetalleRemito.remito.datos_snapshot.entrega?.fechaEntrega && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">Fecha</span>
                            <span className="remito-detalle-value">{formatearFechaCorta(modalDetalleRemito.remito.datos_snapshot.entrega.fechaEntrega)}</span>
                          </div>
                        )}
                        {modalDetalleRemito.remito.datos_snapshot.entrega?.tipoEntrega && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">Tipo</span>
                            <span className="remito-detalle-value" style={{textTransform: 'capitalize'}}>{modalDetalleRemito.remito.datos_snapshot.entrega.tipoEntrega}</span>
                          </div>
                        )}
                        {modalDetalleRemito.remito.datos_snapshot.entrega?.responsable_entrega && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">Entregó</span>
                            <span className="remito-detalle-value">{modalDetalleRemito.remito.datos_snapshot.entrega.responsable_entrega}</span>
                          </div>
                        )}
                        {modalDetalleRemito.remito.datos_snapshot.entrega?.responsable_recibe && (
                          <div className="remito-detalle-row">
                            <span className="remito-detalle-label">Recibió</span>
                            <span className="remito-detalle-value">{modalDetalleRemito.remito.datos_snapshot.entrega.responsable_recibe}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha */}
                <div className="remito-detalle-columna">
                  {/* Detalle de Vacunas - Lógica unificada para todas las entregas */}
                  {modalDetalleRemito.remito.datos_snapshot?.producto && (
                    <div className="remito-detalle-card">
                      <h4 className="remito-detalle-card-title">Detalle de Vacunas Entregadas</h4>
                      <div className="remito-detalle-card-body p-0">
                        <table className="remito-detalle-table">
                          <thead>
                            <tr>
                              <th>Vacuna</th>
                              <th>Lote</th>
                              <th className="text-center">Dosis</th>
                              <th>Vencimiento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Si tiene lotes_entregados, mostrarlos */}
                            {modalDetalleRemito.remito.datos_snapshot.producto.lotes_entregados?.length > 0 ? (
                              modalDetalleRemito.remito.datos_snapshot.producto.lotes_entregados.map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <div style={{fontWeight: 500}}>{item.vacuna || modalDetalleRemito.remito.datos_snapshot.producto.nombre || 'Vacuna'}</div>
                                    {item.semana && <small className="text-muted">Semana {item.semana}</small>}
                                  </td>
                                  <td style={{fontFamily: 'monospace', fontSize: '0.85em'}}>{item.lote || '-'}</td>
                                  <td className="text-center" style={{fontWeight: 600}}>{item.cantidad?.toLocaleString('es-AR') || 0}</td>
                                  <td>{item.fecha_vencimiento ? formatearFechaCorta(item.fecha_vencimiento) : '-'}</td>
                                </tr>
                              ))
                            ) : (
                              /* Si es entrega simple sin lotes_entregados, mostrar una fila con los datos del producto */
                              <tr>
                                <td>
                                  <div style={{fontWeight: 500}}>{modalDetalleRemito.remito.datos_snapshot.producto.nombre || 'Vacuna'}</div>
                                  {modalDetalleRemito.remito.datos_snapshot.producto.descripcion && (
                                    <small className="text-muted">{modalDetalleRemito.remito.datos_snapshot.producto.descripcion}</small>
                                  )}
                                </td>
                                <td style={{fontFamily: 'monospace', fontSize: '0.85em'}}>{modalDetalleRemito.remito.datos_snapshot.producto.lote || '-'}</td>
                                <td className="text-center" style={{fontWeight: 600}}>
                                  {(modalDetalleRemito.remito.datos_snapshot.producto.cantidad_entregada || 
                                    modalDetalleRemito.remito.datos_snapshot.entrega?.cantidadEntregada || 0).toLocaleString('es-AR')}
                                </td>
                                <td>{modalDetalleRemito.remito.datos_snapshot.producto.fecha_vencimiento ? formatearFechaCorta(modalDetalleRemito.remito.datos_snapshot.producto.fecha_vencimiento) : '-'}</td>
                              </tr>
                            )}
                          </tbody>
                          {/* Mostrar total solo si hay múltiples items */}
                          {modalDetalleRemito.remito.datos_snapshot.producto.lotes_entregados?.length > 1 && (
                            <tfoot>
                              <tr style={{backgroundColor: '#f8f9fa', fontWeight: 600}}>
                                <td colSpan="2">Total</td>
                                <td className="text-center">
                                  {modalDetalleRemito.remito.datos_snapshot.producto.lotes_entregados.reduce((sum, item) => sum + (item.cantidad || 0), 0).toLocaleString('es-AR')}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  {(modalDetalleRemito.remito.datos_snapshot?.entrega?.observaciones || modalDetalleRemito.remito.datos_snapshot?.entrega?.observaciones_entrega) && (
                    <div className="remito-detalle-card">
                      <h4 className="remito-detalle-card-title">Observaciones</h4>
                      <div className="remito-detalle-observaciones">
                        {modalDetalleRemito.remito.datos_snapshot.entrega.observaciones || modalDetalleRemito.remito.datos_snapshot.entrega.observaciones_entrega}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="cotizacion-modal-footer">
              <button
                className="cotizacion-modal-btn cancel"
                onClick={cerrarModalDetalleRemito}
              >
                Cerrar
              </button>
              <button
                className="cotizacion-modal-btn confirm"
                onClick={() => {
                  handleReimprimirRemito(modalDetalleRemito.remito);
                  cerrarModalDetalleRemito();
                }}
                disabled={generandoRemitoPDF === modalDetalleRemito.remito.id_documento}
              >
                <FaDownload className="me-2" />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CotizacionDetalleOptimizado;