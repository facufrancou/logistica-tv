import React, { useEffect, useState, useContext } from "react";
import {
  crearVacuna,
  actualizarVacuna,
  getProveedores,
  getPatologias,
  getPresentaciones,
  getViasAplicacion,
  crearPatologia,
  crearPresentacion,
  crearViaAplicacion
} from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import "./FormularioVacuna.css";

function FormularioVacuna({ vacuna, onClose, onSave, modo = "crear" }) {
  const { usuario } = useContext(AuthContext);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    detalle: "",
    id_proveedor: "",
    id_patologia: "",
    id_presentacion: "",
    id_via_aplicacion: "",
    precio_lista: "",
    activa: true
  });

  // Estados para catálogos
  const [proveedores, setProveedores] = useState([]);
  const [patologias, setPatologias] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [viasAplicacion, setViasAplicacion] = useState([]);

  // Estados para creación rápida
  const [mostrarCrearPatologia, setMostrarCrearPatologia] = useState(false);
  const [mostrarCrearPresentacion, setMostrarCrearPresentacion] = useState(false);
  const [mostrarCrearVia, setMostrarCrearVia] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    cargarCatalogos();
    if (vacuna && modo === "editar") {
      setFormData({
        codigo: vacuna.codigo || "",
        nombre: vacuna.nombre || "",
        detalle: vacuna.detalle || "",
        id_proveedor: vacuna.id_proveedor || "",
        id_patologia: vacuna.id_patologia || "",
        id_presentacion: vacuna.id_presentacion || "",
        id_via_aplicacion: vacuna.id_via_aplicacion || "",
        precio_lista: vacuna.precio_lista || "",
        activa: vacuna.activa !== undefined ? vacuna.activa : true
      });
    }
  }, [vacuna, modo]);

  const cargarCatalogos = async () => {
    try {
      const [provData, patData, presData, viasData] = await Promise.all([
        getProveedores(),
        getPatologias(),
        getPresentaciones(),
        getViasAplicacion()
      ]);

      setProveedores(provData.data || provData);
      setPatologias(patData.data || patData);
      setPresentaciones(presData.data || presData);
      setViasAplicacion(viasData.data || viasData);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
    // Limpiar error del campo si existe
    if (errors[campo]) {
      setErrors(prev => ({ ...prev, [campo]: null }));
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validación del código
    if (!formData.codigo.trim()) {
      nuevosErrores.codigo = 'El código es requerido';
    } else if (formData.codigo.length < 2) {
      nuevosErrores.codigo = 'El código debe tener al menos 2 caracteres';
    } else if (!/^[A-Z0-9-]+$/i.test(formData.codigo)) {
      nuevosErrores.codigo = 'El código solo puede contener letras, números y guiones';
    }

    // Validación del nombre
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    // Validación del proveedor
    if (!formData.id_proveedor) {
      nuevosErrores.id_proveedor = 'El proveedor es requerido';
    }

    // Validación del precio
    if (!formData.precio_lista || parseFloat(formData.precio_lista) <= 0) {
      nuevosErrores.precio_lista = 'El precio debe ser mayor a 0';
    } else if (parseFloat(formData.precio_lista) > 999999) {
      nuevosErrores.precio_lista = 'El precio no puede exceder $999,999';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      // Agregar efecto visual para errores
      const firstErrorField = document.querySelector('.is-invalid');
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    setSuccess(false);
    
    try {
      const datosVacuna = {
        ...formData,
        precio_lista: parseFloat(formData.precio_lista),
        id_proveedor: parseInt(formData.id_proveedor),
        id_patologia: formData.id_patologia ? parseInt(formData.id_patologia) : null,
        id_presentacion: formData.id_presentacion ? parseInt(formData.id_presentacion) : null,
        id_via_aplicacion: formData.id_via_aplicacion ? parseInt(formData.id_via_aplicacion) : null
      };

      let resultado;
      if (modo === "crear") {
        resultado = await crearVacuna(datosVacuna);
      } else {
        resultado = await actualizarVacuna(vacuna.id_vacuna, datosVacuna);
      }

      if (resultado) {
        setSuccess(true);
        
        // Mostrar éxito por un momento antes de cerrar
        setTimeout(() => {
          onSave && onSave(resultado);
          onClose && onClose();
        }, 1200);
      }
    } catch (error) {
      console.error('Error guardando vacuna:', error);
      
      // Manejar errores específicos
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Error al guardar la vacuna. Intente nuevamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const crearCatalogoRapido = async (tipo, datos) => {
    try {
      let resultado;
      switch (tipo) {
        case 'patologia':
          resultado = await crearPatologia(datos);
          if (resultado) {
            await cargarCatalogos();
            setFormData(prev => ({ ...prev, id_patologia: resultado.id_patologia }));
            setMostrarCrearPatologia(false);
          }
          break;
        case 'presentacion':
          resultado = await crearPresentacion(datos);
          if (resultado) {
            await cargarCatalogos();
            setFormData(prev => ({ ...prev, id_presentacion: resultado.id_presentacion }));
            setMostrarCrearPresentacion(false);
          }
          break;
        case 'via':
          resultado = await crearViaAplicacion(datos);
          if (resultado) {
            await cargarCatalogos();
            setFormData(prev => ({ ...prev, id_via_aplicacion: resultado.id_via_aplicacion }));
            setMostrarCrearVia(false);
          }
          break;
      }
    } catch (error) {
      console.error(`Error creando ${tipo}:`, error);
    }
  };

  return (
    <>
      {/* Modal principal */}
      <div className="modal show d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content vacuna-modal">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className={`fas ${modo === "crear" ? "fa-plus-circle" : "fa-edit"} mr-2`}></i>
                {modo === "crear" ? "Nueva Vacuna" : "Editar Vacuna"}
              </h5>
              <button
                type="button"
                className="close"
                onClick={onClose}
              >
                <span>&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Mensaje de éxito */}
                {success && (
                  <div className="alert-success-custom">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <strong>¡Vacuna guardada exitosamente!</strong><br/>
                      Los datos se han guardado correctamente
                    </div>
                  </div>
                )}

                {/* Mensaje de error general */}
                {errors.general && (
                  <div className="alert-danger-custom">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                      <strong>Error al guardar</strong><br/>
                      {errors.general}
                    </div>
                  </div>
                )}
                {/* Sección: Información Básica */}
                <div className="form-section">
                  <div className="section-header">
                    <h5 className="section-title">
                      <i className="fas fa-info-circle"></i>
                      Información Básica
                    </h5>
                    <p className="section-subtitle">Datos generales de la vacuna</p>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="font-weight-bold">
                          Código <span className="text-danger">*</span>
                        </label>
                        <div className="input-with-icon">
                          <i className="fas fa-barcode input-icon"></i>
                          <input
                            type="text"
                            className={`form-control ${errors.codigo ? 'is-invalid' : ''}`}
                            value={formData.codigo}
                            onChange={(e) => handleChange("codigo", e.target.value)}
                            placeholder="Ej: VAC001"
                          />
                        </div>
                        {errors.codigo && <div className="invalid-feedback">{errors.codigo}</div>}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="font-weight-bold">
                          Precio de Lista <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text">
                              <i className="fas fa-dollar-sign"></i>
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            className={`form-control ${errors.precio_lista ? 'is-invalid' : ''}`}
                            value={formData.precio_lista}
                            onChange={(e) => handleChange("precio_lista", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        {errors.precio_lista && <div className="invalid-feedback">{errors.precio_lista}</div>}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="font-weight-bold">Estado</label>
                        <div className="custom-switch-wrapper">
                          <div className="custom-control custom-switch">
                            <input
                              type="checkbox"
                              className="custom-control-input"
                              id="vacunaActiva"
                              checked={formData.activa}
                              onChange={(e) => handleChange("activa", e.target.checked)}
                            />
                            <label className="custom-control-label" htmlFor="vacunaActiva">
                              {formData.activa ? "Activa" : "Inactiva"}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <div className="form-group">
                        <label className="font-weight-bold">
                          Nombre Comercial <span className="text-danger">*</span>
                        </label>
                        <div className="input-with-icon">
                          <i className="fas fa-syringe input-icon"></i>
                          <input
                            type="text"
                            className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
                            value={formData.nombre}
                            onChange={(e) => handleChange("nombre", e.target.value)}
                            placeholder="Nombre comercial de la vacuna"
                          />
                        </div>
                        {errors.nombre && <div className="invalid-feedback">{errors.nombre}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <div className="form-group">
                        <label className="font-weight-bold">Descripción/Detalle</label>
                        <div className="input-with-icon">
                          <i className="fas fa-align-left input-icon" style={{top: '1rem'}}></i>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={formData.detalle}
                            onChange={(e) => handleChange("detalle", e.target.value)}
                            placeholder="Descripción detallada de la vacuna, composición, indicaciones..."
                            style={{paddingLeft: '2.5rem'}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Proveedor */}
                <div className="form-section">
                  <div className="section-header">
                    <h5 className="section-title">
                      <i className="fas fa-building mr-2"></i>
                      Proveedor/Laboratorio
                    </h5>
                    <p className="section-subtitle">Información del laboratorio fabricante</p>
                  </div>
                  
                  <div className="row">
                    <div className="col-12">
                      <div className="form-group modern-group">
                        <label className="form-label">
                          Proveedor <span className="required">*</span>
                        </label>
                        <div className="select-wrapper">
                          <i className="fas fa-industry input-icon"></i>
                          <select
                            className={`form-control modern-select ${errors.id_proveedor ? 'is-invalid' : ''}`}
                            value={formData.id_proveedor}
                            onChange={(e) => handleChange("id_proveedor", e.target.value)}
                          >
                            <option value="">Seleccionar proveedor/laboratorio</option>
                            {proveedores.map(prov => (
                              <option key={prov.id_proveedor} value={prov.id_proveedor}>
                                {prov.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        {errors.id_proveedor && <div className="error-feedback">{errors.id_proveedor}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Clasificación */}
                <div className="form-section">
                  <div className="section-header">
                    <h5 className="section-title">
                      <i className="fas fa-tags mr-2"></i>
                      Clasificación y Características
                    </h5>
                    <p className="section-subtitle">Especificaciones técnicas de la vacuna</p>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group modern-group">
                        <label className="form-label">Patología</label>
                        <div className="select-with-add">
                          <div className="select-wrapper">
                            <i className="fas fa-virus input-icon"></i>
                            <select
                              className="form-control modern-select"
                              value={formData.id_patologia}
                              onChange={(e) => handleChange("id_patologia", e.target.value)}
                            >
                              <option value="">Seleccionar patología</option>
                              {patologias.map(pat => (
                                <option key={pat.id_patologia} value={pat.id_patologia}>
                                  {pat.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="btn-add"
                            onClick={() => setMostrarCrearPatologia(true)}
                            title="Agregar nueva patología"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-group modern-group">
                        <label className="form-label">Presentación</label>
                        <div className="select-with-add">
                          <div className="select-wrapper">
                            <i className="fas fa-prescription-bottle input-icon"></i>
                            <select
                              className="form-control modern-select"
                              value={formData.id_presentacion}
                              onChange={(e) => handleChange("id_presentacion", e.target.value)}
                            >
                              <option value="">Seleccionar presentación</option>
                              {presentaciones.map(pres => (
                                <option key={pres.id_presentacion} value={pres.id_presentacion}>
                                  {pres.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="btn-add"
                            onClick={() => setMostrarCrearPresentacion(true)}
                            title="Agregar nueva presentación"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-group modern-group">
                        <label className="form-label">Vía de Aplicación</label>
                        <div className="select-with-add">
                          <div className="select-wrapper">
                            <i className="fas fa-route input-icon"></i>
                            <select
                              className="form-control modern-select"
                              value={formData.id_via_aplicacion}
                              onChange={(e) => handleChange("id_via_aplicacion", e.target.value)}
                            >
                              <option value="">Seleccionar vía</option>
                              {viasAplicacion.map(via => (
                                <option key={via.id_via_aplicacion} value={via.id_via_aplicacion}>
                                  {via.nombre} ({via.abreviacion})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="btn-add"
                            onClick={() => setMostrarCrearVia(true)}
                            title="Agregar nueva vía de aplicación"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer modern-footer">
                <div className="footer-actions">
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={onClose}
                    disabled={loading}
                  >
                    <i className="fas fa-times mr-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`btn ${success ? 'btn-success-confirmed' : 'btn-primary-modern'}`}
                    disabled={loading || success}
                  >
                    {success ? (
                      <>
                        <i className="fas fa-check mr-2"></i>
                        ¡Guardado!
                      </>
                    ) : loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className={`fas ${modo === "crear" ? "fa-save" : "fa-check"} mr-2`}></i>
                        {modo === "crear" ? "Crear Vacuna" : "Guardar Cambios"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modales para creación rápida */}
      {mostrarCrearPatologia && (
        <CreacionRapidaModal
          tipo="Patología"
          campos={[
            { key: "codigo", label: "Código", required: true },
            { key: "nombre", label: "Nombre", required: true },
            { key: "descripcion", label: "Descripción" }
          ]}
          onClose={() => setMostrarCrearPatologia(false)}
          onSave={(datos) => crearCatalogoRapido('patologia', datos)}
        />
      )}

      {mostrarCrearPresentacion && (
        <CreacionRapidaModal
          tipo="Presentación"
          campos={[
            { key: "codigo", label: "Código", required: true },
            { key: "nombre", label: "Nombre", required: true },
            { key: "unidad_medida", label: "Unidad de Medida" },
            { key: "volumen_dosis", label: "Volumen por Dosis", type: "number" }
          ]}
          onClose={() => setMostrarCrearPresentacion(false)}
          onSave={(datos) => crearCatalogoRapido('presentacion', datos)}
        />
      )}

      {mostrarCrearVia && (
        <CreacionRapidaModal
          tipo="Vía de Aplicación"
          campos={[
            { key: "codigo", label: "Código", required: true },
            { key: "nombre", label: "Nombre", required: true },
            { key: "abreviacion", label: "Abreviación" },
            { key: "descripcion", label: "Descripción" }
          ]}
          onClose={() => setMostrarCrearVia(false)}
          onSave={(datos) => crearCatalogoRapido('via', datos)}
        />
      )}

      {/* Backdrop */}
      <div className="modal-backdrop show"></div>
    </>
  );
}

// Componente para creación rápida de catálogos
function CreacionRapidaModal({ tipo, campos, onClose, onSave }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Agregar campo activo por defecto
      await onSave({ ...formData, activo: true });
    } catch (error) {
      console.error('Error creando elemento:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (tipo.toLowerCase()) {
      case 'patología': return 'fa-virus';
      case 'presentación': return 'fa-prescription-bottle';
      case 'vía de aplicación': return 'fa-route';
      default: return 'fa-plus';
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content modern-modal sub-modal">
          <div className="modal-header modern-header sub-header">
            <div className="d-flex align-items-center">
              <div className="modal-icon-small">
                <i className={`fas ${getIcon()}`}></i>
              </div>
              <div className="ml-3">
                <h5 className="modal-title mb-0">Agregar {tipo}</h5>
                <small className="text-muted">Complete los datos para crear un nuevo registro</small>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close-modern" 
              onClick={onClose}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body modern-body sub-body">
              <div className="form-section">
                {campos.map(campo => (
                  <div key={campo.key} className="form-group modern-group">
                    <label className="form-label">
                      {campo.label}
                      {campo.required && <span className="required"> *</span>}
                    </label>
                    <div className="input-wrapper">
                      <i className={`fas ${getFieldIcon(campo.key)} input-icon`}></i>
                      {campo.type === 'textarea' ? (
                        <textarea
                          className="form-control modern-textarea"
                          value={formData[campo.key] || ""}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            [campo.key]: e.target.value 
                          }))}
                          required={campo.required}
                          placeholder={`Ingrese ${campo.label.toLowerCase()}`}
                          rows="3"
                        />
                      ) : (
                        <input
                          type={campo.type || "text"}
                          className="form-control modern-input"
                          value={formData[campo.key] || ""}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            [campo.key]: e.target.value 
                          }))}
                          required={campo.required}
                          placeholder={`Ingrese ${campo.label.toLowerCase()}`}
                          step={campo.type === 'number' ? '0.01' : undefined}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer modern-footer sub-footer">
              <div className="footer-actions">
                <button 
                  type="button" 
                  className="btn btn-cancel" 
                  onClick={onClose}
                  disabled={loading}
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success-modern"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-border spinner-border-sm mr-2"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus mr-2"></i>
                      Crear {tipo}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Backdrop para sub-modal */}
      <div className="modal-backdrop show sub-backdrop"></div>
    </div>
  );
}

// Función auxiliar para iconos de campos
function getFieldIcon(fieldKey) {
  const iconMap = {
    codigo: 'fa-barcode',
    nombre: 'fa-tag',
    descripcion: 'fa-align-left',
    unidad_medida: 'fa-ruler',
    volumen_dosis: 'fa-tint',
    abreviacion: 'fa-font'
  };
  return iconMap[fieldKey] || 'fa-edit';
}

export default FormularioVacuna;