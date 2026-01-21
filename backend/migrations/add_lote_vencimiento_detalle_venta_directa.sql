-- Migración: Agregar campos lote y fecha_vencimiento a detalle_ventas_directas
-- Fecha: 2026-01-20
-- Descripción: Estos campos guardan un snapshot del lote y vencimiento del stock 
--              específico vendido para trazabilidad en remitos

-- Agregar columna id_stock_vacuna (referencia al stock vendido)
ALTER TABLE detalle_ventas_directas 
ADD COLUMN IF NOT EXISTS id_stock_vacuna INT NULL;

-- Agregar columna lote (snapshot del lote del stock vendido)
ALTER TABLE detalle_ventas_directas 
ADD COLUMN IF NOT EXISTS lote VARCHAR(100) NULL;

-- Agregar columna fecha_vencimiento (snapshot de la fecha de vencimiento)
ALTER TABLE detalle_ventas_directas 
ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE NULL;

-- Índice opcional para búsquedas por lote
CREATE INDEX IF NOT EXISTS idx_detalle_venta_directa_lote 
ON detalle_ventas_directas(lote);
