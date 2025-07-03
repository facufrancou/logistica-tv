import React, { useEffect, useState } from 'react';
import { getClientes, crearCliente, actualizarCliente } from '../services/api';

function ClienteList() {
  const [clientes, setClientes] = useState([]);
  const [pagina, setPagina] = useState(0);
  const porPagina = 15;
  const [busqueda, setBusqueda] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [modo, setModo] = useState('ver');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = () => {
    getClientes().then(setClientes);
  };

  const clientesFiltrados = clientes.filter(c =>
    c.cuit?.toString().includes(busqueda) ||
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesMostrados = clientesFiltrados.slice(pagina * porPagina, (pagina + 1) * porPagina);
  const totalPaginas = Math.ceil(clientesFiltrados.length / porPagina);

  const abrirModal = (cliente, modoAccion) => {
    setClienteActivo(
      cliente || {
        nombre: '',
        cuit: '',
        direccion: '',
        telefono: '',
        email: '',
      }
    );
    setModo(modoAccion);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setClienteActivo(null);
    setModalOpen(false);
  };

  const handleGuardar = async () => {
    if (modo === 'nuevo') {
      await crearCliente(clienteActivo);
    } else if (modo === 'editar') {
      await actualizarCliente(clienteActivo.id_cliente, clienteActivo);
    }

    cerrarModal();
    cargarClientes();
  };

  const handleInput = (campo, valor) => {
    setClienteActivo({ ...clienteActivo, [campo]: valor });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Clientes</h2>
        <button className="btn btn-primary" onClick={() => abrirModal(null, 'nuevo')}>
          + Agregar Cliente
        </button>
      </div>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="Buscar por nombre o código"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Codigo</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientesMostrados.map(c => (
            <tr key={c.id_cliente}>
              <td>{c.id_cliente}</td>
              <td>{c.nombre}</td>
              <td>{c.cuit}</td>
              <td>{c.direccion}</td>
              <td>{c.telefono}</td>
              <td>{c.email}</td>
              <td>
                <button className="btn btn-sm btn-secondary me-2" onClick={() => abrirModal(c, 'ver')}>Ver</button>
                <button className="btn btn-sm btn-warning" onClick={() => abrirModal(c, 'editar')}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="d-flex justify-content-between">
        <button className="btn btn-outline-primary" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button>
        <span>Página {pagina + 1} de {totalPaginas}</span>
        <button className="btn btn-outline-primary" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
      </div>

      {modalOpen && clienteActivo && (
        <div className="modal d-block" style={{ backgroundColor: '#00000099' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modo === 'ver' && 'Ver Cliente'}
                  {modo === 'editar' && 'Editar Cliente'}
                  {modo === 'nuevo' && 'Nuevo Cliente'}
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModal}></button>
              </div>
              <div className="modal-body">
                {[ 'nombre', 'cuit', 'direccion', 'telefono', 'email' ].map(campo => (
                  <div className="mb-2" key={campo}>
                    <label className="form-label">{campo.charAt(0).toUpperCase() + campo.slice(1)}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={clienteActivo[campo] || ''}
                      onChange={e => handleInput(campo, e.target.value)}
                      disabled={modo === 'ver'}
                    />
                  </div>
                ))}
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

export default ClienteList;
