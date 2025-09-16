# DOCUMENTO TÉCNICO DE REFERENCIA - IMPLEMENTACIÓN FRONTEND LOGÍSTICA TV

## 1. RESUMEN GENERAL

Este documento detalla el estado actual, faltantes y plan de entregables para la implementación completa del frontend del sistema Logística TV, en base a la documentación técnica y el backend ya implementado.

---

## 2. ESTADO ACTUAL DEL FRONTEND

### 2.1 Sprints Completos
- **Sprint 1: Planes Vacunales**
  - Listado, creación, edición y detalle de planes vacunales
  - Gestión de listas de precios
  - API de planes vacunales implementada
- **Sprint 2: Cotizaciones**
  - Listado, creación, edición y detalle de cotizaciones
  - Visualización de calendario de vacunación
  - API de cotizaciones implementada

### 2.2 Sprints Faltantes (0% Implementado)
- **Sprint 3: Gestión de Stock**
- **Sprint 4: Seguimiento de Dosis**
- **Sprint 5: Facturación**
- **Sprint 6: Reportes y Dashboard**

---

## 3. FALTANTES DETALLADOS POR SPRINT

### 3.1 Sprint 3 - Gestión de Stock
- Panel de estado de stock
- Registro de movimientos de stock
- Sistema de alertas de stock bajo
- Gestión de reservas
- Verificación de disponibilidad

### 3.2 Sprint 4 - Seguimiento de Dosis
- Registro de aplicaciones de dosis
- Registro de retiros de campo
- Panel de seguimiento de cumplimiento
- Sistema de notificaciones
- Dashboard de seguimiento

### 3.3 Sprint 5 - Facturación
- Configuración de modalidades de facturación
- Generación de facturas
- Gestión de estados de facturas
- Reportes financieros
- Registro de pagos

### 3.4 Sprint 6 - Reportes y Dashboard
- Historial de precios por producto
- Análisis de tendencias
- Métricas de rendimiento
- Dashboard ejecutivo
- Reportes avanzados

---

## 4. PLAN DE ENTREGABLES Y PASOS

### 4.1 Etapa 1: Sprint 3 - Gestión de Stock
- **Paso 1.1:** API de Stock en Frontend
  - Implementar funciones: getMovimientosStock, registrarMovimiento, getEstadoStock, getAlertasStock, getReservasStock, crearReserva, liberarReserva, verificarDisponibilidad, getResumenStock
- **Paso 1.2:** Componentes Base de Stock
  - StockDashboard.js, MovimientosStock.js, AlertasStock.js, ReservasStock.js
- **Paso 1.3:** Integración con Cotizaciones
  - Verificación de disponibilidad, reserva automática, indicadores de stock

### 4.2 Etapa 2: Sprint 4 - Seguimiento de Dosis
- **Paso 2.1:** API de Seguimiento
  - Funciones: registrarAplicacion, getAplicaciones, registrarRetiro, getRetiros, getCumplimiento, evaluarCumplimiento, getNotificaciones, getDashboardSeguimiento
- **Paso 2.2:** Componentes de Seguimiento
  - SeguimientoDashboard.js, AplicacionesDosis.js, RetirosCampo.js, CumplimientoPanel.js, NotificacionesCenter.js
- **Paso 2.3:** Calendario Visual Avanzado
  - Calendario interactivo, vista semanal/mensual, indicadores visuales

### 4.3 Etapa 3: Sprint 5 - Facturación
- **Paso 3.1:** API de Facturación
  - Funciones: generarFactura, getFacturas, getFacturaDetalle, cambiarEstadoFactura, configurarFacturacion, getReporteFinanciero
- **Paso 3.2:** Componentes de Facturación
  - FacturacionDashboard.js, FacturasList.js, FacturaDetalle.js, ConfiguracionFacturacion.js, ReportesFinancieros.js
- **Paso 3.3:** Integración Financiera
  - Links desde cotizaciones, estados financieros en dashboard, alertas de vencimientos

### 4.4 Etapa 4: Sprint 6 - Reportes y Dashboard
- **Paso 4.1:** API de Reportes
  - Funciones: getTendenciasPrecios, getAnalisisListas, getProductosRentabilidad, getMetricasPlanes, getMetricasOperativas, getMetricasRendimiento, getResumenEjecutivo
- **Paso 4.2:** Dashboard Ejecutivo
  - DashboardEjecutivo.js, ReportesAvanzados.js, TendenciasPrecios.js, MetricasRendimiento.js
- **Paso 4.3:** Optimizaciones Finales
  - Optimización de rendimiento, cache, navegación, responsive

---

## 5. DEPENDENCIAS Y PRIORIDADES

- **Sprint 3** es prerequisito para Sprint 4 (seguimiento depende de stock)
- **Sprint 4** es prerequisito para Sprint 5 (facturación depende de seguimiento)
- **Sprint 6** requiere datos de todos los sprints anteriores
- Prioridad alta: Stock y Seguimiento
- Prioridad media: Facturación
- Prioridad baja: Reportes

---

## 6. MÉTRICAS Y TIEMPOS ESTIMADOS

- **Componentes a crear:** 20+
- **Líneas de código estimadas:** ~8,000
- **APIs a integrar:** 32 endpoints
- **Tiempo total estimado:** 13-17 días de desarrollo

---

## 7. RECOMENDACIONES

- Comenzar por Sprint 3 (Stock)
- Validar cada etapa con pruebas funcionales
- Documentar cada componente y API
- Mantener este documento actualizado como referencia

---

*Documento generado automáticamente el 15 de septiembre de 2025 para uso interno del equipo de desarrollo frontend.*
