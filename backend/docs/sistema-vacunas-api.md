# Sistema de Vacunas - Documentación de API

## Resumen

El sistema de vacunas es una extensión especializada del sistema de gestión logística que permite manejar vacunas con características específicas como patologías, presentaciones, vías de aplicación y control detallado de stock por lotes con fechas de vencimiento.

## Arquitectura

### Nuevas Tablas

1. **`patologias`** - Catálogo de enfermedades que tratan las vacunas
2. **`presentaciones`** - Tipos de presentación (frascos, dosis, etc.)
3. **`vias_aplicacion`** - Vías de administración (IM, SC, IV, etc.)
4. **`vacunas`** - Tabla principal de vacunas con relaciones a catálogos
5. **`stock_vacunas`** - Control de stock por lotes con vencimientos
6. **`movimientos_stock_vacunas`** - Trazabilidad de movimientos de stock

### Integración con Sistema Existente

- Reutiliza tabla `proveedores` existente
- Se integra con sistema de usuarios para auditoría
- Compatible con futuras integraciones a cotizaciones y planes vacunales

---

## Endpoints de Vacunas

### Base URL: `/vacunas`

#### GET `/vacunas`
Obtener lista de vacunas con filtros y paginación.

**Query Parameters:**
```
- id_proveedor: number (opcional)
- id_patologia: number (opcional) 
- id_presentacion: number (opcional)
- id_via_aplicacion: number (opcional)
- activa: boolean (opcional)
- search: string (opcional) - búsqueda en código, nombre, detalle
- page: number (default: 1)
- limit: number (default: 50)
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_vacuna": 1,
      "codigo": "VAC001",
      "nombre": "Vacuna Clostridiosis",
      "detalle": "Prevención de clostridiosis en bovinos",
      "id_proveedor": 1,
      "precio_lista": 1500.00,
      "activa": true,
      "requiere_frio": true,
      "dias_vencimiento": 365,
      "proveedor": { "nombre": "Lab XYZ" },
      "patologia": { "nombre": "Clostridiosis" },
      "presentacion": { "nombre": "50 ml" },
      "via_aplicacion": { "nombre": "Intramuscular" },
      "stock_total": 100,
      "stock_reservado_total": 20
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 250,
    "limit": 50
  }
}
```

#### GET `/vacunas/disponibles`
Obtener solo vacunas con stock disponible.

**Respuesta:** Lista de vacunas que tienen stock > 0 y estado 'disponible'

#### GET `/vacunas/:id`
Obtener vacuna específica con detalle completo de stock.

**Respuesta:**
```json
{
  "id_vacuna": 1,
  "codigo": "VAC001",
  "nombre": "Vacuna Clostridiosis",
  "proveedor": { /* datos completos del proveedor */ },
  "patologia": { /* datos completos de patología */ },
  "presentacion": { /* datos completos de presentación */ },
  "via_aplicacion": { /* datos completos de vía */ },
  "stock_vacunas": [
    {
      "id_stock_vacuna": 1,
      "lote": "LOT001",
      "fecha_vencimiento": "2025-12-31",
      "stock_actual": 50,
      "estado_stock": "disponible"
    }
  ]
}
```

#### POST `/vacunas`
Crear nueva vacuna.

**Body:**
```json
{
  "codigo": "VAC001",
  "nombre": "Vacuna Clostridiosis",
  "detalle": "Prevención de clostridiosis en bovinos",
  "id_proveedor": 1,
  "id_patologia": 1,
  "id_presentacion": 1,
  "id_via_aplicacion": 1,
  "precio_lista": 1500.00,
  "requiere_frio": true,
  "dias_vencimiento": 365,
  "observaciones": "Mantener en refrigeración"
}
```

#### PUT `/vacunas/:id`
Actualizar vacuna existente.

#### DELETE `/vacunas/:id`
Desactivar vacuna (soft delete).

---

## Endpoints de Catálogos

### Base URL: `/catalogos`

#### Patologías

- **GET `/catalogos/patologias`** - Listar patologías
- **POST `/catalogos/patologias`** - Crear patología
- **PUT `/catalogos/patologias/:id`** - Actualizar patología  
- **DELETE `/catalogos/patologias/:id`** - Desactivar patología

**Estructura de Patología:**
```json
{
  "codigo": "CLOSTRI",
  "nombre": "Clostridiosis", 
  "descripcion": "Enfermedades causadas por bacterias del género Clostridium",
  "activa": true
}
```

#### Presentaciones

- **GET `/catalogos/presentaciones`** - Listar presentaciones
- **POST `/catalogos/presentaciones`** - Crear presentación
- **PUT `/catalogos/presentaciones/:id`** - Actualizar presentación
- **DELETE `/catalogos/presentaciones/:id`** - Desactivar presentación

**Estructura de Presentación:**
```json
{
  "codigo": "ML50",
  "nombre": "50 ml",
  "descripcion": "Frasco de 50 mililitros",
  "unidad_medida": "ml",
  "activa": true
}
```

#### Vías de Aplicación

- **GET `/catalogos/vias-aplicacion`** - Listar vías
- **POST `/catalogos/vias-aplicacion`** - Crear vía
- **PUT `/catalogos/vias-aplicacion/:id`** - Actualizar vía
- **DELETE `/catalogos/vias-aplicacion/:id`** - Desactivar vía

**Estructura de Vía de Aplicación:**
```json
{
  "codigo": "IM",
  "nombre": "Intramuscular",
  "descripcion": "Inyección en el músculo",
  "activa": true
}
```

---

## Endpoints de Stock de Vacunas

### Base URL: `/stock-vacunas`

#### GET `/stock-vacunas`
Obtener stock de vacunas con filtros.

**Query Parameters:**
```
- id_vacuna: number
- estado_stock: string (disponible|reservado|vencido|bloqueado|en_transito)
- vencimiento_proximo: boolean
- dias_vencimiento: number (default: 30)
- search: string - búsqueda por lote o vacuna
- page: number
- limit: number
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_stock_vacuna": 1,
      "id_vacuna": 1,
      "lote": "LOT001", 
      "fecha_vencimiento": "2025-12-31",
      "stock_actual": 50,
      "stock_reservado": 10,
      "precio_compra": 1200.00,
      "estado_stock": "disponible",
      "dias_hasta_vencimiento": 86,
      "vencido": false,
      "proximo_vencimiento": false,
      "vacuna": {
        "codigo": "VAC001",
        "nombre": "Vacuna Clostridiosis"
      }
    }
  ]
}
```

#### GET `/stock-vacunas/alertas`
Obtener alertas de stock crítico y vencimientos.

**Query Parameters:**
- `dias_vencimiento`: number (default: 30)

**Respuesta:**
```json
{
  "success": true,
  "alertas": {
    "stock_bajo": [
      {
        "id_stock_vacuna": 1,
        "lote": "LOT001",
        "stock_actual": 5,
        "stock_minimo": 10,
        "deficit": 5,
        "vacuna": { "nombre": "Vacuna X" }
      }
    ],
    "proximos_vencimientos": [
      {
        "id_stock_vacuna": 2,
        "lote": "LOT002", 
        "fecha_vencimiento": "2025-11-15",
        "dias_hasta_vencimiento": 15,
        "stock_actual": 25
      }
    ],
    "vencidas": [
      {
        "id_stock_vacuna": 3,
        "lote": "LOT003",
        "dias_vencido": 5,
        "stock_actual": 10
      }
    ]
  },
  "totales": {
    "stock_bajo": 1,
    "proximos_vencimientos": 1, 
    "vencidas": 1
  }
}
```

#### GET `/stock-vacunas/vacuna/:id_vacuna`
Obtener todo el stock de una vacuna específica.

#### POST `/stock-vacunas`
Crear nuevo registro de stock.

**Body:**
```json
{
  "id_vacuna": 1,
  "lote": "LOT001",
  "fecha_vencimiento": "2025-12-31",
  "stock_actual": 100,
  "stock_minimo": 10,
  "precio_compra": 1200.00,
  "ubicacion_fisica": "Heladera A - Estante 2",
  "temperatura_req": "2-8°C",
  "observaciones": "Recibido en perfectas condiciones"
}
```

#### PUT `/stock-vacunas/:id`
Actualizar registro de stock.

**Body:**
```json
{
  "stock_actual": 80,
  "motivo_cambio": "Ajuste por aplicación",
  "observaciones": "Aplicadas 20 dosis en campo"
}
```

#### GET `/stock-vacunas/:id/movimientos`
Obtener historial de movimientos de un registro de stock.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_movimiento": 1,
      "tipo_movimiento": "ingreso",
      "cantidad": 100,
      "stock_anterior": 0,
      "stock_posterior": 100,
      "motivo": "Stock inicial",
      "precio_unitario": 12.00,
      "created_at": "2025-10-06T10:00:00Z",
      "usuario": { "nombre": "Juan Pérez" }
    }
  ]
}
```

---

## Casos de Uso Comunes

### 1. Registrar Nueva Vacuna
```javascript
// 1. Crear la vacuna
POST /vacunas
{
  "codigo": "VAC-CLOST-001",
  "nombre": "Clostridiosis Bovina", 
  "id_proveedor": 1,
  "id_patologia": 1, // Clostridiosis
  "id_presentacion": 3, // 50ml
  "id_via_aplicacion": 1, // IM
  "precio_lista": 1500.00
}

// 2. Registrar stock inicial
POST /stock-vacunas
{
  "id_vacuna": 1,
  "lote": "ABC123",
  "fecha_vencimiento": "2025-12-31", 
  "stock_actual": 50,
  "precio_compra": 1200.00
}
```

### 2. Consultar Alertas de Stock
```javascript
// Obtener todas las alertas
GET /stock-vacunas/alertas?dias_vencimiento=30

// Filtrar solo próximos vencimientos  
GET /stock-vacunas?vencimiento_proximo=true&dias_vencimiento=15
```

### 3. Actualizar Stock por Aplicación
```javascript
PUT /stock-vacunas/1
{
  "stock_actual": 45,
  "motivo_cambio": "Aplicación en plan vacunal COT-001",
  "observaciones": "5 dosis aplicadas en establecimiento Las Flores"
}
```

---

## Códigos de Error

- **400** - Bad Request (validación fallida)
- **401** - Unauthorized (sesión inválida)
- **404** - Not Found (recurso no encontrado) 
- **500** - Internal Server Error

## Notas de Implementación

1. **Auditoría**: Todos los endpoints registran `created_by` y `updated_by` usando el usuario de la sesión
2. **Soft Delete**: Las eliminaciones son lógicas (activa=false)
3. **Paginación**: Endpoints de listado soportan paginación estándar
4. **Búsqueda**: Parámetro `search` busca en campos de texto relevantes
5. **Validaciones**: Códigos únicos, relaciones válidas, stocks no negativos
6. **Movimientos**: Todo cambio de stock genera registro en movimientos_stock_vacunas

## Integración Futura

El sistema está preparado para integrarse con:
- Cotizaciones (usar vacunas en lugar de productos genéricos)
- Planes vacunales (especificar vacunas específicas) 
- Calendario de aplicaciones (control de lotes y vencimientos)
- Reportes especializados (eficacia, costos, stock crítico)