import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFileInvoice, 
  FaPrint, 
  FaDownload,
  FaSearch,
  FaEye,
  FaPlus,
  FaUser,
  FaSyringe,
  FaCalendarAlt,
  FaBoxOpen,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useNotification } from '../../context/NotificationContext';
import './Remitos.css';

const RemitosGenerator = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [tipoRemito, setTipoRemito] = useState('entrega_parcial');
  const [observacionesRemito, setObservacionesRemito] = useState('');

  useEffect(() => {
    cargarCotizaciones();
  }, [filtros, paginacion.page]);

  const cargarCotizaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/cotizaciones?` + new URLSearchParams({
        page: paginacion.page,
        limit: paginacion.limit,
        estado: 'aceptada', // Solo cotizaciones aceptadas pueden generar remitos
        ...filtros
      }), {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar cotizaciones');
      }

      const data = await response.json();
      setCotizaciones(data || []); // La respuesta es directamente el array de cotizaciones
      setPaginacion(prev => ({
        ...prev,
        total: data?.length || 0,
        pages: Math.ceil((data?.length || 0) / prev.limit)
      }));
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      showError('Error', 'No se pudieron cargar las cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarRemito = async () => {
    try {
      const response = await fetch(`http://localhost:3001/remitos/cotizacion/${cotizacionSeleccionada.id_cotizacion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tipo_remito: tipoRemito,
          observaciones: observacionesRemito
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar remito');
      }

      const data = await response.json();
      showSuccess('Éxito', `Remito ${data.data.numero_remito} generado correctamente`);
      setShowGenerarModal(false);
      setCotizacionSeleccionada(null);
      
      // Preguntar si quiere imprimir
      if (window.confirm('¿Desea imprimir el remito ahora?')) {
        await handleImprimirRemito(data.data.id_remito);
      }
    } catch (error) {
      console.error('Error generando remito:', error);
      showError('Error', 'No se pudo generar el remito');
    }
  };

  const handleImprimirRemito = async (idRemito) => {
    try {
      const response = await fetch(`http://localhost:3001/remitos/${idRemito}/pdf`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Abrir en nueva ventana para imprimir
      const printWindow = window.open(url);
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      console.error('Error imprimiendo remito:', error);
      showError('Error', 'No se pudo imprimir el remito');
    }
  };

  const handleVerCotizacion = (cotizacion) => {
    navigate(`/cotizaciones/${cotizacion.id_cotizacion}`);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'confirmada': 'bg-success',
      'activa': 'bg-primary',
      'en_proceso': 'bg-warning',
      'completada': 'bg-info',
      'cancelada': 'bg-danger'
    };
    return badges[estado] || 'bg-secondary';
  };

  if (loading) {
    return (
      <div className="remitos-loading">
        <div className="remitos-spinner"></div>
        <p>Cargando cotizaciones...</p>
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
              <FaFileInvoice className="me-2 text-primary" size={24} />
              <div>
                <h3 className="mb-0">Generador de Remitos</h3>
                <small className="text-muted">Generar remitos desde cotizaciones confirmadas</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/remitos')}
              >
                <FaEye className="me-1" />
                Ver Remitos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Número, cliente..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filtros.estado}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="confirmada">Confirmada</option>
                <option value="activa">Activa</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha Desde</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha Hasta</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Cotizaciones */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Cotizaciones Disponibles</h5>
        </div>
        <div className="card-body">
          {cotizaciones.length === 0 ? (
            <div className="text-center py-5">
              <FaExclamationTriangle className="text-warning mb-3" size={48} />
              <h4>No hay cotizaciones disponibles</h4>
              <p className="text-muted">No se encontraron cotizaciones confirmadas para generar remitos</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Plan</th>
                    <th>Cantidad Pollos</th>
                    <th>Fecha Inicio</th>
                    <th>Estado</th>
                    <th>Precio Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.map((cotizacion) => (
                    <tr key={cotizacion.id_cotizacion}>
                      <td>
                        <span className="fw-bold text-primary">
                          {cotizacion.numero_cotizacion}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-muted me-2" />
                          <div>
                            <div className="fw-bold">{cotizacion.cliente_nombre}</div>
                            <small className="text-muted">{cotizacion.cliente_email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaSyringe className="text-success me-2" />
                          <div>
                            <div>{cotizacion.plan_nombre}</div>
                            <small className="text-muted">{cotizacion.plan_duracion_semanas} semanas</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaBoxOpen className="text-info me-2" />
                          <span className="fw-bold">
                            {cotizacion.cantidad_animales?.toLocaleString() || 'No especificado'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-warning me-2" />
                          {formatearFecha(cotizacion.fecha_inicio_plan)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getEstadoBadge(cotizacion.estado)}`}>
                          {cotizacion.estado}
                        </span>
                      </td>
                      <td>
                        <span className="fw-bold text-success">
                          ${cotizacion.precio_total?.toLocaleString() || '0'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleVerCotizacion(cotizacion)}
                            title="Ver detalles"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              setCotizacionSeleccionada(cotizacion);
                              setShowGenerarModal(true);
                            }}
                            title="Generar remito"
                          >
                            <FaPlus />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {paginacion.pages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${paginacion.page === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setPaginacion(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={paginacion.page === 1}
                  >
                    Anterior
                  </button>
                </li>
                {[...Array(paginacion.pages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${paginacion.page === i + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setPaginacion(prev => ({ ...prev, page: i + 1 }))}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${paginacion.page === paginacion.pages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setPaginacion(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={paginacion.page === paginacion.pages}
                  >
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Modal Generar Remito */}
      {showGenerarModal && cotizacionSeleccionada && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaFileInvoice className="me-2" />
                  Generar Remito
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowGenerarModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Información de la Cotización */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Información de la Cotización</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Número:</strong> {cotizacionSeleccionada.numero_cotizacion}
                      </div>
                      <div className="col-md-6">
                        <strong>Cliente:</strong> {cotizacionSeleccionada.cliente_nombre}
                      </div>
                      <div className="col-md-6">
                        <strong>Plan:</strong> {cotizacionSeleccionada.plan_nombre}
                      </div>
                      <div className="col-md-6">
                        <strong>Cantidad Pollos:</strong> {cotizacionSeleccionada.cantidad_animales?.toLocaleString()}
                      </div>
                      <div className="col-md-6">
                        <strong>Fecha Inicio:</strong> {formatearFecha(cotizacionSeleccionada.fecha_inicio_plan)}
                      </div>
                      <div className="col-md-6">
                        <strong>Precio Total:</strong> ${cotizacionSeleccionada.precio_total?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuración del Remito */}
                <div className="mb-3">
                  <label className="form-label">Tipo de Remito</label>
                  <select
                    className="form-select"
                    value={tipoRemito}
                    onChange={(e) => setTipoRemito(e.target.value)}
                  >
                    <option value="entrega_parcial">Entrega Parcial</option>
                    <option value="entrega_completa">Entrega Completa</option>
                    <option value="entrega_programada">Entrega Programada</option>
                  </select>
                  <small className="text-muted">
                    Seleccione el tipo de entrega que se realizará
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={observacionesRemito}
                    onChange={(e) => setObservacionesRemito(e.target.value)}
                    placeholder="Observaciones adicionales para el remito..."
                  />
                </div>

                <div className="alert alert-info">
                  <FaCheckCircle className="me-2" />
                  <strong>Importante:</strong> Se generará un remito con todos los productos del plan de vacunación. 
                  Después de generar podrá imprimir el documento por duplicado.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowGenerarModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleGenerarRemito}
                >
                  <FaFileInvoice className="me-1" />
                  Generar Remito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemitosGenerator;