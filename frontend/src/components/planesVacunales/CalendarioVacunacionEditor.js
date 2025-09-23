import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaArrowLeft, 
  FaSyringe, 
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCut,
  FaCopy
} from 'react-icons/fa';
import * as planesApi from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './PlanesVacunales.css';

const CalendarioVacunacionEditor = () => {
  const { cotizacionId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState(null);
  const [calendario, setCalendario] = useState([]);
  const [editandoFecha, setEditandoFecha] = useState(null);
  const [fechaEditForm, setFechaEditForm] = useState('');
  const [showDesdoblamientoModal, setShowDesdoblamientoModal] = useState(false);
  const [calendarioParaDesdoblamiento, setCalendarioParaDesdoblamiento] = useState(null);
  const [desdoblamientoForm, setDesdoblamientoForm] = useState({
    fecha_aplicacion: '',
    observaciones: '',
    numero_desdoblamiento: 1
  });

  useEffect(() => {
    cargarDatosIniciales();
  }, [cotizacionId]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      const [cotizacionData, calendarioData] = await Promise.all([
        planesApi.getCotizacionById(cotizacionId),
        planesApi.getCalendarioVacunacion(cotizacionId)
      ]);
      
      console.log('Datos de cotización cargados:', cotizacionData);
      console.log('Datos de calendario cargados:', calendarioData);
      
      setCotizacion(cotizacionData);
      setCalendario(calendarioData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error', 'No se pudieron cargar los datos del calendario');
    } finally {
      setLoading(false);
    }
  };

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

      await planesApi.crearDesdoblamientoDosis(cotizacionId, desdoblamientoData);
      
      showSuccess('Éxito', 'Desdoblamiento creado correctamente');
      setShowDesdoblamientoModal(false);
      setCalendarioParaDesdoblamiento(null);
      await cargarDatosIniciales();
    } catch (error) {
      console.error('Error creando desdoblamiento:', error);
      showError('Error', 'No se pudo crear el desdoblamiento');
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
      console.error('Error al formatear fecha:', error, 'fecha:', fecha);
      return 'Error en fecha';
    }
  };

  const calcularFechaProgramada = (fechaInicio, semana) => {
    if (!fechaInicio) return null;
    
    try {
      const fecha = new Date(fechaInicio);
      
      // Verificar que la fecha sea válida
      if (isNaN(fecha.getTime())) {
        console.warn('Fecha de inicio inválida:', fechaInicio);
        return null;
      }
      
      // Verificar que semana sea un número válido
      if (typeof semana !== 'number' || isNaN(semana)) {
        console.warn('Semana inválida:', semana);
        return null;
      }
      
      // Calcular la nueva fecha
      const nuevaFecha = new Date(fecha);
      nuevaFecha.setDate(nuevaFecha.getDate() + (semana * 7));
      
      // Verificar que la fecha calculada sea válida
      if (isNaN(nuevaFecha.getTime())) {
        console.warn('Fecha calculada inválida para:', fechaInicio, 'semana:', semana);
        return null;
      }
      
      return nuevaFecha.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error al calcular fecha programada:', error, 'fechaInicio:', fechaInicio, 'semana:', semana);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner"></div>
        <p>Cargando calendario...</p>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="text-center p-4">
        <FaExclamationTriangle className="text-warning mb-3" size={48} />
        <h4>Cotización no encontrada</h4>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/cotizaciones')}
        >
          Volver a Cotizaciones
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <button 
                className="btn btn-outline-secondary me-3"
                onClick={() => navigate(`/cotizaciones/${cotizacionId}`)}
              >
                <FaArrowLeft />
              </button>
              <div>
                <div className="d-flex align-items-center">
                  <FaCalendarAlt className="me-2 text-primary" />
                  <h3 className="mb-0">Editor de Calendario</h3>
                </div>
                <small className="text-muted">
                  {cotizacion.numero_cotizacion} - {cotizacion.cliente_nombre} - {cotizacion.plan_nombre}
                </small>
              </div>
            </div>
            <div className="text-end">
              <small className="text-muted d-block">Cantidad de pollos:</small>
              <strong className="text-primary">{cotizacion.cantidad_animales?.toLocaleString()} pollos</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Plan */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <small className="text-muted">Fecha de Inicio:</small>
              <div className="fw-bold">{formatearFecha(cotizacion.fecha_inicio_plan)}</div>
            </div>
            <div className="col-md-3">
              <small className="text-muted">Duración del Plan:</small>
              <div className="fw-bold">{cotizacion.plan_duracion_semanas} semanas</div>
            </div>
            <div className="col-md-3">
              <small className="text-muted">Estado:</small>
              <span className={`badge ms-1 ${
                cotizacion.estado === 'confirmada' ? 'bg-success' :
                cotizacion.estado === 'en_proceso' ? 'bg-warning' :
                'bg-secondary'
              }`}>
                {cotizacion.estado}
              </span>
            </div>
            <div className="col-md-3">
              <small className="text-muted">Total Aplicaciones:</small>
              <div className="fw-bold">{calendario.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta Informativa */}
      <div className="alert alert-info mb-4">
        <FaInfoCircle className="me-2" />
        <strong>Editor de Calendario:</strong> Aquí puede editar las fechas de aplicación programadas y crear 
        desdoblamientos de dosis cuando sea necesario aplicar la misma vacuna en múltiples fechas.
      </div>

      {/* Tabla de Calendario */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Calendario de Vacunación</h5>
        </div>
        <div className="card-body">
          {!cotizacion.fecha_inicio_plan || isNaN(new Date(cotizacion.fecha_inicio_plan).getTime()) ? (
            <div className="alert alert-warning">
              <FaExclamationTriangle className="me-2" />
              <strong>Fecha de inicio inválida:</strong> No se puede procesar el calendario sin una fecha de inicio válida.
              Por favor, verifique los datos de la cotización.
            </div>
          ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Semana</th>
                  <th>Vacuna</th>
                  <th>Fecha Programada</th>
                  <th>Dosis por Animal</th>
                  <th>Total Dosis</th>
                  <th>Desdoblamiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  console.log('Calendario completo:', calendario);
                  const calendarioFiltrado = calendario.filter(item => {
                    const esValido = item && item.semana_aplicacion !== null && item.semana_aplicacion !== undefined;
                    if (!esValido) {
                      console.log('Item filtrado (inválido):', item);
                    }
                    return esValido;
                  });
                  console.log('Calendario después del filtro:', calendarioFiltrado);
                  
                  return calendarioFiltrado.map((item) => (
                  <tr key={item.id_calendario}>
                    <td>
                      <span className="badge bg-primary">
                        Semana {item.semana_aplicacion}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FaSyringe className="text-primary me-2" />
                        <div>
                          <div className="fw-bold">{item.vacuna_nombre}</div>
                          <small className="text-muted">{item.vacuna_tipo}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {editandoFecha === item.id_calendario ? (
                        <div className="d-flex gap-2">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={fechaEditForm}
                            onChange={(e) => setFechaEditForm(e.target.value)}
                            min={calcularFechaProgramada(cotizacion.fecha_inicio_plan, item.semana_aplicacion - 1) || undefined}
                          />
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleGuardarFecha(item.id_calendario)}
                          >
                            <FaSave />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={handleCancelarEdicion}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center">
                          <span className="me-2">
                            {formatearFecha(item.fecha_aplicacion_programada) || 
                             formatearFecha(calcularFechaProgramada(cotizacion.fecha_inicio_plan, item.semana_aplicacion))}
                          </span>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEditarFecha(item)}
                            title="Editar fecha"
                          >
                            <FaEdit />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-info">
                        {item.dosis_por_aplicacion || 1}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {((item.dosis_por_aplicacion || 1) * (cotizacion.cantidad_animales || 0)).toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      {item.es_desdoblamiento ? (
                        <div className="d-flex align-items-center">
                          <FaCut className="text-warning me-1" />
                          <small className="text-muted">
                            Parte {item.numero_desdoblamiento}
                          </small>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        {!item.es_desdoblamiento && (
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleDesdoblarDosis(item)}
                            title="Crear desdoblamiento"
                          >
                            <FaCut />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* Modal de Desdoblamiento */}
      {showDesdoblamientoModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
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
                  Se creará una nueva aplicación para <strong>{calendarioParaDesdoblamiento?.vacuna_nombre}</strong> 
                  en la semana {calendarioParaDesdoblamiento?.semana_aplicacion}.
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Fecha de Aplicación *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={desdoblamientoForm.fecha_aplicacion}
                    onChange={(e) => setDesdoblamientoForm(prev => ({
                      ...prev,
                      fecha_aplicacion: e.target.value
                    }))}
                    min={cotizacion.fecha_inicio_plan}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={desdoblamientoForm.observaciones}
                    onChange={(e) => setDesdoblamientoForm(prev => ({
                      ...prev,
                      observaciones: e.target.value
                    }))}
                    placeholder="Motivo del desdoblamiento o instrucciones especiales..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDesdoblamientoModal(false)}
                >
                  <FaTimes className="me-1" />
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={handleCrearDesdoblamiento}
                  disabled={!desdoblamientoForm.fecha_aplicacion}
                >
                  <FaCut className="me-1" />
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

export default CalendarioVacunacionEditor;