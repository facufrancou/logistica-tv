import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getClientes,
  getProductos,
  getPedidoPorId,
  actualizarPedido,
  completarPedido,
  eliminarPedido,
} from "../../../services/api";

function PedidoList({ pedidos, onActualizar }) {
  const [pagina, setPagina] = useState(0);
  const pedidosPorPagina = 10;

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [pedidoVista, setPedidoVista] = useState(null);
  const [mostrarProductosVista, setMostrarProductosVista] = useState(false); // controla despliegue de productos en modal ver
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
  setMostrarProductosVista(false); // iniciar plegado
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

  <table className="table table-striped table-mobile table-responsive-stack">
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
            <tr key={p.id_pedido} className="animate-scale-in">
              <td data-label="ID">{p.id_pedido}</td>
              <td data-label="Cliente">{p.cliente}</td>
              <td data-label="Vendedor">{p.vendedor}</td>
              <td data-label="Fecha">{p.fecha_pedido}</td>
              <td data-label="Estado">{p.estado}</td>
              <td data-label="Acciones">
                <div className="btn-group btn-group-sm acciones-grid-mobile" role="group">
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
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "#00000099" }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square text-primary"></i>
                  Editar Pedido #{pedidoEditando.id_pedido}
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-4 mb-4">
                  <div className="col-md-5">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-3">
                        <h6 className="text-uppercase text-muted small mb-3 d-flex align-items-center gap-2"><i className="bi bi-info-circle text-primary"></i>Datos del pedido</h6>
                        <div className="mb-3">
                          <label className="form-label small text-muted mb-1">Cliente</label>
                          <select
                            className="form-select form-select-sm"
                            value={pedidoEditando.id_cliente}
                            onChange={(e) => setPedidoEditando({ ...pedidoEditando, id_cliente: e.target.value })}
                          >
                            <option value="">Seleccione</option>
                            {clientes.map((c) => (
                              <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label small text-muted mb-1">Seguimiento</label>
                          <input
                            className="form-control form-control-sm"
                            value={pedidoEditando.seguimiento_dist}
                            onChange={(e) => setPedidoEditando({ ...pedidoEditando, seguimiento_dist: e.target.value })}
                            placeholder="Código de seguimiento"
                          />
                        </div>
                        <div className="mb-0">
                          <label className="form-label small text-muted mb-1">Próximo pedido</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={pedidoEditando.fecha_proximo_pedido || ''}
                            onChange={(e) => setPedidoEditando({ ...pedidoEditando, fecha_proximo_pedido: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-7">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-3 d-flex flex-column">
                        <h6 className="text-uppercase text-muted small mb-3 d-flex align-items-center gap-2"><i className="bi bi-box-seam text-primary"></i>Productos</h6>
                        {/* Tabla de productos del pedido */}
                        <div className="table-responsive mb-3" style={{ maxHeight: 260 }}>
                          <table className="table table-sm align-middle mb-0">
                            <thead className="table-light sticky-top">
                              <tr>
                                <th style={{width:'6%'}}>#</th>
                                <th style={{width:'34%'}}>Nombre</th>
                                <th style={{width:'40%'}}>Descripción</th>
                                <th style={{width:'12%'}} className="text-center">Cantidad</th>
                                <th style={{width:'8%'}} className="text-center">Quitar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pedidoEditando.productos.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="text-center text-muted small py-3">No hay productos agregados.</td>
                                </tr>
                              )}
                              {pedidoEditando.productos.map((p, i) => {
                                const prod = productos.find(prod => prod.id_producto === p.id_producto);
                                return (
                                  <tr key={p.id_producto}>
                                      <td className="small text-muted">{i + 1}</td>
                                      <td className="fw-semibold small">{prod?.nombre || '—'}</td>
                                    <td className="text-muted small">{prod?.descripcion || 'Sin desc.'}</td>
                                    <td className="text-center" style={{minWidth:90}}>
                                      <input
                                        type="number"
                                        min={1}
                                        value={p.cantidad}
                                        onChange={(e) => modificarCantidad(p.id_producto, Math.max(1, parseInt(e.target.value) || 1))}
                                        className="form-control form-control-sm text-center"
                                        style={{width:80}}
                                      />
                                    </td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                                        style={{width:32,height:32,lineHeight:1}}
                                        onClick={() => eliminarProducto(p.id_producto)}
                                        title={`Quitar ${prod?.nombre || 'producto'}`}
                                      >
                                        <span aria-hidden="true" style={{fontSize:'1.1rem',marginTop:-2}}>&times;</span>
                                        <span className="visually-hidden">Quitar</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Agregar nuevo producto */}
                        <div className="row g-2 align-items-end">
                          <div className="col-md-7">
                            <label className="form-label small text-muted mb-1">Producto</label>
                            <select
                              className="form-select form-select-sm"
                              value={pedidoEditando.productoSeleccionado || ''}
                              onChange={(e) => setPedidoEditando({ ...pedidoEditando, productoSeleccionado: e.target.value })}
                            >
                              <option value="">Seleccione un producto</option>
                              {productos.map((p) => (
                                <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small text-muted mb-1">Cantidad</label>
                            <input
                              type="number"
                              min={1}
                              className="form-control form-control-sm"
                              value={pedidoEditando.cantidadSeleccionada || 1}
                              onChange={(e) => setPedidoEditando({ ...pedidoEditando, cantidadSeleccionada: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          <div className="col-md-2 d-grid">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary mt-3"
                              onClick={agregarProducto}
                              disabled={!pedidoEditando.productoSeleccionado}
                            >
                              <i className="bi bi-plus-circle me-1"></i>Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn btn-success" onClick={handleGuardar} disabled={pedidoEditando.productos.length === 0}>
                  <i className="bi bi-check2-circle me-1"></i>Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Pedido */}
      {pedidoVista && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "#00000099" }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-receipt-cutoff text-primary"></i>
                  Pedido #{pedidoVista.id_pedido}
                </h5>
                <button type="button" className="btn-close" onClick={() => setPedidoVista(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-4 mb-3">
                  <div className="col-md-6">
                    <div className="card border-0 h-100 shadow-sm">
                      <div className="card-body p-3">
                        <h6 className="text-uppercase text-muted small mb-3 d-flex align-items-center gap-2"><i className="bi bi-person-lines-fill text-primary"></i>Cliente</h6>
                        <p className="mb-2 fw-semibold fs-5">
                          {clientes.find((c) => c.id_cliente === pedidoVista.id_cliente)?.nombre || "—"}
                        </p>
                        <div className="mb-2">
                          <span className="text-muted small d-block">Seguimiento</span>
                          {pedidoVista.seguimiento_dist ? (
                            <code className="bg-light px-2 py-1 d-inline-block rounded small">{pedidoVista.seguimiento_dist}</code>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </div>
                        <div className="mb-2">
                          <span className="text-muted small d-block">Estado</span>
                          <span className={`badge ${pedidoVista.estado === 'completado' ? 'bg-success' : pedidoVista.estado === 'rechazado' ? 'bg-danger' : 'bg-warning'} rounded-pill p-2`}>
                            <i className={`bi ${pedidoVista.estado === 'completado' ? 'bi-check-circle' : pedidoVista.estado === 'rechazado' ? 'bi-x-circle' : 'bi-hourglass-split'} me-1`}></i>
                            {pedidoVista.estado}
                          </span>
                        </div>
                        <div className="mb-0">
                          <span className="text-muted small d-block">Próximo pedido</span>
                          <span className="fw-semibold">
                            {pedidoVista.fecha_proximo_pedido ? new Date(pedidoVista.fecha_proximo_pedido).toLocaleDateString('es-AR') : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 h-100 shadow-sm">
                      <div className="card-body p-3">
                        <h6 className="text-uppercase text-muted small mb-3 d-flex align-items-center gap-2"><i className="bi bi-calendar-event text-primary"></i>Fechas</h6>
                        <div className="mb-3">
                          <span className="text-muted small d-block">Fecha del pedido</span>
                          <span className="fw-semibold">
                            {new Date(pedidoVista.fecha_pedido).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {pedidoVista.updatedAt && (
                          <div className="mb-0">
                            <span className="text-muted small d-block">Última actualización</span>
                            <span className="fw-semibold">
                              {new Date(pedidoVista.updatedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="text-uppercase text-muted small d-flex align-items-center gap-2 mb-0">
                        <i className="bi bi-box-seam text-primary"></i>
                        Productos ({pedidoVista.productos.length})
                      </h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                        onClick={() => setMostrarProductosVista(v => !v)}
                        aria-expanded={mostrarProductosVista}
                        aria-controls="tabla-productos-vista"
                      >
                        {mostrarProductosVista ? 'Ocultar' : 'Ver'}
                        <i className={`bi ${mostrarProductosVista ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                      </button>
                    </div>
                    {mostrarProductosVista && (
                      <div className="table-responsive animate-fade-in" id="tabla-productos-vista">
                        <table className="table align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{width:'6%'}}>#</th>
                              <th style={{width:'34%'}}>Nombre</th>
                              <th style={{width:'50%'}}>Descripción</th>
                              <th style={{width:'10%'}} className="text-end">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pedidoVista.productos.map((p, i) => {
                              const prod = productos.find(prod => prod.id_producto === p.id_producto);
                              return (
                                <tr key={i}>
                                  <td>{i + 1}</td>
                                  <td className="fw-semibold">{prod?.nombre || '—'}</td>
                                  <td className="text-muted small">{prod?.descripcion || 'Sin descripción'}</td>
                                  <td className="text-end">
                                    <span className="badge bg-primary rounded-pill p-2">{p.cantidad}</span>
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
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary" onClick={() => setPedidoVista(null)}>
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
