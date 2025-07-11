import React, { useEffect, useState, useContext } from "react";
import {
  getClientes,
  crearCliente,
  actualizarCliente,
  getProductos,
  getProductosHabilitados,
  setProductosHabilitados,
  getProveedores,
} from "../services/api";
import { AuthContext } from "../context/AuthContext";

function ClienteList() {
  const { usuario } = useContext(AuthContext);
  const [clientes, setClientes] = useState([]);
  const [pagina, setPagina] = useState(0);
  const porPagina = 15;
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [modo, setModo] = useState("ver");

  const [productos, setProductos] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");

  const [linkGenerado, setLinkGenerado] = useState("");
  const [mostrarModalLink, setMostrarModalLink] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [clienteLinkGenerado, setClienteLinkGenerado] = useState(null);

  useEffect(() => {
    getProveedores().then(setProveedores);
  }, []);

  const productosFiltrados = proveedorSeleccionado
    ? productos.filter(
        (p) => p.id_proveedor === parseInt(proveedorSeleccionado)
      )
    : productos;

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = () => {
    getClientes().then(setClientes);
  };

  /*   const generarLinkParaCliente = async (idCliente) => {
    try {
      const res = await fetch(
        `https://api.tierravolga.com.ar/pedidos/link/${idCliente}`
      );
      const data = await res.json();
      setLinkGenerado(data.link);
      setMostrarModalLink(true);
    } catch (err) {
      console.error("Error al generar link:", err);
    }
  }; */

  const generarLinkParaCliente = async (idCliente) => {
    try {
      const res = await fetch(
        `https://api.tierravolga.com.ar/pedidos/link/${idCliente}`
      );
      const data = await res.json();

      const cliente = clientes.find((c) => c.id_cliente === idCliente);
      setClienteLinkGenerado(cliente);

      setLinkGenerado(data.link);
      setMostrarModalLink(true);
    } catch (err) {
      console.error("Error al generar link:", err);
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.cuit?.toString().includes(busqueda) ||
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesMostrados = clientesFiltrados.slice(
    pagina * porPagina,
    (pagina + 1) * porPagina
  );
  const totalPaginas = Math.ceil(clientesFiltrados.length / porPagina);

  const abrirModal = async (cliente, modoAccion) => {
    setClienteActivo(
      cliente || {
        nombre: "",
        cuit: "",
        direccion: "",
        telefono: "",
        email: "",
        habilitado: true,
      }
    );
    setModo(modoAccion);
    setModalOpen(true);

    if (usuario?.rol_id === 2) {
      const productosTodos = await getProductos();
      setProductos(productosTodos);

      if (cliente) {
        const habilitados = await getProductosHabilitados(cliente.id_cliente);
        const ids = habilitados.map((p) => p.id_producto);
        setProductosSeleccionados(ids);
      } else {
        setProductosSeleccionados([]);
      }
    }
  };

  const cerrarModal = () => {
    setClienteActivo(null);
    setModalOpen(false);
  };

  const handleInput = (campo, valor) => {
    setClienteActivo({ ...clienteActivo, [campo]: valor });
  };

  const handleCheckboxProducto = (idProd) => {
    setProductosSeleccionados((prev) =>
      prev.includes(idProd)
        ? prev.filter((id) => id !== idProd)
        : [...prev, idProd]
    );
  };

  const handleGuardar = async () => {
    // Si el campo cuit está vacío, asignar 0
    if (!clienteActivo.cuit || clienteActivo.cuit.trim() === "") {
      clienteActivo.cuit = "0";
    }

    if (modo === "nuevo") {
      const nuevo = await crearCliente(clienteActivo);
      if (usuario?.rol_id === 2 && productosSeleccionados.length > 0) {
        await setProductosHabilitados(nuevo.id_cliente, productosSeleccionados);
      }
    } else if (modo === "editar") {
      await actualizarCliente(clienteActivo.id_cliente, clienteActivo);
      if (usuario?.rol_id === 2) {
        await setProductosHabilitados(
          clienteActivo.id_cliente,
          productosSeleccionados
        );
      }
    }

    cerrarModal();
    cargarClientes();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Clientes</h2>
        <button
          className="btn btn-primary"
          onClick={() => abrirModal(null, "nuevo")}
        >
          + Agregar Cliente
        </button>
      </div>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="Buscar por nombre o código"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Codigo</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientesMostrados.map((c) => (
            <tr key={c.id_cliente}>
              <td>{c.id_cliente}</td>
              <td>{c.nombre}</td>
              <td>{c.cuit}</td>
              <td>{c.direccion}</td>
              <td>{c.telefono}</td>
              <td>{c.email}</td>
              <td>
                <button
                  className="btn btn-sm btn-secondary me-2"
                  onClick={() => abrirModal(c, "ver")}
                >
                  Ver
                </button>
                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() => abrirModal(c, "editar")}
                >
                  Editar
                </button>
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => generarLinkParaCliente(c.id_cliente)}
                >
                  Generar Link
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

      {modalOpen && clienteActivo && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "#00000099" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modo === "ver" && "Ver Cliente"}
                  {modo === "editar" && "Editar Cliente"}
                  {modo === "nuevo" && "Nuevo Cliente"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                ></button>
              </div>
              <div className="modal-body">
                {["nombre", "cuit", "direccion", "telefono", "email"].map(
                  (campo) => (
                    <div className="mb-2" key={campo}>
                      <label className="form-label">
                        {campo.charAt(0).toUpperCase() + campo.slice(1)}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={clienteActivo[campo] || ""}
                        onChange={(e) => handleInput(campo, e.target.value)}
                        disabled={modo === "ver"}
                      />
                    </div>
                  )
                )}

                {usuario?.rol_id === 2 && (
                  <>
                    <div className="form-check form-switch mb-3 mt-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="habilitadoSwitch"
                        checked={clienteActivo.habilitado ?? true}
                        onChange={(e) =>
                          handleInput("habilitado", e.target.checked)
                        }
                        disabled={modo === "ver"}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="habilitadoSwitch"
                      >
                        Cuenta habilitada para realizar pedidos
                      </label>
                    </div>

                    <label className="form-label">Filtrar por marca</label>
                    <select
                      className="form-select mb-2"
                      value={proveedorSeleccionado}
                      onChange={(e) => setProveedorSeleccionado(e.target.value)}
                    >
                      <option value="">— Ver todos —</option>
                      {proveedores.map((p) => (
                        <option key={p.id_proveedor} value={p.id_proveedor}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>

                    <div
                      className="border p-2"
                      style={{ maxHeight: 200, overflowY: "auto" }}
                    >
                      {productosFiltrados.map((p) => (
                        <div className="form-check" key={p.id_producto}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`prod-${p.id_producto}`}
                            checked={productosSeleccionados.includes(
                              p.id_producto
                            )}
                            onChange={() =>
                              handleCheckboxProducto(p.id_producto)
                            }
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`prod-${p.id_producto}`}
                          >
                            {p.nombre} – {p.descripcion}
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
      {mostrarModalLink && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "#00000099" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Link generado para{" "}
                  {clienteLinkGenerado?.nombre || "el cliente"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setMostrarModalLink(false);
                    setCopiado(false);
                    setClienteLinkGenerado(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  value={linkGenerado}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                {copiado && (
                  <div className="text-success mt-2">
                    ✅ Link copiado al portapapeles
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(linkGenerado);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2500);
                  }}
                >
                  Copiar
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setMostrarModalLink(false);
                    setCopiado(false);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClienteList;
