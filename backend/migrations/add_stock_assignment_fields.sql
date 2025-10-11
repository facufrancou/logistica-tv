-- Agregar campos para asignación de lotes en calendario de vacunación
-- Fecha: ${new Date().toISOString().split('T')[0]}

-- Agregar campos al calendario de vacunación
ALTER TABLE calendario_vacunacion 
ADD COLUMN id_stock_vacuna INT DEFAULT NULL,
ADD COLUMN lote_asignado VARCHAR(100) DEFAULT NULL,
ADD COLUMN fecha_vencimiento_lote DATE DEFAULT NULL;

-- Agregar índices
ALTER TABLE calendario_vacunacion 
ADD INDEX idx_calendario_stock_vacuna (id_stock_vacuna),
ADD INDEX idx_calendario_lote (lote_asignado);

-- Agregar campos al movimiento de stock de vacunas
ALTER TABLE movimientos_stock_vacunas 
ADD COLUMN id_cotizacion INT DEFAULT NULL,
ADD COLUMN id_calendario INT DEFAULT NULL;

-- Agregar índices para movimientos
ALTER TABLE movimientos_stock_vacunas 
ADD INDEX idx_movimiento_cotizacion (id_cotizacion),
ADD INDEX idx_movimiento_calendario (id_calendario);

-- Agregar claves foráneas (opcional, dependiendo de la configuración)
-- ALTER TABLE calendario_vacunacion 
-- ADD CONSTRAINT fk_calendario_stock_vacuna 
-- FOREIGN KEY (id_stock_vacuna) REFERENCES stock_vacunas(id_stock_vacuna) ON DELETE SET NULL;

-- ALTER TABLE movimientos_stock_vacunas 
-- ADD CONSTRAINT fk_movimiento_cotizacion 
-- FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones(id_cotizacion) ON DELETE SET NULL;

-- ALTER TABLE movimientos_stock_vacunas 
-- ADD CONSTRAINT fk_movimiento_calendario 
-- FOREIGN KEY (id_calendario) REFERENCES calendario_vacunacion(id_calendario) ON DELETE SET NULL;