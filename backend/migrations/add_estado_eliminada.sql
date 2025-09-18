-- Migración para agregar el estado 'eliminada' al enum estado_cotizacion
-- Ejecutar este script en la base de datos MySQL

-- Primero, verificar el estado actual del enum
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'cotizaciones' AND COLUMN_NAME = 'estado';

-- Modificar la columna para incluir el nuevo estado 'eliminada'
ALTER TABLE cotizaciones 
MODIFY COLUMN estado ENUM('en_proceso', 'enviada', 'aceptada', 'rechazada', 'cancelada', 'eliminada') 
DEFAULT 'en_proceso';

-- Verificar que el cambio se aplicó correctamente
SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'cotizaciones' AND COLUMN_NAME = 'estado';

-- Opcional: Verificar cotizaciones existentes
SELECT estado, COUNT(*) as cantidad 
FROM cotizaciones 
GROUP BY estado;