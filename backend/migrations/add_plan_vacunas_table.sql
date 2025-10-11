-- Migración para separar sistema de vacunas en planes vacunales
-- Fecha: 2025-10-08
-- Descripción: Agregar tabla plan_vacunas para manejar vacunas en planes vacunales por separado de productos

-- Crear tabla plan_vacunas
CREATE TABLE IF NOT EXISTS `plan_vacunas` (
  `id_plan_vacuna` int NOT NULL AUTO_INCREMENT,
  `id_plan` int NOT NULL,
  `id_vacuna` int NOT NULL,
  `cantidad_total` int NOT NULL,
  `dosis_por_semana` int NOT NULL DEFAULT '1',
  `semana_inicio` tinyint NOT NULL,
  `semana_fin` tinyint DEFAULT NULL,
  `observaciones` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_plan_vacuna`),
  KEY `idx_plan_vacunas_plan` (`id_plan`),
  KEY `idx_plan_vacunas_vacuna` (`id_vacuna`),
  KEY `idx_plan_vacunas_semanas` (`semana_inicio`,`semana_fin`),
  CONSTRAINT `fk_plan_vacunas_plan` FOREIGN KEY (`id_plan`) REFERENCES `planes_vacunales` (`id_plan`) ON DELETE CASCADE,
  CONSTRAINT `fk_plan_vacunas_vacuna` FOREIGN KEY (`id_vacuna`) REFERENCES `vacunas` (`id_vacuna`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Comentarios para documentar la tabla
ALTER TABLE `plan_vacunas` COMMENT = 'Tabla intermedia para manejar vacunas en planes vacunales, separada de productos';

-- Comentarios para campos clave
ALTER TABLE `plan_vacunas` 
  MODIFY COLUMN `id_plan_vacuna` int NOT NULL AUTO_INCREMENT COMMENT 'ID único de la relación plan-vacuna',
  MODIFY COLUMN `id_plan` int NOT NULL COMMENT 'ID del plan vacunal (FK a planes_vacunales)',
  MODIFY COLUMN `id_vacuna` int NOT NULL COMMENT 'ID de la vacuna (FK a vacunas)',
  MODIFY COLUMN `cantidad_total` int NOT NULL COMMENT 'Cantidad total de dosis de esta vacuna en el plan',
  MODIFY COLUMN `dosis_por_semana` int NOT NULL DEFAULT '1' COMMENT 'Número de dosis por semana',
  MODIFY COLUMN `semana_inicio` tinyint NOT NULL COMMENT 'Semana de inicio de aplicación (1-52)',
  MODIFY COLUMN `semana_fin` tinyint DEFAULT NULL COMMENT 'Semana de fin de aplicación (opcional)',
  MODIFY COLUMN `observaciones` text COMMENT 'Observaciones específicas para esta vacuna en el plan';

-- Verificar que las tablas referenciadas existen
SELECT 'Verificando existencia de tabla planes_vacunales...' as mensaje;
SELECT COUNT(*) as planes_existentes FROM `planes_vacunales` LIMIT 1;

SELECT 'Verificando existencia de tabla vacunas...' as mensaje;
SELECT COUNT(*) as vacunas_existentes FROM `vacunas` LIMIT 1;

-- Mostrar estructura de la nueva tabla
SELECT 'Estructura de la nueva tabla plan_vacunas:' as mensaje;
DESCRIBE `plan_vacunas`;