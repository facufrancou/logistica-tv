import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getClientes,
  getProductos,
  getPedidoPorId,
  actualizarPedido,
  completarPedido,
  eliminarPedido,
} from "../services/api";

function PedidoList({ pedidos, onActualizar }) {
  const [pagina, setPagina] = useState(0);
  const pedidosPorPagina = 10;

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [pedidoVista, setPedidoVista] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(false);

  const [mostrarTodos, setMostrarTodos] = useState(false);

  const location = useLocation();

  useEffect(() => {
    onActualizar(); // se ejecuta cada vez que volvés a /PEDIDOS
  }, [location.pathname]);

  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
  }, []);

  const buscarPedidosPorFecha = () => {
    if (!fechaDesde || !fechaHasta) {
      alert("Seleccioná un rango de fechas válido");
      return;
    }

    const desde = fechaDesde;
    const hasta = fechaHasta;

    const filtrados = pedidos.filter((p) => {
      if (!p.fecha_pedido_iso) return false;

      const fechaISO = p.fecha_pedido_iso.slice(0, 10); // YYYY-MM-DD

      return fechaISO >= desde && fechaISO <= hasta;
    });

    console.log("Fechas filtradas:", desde, hasta);
    console.log(
      "Incluidos:",
      filtrados.map((f) => f.id_pedido)
    );

    setPedidosFiltrados(filtrados);
    setPagina(0);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
    setPedidosFiltrados([]);
    setPagina(0);
  };

  const mostrarTodosPedidos = () => {
    setPedidosFiltrados(pedidos);
    setPagina(0);
  };

  /* const pedidosFiltrados = Array.isArray(pedidos)
    ? pedidos.filter((p) => {
        const coincideBusqueda =
          p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
          (p.seguimiento_dist || "")
            .toLowerCase()
            .includes(busqueda.toLowerCase());

        const fechaPedido = new Date(p.fecha_pedido);
        const desde = fechaDesde ? new Date(fechaDesde) : null;
        const hasta = fechaHasta ? new Date(fechaHasta) : null;

        const dentroDeRango =
          (!desde || fechaPedido >= desde) && (!hasta || fechaPedido <= hasta);

        return mostrarTodos || (coincideBusqueda && dentroDeRango);
      })
    : []; */

  const pedidosMostrados = pedidosFiltrados.slice(
    pagina * pedidosPorPagina,
    (pagina + 1) * pedidosPorPagina
  );
  const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);

  const handleCompletar = async (id) => {
    try {
      await completarPedido(id);

      // Actualiza el estado local respetando los filtros actuales
      setPedidosFiltrados((prevPedidos) =>
        prevPedidos.map((p) =>
          p.id_pedido === id ? { ...p, estado: "completado" } : p
        )
      );
    } catch (error) {
      console.error("Error al completar el pedido:", error);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Seguro que querés eliminar este pedido?")) {
      await eliminarPedido(id);
      onActualizar();
    }
  };

  const handleEditar = async (pedido) => {
    try {
      const pedidoCompleto = await getPedidoPorId(pedido.id_pedido);
      setPedidoEditando({
        ...pedidoCompleto,
        productoSeleccionado: "",
        cantidadSeleccionada: 1,
        fecha_proximo_pedido: pedidoCompleto.fecha_proximo_pedido
          ? pedidoCompleto.fecha_proximo_pedido.split("T")[0]
          : "",
      });
      setModalOpen(true);
    } catch (error) {
      alert("Error al cargar el pedido");
    }
  };

  const handleVer = async (pedido) => {
    try {
      const pedidoCompleto = await getPedidoPorId(pedido.id_pedido);
      setPedidoVista(pedidoCompleto);
    } catch (error) {
      alert("Error al cargar el pedido");
    }
  };

  const agregarProducto = () => {
    if (
      !pedidoEditando.productoSeleccionado ||
      pedidoEditando.cantidadSeleccionada < 1
    )
      return;

    const id_producto = parseInt(pedidoEditando.productoSeleccionado);
    const yaExiste = pedidoEditando.productos.find(
      (p) => p.id_producto === id_producto
    );

    const nuevos = yaExiste
      ? pedidoEditando.productos.map((p) =>
          p.id_producto === id_producto
            ? {
                ...p,
                cantidad: p.cantidad + pedidoEditando.cantidadSeleccionada,
              }
            : p
        )
      : [
          ...pedidoEditando.productos,
          { id_producto, cantidad: pedidoEditando.cantidadSeleccionada },
        ];

    setPedidoEditando({
      ...pedidoEditando,
      productos: nuevos,
      productoSeleccionado: "",
      cantidadSeleccionada: 1,
    });
  };

  const eliminarProducto = (id_producto) => {
    setPedidoEditando({
      ...pedidoEditando,
      productos: pedidoEditando.productos.filter(
        (p) => p.id_producto !== id_producto
      ),
    });
  };

  const modificarCantidad = (id_producto, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;
    setPedidoEditando({
      ...pedidoEditando,
      productos: pedidoEditando.productos.map((p) =>
        p.id_producto === id_producto ? { ...p, cantidad: nuevaCantidad } : p
      ),
    });
  };

  const handleGuardar = () => {
    if (!pedidoEditando) return;
    actualizarPedido(pedidoEditando.id_pedido, pedidoEditando).then(() => {
      setModalOpen(false);
      setPedidoEditando(null);
      onActualizar();
    });
  };

  return (
    <div>
      <h2 className="mb-4">
        <i className="bi bi-box-seam me-2"></i> Pedidos
      </h2>

      <div className="card mb-4 p-3 shadow-sm">
        <h5 className="mb-3">Filtros</h5>
        <div className="row g-2 mb-3">
          <div className="col-auto">
            <label className="form-label">Desde</label>
            <input
              type="date"
              className="form-control"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="col-auto">
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-control"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <div className="col-auto d-flex align-items-end gap-2">
            <button className="btn btn-success" onClick={buscarPedidosPorFecha}>
              Buscar por rango
            </button>
            <button className="btn btn-primary" onClick={mostrarTodosPedidos}>
              Ver todos
            </button>
            <button className="btn btn-danger" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por cliente o seguimiento"
            value={busqueda}
            onChange={(e) => {
              const texto = e.target.value;
              setBusqueda(texto);

              const filtrados = pedidos.filter(
                (p) =>
                  p.cliente.toLowerCase().includes(texto.toLowerCase()) ||
                  (p.seguimiento_dist || "")
                    .toLowerCase()
                    .includes(texto.toLowerCase())
              );
              setPedidosFiltrados(filtrados);
              setPagina(0);
            }}
          />
        </div>
      </div>

      {!loading && pedidosFiltrados.length === 0 && (
        <p>No hay pedidos para mostrar. Usá los filtros para comenzar.</p>
      )}

      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidosMostrados.map((p) => (
            <tr key={p.id_pedido}>
              <td>{p.id_pedido}</td>
              <td>{p.cliente}</td>
              <td>{p.vendedor}</td>
              <td>{p.fecha_pedido}</td>
              <td>{p.estado}</td>
              <td>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleVer(p)}
                  >
                    Ver
                  </button>

                  {p.estado !== "completado" && (
                    <button
                      className="btn btn-warning"
                      onClick={() => handleEditar(p)}
                    >
                      Editar
                    </button>
                  )}

                  <button
                    className="btn btn-success"
                    onClick={() => handleCompletar(p.id_pedido)}
                  >
                    Completar
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleEliminar(p.id_pedido)}
                  >
                    Eliminar
                  </button>
                </div>
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

      {/* Modal Edición */}
      {modalOpen && pedidoEditando && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "#00000099" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Editar Pedido #{pedidoEditando.id_pedido}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Cliente</label>
                  <select
                    className="form-select"
                    value={pedidoEditando.id_cliente}
                    onChange={(e) =>
                      setPedidoEditando({
                        ...pedidoEditando,
                        id_cliente: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione</option>
                    {clientes.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Seguimiento</label>
                  <input
                    className="form-control"
                    value={pedidoEditando.seguimiento_dist}
                    onChange={(e) =>
                      setPedidoEditando({
                        ...pedidoEditando,
                        seguimiento_dist: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Próximo pedido</label>
                  <input
                    type="date"
                    className="form-control"
                    value={pedidoEditando.fecha_proximo_pedido || ""}
                    onChange={(e) =>
                      setPedidoEditando({
                        ...pedidoEditando,
                        fecha_proximo_pedido: e.target.value,
                      })
                    }
                  />
                </div>

                <h6>Productos</h6>
                <ul className="list-group mb-3">
                  {pedidoEditando.productos.map((p, i) => {
                    const prod = productos.find(
                      (prod) => prod.id_producto === p.id_producto
                    );
                    return (
                      <li
                        key={i}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div className="me-3">{prod?.nombre}</div>
                        <input
                          type="number"
                          min={1}
                          value={p.cantidad}
                          onChange={(e) =>
                            modificarCantidad(
                              p.id_producto,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="form-control form-control-sm w-25 me-2"
                        />
                        <button
                          className="btn btn-sm btn"
                          onClick={() => eliminarProducto(p.id_producto)}
                        >
                          ❌
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="row g-2">
                  <div className="col">
                    <select
                      className="form-select"
                      value={pedidoEditando.productoSeleccionado || ""}
                      onChange={(e) =>
                        setPedidoEditando({
                          ...pedidoEditando,
                          productoSeleccionado: e.target.value,
                        })
                      }
                    >
                      <option value="">Producto</option>
                      {productos.map((p) => (
                        <option key={p.id_producto} value={p.id_producto}>
                          {p.nombre} (${p.precio_unitario})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col">
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={pedidoEditando.cantidadSeleccionada || 1}
                      onChange={(e) =>
                        setPedidoEditando({
                          ...pedidoEditando,
                          cantidadSeleccionada: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="col-auto">
                    <button
                      className="btn btn-primary"
                      onClick={agregarProducto}
                    >
                      Agregar
                    </button>
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
                <button className="btn btn-success" onClick={handleGuardar}>
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Pedido */}
      {pedidoVista && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "#00000099" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Pedido #{pedidoVista.id_pedido}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPedidoVista(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Cliente:</strong>{" "}
                  {clientes.find((c) => c.id_cliente === pedidoVista.id_cliente)
                    ?.nombre || "—"}
                </p>
                <p>
                  <strong>Seguimiento:</strong> {pedidoVista.seguimiento_dist}
                </p>
                <p>
                  <strong>Fecha:</strong>{" "}
                  {new Date(pedidoVista.fecha_pedido).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <p>
                  <strong>Estado:</strong> {pedidoVista.estado}
                </p>
                <p>
                  <strong>Próximo pedido:</strong>{" "}
                  {pedidoVista.fecha_proximo_pedido
                    ? new Date(
                        pedidoVista.fecha_proximo_pedido
                      ).toLocaleDateString("es-AR")
                    : "—"}
                </p>

                <h6>Productos:</h6>
                <ul className="list-group">
                  {pedidoVista.productos.map((p, i) => {
                    const prod = productos.find(
                      (prod) => prod.id_producto === p.id_producto
                    );
                    return (
                      <li key={i} className="list-group-item">
                        {prod?.nombre || "Producto eliminado"} — Cantidad:{" "}
                        {p.cantidad}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPedidoVista(null)}
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

export default PedidoList;
