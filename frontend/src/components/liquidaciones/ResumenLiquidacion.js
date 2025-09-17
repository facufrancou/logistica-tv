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
  FaSpinner
} from 'react-icons/fa';
import liquidacionesService from '../../services/liquidacionesService';
import './ResumenLiquidacion.css';

const ResumenLiquidacion = ({ cotizacionId, mostrarDetalle = true }) => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generandoResumen, setGenerandoResumen] = useState(false);

  useEffect(() => {
    if (cotizacionId) {
      cargarResumen();
    }
  }, [cotizacionId]);

  const cargarResumen = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await liquidacionesService.obtenerResumenLiquidacion(cotizacionId);
      setResumen(data.resumen);
    } catch (error) {
      console.error('Error al cargar resumen:', error);
      // Si no existe resumen, no es un error grave
      setResumen(null);
    } finally {
      setLoading(false);
    }
  };

  const generarResumen = async () => {
    try {
      setGenerandoResumen(true);
      setError(null);
      const data = await liquidacionesService.generarResumenLiquidacion(cotizacionId);
      setResumen(data.resumen);
    } catch (error) {
      console.error('Error al generar resumen:', error);
      setError('Error al generar resumen de liquidación');
    } finally {
      setGenerandoResumen(false);
    }
  };

  const exportarResumen = () => {
    if (!resumen || !resumen.cotizacion) return;

    // Crear contenido para exportar
    const contenido = `
RESUMEN DE LIQUIDACIÓN
=====================

Cotización: ${resumen?.cotizacion?.numero_cotizacion || 'N/A'}
Cliente: ${resumen?.cotizacion?.cliente?.nombre || 'N/A'}
CUIT: ${resumen?.cotizacion?.cliente?.cuit || 'N/A'}
Fecha: ${resumen?.fecha_generacion ? new Date(resumen.fecha_generacion).toLocaleDateString('es-AR') : 'N/A'}

TOTALES:
--------
Vía 1: ${liquidacionesService.formatearPrecio(resumen?.totales?.total_blanco || 0)} (${(resumen?.totales?.porcentaje_blanco || 0).toFixed(1)}%)
Vía 2: ${liquidacionesService.formatearPrecio(resumen?.totales?.total_negro || 0)} (${(resumen?.totales?.porcentaje_negro || 0).toFixed(1)}%)
Total General: ${liquidacionesService.formatearPrecio(resumen?.totales?.total_general || 0)}

DETALLE POR PRODUCTO:
-------------------
${(resumen?.detalle_items || []).map(item => 
  `${item?.producto || 'N/A'} - Cantidad: ${item?.cantidad || 0} - Tipo: ${(item?.tipo_facturacion || 'N/A').toUpperCase()} - Monto: ${liquidacionesService.formatearPrecio((item?.monto_negro || 0) + (item?.monto_blanco || 0))}`
).join('\n')}
    `;

    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_liquidacion_${resumen?.cotizacion?.numero_cotizacion || 'sin_numero'}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const imprimirResumen = () => {
    if (!resumen || !resumen.cotizacion) return;

    const contenidoImpresion = `
      <html>
        <head>
          <title>Resumen de Liquidación - ${resumen?.cotizacion?.numero_cotizacion || 'N/A'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .totales { display: flex; justify-content: space-around; background: #f5f5f5; padding: 15px; }
            .total-item { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RESUMEN DE LIQUIDACIÓN</h1>
            <h2>${resumen?.cotizacion?.numero_cotizacion || 'N/A'}</h2>
          </div>
          
          <div class="section">
            <h3>Información del Cliente</h3>
            <p><strong>Cliente:</strong> ${resumen?.cotizacion?.cliente?.nombre || 'N/A'}</p>
            <p><strong>CUIT:</strong> ${resumen?.cotizacion?.cliente?.cuit || 'N/A'}</p>
            <p><strong>Fecha:</strong> ${resumen?.fecha_generacion ? new Date(resumen.fecha_generacion).toLocaleDateString('es-AR') : 'N/A'}</p>
          </div>
          
          <div class="section">
            <h3>Totales</h3>
            <div class="totales">
              <div class="total-item">
                <h4>Vía 1</h4>
                <p>${liquidacionesService.formatearPrecio(resumen?.totales?.total_blanco || 0)}</p>
                <small>${(resumen?.totales?.porcentaje_blanco || 0).toFixed(1)}%</small>
              </div>
              <div class="total-item">
                <h4>Vía 2</h4>
                <p>${liquidacionesService.formatearPrecio(resumen?.totales?.total_negro || 0)}</p>
                <small>${(resumen?.totales?.porcentaje_negro || 0).toFixed(1)}%</small>
              </div>
              <div class="total-item">
                <h4>Total</h4>
                <p>${liquidacionesService.formatearPrecio(resumen?.totales?.total_general || 0)}</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3>Detalle por Producto</h3>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                ${(resumen?.detalle_items || []).map(item => `
                  <tr>
                    <td>${item?.producto || 'N/A'}</td>
                    <td>${item?.cantidad || 0}</td>
                    <td>${liquidacionesService.formatearPrecio(item?.precio_unitario || 0)}</td>
                    <td>${liquidacionesService.formatearPrecio(item?.subtotal || 0)}</td>
                    <td>${(item?.tipo_facturacion || 'N/A').toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(contenidoImpresion);
    ventanaImpresion.document.close();
    ventanaImpresion.print();
  };  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando resumen...</span>
          </div>
          <p className="mt-2">Cargando resumen de liquidación...</p>
        </div>
      </div>
    );
  }

  // Si no hay resumen o no tiene la estructura completa, mostrar botón para generar
  if (!resumen || !resumen.cotizacion || !resumen.totales) {
    return (
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaFileInvoice className="me-2" />
            Resumen de Liquidación
          </h6>
        </div>
        <div className="card-body text-center">
          <div className="alert alert-info">
            <FaExclamationTriangle className="me-2" />
            No se ha generado un resumen de liquidación para esta cotización.
          </div>
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
                <FaChartBar className="me-2" />
                Generar Resumen
              </>
            )}
          </button>
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="resumen-liquidacion">
      {/* Header del resumen */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaFileInvoice className="me-2" />
            Resumen de Liquidación
          </h6>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={exportarResumen}
              title="Exportar resumen"
            >
              <FaDownload />
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={imprimirResumen}
              title="Imprimir resumen"
            >
              <FaPrint />
            </button>
            <button 
              className="btn btn-sm btn-outline-success"
              onClick={generarResumen}
              disabled={generandoResumen}
              title="Regenerar resumen"
            >
              {generandoResumen ? <FaSpinner className="fa-spin" /> : <FaChartBar />}
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6 className="text-primary">{resumen?.cotizacion?.numero_cotizacion || 'N/A'}</h6>
              <p className="mb-1">
                <FaBuilding className="me-2" />
                <strong>Cliente:</strong> {resumen?.cotizacion?.cliente?.nombre || 'N/A'}
              </p>
              <p className="mb-0">
                <strong>CUIT:</strong> {resumen?.cotizacion?.cliente?.cuit || 'N/A'}
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="mb-1">
                <FaCalendarAlt className="me-2" />
                <strong>Generado:</strong> {resumen?.fecha_generacion ? new Date(resumen.fecha_generacion).toLocaleString('es-AR') : 'N/A'}
              </p>
              <div className="badge bg-success">
                <FaCheckCircle className="me-1" />
                Clasificación Completa
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Totales principales */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-light text-dark border">
            <div className="card-body text-center">
              <FaMoneyBillWave className="fa-2x mb-2" />
              <h4>{liquidacionesService.formatearPrecio(resumen?.totales?.total_blanco || 0)}</h4>
              <p className="mb-0">Vía 1 ({(resumen?.totales?.porcentaje_blanco || 0).toFixed(1)}%)</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-dark text-white">
            <div className="card-body text-center">
              <FaMoneyBillWave className="fa-2x mb-2" />
              <h4>{liquidacionesService.formatearPrecio(resumen?.totales?.total_negro || 0)}</h4>
              <p className="mb-0">Vía 2 ({(resumen?.totales?.porcentaje_negro || 0).toFixed(1)}%)</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <FaMoneyBillWave className="fa-2x mb-2" />
              <h4>{liquidacionesService.formatearPrecio(resumen?.totales?.total_general || 0)}</h4>
              <p className="mb-0">Total General</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <FaChartBar className="fa-2x mb-2" />
              <h4>{resumen?.detalle_items?.length || 0}</h4>
              <p className="mb-0">Items Clasificados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de items si se solicita */}
      {mostrarDetalle && (
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Detalle por Producto</h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                    <th>Tipo Facturación</th>
                    <th>Monto Vía 1</th>
                    <th>Monto Vía 2</th>
                  </tr>
                </thead>
                <tbody>
                  {(resumen?.detalle_items || []).map((item, index) => (
                    <tr key={index}>
                      <td>{item?.producto || 'N/A'}</td>
                      <td>
                        <span className="badge bg-primary">{item?.cantidad || 0}</span>
                      </td>
                      <td>{liquidacionesService.formatearPrecio(item?.precio_unitario || 0)}</td>
                      <td>{liquidacionesService.formatearPrecio(item?.subtotal || 0)}</td>
                      <td>
                        <span className={`badge ${(item?.tipo_facturacion || '') === 'negro' ? 'bg-dark' : 'bg-secondary'}`}>
                          {(item?.tipo_facturacion || 'N/A').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {(item?.monto_negro || 0) > 0 ? liquidacionesService.formatearPrecio(item.monto_negro) : '-'}
                      </td>
                      <td>
                        {(item?.monto_blanco || 0) > 0 ? liquidacionesService.formatearPrecio(item.monto_blanco) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumenLiquidacion;