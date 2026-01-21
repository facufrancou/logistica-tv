import React, { useState, useEffect } from 'react';
import { 
  FaFileInvoice, 
  FaPrint, 
  FaDownload,
  FaSearch,
  FaHistory,
  FaTruck,
  FaShoppingCart,
  FaCalendarAlt,
  FaUser,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import '../planesVacunales/PlanesVacunales.css';

const ITEMS_POR_PAGINA = 10;

const DocumentosImpresos = () => {
  const [loading, setLoading] = useState(false);
  const [documentos, setDocumentos] = useState([]);
  const [generandoPDF, setGenerandoPDF] = useState(null);
  const [buscado, setBuscado] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtros, setFiltros] = useState({
    tipo: '',
    busqueda: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  useEffect(() => {
    // Cargar documentos automáticamente cuando se selecciona un tipo
    if (filtros.tipo) {
      cargarDocumentos();
    }
  }, [filtros.tipo]);

  // Resetear página cuando cambia la búsqueda (filtrado local)
  useEffect(() => {
    setPaginaActual(1);
  }, [filtros.busqueda]);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      setPaginaActual(1);
      
      const params = new URLSearchParams();
      if (filtros.tipo) params.append('tipo_documento', filtros.tipo);
      if (filtros.busqueda) params.append('search', filtros.busqueda);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      params.append('limit', '500');

      const docsResponse = await fetch(`/documentos?${params.toString()}`, { credentials: 'include' });

      if (!docsResponse.ok) {
        throw new Error('Error al cargar documentos');
      }

      const docsData = await docsResponse.json();
      setDocumentos(docsData.data || []);
      setBuscado(true);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    cargarDocumentos();
  };

  const limpiarFiltros = () => {
    setFiltros({ tipo: '', busqueda: '', fecha_desde: '', fecha_hasta: '' });
    setDocumentos([]);
    setBuscado(false);
    setPaginaActual(1);
  };

  const handleReimprimir = async (documento) => {
    setGenerandoPDF(documento.id_documento);
    try {
      let url = '';
      let filename = '';
      let method = 'GET';
      
      // Si el documento tiene snapshot, usar el endpoint genérico de reimpresión
      // Esto funciona para entregas múltiples y cualquier documento con snapshot
      if (documento.datos_snapshot) {
        url = `/documentos/${documento.id_documento}/reimprimir`;
        filename = `${documento.numero_documento}.pdf`;
      } else if (documento.tipo_documento === 'remito_entrega') {
        if (documento.id_calendario) {
          url = `/cotizaciones/calendario/${documento.id_calendario}/remito`;
        } else if (documento.id_cotizacion) {
          // Intentar usar el endpoint de reimpresión genérico
          url = `/documentos/${documento.id_documento}/reimprimir`;
        }
        filename = `remito-${documento.numero_documento}.pdf`;
      } else if (documento.tipo_documento === 'remito_venta_directa') {
        if (documento.id_venta_directa) {
          url = `/ventas-directas-vacunas/${documento.id_venta_directa}/remito-pdf`;
          method = 'POST';
        }
        filename = `remito-venta-directa-${documento.numero_documento}.pdf`;
      } else if (documento.tipo_documento === 'orden_compra') {
        // Intentar usar el endpoint genérico si tiene snapshot
        if (documento.datos_snapshot) {
          url = `/documentos/${documento.id_documento}/reimprimir`;
        } else {
          url = `/ordenes-compra/${documento.id_orden_compra}/pdf`;
        }
        filename = `orden-${documento.numero_documento}.pdf`;
      }

      if (!url) {
        throw new Error('No se puede reimprimir este documento: faltan referencias');
      }

      const response = await fetch(url, {
        method: method,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

    } catch (error) {
      console.error('Error reimprimiendo documento:', error);
      alert('Error al reimprimir el documento: ' + error.message);
    } finally {
      setGenerandoPDF(null);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) return '-';
      
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const year = dateObj.getUTCFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'remito_entrega':
        return <FaTruck className="text-success" />;
      case 'remito_venta_directa':
        return <FaShoppingCart className="text-warning" />;
      case 'orden_compra':
        return <FaShoppingCart className="text-primary" />;
      default:
        return <FaFileInvoice className="text-secondary" />;
    }
  };

  const getEstadoBadge = (tipo) => {
    const badges = {
      'remito_entrega': { class: 'badge bg-success', text: 'Remito Entrega' },
      'orden_compra': { class: 'badge bg-primary', text: 'Orden de Compra' },
      'remito_venta_directa': { class: 'badge bg-warning text-dark', text: 'Venta Directa' }
    };
    return badges[tipo] || { class: 'badge bg-secondary', text: tipo };
  };

  // Filtrar documentos localmente por búsqueda
  const documentosFiltrados = documentos.filter(doc => {
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      const coincide = 
        doc.numero_documento?.toLowerCase().includes(busqueda) ||
        doc.cliente?.nombre?.toLowerCase().includes(busqueda) ||
        doc.proveedor?.nombre?.toLowerCase().includes(busqueda) ||
        doc.cotizacion?.numero_cotizacion?.toLowerCase().includes(busqueda);
      if (!coincide) return false;
    }
    if (filtros.tipo && doc.tipo_documento !== filtros.tipo) return false;
    return true;
  });

  // Calcular paginación
  const totalPaginas = Math.ceil(documentosFiltrados.length / ITEMS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const indiceFin = indiceInicio + ITEMS_POR_PAGINA;
  const documentosPaginados = documentosFiltrados.slice(indiceInicio, indiceFin);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaFileInvoice className="me-2 text-primary" />
            <h3 className="mb-0">Documentos Impresos</h3>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label"><FaSearch className="me-1" />Buscar</label>
              <input
                type="text"
                className="form-control"
                placeholder="Número, cliente, proveedor..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={filtros.tipo}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="remito_entrega">Remitos de Entrega</option>
                <option value="orden_compra">Órdenes de Compra</option>
                <option value="remito_venta_directa">Ventas Directas</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button 
                className="btn btn-outline-secondary"
                onClick={limpiarFiltros}
              >
                Limpiar
              </button>
              <button 
                className="btn btn-primary"
                onClick={aplicarFiltros}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="card">
        <div className="card-body">
          {!buscado ? (
            <div className="text-center py-5">
              <FaSearch className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">Buscar Documentos</h5>
              <p className="text-muted">
                Seleccione un tipo de documento o escriba una búsqueda para comenzar
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted mt-3">Buscando documentos...</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="text-center py-5">
              <FaFileInvoice className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay documentos</h5>
              <p className="text-muted">
                No se encontraron documentos con los filtros aplicados
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover productos-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Fecha Emisión</th>
                    <th>Referencia</th>
                    <th>Impresiones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosPaginados.map((doc) => {
                    const estadoBadge = getEstadoBadge(doc.tipo_documento);
                    
                    return (
                      <tr key={doc.id_documento}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {getTipoIcon(doc.tipo_documento)}
                            <span className={estadoBadge.class}>
                              {estadoBadge.text}
                            </span>
                          </div>
                        </td>
                        <td>
                          <strong className="text-primary font-monospace">
                            {doc.numero_documento}
                          </strong>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <FaCalendarAlt className="text-muted" />
                            <span>{formatearFecha(doc.fecha_emision)}</span>
                          </div>
                        </td>
                        <td>
                          {(doc.tipo_documento === 'remito_entrega' || doc.tipo_documento === 'remito_venta_directa') && doc.cliente && (
                            <div>
                              <div className="d-flex align-items-center gap-2">
                                <FaUser className="text-muted" />
                                <strong>{doc.cliente.nombre}</strong>
                              </div>
                              {doc.cotizacion && (
                                <small className="text-muted">
                                  Cot: {doc.cotizacion.numero_cotizacion}
                                </small>
                              )}
                            </div>
                          )}
                          {doc.tipo_documento === 'orden_compra' && doc.proveedor && (
                            <div className="d-flex align-items-center gap-2">
                              <FaBuilding className="text-muted" />
                              <strong>{doc.proveedor.nombre}</strong>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <FaHistory className="text-muted" />
                            <span className="badge bg-secondary">{doc.total_impresiones || doc.version_impresion || 1}</span>
                          </div>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleReimprimir(doc)}
                              disabled={generandoPDF === doc.id_documento}
                              title="Reimprimir PDF"
                            >
                              {generandoPDF === doc.id_documento ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <FaPrint />
                              )}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleReimprimir(doc)}
                              disabled={generandoPDF === doc.id_documento}
                              title="Descargar PDF"
                            >
                              <FaDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                  <div className="text-muted">
                    Mostrando {indiceInicio + 1} - {Math.min(indiceFin, documentosFiltrados.length)} de {documentosFiltrados.length} documentos
                  </div>
                  <nav>
                    <ul className="pagination mb-0">
                      <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                          disabled={paginaActual === 1}
                        >
                          <FaChevronLeft />
                        </button>
                      </li>
                      {[...Array(totalPaginas)].map((_, i) => {
                        const pagina = i + 1;
                        // Mostrar solo páginas cercanas a la actual
                        if (
                          pagina === 1 ||
                          pagina === totalPaginas ||
                          (pagina >= paginaActual - 2 && pagina <= paginaActual + 2)
                        ) {
                          return (
                            <li key={pagina} className={`page-item ${paginaActual === pagina ? 'active' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setPaginaActual(pagina)}
                              >
                                {pagina}
                              </button>
                            </li>
                          );
                        } else if (
                          pagina === paginaActual - 3 ||
                          pagina === paginaActual + 3
                        ) {
                          return <li key={pagina} className="page-item disabled"><span className="page-link">...</span></li>;
                        }
                        return null;
                      })}
                      <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                          disabled={paginaActual === totalPaginas}
                        >
                          <FaChevronRight />
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentosImpresos;
