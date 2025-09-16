import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PedidoConfirmadoAnimation from "./PedidoConfirmadoAnimation";
import "./PedidoAcceso.css";

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
  const [mostrarAnimacion, setMostrarAnimacion] = useState(false);
  const [tokenInvalido, setTokenInvalido] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:3001/pedidos/token/${token}`)
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
      .catch((err) => {
        setTokenInvalido(true);
        setError(err);
      });
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

    fetch(`http://localhost:3001/pedidos/ultimo/${cliente.id_cliente}`)
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
    const prodFuente = productos.find(p => p.id_producto === id_producto) || productoSeleccionado;
    const yaExiste = pedido.find((p) => p.id_producto === id_producto);
    if (yaExiste) {
      setPedido(
        pedido.map((p) =>
          p.id_producto === id_producto
            ? { 
                ...p, 
                // aseguro que tenga los datos completos
                nombre: p.nombre || prodFuente.nombre, 
                descripcion: p.descripcion || prodFuente.descripcion, 
                proveedor_nombre: p.proveedor_nombre || prodFuente.proveedor_nombre,
                cantidad: p.cantidad + Number(cantidadSeleccionada) 
              }
            : p
        )
      );
    } else {
      setPedido([
        ...pedido, 
        { 
          id_producto, 
          cantidad: Number(cantidadSeleccionada), 
          nombre: prodFuente.nombre, 
          descripcion: prodFuente.descripcion, 
          proveedor_nombre: prodFuente.proveedor_nombre
        }
      ]);
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
    fetch("http://localhost:3001/pedidos", {
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
            // Mostrar animación en lugar del modal con cuenta regresiva
            setMostrarAnimacion(true);
            // La redirección se maneja dentro del componente de animación
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
  const obtenerDescripcionProducto = (id) => {
    const prod = productos.find((p) => p.id_producto === id);
    return prod ? prod.descripcion : "";
  };

  // Manejo de animación de pedido confirmado
  if (mostrarAnimacion) {
    return <PedidoConfirmadoAnimation onComplete={() => window.location.reload()} />;
  }

  // Manejo de token inválido con estilo mejorado
  if (tokenInvalido) {
    return (
      <div className="container mt-5 text-center">
        <div className="card p-4 shadow">
          <div className="mb-4">
            <img src="/img/logo.svg" alt="Tierra Volga" style={{ height: '80px' }} />
          </div>
          <div className="mb-3">
            <img src="/img/logo-b.svg" alt="Tierra Volga" style={{ height: '40px', opacity: 0.6 }} />
          </div>
          <h3 className="text-danger mb-3">Token inválido o expirado</h3>
          <div className="alert alert-warning">
            <p className="mb-1"><strong>¡Atención!</strong></p>
            <p>Este enlace ya no es válido. Esto puede deberse a que:</p>
            <ul className="text-start">
              <li>El pedido ya ha sido confirmado exitosamente</li>
              <li>El token ha expirado por seguridad</li>
            </ul>
          </div>
          <p className="text-muted mt-3">Si necesita realizar un nuevo pedido, por favor contáctenos para generar un nuevo enlace.</p>
        </div>
      </div>
    );
  }

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
    <div className="container mt-4 pedido-acceso">
      <h3 className="mb-4 text-center">Formulario de Pedido</h3>

      <div className="mb-3">
        <label className="form-label">Cod. Cliente</label>
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

  <h5 className="seccion-titulo mt-4">Productos</h5>
      <button
        className="btn btn-secondary mb-3"
        onClick={() => setModalOpen(true)}
      >
        + Agregar Producto
      </button>

  {pedido.length === 0 && <p className="text-muted">No hay productos agregados todavía. Usá el botón "Agregar Producto" o repetí el último pedido.</p>}

      {pedido.length > 0 && (() => {
        // Agrupar por proveedor para claridad visual en tarjetas
        const agrupado = pedido.reduce((acc, item) => {
          const prov = item.proveedor_nombre || "Sin Marca";
          if (!acc[prov]) acc[prov] = [];
          acc[prov].push(item);
          return acc;
        }, {});
        return (
          <div className="mb-4">
            {Object.entries(agrupado).map(([prov, items]) => (
              <div key={prov} className="pedido-prov card mb-3">
                <div className="card-header py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <span className="fw-semibold text-uppercase small text-muted d-flex align-items-center gap-2">
                    <i className="bi bi-tags-fill text-primary"></i> {prov}
                  </span>
                  <span className="badge rounded-pill bg-light text-dark border">
                    {items.length} {items.length === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <ul className="list-group list-group-flush">
                  {items.map((p) => (
                    <li key={p.id_producto} className="list-group-item pedido-product-item">
                      <div className="flex-grow-1">
                        <div className="d-flex flex-column">
                          <strong className="pedido-product-name">{p.nombre || obtenerNombreProducto(p.id_producto)}</strong>
                          <div className="text-muted small pedido-product-desc">
                            {p.descripcion || obtenerDescripcionProducto(p.id_producto)}
                          </div>
                        </div>
                      </div>
                      <div className="pedido-qty ms-md-3 mt-2 mt-md-0">
                        <div className="input-group input-group-sm qty-group">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              setPedido(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, cantidad: Math.max(1, x.cantidad - 1)}: x))
                            }
                            title="Restar 1"
                            aria-label={`Restar 1 a ${p.nombre}`}
                          >-
                          </button>
                          <input
                            type="number"
                            min={1}
                            className="form-control text-center"
                            value={p.cantidad}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value)||1);
                              setPedido(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, cantidad: val }: x));
                            }}
                            aria-label={`Cantidad para ${p.nombre}`}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              setPedido(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, cantidad: x.cantidad + 1}: x))
                            }
                            title="Sumar 1"
                            aria-label={`Sumar 1 a ${p.nombre}`}
                          >+
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => eliminarProducto(p.id_producto)}
                            title="Eliminar producto"
                            aria-label={`Eliminar ${p.nombre}`}
                          >×
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })()}

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
                      className="list-group-item"
                    >
                      <div>
        <strong>{p.nombre}</strong> (x{p.cantidad})<br />
        <span className="text-muted">{p.descripcion || obtenerDescripcionProducto(p.id_producto)}</span>
                        {p.proveedor_nombre && (
                          <span className="ms-2">Proveedor: {p.proveedor_nombre}</span>
                        )}
                      </div>
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
                          {p.nombre} - {p.descripcion}
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
