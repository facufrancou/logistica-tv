import React from "react";
import { Link } from "react-router-dom";

function SistemaView() {
  return (
    <div className="container mt-4">
      <h2>Sistema</h2>
      <div className="list-group">
        <Link to="/sistema/usuarios" className="list-group-item list-group-item-action">
          Crear usuario de sistema
        </Link>
        <Link to="/sistema/ctacte" className="list-group-item list-group-item-action">
          Crear Cuenta Corriente (Cta. Cte.)
        </Link>
      </div>
    </div>
  );
}

export default SistemaView;
