import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function PedidoAcceso() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [cliente, setCliente] = useState(null);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [pedido, setPedido] = useState([]);
  const [fechaProximoPedido, setFechaProximoPedido] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("");
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  const [mensajeAviso, setMensajeAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ultimoPedidoTemp, setUltimoPedidoTemp] = useState(null);
  const [modalConfirmacionRepetir, setModalConfirmacionRepetir] =
    useState(false);
  const [cuentaRegresiva, setCuentaRegresiva] = useState(3);
  const [forzarReload, setForzarReload] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`https://api.tierravolga.com.ar/pedidos/token/${token}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Token inválido o expirado")
      )
      .then((data) => {
        setCliente(data.cliente);
        setProductos(data.productos);

        // Extraer proveedores únicos
        const marcasUnicas = [];
        const idsUsados = new Set();
        data.productos.forEach((p) => {
          if (p.id_proveedor && !idsUsados.has(p.id_proveedor)) {
            marcasUnicas.push({
              id_proveedor: p.id_proveedor,
              nombre: p.proveedor_nombre || `Marca ${p.id_proveedor}`,
            });
            idsUsados.add(p.id_proveedor);
          }
        });
        setProveedores(marcasUnicas);
      })
      .catch((err) => setError(err));
  }, [token]);

  const agruparPorProveedor = (productos) => {
    const agrupados = {};
    productos.forEach((p) => {
      const key = p.id_proveedor || 0;
      if (!agrupados[key]) agrupados[key] = [];
      agrupados[key].push(p);
    });
    return agrupados;
  };

  const cargarUltimoPedido = () => {
    if (!cliente?.id_cliente) return;

    fetch(`https://api.tierravolga.com.ar/pedidos/ultimo/${cliente.id_cliente}`)
      .then((res) => {
        if (!res.ok) throw new Error("No hay pedidos anteriores");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.productos) && data.productos.length > 0) {
          setUltimoPedidoTemp(data.productos);
          setModalConfirmacionRepetir(true);
        } else {
          setMensajeAviso(
            "Este cliente no tiene pedidos anteriores para repetir."
          );
          setModalAviso(true);
        }
      })
      .catch(() => {
        setMensajeAviso(
          "Este cliente no tiene pedidos anteriores para repetir."
        );
        setModalAviso(true);
      });
  };

  const confirmarRepetirPedido = () => {
    setPedido(ultimoPedidoTemp);
    setUltimoPedidoTemp(null);
    setModalConfirmacionRepetir(false);
  };

  const agregarProducto = () => {
    if (!productoSeleccionado || !cantidadSeleccionada || cantidadSeleccionada < 1)
      return;

    const id_producto = productoSeleccionado.id_producto;
    const yaExiste = pedido.find((p) => p.id_producto === id_producto);
    if (yaExiste) {
      setPedido(
        pedido.map((p) =>
          p.id_producto === id_producto
            ? { ...p, cantidad: p.cantidad + cantidadSeleccionada }
            : p
        )
      );
    } else {
      setPedido([...pedido, { id_producto, cantidad: Number(cantidadSeleccionada) }]);
    }

    setProductoSeleccionado(null);
    setBusqueda("");
    setCantidadSeleccionada("");
    setModalOpen(false);
  };

  const eliminarProducto = (id_producto) => {
    setPedido(pedido.filter((p) => p.id_producto !== id_producto));
  };

  const enviarPedido = () => {
    fetch("https://api.tierravolga.com.ar/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_cliente: cliente.id_cliente,
        id_usuario: 1,
        seguimiento_dist: "",
        productos: pedido,
        token,
        fecha_proximo_pedido: fechaProximoPedido,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setPedido([]);
          setFechaProximoPedido("");

          if (data.advertencia) {
            setMensajeAviso(data.advertencia);
            setForzarReload(true);
            setModalAviso(true);
          } else {
            let segundos = 3;
            setCuentaRegresiva(segundos);
            setMensajeAviso(
              `Pedido enviado correctamente. Redirigiendo en ${segundos} segundos...`
            );
            setModalAviso(true);

            const intervalo = setInterval(() => {
              segundos--;
              setCuentaRegresiva(segundos);
              setMensajeAviso(
                `Pedido enviado correctamente. Redirigiendo en ${segundos} segundos...`
              );
              if (segundos === 0) {
                clearInterval(intervalo);
                window.location.reload();
              }
            }, 1000);
          }
        } else {
          setMensajeAviso("Error al enviar pedido: " + (data.error || ""));
          setModalAviso(true);
        }
      })
      .catch(() => {
        setMensajeAviso("Error al conectar con el servidor");
        setModalAviso(true);
      });
  };

  const obtenerNombreProducto = (id) => {
    const prod = productos.find((p) => p.id_producto === id);
    return prod ? prod.nombre : "";
  };

  const obtenerPrecioProducto = (id) => {
    const prod = productos.find((p) => p.id_producto === id);
    return prod ? prod.precio_unitario : 0;
  };

  if (error)
    return (
      <div className="container mt-5">
        <h4>{error}</h4>
      </div>
    );
  if (!cliente)
    return (
      <div className="container mt-5">
        <h4>Cargando...</h4>
      </div>
    );

  return (
    <div className="container mt-4">
      <h3 className="mb-4 text-center">Formulario de Pedido</h3>

      <div className="mb-3">
        <label className="form-label">CUIT</label>
        <input
          type="text"
          className="form-control"
          value={cliente.cuit}
          disabled
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Nombre</label>
        <input
          type="text"
          className="form-control"
          value={cliente.nombre}
          disabled
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Próximo pedido</label>
        <input
          type="date"
          className="form-control"
          value={fechaProximoPedido}
          onChange={(e) => setFechaProximoPedido(e.target.value)}
        />
      </div>

      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-outline-info" onClick={cargarUltimoPedido}>
          ↺ Repetir último pedido
        </button>
      </div>

      <h5>Productos</h5>
      <button
        className="btn btn-secondary mb-3"
        onClick={() => setModalOpen(true)}
      >
        + Agregar Producto
      </button>

      {pedido.length === 0 && <p>No hay productos agregados.</p>}

      {pedido.length > 0 && (
        <ul className="list-group mb-4">
          {pedido.map((p, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <strong>{p.nombre || obtenerNombreProducto(p.id_producto)}</strong> (x{p.cantidad})<br />
                <span className="text-muted">{p.descripcion}</span>
                {p.proveedor_nombre && (
                  <span className="ms-2">Proveedor: {p.proveedor_nombre}</span>
                )}
              </div>
              <span>
                $
                {p.precio_unitario ? (p.precio_unitario * p.cantidad).toFixed(2) : (obtenerPrecioProducto(p.id_producto) * p.cantidad).toFixed(2)}
              </span>
              <button
                className="btn btn-sm btn-danger ms-2"
                onClick={() => eliminarProducto(p.id_producto)}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="btn btn-success w-100" onClick={enviarPedido}>
        Enviar Pedido
      </button>

      {/* Modal de aviso */}
      {modalAviso && (
        <div className="modal d-block" style={{ backgroundColor: "#00000099" }}>
          <div
            className="modal-dialog"
            style={{ maxWidth: "800px", width: "90%" }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Aviso</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalAviso(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{mensajeAviso}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setModalAviso(false);
                    if (forzarReload) window.location.reload();
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar repetir pedido */}
      {modalConfirmacionRepetir && (
        <div className="modal d-block" style={{ backgroundColor: "#00000099" }}>
          <div
            className="modal-dialog"
            style={{ maxWidth: "800px", width: "90%" }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Repetir pedido anterior</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalConfirmacionRepetir(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Querés repetir el siguiente pedido?</p>
                <ul className="list-group">
                  {ultimoPedidoTemp?.map((p, i) => (
                    <li
                      key={i}
                      className="list-group-item d-flex justify-content-between"
                    >
                      <div>
                        <strong>{p.nombre}</strong> (x{p.cantidad})<br />
                        <span className="text-muted">{p.descripcion}</span>
                        {p.proveedor_nombre && (
                          <span className="ms-2">Proveedor: {p.proveedor_nombre}</span>
                        )}
                      </div>
                      <span>
                        $
                        {p.precio_unitario ? (p.precio_unitario * p.cantidad).toFixed(2) : "0.00"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalConfirmacionRepetir(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={confirmarRepetirPedido}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar producto agrupado por proveedor */}
      {modalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "#00000099" }}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: "800px", width: "90%" }}
          >
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
                        {proveedores.find(
                          (p) => p.id_proveedor === parseInt(id_proveedor)
                        )?.nombre || "Sin Marca"}
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
                          {p.nombre} (${p.precio_unitario}) - {p.descripcion}
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
                <button className="btn btn-primary" onClick={agregarProducto}>
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

export default PedidoAcceso;
