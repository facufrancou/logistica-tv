# Logística TV

## Descripción General

Logística TV es un sistema de gestión logística con un **backend** (Node.js/Express) y un **frontend** (React). Proporciona funcionalidades para:
- **Autenticación**: Inicio/cierre de sesión y gestión de sesiones de usuario.
- **Operaciones CRUD**: Para clientes, productos, pedidos y proveedores.
- **Control de Acceso Basado en Roles**: Middleware que aplica roles de usuario para rutas protegidas.

---

## Estructura del Proyecto

### Backend
- **`app.js`**: Configuración principal de la aplicación Express (CORS, sesión, rutas).
- **Rutas**: Ubicadas en `backend/routes/`, por ejemplo, `auth.routes.js`, `productos.routes.js`.
- **Controladores**: Lógica de negocio en `backend/controllers/`.
- **Base de Datos**: Integración con MySQL mediante `mysql2` en `backend/db/`.

### Frontend
- **Componentes React**: Ubicados en `frontend/src/components/`.
- **Servicios API**: Centralizados en `frontend/src/services/api.js`.
- **Contexto de Autenticación**: Gestionado en `frontend/src/context/AuthContext.js`.

---

## Flujos de Trabajo para Desarrolladores

### Backend
- **Iniciar el servidor**:
  ```bash
  node server.js
  ```
- **Variables de Entorno**:
  - Definidas en `backend/.env`.
  - Ejemplo: `JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`.

- **Base de Datos**:
  - Scripts SQL para el esquema y datos de prueba están en `backend/sql/`.

- **Probar Endpoints de la API**:
  - Usa Postman o cURL para probar rutas como `/auth/login` o `/productos`.

### Frontend
- **Iniciar la aplicación React**:
  ```bash
  npm start
  ```
- **Construir para producción**:
  ```bash
  npm run build
  ```

---

## Patrones y Convenciones

### Backend
- **Middleware**:
  - Autenticación: `verificarAutenticacion` en `middlewares/auth.js`.
  - Control de roles: `verificarRol` en `middlewares/auth.js`.

- **Manejo de Errores**:
  - Usa `try-catch` en los controladores para manejar errores de base de datos y lógica.

- **Gestión de Sesiones**:
  - Configurada en `app.js` usando `express-session`.

### Frontend
- **Llamadas a la API**:
  - Centralizadas en `frontend/src/services/api.js`.
  - Ejemplo:
    ```javascript
    const res = await fetch('/api/productos', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    ```

- **Gestión de Estado**:
  - El estado de autenticación se gestiona mediante `AuthContext.js`.

---

## Puntos de Integración

- **Comunicación Frontend-Backend**:
  - CORS está habilitado en `app.js` con `credentials: true`.
  - Asegúrate de que el encabezado `Authorization` se envíe con las solicitudes API.

- **Base de Datos**:
  - MySQL se utiliza para almacenamiento persistente.
  - La conexión se gestiona en `backend/db/connection.js`.

---

## Ejemplos

### Agregar una Nueva Ruta
1. Crea un nuevo archivo en `backend/routes/`.
2. Define la ruta y enlázala a un controlador.
3. Registra la ruta en `app.js`.

Ejemplo:
```javascript
// backend/routes/example.routes.js
const express = require('express');
const router = express.Router();
const { exampleController } = require('../controllers/example.controller');
router.get('/example', exampleController);
module.exports = router;
```

---

## Notas
- Siempre valida la presencia de variables de entorno antes de usarlas.
- Sigue los patrones existentes para middleware y estructura de la API.
- Al agregar nuevas funcionalidades, asegúrate de que se integren sin problemas con la arquitectura existente.
