-- Migración: Integrar ventas directas con sistema de documentos
-- Fecha: 2026-01-20
-- Descripción: Agrega campos y relaciones para que las ventas directas
--              utilicen el sistema de numeración correlativa de documentos
-- IMPORTANTE: Ejecutar cada bloque por separado en MySQL Workbench

-- ====================================================================
-- 1. AGREGAR CAMPOS A VENTAS_DIRECTAS (ejecutar uno por uno si da error)
-- ====================================================================

-- Campo numero_remito_oficial
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ventas_directas' AND COLUMN_NAME = 'numero_remito_oficial') = 0,
  'ALTER TABLE ventas_directas ADD COLUMN numero_remito_oficial VARCHAR(50) NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Campo fecha_primera_impresion
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ventas_directas' AND COLUMN_NAME = 'fecha_primera_impresion') = 0,
  'ALTER TABLE ventas_directas ADD COLUMN fecha_primera_impresion DATETIME NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================================
-- 2. AGREGAR CAMPO id_venta_directa A DOCUMENTOS_IMPRESOS
-- ====================================================================

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos_impresos' AND COLUMN_NAME = 'id_venta_directa') = 0,
  'ALTER TABLE documentos_impresos ADD COLUMN id_venta_directa INT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================================
-- 3. AGREGAR ÍNDICES
-- ====================================================================

-- Índice en ventas_directas
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ventas_directas' AND INDEX_NAME = 'idx_vd_num_remito_oficial') = 0,
  'CREATE INDEX idx_vd_num_remito_oficial ON ventas_directas(numero_remito_oficial)',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice en documentos_impresos
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos_impresos' AND INDEX_NAME = 'idx_doc_venta_directa') = 0,
  'CREATE INDEX idx_doc_venta_directa ON documentos_impresos(id_venta_directa)',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================================
-- 4. AGREGAR FOREIGN KEY
-- ====================================================================

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos_impresos' AND CONSTRAINT_NAME = 'fk_doc_venta_directa') = 0,
  'ALTER TABLE documentos_impresos ADD CONSTRAINT fk_doc_venta_directa FOREIGN KEY (id_venta_directa) REFERENCES ventas_directas(id_venta_directa) ON DELETE SET NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================================
-- 5. MODIFICAR ENUM Y AGREGAR SECUENCIA
-- ====================================================================

-- Modificar ENUM en secuencias_documentos
ALTER TABLE secuencias_documentos 
MODIFY COLUMN tipo_documento ENUM('orden_compra', 'remito_entrega', 'remito_venta', 'factura', 'remito_venta_directa') NOT NULL;

-- Modificar ENUM en documentos_impresos
ALTER TABLE documentos_impresos 
MODIFY COLUMN tipo_documento ENUM('orden_compra', 'remito_entrega', 'remito_venta', 'factura', 'remito_venta_directa') NOT NULL;

-- Insertar secuencia para remitos de venta directa
INSERT INTO secuencias_documentos (tipo_documento, prefijo, ultimo_numero, formato, digitos_numero, reinicio_anual, anio_actual, activo)
SELECT 'remito_venta_directa', 'RVD', 0, 'RVD-{AAMM}-{00000}', 5, FALSE, YEAR(NOW()), TRUE
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM secuencias_documentos WHERE tipo_documento = 'remito_venta_directa'
);

-- ====================================================================
-- VERIFICACIÓN
-- ====================================================================

SELECT 'Migración completada: ventas directas integradas con sistema de documentos' as mensaje;

SELECT * FROM secuencias_documentos WHERE tipo_documento = 'remito_venta_directa';
