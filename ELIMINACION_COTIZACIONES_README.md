# Funcionalidad de Eliminación y Reactivación de Cotizaciones

## Resumen de Cambios Implementados

Se ha agregado la funcionalidad para eliminar (soft delete) y reactivar cotizaciones en el sistema de logística TV. Los cambios incluyen:

### 1. Backend (Node.js/Express + Prisma)

#### Base de Datos
- **Nuevo estado**: Se agregó `'eliminada'` al enum `estado_cotizacion`
- **Migración**: Se debe ejecutar el archivo `backend/migrations/add_estado_eliminada.sql`

#### Controlador (`cotizaciones.controller.js`)
- **Función `eliminarCotizacion`**: Realiza soft delete cambiando estado a 'eliminada'
  - Libera reservas de stock si la cotización estaba aceptada
  - Registra el motivo en observaciones con timestamp
  - Registra movimientos de stock de liberación

- **Función `reactivarCotizacion`**: Reactiva cotizaciones eliminadas
  - Permite seleccionar nuevo estado (en_proceso, enviada, aceptada, rechazada, cancelada)
  - Verifica stock disponible si se reactiva como 'aceptada'
  - Registra motivo de reactivación con timestamp
  - Reserva stock nuevamente si es necesario

#### Rutas (`cotizaciones.routes.js`)
- **DELETE** `/cotizaciones/:id` - Eliminar cotización
- **PUT** `/cotizaciones/:id/reactivar` - Reactivar cotización

#### Transiciones de Estado Actualizadas
```javascript
{
  'en_proceso': ['enviada', 'cancelada', 'eliminada'],
  'enviada': ['aceptada', 'rechazada', 'cancelada', 'eliminada'],
  'aceptada': ['cancelada', 'eliminada'],
  'rechazada': ['en_proceso', 'enviada', 'eliminada'],
  'cancelada': ['eliminada'],
  'eliminada': ['en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada']
}
```

### 2. Frontend (React)

#### API Service (`planesVacunalesApi.js`)
- **`eliminarCotizacion(id, motivo)`**: Llama al endpoint DELETE
- **`reactivarCotizacion(id, estado_destino, motivo)`**: Llama al endpoint PUT

#### Context (`PlanesVacunalesContext.js`)
- Función `eliminarCotizacion`: Actualiza estado local y muestra notificaciones
- Función `reactivarCotizacion`: Actualiza estado local y muestra notificaciones

#### Componente Lista (`CotizacionesList.js`)
- **Botón Eliminar** (ícono papelera): Disponible para todos los estados excepto 'eliminada'
- **Botón Reactivar** (ícono deshacer): Disponible solo para estado 'eliminada'
- **Badge Eliminada**: Nuevo badge oscuro para cotizaciones eliminadas
- **Filtro**: Opción para filtrar por estado 'eliminada'

#### Modales de Confirmación
1. **Modal Eliminar**:
   - Solicita confirmación
   - Campo opcional para motivo
   - Advierte sobre liberación de stock

2. **Modal Reactivar**:
   - Selección obligatoria de estado destino
   - Campo opcional para motivo
   - Advertencia sobre verificación de stock

## Instrucciones de Uso

### Para Eliminar una Cotización
1. En la lista de cotizaciones, hacer clic en el botón de papelera (🗑️)
2. En el modal, opcionalmente escribir un motivo
3. Confirmar la eliminación
4. La cotización cambiará a estado "Eliminada" y aparecerá con badge oscuro

### Para Reactivar una Cotización
1. Filtrar por estado "Eliminada" para ver cotizaciones eliminadas
2. Hacer clic en el botón de reactivar (↩️)
3. Seleccionar el estado destino (obligatorio)
4. Opcionalmente escribir un motivo
5. Confirmar la reactivación
6. La cotización volverá al estado seleccionado

### Efectos en el Stock
- **Al eliminar cotización aceptada**: Se liberan automáticamente las reservas de stock
- **Al reactivar como aceptada**: Se verificará stock disponible y se reservará automáticamente
- **Otros estados**: No afectan el stock

## Instalación y Configuración

### 1. Ejecutar Migración de Base de Datos
```sql
-- Ejecutar en MySQL
ALTER TABLE cotizaciones 
MODIFY COLUMN estado ENUM('en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada', 'eliminada') 
DEFAULT 'en_proceso';
```

### 2. Reiniciar Servicios
- Reiniciar el servidor backend (puerto 3001)
- Refrescar el frontend (puerto 3000)

## Consideraciones Técnicas

### Soft Delete vs Hard Delete
- Se implementó **soft delete** para mantener historial y trazabilidad
- Las cotizaciones eliminadas permanecen en la base de datos
- Se pueden generar reportes incluyendo cotizaciones eliminadas

### Gestión de Stock
- El sistema mantiene consistencia en las reservas de stock
- Las eliminaciones liberan stock automáticamente
- Las reactivaciones validan disponibilidad antes de reservar

### Auditoria
- Todos los cambios se registran en el campo `observaciones`
- Se incluye timestamp y usuario (cuando esté disponible)
- Los motivos son opcionales pero recomendados

### Estados Válidos de Transición
- Desde cualquier estado se puede eliminar
- Desde eliminada se puede ir a cualquier otro estado
- Se mantienen las validaciones existentes para otros cambios

## Archivos Modificados

### Backend
- `backend/prisma/schema.prisma` - Enum actualizado
- `backend/src/controllers/cotizaciones.controller.js` - Nuevas funciones
- `backend/src/routes/cotizaciones.routes.js` - Nuevas rutas
- `backend/migrations/add_estado_eliminada.sql` - Script de migración

### Frontend
- `frontend/src/services/planesVacunalesApi.js` - Nuevas funciones API
- `frontend/src/context/PlanesVacunalesContext.js` - Context actualizado
- `frontend/src/components/planesVacunales/CotizacionesList.js` - UI actualizada

## Testing

Para probar la funcionalidad:
1. Crear una cotización de prueba
2. Cambiar su estado a 'aceptada' para que reserve stock
3. Eliminarla y verificar que libera stock
4. Reactivarla y verificar que vuelve a reservar stock
5. Probar diferentes estados de reactivación

La funcionalidad está lista para uso en producción tras ejecutar la migración de base de datos.