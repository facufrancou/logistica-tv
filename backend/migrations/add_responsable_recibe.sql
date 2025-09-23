-- Migration: Add responsable_recibe field to support recipient information
-- Date: 2024-01-XX

-- Add responsable_recibe to calendario_vacunacion table
ALTER TABLE calendario_vacunacion 
ADD COLUMN responsable_recibe VARCHAR(100) NULL 
AFTER responsable_entrega;

-- Add responsable_recibe to control_entregas_vacunas table  
ALTER TABLE control_entregas_vacunas 
ADD COLUMN responsable_recibe VARCHAR(100) NULL 
AFTER responsable_entrega;

-- Update comment to reflect the change
ALTER TABLE calendario_vacunacion 
COMMENT = 'Calendario de vacunación con información del responsable que recibe las dosis';

ALTER TABLE control_entregas_vacunas 
COMMENT = 'Control detallado de entregas con información del responsable que recibe las dosis';