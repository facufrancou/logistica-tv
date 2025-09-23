import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaArrowLeft, 
  FaSyringe, 
  FaCheck, 
  FaExclamationTriangle,
  FaChartPie,
  FaHistory,
  FaFingerprint,
  FaClipboardCheck,
  FaBoxOpen,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaBan,
  FaEye,
  FaPrint,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaCut
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as planesApi from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './PlanesVacunales.css';

const CalendarioVacunacion = () => {
  const { cotizacionId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [generandoRemito, setGenerandoRemito] = useState(false);
  const [cotizacion, setCotizacion] = useState(null);
  const [calendario, setCalendario] = useState([]);
  const [estadoPlan, setEstadoPlan] = useState(null);
  const [controlEntregas, setControlEntregas] = useState([]);
  const [vistaActual, setVistaActual] = useState('calendario'); // 'calendario', 'entregas', 'resumen', 'edicion'
  
  // Estados para modales
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  
  // Estados para edición del calendario
  const [editandoFecha, setEditandoFecha] = useState(null);
  const [fechaEditForm, setFechaEditForm] = useState('');
  const [showDesdoblamientoModal, setShowDesdoblamientoModal] = useState(false);
  const [calendarioParaDesdoblamiento, setCalendarioParaDesdoblamiento] = useState(null);
  const [desdoblamientoForm, setDesdoblamientoForm] = useState({
    fecha_aplicacion: '',
    observaciones: '',
    numero_desdoblamiento: 1
  });
  
  // Estados para formularios
  const [entregaForm, setEntregaForm] = useState({
    cantidad_entregada: 0,
    responsable_entrega: '',
    responsable_recibe: '',
    observaciones_entrega: '',
    tipo_entrega: 'completa',
    imprimir_remito: true
  });

  // Estados para exportar PDF
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, [cotizacionId]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los datos en paralelo
      const [
        calendarioData,
        estadoData,
        entregasData,
        cotizacionData
      ] = await Promise.all([
        planesApi.getCalendarioVacunacion(cotizacionId),
        planesApi.getEstadoPlan(cotizacionId),
        planesApi.getControlEntregas(cotizacionId),
        planesApi.getCotizacionById(cotizacionId)
      ]);

      setCalendario(calendarioData);
      setEstadoPlan(estadoData);
      setControlEntregas(entregasData);
      setCotizacion(cotizacionData);
      
    } catch (error) {
      console.error('Error al cargar datos del calendario:', error);
      alert('Error al cargar el calendario de vacunación');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarEntrega = async () => {
    try {
      if (!calendarioSeleccionado) return;
      
      if (entregaForm.cantidad_entregada <= 0) {
        alert('La cantidad entregada debe ser mayor a 0');
        return;
      }

      const response = await planesApi.marcarEntregaDosis(calendarioSeleccionado.id_calendario, entregaForm);
      
      // Si el usuario seleccionó imprimir remito, generar PDF
      if (entregaForm.imprimir_remito) {
        setGenerandoRemito(true);
        try {
          // Delay mínimo para mostrar la animación
          const startTime = Date.now();
          
          const pdfBlob = await planesApi.generarRemitoEntrega(calendarioSeleccionado.id_calendario, {
            cantidad_entregada: entregaForm.cantidad_entregada,
            responsable_entrega: entregaForm.responsable_entrega,
            responsable_recibe: entregaForm.responsable_recibe,
            observaciones_entrega: entregaForm.observaciones_entrega,
            tipo_entrega: entregaForm.tipo_entrega
          });
          
          // Asegurar que el loading se muestre por al menos 2 segundos
          const elapsedTime = Date.now() - startTime;
          const minLoadingTime = 2000;
          if (elapsedTime < minLoadingTime) {
            await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
          }
          
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `remito-entrega-semana-${calendarioSeleccionado.semana_aplicacion}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (pdfError) {
          console.error('Error al generar remito PDF:', pdfError);
          alert('Entrega registrada correctamente, pero hubo un error al generar el remito PDF');
        } finally {
          setGenerandoRemito(false);
        }
      }
      
      // Recargar datos
      await cargarDatosIniciales();
      
      // Cerrar modal y limpiar form
      setShowEntregaModal(false);
      setCalendarioSeleccionado(null);
      setEntregaForm({
        cantidad_entregada: 0,
        responsable_entrega: '',
        responsable_recibe: '',
        observaciones_entrega: '',
        tipo_entrega: 'completa',
        imprimir_remito: true
      });
      
      
    } catch (error) {
      console.error('Error al marcar entrega:', error);
      alert('Error al registrar la entrega: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleFinalizarPlan = async () => {
    try {
      const observaciones = document.getElementById('observaciones-finalizacion').value;
      
      await planesApi.finalizarPlan(cotizacionId, observaciones);
      
      // Recargar datos
      await cargarDatosIniciales();
      
      setShowFinalizarModal(false);
      /* alert('Plan vacunal finalizado correctamente'); */
      
    } catch (error) {
      console.error('Error al finalizar plan:', error);
      alert('Error al finalizar el plan: ' + (error.message || 'Error desconocido'));
    }
  };

  const abrirModalEntrega = (calendarioItem) => {
    setCalendarioSeleccionado(calendarioItem);
    setEntregaForm({
      cantidad_entregada: calendarioItem.cantidad_dosis - (calendarioItem.dosis_entregadas || 0),
      responsable_entrega: '',
      responsable_recibe: '',
      observaciones_entrega: '',
      tipo_entrega: 'completa',
      imprimir_remito: true
    });
    setShowEntregaModal(true);
  };

  const reimprimirRemito = async (calendarioItem) => {
    setGenerandoRemito(true);
    try {
      console.log('Generando remito para calendario:', calendarioItem.id_calendario);
      console.log('Datos del calendario:', {
        id: calendarioItem.id_calendario,
        semana: calendarioItem.semana_aplicacion,
        estado: calendarioItem.estado_entrega,
        dosis_entregadas: calendarioItem.dosis_entregadas
      });
      
      // Verificar que tenga entregas antes de intentar
      if (!calendarioItem.dosis_entregadas || calendarioItem.dosis_entregadas === 0) {
        alert('No hay entregas registradas para esta semana. No se puede generar el remito.');
        return;
      }
      
      // Delay mínimo para mostrar la animación
      const startTime = Date.now();
      
      // Usar método GET para reimprimir con datos existentes
      const response = await fetch(`http://localhost:3001/cotizaciones/calendario/${calendarioItem.id_calendario}/remito`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al generar el remito PDF' }));
        console.error('Error del servidor:', error);
        throw new Error(error.message || 'Error al generar el remito PDF');
      }
      
      const pdfBlob = await response.blob();
      
      // Asegurar que el loading se muestre por al menos 1.5 segundos
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 1500;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `remito-entrega-semana-${calendarioItem.semana_aplicacion}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Remito descargado exitosamente');
    } catch (error) {
      console.error('Error al reimprimir remito:', error);
      alert('Error al generar el remito: ' + error.message);
    } finally {
      setGenerandoRemito(false);
    }
  };

  const reimprimirRemitoPorCalendario = async (id_calendario) => {
    setGenerandoRemito(true);
    try {
      console.log('Generando remito para calendario ID:', id_calendario);
      
      // Buscar el item del calendario para obtener el número de semana
      const calendarioItem = calendario.find(item => item.id_calendario === id_calendario);
      const numeroSemana = calendarioItem ? calendarioItem.semana_aplicacion : 'X';
      
      console.log('Datos encontrados:', {
        id: id_calendario,
        semana: numeroSemana,
        estado: calendarioItem?.estado_entrega,
        encontrado: !!calendarioItem
      });
      
      // Delay mínimo para mostrar la animación
      const startTime = Date.now();
      
      // Usar método GET para reimprimir con datos existentes
      const response = await fetch(`http://localhost:3001/cotizaciones/calendario/${id_calendario}/remito`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al generar el remito PDF' }));
        console.error('Error del servidor:', error);
        throw new Error(error.message || 'Error al generar el remito PDF');
      }
      
      const pdfBlob = await response.blob();
      
      // Asegurar que el loading se muestre por al menos 1.5 segundos
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 1500;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `remito-entrega-semana-${numeroSemana}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Remito descargado exitosamente');
    } catch (error) {
      console.error('Error al reimprimir remito:', error);
      alert('Error al generar el remito: ' + error.message);
    } finally {
      setGenerandoRemito(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'pendiente': { class: 'badge bg-warning text-dark', icon: FaClock, text: 'Pendiente' },
      'parcial': { class: 'badge bg-info', icon: FaExclamationTriangle, text: 'Parcial' },
      'entregada': { class: 'badge bg-success', icon: FaCheckCircle, text: 'Entregada' },
      'suspendida': { class: 'badge bg-danger', icon: FaBan, text: 'Suspendida' }
    };
    return badges[estado] || badges['pendiente'];
  };

  const getEstadoPlanBadge = (estado) => {
    const badges = {
      'activo': { class: 'badge bg-success', icon: FaCheckCircle, text: 'Activo' },
      'completado': { class: 'badge bg-primary', icon: FaCheckCircle, text: 'Completado' },
      'inactivo': { class: 'badge bg-secondary', icon: FaTimesCircle, text: 'Inactivo' },
      'con_problemas': { class: 'badge bg-warning text-dark', icon: FaExclamationTriangle, text: 'Con Problemas' }
    };
    return badges[estado] || badges['inactivo'];
  };

  // ===== FUNCIONES DE EDICIÓN =====
  
  const handleEditarFecha = (calendarioItem) => {
    setEditandoFecha(calendarioItem.id_calendario);
    setFechaEditForm(calendarioItem.fecha_aplicacion_programada || '');
  };

  const handleGuardarFecha = async (calendarioId) => {
    try {
      await planesApi.editarFechaCalendario(cotizacionId, calendarioId, {
        fecha_aplicacion_programada: fechaEditForm
      });
      
      showSuccess('Éxito', 'Fecha actualizada correctamente');
      setEditandoFecha(null);
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error actualizando fecha:', error);
      showError('Error', 'No se pudo actualizar la fecha');
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoFecha(null);
    setFechaEditForm('');
  };

  const handleDesdoblarDosis = (calendarioItem) => {
    setCalendarioParaDesdoblamiento(calendarioItem);
    setDesdoblamientoForm({
      fecha_aplicacion: '',
      observaciones: `Desdoblamiento de ${calendarioItem.vacuna_nombre} - Semana ${calendarioItem.semana_aplicacion}`,
      numero_desdoblamiento: 1
    });
    setShowDesdoblamientoModal(true);
  };

  const handleCrearDesdoblamiento = async () => {
    try {
      const desdoblamientoData = {
        ...desdoblamientoForm,
        dosis_original_id: calendarioParaDesdoblamiento.id_calendario
      };

      await planesApi.crearDesdoblamientoDosis(
        cotizacionId, 
        calendarioParaDesdoblamiento.id_calendario,
        desdoblamientoData
      );
      
      showSuccess('Éxito', 'Desdoblamiento creado correctamente');
      setShowDesdoblamientoModal(false);
      setCalendarioParaDesdoblamiento(null);
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error creando desdoblamiento:', error);
      showError('Error', 'No se pudo crear el desdoblamiento');
    }
  };

  const handleExportarPDF = async () => {
    try {
      setGenerandoPDF(true);
      
      // Crear instancia del documento
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Configuración del documento
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Título principal
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`PLAN VACUNAL ${cotizacion?.cliente?.nombre_empresa || 'CLIENTE'}`, pageWidth / 2, 20, { align: 'center' });

      // Información del cliente
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 35;
      
      doc.text(`FECHA NACIMIENTO: ${cotizacion?.fecha_inicio_plan ? new Date(cotizacion.fecha_inicio_plan).toLocaleDateString('es-ES') : 'N/A'}`, margin, yPos);
      doc.text(`CANTIDAD: ${cotizacion?.cantidad_animales || 'N/A'}`, margin + 80, yPos);
      doc.text(`GENÉTICA: ${cotizacion?.genetica || 'N/A'}`, margin + 150, yPos);

      // Preparar datos para la tabla
      const tableHeaders = ['FECHA', 'DÍA', 'SEMANA', 'VACUNAS', 'PATOLOGÍA', 'VÍA', 'LAB.', 'FRASCOS'];
      
      const tableData = calendario.map(item => {
        const fecha = new Date(item.fecha_aplicacion_programada);
        const fechaStr = fecha.toLocaleDateString('es-ES');
        const diaStr = String(fecha.getDate()).padStart(3, '0');
        
        return [
          fechaStr,
          diaStr,
          item.semana_aplicacion,
          item.vacuna_nombre || '',
          item.vacuna_descripcion || '',
          'IM', // Vía por defecto
          'MSD', // Laboratorio por defecto  
          Math.ceil(item.cantidad_dosis / 1000) // Calcular frascos
        ];
      });

      // Crear tabla
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos + 15,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: 'center'
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 25 }, // FECHA
          1: { cellWidth: 15 }, // DÍA
          2: { cellWidth: 20 }, // SEMANA
          3: { cellWidth: 60 }, // VACUNAS
          4: { cellWidth: 80 }, // PATOLOGÍA
          5: { cellWidth: 15 }, // VÍA
          6: { cellWidth: 20 }, // LAB
          7: { cellWidth: 25 }  // FRASCOS
        }
      });

      // Pie de página con información adicional
      const finalY = yPos + 15 + (tableData.length * 8) + 20; // Estimar posición
      doc.setFontSize(8);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} - Sistema de Gestión de Planes Vacunales`, margin, finalY);

      // Descargar el PDF
      const fileName = `plan-vacunal-${cotizacion?.numero_cotizacion || 'calendario'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      showSuccess('Éxito', 'PDF generado correctamente');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      showError('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No programada';
    
    try {
      const dateObj = new Date(fecha);
      
      // Verificar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        console.warn('Fecha inválida para formatear:', fecha);
        return 'Fecha inválida';
      }
      
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Error en fecha';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!cotizacion || !estadoPlan) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4>Error</h4>
          <p>No se pudo cargar la información del calendario de vacunación.</p>
          <button 
            className="btn btn-outline-danger"
            onClick={() => navigate('/cotizaciones')}
          >
            <FaArrowLeft className="me-2" />
            Volver a Cotizaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-outline-secondary me-3"
              onClick={() => navigate('/cotizaciones')}
            >
              <FaArrowLeft />
            </button>
            <FaCalendarAlt className="me-2 text-primary" />
            <div>
              <h3 className="mb-0">Calendario de Vacunación</h3>
              <small className="text-muted">
                {cotizacion.numero_cotizacion} - {estadoPlan.cotizacion?.cliente}
              </small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {(() => {
              const badge = getEstadoPlanBadge(estadoPlan.estadisticas?.estado_general);
              const IconComponent = badge.icon;
              return (
                <span className={badge.class}>
                  <IconComponent className="me-1" />
                  {badge.text}
                </span>
              );
            })()}
            {estadoPlan.estadisticas?.estado_general === 'completado' && (
              <button
                className="btn btn-success"
                onClick={() => setShowFinalizarModal(true)}
              >
                <FaFingerprint className="me-2" />
                Finalizar Plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <FaSyringe className="mb-2" size={24} />
              <h4>{estadoPlan.estadisticas?.total_dosis_programadas || 0}</h4>
              <small>Dosis Programadas</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <FaCheckCircle className="mb-2" size={24} />
              <h4>{estadoPlan.estadisticas?.total_dosis_entregadas || 0}</h4>
              <small>Dosis Entregadas</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body text-center">
              <FaClock className="mb-2" size={24} />
              <h4>{estadoPlan.estadisticas?.dosis_pendientes || 0}</h4>
              <small>Dosis Pendientes</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <FaChartPie className="mb-2" size={24} />
              <h4>{estadoPlan.estadisticas?.porcentaje_completado || 0}%</h4>
              <small>Completado</small>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link text-dark fw-medium ${vistaActual === 'calendario' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setVistaActual('calendario')}
                >
                  <FaCalendarAlt className="me-2" />
                  Calendario
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link text-dark fw-medium ${vistaActual === 'edicion' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setVistaActual('edicion')}
                >
                  <FaEdit className="me-2" />
                  Editar Calendario
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link text-dark fw-medium ${vistaActual === 'entregas' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setVistaActual('entregas')}
                >
                  <FaHistory className="me-2" />
                  Control de Entregas
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link text-dark fw-medium ${vistaActual === 'resumen' ? 'active text-primary' : 'text-secondary'}`}
                  onClick={() => setVistaActual('resumen')}
                >
                  <FaChartPie className="me-2" />
                  Resumen por Producto
                </button>
              </li>
            </ul>
            
            {/* Botones de Acción */}
            <div className="ms-auto">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={handleExportarPDF}
                disabled={generandoPDF}
                title="Exportar calendario a PDF"
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
                    Exportar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body">
          {/* Vista Calendario */}
          {vistaActual === 'calendario' && (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Fecha Programada</th>
                    <th>Producto</th>
                    <th>Programadas</th>
                    <th>Entregadas</th>
                    <th>Estado</th>
                    <th>Datos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {calendario.map((item) => {
                    const badge = getEstadoBadge(item.estado_entrega);
                    const IconComponent = badge.icon;
                    const dosisPendientes = item.cantidad_dosis - (item.dosis_entregadas || 0);
                    
                    return (
                      <tr key={item.id_calendario}>
                        <td>
                          <strong>Semana {item.semana_aplicacion}</strong>
                        </td>
                        <td>
                          {new Date(item.fecha_aplicacion_programada).toLocaleDateString('es-ES')}
                        </td>
                        <td>
                          <div>
                            <strong>{item.vacuna_nombre}</strong>
                            {item.vacuna_descripcion && (
                              <small className="d-block text-muted">
                                {item.vacuna_descripcion}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {item.cantidad_dosis}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success">
                            {item.dosis_entregadas || 0}
                          </span>
                        </td>
                        <td>
                          <span className={badge.class}>
                            <IconComponent className="me-1" />
                            {badge.text}
                          </span>
                        </td>
                        <td>
                          <small>
                            {item.responsable_entrega || '-'}
                          </small>
                        </td>
                        <td>
                          {dosisPendientes > 0 && item.estado_entrega !== 'suspendida' && (
                            <button
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => abrirModalEntrega(item)}
                              title="Marcar entrega"
                            >
                              <FaCheck />
                            </button>
                          )}
                          {item.dosis_entregadas > 0 && (
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={() => reimprimirRemito(item)}
                              title="Reimprimir remito"
                              disabled={generandoRemito}
                            >
                              {generandoRemito ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              ) : (
                                <FaPrint />
                              )}
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => {
                              // TODO: Modal con detalles
                              alert('Detalle: ' + JSON.stringify(item, null, 2));
                            }}
                            title="Ver detalles"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Vista Edición del Calendario */}
          {vistaActual === 'edicion' && (
            <div>
              <div className="alert alert-info">
                <FaInfoCircle className="me-2" />
                <strong>Editor de Calendario:</strong> Aquí puede editar las fechas de aplicación programadas y crear 
                desdoblamientos de dosis cuando sea necesario.
              </div>
              
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Semana</th>
                      <th>Fecha Programada</th>
                      <th>Producto</th>
                      <th>Dosis</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendario.map((item) => {
                      const badge = getEstadoBadge(item.estado_entrega);
                      const IconComponent = badge.icon;
                      
                      return (
                        <tr key={item.id_calendario}>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="badge bg-secondary me-2">
                                {item.semana_aplicacion}
                              </span>
                              {item.es_desdoblamiento && (
                                <span className="badge bg-warning text-dark">
                                  <FaCut className="me-1" />
                                  Desdoblamiento #{item.numero_desdoblamiento}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {editandoFecha === item.id_calendario ? (
                              <div className="d-flex align-items-center">
                                <input
                                  type="date"
                                  className="form-control form-control-sm me-2"
                                  value={fechaEditForm}
                                  onChange={(e) => setFechaEditForm(e.target.value)}
                                  style={{ width: '150px' }}
                                />
                                <button
                                  className="btn btn-success btn-sm me-1"
                                  onClick={() => handleGuardarFecha(item.id_calendario)}
                                >
                                  <FaSave />
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={handleCancelarEdicion}
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center">
                                <span className="me-2">
                                  {formatearFecha(item.fecha_aplicacion_programada)}
                                </span>
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleEditarFecha(item)}
                                >
                                  <FaEdit />
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            <div>
                              <strong>{item.vacuna_nombre}</strong><br />
                              <small className="text-muted">{item.vacuna_tipo}</small>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {item.cantidad_dosis} dosis
                            </span>
                          </td>
                          <td>
                            <span className={badge.class}>
                              <IconComponent className="me-1" />
                              {badge.text}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group">
                              {!item.es_desdoblamiento && (
                                <button
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={() => handleDesdoblarDosis(item)}
                                  title="Crear desdoblamiento"
                                >
                                  <FaCut className="me-1" />
                                  Desdoblar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vista Control de Entregas */}
          {vistaActual === 'entregas' && (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha Entrega</th>
                    <th>Semana</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Tipo</th>
                    <th>Responsable</th>
                    <th>Usuario</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {controlEntregas.map((entrega) => (
                    <tr key={entrega.id_control_entrega}>
                      <td>
                        {new Date(entrega.fecha_entrega).toLocaleDateString('es-ES')}
                        <small className="d-block text-muted">
                          {new Date(entrega.fecha_entrega).toLocaleTimeString('es-ES')}
                        </small>
                      </td>
                      <td>
                        <span className="badge bg-info">
                          Semana {entrega.semana}
                        </span>
                      </td>
                      <td>
                        <strong>{entrega.nombre_producto}</strong>
                      </td>
                      <td>
                        <span className="badge bg-success">
                          {entrega.cantidad_entregada}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${entrega.tipo_entrega === 'completa' ? 'bg-success' : 'bg-warning'}`}>
                          {entrega.tipo_entrega}
                        </span>
                      </td>
                      <td>
                        <small>{entrega.responsable_entrega || '-'}</small>
                      </td>
                      <td>
                        <small>{entrega.usuario_nombre}</small>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => reimprimirRemitoPorCalendario(entrega.id_calendario)}
                          title="Reimprimir remito"
                          disabled={generandoRemito}
                        >
                          {generandoRemito ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <FaPrint />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {controlEntregas.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center text-muted">
                        <em>No hay entregas registradas</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Vista Resumen por Producto */}
          {vistaActual === 'resumen' && (
            <div className="row">
              {estadoPlan.resumen_por_producto?.map((producto, index) => (
                <div key={index} className="col-md-6 col-lg-4 mb-3">
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">
                        <FaBoxOpen className="me-2" />
                        {producto.nombre}
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row text-center">
                        <div className="col-4">
                          <h5 className="text-primary">{producto.programadas}</h5>
                          <small>Programadas</small>
                        </div>
                        <div className="col-4">
                          <h5 className="text-success">{producto.entregadas}</h5>
                          <small>Entregadas</small>
                        </div>
                        <div className="col-4">
                          <h5 className="text-warning">{producto.pendientes}</h5>
                          <small>Pendientes</small>
                        </div>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between">
                        <small>Stock Actual:</small>
                        <strong>{producto.stock_actual}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <small>Stock Reservado:</small>
                        <strong>{producto.stock_reservado}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <small>Disponible:</small>
                        <strong className={producto.stock_actual - producto.stock_reservado >= producto.pendientes ? 'text-success' : 'text-danger'}>
                          {producto.stock_actual - producto.stock_reservado}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Marcar Entrega */}
      {showEntregaModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaCheck className="me-2" />
                  Marcar Entrega de Dosis - Semana {calendarioSeleccionado?.semana_aplicacion} - {calendarioSeleccionado?.vacuna_nombre}
                </h5>
                <button 
                  className="btn-close"
                  onClick={() => setShowEntregaModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {calendarioSeleccionado && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Cantidad a Entregar *</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max={calendarioSeleccionado.cantidad_dosis - (calendarioSeleccionado.dosis_entregadas || 0)}
                        value={entregaForm.cantidad_entregada}
                        onChange={(e) => setEntregaForm({
                          ...entregaForm,
                          cantidad_entregada: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Responsable de Entrega</label>
                      <input
                        type="text"
                        className="form-control"
                        value={entregaForm.responsable_entrega}
                        onChange={(e) => setEntregaForm({
                          ...entregaForm,
                          responsable_entrega: e.target.value
                        })}
                        placeholder="Quien entrega las dosis"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Responsable que Recibe *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={entregaForm.responsable_recibe}
                        onChange={(e) => setEntregaForm({
                          ...entregaForm,
                          responsable_recibe: e.target.value
                        })}
                        placeholder="Quien recibe las dosis"
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Tipo de Entrega</label>
                      <select
                        className="form-select"
                        value={entregaForm.tipo_entrega}
                        onChange={(e) => setEntregaForm({
                          ...entregaForm,
                          tipo_entrega: e.target.value
                        })}
                      >
                        <option value="completa">Completa</option>
                        <option value="parcial">Parcial</option>
                        <option value="urgente">Urgente</option>
                        <option value="programada">Programada</option>
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Observaciones</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={entregaForm.observaciones_entrega}
                        onChange={(e) => setEntregaForm({
                          ...entregaForm,
                          observaciones_entrega: e.target.value
                        })}
                        placeholder="Observaciones adicionales..."
                      />
                    </div>
                    
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="imprimirRemito"
                          checked={entregaForm.imprimir_remito}
                          onChange={(e) => setEntregaForm({
                            ...entregaForm,
                            imprimir_remito: e.target.checked
                          })}
                        />
                        <label className="form-check-label" htmlFor="imprimirRemito">
                          <strong>¿Imprimir remito de entrega?</strong>
                          <small className="d-block text-muted">
                            Se generará un PDF con los detalles de la entrega
                          </small>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowEntregaModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleMarcarEntrega}
                  disabled={generandoRemito}
                >
                  {generandoRemito ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generando remito...
                    </>
                  ) : (
                    <>
                      <FaCheck className="me-2" />
                      Registrar Entrega
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Finalizar Plan */}
      {showFinalizarModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaFingerprint className="me-2" />
                  Finalizar Plan Vacunal
                </h5>
                <button 
                  className="btn-close"
                  onClick={() => setShowFinalizarModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Observaciones de Finalización</label>
                  <textarea
                    id="observaciones-finalizacion"
                    className="form-control"
                    rows="4"
                    placeholder="Ingrese observaciones sobre la finalización del plan..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowFinalizarModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-success"
                  onClick={handleFinalizarPlan}
                >
                  <FaFingerprint className="me-2" />
                  Finalizar Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Loading para Generación de Remitos */}
      {generandoRemito && (
        <div className="modal show d-block loading-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered loading-modal-enter-active">
            <div className="modal-content border-0 shadow-lg loading-modal-content">
              <div className="modal-body text-center p-5">
                <LoadingSpinner 
                  message="Generando remito de entrega" 
                  size="lg" 
                />
                <div className="mt-4">
                  <div className="progress mb-3" style={{ height: '6px' }}>
                    <div 
                      className="progress-bar progress-bar-striped progress-bar-animated bg-primary loading-progress" 
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                  <small className="text-muted loading-text">
                    Por favor no cierre esta ventana mientras se genera el documento
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Desdoblamiento */}
      {showDesdoblamientoModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaCut className="me-2" />
                  Crear Desdoblamiento de Dosis
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDesdoblamientoModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <FaInfoCircle className="me-2" />
                  <strong>Desdoblamiento:</strong> Esta función permite dividir una dosis programada en múltiples aplicaciones.
                </div>
                
                {calendarioParaDesdoblamiento && (
                  <div className="mb-3">
                    <strong>Dosis Original:</strong><br />
                    <span className="text-muted">
                      Semana {calendarioParaDesdoblamiento.semana_aplicacion} - {calendarioParaDesdoblamiento.vacuna_nombre}
                    </span>
                  </div>
                )}

                <form>
                  <div className="mb-3">
                    <label className="form-label">
                      <FaCalendarAlt className="me-2" />
                      Fecha de Aplicación del Desdoblamiento
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={desdoblamientoForm.fecha_aplicacion}
                      onChange={(e) => setDesdoblamientoForm({
                        ...desdoblamientoForm,
                        fecha_aplicacion: e.target.value
                      })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      <FaInfoCircle className="me-2" />
                      Observaciones
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={desdoblamientoForm.observaciones}
                      onChange={(e) => setDesdoblamientoForm({
                        ...desdoblamientoForm,
                        observaciones: e.target.value
                      })}
                      placeholder="Motivo del desdoblamiento, instrucciones especiales, etc."
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDesdoblamientoModal(false)}
                >
                  <FaTimes className="me-2" />
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={handleCrearDesdoblamiento}
                  disabled={!desdoblamientoForm.fecha_aplicacion}
                >
                  <FaCut className="me-2" />
                  Crear Desdoblamiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioVacunacion;