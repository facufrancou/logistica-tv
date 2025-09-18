// Script de prueba para notificaciones
// Puedes ejecutar esto en la consola del navegador para probar las notificaciones

// Función para probar notificaciones desde la consola
window.testNotifications = () => {
  // Acceder al hook desde el contexto global (si está disponible)
  const notificationContext = window.React && window.React.useContext && window.notificationHook;
  
  if (notificationContext) {
    console.log('Probando notificaciones...');
    
    // Probar diferentes tipos
    setTimeout(() => {
      notificationContext.showSuccess('Prueba exitosa', 'Esta es una notificación de éxito');
    }, 500);
    
    setTimeout(() => {
      notificationContext.showError('Prueba de error', 'Esta es una notificación de error');
    }, 1500);
    
    setTimeout(() => {
      notificationContext.showWarning('Prueba de advertencia', 'Esta es una notificación de advertencia');
    }, 2500);
    
    setTimeout(() => {
      notificationContext.showInfo('Prueba de información', 'Esta es una notificación informativa');
    }, 3500);
  } else {
    console.error('NotificationContext no disponible');
  }
};

// Instrucciones
console.log('Para probar notificaciones, ejecuta: window.testNotifications()');