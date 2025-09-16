# Tierra Volga - Sistema de Gestión Integral

## 1. Funcionalidades Proyectadas (Roadmap)

A continuación se detallan las funcionalidades planificadas para el sistema, con su función y aplicación general:

### Gestión de Stock y Lotes
- Control de inventario por producto, lote y ubicación.
- Alertas de stock mínimo y vencimientos.
- Aplicación: Evita quiebres de stock y permite trazabilidad de productos.

### Gestión de Compras
- Registro y seguimiento de órdenes de compra a proveedores.
- Recepción de mercadería y actualización automática de stock.
- Aplicación: Optimiza la relación con proveedores y la reposición de productos.

### Gestión de Ventas y Facturación
- Presupuestos y pedidos de clientes.
- Facturación electrónica y remitos.
- Aplicación: Facilita la gestión comercial y la documentación legal.

### Gestión de Cuentas Corrientes y Cobranzas
- Seguimiento de cuentas corrientes, pagos y saldos.
- Gestión de cobranzas y vencimientos.
- Aplicación: Mejora el control financiero y la relación con clientes.

### Reportes y Tableros
- Reportes de ventas, compras, stock, cuentas corrientes, rentabilidad.
- Tablero de indicadores clave (KPI).
- Aplicación: Permite la toma de decisiones basada en datos.

### Agenda y Recordatorios
- Recordatorios automáticos para próximos pedidos, vencimientos, visitas comerciales.
- Aplicación: Mejora la gestión comercial y la atención al cliente.

### Integración y Automatización
- Integración con n8n para automatización de procesos (notificaciones, sincronización, reportes automáticos).
- Aplicación: Reduce tareas manuales y mejora la eficiencia operativa.

### Gestión de usuarios vinculados a clientes
- Permite que clientes accedan a su cuenta y gestionen pedidos.
- Aplicación: Portal de autogestión para clientes.

### Auditoría y registro de actividad
- Registro de acciones de usuarios para trazabilidad y seguridad.
- Aplicación: Control interno y cumplimiento normativo.

### Gestión de logística y reparto
- Planificación de rutas de entrega y seguimiento de envíos.
- Aplicación: Optimiza la distribución y reduce costos logísticos.

### Gestión de campañas y marketing
- Envío de promociones y novedades a clientes.
- Aplicación: Mejora la comunicación y aumenta las ventas.

---

## 2. Funcionalidades Implementadas (Detalle técnico)

A continuación se describen las funcionalidades ya aplicadas en el sistema:

### Autenticación y Seguridad
- Inicio/cierre de sesión y gestión de sesiones de usuario.
- Autorización por roles (usuario, administrador).
- Control de acceso granular en frontend y backend.
- Auditoría de acciones de usuario.

### Gestión de Clientes
- Alta, baja, modificación y consulta de clientes.
- Vinculación de productos habilitados por cliente.
- Gestión de estado (habilitado/inhabilitado) y próxima fecha de pedido.

### Gestión de Productos
- Alta, baja, modificación y consulta de productos.
- Vinculación con proveedores.
- Control de stock y precios.

### Gestión de Proveedores
- Alta, baja, modificación y consulta de proveedores.
- Estado de proveedor (activo/inactivo).

### Gestión de Pedidos
- Alta, baja, modificación y consulta de pedidos.
- Detalle de productos por pedido.
- Estado de pedido (pendiente, en proceso, completado).
- Generación de links de acceso a pedidos.

### Gestión de Cuentas Corrientes
- Alta y consulta de cuentas corrientes vinculadas a clientes.
- Registro de movimientos (debe/haber).

### Auditoría
- Registro de acciones relevantes de usuarios en la base de datos.

### Paneles y Reportes
- Paneles de gestión y reportes básicos de ventas, clientes y productos.

### Sistema de Planes Vacunales (NUEVO - 2025)
Implementación completa del sistema de gestión de planes de vacunación veterinaria.

#### Sprint 1: Planes y Precios ✅ COMPLETADO
- **4 modelos nuevos**: PlanVacunal, ListaPrecio, PlanProducto, PrecioPorLista
- **11 endpoints**: CRUD completo de planes y listas de precios
- **Funcionalidades**: Creación de planes por especie/edad, múltiples listas de precios, cálculo automático de totales
- **Validación**: 5 listas de precios activas, 1 plan test con 3 productos
- **Documentación**: `/DOCS/SPRINT-1-PLANES-PRECIOS.md`

#### Sprint 2: Cotizaciones y Calendario ✅ COMPLETADO  
- **3 modelos nuevos**: Cotizacion, DetalleCotizacion, CalendarioVacunacion
- **8 endpoints**: Gestión completa de cotizaciones con calendario automático
- **Funcionalidades**: Cotizaciones basadas en planes, generación automática de calendario de aplicaciones, control de estados
- **Validación**: 1 cotización activa con 9 aplicaciones programadas
- **Documentación**: `/DOCS/SPRINT-2-COTIZACIONES-CALENDARIO.md`

#### Sprint 3: Gestión Avanzada de Stock ✅ COMPLETADO
- **2 modelos nuevos**: MovimientoStock, ReservaStock  
- **9 endpoints**: Control granular de inventario y reservas automáticas
- **Funcionalidades**: Tracking de movimientos, reservas automáticas por cotización, alertas de stock bajo, verificación de disponibilidad
- **Integración**: 100% integrado con sistema de cotizaciones
- **Validación**: 152 productos con control de stock, 4 movimientos registrados
- **Documentación**: `/DOCS/SPRINT-3-GESTION-STOCK.md`

**Próximo Sprint 4**: Seguimiento de Dosis y Retiros (En planificación)

### Integración con n8n
- API preparada para integración con n8n y otros sistemas de automatización.

### Estructura del Proyecto
- **backend/**: API Node.js/Express, controladores, rutas, modelos, SQL.
  - `controllers/`: Controladores de negocio (auth, clientes, productos, pedidos, proveedores, planesVacunales, cotizaciones, stock)
  - `routes/`: Definición de rutas REST API
  - `prisma/`: Schema de base de datos y migraciones
  - `middlewares/`: Autenticación y validaciones
- **frontend/**: React, componentes, servicios, contexto de autenticación.
- **sql/**: Scripts de estructura y datos de la base.
- **DOCS/**: Documentación técnica de sprints y funcionalidades.
  - `SPRINT-1-PLANES-PRECIOS.md`: Documentación completa del sistema de planes
  - `SPRINT-2-COTIZACIONES-CALENDARIO.md`: Sistema de cotizaciones y calendario automático  
  - `SPRINT-3-GESTION-STOCK.md`: Gestión avanzada de stock y reservas

### Propiedad Intelectual
Este sistema y su código fuente son propiedad de Tierra Volga y sus autores. Queda prohibida la copia, distribución o uso no autorizado de ideas, código o arquitectura sin consentimiento expreso. El sistema está protegido por derechos de autor y acuerdos de confidencialidad.

---

Este README documenta el alcance, seguridad y proyección del sistema, preservando la propiedad intelectual y facilitando la colaboración profesional.
