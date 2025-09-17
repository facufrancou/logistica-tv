import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { getClientes } from '../../services/api';
import { verificarDisponibilidad } from '../../services/planesVacunalesApi';
import { FaSave, FaTimes, FaFileInvoice, FaInfoCircle, FaCalculator, FaExclamationTriangle } from 'react-icons/fa';
import './PlanesVacunales.css';

const CotizacionForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const planPreseleccionado = searchParams.get('plan');
  const modoEdicion = Boolean(id);
  
  const { 
    crearCotizacion,
    actualizarCotizacion,
    cargarCotizaciones,
    cotizaciones,
    cargarPlanes, 
    planes,
    cargarListasPrecios, 
    listasPrecios,
    calcularPrecioPlan,
    loading 
  } = usePlanesVacunales();

  const [formData, setFormData] = useState({
    id_cliente: '',
    id_plan: planPreseleccionado || '',
    id_lista_precio: '',
    fecha_inicio_plan: '',
    observaciones: ''
  });

  const [clientes, setClientes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [precioCalculado, setPrecioCalculado] = useState(null);
  const [disponibilidadStock, setDisponibilidadStock] = useState(null);
  const [errors, setErrors] = useState({});
  const [calculandoPrecio, setCalculandoPrecio] = useState(false);
  const [verificandoStock, setVerificandoStock] = useState(false);

  useEffect(() => {
    cargarDatos();
    if (modoEdicion) {
      cargarCotizacionParaEditar();
    }
  }, [id]);

  const cargarCotizacionParaEditar = async () => {
    try {
      await cargarCotizaciones();
      const cotizacion = cotizaciones.find(c => c.id_cotizacion == id);
      if (cotizacion) {
        setFormData({
          id_cliente: cotizacion.id_cliente || '',
          id_plan: cotizacion.id_plan || '',
          id_lista_precio: cotizacion.id_lista_precio || '',
          fecha_inicio_plan: cotizacion.fecha_inicio_plan ? 
            new Date(cotizacion.fecha_inicio_plan).toISOString().split('T')[0] : '',
          observaciones: cotizacion.observaciones || ''
        });
      }
    } catch (error) {
      console.error('Error cargando cotización para editar:', error);
    }
  };

  useEffect(() => {
    if (formData.id_plan) {
      cargarDetallesPlan();
    }
  }, [formData.id_plan]);

  useEffect(() => {
    // Calcular precio cuando cambie el plan o la lista de precios
    console.log('useEffect calcularPrecio triggered:', { 
      id_plan: formData.id_plan, 
      id_lista_precio: formData.id_lista_precio 
    });
    
    if (formData.id_plan) {
      calcularPrecio();
    } else {
      // Limpiar precio calculado si no hay plan seleccionado
      setPrecioCalculado(null);
    }
  }, [formData.id_plan, formData.id_lista_precio]);

  const cargarDatos = async () => {
    try {
      const [clientesData] = await Promise.all([
        getClientes(),
        cargarPlanes({ estado: 'activo' }),
        cargarListasPrecios({ activa: true })
      ]);
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const cargarDetallesPlan = async () => {
    try {
      const plan = planes.find(p => p.id_plan == formData.id_plan);
      if (plan) {
        setPlanSeleccionado(plan);
        // Si el plan tiene una lista de precios asignada, usarla por defecto
        if (plan.id_lista_precio && !formData.id_lista_precio) {
          setFormData(prev => ({
            ...prev,
            id_lista_precio: plan.id_lista_precio
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando detalles del plan:', error);
    }
  };

  const calcularPrecio = async () => {
    try {
      setCalculandoPrecio(true);
      // Usar la lista de precios seleccionada en el formulario
      const listaPrecios = formData.id_lista_precio || planSeleccionado?.id_lista_precio;
      console.log('Calculando precio con:', { 
        id_plan: formData.id_plan, 
        id_lista_precio: listaPrecios 
      });
      
      const resultado = await calcularPrecioPlan(formData.id_plan, listaPrecios);
      if (resultado) {
        console.log('Precio calculado:', resultado);
        setPrecioCalculado(resultado);
      }
    } catch (error) {
      console.error('Error calculando precio:', error);
    } finally {
      setCalculandoPrecio(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.id_cliente) {
      newErrors.id_cliente = 'Debe seleccionar un cliente';
    }

    if (!formData.id_plan) {
      newErrors.id_plan = 'Debe seleccionar un plan vacunal';
    }

    if (!formData.fecha_inicio_plan) {
      newErrors.fecha_inicio_plan = 'Debe especificar la fecha de inicio del plan';
    } else {
      const fechaInicio = new Date(formData.fecha_inicio_plan);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaInicio < hoy) {
        newErrors.fecha_inicio_plan = 'La fecha de inicio no puede ser anterior a hoy';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verificarDisponibilidadStock = async () => {
    if (!formData.id_plan) {
      alert('Primero seleccione un plan vacunal');
      return;
    }

    try {
      setVerificandoStock(true);
      
      // Si estamos en modo edición, usar la cotización existente
      if (!modoEdicion) {
        alert('Para verificar disponibilidad, primero debe guardar la cotización');
        return;
      }

      const resultado = await verificarDisponibilidad(id);
      setDisponibilidadStock(resultado);
      
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      alert('Error al verificar disponibilidad de stock');
    } finally {
      setVerificandoStock(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    try {
      const cotizacionData = {
        ...formData,
        id_lista_precio: formData.id_lista_precio || null
      };

      if (modoEdicion) {
        const cotizacionActualizada = await actualizarCotizacion(id, cotizacionData);
        if (cotizacionActualizada) {
          navigate(`/cotizaciones/${id}`);
        }
      } else {
        const nuevaCotizacion = await crearCotizacion(cotizacionData);
        if (nuevaCotizacion) {
          navigate('/cotizaciones');
        }
      }
    } catch (error) {
      console.error('Error guardando cotización:', error);
    }
  };

  const clienteSeleccionado = clientes.find(c => c.id_cliente == formData.id_cliente);

  if (loading) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner"></div>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center">
            <FaFileInvoice className="me-2 text-primary" />
            <h3 className="mb-0">{modoEdicion ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Formulario Principal */}
          <div className="col-lg-8">
            {/* Información Básica */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Información Básica</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Cliente <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.id_cliente ? 'is-invalid' : ''}`}
                      name="id_cliente"
                      value={formData.id_cliente}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id_cliente} value={cliente.id_cliente}>
                          {cliente.nombre} - {cliente.email || 'Sin email'}
                        </option>
                      ))}
                    </select>
                    {errors.id_cliente && (
                      <div className="invalid-feedback">{errors.id_cliente}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Plan Vacunal <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.id_plan ? 'is-invalid' : ''}`}
                      name="id_plan"
                      value={formData.id_plan}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar plan</option>
                      {planes.map(plan => (
                        <option key={plan.id_plan} value={plan.id_plan}>
                          {plan.nombre} ({plan.duracion_semanas} semanas)
                        </option>
                      ))}
                    </select>
                    {errors.id_plan && (
                      <div className="invalid-feedback">{errors.id_plan}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Fecha de Inicio del Plan <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-control ${errors.fecha_inicio_plan ? 'is-invalid' : ''}`}
                      name="fecha_inicio_plan"
                      value={formData.fecha_inicio_plan}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.fecha_inicio_plan && (
                      <div className="invalid-feedback">{errors.fecha_inicio_plan}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Lista de Precios</label>
                    <select
                      className="form-select"
                      name="id_lista_precio"
                      value={formData.id_lista_precio}
                      onChange={handleInputChange}
                    >
                      <option value="">Usar lista del plan</option>
                      {listasPrecios.map(lista => (
                        <option key={lista.id_lista} value={lista.id_lista}>
                          {lista.tipo} - {lista.nombre}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Opcional: Si no se selecciona, se usará la lista asignada al plan
                    </small>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Observaciones</label>
                    <textarea
                      className="form-control"
                      name="observaciones"
                      rows="3"
                      value={formData.observaciones}
                      onChange={handleInputChange}
                      placeholder="Observaciones adicionales para la cotización..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Plan Seleccionado */}
            {planSeleccionado && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Detalles del Plan Seleccionado</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <h6 className="text-primary">{planSeleccionado.nombre}</h6>
                      {planSeleccionado.descripcion && (
                        <p className="text-muted mb-3">{planSeleccionado.descripcion}</p>
                      )}
                    </div>
                    
                    {planSeleccionado.productos_plan && planSeleccionado.productos_plan.length > 0 && (
                      <div className="col-12">
                        <h6>Productos incluidos:</h6>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead className="table-light">
                              <tr>
                                <th>Vacuna</th>
                                <th>Dosis/Semana</th>
                                <th>Período</th>
                                <th>Total Dosis</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planSeleccionado.productos_plan.map((pp, index) => {
                                const totalDosis = pp.semana_fin ? 
                                  pp.dosis_por_semana * (pp.semana_fin - pp.semana_inicio + 1) :
                                  pp.dosis_por_semana * (planSeleccionado.duracion_semanas - pp.semana_inicio + 1);
                                
                                return (
                                  <tr key={index}>
                                    <td>
                                      <div>
                                        <strong>{pp.producto?.nombre || 'Vacuna no encontrada'}</strong>
                                        {pp.producto?.descripcion && (
                                          <div>
                                            <small className="text-muted">{pp.producto.descripcion}</small>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td>{pp.dosis_por_semana}</td>
                                    <td>
                                      Semana {pp.semana_inicio}
                                      {pp.semana_fin ? ` - ${pp.semana_fin}` : ' - final'}
                                    </td>
                                    <td>
                                      <span className="badge bg-success">{totalDosis} dosis</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Lateral */}
          <div className="col-lg-4">
            {/* Resumen del Cliente */}
            {clienteSeleccionado && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Cliente Seleccionado</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>{clienteSeleccionado.nombre}</strong>
                  </div>
                  {clienteSeleccionado.email && (
                    <div className="mb-2">
                      <small className="text-muted">Email:</small>
                      <div>{clienteSeleccionado.email}</div>
                    </div>
                  )}
                  {clienteSeleccionado.telefono && (
                    <div className="mb-2">
                      <small className="text-muted">Teléfono:</small>
                      <div>{clienteSeleccionado.telefono}</div>
                    </div>
                  )}
                  {clienteSeleccionado.direccion && (
                    <div className="mb-2">
                      <small className="text-muted">Dirección:</small>
                      <div>{clienteSeleccionado.direccion}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen de Precio */}
            <div className="card sticky-top">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Resumen de Cotización</h5>
                {formData.id_plan && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={calcularPrecio}
                    disabled={calculandoPrecio}
                  >
                    <FaCalculator className="me-1" />
                    {calculandoPrecio ? 'Calculando...' : 'Recalcular'}
                  </button>
                )}
              </div>
              <div className="card-body">
                {planSeleccionado ? (
                  <>
                    <div className="mb-3">
                      <small className="text-muted">Plan seleccionado</small>
                      <div className="fw-bold">{planSeleccionado.nombre}</div>
                    </div>
                    
                    <div className="mb-3">
                      <small className="text-muted">Duración</small>
                      <div className="fw-bold">{planSeleccionado.duracion_semanas} semanas</div>
                    </div>

                    <div className="mb-3">
                      <small className="text-muted">Productos incluidos</small>
                      <div className="fw-bold">
                        {planSeleccionado.productos_plan?.length || 0} productos
                      </div>
                    </div>

                    <div className="mb-3">
                      <small className="text-muted">Lista de precios</small>
                      <div className="fw-bold">
                        {formData.id_lista_precio ? 
                          listasPrecios.find(l => l.id_lista == formData.id_lista_precio)?.tipo :
                          planSeleccionado.lista_precio?.tipo || 'No asignada'
                        }
                      </div>
                    </div>

                    {formData.fecha_inicio_plan && (
                      <div className="mb-3">
                        <small className="text-muted">Fecha de inicio</small>
                        <div className="fw-bold">
                          {new Date(formData.fecha_inicio_plan).toLocaleDateString('es-ES')}
                        </div>
                        <small className="text-muted">
                          Finaliza: {new Date(
                            new Date(formData.fecha_inicio_plan).getTime() + 
                            (planSeleccionado.duracion_semanas * 7 * 24 * 60 * 60 * 1000)
                          ).toLocaleDateString('es-ES')}
                        </small>
                      </div>
                    )}

                    <hr />

                    <div className="mb-3">
                      <small className="text-muted">Precio total estimado</small>
                      <div className="fw-bold text-success fs-4">
                        {calculandoPrecio ? (
                          <span className="precio-calculando">Calculando...</span>
                        ) : precioCalculado ? (
                          `$${precioCalculado.precio_total?.toLocaleString()}`
                        ) : planSeleccionado.precio_total ? (
                          `$${planSeleccionado.precio_total.toLocaleString()}`
                        ) : (
                          'Calcular precio'
                        )}
                      </div>
                    </div>

                    {precioCalculado?.detalle_precios && (
                      <div className="mt-3">
                        <small className="text-muted">Detalle:</small>
                        {precioCalculado.detalle_precios.map((detalle, index) => (
                          <div key={index} className="d-flex justify-content-between small">
                            <span>{detalle.producto_nombre}</span>
                            <span>${detalle.subtotal?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted">
                    <FaInfoCircle className="mb-2" style={{ fontSize: '2rem' }} />
                    <p>Selecciona un plan para ver el resumen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="card mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/cotizaciones')}
              >
                <FaTimes className="me-2" />
                Cancelar
              </button>
              
              <div className="d-flex gap-2">
                {modoEdicion && (
                  <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={verificarDisponibilidadStock}
                    disabled={verificandoStock || loading}
                  >
                    <FaExclamationTriangle className="me-2" />
                    {verificandoStock ? 'Verificando...' : 'Verificar Stock'}
                  </button>
                )}
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <FaSave className="me-2" />
                  {modoEdicion ? 'Actualizar Cotización' : 'Crear Cotización'}
                </button>
              </div>
            </div>
            
            {/* Mostrar resultado de verificación de stock */}
            {disponibilidadStock && (
              <div className="mt-3">
                <div className={`alert ${disponibilidadStock.disponible ? 'alert-success' : 'alert-warning'}`}>
                  <h6 className="alert-heading">
                    <FaExclamationTriangle className="me-2" />
                    Verificación de Stock
                  </h6>
                  {disponibilidadStock.disponible ? (
                    <p className="mb-0">✅ Stock disponible para todos los productos del plan</p>
                  ) : (
                    <div>
                      <p className="mb-2">⚠️ Hay productos con stock insuficiente:</p>
                      <ul className="mb-0">
                        {disponibilidadStock.detalles?.filter(d => !d.disponible).map((detalle, index) => (
                          <li key={index}>
                            <strong>{detalle.producto}</strong>: 
                            Necesario: {detalle.cantidad_necesaria}, 
                            Disponible: {detalle.stock_disponible}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CotizacionForm;
