import React, { useState } from "react";

function UsuarioForm() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol_id, setRolId] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría la llamada al backend para crear el usuario
    // fetch('/api/usuarios', { ... })
    alert("Usuario creado (simulado)");
  };

  return (
    <div className="container mt-4">
      <h3>Crear usuario de sistema</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre</label>
          <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Perfil</label>
          <select className="form-select" value={rol_id} onChange={e => setRolId(Number(e.target.value))}>
            <option value={1}>Usuario</option>
            <option value={2}>Administrador</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Crear usuario</button>
      </form>
    </div>
  );
}

export default UsuarioForm;
