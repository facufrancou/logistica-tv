-- Migración: Agregar campo dosis_por_frasco a tabla presentaciones
-- Fecha: 2025-10-29
-- Descripción: Agrega el campo dosis_por_frasco para manejar la conversión entre frascos y dosis

-- Agregar columna dosis_por_frasco con valor por defecto 1
ALTER TABLE presentaciones 
ADD COLUMN dosis_por_frasco INT DEFAULT 1 
COMMENT 'Cantidad de dosis que contiene cada frasco de esta presentación';

-- Actualizar valores existentes basados en el nombre de la presentación
-- Estas son suposiciones comunes, deberán ajustarse según los datos reales
UPDATE presentaciones SET dosis_por_frasco = 1000 WHERE nombre LIKE '%1000%' OR nombre LIKE '%mil%';
UPDATE presentaciones SET dosis_por_frasco = 500 WHERE nombre LIKE '%500%';
UPDATE presentaciones SET dosis_por_frasco = 250 WHERE nombre LIKE '%250%';
UPDATE presentaciones SET dosis_por_frasco = 100 WHERE nombre LIKE '%100%';
UPDATE presentaciones SET dosis_por_frasco = 50 WHERE nombre LIKE '%50%';
UPDATE presentaciones SET dosis_por_frasco = 20 WHERE nombre LIKE '%20%';
UPDATE presentaciones SET dosis_por_frasco = 10 WHERE nombre LIKE '%10%';

-- Verificar resultados
SELECT id_presentacion, codigo, nombre, dosis_por_frasco 
FROM presentaciones 
ORDER BY nombre;
