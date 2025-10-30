import React, { useState, useEffect } from 'react';
import { FaTimes, FaInfoCircle, FaClipboardList, FaCalendar, FaBoxes } from 'react-icons/fa';
import { getReservasLote } from '../../services/api';
import './ModalReservasLote.css';

function ModalReservasLote({ show, onClose, lote }) {
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && lote) {
      cargarReservas();
    }
  }, [show, lote]);

  const cargarReservas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReservasLote(lote.id_stock_vacuna);
      setReservas(data);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setError('Error al cargar las reservas del lote');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      'borrador': { clase: 'secondary', texto: 'Borrador' },
      'pendiente': { clase: 'warning', texto: 'Pendiente' },
      'aceptada': { clase: 'success', texto: 'Aceptada' },
      'rechazada': { clase: 'danger', texto: 'Rechazada' },
      'cancelada': { clase: 'dark', texto: 'Cancelada' },
      'entregada': { clase: 'info', texto: 'Entregada' },
      'parcial': { clase: 'primary', texto: 'Parcial' }
    };
    return estados[estado] || { clase: 'secondary', texto: estado };
  };

  if (!show) return null;

  return (
    <div 
      className="modal-backdrop-reservas" 
      tabIndex="-1"
    >
      <div className="modal-reservas-container">
        <div className="modal-reservas-content">
          {/* Header */}
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <FaInfoCircle className="me-2" />
              Reservas del Lote: <code className="text-white">{lote?.lote}</code>
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div className="modal-body">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3 text-muted">Cargando información de reservas...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {!loading && !error && reservas && (
              <>
                {/* Información del Lote */}
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <FaBoxes className="me-2" />
                      Información del Lote
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3">
                        <strong>Vacuna:</strong>
                        <br />
                        {reservas.lote.vacuna}
                      </div>
                      <div className="col-md-3">
                        <strong>Stock Total:</strong>
                        <br />
                        <span className="badge bg-dark fs-6">
                          {reservas.lote.frascos_actuales} frascos
                        </span>
                        <br />
                        <small className="text-muted">
                          ({reservas.lote.stock_actual.toLocaleString()} dosis)
                        </small>
                      </div>
                      <div className="col-md-3">
                        <strong>Stock Reservado:</strong>
                        <br />
                        <span className="badge bg-warning text-dark fs-6">
                          {reservas.lote.frascos_reservados} frascos
                        </span>
                        <br />
                        <small className="text-muted">
                          ({reservas.lote.stock_reservado.toLocaleString()} dosis)
                        </small>
                      </div>
                      <div className="col-md-3">
                        <strong>Stock Disponible:</strong>
                        <br />
                        <span className="badge bg-success text-white fs-6">
                          {reservas.lote.frascos_actuales - reservas.lote.frascos_reservados} frascos
                        </span>
                        <br />
                        <small className="text-muted">
                          ({(reservas.lote.stock_actual - reservas.lote.stock_reservado).toLocaleString()} dosis)
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen */}
                <div className="alert alert-info">
                  <strong>
                    <FaClipboardList className="me-2" />
                    Resumen de Reservas:
                  </strong>
                  <br />
                  Este lote tiene <strong>{reservas.totales.total_cotizaciones}</strong> cotización(es) 
                  con reservas activas, totalizando{' '}
                  <strong>{reservas.totales.total_frascos_reservados} frascos</strong>
                  {' '}(<strong>{reservas.totales.total_dosis_reservadas.toLocaleString()} dosis</strong>).
                </div>

                {/* Lista de Cotizaciones */}
                {reservas.cotizaciones.length === 0 ? (
                  <div className="alert alert-warning">
                    <i className="fas fa-info-circle me-2"></i>
                    No hay reservas activas para este lote.
                  </div>
                ) : (
                  <div className="cotizaciones-list">
                    {reservas.cotizaciones.map((cotizacion) => {
                      const estadoCot = getEstadoBadge(cotizacion.estado);
                      
                      return (
                        <div key={cotizacion.id_cotizacion} className="card mb-3">
                          <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                              <strong>Cotización #{cotizacion.numero_cotizacion}</strong>
                              <br />
                              <small className="text-muted">
                                Cliente: {cotizacion.cliente}
                              </small>
                            </div>
                            <div className="text-end">
                              <span className={`badge bg-${estadoCot.clase} me-2`}>
                                {estadoCot.texto}
                              </span>
                              <br />
                              <small className="text-muted">
                                Plan: {cotizacion.plan}
                              </small>
                            </div>
                          </div>
                          <div className="card-body">
                            {/* Totales de la cotización */}
                            <div className="row mb-3 bg-light p-2 rounded">
                              <div className="col-md-6">
                                <strong>Total Reservado en esta Cotización:</strong>
                              </div>
                              <div className="col-md-6 text-end">
                                <span className="badge bg-warning text-dark fs-6">
                                  {cotizacion.total_frascos_reservados} frascos
                                </span>
                                {' '}
                                <small className="text-muted">
                                  ({cotizacion.total_dosis_reservadas.toLocaleString()} dosis)
                                </small>
                              </div>
                            </div>

                            {/* Detalle de entregas */}
                            <div className="table-responsive">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>
                                      <FaCalendar className="me-1" />
                                      Fecha Programada
                                    </th>
                                    <th>Producto</th>
                                    <th className="text-center">Total</th>
                                    <th className="text-center">Entregadas</th>
                                    <th className="text-center">Pendientes</th>
                                    <th className="text-center">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cotizacion.entregas.map((entrega) => {
                                    const estadoEnt = getEstadoBadge(entrega.estado_entrega);
                                    
                                    return (
                                      <tr key={entrega.id_calendario}>
                                        <td>{formatearFecha(entrega.fecha_programada)}</td>
                                        <td>
                                          <small>{entrega.producto}</small>
                                        </td>
                                        <td className="text-center">
                                          <small>
                                            {Math.ceil(entrega.cantidad_total / reservas.lote.dosis_por_frasco)} frascos
                                            <br />
                                            <span className="text-muted">
                                              ({entrega.cantidad_total} dosis)
                                            </span>
                                          </small>
                                        </td>
                                        <td className="text-center">
                                          <small>
                                            {Math.floor(entrega.dosis_entregadas / reservas.lote.dosis_por_frasco)} frascos
                                            <br />
                                            <span className="text-muted">
                                              ({entrega.dosis_entregadas} dosis)
                                            </span>
                                          </small>
                                        </td>
                                        <td className="text-center">
                                          <strong>
                                            {entrega.frascos_pendientes} frascos
                                            <br />
                                            <span className="text-muted">
                                              ({entrega.dosis_pendientes} dosis)
                                            </span>
                                          </strong>
                                        </td>
                                        <td className="text-center">
                                          <span className={`badge bg-${estadoEnt.clase}`}>
                                            {estadoEnt.texto}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              <FaTimes className="me-2" />
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalReservasLote;
