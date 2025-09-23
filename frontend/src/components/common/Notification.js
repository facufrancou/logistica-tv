import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

/**
 * Componente de notificación moderno para reemplazar alertas tradicionales
 * @param {string} type - Tipo de notificación: 'success', 'error', 'warning', 'info'
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {number} duration - Duración en ms (por defecto 5000ms)
 * @param {function} onClose - Función para cerrar la notificación
 */
const Notification = ({ type = 'info', title, message, duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle style={{ color: 'var(--color-exito)' }} />;
      case 'error':
        return <FaExclamationCircle style={{ color: 'var(--color-error)' }} />;
      case 'warning':
        return <FaExclamationTriangle style={{ color: 'var(--color-advertencia)' }} />;
      case 'info':
      default:
        return <FaInfoCircle style={{ color: 'var(--color-info)' }} />;
    }
  };
  
  const closeNotification = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 500); // Dar tiempo para la animación de salida
  }, [onClose]);
  
  useEffect(() => {
    if (duration !== null) {
      timerRef.current = setTimeout(closeNotification, duration);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, closeNotification]);
  
  const getColor = () => {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
      default:
        return '#17a2b8';
    }
  };

  if (!visible) return null;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px',
      borderRadius: '10px',
      background: 'white',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
      borderLeft: `4px solid ${getColor()}`,
      marginBottom: '10px',
      position: 'relative',
      minWidth: '300px'
    }}>
      <div style={{ marginRight: '12px', fontSize: '1.5rem', color: getColor() }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>}
        {message && <div style={{ fontSize: '0.875rem', color: '#333' }}>{message}</div>}
      </div>
      <button 
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          color: '#777',
          padding: 0,
          marginLeft: '8px'
        }}
        onClick={closeNotification}
      >
        <FaTimes />
      </button>
    </div>
  );
};

export default Notification;
