import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function PedidoAcceso() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [cliente, setCliente] = useState(null);
  const [productos, setProductos] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:3000/pedidos/token/${token}`)
      .then(res => res.ok ? res.json() : Promise.reject('Token inválido o expirado'))
      .then(data => {
        setCliente(data.cliente);
        setProductos(data.productos);
      })
      .catch(err => setError(err));
  }, [token]);

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadSeleccionada < 1) return;

    const id_producto = parseInt(productoSeleccionado);
    const yaExiste = pedido.find(p => p.id_producto === id_producto);
    if (yaExiste) {
      setPedido(pedido.map(p =>
        p.id_producto === id_producto ? { ...p, cantidad: p.cantidad + cantidadSeleccionada } : p
      ));
    } else {
      setPedido([...pedido, { id_producto, cantidad: cantidadSeleccionada }]);
    }

    setProductoSeleccionado('');
    setCantidadSeleccionada(1);
    setModalOpen(false);
  };

  const eliminarProducto = (id_producto) => {
    setPedido(pedido.filter(p => p.id_producto !== id_producto));
  };

  const enviarPedido = () => {
    fetch('http://localhost:3000/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_cliente: cliente.id_cliente,
        id_usuario: null,
        seguimiento_dist: '',
        productos: pedido,
        token
      })
    }).then(res => {
      if (res.ok) {
        alert('Pedido enviado correctamente');
        setPedido([]);
      } else {
        alert('Error al enviar pedido');
      }
    });
  };

  const obtenerNombreProducto = (id) => {
    const prod = productos.find(p => p.id_producto === id);
    return prod ? prod.nombre : '';
  };

  const obtenerPrecioProducto = (id) => {
    const prod = productos.find(p => p.id_producto === id);
    return prod ? prod.precio_unitario : 0;
  };

  if (error) return <div className="container mt-5"><h4>{error}</h4></div>;
  if (!cliente) return <div className="container mt-5"><h4>Cargando...</h4></div>;

  return (
    <div className="container mt-4">
      <h3 className="mb-4 text-center">Formulario de Pedido</h3>

      <div className="mb-3">
        <label className="form-label">CUIT</label>
        <input type="text" className="form-control" value={cliente.cuit} disabled />
      </div>

      <div className="mb-3">
        <label className="form-label">Nombre</label>
        <input type="text" className="form-control" value={cliente.nombre} disabled />
      </div>

      <h5>Productos</h5>
      <button className="btn btn-secondary mb-3" onClick={() => setModalOpen(true)}>
        + Agregar Producto
      </button>

      {pedido.length === 0 && <p>No hay productos agregados.</p>}

      {pedido.length > 0 && (
        <ul className="list-group mb-4">
          {pedido.map((p, i) => (
            <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
              {obtenerNombreProducto(p.id_producto)} (x{p.cantidad})
              <span>${(obtenerPrecioProducto(p.id_producto) * p.cantidad).toFixed(2)}</span>
              <button className="btn btn-sm btn-danger ms-2" onClick={() => eliminarProducto(p.id_producto)}>Eliminar</button>
            </li>
          ))}
        </ul>
      )}

      <button className="btn btn-success w-100" onClick={enviarPedido}>
        Enviar Pedido
      </button>

      {/* Modal en React */}
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
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={cantidadSeleccionada}
                  onChange={e => setCantidadSeleccionada(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={agregarProducto}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PedidoAcceso;
