import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al iniciar, verificar si ya hay sesión
  useEffect(() => {
    fetch('http://localhost:3000/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUsuario(data);
      })
      .catch(() => {
        // No mostrar error visual si no hay sesión
      })
      .finally(() => setCargando(false));
  }, []);

  const login = async (email, password) => {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error('Login incorrecto');
    const data = await res.json();
    setUsuario(data.usuario);
    return true;
  };

  const logout = async () => {
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {cargando ? <div className="text-center mt-5">Cargando...</div> : children}
    </AuthContext.Provider>
  );
}
