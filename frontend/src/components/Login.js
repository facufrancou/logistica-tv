import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import LoginAnimation from './common/LoginAnimation';
import { FaUser, FaLock, FaAngleRight } from 'react-icons/fa';
import './Login.css';

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showError } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Limpia el estado si el usuario llega a la página de login
  // y añade la animación de entrada
  useEffect(() => {
    setEmail('');
    setPassword('');
    setShowAnimation(false);
    setIsLoading(false);
    
    // Bloquear el scroll
    document.body.style.overflow = 'hidden';
    
    // Mostrar el formulario con una animación de entrada
    const timer = setTimeout(() => {
      setShowForm(true);
    }, 1200);
    
    return () => {
      // Restaurar el scroll cuando el componente se desmonte
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      setShowAnimation(true);
      
      // Esperar 2 segundos antes de redirigir para mostrar la animación
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      showError('Error de acceso', 'Email o contraseña incorrectos');
    }
  };

  if (showAnimation) {
    return <LoginAnimation />;
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="gradient-overlay"></div>
        <div className="particles"></div>
      </div>
      
      <div className="login-brand">
        
        <h1 className="login-brand-name">Sistema de Gestión</h1>
        
      </div>
      
      <div className={`login-container ${showForm ? 'active' : ''}`}>
        <div className="login-card">
          <div className="login-logo">
            <img src="/img/logo.svg" alt="Tierra Volga" />
          </div>
          <h2 className="login-title">Bienvenido</h2>
          <p className="login-subtitle">Ingrese sus credenciales para continuar</p>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <div className="input-group">
                <div className="input-group-text">
                  <FaUser />
                </div>
                <input 
                  type="text"
                  className="form-control" 
                  placeholder="usuario"
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-group">
              <div className="input-group-text">
                <FaLock />
              </div>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-footer">
            <button 
              type="submit" 
              className="btn-login" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="login-spinner"></span>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <FaAngleRight className="btn-icon-right" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

export default Login;
