import React, { useState, useEffect } from 'react';
import { usePlanesVacunales } from '../../context/PlanesVacunalesContext';
import { FaPlus, FaEdit, FaTrash, FaEye, FaClipboardList } from 'react-icons/fa';

const ListasPreciosList = () => {
  const { 
    listasPrecios, 
    loading, 
    cargarListasPrecios, 
    crearListaPrecio, 
    actualizarListaPrecio 
  } = usePlanesVacunales();

  const [showModal, setShowModal] = useState(false);
  const [editingLista, setEditingLista] = useState(null);
  const [formData, setFormData] = useState({
    tipo: '',
    nombre: '',
    descripcion: '',
    activa: true
  });

  useEffect(() => {
    cargarListasPrecios();
  }, []);

  const handleOpenModal = (lista = null) => {
    if (lista) {
      setEditingLista(lista);
      setFormData({
        tipo: lista.tipo,
        nombre: lista.nombre,
        descripcion: lista.descripcion || '',
        activa: lista.activa
      });
    } else {
      setEditingLista(null);
      setFormData({
        tipo: '',
        nombre: '',
        descripcion: '',
        activa: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLista(null);
    setFormData({
      tipo: '',
      nombre: '',
      descripcion: '',
      activa: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingLista) {
        await actualizarListaPrecio(editingLista.id_lista, formData);
      } else {
        await crearListaPrecio(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error guardando lista de precios:', error);
    }
  };

  const getActiveBadge = (activa) => {
    return activa ? 
      <span className="badge bg-success">Activa</span> : 
      <span className="badge bg-secondary">Inactiva</span>;
  };

  const getTipoBadge = (tipo) => {
    const colors = {
      'L15': 'bg-primary',
      'L18': 'bg-info',
      'L20': 'bg-success',
      'L25': 'bg-warning text-dark',
      'L30': 'bg-danger'
    };
    return (
      <span className={`badge ${colors[tipo] || 'bg-secondary'}`}>
        {tipo}
      </span>
    );
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
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaClipboardList className="me-2 text-primary" />
            <h3 className="mb-0">Listas de Precios</h3>
          </div>
          <button 
            className="btn btn-primary d-flex align-items-center"
            onClick={() => handleOpenModal()}
          >
            <FaPlus className="me-2" />
            Nueva Lista
          </button>
        </div>
      </div>

      {/* Lista de Listas de Precios */}
      <div className="card">
        <div className="card-body">
          {listasPrecios.length === 0 ? (
            <div className="text-center py-5">
              <FaClipboardList className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay listas de precios</h5>
              <p className="text-muted">Crea tu primera lista de precios para comenzar</p>
              <button 
                className="btn btn-primary"
                onClick={() => handleOpenModal()}
              >
                <FaPlus className="me-2" />
                Crear Lista
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Tipo</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listasPrecios.map((lista) => (
                    <tr key={lista.id_lista}>
                      <td>
                        {getTipoBadge(lista.tipo)}
                      </td>
                      <td>
                        <strong>{lista.nombre}</strong>
                      </td>
                      <td>
                        {lista.descripcion || (
                          <span className="text-muted">Sin descripción</span>
                        )}
                      </td>
                      <td>
                        {getActiveBadge(lista.activa)}
                      </td>
                      <td>
                        {new Date(lista.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleOpenModal(lista)}
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
          )}
        </div>
      </div>

      {/* Stats */}
      {listasPrecios.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">Total Listas</h6>
                    <h4>{listasPrecios.length}</h4>
                  </div>
                  <FaClipboardList style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">Activas</h6>
                    <h4>{listasPrecios.filter(l => l.activa).length}</h4>
                  </div>
                  <FaClipboardList style={{ fontSize: '2rem', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">Tipos Disponibles</h6>
                <div className="d-flex flex-wrap gap-2">
                  {['L15', 'L18', 'L20', 'L25', 'L30'].map(tipo => {
                    const existe = listasPrecios.some(l => l.tipo === tipo);
                    return (
                      <span 
                        key={tipo} 
                        className={`badge ${existe ? 'bg-success' : 'bg-light text-dark border'}`}
                      >
                        {tipo} {existe ? '✓' : '○'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingLista ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tipo *</label>
                    <select
                      className="form-select"
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleInputChange}
                      required
                      disabled={editingLista} // No permitir cambiar tipo al editar
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="L15">L15</option>
                      <option value="L18">L18</option>
                      <option value="L20">L20</option>
                      <option value="L25">L25</option>
                      <option value="L30">L30</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Lista Estándar 2025"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control"
                      name="descripcion"
                      rows="3"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      placeholder="Descripción de la lista de precios..."
                    />
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="activa"
                      id="activa"
                      checked={formData.activa}
                      onChange={handleInputChange}
                    />
                    <label className="form-check-label" htmlFor="activa">
                      Lista activa
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {editingLista ? 'Actualizar' : 'Crear'} Lista
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListasPreciosList;
