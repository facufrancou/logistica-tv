import React from 'react';
import './Card.css';

/**
 * Componente de tarjeta (Card) moderna y reutilizable
 * @param {ReactNode} children - Contenido de la tarjeta
 * @param {string} title - Título de la tarjeta (opcional)
 * @param {ReactNode} actions - Acciones a mostrar en la cabecera (opcional)
 * @param {ReactNode} footer - Pie de la tarjeta (opcional)
 * @param {string} className - Clases CSS adicionales (opcional)
 * @param {string} variant - Variante de la tarjeta: 'default', 'outline', 'flat' (opcional)
 * @param {boolean} hoverable - Si la tarjeta debe tener efecto hover (opcional)
 */
const Card = ({ 
  children, 
  title, 
  actions,
  footer,
  className = '',
  variant = 'default',
  hoverable = false,
  ...props 
}) => {
  const cardClasses = [
    'card',
    `card-${variant}`,
    hoverable ? 'card-hoverable' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={cardClasses} {...props}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Componente para agrupar tarjetas
 * @param {ReactNode} children - Cards a agrupar
 * @param {string} columns - Número de columnas o 'auto' (opcional)
 */
export const CardGroup = ({ children, columns = 'auto', className = '', ...props }) => {
  const style = columns !== 'auto' 
    ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } 
    : {};
    
  return (
    <div className={`card-group ${className}`} style={style} {...props}>
      {children}
    </div>
  );
};

/**
 * Componente para estadísticas en tarjetas
 * @param {string} label - Etiqueta del stat
 * @param {string|number} value - Valor a mostrar
 * @param {ReactNode} icon - Icono (opcional)
 * @param {string} trend - Tendencia: 'up', 'down', 'neutral' (opcional)
 * @param {string} trendLabel - Texto para la tendencia (opcional)
 */
export const CardStat = ({ 
  label, 
  value, 
  icon, 
  trend,
  trendLabel,
  ...props 
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return '▲';
    if (trend === 'down') return '▼';
    return '●';
  };
  
  const getTrendClass = () => {
    if (trend === 'up') return 'trend-up';
    if (trend === 'down') return 'trend-down';
    return 'trend-neutral';
  };
  
  return (
    <div className="card-stat" {...props}>
      {icon && <div className="card-stat-icon">{icon}</div>}
      <div className="card-stat-content">
        <div className="card-stat-label">{label}</div>
        <div className="card-stat-value">{value}</div>
        {trend && trendLabel && (
          <div className={`card-stat-trend ${getTrendClass()}`}>
            <span className="trend-icon">{getTrendIcon()}</span>
            <span className="trend-label">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
