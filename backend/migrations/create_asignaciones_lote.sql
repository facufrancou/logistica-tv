-- =====================================================
-- Migración: Crear tabla asignaciones_lote
-- Fecha: 2025-11-30
-- Descripción: Tabla para gestionar asignaciones de lotes 
--              a calendarios de vacunación (soporta multi-lote)
-- =====================================================

-- Crear tabla de asignaciones
CREATE TABLE IF NOT EXISTS asignaciones_lote (
  id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
  id_calendario INT NOT NULL,
  id_stock_vacuna INT NOT NULL,
  cantidad_asignada INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  
  -- Foreign keys
  CONSTRAINT fk_asignacion_calendario 
    FOREIGN KEY (id_calendario) 
    REFERENCES calendario_vacunacion(id_calendario) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_asignacion_stock 
    FOREIGN KEY (id_stock_vacuna) 
    REFERENCES stock_vacunas(id_stock_vacuna),
  
  CONSTRAINT fk_asignacion_usuario 
    FOREIGN KEY (created_by) 
    REFERENCES usuarios(id_usuario),
  
  -- Índices para búsquedas rápidas
  INDEX idx_asignacion_calendario (id_calendario),
  INDEX idx_asignacion_stock (id_stock_vacuna)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Script de migración de datos existentes (opcional)
-- Migra las asignaciones actuales basadas en id_stock_vacuna
-- del calendario a la nueva tabla
-- =====================================================

-- Migrar asignaciones existentes (donde id_stock_vacuna no es null)
INSERT INTO asignaciones_lote (id_calendario, id_stock_vacuna, cantidad_asignada, created_at)
SELECT 
  cv.id_calendario,
  cv.id_stock_vacuna,
  cv.cantidad_dosis,
  COALESCE(cv.created_at, NOW())
FROM calendario_vacunacion cv
WHERE cv.id_stock_vacuna IS NOT NULL
  AND cv.estado_entrega IN ('pendiente', 'parcial')
  AND NOT EXISTS (
    SELECT 1 FROM asignaciones_lote al 
    WHERE al.id_calendario = cv.id_calendario 
      AND al.id_stock_vacuna = cv.id_stock_vacuna
  );

-- Mostrar resultados de la migración
SELECT 
  'Asignaciones migradas' as descripcion,
  COUNT(*) as cantidad
FROM asignaciones_lote;
