import React, { useEffect, useRef } from 'react';

const SimpleNotification = ({ type, title, message, duration = 5000, onClose }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onClose]);

  const handleClose = () => {
    if (onClose) onClose();
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const style = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: getBackgroundColor(),
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    maxWidth: '400px',
    minWidth: '300px',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  };

  return (
    <div style={style}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {title || type.toUpperCase()}
        </div>
        {message && (
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {message}
          </div>
        )}
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px 8px'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default SimpleNotification;