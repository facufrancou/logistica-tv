-- Agregar campo dia_plan al calendario de vacunación
-- Este campo representa el día del plan (1, 2, 3, ... N) calculado desde la fecha de inicio

-- Agregar la columna
ALTER TABLE calendario_vacunacion 
ADD COLUMN dia_plan INT NULL AFTER numero_semana;

-- Calcular y actualizar el dia_plan para registros existentes
-- dia_plan = DATEDIFF(fecha_programada, fecha_inicio_plan) + 1
UPDATE calendario_vacunacion cv
INNER JOIN cotizaciones cot ON cv.id_cotizacion = cot.id_cotizacion
SET cv.dia_plan = DATEDIFF(cv.fecha_programada, cot.fecha_inicio_plan) + 1
WHERE cv.dia_plan IS NULL;

-- Agregar índice para optimizar consultas por dia_plan
CREATE INDEX idx_calendario_dia_plan ON calendario_vacunacion(dia_plan);

-- Verificar resultados
SELECT 
    cv.id_calendario,
    cv.numero_semana,
    cv.dia_plan,
    cv.fecha_programada,
    cot.fecha_inicio_plan,
    DATEDIFF(cv.fecha_programada, cot.fecha_inicio_plan) + 1 as dia_calculado
FROM calendario_vacunacion cv
INNER JOIN cotizaciones cot ON cv.id_cotizacion = cot.id_cotizacion
LIMIT 10;
