# Implementación del Campo `dia_plan` en Calendario de Vacunación

## Descripción

Se ha implementado un nuevo campo `dia_plan` en el modelo `CalendarioVacunacion` que representa el **día del plan** (1, 2, 3... N) calculado desde la fecha de inicio del plan.

Este campo es **bidireccional** con `fecha_programada`:
- Si modificas `dia_plan`, se recalcula automáticamente `fecha_programada`
- Si modificas `fecha_programada`, se recalcula automáticamente `dia_plan`

## Ejemplo de Uso

Para un plan de 4 semanas (28 días) que inicia el **10/11/2025**:
- Primera aplicación en semana 1, día 5 → **14/11/2025** (dia_plan = 5)
- Aplicación en día 16 del plan → **25/11/2025** (dia_plan = 16)

## Pasos de Implementación

### 1. Aplicar Migración SQL

```bash
# Conectarse a MySQL
mysql -u tu_usuario -p tu_base_de_datos

# Ejecutar el script de migración
source backend/migrations/add_dia_plan_to_calendario.sql
```

O ejecutar manualmente:
```sql
ALTER TABLE calendario_vacunacion 
ADD COLUMN dia_plan INT NULL AFTER numero_semana;

UPDATE calendario_vacunacion cv
INNER JOIN cotizaciones cot ON cv.id_cotizacion = cot.id_cotizacion
SET cv.dia_plan = DATEDIFF(cv.fecha_programada, cot.fecha_inicio_plan) + 1
WHERE cv.dia_plan IS NULL;

CREATE INDEX idx_calendario_dia_plan ON calendario_vacunacion(dia_plan);
```

### 2. Regenerar Cliente Prisma

```bash
cd backend
npx prisma generate
```

### 3. Reiniciar Servidor Backend

```bash
cd backend
npm run dev
# o
node src/server.js
```

### 4. Verificar Frontend

El frontend ya está actualizado para:
- Mostrar el campo `dia_plan` en la vista de edición del calendario
- Permitir editar el `dia_plan` con recálculo automático de fecha
- Sincronizar automáticamente ambos campos al editar cualquiera de los dos

## Nuevos Endpoints API

### Editar Día del Plan
```
PUT /cotizaciones/:id_cotizacion/calendario/:id_calendario/dia-plan
Body: {
  "nuevo_dia_plan": 5,
  "observaciones": "Ajuste de calendario"
}
```

### Editar Fecha Programada (actualizado)
```
PUT /cotizaciones/:id_cotizacion/calendario/:id_calendario/fecha
Body: {
  "nueva_fecha": "2025-11-14",
  "observaciones": "Ajuste de fecha"
}
```
**Ahora también recalcula automáticamente el `dia_plan`**

## Funciones Helper en Backend

```javascript
// Calcular día del plan desde una fecha
function calcularDiaPlan(fechaInicio, fechaProgramada) {
  const inicio = new Date(fechaInicio);
  const programada = new Date(fechaProgramada);
  inicio.setHours(0, 0, 0, 0);
  programada.setHours(0, 0, 0, 0);
  const diffTime = programada.getTime() - inicio.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Calcular fecha desde día del plan
function calcularFechaDesdeDiaPlan(fechaInicio, diaPlan) {
  const fecha = new Date(fechaInicio);
  fecha.setDate(fecha.getDate() + (diaPlan - 1));
  return fecha;
}
```

## Validaciones

- El `dia_plan` debe ser mayor o igual a 1
- El `dia_plan` no puede exceder `duracion_semanas * 7` del plan
- La `fecha_programada` no puede ser anterior a `fecha_inicio_plan`

## Archivos Modificados

### Backend
- `backend/prisma/schema.prisma` - Modelo actualizado
- `backend/src/controllers/cotizaciones.controller.js` - Funciones helper y endpoints
- `backend/src/routes/cotizaciones.routes.js` - Nueva ruta

### Frontend
- `frontend/src/components/planesVacunales/CalendarioVacunacion.js` - UI actualizada
- `frontend/src/services/planesVacunalesApi.js` - Nueva función API

### Migración
- `backend/migrations/add_dia_plan_to_calendario.sql` - Script SQL

## Notas Importantes

1. El campo `dia_plan` es nullable para compatibilidad con registros antiguos
2. La migración calcula automáticamente valores para registros existentes
3. Los nuevos calendarios generados incluirán automáticamente el `dia_plan`
4. Ambos campos (`dia_plan` y `fecha_programada`) se mantienen sincronizados
