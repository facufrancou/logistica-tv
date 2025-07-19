// Este archivo contiene funciones para manejar los menús desplegables
// de manera nativa sin depender de Bootstrap.js

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar los menús desplegables
  initDropdowns();
});

function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-link.dropdown-toggle');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    if (!toggle || !menu) return;
    
    // Variable para controlar el estado del menú
    let isOpen = false;
    let timeout = null;
    
    // Mostrar el menú al hacer clic en el toggle
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      isOpen = !isOpen;
      
      if (isOpen) {
        menu.style.display = 'block';
        setTimeout(() => {
          menu.style.opacity = '1';
          menu.style.visibility = 'visible';
        }, 10);
      } else {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        setTimeout(() => {
          menu.style.display = 'none';
        }, 300);
      }
      
      // Actualizar el atributo aria-expanded
      toggle.setAttribute('aria-expanded', isOpen);
    });
    
    // También gestionar el hover para una experiencia más amigable
    dropdown.addEventListener('mouseenter', function() {
      if (timeout) clearTimeout(timeout);
      menu.style.display = 'block';
      setTimeout(() => {
        menu.style.opacity = '1';
        menu.style.visibility = 'visible';
      }, 10);
      toggle.setAttribute('aria-expanded', 'true');
      isOpen = true;
    });
    
    dropdown.addEventListener('mouseleave', function() {
      timeout = setTimeout(() => {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        setTimeout(() => {
          menu.style.display = 'none';
        }, 300);
        toggle.setAttribute('aria-expanded', 'false');
        isOpen = false;
      }, 300); // Retraso antes de ocultar el menú
    });
    
    // Evitar que el menú se cierre cuando se interactúa con él
    menu.addEventListener('mouseenter', function() {
      if (timeout) clearTimeout(timeout);
    });
    
    menu.addEventListener('mouseleave', function() {
      timeout = setTimeout(() => {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        setTimeout(() => {
          menu.style.display = 'none';
        }, 300);
        toggle.setAttribute('aria-expanded', 'false');
        isOpen = false;
      }, 300);
    });
    
    // Cerrar el menú cuando se hace clic fuera de él
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        setTimeout(() => {
          menu.style.display = 'none';
        }, 300);
        toggle.setAttribute('aria-expanded', 'false');
        isOpen = false;
      }
    });
  });
}
