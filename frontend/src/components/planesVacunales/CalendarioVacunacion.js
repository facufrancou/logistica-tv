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
  FaCut,
  FaBoxes,
  FaBarcode,
  FaMapMarkerAlt,
  FaWarehouse,
  FaLock,
  FaCheckSquare,
  FaCircle
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as planesApi from '../../services/planesVacunalesApi';
import AlertasStock from './AlertasStock';
import './ModalAsignacionLotes.css';
import ModalGestionLotes from './ModalGestionLotes';
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
  
  // Estados para reasignación de lotes
  const [showReasignacionModal, setShowReasignacionModal] = useState(false);
  const [calendarioParaReasignacion, setCalendarioParaReasignacion] = useState(null);
  const [stocksDisponibles, setStocksDisponibles] = useState([]);
  const [stockSeleccionado, setStockSeleccionado] = useState(null);
  const [lotesSeleccionados, setLotesSeleccionados] = useState([]); // Para selección múltiple
  const [modoSeleccion, setModoSeleccion] = useState('simple'); // 'simple' o 'multiple'
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [realizandoReasignacion, setRealizandoReasignacion] = useState(false);
  
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

  // Estados para alertas de stock
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [hayProblemasStock, setHayProblemasStock] = useState(false);
  const [showModalAlertas, setShowModalAlertas] = useState(false);

  // Estados para modal de gestión de lotes
  const [showModalGestionLotes, setShowModalGestionLotes] = useState(false);
  const [itemGestionLotes, setItemGestionLotes] = useState(null);

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

      console.log('=== CALENDARIO CARGADO ===');
      console.log('Total items calendario:', calendarioData?.length);
      if (calendarioData && calendarioData.length > 0) {
        console.log('Primer item del calendario:', calendarioData[0]);
        console.log('Campos del primer item:');
        console.log('  - id_calendario:', calendarioData[0].id_calendario);
        console.log('  - id_producto:', calendarioData[0].id_producto);
        console.log('  - id_vacuna:', calendarioData[0].id_vacuna);
        console.log('  - vacuna_nombre:', calendarioData[0].vacuna_nombre);
        console.log('  - fecha_aplicacion_programada:', calendarioData[0].fecha_aplicacion_programada);
      }

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

  const handleProblemasDetectados = (tieneProblemas) => {
    setHayProblemasStock(tieneProblemas);
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

  // Función auxiliar para convertir fecha a formato YYYY-MM-DD para inputs date
  const formatearFechaParaInput = (fecha) => {
    if (!fecha) return '';
    
    // Si ya viene en el formato correcto (YYYY-MM-DD), devolverla tal como está
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    
    // Si es un objeto Date, usar métodos UTC para evitar problemas de timezone
    const date = new Date(fecha);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ===== FUNCIONES DE EDICIÓN =====
  
  const handleEditarFecha = (calendarioItem) => {
    setEditandoFecha(calendarioItem.id_calendario);
    setFechaEditForm(formatearFechaParaInput(calendarioItem.fecha_aplicacion_programada));
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

  // ===== FUNCIONES DE REASIGNACIÓN DE LOTES =====

  const handleAbrirReasignacion = async (calendarioItem, modo = 'simple') => {
    try {
      console.log('=== INICIO handleAbrirReasignacion ===');
      console.log('CalendarioItem completo:', calendarioItem);
      console.log('Modo selección:', modo);
      
      // Si el modo es 'faltante', calcular cuánto falta
      let cantidadRequerida = calendarioItem.cantidad_dosis;
      if (modo === 'faltante') {
        const dosisEntregadas = calendarioItem.dosis_entregadas || 0;
        cantidadRequerida = calendarioItem.cantidad_dosis - dosisEntregadas;
        console.log(`Modo FALTANTE: Total: ${calendarioItem.cantidad_dosis}, Entregadas: ${dosisEntregadas}, Faltante: ${cantidadRequerida}`);
      }
      
      const calendarioModificado = {
        ...calendarioItem,
        cantidad_dosis: cantidadRequerida
      };
      
      setCalendarioParaReasignacion(calendarioModificado);
      setModoSeleccion(modo);
      setLotesSeleccionados([]);
      setStockSeleccionado(null);
      setLoadingStocks(true);
      setShowReasignacionModal(true);

      // IMPORTANTE: El campo id_producto del calendario contiene el ID de la vacuna
      // El backend espera id_vacuna o id_producto como query param
      const idVacuna = calendarioItem.id_vacuna || calendarioItem.id_producto;
      
      console.log('ID Vacuna extraído:', idVacuna);
      console.log('  - calendarioItem.id_vacuna:', calendarioItem.id_vacuna);
      console.log('  - calendarioItem.id_producto:', calendarioItem.id_producto);
      console.log('Fecha de aplicación:', calendarioItem.fecha_aplicacion_programada);
      
      if (!idVacuna) {
        console.error('ERROR: No se encontró id_vacuna ni id_producto en calendarioItem');
        throw new Error('No se pudo obtener el ID de la vacuna. Faltan campos id_vacuna o id_producto en el calendario.');
      }

      console.log('Llamando a getStocksDisponibles con:', {
        id_vacuna: idVacuna,
        fecha_aplicacion: calendarioItem.fecha_aplicacion_programada
      });

      // Obtener stocks disponibles para esta vacuna
      const stocksData = await planesApi.getStocksDisponibles(
        idVacuna, 
        calendarioItem.fecha_aplicacion_programada
      );
      
      console.log('Respuesta de getStocksDisponibles:', stocksData);
      console.log('Stocks recibidos (data):', stocksData.data);
      console.log('Cantidad de stocks:', stocksData.data?.length || 0);
      
      setStocksDisponibles(stocksData.data || []);
      console.log('=== FIN handleAbrirReasignacion (ÉXITO) ===');
    } catch (error) {
      console.error('=== ERROR en handleAbrirReasignacion ===');
      console.error('Tipo de error:', error.constructor.name);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      console.error('Error completo:', error);
      
      showError('Error', 'No se pudieron cargar los stocks disponibles: ' + (error.message || 'Error desconocido'));
      setStocksDisponibles([]);
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleReasignarAutomatico = async (calendarioItem) => {
    try {
      setRealizandoReasignacion(true);
      const resultado = await planesApi.reasignarLoteAutomatico(calendarioItem.id_calendario);
      
      if (resultado.success) {
        if (resultado.reasignado) {
          showSuccess('Éxito', `Lote reasignado automáticamente: ${resultado.lote_nuevo}`);
        } else {
          showWarning('Info', resultado.mensaje || 'El lote actual sigue siendo válido');
        }
      } else {
        showWarning('Advertencia', resultado.error || 'No se pudo reasignar automáticamente');
      }
      
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error en reasignación automática:', error);
      showError('Error', 'Error al reasignar lote automáticamente');
    } finally {
      setRealizandoReasignacion(false);
    }
  };

  const handleAsignarLoteManual = async () => {
    try {
      if (modoSeleccion === 'simple') {
        // Modo simple: un solo lote
        if (!stockSeleccionado) {
          showError('Error', 'Debe seleccionar un stock');
          return;
        }

        setRealizandoReasignacion(true);
        
        await planesApi.asignarLoteManual(calendarioParaReasignacion.id_calendario, {
          id_stock_vacuna: stockSeleccionado.id_stock_vacuna,
          cantidad_asignar: calendarioParaReasignacion.cantidad_dosis
        });

        showSuccess('Éxito', `Lote ${stockSeleccionado.lote} asignado correctamente`);
      } else if (modoSeleccion === 'multiple' || modoSeleccion === 'faltante') {
        // Modo múltiple o faltante: varios lotes
        if (lotesSeleccionados.length === 0) {
          showError('Error', 'Debe seleccionar al menos un lote');
          return;
        }

        const cantidadTotal = lotesSeleccionados.reduce((sum, lote) => sum + lote.cantidad, 0);
        if (cantidadTotal < calendarioParaReasignacion.cantidad_dosis) {
          showError('Error', `La cantidad total seleccionada (${cantidadTotal}) es menor a la requerida (${calendarioParaReasignacion.cantidad_dosis})`);
          return;
        }

        setRealizandoReasignacion(true);
        
        await planesApi.asignarMultiplesLotesManual(calendarioParaReasignacion.id_calendario, {
          lotes: lotesSeleccionados.map(l => ({
            id_stock_vacuna: l.id_stock_vacuna,
            cantidad: l.cantidad
          })),
          es_faltante: modoSeleccion === 'faltante' // Indicador para el backend
        });

        const mensaje = modoSeleccion === 'faltante' 
          ? `Faltante completado: ${lotesSeleccionados.length} lote(s) asignados`
          : `${lotesSeleccionados.length} lote(s) asignados correctamente`;
        
        showSuccess('Éxito', mensaje);
      }
      
      setShowReasignacionModal(false);
      setStockSeleccionado(null);
      setLotesSeleccionados([]);
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error al asignar lote manual:', error);
      showError('Error', error.message || 'Error al asignar lote');
    } finally {
      setRealizandoReasignacion(false);
    }
  };

  const handleToggleLoteMultiple = (stock) => {
    const index = lotesSeleccionados.findIndex(l => l.id_stock_vacuna === stock.id_stock_vacuna);
    
    if (index >= 0) {
      // Ya está seleccionado, remover
      setLotesSeleccionados(lotesSeleccionados.filter((_, i) => i !== index));
    } else {
      // Agregar nuevo lote
      const cantidadRestante = calendarioParaReasignacion.cantidad_dosis - 
        lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0);
      
      const cantidadPorDefecto = Math.min(stock.stock_actual, cantidadRestante);
      
      setLotesSeleccionados([...lotesSeleccionados, {
        id_stock_vacuna: stock.id_stock_vacuna,
        lote: stock.lote,
        stock_disponible: stock.stock_actual,
        cantidad: cantidadPorDefecto,
        vencimiento: stock.fecha_vencimiento
      }]);
    }
  };

  const handleCambiarCantidadLote = (idStockVacuna, nuevaCantidad) => {
    setLotesSeleccionados(lotesSeleccionados.map(lote => {
      if (lote.id_stock_vacuna === idStockVacuna) {
        const cantidad = Math.max(1, Math.min(parseInt(nuevaCantidad) || 0, lote.stock_disponible));
        return { ...lote, cantidad };
      }
      return lote;
    }));
  };

  const handleAsignarMultiplesLotes = async (calendarioItem) => {
    try {
      setRealizandoReasignacion(true);
      const resultado = await planesApi.asignarMultiplesLotes(calendarioItem.id_calendario);
      
      showSuccess(
        'Éxito', 
        `Asignación completada con ${resultado.lotes_utilizados} lotes para ${resultado.cantidad_total} dosis`
      );
      
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error al asignar múltiples lotes:', error);
      showError('Error', error.message || 'Error al asignar múltiples lotes');
    } finally {
      setRealizandoReasignacion(false);
    }
  };

  const handleReasignarTodosLotes = async () => {
    try {
      if (!window.confirm('¿Está seguro de que desea reasignar todos los lotes de esta cotización?')) {
        return;
      }

      setRealizandoReasignacion(true);
      const resultado = await planesApi.reasignarTodosLotesCotizacion(cotizacionId);
      
      showSuccess(
        'Reasignación completada', 
        `${resultado.exitosos} lotes reasignados exitosamente, ${resultado.fallidos} fallidos`
      );
      
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error al reasignar todos los lotes:', error);
      showError('Error', 'Error al reasignar lotes de la cotización');
    } finally {
      setRealizandoReasignacion(false);
    }
  };

  // Función auxiliar para cargar el logo de la empresa
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
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        console.warn('No se pudo cargar LOGO.PNG, intentando logo blanco');
        // Fallback al logo blanco
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = function() {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = this.naturalWidth;
          canvas.height = this.naturalHeight;
          ctx.drawImage(this, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        fallbackImg.onerror = () => {
          console.warn('No se pudo cargar ningún logo');
          resolve(null);
        };
        fallbackImg.src = '/img/Logo blanco.png';
      };
      // Usar el nuevo LOGO.PNG (3780x945)
      img.src = '/img/LOGO.PNG';
    });
  };

  const handleExportarPDF = async () => {
    try {
      setGenerandoPDF(true);
      
      // Cargar logo de la empresa
      const logoDataUrl = await cargarLogo();
      
      // Crear instancia del documento
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Configuración del documento
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12; // Márgenes más pequeños para optimizar espacio

      // Colores corporativos en escala de grises
      const primaryColor = [64, 64, 64]; // Gris oscuro principal
      const secondaryColor = [96, 96, 96]; // Gris medio
      const accentColor = [128, 128, 128]; // Gris claro
      const lightGray = [245, 245, 245]; // Gris muy claro para fondos

      // ENCABEZADO CON LOGO Y DISEÑO PROFESIONAL (optimizado)
      // Rectángulo superior con color corporativo
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 22, 'F'); // Encabezado más compacto

      // Logo de la empresa (LOGO.PNG 3780x945)
      if (logoDataUrl) {
        try {
          // LOGO.PNG tiene proporción 3780:945 = 4:1 aproximadamente
          const logoHeight = 15; // Altura en mm
          const logoWidth = logoHeight * 4; // Ancho proporcional (4:1)
          
          // Posicionar el logo en el encabezado
          doc.addImage(logoDataUrl, 'PNG', margin, 5, logoWidth, logoHeight, undefined, 'FAST');
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error);
          // Fallback mejorado
          doc.setFillColor(255, 255, 255);
          doc.rect(margin, 4, 60, 15, 'F'); // Ajustar tamaño del fallback
          doc.setTextColor(64, 64, 64);
          doc.setFontSize(8);
          doc.setFont('courier', 'bold');
          doc.text('TERMOPLAST', margin + 30, 10, { align: 'center' });
          doc.text('LOGÍSTICA', margin + 30, 14, { align: 'center' });
          doc.text('VETERINARIA', margin + 30, 18, { align: 'center' });
        }
      } else {
        // Fallback elegante si no hay logo
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, 4, 30, 17, 'F');
        doc.setTextColor(64, 64, 64);
        doc.setFontSize(8);
        doc.setFont('courier', 'bold');
        doc.text('TERMOPLAST', margin + 15, 10, { align: 'center' });
        doc.text('LOGÍSTICA', margin + 15, 14, { align: 'center' });
        doc.text('VETERINARIA', margin + 15, 18, { align: 'center' });
      }

      // Título principal (más compacto)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('courier', 'bold');
      doc.text('PLAN VACUNAL', pageWidth / 2, 12, { align: 'center' });

      // Subtítulo con cotización y cliente
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      const subtitulo = `${cotizacion?.numero_cotizacion || 'COT-251013-391'} | ${cotizacion?.cliente?.nombre || 'BIODER S.A'}`;
      doc.text(subtitulo, pageWidth / 2, 18, { align: 'center' });

      // Información del encabezado en recuadros estilizados (optimizados)
      doc.setTextColor(...secondaryColor);
      let yPos = 28; // Espacio inicial optimizado

      // Crear recuadros para la información del encabezado
      const infoBoxWidth = (pageWidth - 2 * margin) / 2;
      const infoBoxHeight = 24; // Cajas más compactas

      // Recuadro izquierdo - Información del cliente
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, infoBoxWidth - 3, infoBoxHeight, 'F');
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.8);
      doc.rect(margin, yPos, infoBoxWidth - 3, infoBoxHeight, 'S');

      // Datos del cliente (optimizados)
      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL CLIENTE', margin + 2, yPos + 4);
      
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(`Cliente: ${cotizacion?.cliente?.nombre || 'BIODER S.A'}`, margin + 2, yPos + 8);
      doc.text(`Cotización: ${cotizacion?.numero_cotizacion || 'COT-251013-391'}`, margin + 2, yPos + 11);
      doc.text(`Fecha Nacimiento: ${cotizacion?.fecha_inicio_plan ? new Date(cotizacion.fecha_inicio_plan).toLocaleDateString('es-ES') : '26/10/2025'}`, margin + 2, yPos + 14);
      doc.text(`Cantidad de Pollos: ${cotizacion?.cantidad_animales?.toLocaleString() || '3500'}`, margin + 2, yPos + 17);
      doc.text(`Genética: ${cotizacion?.genetica || 'A definir'}`, margin + 2, yPos + 20);

      // Recuadro derecho - Información técnica
      doc.setFillColor(...lightGray);
      doc.rect(margin + infoBoxWidth + 3, yPos, infoBoxWidth - 3, infoBoxHeight, 'F');
      doc.rect(margin + infoBoxWidth + 3, yPos, infoBoxWidth - 3, infoBoxHeight, 'S');

      // Datos técnicos
      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN TÉCNICA', margin + infoBoxWidth + 5, yPos + 4);
      
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(`Plan: ${cotizacion?.plan?.nombre || 'Plan de prueba'}`, margin + infoBoxWidth + 5, yPos + 8);
      doc.text(`Duración: ${cotizacion?.plan?.duracion_semanas || '2'} semanas`, margin + infoBoxWidth + 5, yPos + 11);
      doc.text(`Estado: ${cotizacion?.estado || 'aceptada'}`, margin + infoBoxWidth + 5, yPos + 14);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, margin + infoBoxWidth + 5, yPos + 17);
      doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES')}`, margin + infoBoxWidth + 5, yPos + 20);

      // Separador elegante con decoración (optimizado)
      yPos += 28;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      // Pequeños círculos decorativos
      doc.setFillColor(...accentColor);
      doc.circle(margin + 12, yPos, 0.6, 'F');
      doc.circle(pageWidth - margin - 12, yPos, 0.6, 'F');

      // TABLA DE CALENDARIO OPTIMIZADA - MÁXIMO ESPACIO DISPONIBLE
      yPos += 4;

      // Preparar datos para la tabla con todos los campos solicitados
      const tableHeaders = [
        'FECHA', 
        'DÍA', 
        'SEM', 
        'VACUNA (PRODUCTO)', 
        'PATOLOGÍA', 
        'VÍA', 
        'FRASCOS'
      ];
      
      const tableData = calendario.map((item, index) => {
        const fecha = new Date(item.fecha_aplicacion_programada);
        const fechaInicio = new Date(cotizacion.fecha_inicio_plan);
        
        // Calcular día del plan
        const diffTime = fecha.getTime() - fechaInicio.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // Calcular frascos basado en la cantidad de animales y dosis típicas por frasco
        const cantidadAnimales = cotizacion?.cantidad_animales || 3500;
        const dosisPorFrasco = item.vacuna_descripcion?.includes('OLEOSA') ? 500 : 1000; // Vacunas oleosas suelen tener menos dosis
        const frascos = Math.ceil(cantidadAnimales / dosisPorFrasco);
        
        // Formatear nombre del producto: vacuna || presentación || proveedor
        const nombreVacuna = item.vacuna_nombre || item.producto_nombre;
        const presentacion = item.presentacion || '';
        const proveedor = item.proveedor_nombre || item.proveedor || '';
        
        let nombreProducto = nombreVacuna;
        if (presentacion) {
          nombreProducto += ` || ${presentacion}`;
        }
        if (proveedor) {
          nombreProducto += ` || ${proveedor}`;
        }
        
        // Obtener patología del item - revisar múltiples posibles campos
        const patologia = item.patologia_nombre || 
                         item.patologia || 
                         item.enfermedad || 
                         item.vacuna_patologia ||
                         item.vacuna?.patologia_nombre ||
                         item.vacuna?.patologia ||
                         (item.vacuna_descripcion && item.vacuna_descripcion.includes('COCCIVET') ? 'COCCIDIOS' : '') ||
                         (item.vacuna_descripcion && item.vacuna_descripcion.includes('OLEOSA') ? 'MICOPLASMOSIS' : '') ||
                         'A definir';
        
        // Obtener vía de aplicación del item
        const viaAplicacion = item.via_aplicacion || 
                             item.via_aplicacion_codigo ||
                             item.via_aplicacion_nombre ||
                             item.vacuna?.via_aplicacion?.codigo ||
                             item.vacuna?.via_aplicacion?.nombre ||
                             'IM'; // Valor por defecto si no se encuentra
        
        return [
          fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
          }),
          diffDays.toString(),
          item.semana_aplicacion.toString(),
          nombreProducto.substring(0, 70) + (nombreProducto.length > 70 ? '...' : ''),
          patologia,
          viaAplicacion,
          frascos.toString()
        ];
      });

      // Calcular el ancho disponible para la tabla (usar todo el ancho como en los recuadros)
      const tableWidth = pageWidth - 2 * margin;

      // Crear tabla optimizada para espacio y ancho completo
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        margin: { left: margin, right: margin },
        tableWidth: tableWidth, // Forzar ancho de tabla
        styles: {
          fontSize: 8, // Optimizar tamaño para más contenido
          cellPadding: 2, // Reducir padding para más espacio
          halign: 'center',
          valign: 'middle',
          lineColor: primaryColor,
          lineWidth: 0.2,
          font: 'courier'
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8, // Tamaño consistente con el contenido
          cellPadding: 2.5,
          font: 'courier',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.10, halign: 'center' }, // FECHA
          1: { cellWidth: tableWidth * 0.05, halign: 'center' }, // DÍA
          2: { cellWidth: tableWidth * 0.05, halign: 'center' }, // SEM
          3: { cellWidth: tableWidth * 0.50, halign: 'left', fontSize: 7 }, // VACUNA (más espacio)
          4: { cellWidth: tableWidth * 0.18, halign: 'center', fontSize: 7 }, // PATOLOGÍA
          5: { cellWidth: tableWidth * 0.05, halign: 'center' }, // VÍA
          6: { cellWidth: tableWidth * 0.07, halign: 'center' }  // FRASCOS (más ancho)
        },
        didDrawPage: function (data) {
          // Agregar números de página
          doc.setFontSize(7);
          doc.setTextColor(...secondaryColor);
          doc.setFont('courier', 'normal');
          doc.text(`Página ${data.pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        }
      });

      // PIE DE PÁGINA PROFESIONAL (optimizado)
      const finalY = doc.lastAutoTable.finalY + 8;
      
      // Rectángulo inferior con información del sistema (más compacto)
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.setFont('courier', 'bold');
      doc.text('Sistema de Gestión - Tierra Volga', margin, pageHeight - 12);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')} | contacto@tierravolga.com.ar`, margin, pageHeight - 8);
      doc.text('Documento de uso profesional - Prohibida su reproducción sin autorización', margin, pageHeight - 4);
      
      // Descargar el PDF
      const fileName = `plan-vacunal-${cotizacion?.numero_cotizacion || 'calendario'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      showSuccess('Éxito', 'PDF generado correctamente - Optimizado para una página');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      showError('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleGenerarOrdenCompra = async () => {
    if (!cotizacion || !cotizacionId) {
      showError('Error', 'No se puede generar la orden sin una cotización válida');
      return;
    }

    setGenerandoPDF(true);
    try {
      console.log('Obteniendo datos para orden de compra...');
      
      // Obtener datos del backend
      const response = await planesApi.generarOrdenCompra(cotizacionId);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener datos de orden de compra');
      }

      const { cotizacion: cotizacionData, proveedores, resumen } = response.data;

      if (proveedores.length === 0) {
        showWarning('Información', 'No hay vacunas sin lote asignado para generar orden de compra');
        return;
      }

      console.log('Generando PDF de orden de compra...', { proveedores: proveedores.length });

      // Crear PDF con jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colores y medidas (esquema gris como cotizaciones)
      const primaryColor = [70, 70, 70]; // Gris oscuro
      const secondaryColor = [102, 102, 102]; // Gris medio
      const accentColor = [158, 158, 158]; // Gris claro para acentos
      const lightGray = [245, 245, 245];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      let yPos = margin;

      // ============ CABECERA ============
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Título principal
      doc.setFont('courier', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('ORDEN DE COMPRA', pageWidth / 2, 15, { align: 'center' });

      // Subtítulo
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.text('Vacunas sin lote asignado', pageWidth / 2, 22, { align: 'center' });

      // Número de orden y fecha
      const numeroOrden = `OC-${cotizacionData.numero_cotizacion}-${new Date().toISOString().split('T')[0]}`;
      doc.setFontSize(9);
      doc.text(`Orden N°: ${numeroOrden}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 33, { align: 'center' });

      yPos = 45;

      // ============ INFORMACIÓN DEL CLIENTE Y PLAN ============
      const infoBoxHeight = 22;
      const infoBoxWidth = (pageWidth - 2 * margin - 3) / 2;

      // Recuadro izquierdo - Cliente
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, infoBoxWidth, infoBoxHeight, 'F');
      doc.rect(margin, yPos, infoBoxWidth, infoBoxHeight, 'S');

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL CLIENTE', margin + 2, yPos + 4);

      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(`Cliente: ${cotizacionData.cliente.nombre}`, margin + 2, yPos + 8);
      doc.text(`CUIT: ${cotizacionData.cliente.cuit || 'N/A'}`, margin + 2, yPos + 11);
      doc.text(`Email: ${cotizacionData.cliente.email || 'N/A'}`, margin + 2, yPos + 14);
      doc.text(`Teléfono: ${cotizacionData.cliente.telefono || 'N/A'}`, margin + 2, yPos + 17);

      // Recuadro derecho - Plan
      doc.setFillColor(...lightGray);
      doc.rect(margin + infoBoxWidth + 3, yPos, infoBoxWidth - 3, infoBoxHeight, 'F');
      doc.rect(margin + infoBoxWidth + 3, yPos, infoBoxWidth - 3, infoBoxHeight, 'S');

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL PLAN', margin + infoBoxWidth + 5, yPos + 4);

      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text(`Plan: ${cotizacionData.plan_nombre || 'N/A'}`, margin + infoBoxWidth + 5, yPos + 8);
      doc.text(`Cotización: ${cotizacionData.numero_cotizacion}`, margin + infoBoxWidth + 5, yPos + 11);
      doc.text(`Animales: ${cotizacionData.cantidad_animales?.toLocaleString() || '0'}`, margin + infoBoxWidth + 5, yPos + 14);
      doc.text(`Duración: ${cotizacionData.duracion_semanas || '0'} semanas`, margin + infoBoxWidth + 5, yPos + 17);

      yPos += infoBoxHeight + 8;

      // ============ RESUMEN ============
      doc.setFillColor(...accentColor);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); // Texto negro sobre fondo gris
      doc.text(`RESUMEN: ${resumen.total_proveedores} Proveedor(es) | ${resumen.total_frascos_general} Frascos Totales`, margin + 2, yPos + 6);

      yPos += 14;

      // ============ DETALLES POR PROVEEDOR ============
      for (let i = 0; i < proveedores.length; i++) {
        const proveedor = proveedores[i];

        // Verificar si necesitamos nueva página
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        }

        // Cabecera del proveedor
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');

        doc.setFont('courier', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`PROVEEDOR: ${proveedor.nombre_proveedor.toUpperCase()}`, margin + 2, yPos + 8);

        yPos += 16;

        // Tabla de vacunas
        const tableHeaders = ['VACUNA', 'PATOLOGÍA', 'PRESENT.', 'SEMANAS', 'DOSIS', 'STOCK', 'FRASCOS'];
        const tableData = proveedor.vacunas.map(vacuna => [
          vacuna.nombre.substring(0, 30),
          vacuna.patologia,
          vacuna.presentacion.substring(0, 15),
          vacuna.calendario_items.map(item => item.semana).join(', '),
          vacuna.total_dosis_necesarias.toLocaleString(),
          vacuna.frascos_en_stock.toString(),
          vacuna.frascos_a_pedir.toString()
        ]);

        autoTable(doc, {
          head: [tableHeaders],
          body: tableData,
          startY: yPos,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 7,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle',
            lineColor: primaryColor,
            lineWidth: 0.2,
            font: 'courier'
          },
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            font: 'courier'
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          },
          columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 15 },
            6: { cellWidth: 20, fontStyle: 'bold', textColor: primaryColor }
          }
        });

        yPos = doc.lastAutoTable.finalY + 4;

        // Total del proveedor
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'S');

        doc.setFont('courier', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text(`TOTAL FRASCOS ${proveedor.nombre_proveedor}: ${proveedor.total_frascos_proveedor}`, pageWidth - margin - 2, yPos + 5, { align: 'right' });

        yPos += 14;
      }

      // ============ PIE DE PÁGINA ============
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');

      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.setFont('courier', 'bold');
      doc.text('Sistema de Gestión - Tierra Volga', margin, pageHeight - 12);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, margin, pageHeight - 8);
      doc.text('Documento de uso interno - Orden de compra', margin, pageHeight - 4);

      // Descargar PDF
      const fileName = `orden-compra-${cotizacionData.numero_cotizacion}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      showSuccess('Éxito', `Orden de compra generada: ${proveedores.length} proveedor(es), ${resumen.total_frascos_general} frascos`);

    } catch (error) {
      console.error('Error generando orden de compra:', error);
      showError('Error', 'No se pudo generar la orden de compra: ' + error.message);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No programada';
    
    try {
      // Si ya viene en formato string YYYY-MM-DD, formatear directamente
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [year, month, day] = fecha.split('-');
        return `${day}/${month}/${year}`;
      }
      
      const dateObj = new Date(fecha);
      
      // Verificar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        console.warn('Fecha inválida para formatear:', fecha);
        return 'Fecha inválida';
      }
      
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
          
          {/* Botones de Acción Centrales */}
          <div className="d-flex align-items-center gap-2">
            <button 
              className={`btn btn-sm ${
                hayProblemasStock 
                  ? 'btn-warning btn-warning-custom' 
                  : 'btn-outline-light'
              }`}
              onClick={() => setShowModalAlertas(true)}
              title={
                hayProblemasStock 
                  ? 'Ver alertas críticas detectadas'
                  : 'Ver estado de alertas'
              }
              style={{
                ...(hayProblemasStock ? {
                  animation: 'pulse 2s infinite',
                  boxShadow: '0 0 10px rgba(255, 193, 7, 0.5)'
                } : {})
              }}
            >
              {hayProblemasStock && (
                <span className="badge bg-danger text-white me-1" style={{ fontSize: '0.7em' }}>!</span>
              )}
              <FaExclamationTriangle className="me-1" />
              Alertas
              {hayProblemasStock && (
                <span className="badge bg-light text-dark ms-1" style={{ fontSize: '0.7em' }}>
                  Revisar
                </span>
              )}
            </button>
            <button 
              className="btn btn-outline-warning btn-sm"
              onClick={handleReasignarTodosLotes}
              disabled={realizandoReasignacion}
              title="Reasignar todos los lotes de esta cotización"
            >
              {realizandoReasignacion ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Reasignando...</span>
                  </div>
                  Reasignando...
                </>
              ) : (
                <>
                  Reasignar Todos los Lotes
                </>
              )}
            </button>
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
                  Exportar PDF
                </>
              )}
            </button>
            <button 
              className="btn btn-outline-warning btn-sm"
              onClick={handleGenerarOrdenCompra}
              disabled={generandoPDF}
              title="Generar orden de compra para vacunas sin lote"
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
                  <FaBoxOpen className="me-1" />
                  Orden de Compra
                </>
              )}
            </button>
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

      {/* Tabs de Navegación */}
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${vistaActual === 'calendario' ? 'active' : ''}`}
                  onClick={() => setVistaActual('calendario')}
                  style={{
                    backgroundColor: vistaActual === 'calendario' ? 'var(--color-principal)' : 'transparent',
                    color: vistaActual === 'calendario' ? 'white' : '#495057',
                    border: 'none'
                  }}
                >
                  Calendario
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${vistaActual === 'edicion' ? 'active' : ''}`}
                  onClick={() => setVistaActual('edicion')}
                  style={{
                    backgroundColor: vistaActual === 'edicion' ? 'var(--color-principal)' : 'transparent',
                    color: vistaActual === 'edicion' ? 'white' : '#495057',
                    border: 'none'
                  }}
                >
                  Editar Calendario
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${vistaActual === 'entregas' ? 'active' : ''}`}
                  onClick={() => setVistaActual('entregas')}
                  style={{
                    backgroundColor: vistaActual === 'entregas' ? 'var(--color-principal)' : 'transparent',
                    color: vistaActual === 'entregas' ? 'white' : '#495057',
                    border: 'none'
                  }}
                >
                  Control de Entregas
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${vistaActual === 'resumen' ? 'active' : ''}`}
                  onClick={() => setVistaActual('resumen')}
                  style={{
                    backgroundColor: vistaActual === 'resumen' ? 'var(--color-principal)' : 'transparent',
                    color: vistaActual === 'resumen' ? 'white' : '#495057',
                    border: 'none'
                  }}
                >
                  Resumen por Producto
                </button>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="card-body">
          {/* Alertas de Stock - Solo para detección, no mostrar contenido aquí */}
          <AlertasStock 
            cotizacionId={cotizacionId}
            onProblemasDetectados={handleProblemasDetectados}
            mostrarContenido={false}
          />
          
          {/* Vista Calendario */}
          {vistaActual === 'calendario' && (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Fecha Programada</th>
                    <th>Producto</th>
                    <th>Lote Asignado</th>
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
                          {formatearFecha(item.fecha_aplicacion_programada)}
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
                          <div>
                            {item.lote_asignado ? (
                              <>
                                <div className="d-flex align-items-center">
                                  <strong className="text-primary">{item.lote_asignado}</strong>
                                  {item.lote_asignado.includes('+') && (
                                    <button
                                      className="btn btn-sm btn-outline-info ms-2"
                                      onClick={() => {
                                        setItemGestionLotes(item);
                                        setShowModalGestionLotes(true);
                                      }}
                                      title="Ver todos los lotes asignados"
                                    >
                                      <FaEye />
                                    </button>
                                  )}
                                </div>
                                {item.fecha_vencimiento_lote && (
                                  <small className="d-block text-muted">
                                    <FaClock className="me-1" />
                                    Vence: {formatearFecha(item.fecha_vencimiento_lote)}
                                  </small>
                                )}
                                {item.ubicacion_fisica && (
                                  <small className="d-block text-info">
                                    <FaBoxOpen className="me-1" />
                                    {item.ubicacion_fisica}
                                  </small>
                                )}
                              </>
                            ) : (
                              <span className="text-muted">
                                <FaExclamationTriangle className="me-1" />
                                Sin lote asignado
                              </span>
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
                          
                          {/* Botón para gestión de lotes */}
                          <button
                            className="btn btn-sm btn-outline-warning me-2"
                            onClick={() => {
                              setItemGestionLotes(item);
                              setShowModalGestionLotes(true);
                            }}
                            title="Gestión de lotes"
                            disabled={realizandoReasignacion}
                          >
                            <FaBoxOpen />
                          </button>
                          
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
                              <small className="text-muted">{item.vacuna_descripcion}</small>
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
          <div className="modal-dialog modal-dialog-centered">
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
          <div className="modal-dialog modal-dialog-centered">
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
          <div className="modal-dialog modal-dialog-centered">
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

      {/* Modal de Reasignación de Lotes */}
      {showReasignacionModal && (
        <>
          {/* Backdrop oscuro */}
          <div 
            className="modal-backdrop fade show" 
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1040
            }}
            onClick={() => {
              setShowReasignacionModal(false);
              setStockSeleccionado(null);
              setLotesSeleccionados([]);
            }}
          ></div>
          
          {/* Modal */}
          <div className="modal fade show modal-asignacion-lotes" tabIndex="-1" style={{ padding: 0 }}>
            <div className="modal-asignacion-lotes-dialog" style={{ width: '80%', maxWidth: '80%', minWidth: '80%', margin: '0 auto' }}>
              <div className="modal-content modal-asignacion-lotes-content" style={{ width: '100%', maxWidth: 'none' }}>
              <div className="modal-header" style={{ padding: '1rem 1.5rem' }}>
                <h4 className="modal-title mb-0" style={{ fontSize: '1.1rem' }}>
                  <FaBoxOpen className="me-2" size={18} />
                  {modoSeleccion === 'faltante' 
                    ? '⚠️ Asignar Faltante' 
                    : modoSeleccion === 'simple' 
                      ? 'Asignar Lote' 
                      : 'Asignar Múltiples Lotes'} - {calendarioParaReasignacion?.vacuna_nombre}
                </h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowReasignacionModal(false);
                    setStockSeleccionado(null);
                    setLotesSeleccionados([]);
                  }}
                ></button>
              </div>
              <div className="modal-body modal-asignacion-lotes-body">
                {/* Info Header - Layout horizontal compacto */}
                <div className="d-flex gap-2 mb-3">
                  <div className="flex-fill">
                    <div className="card h-100 border-primary">
                      <div className="card-body p-2 text-center">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>Aplicación</small>
                        <h5 className="mb-0" style={{ fontSize: '1rem' }}>Semana {calendarioParaReasignacion?.semana_aplicacion}</h5>
                        <small className="text-muted" style={{ fontSize: '0.8rem' }}>{calendarioParaReasignacion?.fecha_aplicacion_programada}</small>
                      </div>
                    </div>
                  </div>
                  <div className="flex-fill">
                    <div className="card h-100 border-info">
                      <div className="card-body p-2 text-center">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>Lote actual</small>
                        <h5 className="mb-0" style={{ fontSize: '1rem' }}>{calendarioParaReasignacion?.lote_asignado || 'Sin asignar'}</h5>
                      </div>
                    </div>
                  </div>
                  <div className="flex-fill">
                    <div className="card h-100 border-success">
                      <div className="card-body p-2 text-center">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>Cantidad requerida</small>
                        <h3 className="mb-0 text-primary" style={{ fontSize: '1.4rem' }}>{calendarioParaReasignacion?.cantidad_dosis?.toLocaleString()} dosis</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alerta para modo faltante */}
                {modoSeleccion === 'faltante' && (
                  <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
                    <FaExclamationTriangle className="me-3" size={20} />
                    <div>
                      <strong>Modo: Asignar Faltante</strong>
                      <p className="mb-0 mt-1">
                        Solo necesita asignar <strong>{calendarioParaReasignacion?.cantidad_dosis?.toLocaleString()} dosis faltantes</strong> para completar la entrega.
                      </p>
                    </div>
                  </div>
                )}

                {/* Botones de modo - Solo si NO es modo faltante */}
                {modoSeleccion !== 'faltante' && (
                  <div className="btn-group mb-3 w-100 shadow-sm" role="group" style={{ height: '45px' }}>
                    <button
                      type="button"
                      className={`btn btn-lg ${modoSeleccion === 'simple' ? 'btn-dark' : 'btn-outline-dark'}`}
                      style={{ fontSize: '0.95rem' }}
                      onClick={() => {
                        setModoSeleccion('simple');
                        setLotesSeleccionados([]);
                      }}
                    >
                      <FaBoxOpen className="me-2" size={16} />
                      Lote Único
                    </button>
                    <button
                      type="button"
                      className={`btn btn-lg ${modoSeleccion === 'multiple' ? 'btn-dark' : 'btn-outline-dark'}`}
                      style={{ fontSize: '0.95rem' }}
                      onClick={() => {
                        setModoSeleccion('multiple');
                        setStockSeleccionado(null);
                      }}
                    >
                      <FaPlus className="me-2" size={16} />
                      Múltiples Lotes
                    </button>
                  </div>
                )}

                {loadingStocks ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Cargando stocks...</span>
                    </div>
                    <p className="mt-3 text-muted">Cargando stocks disponibles...</p>
                  </div>
                ) : stocksDisponibles.length === 0 ? (
                  <div className="alert alert-warning d-flex align-items-center" role="alert">
                    <FaExclamationTriangle className="me-3" size={24} />
                    <div>
                      <strong>No hay stocks disponibles</strong>
                      <p className="mb-0 mt-1">No se encontraron lotes para esta vacuna con vencimiento posterior a la fecha de aplicación.</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header de la tabla */}
                    <div className="d-flex align-items-center justify-content-between mb-3 p-3 bg-light rounded">
                      <h5 className="mb-0">
                        <FaBoxes className="me-2 text-primary" />
                        Lotes Disponibles <span className="badge bg-primary ms-2">{stocksDisponibles.length}</span>
                      </h5>
                      <span className="badge bg-success fs-6 px-3 py-2">
                        Total: {stocksDisponibles.reduce((sum, s) => sum + s.stock_actual, 0).toLocaleString()} dosis
                      </span>
                    </div>

                    {/* Tabla con diseño mejorado */}
                    <div style={{ 
                      maxHeight: '500px', 
                      overflowY: 'auto', 
                      border: '2px solid #dee2e6', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      fontSize: '0.85rem'
                    }}>
                      <table className="table table-hover mb-0" style={{ fontSize: '0.85rem', tableLayout: 'fixed', width: '100%' }}>
                        <thead style={{ 
                          position: 'sticky', 
                          top: 0, 
                          zIndex: 10, 
                          backgroundColor: '#343a40',
                          color: 'white',
                          fontSize: '0.85rem'
                        }}>
                          <tr>
                            <th style={{ width: '5%', textAlign: 'center', padding: '0.6rem' }}>
                              {modoSeleccion === 'simple' ? (
                                <FaCircle size={14} />
                              ) : (
                                <FaCheckSquare size={16} />
                              )}
                            </th>
                            <th style={{ padding: '0.5rem 0.75rem', width: '20%' }}>
                              <FaBarcode className="me-2" size={16} />
                              Lote
                            </th>
                            <th style={{ padding: '0.5rem 0.75rem', width: '18%' }}>
                              <FaCalendarAlt className="me-2" size={16} />
                              Vencimiento
                            </th>
                            <th className="text-center" style={{ padding: '0.5rem 0.75rem', width: '15%' }}>
                              <FaBoxOpen className="me-2" size={16} />
                              Stock
                            </th>
                            <th style={{ padding: '0.5rem 0.75rem', width: (modoSeleccion === 'multiple' || modoSeleccion === 'faltante') ? '27%' : '42%' }}>
                              <FaMapMarkerAlt className="me-2" size={16} />
                              Ubicación
                            </th>
                            {(modoSeleccion === 'multiple' || modoSeleccion === 'faltante') && (
                              <th style={{ width: '15%', padding: '0.5rem 0.75rem' }}>
                                <FaEdit className="me-2" size={16} />
                                Cantidad
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {stocksDisponibles.map((stock) => {
                            const estaSeleccionadoMultiple = lotesSeleccionados.find(l => l.id_stock_vacuna === stock.id_stock_vacuna);
                            const cantidadSeleccionada = estaSeleccionadoMultiple?.cantidad || 0;
                            const esInsuficiente = stock.stock_actual < calendarioParaReasignacion?.cantidad_dosis;
                            
                            return (
                              <tr 
                                key={stock.id_stock_vacuna}
                                className={
                                  modoSeleccion === 'simple' && stockSeleccionado?.id_stock_vacuna === stock.id_stock_vacuna 
                                    ? 'table-active' 
                                    : estaSeleccionadoMultiple 
                                    ? 'table-success' 
                                    : ''
                                }
                                style={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                  if (modoSeleccion === 'simple' && !esInsuficiente) {
                                    setStockSeleccionado(stock);
                                  }
                                }}
                              >
                                <td className="text-center" style={{ padding: '0.5rem 0.75rem' }} onClick={(e) => e.stopPropagation()}>
                                  {modoSeleccion === 'simple' ? (
                                    <input
                                      type="radio"
                                      name="stockSelector"
                                      className="form-check-input"
                                      style={{ 
                                        cursor: esInsuficiente ? 'not-allowed' : 'pointer',
                                        width: '20px',
                                        height: '20px'
                                      }}
                                      value={stock.id_stock_vacuna}
                                      checked={stockSeleccionado?.id_stock_vacuna === stock.id_stock_vacuna}
                                      onChange={() => setStockSeleccionado(stock)}
                                      disabled={esInsuficiente}
                                    />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      style={{ 
                                        cursor: stock.stock_actual === 0 ? 'not-allowed' : 'pointer',
                                        width: '20px',
                                        height: '20px'
                                      }}
                                      checked={!!estaSeleccionadoMultiple}
                                      onChange={() => handleToggleLoteMultiple(stock)}
                                      disabled={stock.stock_actual === 0}
                                    />
                                  )}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.9rem' }}>{stock.lote}</strong>
                                    {modoSeleccion === 'simple' && esInsuficiente && (
                                      <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.75rem' }}>
                                        <FaExclamationTriangle size={10} className="me-1" />
                                        Insuficiente
                                      </span>
                                    )}
                                  </div>
                                  {stock.vacuna_codigo && (
                                    <small className="text-muted d-block mt-1">Código: {stock.vacuna_codigo}</small>
                                  )}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <div>
                                    <div className="mb-1">{formatearFecha(stock.fecha_vencimiento)}</div>
                                    {stock.dias_hasta_vencimiento !== undefined && (
                                      <span className={`badge ${
                                        stock.dias_hasta_vencimiento < 30 ? 'bg-danger' : 
                                        stock.dias_hasta_vencimiento < 90 ? 'bg-warning text-dark' : 
                                        'bg-success'
                                      }`} style={{ fontSize: '0.75rem' }}>
                                        {stock.dias_hasta_vencimiento} días
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center" style={{ padding: '0.5rem 0.75rem' }}>
                                  <div>
                                    <span className={`badge d-block mb-2 ${
                                      stock.stock_actual >= calendarioParaReasignacion?.cantidad_dosis 
                                        ? 'bg-success' 
                                        : stock.stock_actual > 0 
                                        ? 'bg-warning text-dark' 
                                        : 'bg-danger'
                                    }`} style={{ fontSize: '1.1rem', padding: '8px 12px' }}>
                                      {stock.stock_actual.toLocaleString()}
                                    </span>
                                    {stock.stock_reservado > 0 && (
                                      <small className="text-muted d-block">
                                        <FaLock size={10} className="me-1" />
                                        {stock.stock_reservado} reservado
                                      </small>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <div className="d-flex align-items-center">
                                    {stock.ubicacion_fisica ? (
                                      <>
                                        <FaWarehouse className="me-2 text-muted" size={16} />
                                        <span>{stock.ubicacion_fisica}</span>
                                      </>
                                    ) : (
                                      <span className="text-muted fst-italic">Sin ubicación</span>
                                    )}
                                  </div>
                                </td>
                                {(modoSeleccion === 'multiple' || modoSeleccion === 'faltante') && (
                                  <td style={{ padding: '0.5rem 0.75rem' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="number"
                                      className="form-control"
                                      min="0"
                                      max={stock.stock_actual}
                                      value={cantidadSeleccionada}
                                      onChange={(e) => {
                                        const nuevaCantidad = parseInt(e.target.value) || 0;
                                        if (nuevaCantidad > 0) {
                                          // Si escribe una cantidad, auto-seleccionar el lote
                                          if (!estaSeleccionadoMultiple) {
                                            handleToggleLoteMultiple(stock);
                                          }
                                          handleCambiarCantidadLote(stock.id_stock_vacuna, nuevaCantidad);
                                        } else if (nuevaCantidad === 0 && estaSeleccionadoMultiple) {
                                          // Si pone 0, deseleccionar
                                          handleToggleLoteMultiple(stock);
                                        }
                                      }}
                                      onFocus={(e) => {
                                        // Al hacer foco, si no está seleccionado, auto-seleccionar con cantidad sugerida
                                        if (!estaSeleccionadoMultiple && stock.stock_actual > 0) {
                                          handleToggleLoteMultiple(stock);
                                        }
                                        e.target.select();
                                      }}
                                      placeholder="0"
                                      disabled={stock.stock_actual === 0}
                                      style={{ 
                                        fontSize: '1rem', 
                                        padding: '8px',
                                        fontWeight: estaSeleccionadoMultiple ? 'bold' : 'normal',
                                        backgroundColor: estaSeleccionadoMultiple ? '#d1e7dd' : 'white'
                                      }}
                                    />
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {modoSeleccion === 'simple' && stocksDisponibles.some(s => s.stock_actual < calendarioParaReasignacion?.cantidad_dosis) && (
                      <div className="alert alert-info mt-4 d-flex align-items-start shadow-sm" role="alert" style={{ borderLeft: '4px solid #0dcaf0' }}>
                        <FaInfoCircle className="me-3 mt-1" size={24} />
                        <div>
                          <h6 className="alert-heading">Lotes con stock insuficiente</h6>
                          <p className="mb-0">
                            Algunos lotes no tienen la cantidad completa requerida ({calendarioParaReasignacion?.cantidad_dosis.toLocaleString()} dosis). 
                            Cambie a <strong>"Múltiples Lotes"</strong> para combinar varios lotes y completar la cantidad necesaria.
                          </p>
                        </div>
                      </div>
                    )}

                    {modoSeleccion === 'multiple' && lotesSeleccionados.length > 0 && (
                      <div className="card mt-4 shadow-sm" style={{ borderLeft: '4px solid #198754' }}>
                        <div className="card-header bg-success text-white d-flex align-items-center justify-content-between" style={{ padding: '1rem 1.5rem' }}>
                          <h6 className="mb-0">
                            <FaCheckCircle className="me-2" />
                            Resumen de Selección
                          </h6>
                          <span className="badge bg-light text-success fs-6">
                            {lotesSeleccionados.length} lote{lotesSeleccionados.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="card-body" style={{ padding: '1.5rem' }}>
                          <div className="row g-3 mb-3">
                            <div className="col-6">
                              <div className="p-3 bg-light rounded text-center">
                                <small className="text-muted d-block mb-1">Requerido</small>
                                <h4 className="mb-0 text-primary">{calendarioParaReasignacion?.cantidad_dosis.toLocaleString()}</h4>
                                <small className="text-muted">dosis</small>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className={`p-3 rounded text-center ${
                                lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0) >= calendarioParaReasignacion?.cantidad_dosis 
                                  ? 'bg-success text-white' 
                                  : 'bg-warning'
                              }`}>
                                <small className={`d-block mb-1 ${
                                  lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0) >= calendarioParaReasignacion?.cantidad_dosis 
                                    ? 'text-white' 
                                    : 'text-dark'
                                }`}>Seleccionado</small>
                                <h4 className="mb-0">{lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0).toLocaleString()}</h4>
                                <small className={
                                  lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0) >= calendarioParaReasignacion?.cantidad_dosis 
                                    ? 'text-white' 
                                    : 'text-dark'
                                }>dosis</small>
                              </div>
                            </div>
                          </div>
                          
                          <hr />
                          
                          <h6 className="mb-3">Detalle de lotes:</h6>
                          <div className="row g-2">
                            {lotesSeleccionados.map(lote => (
                              <div key={lote.id_stock_vacuna} className="col-12">
                                <div className={`p-3 rounded border ${lote.cantidad > lote.stock_disponible ? 'border-danger bg-danger bg-opacity-10' : 'border-success bg-success bg-opacity-10'}`}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center">
                                      <FaBoxOpen className={`me-2 ${lote.cantidad > lote.stock_disponible ? 'text-danger' : 'text-success'}`} size={20} />
                                      <div>
                                        <strong className="d-block">{lote.lote}</strong>
                                        <small className="text-muted">Disponible: {lote.stock_disponible} dosis</small>
                                      </div>
                                    </div>
                                    <span className={`badge fs-5 ${lote.cantidad > lote.stock_disponible ? 'bg-danger' : 'bg-success'}`}>
                                      {lote.cantidad.toLocaleString()} dosis
                                    </span>
                                  </div>
                                  {lote.cantidad > lote.stock_disponible && (
                                    <div className="alert alert-danger mt-2 mb-0 py-2 d-flex align-items-center">
                                      <FaExclamationTriangle size={14} className="me-2" />
                                      <small className="mb-0">
                                        <strong>Excede stock disponible</strong> por {(lote.cantidad - lote.stock_disponible).toLocaleString()} dosis
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0) < calendarioParaReasignacion?.cantidad_dosis && (
                            <div className="alert alert-warning mt-3 mb-0 d-flex align-items-center">
                              <FaExclamationTriangle className="me-2" size={20} />
                              <div>
                                <strong>Cantidad incompleta</strong>
                                <p className="mb-0 mt-1">
                                  Faltan <strong>{(calendarioParaReasignacion?.cantidad_dosis - lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0)).toLocaleString()} dosis</strong> para completar la cantidad requerida
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowReasignacionModal(false);
                    setStockSeleccionado(null);
                    setLotesSeleccionados([]);
                  }}
                  disabled={realizandoReasignacion}
                >
                  Cancelar
                </button>
                {stocksDisponibles.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAsignarLoteManual}
                    disabled={
                      realizandoReasignacion || 
                      (modoSeleccion === 'simple' && !stockSeleccionado) ||
                      (modoSeleccion === 'multiple' && (lotesSeleccionados.length === 0 || 
                        lotesSeleccionados.reduce((sum, l) => sum + l.cantidad, 0) < calendarioParaReasignacion?.cantidad_dosis))
                    }
                  >
                    {realizandoReasignacion ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Asignando...
                      </>
                    ) : (
                      <>
                        <FaCheck className="me-2" />
                        {modoSeleccion === 'simple' ? 'Asignar Lote' : `Asignar ${lotesSeleccionados.length} Lote(s)`}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Modal de Alertas de Stock */}
      {showModalAlertas && (
        <div 
          className="alertas-modal-overlay"
          onClick={() => setShowModalAlertas(false)}
        >
          <div 
            className="alertas-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="alertas-modal-header">
              <h5 className="alertas-modal-title">
                <FaExclamationTriangle className="me-2" />
                Alertas de Stock - Plan Vacunal
                {hayProblemasStock && (
                  <span className="badge bg-danger text-white ms-2">
                    Problemas Críticos
                  </span>
                )}
              </h5>
              <button
                type="button"
                className="alertas-modal-close"
                onClick={() => setShowModalAlertas(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="alertas-modal-body">
              <AlertasStock 
                cotizacionId={cotizacionId}
                onProblemasDetectados={handleProblemasDetectados}
                mostrarContenido={true}
              />
            </div>
            <div className="alertas-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModalAlertas(false)}
              >
                <FaTimes className="me-1" />
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Lotes */}
      <ModalGestionLotes
        item={itemGestionLotes}
        isOpen={showModalGestionLotes}
        onClose={() => {
          setShowModalGestionLotes(false);
          setItemGestionLotes(null);
        }}
        realizandoReasignacion={realizandoReasignacion}
        onReasignarAutomatico={handleReasignarAutomatico}
        onAsignarManual={(item) => handleAbrirReasignacion(item, 'simple')}
        onAsignarMultiples={(item) => handleAbrirReasignacion(item, 'multiple')}
        onAsignarFaltante={(item) => handleAbrirReasignacion(item, 'faltante')}
        onVerStocks={(item) => {
          // Abrir el modal de reasignación en modo vista
          handleAbrirReasignacion(item, 'simple');
        }}
      />
    </div>
  );
};

export default CalendarioVacunacion;