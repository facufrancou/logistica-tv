import React, { useEffect, useRef, useState } from "react";
import {
  getPedidosPorSemana,
  getUltimoPedidoPorCliente,
} from "../services/api";
import "./VistaSemanal.css";

function VistaSemanal() {
  const [semanas, setSemanas] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [detallePedido, setDetallePedido] = useState(null);
  const semanaActual = getNumeroSemana(new Date());

  // Referencias para cada columna
  const refs = useRef([]);

  useEffect(() => {
    getPedidosPorSemana().then(setSemanas).catch(console.error);
  }, []);

  useEffect(() => {
    // Scroll automático a la semana actual al montar
    if (refs.current[semanaActual - 1]) {
      refs.current[semanaActual - 1].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [semanas]);

  const abrirModal = async (id_cliente) => {
    try {
      const detalle = await getUltimoPedidoPorCliente(id_cliente);
      setDetallePedido(detalle);
      setShowModal(true);
    } catch (err) {
      console.error("Error al abrir modal:", err);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setDetallePedido(null);
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">📦 Vista Semanal de Pedidos</h2>

      <div className="carrusel-semanal">
        {Array.from({ length: 52 }, (_, i) => {
          const semana = i + 1;
          const clientesSemana = semanas[semana] || [];

          // Agrupar por cliente para evitar duplicados
          const clientesUnicos = Object.values(
            clientesSemana.reduce((acc, item) => {
              acc[item.id_cliente] = item;
              return acc;
            }, {})
          );

          return (
            <div
              key={semana}
              className={`tarjeta-semana ${
                semana === semanaActual ? "semana-actual" : ""
              }`}
              ref={(el) => (refs.current[i] = el)}
            >
              <h5 className="titulo-semana">SEM {semana}</h5>
              <ul className="list-unstyled">
                {clientesUnicos.map((c, j) => (
                  <li key={`${c.id_cliente}-${j}`}>
                    <button
                      className="btn-nombre"
                      onClick={() => abrirModal(c.id_cliente)}
                    >
                      {c.cliente}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {showModal && detallePedido && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "#00000099" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Último Pedido</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Cliente:</strong> {detallePedido.cliente}
                </p>
                <p>
                  <strong>ID Pedido:</strong> {detallePedido.id_pedido}
                </p>
                <p>
                  <strong>Fecha:</strong>{" "}
                  {new Date(detallePedido.fecha_pedido).toLocaleString("es-AR")}
                </p>
                <hr />
                <h6>Productos:</h6>
                <ul>
                  {detallePedido.productos.map((p, i) => (
                    <li key={i}>
                      <strong>{p.nombre}</strong>: {p.descripcion} –{" "}
                      <em>Cantidad:</em> {p.cantidad}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cerrarModal}>
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

function getNumeroSemana(fecha) {
  const primerDiaAño = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha - primerDiaAño) / (24 * 60 * 60 * 1000));
  return Math.ceil((dias + primerDiaAño.getDay() + 1) / 7);
}

export default VistaSemanal;
