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
  FaPrint
} from 'react-icons/fa';
import * as planesApi from '../../services/planesVacunalesApi';
import './PlanesVacunales.css';

const CalendarioVacunacion = () => {
  const { cotizacionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState(null);
  const [calendario, setCalendario] = useState([]);
  const [estadoPlan, setEstadoPlan] = useState(null);
  const [controlEntregas, setControlEntregas] = useState([]);
  const [vistaActual, setVistaActual] = useState('calendario'); // 'calendario', 'entregas', 'resumen'
  
  // Estados para modales
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  
  // Estados para formularios
  const [entregaForm, setEntregaForm] = useState({
    cantidad_entregada: 0,
    responsable_entrega: '',
    responsable_recibe: '',
    observaciones_entrega: '',
    tipo_entrega: 'completa',
    imprimir_remito: false
  });

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
        try {
          const pdfBlob = await planesApi.generarRemitoEntrega(calendarioSeleccionado.id_calendario, {
            cantidad_entregada: entregaForm.cantidad_entregada,
            responsable_entrega: entregaForm.responsable_entrega,
            responsable_recibe: entregaForm.responsable_recibe,
            observaciones_entrega: entregaForm.observaciones_entrega,
            tipo_entrega: entregaForm.tipo_entrega
          });
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `remito-entrega-semana-${calendarioSeleccionado.numero_semana}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (pdfError) {
          console.error('Error al generar remito PDF:', pdfError);
          alert('Entrega registrada correctamente, pero hubo un error al generar el remito PDF');
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
        imprimir_remito: false
      });
      
      alert('Entrega registrada correctamente');
      
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
      alert('Plan vacunal finalizado correctamente');
      
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
      imprimir_remito: false
    });
    setShowEntregaModal(true);
  };

  const reimprimirRemito = async (calendarioItem) => {
    try {
      console.log('Generando remito para calendario:', calendarioItem.id_calendario);
      console.log('Datos del calendario:', {
        id: calendarioItem.id_calendario,
        semana: calendarioItem.numero_semana,
        estado: calendarioItem.estado_entrega,
        dosis_entregadas: calendarioItem.dosis_entregadas
      });
      
      // Verificar que tenga entregas antes de intentar
      if (!calendarioItem.dosis_entregadas || calendarioItem.dosis_entregadas === 0) {
        alert('No hay entregas registradas para esta semana. No se puede generar el remito.');
        return;
      }
      
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
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `remito-entrega-semana-${calendarioItem.numero_semana}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Remito descargado exitosamente');
    } catch (error) {
      console.error('Error al reimprimir remito:', error);
      alert('Error al generar el remito: ' + error.message);
    }
  };

  const reimprimirRemitoPorCalendario = async (id_calendario) => {
    try {
      console.log('Generando remito para calendario ID:', id_calendario);
      
      // Buscar el item del calendario para obtener el número de semana
      const calendarioItem = calendario.find(item => item.id_calendario === id_calendario);
      const numeroSemana = calendarioItem ? calendarioItem.numero_semana : 'X';
      
      console.log('Datos encontrados:', {
        id: id_calendario,
        semana: numeroSemana,
        estado: calendarioItem?.estado_entrega,
        encontrado: !!calendarioItem
      });
      
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
            onClick={() => navigate('/planes-vacunales/cotizaciones')}
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
              onClick={() => navigate('/planes-vacunales/cotizaciones')}
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
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${vistaActual === 'calendario' ? 'active' : ''}`}
                onClick={() => setVistaActual('calendario')}
              >
                <FaCalendarAlt className="me-2" />
                Calendario
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${vistaActual === 'entregas' ? 'active' : ''}`}
                onClick={() => setVistaActual('entregas')}
              >
                <FaHistory className="me-2" />
                Control de Entregas
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${vistaActual === 'resumen' ? 'active' : ''}`}
                onClick={() => setVistaActual('resumen')}
              >
                <FaChartPie className="me-2" />
                Resumen por Producto
              </button>
            </li>
          </ul>
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
                    <th>Responsable</th>
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
                          <strong>Semana {item.numero_semana}</strong>
                        </td>
                        <td>
                          {new Date(item.fecha_programada).toLocaleDateString('es-ES')}
                        </td>
                        <td>
                          <div>
                            <strong>{item.nombre_producto}</strong>
                            {item.descripcion_producto && (
                              <small className="d-block text-muted">
                                {item.descripcion_producto}
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
                            >
                              <FaPrint />
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
                        >
                          <FaPrint />
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
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaCheck className="me-2" />
                  Marcar Entrega de Dosis
                </h5>
                <button 
                  className="btn-close"
                  onClick={() => setShowEntregaModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {calendarioSeleccionado && (
                  <>
                    <div className="alert alert-info">
                      <strong>Semana {calendarioSeleccionado.numero_semana}</strong> - {calendarioSeleccionado.nombre_producto}
                      <br />
                      <small>
                        Programadas: {calendarioSeleccionado.cantidad_dosis} | 
                        Ya entregadas: {calendarioSeleccionado.dosis_entregadas || 0} |
                        Pendientes: {calendarioSeleccionado.cantidad_dosis - (calendarioSeleccionado.dosis_entregadas || 0)}
                      </small>
                    </div>
                    
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
                >
                  <FaCheck className="me-2" />
                  Registrar Entrega
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
                <div className="alert alert-warning">
                  <strong>¡Atención!</strong> Esta acción finalizará definitivamente el plan vacunal y limpiará todas las reservas de stock. No se podrá deshacer.
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Observaciones de Finalización</label>
                  <textarea
                    id="observaciones-finalizacion"
                    className="form-control"
                    rows="4"
                    placeholder="Ingrese observaciones sobre la finalización del plan..."
                  />
                </div>
                
                <div className="alert alert-info">
                  <small>
                    <strong>Resumen del plan:</strong>
                    <br />• Total dosis entregadas: {estadoPlan.estadisticas?.total_dosis_entregadas || 0}
                    <br />• Dosis pendientes: {estadoPlan.estadisticas?.dosis_pendientes || 0}
                    <br />• Porcentaje completado: {estadoPlan.estadisticas?.porcentaje_completado || 0}%
                  </small>
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
    </div>
  );
};

export default CalendarioVacunacion;