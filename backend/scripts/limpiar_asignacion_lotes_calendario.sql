-- Script para eliminar asignaciones automáticas de lotes en calendario_vacunacion
-- Esto dejará todos los calendarios con "sin lote asignado"

USE logistica_tv;

-- Mostrar cuántos registros tienen lotes asignados actualmente
SELECT 
  COUNT(*) as registros_con_lote_asignado,
  COUNT(DISTINCT id_cotizacion) as cotizaciones_afectadas
FROM calendario_vacunacion 
WHERE id_stock_vacuna IS NOT NULL;

-- Eliminar todas las asignaciones de lotes
UPDATE calendario_vacunacion 
SET 
  id_stock_vacuna = NULL,
  lote_asignado = NULL,
  fecha_vencimiento_lote = NULL
WHERE id_stock_vacuna IS NOT NULL;

-- Verificar resultado
SELECT 
  COUNT(*) as total_registros,
  COUNT(id_stock_vacuna) as registros_con_lote,
  COUNT(*) - COUNT(id_stock_vacuna) as registros_sin_lote
FROM calendario_vacunacion;

SELECT 'Limpieza completada exitosamente' as resultado;
