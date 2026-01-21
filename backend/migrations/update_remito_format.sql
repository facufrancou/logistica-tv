-- =====================================================
-- MIGRACIÓN: Actualizar formato de números de remito
-- Formato nuevo: RE-DDMMAAAA-SECUENCIAL (ej: RE-20012026-00001)
-- =====================================================

-- Actualizar el formato para remito_entrega
UPDATE secuencias_documentos 
SET formato = 'RE-{DIA}{MES}{ANIO4}-{NUMERO}'
WHERE tipo_documento = 'remito_entrega' AND prefijo = 'RE';

-- Actualizar el formato para remito_venta_directa  
UPDATE secuencias_documentos 
SET formato = 'RVD-{DIA}{MES}{ANIO4}-{NUMERO}'
WHERE tipo_documento = 'remito_venta_directa' AND prefijo = 'RVD';

-- Actualizar el formato para orden_compra
UPDATE secuencias_documentos 
SET formato = 'OC-{DIA}{MES}{ANIO4}-{NUMERO}'
WHERE tipo_documento = 'orden_compra' AND prefijo = 'OC';

-- Verificar los cambios
SELECT tipo_documento, prefijo, formato, ultimo_numero FROM secuencias_documentos;
