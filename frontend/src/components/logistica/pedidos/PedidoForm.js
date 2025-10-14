import React, { useEffect, useState } from "react";
import {
  getClientes,
  getProductos,
  crearPedido,
  getProveedores,
  getTiposProducto,
} from "../../../services/api";

function PedidoForm({ onPedidoCreado }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [tiposProducto, setTiposProducto] = useState([]);
  const [form, setForm] = useState({
    id_cliente: "",
    seguimiento_dist: "",
    fecha_proximo_pedido: "",
    productos: [],
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
    getProveedores().then(setProveedores);
    getTiposProducto().then(setTiposProducto);
  }, []);


  const agruparPorProveedor = (lista) => {
    const agrupados = {};
    lista.forEach((p) => {
      const key = p.proveedor_nombre || "Sin Marca";
      if (!agrupados[key]) agrupados[key] = [];
      agrupados[key].push(p);
    });
    return agrupados;
  };

  const getTipoLabel = (tipo) => {
    const tipoObj = tiposProducto.find(t => t.value === tipo);
    return tipoObj ? `${tipoObj.icon}` : '';
  };

  const handleAgregarProducto = () => {
    if (!productoSeleccionado || !cantidadSeleccionada || cantidadSeleccionada < 1) return;

    const yaExiste = form.productos.find(
      (p) => p.id_producto === productoSeleccionado.id_producto
    );
    if (yaExiste) {
      setForm((prev) => ({
        ...prev,
        productos: prev.productos.map((p) =>
          p.id_producto === productoSeleccionado.id_producto
            ? { ...p, cantidad: Number(cantidadSeleccionada) }
            : p
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        productos: [
          ...prev.productos,
          {
            id_producto: productoSeleccionado.id_producto,
            cantidad: Number(cantidadSeleccionada),
          },
        ],
      }));
    }

    setProductoSeleccionado(null);
    setBusqueda("");
    setCantidadSeleccionada("");
    setModalOpen(false);
  };

  const handleEliminarProducto = (id_producto) => {
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((p) => p.id_producto !== id_producto),
    }));
  };

  const handleSubmit = () => {
    crearPedido({ ...form, id_usuario: 2 }).then((res) => {
      if (res) {
        alert("Pedido creado correctamente");
        setForm({
          id_cliente: "",
          seguimiento_dist: "",
          fecha_proximo_pedido: "",
          productos: [],
        });
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
          <select
            className="form-select"
            value={form.id_cliente}
            onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
          >
            <option value="">Seleccione</option>
            {clientes.map((c) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col">
          <label className="form-label">Seguimiento</label>
          <input
            className="form-control"
            type="text"
            value={form.seguimiento_dist}
            onChange={(e) =>
              setForm({ ...form, seguimiento_dist: e.target.value })
            }
          />
        </div>
        <div className="col">
          <label className="form-label">Próximo pedido</label>
          <input
            type="date"
            className="form-control"
            value={form.fecha_proximo_pedido}
            onChange={(e) =>
              setForm({ ...form, fecha_proximo_pedido: e.target.value })
            }
          />
        </div>
      </div>

      <h5>Productos agregados</h5>
      <ul className="list-group mb-3">
        {form.productos.map((p, i) => {
          const prod = productos.find(
            (prod) => prod.id_producto === p.id_producto
          );
          return (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              {prod?.nombre} (x{p.cantidad})
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleEliminarProducto(p.id_producto)}
              >
                ❌
              </button>
            </li>
          );
        })}
      </ul>

      <button
        className="btn btn-secondary mb-3"
        onClick={() => setModalOpen(true)}
      >
        + Agregar Producto
      </button>

      <br />
      <button className="btn btn-primary" onClick={handleSubmit}>
        Crear Pedido
      </button>
      <br />
      <br />

      {/* Modal de selección de productos */}
      {modalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "#00000099" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agregar Producto</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Buscar producto</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Buscar por nombre o descripción"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <div
                  className="list-group mb-3"
                  style={{ maxHeight: 200, overflowY: "auto" }}
                >
                  {Object.entries(
                    agruparPorProveedor(
                      productos.filter(
                        (p) =>
                          p.nombre
                            .toLowerCase()
                            .includes(busqueda.toLowerCase()) ||
                          p.descripcion
                            .toLowerCase()
                            .includes(busqueda.toLowerCase())
                      )
                    )
                  ).map(([id_proveedor, lista]) => (
                    <div key={id_proveedor} className="mb-2">
                      <div className="fw-bold mb-1">
                        {lista[0]?.proveedor_nombre || "Sin Marca"}
                      </div>
                      {lista.map((p) => (
                        <button
                          type="button"
                          key={p.id_producto}
                          className={`list-group-item list-group-item-action ${
                            productoSeleccionado?.id_producto === p.id_producto
                              ? "active"
                              : ""
                          }`}
                          onClick={() => setProductoSeleccionado(p)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span>{p.nombre} - {p.descripcion}</span>
                            <small className="text-muted">{getTipoLabel(p.tipo_producto)}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <label className="form-label">Cantidad</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={cantidadSeleccionada}
                  onChange={e => setCantidadSeleccionada(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAgregarProducto}
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PedidoForm;
