import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { getVacunas } from '../../services/api';
import { FaSave, FaTimes, FaPlus, FaTrash, FaSyringe, FaInfoCircle } from 'react-icons/fa';

const PlanVacunalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const { 
    crearPlan, 
    actualizarPlan, 
    obtenerPlan, 
    cargarListasPrecios, 
    listasPrecios,
    loading 
  } = usePlanesVacunales();

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    duracion_semanas: 12,
    estado: 'borrador',
    id_lista_precio: '',
    observaciones: '',
    productos: []
  });

  const [productos, setProductos] = useState([]);
  const [errors, setErrors] = useState({});
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      cargarPlan();
    }
  }, [id, isEdit]);

  const cargarDatos = async () => {
    try {
      const [productosData] = await Promise.all([
        getVacunas(), // Solo cargar vacunas para planes vacunales
        cargarListasPrecios({ activa: true })
      ]);
      setProductos(productosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const cargarPlan = async () => {
    try {
      const plan = await obtenerPlan(id);
      if (plan) {
        setFormData({
          nombre: plan.nombre,
          descripcion: plan.descripcion || '',
          duracion_semanas: plan.duracion_semanas,
          estado: plan.estado || 'borrador',
          id_lista_precio: plan.id_lista_precio || '',
          observaciones: plan.observaciones || '',
          productos: plan.productos_plan?.map(pp => ({
            id_producto: pp.id_producto,
            cantidad_total: pp.cantidad_total,
            dosis_por_semana: pp.dosis_por_semana,
            semana_inicio: pp.semana_inicio,
            semana_fin: pp.semana_fin || '',
            observaciones: pp.observaciones || '',
            producto: pp.producto
          })) || []
        });
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duracion_semanas' ? parseInt(value) || 1 : value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const agregarProducto = () => {
    setShowProductModal(true);
  };

  const guardarProducto = (producto) => {
    setFormData(prev => ({
      ...prev,
      productos: [...prev.productos, producto]
    }));
    setShowProductModal(false);
  };

  const editarProducto = (index, producto) => {
    setFormData(prev => ({
      ...prev,
      productos: prev.productos.map((p, i) => i === index ? producto : p)
    }));
  };

  const eliminarProducto = (index) => {
    setFormData(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index)
    }));
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (formData.duracion_semanas < 1 || formData.duracion_semanas > 52) {
      newErrors.duracion_semanas = 'La duración debe estar entre 1 y 52 semanas';
    }

    if (formData.productos.length === 0) {
      newErrors.productos = 'Debe agregar al menos una vacuna al plan';
    }

    // Validar productos
    formData.productos.forEach((producto, index) => {
      if (producto.semana_inicio < 1 || producto.semana_inicio > formData.duracion_semanas) {
        newErrors[`producto_${index}_semana_inicio`] = 'Semana de inicio inválida';
      }
      if (producto.semana_fin && producto.semana_fin > formData.duracion_semanas) {
        newErrors[`producto_${index}_semana_fin`] = 'Semana de fin inválida';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    try {
      const planData = {
        ...formData,
        id_lista_precio: formData.id_lista_precio || null,
        productos: formData.productos.map(p => ({
          id_producto: p.id_producto,
          cantidad_total: p.cantidad_total,
          dosis_por_semana: p.dosis_por_semana,
          semana_inicio: p.semana_inicio,
          semana_fin: p.semana_fin || null,
          observaciones: p.observaciones
        }))
      };

      if (isEdit) {
        await actualizarPlan(id, planData);
      } else {
        await crearPlan(planData);
      }
      
      navigate('/planes-vacunales');
    } catch (error) {
      console.error('Error guardando plan:', error);
    }
  };

  const calcularTotalDosis = (producto) => {
    if (!producto.semana_fin) {
      return producto.dosis_por_semana * (formData.duracion_semanas - producto.semana_inicio + 1);
    }
    return producto.dosis_por_semana * (producto.semana_fin - producto.semana_inicio + 1);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center">
            <FaSyringe className="me-2 text-primary" />
            <h3 className="mb-0">
              {isEdit ? 'Editar Plan Vacunal' : 'Nuevo Plan Vacunal'}
            </h3>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Información del Plan */}
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Información del Plan</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Nombre del Plan <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Plan Básico Bovinos"
                    />
                    {errors.nombre && (
                      <div className="invalid-feedback">{errors.nombre}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Duración (semanas) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${errors.duracion_semanas ? 'is-invalid' : ''}`}
                      name="duracion_semanas"
                      value={formData.duracion_semanas}
                      onChange={handleInputChange}
                      min="1"
                      max="52"
                    />
                    {errors.duracion_semanas && (
                      <div className="invalid-feedback">{errors.duracion_semanas}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Estado <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                    >
                      <option value="borrador">Borrador</option>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                    <div className="form-text">
                      {formData.estado === 'borrador' && 'El plan está en desarrollo y no puede ser usado en cotizaciones'}
                      {formData.estado === 'activo' && 'El plan está disponible para usar en cotizaciones'}
                      {formData.estado === 'inactivo' && 'El plan no está disponible temporalmente'}
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control"
                      name="descripcion"
                      rows="3"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      placeholder="Descripción detallada del plan vacunal..."
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Lista de Precios</label>
                    <select
                      className="form-select"
                      name="id_lista_precio"
                      value={formData.id_lista_precio}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar lista de precios</option>
                      {listasPrecios.map(lista => (
                        <option key={lista.id_lista} value={lista.id_lista}>
                          {lista.tipo} - {lista.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Observaciones</label>
                    <textarea
                      className="form-control"
                      name="observaciones"
                      rows="2"
                      value={formData.observaciones}
                      onChange={handleInputChange}
                      placeholder="Observaciones adicionales..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Productos del Plan */}
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Vacunas del Plan</h5>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={agregarProducto}
                >
                  <FaPlus className="me-1" />
                  Agregar Vacuna
                </button>
              </div>
              <div className="card-body">
                {errors.productos && (
                  <div className="alert alert-danger">
                    <FaInfoCircle className="me-2" />
                    {errors.productos}
                  </div>
                )}

                {formData.productos.length === 0 ? (
                  <div className="text-center py-4">
                    <FaSyringe className="text-muted mb-3" style={{ fontSize: '2rem' }} />
                    <p className="text-muted">No hay vacunas agregadas</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={agregarProducto}
                    >
                      <FaPlus className="me-2" />
                      Agregar Primera Vacuna
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Vacuna</th>
                          <th>Dosis/Semana</th>
                          <th>Semana Inicio</th>
                          <th>Semana Fin</th>
                          <th>Total Dosis</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.productos.map((producto, index) => (
                          <tr key={index}>
                            <td>
                              <div>
                                <strong>
                                  {producto.producto?.nombre || 
                                   productos.find(p => p.id_producto === producto.id_producto)?.nombre}
                                </strong>
                                {(producto.producto?.descripcion || 
                                  productos.find(p => p.id_producto === producto.id_producto)?.descripcion) && (
                                  <div>
                                    <small className="text-muted">
                                      {producto.producto?.descripcion || 
                                       productos.find(p => p.id_producto === producto.id_producto)?.descripcion}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{producto.dosis_por_semana}</td>
                            <td>{producto.semana_inicio}</td>
                            <td>{producto.semana_fin || 'Hasta el final'}</td>
                            <td>
                              <span className="badge bg-primary">
                                {calcularTotalDosis(producto)} dosis
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => eliminarProducto(index)}
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel de Resumen */}
          <div className="col-lg-4">
            <div className="card sticky-top">
              <div className="card-header">
                <h5 className="mb-0">Resumen del Plan</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <small className="text-muted">Estado</small>
                  <div className="fw-bold">
                    <span className={`badge ${
                      formData.estado === 'activo' ? 'bg-success' :
                      formData.estado === 'inactivo' ? 'bg-secondary' :
                      'bg-warning text-dark'
                    }`}>
                      {formData.estado.charAt(0).toUpperCase() + formData.estado.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted">Duración</small>
                  <div className="fw-bold">{formData.duracion_semanas} semanas</div>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted">Productos</small>
                  <div className="fw-bold">{formData.productos.length} productos</div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">Total de dosis</small>
                  <div className="fw-bold">
                    {formData.productos.reduce((total, producto) => 
                      total + calcularTotalDosis(producto), 0
                    )} dosis
                  </div>
                </div>

                {formData.id_lista_precio && (
                  <div className="mb-3">
                    <small className="text-muted">Lista de precios</small>
                    <div className="fw-bold">
                      {listasPrecios.find(l => l.id_lista == formData.id_lista_precio)?.tipo}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/planes-vacunales')}
              >
                <FaTimes className="me-2" />
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <FaSave className="me-2" />
                {isEdit ? 'Actualizar Plan' : 'Crear Plan'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Modal de Agregar Producto */}
      {showProductModal && (
        <ProductoModal
          productos={productos}
          duracionSemanas={formData.duracion_semanas}
          onSave={guardarProducto}
          onClose={() => setShowProductModal(false)}
        />
      )}
    </div>
  );
};

// Modal para agregar productos
const ProductoModal = ({ productos, duracionSemanas, onSave, onClose }) => {
  const [productoData, setProductoData] = useState({
    id_producto: '',
    cantidad_total: 1,
    dosis_por_semana: 1,
    semana_inicio: 1,
    semana_fin: '',
    observaciones: ''
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductoData(prev => ({
      ...prev,
      [name]: ['cantidad_total', 'dosis_por_semana', 'semana_inicio', 'semana_fin'].includes(name) 
        ? parseInt(value) || '' 
        : value
    }));
  };

  const validarProducto = () => {
    const newErrors = {};

    if (!productoData.id_producto) {
      newErrors.id_producto = 'Debe seleccionar una vacuna';
    }

    if (productoData.semana_inicio < 1 || productoData.semana_inicio > duracionSemanas) {
      newErrors.semana_inicio = 'Semana de inicio inválida';
    }

    if (productoData.semana_fin && productoData.semana_fin > duracionSemanas) {
      newErrors.semana_fin = 'Semana de fin inválida';
    }

    if (productoData.semana_fin && productoData.semana_fin < productoData.semana_inicio) {
      newErrors.semana_fin = 'Semana de fin debe ser mayor a la de inicio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validarProducto()) {
      const producto = productos.find(p => p.id_producto == productoData.id_producto);
      onSave({
        ...productoData,
        producto
      });
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Agregar Vacuna al Plan</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Vacuna *</label>
              <select
                className={`form-select ${errors.id_producto ? 'is-invalid' : ''}`}
                name="id_producto"
                value={productoData.id_producto}
                onChange={handleInputChange}
              >
                <option value="">Seleccionar vacuna</option>
                {productos.map(producto => (
                  <option key={producto.id_producto} value={producto.id_producto}>
                    {producto.nombre} - {producto.descripcion || 'Sin descripción'}
                  </option>
                ))}
              </select>
              {errors.id_producto && (
                <div className="invalid-feedback">{errors.id_producto}</div>
              )}
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Dosis por semana *</label>
                <input
                  type="number"
                  className="form-control"
                  name="dosis_por_semana"
                  value={productoData.dosis_por_semana}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Cantidad total</label>
                <input
                  type="number"
                  className="form-control"
                  name="cantidad_total"
                  value={productoData.cantidad_total}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Semana de inicio *</label>
                <input
                  type="number"
                  className={`form-control ${errors.semana_inicio ? 'is-invalid' : ''}`}
                  name="semana_inicio"
                  value={productoData.semana_inicio}
                  onChange={handleInputChange}
                  min="1"
                  max={duracionSemanas}
                />
                {errors.semana_inicio && (
                  <div className="invalid-feedback">{errors.semana_inicio}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Semana de fin</label>
                <input
                  type="number"
                  className={`form-control ${errors.semana_fin ? 'is-invalid' : ''}`}
                  name="semana_fin"
                  value={productoData.semana_fin}
                  onChange={handleInputChange}
                  min={productoData.semana_inicio}
                  max={duracionSemanas}
                  placeholder="Opcional"
                />
                {errors.semana_fin && (
                  <div className="invalid-feedback">{errors.semana_fin}</div>
                )}
              </div>

              <div className="col-12">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-control"
                  name="observaciones"
                  rows="2"
                  value={productoData.observaciones}
                  onChange={handleInputChange}
                  placeholder="Observaciones para este producto..."
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Agregar Vacuna
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanVacunalForm;
