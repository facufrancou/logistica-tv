import React, { useEffect, useState } from "react";
import { getPedidos, getClientes, getPedidosPorFecha } from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function ReportesView() {
  const [tipoReporte, setTipoReporte] = useState("");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrarTodosCompletados, setMostrarTodosCompletados] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    getClientes().then(setClientes);
  }, []);

  const getTituloReporte = () => {
  switch (tipoReporte) {
    case "pendientes":
      return "Reporte de Pedidos Pendientes";
    case "cliente":
      return `Reporte por Cliente: ${clienteSeleccionado}`;
    case "fecha":
      return `Reporte por Fecha (${fechaDesde} a ${fechaHasta})`;
    case "estado":
      return `Reporte por Estado: ${estadoSeleccionado}`;
    default:
      return "Reporte de Pedidos";
  }
};

  const handleBuscar = async () => {
    const todos = await getPedidos();
    let filtrados = [];

    switch (tipoReporte) {
      case "pendientes":
        filtrados = todos.filter((p) => p.estado.toLowerCase() === "pendiente");
        break;
      case "cliente":
        filtrados = todos.filter((p) => p.cliente === clienteSeleccionado);
        break;
      case "fecha":
        if (!fechaDesde || !fechaHasta) {
          alert("Seleccioná un rango válido");
          return;
        }
        filtrados = await getPedidosPorFecha(fechaDesde, fechaHasta);
        break;
      case "estado":
        if (
          estadoSeleccionado.toLowerCase() === "completado" &&
          !mostrarTodosCompletados &&
          fechaDesde &&
          fechaHasta
        ) {
          filtrados = await getPedidosPorFecha(fechaDesde, fechaHasta);
          filtrados = filtrados.filter(
            (p) => p.estado.toLowerCase() === "completado"
          );
        } else {
          filtrados = todos.filter(
            (p) => p.estado.toLowerCase() === estadoSeleccionado.toLowerCase()
          );
        }
        break;
      default:
        filtrados = [];
    }

    setResultados(filtrados);
  };

  const exportarPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const titulo = getTituloReporte();
    doc.setFontSize(14);
    doc.text(titulo, 14, 20);

    const rows = [];

    resultados.forEach((p) => {
      const productos =
        p.productos
          ?.map(
            (prod) =>
              `${prod.nombre} - ${prod.descripcion} (Cant: ${prod.cantidad})`
          )
          .join("\n") || "—";

      rows.push([
        p.id_pedido,
        p.cliente,
        p.vendedor,
        p.fecha_pedido,
        p.estado,
        p.total,
        productos,
        p.fecha_proximo_pedido
          ? new Date(p.fecha_proximo_pedido).toLocaleDateString("es-AR")
          : "—",
      ]);
    });

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "ID",
          "Cliente",
          "Vendedor",
          "Fecha",
          "Estado",
          "Total",
          "Productos",
          "Próximo Pedido",
        ],
      ],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [50, 50, 50] },
    });

    doc.save("reporte.pdf");
  };

  return (
    <div className="container mt-4">
      <h2>Reportes de Pedidos</h2>
      <button className="btn btn-success mt-2 me-2" onClick={exportarPDF}>
        Exportar PDF
      </button>

      {/* Selector de tipo */}
      <div className="mb-3">
        <label className="form-label">Tipo de reporte:</label>
        <select
          className="form-select"
          value={tipoReporte}
          onChange={(e) => setTipoReporte(e.target.value)}
        >
          <option value="">Seleccionar...</option>
          <option value="pendientes">Pedidos Pendientes</option>
          <option value="cliente">Por Cliente</option>
          <option value="fecha">Por Fecha</option>
          <option value="estado">Por Estado</option>
        </select>
      </div>

      {/* Filtros dinámicos */}
      {tipoReporte === "cliente" && (
        <div className="mb-3">
          <label className="form-label">Cliente:</label>
          <select
            className="form-select"
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
          >
            <option value="">Seleccionar cliente</option>
            {clientes.map((c) => (
              <option key={c.id_cliente} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {tipoReporte === "fecha" && (
        <div className="row mb-3">
          <div className="col">
            <label className="form-label">Desde:</label>
            <input
              type="date"
              className="form-control"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="col">
            <label className="form-label">Hasta:</label>
            <input
              type="date"
              className="form-control"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
      )}

      {tipoReporte === "estado" && (
        <div className="mb-3">
          <label className="form-label">Estado:</label>
          <select
            className="form-select"
            value={estadoSeleccionado}
            onChange={(e) => setEstadoSeleccionado(e.target.value)}
          >
            <option value="">Seleccionar estado</option>
            <option value="pendiente">Pendiente</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          {estadoSeleccionado === "completado" && (
            <>
              <div className="row mt-3">
                <div className="col">
                  <label>Desde:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    disabled={mostrarTodosCompletados}
                  />
                </div>
                <div className="col">
                  <label>Hasta:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    disabled={mostrarTodosCompletados}
                  />
                </div>
              </div>
              <div className="form-check mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="mostrarTodos"
                  checked={mostrarTodosCompletados}
                  onChange={() =>
                    setMostrarTodosCompletados(!mostrarTodosCompletados)
                  }
                />
                <label className="form-check-label" htmlFor="mostrarTodos">
                  Mostrar todos los pedidos completados (ignorar fechas)
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* Botón de búsqueda */}
      <button className="btn btn-primary mb-3" onClick={handleBuscar}>
        Buscar
      </button>

      {/* Tabla de resultados */}
      {resultados.length > 0 && (
        <div>
          <table className="table table-bordered table-striped table-sm">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((p) => (
                <React.Fragment key={p.id_pedido}>
                  <tr>
                    <td>{p.id_pedido}</td>
                    <td>{p.cliente}</td>
                    <td>{p.vendedor}</td>
                    <td>{p.fecha_pedido}</td>
                    <td>{p.estado}</td>
                    <td>{p.total}</td>
                  </tr>
                  <tr>
                    <td colSpan="6" className="bg-light">
                      <strong>Productos:</strong>
                      <ul className="mb-1">
                        {p.productos?.length > 0 ? (
                          p.productos.map((prod, i) => (
                            <li key={i}>
                              {prod.nombre} - {prod.descripcion} —{" "}
                              <strong>Cantidad:</strong> {prod.cantidad}
                            </li>
                          ))
                        ) : (
                          <li>—</li>
                        )}
                      </ul>
                      <strong>Próximo pedido:</strong>{" "}
                      {p.fecha_proximo_pedido
                        ? new Date(p.fecha_proximo_pedido).toLocaleDateString(
                            "es-AR"
                          )
                        : "—"}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <button
            className="btn btn-secondary mt-2"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>
      )}

      {resultados.length === 0 && tipoReporte && (
        <p className="text-muted">
          No se encontraron resultados para este reporte.
        </p>
      )}
    </div>
  );
}

export default ReportesView;
