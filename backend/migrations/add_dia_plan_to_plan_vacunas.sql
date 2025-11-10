-- Agregar campo dia_plan a la tabla plan_vacunas
-- Este campo permite especificar el día exacto del plan en que se aplica cada vacuna

-- Agregar la columna a plan_vacunas
ALTER TABLE plan_vacunas 
ADD COLUMN dia_plan INT NULL AFTER semana_fin;

-- Comentario en la columna para documentación
ALTER TABLE plan_vacunas 
MODIFY COLUMN dia_plan INT NULL COMMENT 'Día del plan para la aplicación (1, 2, 3... N)';

-- Agregar índice para optimizar consultas por dia_plan
CREATE INDEX idx_plan_vacunas_dia_plan ON plan_vacunas(dia_plan);

-- Verificar la estructura actualizada
DESCRIBE plan_vacunas;

-- Mostrar registros existentes
SELECT 
    id_plan_vacuna,
    id_plan,
    id_vacuna,
    semana_inicio,
    semana_fin,
    dia_plan
FROM plan_vacunas
LIMIT 10;
