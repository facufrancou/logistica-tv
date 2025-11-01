import React, { useState, useEffect } from 'react';
import { 
  FaFileInvoice, 
  FaDownload, 
  FaPrint,
  FaChartBar,
  FaCalendarAlt,
  FaBuilding,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaInfoCircle
} from 'react-icons/fa';

const ResumenLiquidacionSimple = ({ cotizacionId, onClose }) => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generandoResumen, setGenerandoResumen] = useState(false);

  useEffect(() => {
    console.log('ResumenLiquidacion - cotizacionId:', cotizacionId);
    if (cotizacionId) {
      cargarResumen();
    }
  }, [cotizacionId]);

  const cargarResumen = async () => {
    try {
      console.log('Cargando resumen para cotización:', cotizacionId);
      setLoading(true);
      setError(null);
      
      const API_BASE = "http://localhost:3001";
      const response = await fetch(`${API_BASE}/liquidaciones/cotizacion/${cotizacionId}/resumen`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.status === 404) {
        // No existe resumen aún, es normal
        setResumen(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Resumen recibido:', data);
      setResumen(data.resumen || data);
    } catch (error) {
      console.error('Error al cargar resumen:', error);
      setError(`Error al cargar resumen: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generarResumen = async () => {
    try {
      console.log('Generando resumen para cotización:', cotizacionId);
      setGenerandoResumen(true);
      setError(null);
      
      const API_BASE = "http://localhost:3001";
      const response = await fetch(`${API_BASE}/liquidaciones/cotizacion/${cotizacionId}/resumen`, {
        method: 'POST',
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Resumen generado:', data);
      setResumen(data.resumen || data);
    } catch (error) {
      console.error('Error al generar resumen:', error);
      setError(`Error al generar resumen: ${error.message}`);
    } finally {
      setGenerandoResumen(false);
    }
  };

  const exportarResumen = async (formato = 'pdf') => {
    try {
      const API_BASE = "http://localhost:3001";
      const response = await fetch(`${API_BASE}/liquidaciones/resumen/${resumen.id}/export?formato=${formato}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `resumen-liquidacion-${resumen.numero_cotizacion}.${formato}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert(`Error al exportar: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <FaSpinner className="fa-spin me-2 fa-2x text-primary" />
        <div className="mt-3">
          <h5>Cargando resumen de liquidación...</h5>
          <p className="text-muted">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <FaExclamationTriangle className="me-2" />
        {error}
        <br />
        <button 
          className="btn btn-outline-danger btn-sm mt-2 me-2"
          onClick={cargarResumen}
        >
          Reintentar
        </button>
        <button 
          className="btn btn-outline-secondary btn-sm mt-2"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (!resumen) {
    return (
      <div className="text-center py-5">
        <div className="mb-4">
          <FaFileInvoice className="fa-3x text-muted mb-3" />
          <h5>No hay resumen de liquidación generado</h5>
          <p className="text-muted">
            Para generar un resumen de liquidación, primero debes clasificar todos los productos de la cotización como Vía 1 (blanco) o Vía 2 (negro).
          </p>
          <div className="alert alert-info mt-3">
            <FaInfoCircle className="me-2" />
            <strong>Paso 1:</strong> Ve a "Clasificar para Facturación" y marca cada producto como Vía 1 o Vía 2.<br />
            <strong>Paso 2:</strong> Una vez clasificados todos los productos, podrás generar el resumen.
          </div>
        </div>
        
        <div className="d-flex justify-content-center gap-2">
          <button 
            className="btn btn-primary"
            onClick={generarResumen}
            disabled={generandoResumen}
          >
            {generandoResumen ? (
              <>
                <FaSpinner className="fa-spin me-2" />
                Generando...
              </>
            ) : (
              <>
                <FaFileInvoice className="me-2" />
                Intentar Generar Resumen
              </>
            )}
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="resumen-liquidacion">
      {/* Header del resumen */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h4 className="mb-1">
            <FaFileInvoice className="me-2 text-primary" />
            Resumen de Liquidación
          </h4>
          <p className="text-muted mb-0">
            Cotización {resumen.cotizacion?.numero_cotizacion || 'N/A'} • {resumen.cotizacion?.cliente?.nombre || 'N/A'}
          </p>
        </div>
        <div className="col-md-4 text-end">
          <div className="btn-group">
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => exportarResumen('pdf')}
              title="Exportar como PDF"
            >
              <FaDownload className="me-1" />
              PDF
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => exportarResumen('excel')}
              title="Exportar como Excel"
            >
              <FaDownload className="me-1" />
              Excel
            </button>
            <button 
              className="btn btn-outline-info btn-sm"
              onClick={() => window.print()}
              title="Imprimir"
            >
              <FaPrint />
            </button>
          </div>
        </div>
      </div>

      {/* Información general */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <FaBuilding className="me-2 text-primary" />
                Información General
              </h6>
              <div className="row">
                <div className="col-6">
                  <small className="text-muted">Cliente</small>
                  <div className="fw-bold">{resumen.cotizacion?.cliente?.nombre || 'N/A'}</div>
                </div>
                <div className="col-6">
                  <small className="text-muted">CUIT</small>
                  <div className="fw-bold">{resumen.cotizacion?.cliente?.cuit || 'No especificado'}</div>
                </div>
                <div className="col-6 mt-2">
                  <small className="text-muted">Fecha Generación</small>
                  <div className="fw-bold">
                    {new Date(resumen.fecha_generacion).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div className="col-6 mt-2">
                  <small className="text-muted">Estado</small>
                  <div>
                    <span className="badge bg-success">Generado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h6 className="card-title">
                <FaMoneyBillWave className="me-2" />
                Totales de Liquidación
              </h6>
              <div className="row">
                <div className="col-6">
                  <small className="opacity-75">Total Vía 2</small>
                  <div className="h5 mb-0">${resumen.totales?.total_negro?.toLocaleString() || '0'}</div>
                </div>
                <div className="col-6">
                  <small className="opacity-75">Total Vía 1</small>
                  <div className="h5 mb-0">${resumen.totales?.total_blanco?.toLocaleString() || '0'}</div>
                </div>
                <div className="col-12 mt-2 pt-2 border-top border-light border-opacity-25">
                  <small className="opacity-75">Total General</small>
                  <div className="h4 mb-0">${resumen.totales?.total_general?.toLocaleString() || '0'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desglose por productos */}
      {resumen.detalle_items && resumen.detalle_items.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">
              <FaChartBar className="me-2" />
              Desglose por Productos
            </h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Producto</th>
                    <th className="text-center">Cantidad</th>
                    <th className="text-end">Precio Unit.</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-center">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.detalle_items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{item.producto}</strong>
                      </td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-end">${parseFloat(item.precio_unitario).toLocaleString()}</td>
                      <td className="text-end fw-bold">${parseFloat(item.subtotal).toLocaleString()}</td>
                      <td className="text-center">
                        {item.tipo_facturacion === 'negro' && (
                          <span className="badge bg-dark">Vía 2</span>
                        )}
                        {item.tipo_facturacion === 'blanco' && (
                          <span className="badge bg-light text-dark">Vía 1</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notas y observaciones */}
      {resumen.observaciones && (
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">
              <FaInfoCircle className="me-2" />
              Observaciones
            </h6>
          </div>
          <div className="card-body">
            <p className="mb-0">{resumen.observaciones}</p>
          </div>
        </div>
      )}

      {/* Acciones finales */}
      <div className="d-flex justify-content-end gap-2 mt-4">
        <button 
          className="btn btn-outline-primary"
          onClick={generarResumen}
          disabled={generandoResumen}
        >
          {generandoResumen ? (
            <>
              <FaSpinner className="fa-spin me-2" />
              Regenerando...
            </>
          ) : (
            <>
              <FaFileInvoice className="me-2" />
              Regenerar
            </>
          )}
        </button>
        <button 
          className="btn btn-secondary"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ResumenLiquidacionSimple;