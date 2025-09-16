import { createContext, useEffect, useState, useContext } from "react";
import { useNotification } from "../context/NotificationContext";
import { login as loginApi, logout as logoutApi, verificarSesion } from "../services/planesVacunalesApi";
import "../styles/loading.css";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al iniciar, verificar si ya hay sesión (primero intentar nueva API, luego legacy)
  useEffect(() => {
    const verificarSesiones = async () => {
      try {
        // Intentar verificar sesión con la nueva API de planes vacunales
        const data = await verificarSesion();
        if (data && data.usuario) {
          setUsuario({ ...data.usuario, apiType: 'planes-vacunales' });
          setCargando(false);
          return;
        }
      } catch (error) {
        // Si falla la nueva API, intentar con la API legacy
        try {
          const res = await fetch("http://localhost:3001/auth/me", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setUsuario({ ...data, apiType: 'legacy' });
              setCargando(false);
              return;
            }
          }
        } catch (legacyError) {
          console.log("No hay sesión activa en ninguna API");
        }
      }
      
      // Si no hay sesión en ninguna API
      setUsuario(null);
      setCargando(false);
    };

    verificarSesiones();
  }, []);

  const login = async (email, password) => {
    try {
      // Intentar login con la nueva API de planes vacunales
      const data = await loginApi(email, password);
      if (data && data.usuario) {
        setUsuario({ ...data.usuario, apiType: 'planes-vacunales' });
        return true;
      }
    } catch (error) {
      // Si falla la nueva API, intentar con la API legacy
      try {
        const res = await fetch("http://localhost:3001/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) throw new Error("Login incorrecto");
        const data = await res.json();
        setUsuario({ ...data.usuario, apiType: 'legacy' });
        return true;
      } catch (legacyError) {
        throw new Error("Email o contraseña incorrectos");
      }
    }
  };

  const logout = async () => {
    try {
      if (usuario?.apiType === 'planes-vacunales') {
        await logoutApi();
      } else {
        await fetch("http://localhost:3001/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setUsuario(null);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {cargando ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Verificando sesión...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
