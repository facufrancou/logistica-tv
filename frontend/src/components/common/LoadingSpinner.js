import React, { useState, useEffect } from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = "Cargando...", size = "md" }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 100;
        }
        // Progreso más suave: incrementos variables
        const increment = Math.random() * 15 + 5; // Entre 5% y 20%
        return Math.min(prev + increment, 100);
      });
    }, 200); // Actualización cada 200ms

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-4">
      <div className="mt-3 text-center w-100" style={{ maxWidth: '300px' }}>
        <h6 className="mb-3 fw-bold" style={{ color: '#3D2113' }}>
          {message}
        </h6>
        <div className="loading-bar-container mb-3" style={{ height: '22px', borderRadius: '12px', background: '#eee', position: 'relative', overflow: 'hidden' }}>
          <div
            className="loading-bar-animated"
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3D2113 80%, #6e3c1e 100%)',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(61,33,19,0.12)',
              transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              letterSpacing: '1px',
              position: 'absolute',
              left: 0,
              top: 0
            }}
          >
            {progress > 10 && <span style={{ width: '100%' }}>{Math.round(progress)}%</span>}
          </div>
        </div>
        <div className="loading-dots" style={{ margin: '8px 0' }}>
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </div>
        <small className="text-muted d-block mt-2">Por favor espere...</small>
      </div>
    </div>
  );
};

export default LoadingSpinner;