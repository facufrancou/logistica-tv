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
  
  if (!visible) return null;
  
  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        {title && <div className="notification-title">{title}</div>}
        {message && <div className="notification-message">{message}</div>}
      </div>
      <button className="notification-close" onClick={closeNotification}>
        <FaTimes />
      </button>
    </div>
  );
};

export default Notification;
