import React, { useEffect, useState } from 'react';
import './LoginAnimation.css';
import { FaCheck, FaLock } from 'react-icons/fa';

const LoginAnimation = () => {
  const [animationStep, setAnimationStep] = useState(1);
  
  useEffect(() => {
    // Animación de múltiples pasos
    const timer1 = setTimeout(() => setAnimationStep(2), 600); // Mostrar check
    const timer2 = setTimeout(() => setAnimationStep(3), 1200); // Mostrar mensaje
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="login-success-container">
      <div className="login-success-card">
        <div className="logo-container">
          <img src="/img/logo.svg" alt="Tierra Volga" className="login-animation-logo" />
        </div>
        <div className="animation-steps">
          {/* Paso 1: Círculo inicial con candado */}
          <div className={`animation-step step-1 ${animationStep >= 1 ? 'active' : ''}`}>
            <div className="circle">
              <FaLock />
            </div>
          </div>
          
          {/* Paso 2: Check mark */}
          <div className={`animation-step step-2 ${animationStep >= 2 ? 'active' : ''}`}>
            <div className="circle success">
              <FaCheck />
            </div>
          </div>
          
          {/* Paso 3: Mensaje final */}
          <div className={`animation-step step-3 ${animationStep >= 3 ? 'active' : ''}`}>
            <h2 className="success-title">¡Acceso Correcto!</h2>
            <p className="success-subtitle">Redirigiendo al sistema...</p>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="success-particles"></div>
    </div>
  );
};

export default LoginAnimation;