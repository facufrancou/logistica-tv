-- Actualizar las presentaciones existentes con los valores correctos de dosis_por_frasco
-- Ejecutado el: 29 de octubre de 2025

-- Actualizar presentación de 1000 dosis
UPDATE presentaciones 
SET dosis_por_frasco = 1000,
    updated_at = NOW()
WHERE id_presentacion = 1;

-- Actualizar presentación de 2000 dosis
UPDATE presentaciones 
SET dosis_por_frasco = 2000,
    updated_at = NOW()
WHERE id_presentacion = 2;

-- Actualizar presentación de 5000 dosis
UPDATE presentaciones 
SET dosis_por_frasco = 5000,
    updated_at = NOW()
WHERE id_presentacion = 3;

-- Actualizar presentación de 10000 dosis
UPDATE presentaciones 
SET dosis_por_frasco = 10000,
    updated_at = NOW()
WHERE id_presentacion = 4;

-- Verificar las actualizaciones
SELECT id_presentacion, codigo, nombre, dosis_por_frasco, updated_at 
FROM presentaciones 
ORDER BY id_presentacion;
