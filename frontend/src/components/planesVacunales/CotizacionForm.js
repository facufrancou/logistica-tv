import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { useNotification } from '../../context/NotificationContext';
import { getClientes } from '../../services/api';
import { verificarDisponibilidad } from '../../services/planesVacunalesApi';
import { FaSave, FaTimes, FaFileInvoice, FaInfoCircle, FaCalculator, FaExclamationTriangle, FaPrint } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './PlanesVacunales.css';

const CotizacionForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const planPreseleccionado = searchParams.get('plan');
  const modoEdicion = Boolean(id);
  
  const { 
    crearCotizacion,
    actualizarCotizacion,
    cargarCotizaciones,
    cotizaciones,
    cargarPlanes, 
    planes,
    cargarListasPrecios, 
    listasPrecios,
    calcularPrecioPlan,
    loading 
  } = usePlanesVacunales();

  const { showError, showWarning, showSuccess } = useNotification();

  const [formData, setFormData] = useState({
    id_cliente: '',
    id_plan: planPreseleccionado || '',
    id_lista_precio: '',
    fecha_inicio_plan: '',
    cantidad_animales: '',
    observaciones: ''
  });

  const [clientes, setClientes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [precioCalculado, setPrecioCalculado] = useState(null);
  const [disponibilidadStock, setDisponibilidadStock] = useState(null);
  const [errors, setErrors] = useState({});
  const [calculandoPrecio, setCalculandoPrecio] = useState(false);
  const [verificandoStock, setVerificandoStock] = useState(false);
  const [showUpdateDosisModal, setShowUpdateDosisModal] = useState(false);
  const [cantidadSugerida, setCantidadSugerida] = useState(null);
  const [dosisAjustadas, setDosisAjustadas] = useState(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => {
    cargarDatos();
    if (modoEdicion) {
      cargarCotizacionParaEditar();
    } else {
      // Al crear una nueva cotización, asegurar que el formulario esté limpio
      resetearFormulario();
    }
  }, [id]);

  const resetearFormulario = () => {
    setFormData({
      id_cliente: '',
      id_plan: planPreseleccionado || '',
      id_lista_precio: '',
      fecha_inicio_plan: '',
      cantidad_animales: '', // Siempre vacío para nueva cotización
      observaciones: ''
    });
    setPlanSeleccionado(null);
    setPrecioCalculado(null);
    setDisponibilidadStock(null);
    setErrors({});
    setDosisAjustadas(null);
    setCantidadSugerida(null);
  };

  const cargarCotizacionParaEditar = async () => {
    try {
      await cargarCotizaciones();
      const cotizacion = cotizaciones.find(c => c.id_cotizacion == id);
      if (cotizacion) {
        setFormData({
          id_cliente: cotizacion.id_cliente || '',
          id_plan: cotizacion.id_plan || '',
          id_lista_precio: cotizacion.id_lista_precio || '',
          fecha_inicio_plan: cotizacion.fecha_inicio_plan ? 
            new Date(cotizacion.fecha_inicio_plan).toISOString().split('T')[0] : '',
          cantidad_animales: cotizacion.cantidad_animales || '',
          observaciones: cotizacion.observaciones || ''
        });
      }
    } catch (error) {
      console.error('Error cargando cotización para editar:', error);
    }
  };

  useEffect(() => {
    if (formData.id_plan) {
      cargarDetallesPlan();
    }
  }, [formData.id_plan]);

  useEffect(() => {
    // Calcular precio cuando cambie el plan o la lista de precios
    console.log('useEffect calcularPrecio triggered:', { 
      id_plan: formData.id_plan, 
      id_lista_precio: formData.id_lista_precio 
    });
    
    if (formData.id_plan) {
      // No calcular automáticamente, solo limpiar precio calculado
      setPrecioCalculado(null);
    } else {
      // Limpiar precio calculado si no hay plan seleccionado
      setPrecioCalculado(null);
    }
  }, [formData.id_plan, formData.id_lista_precio]);

  // Limpiar precio calculado cuando cambien parámetros que afecten el cálculo
  useEffect(() => {
    if (formData.lista_precio_id || formData.cantidad_animales || dosisAjustadas) {
      // Limpiar precio calculado del backend para mostrar el tentativo
      setPrecioCalculado(null);
    }
  }, [formData.lista_precio_id, formData.cantidad_animales, dosisAjustadas]);

  const cargarDatos = async () => {
    try {
      const [clientesData] = await Promise.all([
        getClientes(),
        cargarPlanes({ estado: 'activo' }),
        cargarListasPrecios({ activa: true })
      ]);
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const cargarDetallesPlan = async () => {
    try {
      const plan = planes.find(p => p.id_plan == formData.id_plan);
      if (plan) {
        setPlanSeleccionado(plan);
        // Si el plan tiene una lista de precios asignada, usarla por defecto
        if (plan.id_lista_precio && !formData.id_lista_precio) {
          setFormData(prev => ({
            ...prev,
            id_lista_precio: plan.id_lista_precio
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando detalles del plan:', error);
    }
  };

  const calcularPrecio = async () => {
    try {
      setCalculandoPrecio(true);
      // Usar la lista de precios seleccionada en el formulario
      const listaPrecios = formData.lista_precio_id || formData.id_lista_precio || planSeleccionado?.id_lista_precio;
      console.log('Calculando precio con:', { 
        id_plan: formData.plan_id || formData.id_plan, 
        id_lista_precio: listaPrecios,
        cantidad_animales: formData.cantidad_animales
      });
      
      // Crear un plan temporal con las dosis ajustadas si las hay
      let planParaCalcular = formData.plan_id || formData.id_plan;
      
      const resultado = await calcularPrecioPlan(planParaCalcular, listaPrecios, formData.cantidad_animales);
      if (resultado) {
        console.log('Precio calculado:', resultado);
        setPrecioCalculado(resultado);
      }
    } catch (error) {
      console.error('Error calculando precio:', error);
      showError('Error', 'No se pudo calcular el precio. Inténtalo nuevamente.');
    } finally {
      setCalculandoPrecio(false);
    }
  };

  const calcularPrecioTentativo = () => {
    if (!planSeleccionado || !formData.cantidad_animales) return null;
    
    const cantidadAnimales = parseInt(formData.cantidad_animales);
    const listaSeleccionada = listasPrecios.find(l => l.id_lista == formData.id_lista_precio);
    
    if (!listaSeleccionada) return null;

    // Calcular precio base usando las dosis (ajustadas si existen, sino originales)
    let precioBase = 0;
    
    planSeleccionado.productos_plan.forEach(pp => {
      const ajuste = dosisAjustadas?.[pp.id_producto];
      const dosisSemanales = ajuste ? ajuste.dosis_por_semana_ajustada : pp.dosis_por_semana;
      
      const totalDosis = pp.semana_fin ? 
        dosisSemanales * (pp.semana_fin - pp.semana_inicio + 1) :
        dosisSemanales * (planSeleccionado.duracion_semanas - pp.semana_inicio + 1);
      
      // Usar precio unitario base del producto (sin lista específica)
      const precioUnitario = pp.producto?.precio_unitario || 0;
      precioBase += totalDosis * cantidadAnimales * precioUnitario;
    });

    // Aplicar porcentaje de recargo de la lista
    const porcentajeRecargo = parseFloat(listaSeleccionada.porcentaje_recargo || 0);
    const precioConRecargo = Math.round(precioBase * (1 + porcentajeRecargo / 100));
    
    return {
      precio_base: precioBase,
      porcentaje_recargo: porcentajeRecargo,
      precio_total: precioConRecargo,
      lista_nombre: listaSeleccionada.nombre
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCantidadAnimalesBlur = () => {
    const cantidadAnimales = parseInt(formData.cantidad_animales);
    
    if (cantidadAnimales > 0 && planSeleccionado && !modoEdicion) {
      console.log('Cantidad ingresada:', cantidadAnimales, '- ¿Aplicar a la planificación?');
      
      // Preguntar si desea aplicar esta cantidad a la planificación del calendario
      setCantidadSugerida(cantidadAnimales);
      setShowUpdateDosisModal(true);
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.id_cliente) {
      newErrors.id_cliente = 'Debe seleccionar un cliente';
    }

    if (!formData.id_plan) {
      newErrors.id_plan = 'Debe seleccionar un plan vacunal';
    }

    if (!formData.cantidad_animales) {
      newErrors.cantidad_animales = 'Debe especificar la cantidad de pollos a vacunar';
    } else if (parseInt(formData.cantidad_animales) <= 0) {
      newErrors.cantidad_animales = 'La cantidad debe ser mayor a 0';
    } else if (parseInt(formData.cantidad_animales) > 100000) {
      newErrors.cantidad_animales = 'La cantidad no puede ser mayor a 100,000';
    }

    if (!formData.fecha_inicio_plan) {
      newErrors.fecha_inicio_plan = 'Debe especificar la fecha de inicio del plan';
    } else {
      const fechaInicio = new Date(formData.fecha_inicio_plan);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaInicio < hoy) {
        newErrors.fecha_inicio_plan = 'La fecha de inicio no puede ser anterior a hoy';
      }
    }

    // NO validar dosis vs cantidad de animales para templates
    // La validación de stock se hará al momento de generar la cotización

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verificarDisponibilidadStock = async () => {
    if (!formData.id_plan) {
      showWarning('Validación', 'Primero seleccione un plan vacunal');
      return;
    }

    try {
      setVerificandoStock(true);
      
      // Si estamos en modo edición, usar la cotización existente
      if (!modoEdicion) {
        showWarning('Información', 'Para verificar disponibilidad, primero debe guardar la cotización');
        return;
      }

      const resultado = await verificarDisponibilidad(id);
      setDisponibilidadStock(resultado);
      
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      showError('Error', 'Error al verificar disponibilidad de stock');
    } finally {
      setVerificandoStock(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    try {
      const cotizacionData = {
        ...formData,
        id_lista_precio: formData.id_lista_precio || null,
        // Incluir dosis ajustadas si existen
        dosis_ajustadas: dosisAjustadas ? JSON.stringify(dosisAjustadas) : null
      };

      if (modoEdicion) {
        const cotizacionActualizada = await actualizarCotizacion(id, cotizacionData);
        if (cotizacionActualizada) {
          navigate(`/cotizaciones/${id}`);
        }
      } else {
        const nuevaCotizacion = await crearCotizacion(cotizacionData);
        if (nuevaCotizacion) {
          navigate('/cotizaciones');
        }
      }
    } catch (error) {
      console.error('Error guardando cotización:', error);
    }
  };

  const actualizarDosisParaCotizacion = (cantidad) => {
    if (!planSeleccionado) return;
    
    // Crear dosis ajustadas para esta cotización específica (sin modificar el plan)
    const dosisAjustadasTemp = {};
    
    planSeleccionado.productos_plan.forEach(pp => {
      const totalDosisOriginal = pp.semana_fin ? 
        pp.dosis_por_semana * (pp.semana_fin - pp.semana_inicio + 1) :
        pp.dosis_por_semana * (planSeleccionado.duracion_semanas - pp.semana_inicio + 1);
      
      if (totalDosisOriginal < cantidad) {
        // Calcular nuevas dosis por semana para que alcance para la cantidad de animales
        const semanasAplicacion = pp.semana_fin ? 
          (pp.semana_fin - pp.semana_inicio + 1) : 
          (planSeleccionado.duracion_semanas - pp.semana_inicio + 1);
        
        const nuevasDosisSemanales = Math.ceil(cantidad / semanasAplicacion);
        
        dosisAjustadasTemp[pp.id_producto] = {
          dosis_por_semana_original: pp.dosis_por_semana,
          dosis_por_semana_ajustada: nuevasDosisSemanales,
          total_original: totalDosisOriginal,
          total_ajustado: nuevasDosisSemanales * semanasAplicacion
        };
      }
    });
    
    setDosisAjustadas(dosisAjustadasTemp);
    showSuccess('Éxito', 'Cantidad aplicada al calendario de vacunación. Las dosis han sido ajustadas para esta cotización específica.');
  };

  const handleConfirmarActualizarDosis = () => {
    if (cantidadSugerida) {
      actualizarDosisParaCotizacion(cantidadSugerida);
    }
    setShowUpdateDosisModal(false);
    setCantidadSugerida(null);
  };

  const handleCancelarActualizarDosis = () => {
    setShowUpdateDosisModal(false);
    setCantidadSugerida(null);
  };

  const clienteSeleccionado = clientes.find(c => c.id_cliente == formData.id_cliente);

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
    if (!planSeleccionado || !clienteSeleccionado || !formData.cantidad_animales) {
      showError('Error', 'Complete todos los campos requeridos antes de generar el PDF');
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
      const accentColor = [41, 128, 185];

      // ENCABEZADO
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, 'F');

      // Logo de la empresa
      if (logoDataUrl) {
        const logoWidth = 40;
        const logoHeight = 10;
        doc.addImage(logoDataUrl, 'PNG', margin, 8, logoWidth, logoHeight);
      } else {
        // Texto alternativo si no hay logo
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, 8, 40, 15, 'F');
        doc.setTextColor(64, 64, 64);
        doc.setFontSize(8);
        doc.setFont('courier', 'bold');
        doc.text('TERMOPLAST', margin + 20, 12, { align: 'center' });
        doc.text('LOGÍSTICA', margin + 20, 16, { align: 'center' });
        doc.text('VETERINARIA', margin + 20, 20, { align: 'center' });
      }

      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('courier', 'bold');
      doc.text('COTIZACIÓN', pageWidth / 2, 18, { align: 'center' });

      // Subtítulo
      doc.setFontSize(12);
      doc.setFont('courier', 'normal');
      doc.text('Plan Vacunal', pageWidth / 2, 26, { align: 'center' });

      // INFORMACIÓN DEL CLIENTE Y COTIZACIÓN
      let yPos = 50;
      const infoBoxWidth = (pageWidth - 2 * margin) / 2;
      const infoBoxHeight = 35;

      // Recuadro izquierdo - Información del cliente
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, infoBoxWidth - 5, infoBoxHeight, 'F');
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.8);
      doc.rect(margin, yPos, infoBoxWidth - 5, infoBoxHeight, 'S');

      doc.setFontSize(12);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL CLIENTE', margin + 3, yPos + 8);
      
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(`Cliente: ${clienteSeleccionado.nombre}`, margin + 3, yPos + 15);
      doc.text(`Email: ${clienteSeleccionado.email || 'No especificado'}`, margin + 3, yPos + 20);
      doc.text(`Teléfono: ${clienteSeleccionado.telefono || 'No especificado'}`, margin + 3, yPos + 25);
      doc.text(`Cantidad Pollos: ${parseInt(formData.cantidad_animales).toLocaleString()}`, margin + 3, yPos + 30);

      // Recuadro derecho - Información de la cotización
      doc.setFillColor(...lightGray);
      doc.rect(margin + infoBoxWidth, yPos, infoBoxWidth - 5, infoBoxHeight, 'F');
      doc.rect(margin + infoBoxWidth, yPos, infoBoxWidth - 5, infoBoxHeight, 'S');

      doc.setFontSize(12);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN TÉCNICA', margin + infoBoxWidth + 3, yPos + 8);
      
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(`Plan: ${planSeleccionado.nombre}`, margin + infoBoxWidth + 3, yPos + 15);
      doc.text(`Duración: ${planSeleccionado.duracion_semanas} semanas`, margin + infoBoxWidth + 3, yPos + 20);
      doc.text(`Fecha Nacimiento: ${formData.fecha_inicio_plan ? new Date(formData.fecha_inicio_plan).toLocaleDateString('es-ES') : 'No especificada'}`, margin + infoBoxWidth + 3, yPos + 25);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, margin + infoBoxWidth + 3, yPos + 30);

      // Separador
      yPos += 45;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      // TABLA DE PRODUCTOS
      yPos += 10;

      // Preparar datos para la tabla
      const calcularPrecioTentativoLocal = () => {
        if (!formData.id_plan || !formData.cantidad_animales) return null;
        
        const planPrecios = planSeleccionado.productos_plan || [];
        const cantidadAnimales = parseInt(formData.cantidad_animales);
        
        let precioBase = 0;
        
        planPrecios.forEach(pp => {
          const ajuste = dosisAjustadas?.[pp.id_producto];
          const dosisSemanales = ajuste ? ajuste.dosis_por_semana_ajustada : pp.dosis_por_semana;
          const totalDosis = dosisSemanales * cantidadAnimales;
          const precioUnitario = pp.precio_unitario || 0;
          precioBase += totalDosis * precioUnitario;
        });

        const listaSeleccionada = formData.id_lista_precio ? 
          listasPrecios.find(l => l.id_lista == formData.id_lista_precio) :
          planSeleccionado.lista_precio;

        const porcentajeRecargo = listaSeleccionada?.porcentaje_recargo || 0;
        const recargo = precioBase * (porcentajeRecargo / 100);
        const precioTotal = precioBase + recargo;

        return {
          precio_base: precioBase,
          recargo: recargo,
          precio_total: precioTotal,
          porcentaje_recargo: porcentajeRecargo
        };
      };

      const precioInfo = calcularPrecioTentativoLocal();
      const cantidadAnimales = parseInt(formData.cantidad_animales);

      const tableData = planSeleccionado.productos_plan.map(pp => {
        const ajuste = dosisAjustadas?.[pp.id_producto];
        const dosisSemanales = ajuste ? ajuste.dosis_por_semana_ajustada : pp.dosis_por_semana;
        const totalDosis = dosisSemanales * cantidadAnimales;
        const precioUnitario = pp.precio_unitario || 0;
        const precioTotalItem = totalDosis * precioUnitario;
        
        const semanaTexto = pp.semana_fin ? 
          `${pp.semana_inicio} - ${pp.semana_fin}` : 
          `${pp.semana_inicio} - final`;

        return [
          pp.producto?.nombre || 'Producto no encontrado',
          semanaTexto,
          `${dosisSemanales} x ${cantidadAnimales.toLocaleString()}`,
          totalDosis.toLocaleString(),
          `$${precioUnitario.toFixed(2)}`,
          `$${precioTotalItem.toLocaleString()}`
        ];
      });

      // Crear la tabla
      doc.autoTable({
        startY: yPos,
        head: [['Producto/Vacuna', 'Semanas', 'Dosis x Cantidad', 'Total Dosis', 'Precio Unit.', 'Subtotal']],
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
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' }
        }
      });

      // RESUMEN DE PRECIOS
      const finalY = doc.lastAutoTable.finalY + 15;
      
      if (precioInfo) {
        // Recuadro de resumen
        const resumenHeight = 40;
        doc.setFillColor(...lightGray);
        doc.rect(pageWidth - margin - 80, finalY, 80, resumenHeight, 'F');
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(1);
        doc.rect(pageWidth - margin - 80, finalY, 80, resumenHeight, 'S');

        doc.setFontSize(12);
        doc.setFont('courier', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('RESUMEN', pageWidth - margin - 40, finalY + 8, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('courier', 'normal');
        doc.setTextColor(...secondaryColor);
        doc.text(`Subtotal: $${precioInfo.precio_base.toLocaleString()}`, pageWidth - margin - 75, finalY + 18);
        
        if (precioInfo.porcentaje_recargo > 0) {
          doc.text(`Recargo (${precioInfo.porcentaje_recargo}%): $${precioInfo.recargo.toLocaleString()}`, pageWidth - margin - 75, finalY + 25);
        }

        doc.setFontSize(12);
        doc.setFont('courier', 'bold');
        doc.setTextColor(...accentColor);
        doc.text(`TOTAL: $${precioInfo.precio_total.toLocaleString()}`, pageWidth - margin - 40, finalY + 35, { align: 'center' });
      }

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
      const clienteNombre = clienteSeleccionado.nombre.replace(/[^a-zA-Z0-9]/g, '-');
      const planNombre = planSeleccionado.nombre.replace(/[^a-zA-Z0-9]/g, '-');
      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `cotizacion-${clienteNombre}-${planNombre}-${fecha}.pdf`;
      
      doc.save(fileName);
      
      showSuccess('Éxito', 'PDF de cotización generado correctamente');
      
    } catch (error) {
      console.error('Error generando PDF de cotización:', error);
      showError('Error', 'No se pudo generar el PDF de la cotización');
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner"></div>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center">
            <FaFileInvoice className="me-2 text-primary" />
            <h3 className="mb-0">{modoEdicion ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Formulario Principal */}
          <div className="col-lg-8">
            {/* Información Básica */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Información Básica</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Cliente <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.id_cliente ? 'is-invalid' : ''}`}
                      name="id_cliente"
                      value={formData.id_cliente}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id_cliente} value={cliente.id_cliente}>
                          {cliente.nombre} - {cliente.email || 'Sin email'}
                        </option>
                      ))}
                    </select>
                    {errors.id_cliente && (
                      <div className="invalid-feedback">{errors.id_cliente}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Plan Vacunal <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.id_plan ? 'is-invalid' : ''}`}
                      name="id_plan"
                      value={formData.id_plan}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar plan</option>
                      {planes.map(plan => (
                        <option key={plan.id_plan} value={plan.id_plan}>
                          {plan.nombre} ({plan.duracion_semanas} semanas)
                        </option>
                      ))}
                    </select>
                    {errors.id_plan && (
                      <div className="invalid-feedback">{errors.id_plan}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Cantidad de Pollos a Vacunar <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${errors.cantidad_animales ? 'is-invalid' : ''}`}
                      name="cantidad_animales"
                      value={formData.cantidad_animales}
                      onChange={handleInputChange}
                      onBlur={handleCantidadAnimalesBlur}
                      min="1"
                      placeholder="Ej: 1000"
                    />
                    {errors.cantidad_animales && (
                      <div className="invalid-feedback">{errors.cantidad_animales}</div>
                    )}
                    <small className="text-muted">
                      Al salir de este campo, se preguntará si desea aplicar esta cantidad al calendario de vacunación
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Fecha de Nacimiento/Inicio del Plan <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-control ${errors.fecha_inicio_plan ? 'is-invalid' : ''}`}
                      name="fecha_inicio_plan"
                      value={formData.fecha_inicio_plan}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.fecha_inicio_plan && (
                      <div className="invalid-feedback">{errors.fecha_inicio_plan}</div>
                    )}
                    <small className="text-muted">
                      Fecha de nacimiento de los pollos o inicio programado del plan
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Lista de Precios</label>
                    <select
                      className="form-select"
                      name="id_lista_precio"
                      value={formData.id_lista_precio}
                      onChange={handleInputChange}
                    >
                      <option value="">Usar lista del plan</option>
                      {listasPrecios.map(lista => (
                        <option key={lista.id_lista} value={lista.id_lista}>
                          {lista.tipo} - {lista.nombre}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Opcional: Si no se selecciona, se usará la lista asignada al plan
                    </small>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Observaciones</label>
                    <textarea
                      className="form-control"
                      name="observaciones"
                      rows="3"
                      value={formData.observaciones}
                      onChange={handleInputChange}
                      placeholder="Observaciones adicionales para la cotización..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Plan Seleccionado */}
            {planSeleccionado && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Detalles del Plan Seleccionado</h5>
                </div>
                <div className="card-body">
                  {/* Error de validación de dosis */}
                  {errors.dosis_insuficientes && (
                    <div className="alert alert-warning mb-3">
                      <FaExclamationTriangle className="me-2" />
                      <strong>Información:</strong>
                      <div className="mt-1">{errors.dosis_insuficientes}</div>
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-12">
                      <h6 className="text-primary">{planSeleccionado.nombre}</h6>
                      {planSeleccionado.descripcion && (
                        <p className="text-muted mb-3">{planSeleccionado.descripcion}</p>
                      )}
                    </div>
                    
                    {planSeleccionado.productos_plan && planSeleccionado.productos_plan.length > 0 && (
                      <div className="col-12">
                        <h6>Productos incluidos:</h6>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead className="table-light">
                              <tr>
                                <th>Vacuna</th>
                                <th>Dosis/Semana</th>
                                <th>Período</th>
                                <th>Total Dosis</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planSeleccionado.productos_plan.map((pp, index) => {
                                const cantidadAnimales = parseInt(formData.cantidad_animales) || 0;
                                const ajuste = dosisAjustadas?.[pp.id_producto];
                                
                                // Calcular dosis necesarias para esta cotización
                                const dosisSemanales = ajuste ? ajuste.dosis_por_semana_ajustada : pp.dosis_por_semana;
                                
                                // Para cotización: dosis del template × cantidad de animales
                                const totalDosis = cantidadAnimales > 0 ? 
                                  dosisSemanales * cantidadAnimales : 
                                  `${dosisSemanales} × cantidad de pollos`;
                                
                                const dosisInsuficientes = false; // No validar aquí, es solo template
                                
                                return (
                                  <tr key={index} className={dosisInsuficientes && !ajuste ? 'table-warning' : ajuste ? 'table-success' : ''}>
                                    <td>
                                      <div>
                                        <strong>{pp.producto?.nombre || 'Vacuna no encontrada'}</strong>
                                        {pp.producto?.descripcion && (
                                          <div>
                                            <small className="text-muted">{pp.producto.descripcion}</small>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      <span className="fw-bold">{dosisSemanales}</span>
                                    </td>
                                    <td className="text-center">
                                      Semana {pp.semana_inicio}
                                      {pp.semana_fin ? ` - ${pp.semana_fin}` : ' - final'}
                                    </td>
                                    <td className="text-center">
                                      <span className="badge bg-success">
                                        {typeof totalDosis === 'number' ? 
                                          `${totalDosis.toLocaleString()} dosis` : 
                                          totalDosis
                                        }
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Lateral */}
          <div className="col-lg-4">
            {/* Resumen del Cliente */}
            {clienteSeleccionado && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Cliente Seleccionado</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>{clienteSeleccionado.nombre}</strong>
                  </div>
                  {clienteSeleccionado.email && (
                    <div className="mb-2">
                      <small className="text-muted">Email:</small>
                      <div>{clienteSeleccionado.email}</div>
                    </div>
                  )}
                  {clienteSeleccionado.telefono && (
                    <div className="mb-2">
                      <small className="text-muted">Teléfono:</small>
                      <div>{clienteSeleccionado.telefono}</div>
                    </div>
                  )}
                  {clienteSeleccionado.direccion && (
                    <div className="mb-2">
                      <small className="text-muted">Dirección:</small>
                      <div>{clienteSeleccionado.direccion}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen de Precio */}
            <div className="card sticky-top">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Resumen de Cotización</h5>
                {formData.id_plan && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={calcularPrecio}
                    disabled={calculandoPrecio}
                  >
                    <FaCalculator className="me-1" />
                    {calculandoPrecio ? 'Calculando...' : 'Recalcular'}
                  </button>
                )}
              </div>
              <div className="card-body">
                {planSeleccionado ? (
                  <>
                    <div className="mb-3">
                      <small className="text-muted">Plan seleccionado</small>
                      <div className="fw-bold">{planSeleccionado.nombre}</div>
                    </div>
                    
                    {formData.cantidad_animales && (
                      <div className="mb-3">
                        <small className="text-muted">Cantidad de pollos</small>
                        <div className="fw-bold">{parseInt(formData.cantidad_animales).toLocaleString()} pollos</div>
                      </div>
                    )}

                    <div className="mb-3">
                      <small className="text-muted">Lista de precios</small>
                      <div className="fw-bold">
                        {formData.id_lista_precio ? 
                          listasPrecios.find(l => l.id_lista == formData.id_lista_precio)?.nombre :
                          planSeleccionado.lista_precio?.nombre || 'Lista del plan'
                        }
                      </div>
                      {(() => {
                        const listaSeleccionada = formData.id_lista_precio ? 
                          listasPrecios.find(l => l.id_lista == formData.id_lista_precio) :
                          planSeleccionado.lista_precio;
                        
                        if (listaSeleccionada?.porcentaje_recargo) {
                          return (
                            <small className="text-muted">
                              +{listaSeleccionada.porcentaje_recargo}% de recargo
                            </small>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <hr />

                    <div className="mb-3">
                      <small className="text-muted">Total de la cotización</small>
                      <div className="fw-bold text-success fs-4">
                        {calculandoPrecio ? (
                          <span className="precio-calculando">Calculando...</span>
                        ) : (() => {
                          const precioTentativo = calcularPrecioTentativo();
                          
                          if (precioTentativo) {
                            return `$${precioTentativo.precio_total?.toLocaleString()}`;
                          } else {
                            return <span className="text-muted">Complete los datos para ver precio</span>;
                          }
                        })()}
                      </div>
                      {(() => {
                        const precioTentativo = calcularPrecioTentativo();
                        if (precioTentativo && precioTentativo.porcentaje_recargo > 0) {
                          return (
                            <small className="text-muted">
                              Precio base: ${precioTentativo.precio_base?.toLocaleString()} + {precioTentativo.porcentaje_recargo}%
                            </small>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Botón de imprimir en el resumen */}
                    {clienteSeleccionado && formData.cantidad_animales && (
                      <>
                        <hr />
                        <div className="d-grid">
                          <button
                            type="button"
                            className="btn btn-outline-success"
                            onClick={handleExportarCotizacionPDF}
                            disabled={generandoPDF}
                          >
                            {generandoPDF ? (
                              <>
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                  <span className="visually-hidden">Generando...</span>
                                </div>
                                Generando PDF...
                              </>
                            ) : (
                              <>
                                <FaPrint className="me-2" />
                                Imprimir Cotización
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted">
                    <FaInfoCircle className="mb-2" style={{ fontSize: '2rem' }} />
                    <p>Selecciona un plan para ver el resumen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="card mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/cotizaciones')}
              >
                <FaTimes className="me-2" />
                Cancelar
              </button>
              
              <div className="d-flex gap-2">
                {/* Botón para imprimir cotización */}
                {planSeleccionado && clienteSeleccionado && formData.cantidad_animales && (
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={handleExportarCotizacionPDF}
                    disabled={generandoPDF}
                    title="Exportar cotización a PDF"
                  >
                    {generandoPDF ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Generando...</span>
                        </div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <FaPrint className="me-2" />
                        Imprimir PDF
                      </>
                    )}
                  </button>
                )}

                {modoEdicion && (
                  <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={verificarDisponibilidadStock}
                    disabled={verificandoStock || loading}
                  >
                    <FaExclamationTriangle className="me-2" />
                    {verificandoStock ? 'Verificando...' : 'Verificar Stock'}
                  </button>
                )}
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <FaSave className="me-2" />
                  {modoEdicion ? 'Actualizar Cotización' : 'Crear Cotización'}
                </button>
              </div>
            </div>
            
            {/* Mostrar resultado de verificación de stock */}
            {disponibilidadStock && (
              <div className="mt-3">
                <div className={`alert ${disponibilidadStock.disponible ? 'alert-success' : 'alert-warning'}`}>
                  <h6 className="alert-heading">
                    <FaExclamationTriangle className="me-2" />
                    Verificación de Stock
                  </h6>
                  {disponibilidadStock.disponible ? (
                    <p className="mb-0">✅ Stock disponible para todos los productos del plan</p>
                  ) : (
                    <div>
                      <p className="mb-2">⚠️ Hay productos con stock insuficiente:</p>
                      <ul className="mb-0">
                        {disponibilidadStock.detalles?.filter(d => !d.disponible).map((detalle, index) => (
                          <li key={index}>
                            <strong>{detalle.producto}</strong>: 
                            Necesario: {detalle.cantidad_necesaria}, 
                            Disponible: {detalle.stock_disponible}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Modal de Actualizar Dosis */}
      {showUpdateDosisModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaExclamationTriangle className="me-2 text-warning" />
                  Aplicar Cantidad a la Planificación
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCancelarActualizarDosis}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <FaInfoCircle className="me-2" />
                  <strong>Se detectó que algunas vacunas no tienen suficientes dosis para {cantidadSugerida} pollos.</strong>
                </div>
                <p>
                  ¿Deseas ajustar automáticamente las dosis del <strong>calendario de vacunación</strong> para esta cantidad de pollos?
                </p>
                <div className="alert alert-success">
                  <strong>✅ Importante:</strong> Esto solo afectará <strong>esta cotización específica</strong>.
                  El plan original <strong>"{planSeleccionado?.nombre}"</strong> no se modificará y podrá seguir usándose para otras cotizaciones.
                </div>
                <p className="text-muted">
                  <small>
                    Al confirmar, se ajustarán las dosis semanales necesarias para que el calendario tenga suficientes vacunas 
                    para los {cantidadSugerida} pollos de esta cotización.
                  </small>
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancelarActualizarDosis}
                >
                  No, mantener dosis originales
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConfirmarActualizarDosis}
                >
                  Sí, aplicar cantidad a la planificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionForm;
