import React, { useState, useEffect, createContext, useContext } from 'react';
import './NotificationSystem.css';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    if (duration) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const notifySuccess = (message, duration) => {
    return addNotification(message, 'success', duration);
  };

  const notifyError = (message, duration) => {
    return addNotification(message, 'error', duration);
  };

  const notifyWarning = (message, duration) => {
    return addNotification(message, 'warning', duration);
  };

  const notifyInfo = (message, duration) => {
    return addNotification(message, 'info', duration);
  };

  return (
    <NotificationContext.Provider value={{ 
      notify: addNotification, 
      notifySuccess, 
      notifyError, 
      notifyWarning, 
      notifyInfo, 
      removeNotification 
    }}>
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification 
            key={notification.id}
            {...notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const Notification = ({ id, message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    return () => setIsExiting(true);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Duración de la animación
  };

  return (
    <div className={`notification ${type} ${isExiting ? 'exit' : ''}`}>
      <div className="notification-content">
        <p>{message}</p>
      </div>
      <button className="notification-close" onClick={handleClose}>
        ×
      </button>
    </div>
  );
};

export default NotificationProvider;
