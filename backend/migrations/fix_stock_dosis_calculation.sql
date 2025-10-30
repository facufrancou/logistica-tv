-- Migración: Corregir cálculos de dosis en stock_vacuna
-- Fecha: 29 de octubre de 2025
-- Descripción: Recalcula stock_actual y stock_reservado basándose en frascos exactos

-- Primero, vamos a ver los valores actuales para identificar problemas
SELECT 
    sv.id_stock_vacuna,
    v.nombre as vacuna,
    sv.lote,
    sv.stock_actual,
    sv.stock_reservado,
    p.dosis_por_frasco,
    -- Calcular lo que debería ser (frascos completos)
    FLOOR(sv.stock_actual / p.dosis_por_frasco) as frascos_calculados,
    (FLOOR(sv.stock_actual / p.dosis_por_frasco) * p.dosis_por_frasco) as dosis_correctas,
    (sv.stock_actual % p.dosis_por_frasco) as dosis_sobrantes,
    -- Mostrar diferencia
    (sv.stock_actual - (FLOOR(sv.stock_actual / p.dosis_por_frasco) * p.dosis_por_frasco)) as diferencia
FROM stock_vacuna sv
JOIN vacuna v ON sv.id_vacuna = v.id_vacuna
JOIN presentaciones p ON v.id_presentacion = p.id_presentacion
WHERE (sv.stock_actual % p.dosis_por_frasco) != 0
ORDER BY sv.id_stock_vacuna;

-- Si hay registros con diferencias, puedes descomentar las siguientes líneas para corregirlos:

-- Actualizar stock_actual para que sea múltiplo exacto de dosis_por_frasco
-- (Redondea hacia abajo para eliminar dosis sueltas)
-- UPDATE stock_vacuna sv
-- JOIN vacuna v ON sv.id_vacuna = v.id_vacuna
-- JOIN presentaciones p ON v.id_presentacion = p.id_presentacion
-- SET sv.stock_actual = FLOOR(sv.stock_actual / p.dosis_por_frasco) * p.dosis_por_frasco
-- WHERE (sv.stock_actual % p.dosis_por_frasco) != 0;

-- Actualizar stock_reservado para que sea múltiplo exacto de dosis_por_frasco
-- UPDATE stock_vacuna sv
-- JOIN vacuna v ON sv.id_vacuna = v.id_vacuna
-- JOIN presentaciones p ON v.id_presentacion = p.id_presentacion
-- SET sv.stock_reservado = FLOOR(sv.stock_reservado / p.dosis_por_frasco) * p.dosis_por_frasco
-- WHERE (sv.stock_reservado % p.dosis_por_frasco) != 0;

-- Verificar después de la corrección
-- SELECT 
--     sv.id_stock_vacuna,
--     v.nombre as vacuna,
--     sv.lote,
--     sv.stock_actual,
--     sv.stock_reservado,
--     p.dosis_por_frasco,
--     FLOOR(sv.stock_actual / p.dosis_por_frasco) as frascos_actuales,
--     (sv.stock_actual % p.dosis_por_frasco) as dosis_sobrantes
-- FROM stock_vacuna sv
-- JOIN vacuna v ON sv.id_vacuna = v.id_vacuna
-- JOIN presentaciones p ON v.id_presentacion = p.id_presentacion
-- ORDER BY sv.id_stock_vacuna;
