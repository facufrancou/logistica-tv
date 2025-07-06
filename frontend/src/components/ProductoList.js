import React, { useEffect, useState } from "react";
import {
  getProductos,
  crearProducto,
  actualizarProducto,
  getProveedores,
} from "../services/api";

function ProductoList() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [pagina, setPagina] = useState(0);
  const porPagina = 15;
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [productoActivo, setProductoActivo] = useState(null);
  const [modo, setModo] = useState("ver");

  useEffect(() => {
    cargarProductos();
    getProveedores().then(setProveedores);
  }, []);

  const cargarProductos = () => {
    getProductos().then(setProductos);
  };

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const productosMostrados = productosFiltrados.slice(
    pagina * porPagina,
    (pagina + 1) * porPagina
  );
  const totalPaginas = Math.ceil(productosFiltrados.length / porPagina);

  const abrirModal = (producto, modoAccion) => {
    setProductoActivo(
      producto || {
        nombre: "",
        precio_unitario: "",
        descripcion: "",
        id_proveedor: "",
      }
    );
    setModo(modoAccion);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setProductoActivo(null);
    setModalOpen(false);
  };

  const handleGuardar = async () => {
  const producto = {
    ...productoActivo,
    precio_unitario:
      productoActivo.precio_unitario === undefined ||
      productoActivo.precio_unitario === ""
        ? 0
        : productoActivo.precio_unitario,
    descripcion: productoActivo.descripcion || "",
    id_proveedor:
      productoActivo.id_proveedor === "" ? null : productoActivo.id_proveedor,
  };

  if (modo === "nuevo") {
    await crearProducto(producto);
  } else if (modo === "editar") {
    await actualizarProducto(producto.id_producto, producto);
  }

  cerrarModal();
  cargarProductos();
};


  const handleInput = (campo, valor) => {
    setProductoActivo({ ...productoActivo, [campo]: valor });
  };

  const obtenerNombreProveedor = (id) => {
    const p = proveedores.find((prov) => prov.id_proveedor === id);
    return p?.nombre || "—";
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Productos</h2>
        <button
          className="btn btn-primary"
          onClick={() => abrirModal(null, "nuevo")}
        >
          + Agregar Producto
        </button>
      </div>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="Buscar por nombre o descripción"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Descripción</th>
            <th>Marca</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productosMostrados.map((p) => (
            <tr key={p.id_producto}>
              <td>{p.id_producto}</td>
              <td>{p.nombre}</td>
              <td>${Number(p.precio_unitario).toFixed(2)}</td>
              <td>{p.descripcion}</td>
              <td>{obtenerNombreProveedor(p.id_proveedor)}</td>
              <td>
                <button
                  className="btn btn-sm btn-secondary me-2"
                  onClick={() => abrirModal(p, "ver")}
                >
                  Ver
                </button>
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => abrirModal(p, "editar")}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="d-flex justify-content-between">
        <button
          className="btn btn-outline-primary"
          disabled={pagina === 0}
          onClick={() => setPagina((p) => p - 1)}
        >
          Anterior
        </button>
        <span>
          Página {pagina + 1} de {totalPaginas}
        </span>
        <button
          className="btn btn-outline-primary"
          disabled={pagina + 1 >= totalPaginas}
          onClick={() => setPagina((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>

      {modalOpen && productoActivo && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "#00000099" }}
          tabIndex="-1"
        >
          <div className="modal-dialog" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modo === "ver" && "Ver Producto"}
                  {modo === "editar" && "Editar Producto"}
                  {modo === "nuevo" && "Nuevo Producto"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  value={productoActivo.nombre}
                  onChange={(e) => handleInput("nombre", e.target.value)}
                  disabled={modo === "ver"}
                />

                <label className="form-label">Precio Unitario</label>
                <input
                  type="number"
                  className="form-control mb-2"
                  value={productoActivo.precio_unitario}
                  onChange={(e) =>
                    handleInput("precio_unitario", parseFloat(e.target.value))
                  }
                  disabled={modo === "ver"}
                />

                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  value={productoActivo.descripcion}
                  onChange={(e) => handleInput("descripcion", e.target.value)}
                  disabled={modo === "ver"}
                />

                <label className="form-label">Marca / Proveedor</label>
                <select
                  className="form-select"
                  value={productoActivo.id_proveedor || ""}
                  onChange={(e) =>
                    handleInput(
                      "id_proveedor",
                      e.target.value === "" ? null : parseInt(e.target.value)
                    )
                  }
                  disabled={modo === "ver"}
                >
                  <option value="">Seleccione</option>
                  {proveedores
                    .filter((p) => p.activo)
                    .map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cerrarModal}>
                  Cerrar
                </button>
                {modo !== "ver" && (
                  <button className="btn btn-primary" onClick={handleGuardar}>
                    Guardar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductoList;
