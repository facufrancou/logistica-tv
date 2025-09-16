import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { FaEdit, FaArrowLeft, FaSyringe, FaCalculator, FaDownload, FaPrint, FaClipboardList } from 'react-icons/fa';

const PlanVacunalDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { obtenerPlan, calcularPrecioPlan, loading } = usePlanesVacunales();
  
  const [plan, setPlan] = useState(null);
  const [precio, setPrecio] = useState(null);
  const [calculandoPrecio, setCalculandoPrecio] = useState(false);

  useEffect(() => {
    cargarPlan();
  }, [id]);

  const cargarPlan = async () => {
    try {
      const planData = await obtenerPlan(id);
      if (planData) {
        setPlan(planData);
      } else {
        navigate('/planes-vacunales');
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
      navigate('/planes-vacunales');
    }
  };

  const calcularPrecio = async () => {
    try {
      setCalculandoPrecio(true);
      const resultado = await calcularPrecioPlan(id);
      if (resultado) {
        setPrecio(resultado);
      }
    } catch (error) {
      console.error('Error calculando precio:', error);
    } finally {
      setCalculandoPrecio(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'activo': { class: 'badge bg-success', text: 'Activo' },
      'inactivo': { class: 'badge bg-secondary', text: 'Inactivo' },
      'borrador': { class: 'badge bg-warning text-dark', text: 'Borrador' }
    };
    return badges[estado] || { class: 'badge bg-secondary', text: estado };
  };

  const calcularTotalDosis = (producto) => {
    if (!producto.semana_fin) {
      return producto.dosis_por_semana * (plan.duracion_semanas - producto.semana_inicio + 1);
    }
    return producto.dosis_por_semana * (producto.semana_fin - producto.semana_inicio + 1);
  };

  const generarCalendario = () => {
    const calendario = [];
    for (let semana = 1; semana <= plan.duracion_semanas; semana++) {
      const productosEnSemana = plan.productos_plan?.filter(producto => {
        const inicio = producto.semana_inicio;
        const fin = producto.semana_fin || plan.duracion_semanas;
        return semana >= inicio && semana <= fin;
      }) || [];

      calendario.push({
        semana,
        productos: productosEnSemana
      });
    }
    return calendario;
  };

  if (loading || !plan) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  const estadoBadge = getEstadoBadge(plan.estado);
  const calendario = generarCalendario();

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button 
                className="btn btn-outline-secondary me-3"
                onClick={() => navigate('/planes-vacunales')}
              >
                <FaArrowLeft />
              </button>
              <div>
                <div className="d-flex align-items-center mb-1">
                  <FaSyringe className="me-2 text-primary" />
                  <h3 className="mb-0">{plan.nombre}</h3>
                  <span className={estadoBadge.class + ' ms-3'}>
                    {estadoBadge.text}
                  </span>
                </div>
                {plan.descripcion && (
                  <p className="text-muted mb-0">{plan.descripcion}</p>
                )}
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary">
                <FaPrint className="me-2" />
                Imprimir
              </button>
              <button className="btn btn-outline-success">
                <FaDownload className="me-2" />
                Exportar
              </button>
              <Link 
                to={`/planes-vacunales/${id}/editar`} 
                className="btn btn-warning"
              >
                <FaEdit className="me-2" />
                Editar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Información Principal */}
        <div className="col-lg-8">
          {/* Resumen del Plan */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Información del Plan</h5>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-3">
                  <div className="text-center p-3 bg-light rounded">
                    <h4 className="text-primary mb-1">{plan.duracion_semanas}</h4>
                    <small className="text-muted">Semanas de duración</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-light rounded">
                    <h4 className="text-success mb-1">
                      {plan.productos_plan?.length || 0}
                    </h4>
                    <small className="text-muted">Productos incluidos</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-light rounded">
                    <h4 className="text-info mb-1">
                      {plan.productos_plan?.reduce((total, producto) => 
                        total + calcularTotalDosis(producto), 0) || 0}
                    </h4>
                    <small className="text-muted">Total de dosis</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center p-3 bg-light rounded">
                    {precio ? (
                      <>
                        <h4 className="text-warning mb-1">
                          ${precio.precio_total?.toLocaleString()}
                        </h4>
                        <small className="text-muted">Precio total</small>
                      </>
                    ) : plan.precio_total ? (
                      <>
                        <h4 className="text-warning mb-1">
                          ${plan.precio_total.toLocaleString()}
                        </h4>
                        <small className="text-muted">Precio total</small>
                      </>
                    ) : (
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={calcularPrecio}
                        disabled={calculandoPrecio}
                      >
                        <FaCalculator className="me-1" />
                        {calculandoPrecio ? 'Calculando...' : 'Calcular'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {plan.observaciones && (
                <div className="mt-4">
                  <h6>Observaciones:</h6>
                  <p className="text-muted">{plan.observaciones}</p>
                </div>
              )}
            </div>
          </div>

          {/* Productos del Plan */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Productos del Plan</h5>
            </div>
            <div className="card-body">
              {plan.productos_plan && plan.productos_plan.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Dosis/Semana</th>
                        <th>Período</th>
                        <th>Total Dosis</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.productos_plan.map((producto, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{producto.producto?.nombre}</strong>
                            {producto.producto?.descripcion && (
                              <small className="d-block text-muted">
                                {producto.producto.descripcion}
                              </small>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {producto.dosis_por_semana} dosis
                            </span>
                          </td>
                          <td>
                            Semana {producto.semana_inicio}
                            {producto.semana_fin ? ` - ${producto.semana_fin}` : ' - final'}
                          </td>
                          <td>
                            <span className="badge bg-success">
                              {calcularTotalDosis(producto)} dosis
                            </span>
                          </td>
                          <td>
                            {producto.observaciones || (
                              <span className="text-muted">Sin observaciones</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaSyringe className="text-muted mb-3" style={{ fontSize: '2rem' }} />
                  <p className="text-muted">No hay productos configurados en este plan</p>
                </div>
              )}
            </div>
          </div>

          {/* Calendario de Vacunación */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Calendario de Vacunación</h5>
              <span className="badge bg-info">
                {plan.duracion_semanas} semanas
              </span>
            </div>
            <div className="card-body">
              {calendario.length > 0 ? (
                <div className="row g-2">
                  {calendario.map((item) => (
                    <div key={item.semana} className="col-md-2">
                      <div className={`card h-100 ${item.productos.length > 0 ? 'border-primary' : 'border-light'}`}>
                        <div className="card-body p-2 text-center">
                          <div className="fw-bold text-primary mb-1">
                            Semana {item.semana}
                          </div>
                          {item.productos.length > 0 ? (
                            <div>
                              {item.productos.map((producto, idx) => (
                                <div key={idx} className="mb-1">
                                  <small className="d-block text-truncate" title={producto.producto?.nombre}>
                                    {producto.producto?.nombre}
                                  </small>
                                  <span className="badge bg-primary badge-sm">
                                    {producto.dosis_por_semana}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <small className="text-muted">Sin vacunas</small>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaClipboardList className="text-muted mb-3" style={{ fontSize: '2rem' }} />
                  <p className="text-muted">No se puede generar el calendario sin productos</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel Lateral */}
        <div className="col-lg-4">
          {/* Información Adicional */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Información Adicional</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted d-block">Lista de Precios</small>
                <div className="fw-bold">
                  {plan.lista_precio ? (
                    <span className="badge bg-info">
                      {plan.lista_precio.tipo} - {plan.lista_precio.nombre}
                    </span>
                  ) : (
                    <span className="text-muted">Sin asignar</span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Fecha de Creación</small>
                <div className="fw-bold">
                  {new Date(plan.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Última Actualización</small>
                <div className="fw-bold">
                  {new Date(plan.updated_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de Precios */}
          {precio && precio.detalle_precios && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Detalle de Precios</h5>
              </div>
              <div className="card-body">
                {precio.detalle_precios.map((detalle, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <small className="text-muted d-block">
                        {detalle.producto_nombre}
                      </small>
                      <small>
                        {detalle.cantidad} × ${detalle.precio_unitario}
                      </small>
                    </div>
                    <div className="fw-bold">
                      ${detalle.subtotal.toLocaleString()}
                    </div>
                  </div>
                ))}
                <hr />
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Total:</strong>
                  <strong className="text-success">
                    ${precio.precio_total.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Acciones Rápidas */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Acciones</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link 
                  to={`/cotizaciones/nueva?plan=${id}`} 
                  className="btn btn-success"
                >
                  <FaClipboardList className="me-2" />
                  Crear Cotización
                </Link>
                <Link 
                  to={`/planes-vacunales/${id}/editar`} 
                  className="btn btn-warning"
                >
                  <FaEdit className="me-2" />
                  Editar Plan
                </Link>
                <button 
                  className="btn btn-outline-primary"
                  onClick={calcularPrecio}
                  disabled={calculandoPrecio}
                >
                  <FaCalculator className="me-2" />
                  {calculandoPrecio ? 'Calculando...' : 'Recalcular Precio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanVacunalDetalle;
