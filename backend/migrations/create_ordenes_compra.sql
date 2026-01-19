-- =====================================================
-- MIGRACIÓN: SISTEMA DE ÓRDENES DE COMPRA
-- Fecha: 2026-01-19
-- Descripción: Crear tablas para gestión de órdenes de compra
-- con soporte para múltiples proveedores, ingresos parciales
-- y múltiples lotes por item
-- =====================================================

-- Tabla principal de Órdenes de Compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id_orden_compra INT AUTO_INCREMENT PRIMARY KEY,
    numero_orden VARCHAR(50) NOT NULL UNIQUE,
    estado ENUM('borrador', 'pendiente', 'confirmada', 'parcial', 'ingresada', 'cancelada') DEFAULT 'borrador',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_esperada DATE NULL,
    fecha_ingreso_completo DATETIME NULL,
    id_cotizacion INT NULL,
    observaciones TEXT NULL,
    total_estimado DECIMAL(15, 2) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_orden_numero (numero_orden),
    INDEX idx_orden_estado (estado),
    INDEX idx_orden_fecha_creacion (fecha_creacion),
    INDEX idx_orden_cotizacion (id_cotizacion),
    
    CONSTRAINT fk_orden_cotizacion FOREIGN KEY (id_cotizacion) 
        REFERENCES cotizaciones(id_cotizacion) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detalle de la Orden de Compra (items)
CREATE TABLE IF NOT EXISTS detalle_orden_compra (
    id_detalle_orden INT AUTO_INCREMENT PRIMARY KEY,
    id_orden_compra INT NOT NULL,
    id_vacuna INT NOT NULL,
    id_proveedor INT NOT NULL,
    cantidad_solicitada INT NOT NULL,
    cantidad_recibida INT DEFAULT 0,
    precio_estimado DECIMAL(10, 2) NULL,
    estado_item ENUM('pendiente', 'parcial', 'completo', 'cancelado') DEFAULT 'pendiente',
    observaciones TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_detalle_orden (id_orden_compra),
    INDEX idx_detalle_vacuna (id_vacuna),
    INDEX idx_detalle_proveedor (id_proveedor),
    INDEX idx_detalle_estado (estado_item),
    
    CONSTRAINT fk_detalle_orden FOREIGN KEY (id_orden_compra) 
        REFERENCES ordenes_compra(id_orden_compra) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_vacuna FOREIGN KEY (id_vacuna) 
        REFERENCES vacunas(id_vacuna) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_proveedor FOREIGN KEY (id_proveedor) 
        REFERENCES proveedores(id_proveedor) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ingresos de Stock por Orden de Compra (soporta parciales y múltiples lotes)
CREATE TABLE IF NOT EXISTS ingresos_orden_compra (
    id_ingreso INT AUTO_INCREMENT PRIMARY KEY,
    id_detalle_orden INT NOT NULL,
    id_stock_vacuna INT NULL,
    cantidad_ingresada INT NOT NULL,
    lote VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    precio_compra DECIMAL(10, 2) NULL,
    ubicacion_fisica VARCHAR(100) NULL,
    temperatura_req VARCHAR(50) NULL,
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ingreso_detalle (id_detalle_orden),
    INDEX idx_ingreso_stock (id_stock_vacuna),
    INDEX idx_ingreso_fecha (fecha_ingreso),
    INDEX idx_ingreso_lote (lote),
    
    CONSTRAINT fk_ingreso_detalle FOREIGN KEY (id_detalle_orden) 
        REFERENCES detalle_orden_compra(id_detalle_orden) ON DELETE CASCADE,
    CONSTRAINT fk_ingreso_stock FOREIGN KEY (id_stock_vacuna) 
        REFERENCES stock_vacunas(id_stock_vacuna) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar relación de Vacuna con Órdenes
-- (Ya existe relación a través de proveedor en la tabla vacunas)

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista resumen de órdenes por proveedor
CREATE OR REPLACE VIEW v_ordenes_por_proveedor AS
SELECT 
    oc.id_orden_compra,
    oc.numero_orden,
    oc.estado,
    oc.fecha_creacion,
    doc.id_proveedor,
    p.nombre AS proveedor_nombre,
    COUNT(DISTINCT doc.id_detalle_orden) AS total_items,
    SUM(doc.cantidad_solicitada) AS total_dosis_solicitadas,
    SUM(doc.cantidad_recibida) AS total_dosis_recibidas,
    SUM(COALESCE(doc.precio_estimado, 0) * doc.cantidad_solicitada) AS subtotal_proveedor
FROM ordenes_compra oc
JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra
JOIN proveedores p ON doc.id_proveedor = p.id_proveedor
GROUP BY oc.id_orden_compra, oc.numero_orden, oc.estado, oc.fecha_creacion, 
         doc.id_proveedor, p.nombre;

-- Vista de stock global con ubicaciones
CREATE OR REPLACE VIEW v_stock_global_vacunas AS
SELECT 
    v.id_vacuna,
    v.codigo AS vacuna_codigo,
    v.nombre AS vacuna_nombre,
    v.id_proveedor,
    p.nombre AS proveedor_nombre,
    COALESCE(SUM(sv.stock_actual), 0) AS stock_total,
    COALESCE(SUM(sv.stock_reservado), 0) AS stock_reservado,
    COALESCE(SUM(sv.stock_actual - sv.stock_reservado), 0) AS stock_disponible,
    GROUP_CONCAT(
        DISTINCT CONCAT(sv.lote, ' (', sv.stock_actual - sv.stock_reservado, ' disp, ', 
        COALESCE(sv.ubicacion_fisica, 'Sin ubicación'), ')') 
        SEPARATOR ' | '
    ) AS detalle_lotes,
    MIN(sv.fecha_vencimiento) AS proximo_vencimiento
FROM vacunas v
LEFT JOIN stock_vacunas sv ON v.id_vacuna = sv.id_vacuna AND sv.estado_stock = 'disponible'
LEFT JOIN proveedores p ON v.id_proveedor = p.id_proveedor
WHERE v.activa = TRUE
GROUP BY v.id_vacuna, v.codigo, v.nombre, v.id_proveedor, p.nombre;
