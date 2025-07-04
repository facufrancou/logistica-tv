import React, { useEffect, useState } from 'react';
import { getPedidosProximos, getPedidoPorId } from '../services/api';

function RecordatoriosView() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [pedidoVista, setPedidoVista] = useState(null);
  const [loading, setLoading] = useState(false);

  const buscarPedidos = () => {
    if (!desde || !hasta) {
      alert('Seleccioná un rango de fechas válido');
      return;
    }

    setLoading(true);
    getPedidosProximos(desde, hasta)
      .then(data => setPedidos(data))
      .finally(() => setLoading(false));
  };

  const handleVer = async (id_pedido) => {
    try {
      const pedido = await getPedidoPorId(id_pedido);
      setPedidoVista(pedido);
    } catch (err) {
      alert('Error al cargar el pedido');
    }
  };

  return (
    <div>
      <h2>Recordatorios de pedidos próximos</h2>

      <div className="row g-2 mb-3">
        <div className="col-auto">
          <label className="form-label">Desde</label>
          <input
            type="date"
            className="form-control"
            value={desde}
            onChange={e => setDesde(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <label className="form-label">Hasta</label>
          <input
            type="date"
            className="form-control"
            value={hasta}
            onChange={e => setHasta(e.target.value)}
          />
        </div>
        <div className="col-auto d-flex align-items-end">
          <button className="btn btn-primary" onClick={buscarPedidos}>
            Buscar
          </button>
        </div>
      </div>

      {loading && <p>Cargando pedidos...</p>}

      {!loading && pedidos.length === 0 && (
        <p>No hay pedidos programados para ese rango de fechas.</p>
      )}

      {!loading && pedidos.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Fecha pedido</th>
              <th>Próximo pedido</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(p => (
              <tr key={p.id_pedido}>
                <td>{p.id_pedido}</td>
                <td>{p.cliente}</td>
                <td>{p.vendedor}</td>
                <td>{p.fecha_pedido}</td>
                <td>{p.fecha_proximo_pedido || '—'}</td>
                <td>{p.estado}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleVer(p.id_pedido)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Vista Pedido */}
      {pedidoVista && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: '#00000099' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Pedido #{pedidoVista.id_pedido}</h5>
                <button type="button" className="btn-close" onClick={() => setPedidoVista(null)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Cliente:</strong> {pedidoVista.id_cliente}</p>
                <p><strong>Seguimiento:</strong> {pedidoVista.seguimiento_dist}</p>
                <p><strong>Fecha:</strong> {new Date(pedidoVista.fecha_pedido).toLocaleString('es-AR')}</p>
                <p><strong>Próximo pedido:</strong> {pedidoVista.fecha_proximo_pedido || '—'}</p>
                <p><strong>Estado:</strong> {pedidoVista.estado}</p>

                <h6>Productos:</h6>
                <ul className="list-group">
                  {pedidoVista.productos.map((p, i) => (
                    <li key={i} className="list-group-item">
                      ID Producto: {p.id_producto} — Cantidad: {p.cantidad}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPedidoVista(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordatoriosView;
