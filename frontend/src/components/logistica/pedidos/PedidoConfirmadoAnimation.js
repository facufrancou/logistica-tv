import React, { useEffect, useState } from 'react';
import '../../common/LoginAnimation.css';
import './PedidoAnimation.css';
import { FaCheck, FaShoppingCart } from 'react-icons/fa';

const PedidoConfirmadoAnimation = ({ onComplete }) => {
  const [animationStep, setAnimationStep] = useState(1);
  
  useEffect(() => {
    // Animación de múltiples pasos
    const timer1 = setTimeout(() => setAnimationStep(2), 600); // Mostrar check
    const timer2 = setTimeout(() => setAnimationStep(3), 1200); // Mostrar mensaje
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3000); // Llamar al callback después de 3 segundos
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="login-success-container">
      <div className="login-success-card">
        <div className="logo-container">
          <img src="/img/logo.svg" alt="Tierra Volga" className="login-animation-logo" />
        </div>
        <div className="animation-steps">
          {/* Paso 1: Círculo inicial con carrito */}
          <div className={`animation-step step-1 ${animationStep >= 1 ? 'active' : ''}`}>
            <div className="circle">
              <FaShoppingCart />
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
            <h2 className="success-title">¡Pedido Confirmado!</h2>
            <p className="success-subtitle">Su pedido ha sido registrado correctamente</p>
            <p className="success-message">Gracias por confiar en Tierra Volga</p>
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

export default PedidoConfirmadoAnimation;
