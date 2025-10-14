import React, { useEffect, useState, useContext } from "react";
import {
  getProductos,
  crearProducto,
  actualizarProducto,
  getProveedores,
  getTiposProducto,
} from "../../../services/api";
import { AuthContext } from "../../../context/AuthContext";

function ProductoList() {
  const { usuario } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [tiposProducto, setTiposProducto] = useState([]);

  const [pagina, setPagina] = useState(0);
  const porPagina = 15;
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [productoActivo, setProductoActivo] = useState(null);
  const [modo, setModo] = useState("ver");

  useEffect(() => {
    cargarProductos();
    getProveedores().then(setProveedores);
    getTiposProducto().then(setTiposProducto);
  }, []);

  const cargarProductos = () => {
    getProductos().then(setProductos);
  };

  const productosFiltrados = productos.filter(
    (p) => {
      const coincideBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
      
      const coincideTipo = !filtroTipo || p.tipo_producto === filtroTipo;
      
      return coincideBusqueda && coincideTipo;
    }
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
        descripcion: "",
        id_proveedor: "",
        tipo_producto: "otros",
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

  const getTipoLabel = (tipo) => {
    const tipoObj = tiposProducto.find(t => t.value === tipo);
    return tipoObj ? `${tipoObj.icon} ${tipoObj.label}` : tipo;
  };

  const getTipoBadgeClass = (tipo) => {
    const clases = {
      'vacuna': 'bg-success',
      'medicamento': 'bg-primary',
      'suplemento': 'bg-info',
      'insecticida': 'bg-warning',
      'desinfectante': 'bg-secondary',
      'otros': 'bg-light text-dark'
    };
    return clases[tipo] || 'bg-light text-dark';
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="text-dark">Productos</h2>
        {usuario?.rol_id !== 1 && (
          <button
            className="btn btn-dark"
            onClick={() => abrirModal(null, "nuevo")}
          >
            + Agregar Producto
          </button>
        )}
      </div>

      <div className="row mb-3">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o descripción"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select
            className="form-select"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {tiposProducto.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.icon} {tipo.label}
              </option>
            ))}
          </select>
        </div>
      </div>

  <table className="table table-mobile table-responsive-stack">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Marca</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productosMostrados.map((p) => (
            <tr key={p.id_producto}>
      <td data-label="ID">{p.id_producto}</td>
      <td data-label="Nombre">{p.nombre}</td>
      <td data-label="Tipo">
        <span className={`badge ${getTipoBadgeClass(p.tipo_producto)}`}>
          {getTipoLabel(p.tipo_producto)}
        </span>
      </td>
      <td data-label="Descripción">{p.descripcion}</td>
      <td data-label="Marca">{obtenerNombreProveedor(p.id_proveedor)}</td>
              <td>
                <button
                  className="btn btn-sm btn-secondary me-2"
                  onClick={() => abrirModal(p, "ver")}
                >
                  Ver
                </button>
                {usuario?.rol_id !== 1 && (
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => abrirModal(p, "editar")}
                  >
                    Editar
                  </button>
                )}
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
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '800px', width: '90%' }}>
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

                {/* Campo de precio eliminado */}

                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  value={productoActivo.descripcion}
                  onChange={(e) => handleInput("descripcion", e.target.value)}
                  disabled={modo === "ver"}
                />

                <label className="form-label">Tipo de Producto</label>
                <select
                  className="form-select mb-2"
                  value={productoActivo.tipo_producto || "otros"}
                  onChange={(e) => handleInput("tipo_producto", e.target.value)}
                  disabled={modo === "ver"}
                >
                  {tiposProducto.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.icon} {tipo.label}
                    </option>
                  ))}
                </select>

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
                  <button className="btn btn-dark" onClick={handleGuardar}>
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
