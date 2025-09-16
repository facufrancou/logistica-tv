import React, { useEffect, useState, useContext } from 'react';
import {
  getProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor
} from '../../../services/api';
import { AuthContext } from "../../../context/AuthContext";

function ProveedorList() {
  const { usuario } = useContext(AuthContext);
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
        <h2 className="text-dark">Proveedores</h2>
        {usuario?.rol_id !== 1 && (
          <button className="btn btn-dark" onClick={() => abrirModal(null, 'nuevo')}>
            + Agregar Proveedor
          </button>
        )}
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
                {usuario?.rol_id !== 1 && (
                  <button className="btn btn-sm btn-warning me-2" onClick={() => abrirModal(p, 'editar')}>Editar</button>
                )}
                {p.activo && usuario?.rol_id !== 1 && (
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
                  <button className="btn btn-dark text-white" onClick={handleGuardar}>Guardar</button>
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
