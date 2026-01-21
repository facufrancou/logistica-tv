import React, { useState, useEffect } from 'react';
import { FaBoxOpen, FaClock, FaChevronDown, FaChevronUp, FaSpinner, FaExclamationTriangle, FaMapMarkerAlt, FaLayerGroup } from 'react-icons/fa';
import * as planesApi from '../../services/planesVacunalesApi';

/**
 * Componente para mostrar los lotes asignados a un item del calendario
 * - Si hay 1 lote: muestra el lote directamente
 * - Si hay múltiples: muestra "Lote múltiple" con opción de expandir
 * 
 * NUEVO: Usa asignaciones_lote del calendario si está disponible,
 * sino hace fallback al endpoint getLotesAsignadosCalendario
 */
const LotesAsignadosCell = ({ item, formatearFecha, onOpenGestionLotes }) => {
  const [expanded, setExpanded] = useState(false);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset cuando cambia el item
  useEffect(() => {
    setExpanded(false);
    setLotes([]);
    setError(null);
  }, [item.id_calendario, item.lote_asignado, item.id_stock_vacuna]);

  // NUEVO: Usar asignaciones_lote si viene en el item
  const asignacionesDirectas = item.asignaciones_lote || [];
  const tieneAsignacionesDirectas = asignacionesDirectas.length > 0;
  
  // Verificar si tiene lote asignado
  const tieneLoteAsignado = tieneAsignacionesDirectas || (item.lote_asignado && item.id_stock_vacuna);
  
  // Detectar si hay múltiples lotes
  const tieneMultiplesLotes = tieneAsignacionesDirectas 
    ? asignacionesDirectas.length > 1
    : (item.lote_asignado && item.lote_asignado.includes('+'));
  
  // Cantidad de lotes
  const cantidadLotes = tieneAsignacionesDirectas
    ? asignacionesDirectas.length
    : (tieneMultiplesLotes ? parseInt(item.lote_asignado.split('+')[1]) + 1 : 1);

  // Cargar lotes cuando se expande
  const handleExpand = async (e) => {
    e.stopPropagation();
    
    // Si ya está expandido, solo cerrar
    if (expanded) {
      setExpanded(false);
      return;
    }
    
    // Si tenemos asignaciones directas, usarlas
    if (tieneAsignacionesDirectas) {
      setLotes(asignacionesDirectas);
      setExpanded(true);
      return;
    }
    
    // Fallback: llamar al endpoint si no tenemos datos
    if (lotes.length === 0) {
      setLoading(true);
      setError(null);
      try {
        const resultado = await planesApi.getLotesAsignadosCalendario(item.id_calendario);
        console.log('Resultado getLotesAsignadosCalendario:', resultado);
        
        // Manejar diferentes formatos de respuesta
        let lotesData = [];
        if (resultado.data && resultado.data.lotes) {
          lotesData = resultado.data.lotes;
        } else if (resultado.lotes) {
          lotesData = resultado.lotes;
        } else if (Array.isArray(resultado)) {
          lotesData = resultado;
        }
        
        if (lotesData.length > 0) {
          setLotes(lotesData);
        } else {
          setError('No se encontraron lotes');
        }
      } catch (err) {
        console.error('Error al cargar lotes:', err);
        setError('Error al cargar lotes');
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  // Si no hay lote asignado (verificar ambos campos)
  if (!tieneLoteAsignado) {
    return (
      <div>
        <span className="text-muted">
          <FaExclamationTriangle className="me-1" />
          Sin lote asignado
        </span>
      </div>
    );
  }

  // Si hay un solo lote (sin el "+")
  if (!tieneMultiplesLotes) {
    return (
      <div>
        <div className="d-flex align-items-center">
          <strong className="text-primary">{item.lote_asignado}</strong>
        </div>
        {item.fecha_vencimiento_lote && (
          <small className="d-block text-muted">
            <FaClock className="me-1" />
            Vence: {formatearFecha(item.fecha_vencimiento_lote)}
          </small>
        )}
        {item.ubicacion_fisica && (
          <small className="d-block text-info">
            <FaMapMarkerAlt className="me-1" />
            {item.ubicacion_fisica}
          </small>
        )}
      </div>
    );
  }

  // Si hay múltiples lotes
  return (
    <div>
      {/* Badge de lote múltiple con botón expandir */}
      <button
        className="btn btn-info btn-sm d-flex align-items-center gap-1 mb-1"
        onClick={handleExpand}
        style={{ fontSize: '0.8rem' }}
      >
        <FaLayerGroup />
        Lote múltiple ({cantidadLotes})
        {loading ? (
          <FaSpinner className="fa-spin ms-1" />
        ) : expanded ? (
          <FaChevronUp className="ms-1" />
        ) : (
          <FaChevronDown className="ms-1" />
        )}
      </button>

      {/* Lista expandida de lotes */}
      {expanded && (
        <div className="mt-2 ps-2 border-start border-2 border-info" style={{ fontSize: '0.85rem' }}>
          {error ? (
            <small className="text-danger">{error}</small>
          ) : lotes.length === 0 && !loading ? (
            <small className="text-muted">Cargando lotes...</small>
          ) : (
            <>
              {lotes.map((lote, index) => (
                <div key={lote.id_stock_vacuna || index} className="mb-2 py-1 border-bottom border-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">{lote.lote}</span>
                    <span className="badge bg-info text-white" style={{ fontSize: '0.7rem' }}>
                      {(lote.cantidad_asignada || 0).toLocaleString()} dosis
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {lote.fecha_vencimiento && (
                      <small className="text-muted">
                        <FaClock className="me-1" style={{ fontSize: '0.65rem' }} />
                        {formatearFecha(lote.fecha_vencimiento)}
                      </small>
                    )}
                    {lote.ubicacion_fisica && (
                      <small className="text-info">
                        <FaMapMarkerAlt className="me-1" style={{ fontSize: '0.65rem' }} />
                        {lote.ubicacion_fisica}
                      </small>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total */}
              {lotes.length > 0 && (
                <div className="d-flex justify-content-between align-items-center pt-1 fw-bold">
                  <span className="text-muted">Total:</span>
                  <span className="badge bg-success">
                    {lotes.reduce((sum, l) => sum + (l.cantidad_asignada || 0), 0).toLocaleString()} dosis
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LotesAsignadosCell;
