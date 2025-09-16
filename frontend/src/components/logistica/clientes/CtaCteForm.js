import React, { useState, useEffect } from "react";
import { getClientes } from "../../../services/api";

function CtaCteForm() {
  const [clientes, setClientes] = useState([]);
  const [idCliente, setIdCliente] = useState("");
  const [datos, setDatos] = useState({ nroCuenta: "", limite: "", observaciones: "" });

  useEffect(() => {
    getClientes().then(setClientes);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría la llamada al backend para crear la cuenta corriente vinculada al cliente
    // fetch('/api/ctacte', { ... })
    alert("Cuenta Corriente creada (simulado)");
  };

  return (
    <div className="container mt-4">
      <h3>Crear Cuenta Corriente (Cta. Cte.)</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Cliente vinculado</label>
          <select className="form-select" value={idCliente} onChange={e => setIdCliente(e.target.value)} required>
            <option value="">Seleccione</option>
            {clientes.map(c => (
              <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Nro. de Cuenta</label>
          <input className="form-control" value={datos.nroCuenta} onChange={e => setDatos({ ...datos, nroCuenta: e.target.value })} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Límite</label>
          <input className="form-control" type="number" value={datos.limite} onChange={e => setDatos({ ...datos, limite: e.target.value })} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Observaciones</label>
          <textarea className="form-control" value={datos.observaciones} onChange={e => setDatos({ ...datos, observaciones: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit">Crear Cta. Cte.</button>
      </form>
    </div>
  );
}

export default CtaCteForm;
