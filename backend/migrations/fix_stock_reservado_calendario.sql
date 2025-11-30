-- =====================================================
-- SCRIPT PARA CORREGIR STOCK_RESERVADO EN VACUNAS
-- Ejecutar directamente en la base de datos de producción
-- =====================================================

-- PASO 1: Ver el estado actual (diagnóstico)
SELECT 
    sv.id_stock_vacuna,
    sv.lote,
    v.nombre as vacuna,
    sv.stock_actual,
    sv.stock_reservado as reservado_actual,
    COALESCE(SUM(CASE 
        WHEN cv.estado_dosis != 'aplicada' THEN cv.cantidad_dosis 
        ELSE 0 
    END), 0) as reservado_real,
    sv.stock_reservado - COALESCE(SUM(CASE 
        WHEN cv.estado_dosis != 'aplicada' THEN cv.cantidad_dosis 
        ELSE 0 
    END), 0) as diferencia
FROM stock_vacunas sv
LEFT JOIN vacunas v ON sv.id_vacuna = v.id_vacuna
LEFT JOIN calendario_vacunacion cv ON cv.id_stock_vacuna = sv.id_stock_vacuna
GROUP BY sv.id_stock_vacuna, sv.lote, v.nombre, sv.stock_actual, sv.stock_reservado
HAVING sv.stock_reservado != COALESCE(SUM(CASE 
    WHEN cv.estado_dosis != 'aplicada' THEN cv.cantidad_dosis 
    ELSE 0 
END), 0)
ORDER BY diferencia;

-- =====================================================
-- PASO 2: CORREGIR stock_reservado (EJECUTAR ESTO)
-- =====================================================

UPDATE stock_vacunas sv
SET stock_reservado = (
    SELECT COALESCE(SUM(CASE 
        WHEN cv.estado_dosis != 'aplicada' THEN cv.cantidad_dosis 
        ELSE 0 
    END), 0)
    FROM calendario_vacunacion cv
    WHERE cv.id_stock_vacuna = sv.id_stock_vacuna
);

-- =====================================================
-- PASO 3: Verificar que no queden negativos
-- =====================================================

-- Ver si hay stock_reservado negativo (no debería haber)
SELECT 
    sv.id_stock_vacuna,
    sv.lote,
    v.nombre as vacuna,
    sv.stock_actual,
    sv.stock_reservado
FROM stock_vacunas sv
LEFT JOIN vacunas v ON sv.id_vacuna = v.id_vacuna
WHERE sv.stock_reservado < 0;

-- Si hay negativos, corregirlos a 0
UPDATE stock_vacunas 
SET stock_reservado = 0 
WHERE stock_reservado < 0;

-- =====================================================
-- PASO 4: Verificación final
-- =====================================================

SELECT 
    sv.id_stock_vacuna,
    sv.lote,
    v.nombre as vacuna,
    sv.stock_actual,
    sv.stock_reservado,
    (sv.stock_actual - sv.stock_reservado) as disponible
FROM stock_vacunas sv
LEFT JOIN vacunas v ON sv.id_vacuna = v.id_vacuna
WHERE sv.stock_reservado > 0
ORDER BY v.nombre, sv.lote;
