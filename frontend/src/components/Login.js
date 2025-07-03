import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Email o contraseña incorrectos');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <h3 className="mb-3">Iniciar sesión</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label className="form-label">Email</label>
        <input className="form-control mb-2" value={email} onChange={e => setEmail(e.target.value)} />

        <label className="form-label">Contraseña</label>
        <input className="form-control mb-3" type="password" value={password} onChange={e => setPassword(e.target.value)} />

        <button className="btn btn-primary w-100">Ingresar</button>
      </form>
    </div>
  );
}

export default Login;
