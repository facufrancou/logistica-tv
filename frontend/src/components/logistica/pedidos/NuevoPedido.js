import React, { useEffect, useState } from "react";
import {
  getClientes,
  getProductos,
  crearPedido,
  getProveedores,
} from "../../../services/api";

function NuevoPedido({ onPedidoCreado }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
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
        if (onPedidoCreado) onPedidoCreado();
      }
    });
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-dark mb-0">
          <i className="fas fa-plus-circle me-2"></i>
          Nuevo Pedido
        </h2>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <a href="/" className="text-decoration-none">Dashboard</a>
            </li>
            <li className="breadcrumb-item">
              <a href="/pedidos" className="text-decoration-none">Logística</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Nuevo Pedido
            </li>
          </ol>
        </nav>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white">
          <h5 className="card-title mb-0">
            <i className="fas fa-shopping-cart me-2"></i>
            Información del Pedido
          </h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Cliente</label>
              <select
                className="form-select"
                value={form.id_cliente}
                onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Seguimiento</label>
              <input
                className="form-control"
                type="text"
                placeholder="Ingrese seguimiento distribución"
                value={form.seguimiento_dist}
                onChange={(e) =>
                  setForm({ ...form, seguimiento_dist: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Próximo pedido</label>
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
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            <i className="fas fa-box me-2"></i>
            Productos del Pedido
          </h5>
          <button
            className="btn btn-light btn-sm"
            onClick={() => setModalOpen(true)}
          >
            <i className="fas fa-plus me-1"></i>
            Agregar Producto
          </button>
        </div>
        <div className="card-body">
          {form.productos.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-box-open fa-3x mb-3"></i>
              <p>No hay productos agregados al pedido</p>
              <button
                className="btn btn-dark"
                onClick={() => setModalOpen(true)}
              >
                <i className="fas fa-plus me-1"></i>
                Agregar Primer Producto
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Producto</th>
                    <th className="text-center">Cantidad</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {form.productos.map((p, i) => {
                    const prod = productos.find(
                      (prod) => prod.id_producto === p.id_producto
                    );
                    return (
                      <tr key={i}>
                        <td>
                          <div>
                            <strong>{prod?.nombre}</strong>
                            <br />
                            <small className="text-muted">{prod?.descripcion}</small>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-dark fs-6">{p.cantidad}</span>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleEliminarProducto(p.id_producto)}
                            title="Eliminar producto"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {form.productos.length > 0 && (
        <div className="d-flex justify-content-end mt-4 gap-2">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => setForm({
              id_cliente: "",
              seguimiento_dist: "",
              fecha_proximo_pedido: "",
              productos: [],
            })}
          >
            <i className="fas fa-undo me-1"></i>
            Limpiar
          </button>
          <button 
            className="btn btn-dark btn-lg" 
            onClick={handleSubmit}
            disabled={!form.id_cliente || form.productos.length === 0}
          >
            <i className="fas fa-save me-2"></i>
            Crear Pedido
          </button>
        </div>
      )}

      {/* Modal de selección de productos */}
      {modalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "#00000099" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-search me-2"></i>
                  Agregar Producto
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Buscar producto</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre o descripción"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                
                <div
                  className="border rounded p-2 mb-3"
                  style={{ maxHeight: 300, overflowY: "auto" }}
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
                    <div key={id_proveedor} className="mb-3">
                      <div className="fw-bold text-dark border-bottom pb-1 mb-2">
                        <i className="fas fa-building me-1"></i>
                        {lista[0]?.proveedor_nombre || "Sin Marca"}
                      </div>
                      {lista.map((p) => (
                        <div
                          key={p.id_producto}
                          className={`p-2 border rounded mb-1 cursor-pointer ${
                            productoSeleccionado?.id_producto === p.id_producto
                              ? "bg-dark text-white"
                              : "bg-light"
                          }`}
                          onClick={() => setProductoSeleccionado(p)}
                          style={{ cursor: "pointer" }}
                        >
                          <strong>{p.nombre}</strong>
                          <br />
                          <small>{p.descripcion}</small>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Producto Seleccionado</label>
                    <input
                      type="text"
                      className="form-control"
                      value={productoSeleccionado?.nombre || ""}
                      disabled
                      placeholder="Seleccione un producto"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Cantidad</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={cantidadSeleccionada}
                      onChange={e => setCantidadSeleccionada(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ingrese cantidad"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-dark"
                  onClick={handleAgregarProducto}
                  disabled={!productoSeleccionado || !cantidadSeleccionada}
                >
                  <i className="fas fa-plus me-1"></i>
                  Agregar Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NuevoPedido;