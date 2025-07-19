import React from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import './Alert.css';

/**
 * Componente de alerta moderna inline para mensajes dentro del contenido
 * @param {string} type - Tipo de alerta: 'success', 'error', 'warning', 'info'
 * @param {string} message - Mensaje de la alerta
 * @param {boolean} dismissible - Si la alerta puede cerrarse (opcional)
 * @param {function} onDismiss - Función para cerrar la alerta (opcional)
 */
const Alert = ({ type = 'info', message, dismissible = false, onDismiss }) => {
  if (!message) return null;
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="alert-icon" />;
      case 'error':
        return <FaExclamationCircle className="alert-icon" />;
      case 'warning':
        return <FaExclamationTriangle className="alert-icon" />;
      case 'info':
      default:
        return <FaInfoCircle className="alert-icon" />;
    }
  };
  
  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-content">
        {getIcon()}
        <div className="alert-message">{message}</div>
      </div>
      {dismissible && onDismiss && (
        <button className="alert-dismiss" onClick={onDismiss} aria-label="Cerrar">
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;
