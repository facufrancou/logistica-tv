import React, { useEffect, useState, useContext } from "react";
import {
  getPatologias,
  crearPatologia,
  actualizarPatologia,
  getPresentaciones,
  crearPresentacion,
  actualizarPresentacion,
  getViasAplicacion,
  crearViaAplicacion,
  actualizarViaAplicacion
} from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { FaBook, FaVirus, FaPills, FaSyringe, FaPlus, FaCheck, FaTimes, FaEye, FaEdit, FaInbox } from 'react-icons/fa';

function CatalogosVacunas() {
  const { usuario } = useContext(AuthContext);
  
  const [catalogoActivo, setCatalogoActivo] = useState("patologias");
  const [patologias, setPatologias] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [viasAplicacion, setViasAplicacion] = useState([]);
  
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [itemActivo, setItemActivo] = useState(null);
  const [modo, setModo] = useState("ver");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [catalogoActivo]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      switch (catalogoActivo) {
        case "patologias":
          const patologiasData = await getPatologias();
          setPatologias(patologiasData.data || patologiasData);
          break;
        case "presentaciones":
          const presentacionesData = await getPresentaciones();
          setPresentaciones(presentacionesData.data || presentacionesData);
          break;
        case "vias":
          const viasData = await getViasAplicacion();
          setViasAplicacion(viasData.data || viasData);
          break;
      }
    } catch (error) {
      console.error('Error cargando catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDatosActuales = () => {
    switch (catalogoActivo) {
      case "patologias":
        return patologias;
      case "presentaciones":
        return presentaciones;
      case "vias":
        return viasAplicacion;
      default:
        return [];
    }
  };

  const getCampos = () => {
    switch (catalogoActivo) {
      case "patologias":
        return {
          title: "Patologías",
          singular: "patología",
          fields: [
            { key: "nombre", label: "Nombre", type: "text", required: true },
            { key: "descripcion", label: "Descripción", type: "textarea", required: false },
            { key: "grupo_patologia", label: "Grupo", type: "text", required: false }
          ]
        };
      case "presentaciones":
        return {
          title: "Presentaciones",
          singular: "presentación",
          fields: [
            { key: "nombre", label: "Nombre", type: "text", required: true },
            { key: "descripcion", label: "Descripción", type: "textarea", required: false },
            { key: "unidad_medida", label: "Unidad", type: "text", required: false },
            { key: "volumen_dosis", label: "Volumen por Dosis", type: "number", required: false }
          ]
        };
      case "vias":
        return {
          title: "Vías de Aplicación",
          singular: "vía de aplicación",
          fields: [
            { key: "nombre", label: "Nombre", type: "text", required: true },
            { key: "descripcion", label: "Descripción", type: "textarea", required: false },
            { key: "abreviacion", label: "Abreviación", type: "text", required: false },
            { key: "sitio_anatomico", label: "Sitio Anatómico", type: "text", required: false }
          ]
        };
      default:
        return { title: "", singular: "", fields: [] };
    }
  };

  const datosFiltrados = getDatosActuales().filter((item) =>
    item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirModal = (item, modoAccion) => {
    const campos = getCampos();
    const nuevoItem = item || {};
    
    // Inicializar campos vacíos si es nuevo
    if (!item) {
      campos.fields.forEach(field => {
        if (!nuevoItem[field.key]) {
          nuevoItem[field.key] = "";
        }
      });
    }

    setItemActivo(nuevoItem);
    setModo(modoAccion);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setItemActivo(null);
    setModalOpen(false);
  };

  const handleGuardar = async () => {
    try {
      if (modo === "nuevo") {
        switch (catalogoActivo) {
          case "patologias":
            await crearPatologia(itemActivo);
            break;
          case "presentaciones":
            await crearPresentacion(itemActivo);
            break;
          case "vias":
            await crearViaAplicacion(itemActivo);
            break;
        }
      } else if (modo === "editar") {
        const id = getItemId(itemActivo);
        switch (catalogoActivo) {
          case "patologias":
            await actualizarPatologia(id, itemActivo);
            break;
          case "presentaciones":
            await actualizarPresentacion(id, itemActivo);
            break;
          case "vias":
            await actualizarViaAplicacion(id, itemActivo);
            break;
        }
      }

      cerrarModal();
      cargarDatos();
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar. Por favor, intente nuevamente.');
    }
  };

  const getItemId = (item) => {
    switch (catalogoActivo) {
      case "patologias":
        return item.id_patologia;
      case "presentaciones":
        return item.id_presentacion;
      case "vias":
        return item.id_via_aplicacion;
      default:
        return null;
    }
  };

  const handleInput = (campo, valor) => {
    setItemActivo({ ...itemActivo, [campo]: valor });
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const campos = getCampos();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{minHeight: "300px"}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p className="text-muted">Cargando catálogos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-3">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0"><FaBook className="mr-2" />Catálogos de Vacunas</h4>
                <button
                  className="btn btn-success"
                  onClick={() => abrirModal(null, "nuevo")}
                >
                  <FaPlus className="mr-1" />Nueva {campos.singular}
                </button>
              </div>
              
              {/* Tabs de Catálogos */}
              <div className="mt-3">
                <ul className="nav nav-tabs">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${catalogoActivo === "patologias" ? "active" : ""}`}
                      onClick={() => setCatalogoActivo("patologias")}
                      style={{
                        backgroundColor: catalogoActivo === "patologias" ? "var(--color-principal)" : "transparent",
                        color: catalogoActivo === "patologias" ? "white" : "#495057",
                        border: "none"
                      }}
                    >
                      Patologías ({patologias.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${catalogoActivo === "presentaciones" ? "active" : ""}`}
                      onClick={() => setCatalogoActivo("presentaciones")}
                      style={{
                        backgroundColor: catalogoActivo === "presentaciones" ? "var(--color-principal)" : "transparent",
                        color: catalogoActivo === "presentaciones" ? "white" : "#495057",
                        border: "none"
                      }}
                    >
                      Presentaciones ({presentaciones.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${catalogoActivo === "vias" ? "active" : ""}`}
                      onClick={() => setCatalogoActivo("vias")}
                      style={{
                        backgroundColor: catalogoActivo === "vias" ? "var(--color-principal)" : "transparent",
                        color: catalogoActivo === "vias" ? "white" : "#495057",
                        border: "none"
                      }}
                    >
                      Vías de Aplicación ({viasAplicacion.length})
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="card-body">
              {/* Filtro de búsqueda */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Buscar ${campos.singular}...`}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <div className="text-muted text-right">
                    {datosFiltrados.length} registro(s) encontrado(s)
                  </div>
                </div>
              </div>

              {/* Tabla de datos */}
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-dark">Nombre</th>
                      <th className="text-dark">Descripción</th>
                      {catalogoActivo === "patologias" && <th className="text-dark">Grupo</th>}
                      {catalogoActivo === "presentaciones" && <th className="text-dark">Unidad</th>}
                      {catalogoActivo === "presentaciones" && <th className="text-dark">Vol. Dosis</th>}
                      {catalogoActivo === "vias" && <th className="text-dark">Abreviación</th>}
                      <th className="text-dark">Estado</th>
                      <th className="text-dark">Fecha Creación</th>
                      <th className="text-dark">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosFiltrados.map((item) => (
                      <tr key={getItemId(item)}>
                        <td>
                          <strong>{item.nombre}</strong>
                        </td>
                        <td>
                          <div className="text-muted" style={{ maxWidth: '200px' }}>
                            {item.descripcion ? (
                              item.descripcion.length > 50 
                                ? `${item.descripcion.substring(0, 50)}...` 
                                : item.descripcion
                            ) : "—"}
                          </div>
                        </td>
                        {catalogoActivo === "patologias" && (
                          <td>
                            <span className="badge bg-info text-white">
                              {item.grupo_patologia || "General"}
                            </span>
                          </td>
                        )}
                        {catalogoActivo === "presentaciones" && (
                          <>
                            <td>
                              <span className="badge bg-light text-dark">
                                {item.unidad_medida || "—"}
                              </span>
                            </td>
                            <td>
                              {item.volumen_dosis ? `${item.volumen_dosis} ml` : "—"}
                            </td>
                          </>
                        )}
                        {catalogoActivo === "vias" && (
                          <td>
                            <code>{item.abreviacion || "—"}</code>
                          </td>
                        )}
                        <td>
                          <span className={`badge ${item.activo ? 'bg-success' : 'bg-secondary'} text-white`}>
                            {item.activo ? <FaCheck className="mr-1" /> : <FaTimes className="mr-1" />}
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatearFecha(item.created_at)}
                          </small>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => abrirModal(item, "ver")}
                              title="Ver detalles"
                            >
                              <FaEye />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => abrirModal(item, "editar")}
                              title="Editar"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {datosFiltrados.length === 0 && (
                <div className="text-center text-muted py-4">
                  <p><FaInbox className="mr-2" />No se encontraron registros</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => abrirModal(null, "nuevo")}
                  >
                    <FaPlus className="mr-1" />Crear primera {campos.singular}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modo === "nuevo" && (
                    <>
                      <FaPlus className="mr-2" />Nueva {campos.singular}
                    </>
                  )}
                  {modo === "editar" && (
                    <>
                      <FaEdit className="mr-2" />Editar {campos.singular}
                    </>
                  )}
                  {modo === "ver" && (
                    <>
                      <FaEye className="mr-2" />Detalles de {campos.singular}
                    </>
                  )}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={cerrarModal}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body">
                {campos.fields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label>
                      {field.label}
                      {field.required && <span className="text-danger"> *</span>}
                    </label>
                    
                    {field.type === "textarea" ? (
                      <textarea
                        className="form-control"
                        rows="3"
                        value={itemActivo?.[field.key] || ""}
                        onChange={(e) => handleInput(field.key, e.target.value)}
                        disabled={modo === "ver"}
                        placeholder={`Ingrese ${field.label.toLowerCase()}`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        className="form-control"
                        value={itemActivo?.[field.key] || ""}
                        onChange={(e) => handleInput(field.key, e.target.value)}
                        disabled={modo === "ver"}
                        placeholder={`Ingrese ${field.label.toLowerCase()}`}
                        step={field.type === "number" ? "0.01" : undefined}
                      />
                    )}
                  </div>
                ))}

                {modo !== "nuevo" && (
                  <div className="form-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={itemActivo?.activo || false}
                        onChange={(e) => handleInput("activo", e.target.checked)}
                        disabled={modo === "ver"}
                      />
                      <label className="form-check-label">
                        Activo
                      </label>
                    </div>
                  </div>
                )}

                {modo === "ver" && itemActivo?.created_at && (
                  <div className="mt-3 pt-3 border-top">
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">
                          <strong>Creado:</strong> {formatearFecha(itemActivo.created_at)}
                        </small>
                      </div>
                      {itemActivo.updated_at && (
                        <div className="col-6">
                          <small className="text-muted">
                            <strong>Modificado:</strong> {formatearFecha(itemActivo.updated_at)}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModal}
                >
                  {modo === "ver" ? "Cerrar" : "Cancelar"}
                </button>
                {modo !== "ver" && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleGuardar}
                  >
                    {modo === "nuevo" ? `Crear ${campos.singular}` : "Guardar Cambios"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && <div className="modal-backdrop show"></div>}
    </div>
  );
}

export default CatalogosVacunas;