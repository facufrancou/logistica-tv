import React, { useEffect, useState } from 'react';
import {
  getProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor
} from '../services/api';

function ProveedorList() {
  const [proveedores, setProveedores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [proveedorActivo, setProveedorActivo] = useState(null);
  const [modo, setModo] = useState('ver');

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = () => {
    getProveedores().then(setProveedores);
  };

  const abrirModal = (proveedor, modoAccion) => {
    setProveedorActivo(proveedor || { nombre: '', activo: true });
    setModo(modoAccion);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setProveedorActivo(null);
    setModalOpen(false);
  };

  const handleInput = (campo, valor) => {
    setProveedorActivo({ ...proveedorActivo, [campo]: valor });
  };

  const handleGuardar = async () => {
    if (modo === 'nuevo') {
      await crearProveedor(proveedorActivo);
    } else if (modo === 'editar') {
      await actualizarProveedor(proveedorActivo.id_proveedor, proveedorActivo);
    }

    cerrarModal();
    cargarProveedores();
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Seguro que querés desactivar este proveedor?')) {
      await eliminarProveedor(id);
      cargarProveedores();
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Proveedores</h2>
        <button className="btn btn-primary" onClick={() => abrirModal(null, 'nuevo')}>
          + Agregar Proveedor
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Activo</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map(p => (
            <tr key={p.id_proveedor}>
              <td>{p.id_proveedor}</td>
              <td>{p.nombre}</td>
              <td>{p.activo ? 'Sí' : 'No'}</td>
              <td>
                <button className="btn btn-sm btn-secondary me-2" onClick={() => abrirModal(p, 'ver')}>Ver</button>
                <button className="btn btn-sm btn-warning me-2" onClick={() => abrirModal(p, 'editar')}>Editar</button>
                {p.activo && (
                  <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(p.id_proveedor)}>
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && proveedorActivo && (
        <div className="modal d-block" style={{ backgroundColor: '#00000099' }} tabIndex="-1">
          <div className="modal-dialog" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modo === 'ver' && 'Ver Proveedor'}
                  {modo === 'editar' && 'Editar Proveedor'}
                  {modo === 'nuevo' && 'Nuevo Proveedor'}
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModal}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  value={proveedorActivo.nombre}
                  onChange={e => handleInput('nombre', e.target.value)}
                  disabled={modo === 'ver'}
                />

                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={proveedorActivo.activo}
                    onChange={e => handleInput('activo', e.target.checked)}
                    disabled={modo === 'ver'}
                  />
                  <label className="form-check-label">Activo</label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cerrarModal}>Cerrar</button>
                {modo !== 'ver' && (
                  <button className="btn btn-primary" onClick={handleGuardar}>Guardar</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProveedorList;
