import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBoxOpen, 
  FaPlus, 
  FaSearch, 
  FaFilter,
  FaCalendarAlt,
  FaTimes
} from 'react-icons/fa';
import { 
  getReservasStock, 
  liberarReserva,
  getCotizaciones 
} from '../../services/planesVacunalesApi';
import { useNotification } from '../../context/NotificationContext';
import './Stock.css';

const ReservasStock = () => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    estado_reserva: '',
    id_cotizacion: '',
    busqueda: ''
  });
  const [cotizaciones, setCotizaciones] = useState([]);
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [reservasData, cotizacionesData] = await Promise.all([
        getReservasStock(),
        getCotizaciones({ estado: 'aceptada' })
      ]);
      
      setReservas(reservasData);
      setCotizaciones(cotizacionesData);
    } catch (error) {
      console.error('Error cargando reservas:', error);
      showError('Error', 'No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      const filtrosActivos = {};
      if (filtros.estado_reserva) filtrosActivos.estado_reserva = filtros.estado_reserva;
      if (filtros.id_cotizacion) filtrosActivos.id_cotizacion = filtros.id_cotizacion;
      
      const reservasData = await getReservasStock(filtrosActivos);
      setReservas(reservasData);
    } catch (error) {
      console.error('Error aplicando filtros:', error);
      showError('Error', 'No se pudieron aplicar los filtros');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({ estado_reserva: '', id_cotizacion: '', busqueda: '' });
    cargarDatos();
  };

  const handleLiberarReserva = async (idReserva, nombreProducto) => {
    if (window.confirm(`¿Está seguro que desea liberar la reserva para ${nombreProducto}?`)) {
      try {
        const motivo = prompt('Motivo de liberación (opcional):');
        await liberarReserva(idReserva, motivo);
        showSuccess('Éxito', 'Reserva liberada correctamente');
        cargarDatos();
      } catch (error) {
        console.error('Error liberando reserva:', error);
        showError('Error', 'No se pudo liberar la reserva');
      }
    }
  };

  const reservasFiltradas = reservas.filter(reserva => {
    if (!filtros.busqueda) return true;
    return reserva.producto?.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
           reserva.cotizacion?.numero_cotizacion.toLowerCase().includes(filtros.busqueda.toLowerCase());
  });

  const getEstadoReservaBadge = (estado) => {
    const estados = {
      'activa': { class: 'bg-success', text: 'Activa' },
      'utilizada': { class: 'bg-info', text: 'Utilizada' },
      'liberada': { class: 'bg-secondary', text: 'Liberada' },
      'vencida': { class: 'bg-danger', text: 'Vencida' }
    };
    return estados[estado] || { class: 'bg-secondary', text: estado };
  };

  if (loading) {
    return (
      <div className="stock-loading">
        <div className="stock-spinner"></div>
        <p>Cargando reservas...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaBoxOpen className="me-2 text-info" />
            <h3 className="mb-0 text-dark">Gestión de Reservas de Stock</h3>
          </div>
          <div className="d-flex gap-2">
            <Link to="/stock" className="btn btn-outline-secondary">
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <FaFilter className="me-2" />
            Filtros
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Estado de Reserva</label>
              <select 
                className="form-select"
                value={filtros.estado_reserva}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado_reserva: e.target.value }))}
              >
                <option value="">Todos los estados</option>
                <option value="activa">Activa</option>
                <option value="utilizada">Utilizada</option>
                <option value="liberada">Liberada</option>
                <option value="vencida">Vencida</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Cotización</label>
              <select 
                className="form-select"
                value={filtros.id_cotizacion}
                onChange={(e) => setFiltros(prev => ({ ...prev, id_cotizacion: e.target.value }))}
              >
                <option value="">Todas las cotizaciones</option>
                {cotizaciones.map(cotizacion => (
                  <option key={cotizacion.id_cotizacion} value={cotizacion.id_cotizacion}>
                    {cotizacion.numero_cotizacion} - {cotizacion.cliente?.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Buscar producto o cotización</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Buscar..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="d-flex gap-2 w-100">
                <button 
                  className="btn btn-primary flex-fill"
                  onClick={aplicarFiltros}
                >
                  Aplicar
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={limpiarFiltros}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Reservas */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Reservas ({reservasFiltradas.length})
          </h5>
        </div>
        <div className="card-body">
          {reservasFiltradas.length === 0 ? (
            <div className="text-center py-5">
              <FaBoxOpen className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay reservas</h5>
              <p className="text-muted">No se encontraron reservas con los filtros aplicados</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad Reservada</th>
                    <th>Cotización</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Fecha Creación</th>
                    <th>Vencimiento</th>
                    <th>Motivo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((reserva) => {
                    const estadoBadge = getEstadoReservaBadge(reserva.estado_reserva);
                    const esVencida = reserva.fecha_vencimiento && new Date(reserva.fecha_vencimiento) < new Date();
                    
                    return (
                      <tr key={reserva.id_reserva}>
                        <td>
                          <strong>{reserva.producto?.nombre}</strong>
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {reserva.cantidad_reservada}
                          </span>
                        </td>
                        <td>
                          <Link 
                            to={`/cotizaciones/${reserva.id_cotizacion}`}
                            className="text-decoration-none"
                          >
                            {reserva.cotizacion?.numero_cotizacion}
                          </Link>
                        </td>
                        <td>
                          <small>{reserva.cotizacion?.cliente?.nombre}</small>
                        </td>
                        <td>
                          <span className={`badge ${estadoBadge.class}`}>
                            {estadoBadge.text}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {new Date(reserva.created_at).toLocaleDateString('es-ES')}
                          </small>
                        </td>
                        <td>
                          {reserva.fecha_vencimiento ? (
                            <small className={esVencida ? 'text-danger fw-bold' : 'text-muted'}>
                              <FaCalendarAlt className="me-1" />
                              {new Date(reserva.fecha_vencimiento).toLocaleDateString('es-ES')}
                            </small>
                          ) : (
                            <small className="text-muted">Sin vencimiento</small>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">{reserva.motivo}</small>
                        </td>
                        <td>
                          {reserva.estado_reserva === 'activa' && (
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => handleLiberarReserva(reserva.id_reserva, reserva.producto?.nombre)}
                              title="Liberar reserva"
                            >
                              <FaTimes className="me-1" />
                              Liberar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservasStock;