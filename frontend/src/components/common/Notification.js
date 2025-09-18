import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './Notification.css';

/**
 * Componente de notificación moderno para reemplazar alertas tradicionales
 * @param {string} type - Tipo de notificación: 'success', 'error', 'warning', 'info'
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {number} duration - Duración en ms (por defecto 5000ms)
 * @param {function} onClose - Función para cerrar la notificación
 */
const Notification = ({ type = 'info', title, message, duration = 5000, onClose }) => {
  console.log('Notification renderizado con props:', { type, title, message, duration });
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  
  // Actualizar la referencia cuando onClose cambie
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
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
    console.log('closeNotification llamado');
    setVisible(false);
    setTimeout(() => {
      console.log('Llamando onClose después de la animación');
      if (onCloseRef.current) onCloseRef.current();
    }, 300); // Tiempo para la animación de salida
  }, []);
  
  useEffect(() => {
    console.log('useEffect duration:', duration);
    if (duration !== null && duration > 0) {
      console.log('Configurando timer para', duration, 'ms');
      timerRef.current = setTimeout(() => {
        console.log('Timer ejecutado después de', duration, 'ms, cerrando notificación');
        closeNotification();
      }, duration);
    }
    
    return () => {
      if (timerRef.current) {
        console.log('Limpiando timer');
        clearTimeout(timerRef.current);
      }
    };
  }, [duration]); // Solo duration en las dependencias
  
  return (
    <div 
      className={`notification notification-${type} ${!visible ? 'closing' : ''}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        {title && <div className="notification-title">{title}</div>}
        {message && <div className="notification-message">{message}</div>}
      </div>
      <button 
        className="notification-close" 
        onClick={closeNotification}
        aria-label="Cerrar notificación"
      >
        <FaTimes />
      </button>
    </div>
  );
};

export default Notification;
