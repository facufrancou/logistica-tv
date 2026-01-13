import React, { useEffect, useRef, useState } from "react";
import {
  getPedidosPorSemana,
  getUltimoPedidoPorCliente,
} from "../../../services/api";
import "./VistaSemanal.css";

// Función para obtener el rango de fechas de una semana
function getRangoFechasSemana(semana, año) {
  const primerDiaAño = new Date(año, 0, 1);
  const diasHastaSemana = (semana - 1) * 7 - primerDiaAño.getDay() + 1;
  const inicioSemana = new Date(año, 0, 1 + diasHastaSemana);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 6);
  
  const formatFecha = (fecha) => {
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };
  
  return `${formatFecha(inicioSemana)} - ${formatFecha(finSemana)}`;
}

function VistaSemanal() {
  const [semanas, setSemanas] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [detallePedido, setDetallePedido] = useState(null);
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const añoActual = new Date().getFullYear();
  const semanaActual = getNumeroSemana(new Date());

  // Referencias para cada columna
  const refs = useRef([]);

  useEffect(() => {
    getPedidosPorSemana(añoSeleccionado).then(setSemanas).catch(console.error);
  }, [añoSeleccionado]);

  useEffect(() => {
    // Scroll automático a la semana actual al montar
    if (refs.current[semanaActual - 1] && añoSeleccionado === añoActual) {
      refs.current[semanaActual - 1].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [semanas, añoSeleccionado]);

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
    <div className="vista-semanal-container">
      {/* Header */}
      <div className="vista-semanal-header">
        <h2 className="vista-semanal-titulo">
          <span className="icono">📦</span>
          Vista Semanal de Pedidos
        </h2>
        <div className="año-selector">
          <button 
            className="btn-año"
            onClick={() => setAñoSeleccionado(añoSeleccionado - 1)}
            disabled={añoSeleccionado <= 2020}
          >
            ◀
          </button>
          <span className="año-badge">{añoSeleccionado}</span>
          <button 
            className="btn-año"
            onClick={() => setAñoSeleccionado(añoSeleccionado + 1)}
            disabled={añoSeleccionado >= añoActual + 1}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Carrusel de semanas */}
      <div className="carrusel-semanal">
        {Array.from({ length: 52 }, (_, i) => {
          const semana = i + 1;
          const clientesSemana = semanas[semana] || [];
          const esActual = semana === semanaActual && añoSeleccionado === añoActual;

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
              className={`tarjeta-semana ${esActual ? "semana-actual" : ""}`}
              ref={(el) => (refs.current[i] = el)}
            >
              {/* Header de la tarjeta */}
              <div className="tarjeta-header">
                {esActual && <span className="badge-actual">📍 Actual</span>}
                <h5 className="titulo-semana">Semana {semana}</h5>
                <div className="subtitulo-semana">
                  {getRangoFechasSemana(semana, añoSeleccionado)}
                </div>
              </div>

              {/* Contador */}
              <div className="contador-clientes">
                <span className="numero">{clientesUnicos.length}</span>
                <span>{clientesUnicos.length === 1 ? 'cliente' : 'clientes'}</span>
              </div>

              {/* Body con lista de clientes */}
              <div className="tarjeta-body">
                {clientesUnicos.length > 0 ? (
                  <ul className="lista-clientes">
                    {clientesUnicos.map((c, j) => (
                      <li key={`${c.id_cliente}-${j}`}>
                        <button
                          className="btn-nombre"
                          onClick={() => abrirModal(c.id_cliente)}
                        >
                          <span className="icono-cliente">👤</span>
                          {c.cliente}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="tarjeta-vacia">
                    <span className="icono-vacio">📭</span>
                    <span>Sin pedidos</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de detalle */}
      {showModal && detallePedido && (
        <div
          className="modal d-block modal-pedido-detalle"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
          tabIndex="-1"
          onClick={cerrarModal}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📋 Último Pedido</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                ></button>
              </div>
              <div className="modal-body">
                <div className="info-cliente">
                  <h6>👤 Información del Cliente</h6>
                  <div className="info-item">
                    <span className="info-label">Cliente</span>
                    <span className="info-value">{detallePedido.cliente}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">ID Pedido</span>
                    <span className="info-value">#{detallePedido.id_pedido}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Fecha</span>
                    <span className="info-value">
                      {new Date(detallePedido.fecha_pedido).toLocaleDateString("es-AR", {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="productos-lista">
                  <h6>🛒 Productos ({detallePedido.productos.length})</h6>
                  <ul>
                    {detallePedido.productos.map((p, i) => (
                      <li key={i}>
                        <div>
                          <span className="producto-nombre">{p.nombre}</span>
                          {p.descripcion && (
                            <small className="d-block text-muted">{p.descripcion}</small>
                          )}
                        </div>
                        <span className="producto-cantidad">x{p.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-cerrar" onClick={cerrarModal}>
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
