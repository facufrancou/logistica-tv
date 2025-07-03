import React, { useEffect, useState } from 'react';
import { getClientes, getProductos, crearPedido } from '../services/api';

function PedidoForm({ onPedidoCreado }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    id_cliente: '',
    seguimiento_dist: '',
    productos: []
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);

  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
  }, []);

  const handleAgregarProducto = () => {
    if (!productoSeleccionado || cantidadSeleccionada < 1) return;

    const yaExiste = form.productos.find(p => p.id_producto === parseInt(productoSeleccionado));
    if (yaExiste) {
      setForm(prev => ({
        ...prev,
        productos: prev.productos.map(p =>
          p.id_producto === parseInt(productoSeleccionado)
            ? { ...p, cantidad: cantidadSeleccionada }
            : p
        )
      }));
    } else {
      setForm(prev => ({
        ...prev,
        productos: [...prev.productos, {
          id_producto: parseInt(productoSeleccionado),
          cantidad: cantidadSeleccionada
        }]
      }));
    }

    setProductoSeleccionado('');
    setCantidadSeleccionada(1);
    setModalOpen(false);
  };

  const handleEliminarProducto = (id_producto) => {
    setForm(prev => ({
      ...prev,
      productos: prev.productos.filter(p => p.id_producto !== id_producto)
    }));
  };

  const handleSubmit = () => {
    crearPedido({ ...form, id_usuario: 1 }).then(res => {
      if (res) {
        alert('Pedido creado correctamente');
        setForm({ id_cliente: '', seguimiento_dist: '', productos: [] });
        onPedidoCreado();
      }
    });
  };

  return (
    <div>
      <h2>Nuevo Pedido</h2>
      <div className="row mb-3">
        <div className="col">
          <label className="form-label">Cliente</label>
          <select className="form-select" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })}>
            <option value="">Seleccione</option>
            {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="col">
          <label className="form-label">Seguimiento</label>
          <input className="form-control" type="text" value={form.seguimiento_dist} onChange={e => setForm({ ...form, seguimiento_dist: e.target.value })}/>
        </div>
      </div>

      <h5>Productos agregados</h5>
      <ul className="list-group mb-3">
        {form.productos.map((p, i) => {
          const prod = productos.find(prod => prod.id_producto === p.id_producto);
          return (
            <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
              {prod?.nombre} (x{p.cantidad})
              <button className="btn btn-sm btn-danger" onClick={() => handleEliminarProducto(p.id_producto)}>❌</button>
            </li>
          );
        })}
      </ul>

      <button className="btn btn-secondary mb-3" onClick={() => setModalOpen(true)}>
        + Agregar Producto
      </button>

      <br />
      <button className="btn btn-primary" onClick={handleSubmit}>Crear Pedido</button>

      {/* Modal */}
      {modalOpen && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: '#00000099' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agregar Producto</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Producto</label>
                <select className="form-select mb-2" value={productoSeleccionado} onChange={e => setProductoSeleccionado(e.target.value)}>
                  <option value="">Seleccione un producto</option>
                  {productos.map(p => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.nombre} (${p.precio_unitario})
                    </option>
                  ))}
                </select>

                <label className="form-label">Cantidad</label>
                <input type="number" className="form-control" min="1" value={cantidadSeleccionada}
                       onChange={e => setCantidadSeleccionada(parseInt(e.target.value) || 1)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAgregarProducto}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PedidoForm;
