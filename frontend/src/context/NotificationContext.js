import React, { createContext, useState, useContext, useCallback } from 'react';
import Notification from '../components/common/Notification';

// Crear contexto para las notificaciones
const NotificationContext = createContext();

/**
 * Hook personalizado para usar las notificaciones
 * @returns {Object} Funciones para mostrar notificaciones (showSuccess, showError, etc)
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe ser usado dentro de un NotificationProvider');
  }
  return context;
};

/**
 * Proveedor de notificaciones para la aplicación
 * Permite mostrar y gestionar notificaciones de sistema
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  // Función para generar un ID único
  const generateId = useCallback(() => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);
  
  // Función base para mostrar notificaciones
  const showNotification = useCallback((type, title, message, duration = 5000) => {
    const id = generateId();
    
    setNotifications(prev => [
      ...prev,
      { id, type, title, message, duration }
    ]);
    
    return id;
  }, [generateId]);
  
  // Funciones específicas para cada tipo de notificación
  const showSuccess = useCallback((title, message, duration) => {
    return showNotification('success', title, message, duration);
  }, [showNotification]);
  
  const showError = useCallback((title, message, duration) => {
    return showNotification('error', title, message, duration);
  }, [showNotification]);
  
  const showWarning = useCallback((title, message, duration) => {
    return showNotification('warning', title, message, duration);
  }, [showNotification]);
  
  const showInfo = useCallback((title, message, duration) => {
    return showNotification('info', title, message, duration);
  }, [showNotification]);
  
  // Función para eliminar una notificación
  const removeNotification = useCallback(id => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
