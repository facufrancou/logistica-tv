-- =====================================================
-- SISTEMA DE VACUNAS - MIGRACIÓN DE NUEVAS TABLAS
-- Fecha: 6 de octubre de 2025
-- Descripción: Creación de tablas especializadas para gestión de vacunas
-- =====================================================

-- Tabla de patologías
CREATE TABLE IF NOT EXISTS `patologias` (
    `id_patologia` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `activa` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    
    INDEX `idx_patologia_codigo` (`codigo`),
    INDEX `idx_patologia_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de presentaciones
CREATE TABLE IF NOT EXISTS `presentaciones` (
    `id_presentacion` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `unidad_medida` VARCHAR(50) DEFAULT NULL,
    `activa` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    
    INDEX `idx_presentacion_codigo` (`codigo`),
    INDEX `idx_presentacion_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de vías de aplicación
CREATE TABLE IF NOT EXISTS `vias_aplicacion` (
    `id_via_aplicacion` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `activa` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    
    INDEX `idx_via_aplicacion_codigo` (`codigo`),
    INDEX `idx_via_aplicacion_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla principal de vacunas
CREATE TABLE IF NOT EXISTS `vacunas` (
    `id_vacuna` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(50) NOT NULL UNIQUE,
    `nombre` VARCHAR(255) NOT NULL,
    `detalle` TEXT DEFAULT NULL,
    `id_proveedor` INT NOT NULL,
    `id_patologia` INT NOT NULL,
    `id_presentacion` INT NOT NULL,
    `id_via_aplicacion` INT NOT NULL,
    `precio_lista` DECIMAL(10,2) NOT NULL,
    `activa` BOOLEAN DEFAULT TRUE,
    `requiere_frio` BOOLEAN DEFAULT FALSE,
    `dias_vencimiento` INT DEFAULT NULL,
    `observaciones` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    
    INDEX `idx_vacuna_codigo` (`codigo`),
    INDEX `idx_vacuna_nombre` (`nombre`),
    INDEX `idx_vacuna_proveedor` (`id_proveedor`),
    INDEX `idx_vacuna_patologia` (`id_patologia`),
    INDEX `idx_vacuna_activa` (`activa`),
    
    FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`id_patologia`) REFERENCES `patologias` (`id_patologia`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`id_presentacion`) REFERENCES `presentaciones` (`id_presentacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`id_via_aplicacion`) REFERENCES `vias_aplicacion` (`id_via_aplicacion`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de stock de vacunas
CREATE TABLE IF NOT EXISTS `stock_vacunas` (
    `id_stock_vacuna` INT AUTO_INCREMENT PRIMARY KEY,
    `id_vacuna` INT NOT NULL,
    `lote` VARCHAR(100) NOT NULL,
    `fecha_vencimiento` DATE NOT NULL,
    `stock_actual` INT DEFAULT 0,
    `stock_minimo` INT DEFAULT 0,
    `stock_reservado` INT DEFAULT 0,
    `precio_compra` DECIMAL(10,2) DEFAULT NULL,
    `ubicacion_fisica` VARCHAR(100) DEFAULT NULL,
    `temperatura_req` VARCHAR(50) DEFAULT NULL,
    `estado_stock` ENUM('disponible', 'reservado', 'vencido', 'bloqueado', 'en_transito') DEFAULT 'disponible',
    `observaciones` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    
    UNIQUE KEY `unique_vacuna_lote` (`id_vacuna`, `lote`),
    INDEX `idx_stock_vacuna_lote` (`lote`),
    INDEX `idx_stock_vacuna_vencimiento` (`fecha_vencimiento`),
    INDEX `idx_stock_vacuna_estado` (`estado_stock`),
    
    FOREIGN KEY (`id_vacuna`) REFERENCES `vacunas` (`id_vacuna`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de movimientos de stock de vacunas
CREATE TABLE IF NOT EXISTS `movimientos_stock_vacunas` (
    `id_movimiento` INT AUTO_INCREMENT PRIMARY KEY,
    `id_stock_vacuna` INT NOT NULL,
    `tipo_movimiento` ENUM('ingreso', 'egreso', 'ajuste_positivo', 'ajuste_negativo', 'reserva', 'liberacion_reserva', 'vencimiento', 'transferencia') NOT NULL,
    `cantidad` INT NOT NULL,
    `stock_anterior` INT NOT NULL,
    `stock_posterior` INT NOT NULL,
    `motivo` VARCHAR(255) NOT NULL,
    `observaciones` TEXT DEFAULT NULL,
    `precio_unitario` DECIMAL(10,2) DEFAULT NULL,
    `id_usuario` INT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_movimiento_stock_vacuna` (`id_stock_vacuna`),
    INDEX `idx_movimiento_tipo` (`tipo_movimiento`),
    INDEX `idx_movimiento_fecha` (`created_at`),
    
    FOREIGN KEY (`id_stock_vacuna`) REFERENCES `stock_vacunas` (`id_stock_vacuna`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DATOS INICIALES PARA CATALOGOS
-- =====================================================

-- Insertar patologías iniciales
INSERT IGNORE INTO `patologias` (`codigo`, `nombre`, `descripcion`) VALUES
('CLOSTRI', 'Clostridiosis', 'Enfermedades causadas por bacterias del género Clostridium'),
('BRUCEL', 'Brucelosis', 'Enfermedad infecciosa bacteriana zoonótica'),
('CARBAN', 'Carbunco', 'Enfermedad bacteriana aguda causada por Bacillus anthracis'),
('FIEAFT', 'Fiebre Aftosa', 'Enfermedad viral altamente contagiosa del ganado'),
('AFTOSA', 'Aftosa', 'Enfermedad viral que afecta animales de pezuña hendida'),
('MANCHA', 'Mancha', 'Enfermedad bacteriana del ganado bovino'),
('GANGRE', 'Gangrena Gaseosa', 'Infección bacteriana necrosante'),
('TETANO', 'Tétanos', 'Enfermedad bacteriana que afecta el sistema nervioso'),
('HEPAT', 'Hepatitis', 'Inflamación del hígado de origen viral'),
('RESPIR', 'Respiratorias', 'Enfermedades que afectan el sistema respiratorio');

-- Insertar presentaciones iniciales
INSERT IGNORE INTO `presentaciones` (`codigo`, `nombre`, `descripcion`, `unidad_medida`) VALUES
('ML10', '10 ml', 'Frasco de 10 mililitros', 'ml'),
('ML20', '20 ml', 'Frasco de 20 mililitros', 'ml'),
('ML50', '50 ml', 'Frasco de 50 mililitros', 'ml'),
('ML100', '100 ml', 'Frasco de 100 mililitros', 'ml'),
('ML250', '250 ml', 'Frasco de 250 mililitros', 'ml'),
('ML500', 'Frasco 500 ml', 'Frasco de 500 mililitros', 'ml'),
('DOSIS1', 'Dosis única', 'Presentación en dosis individual', 'dosis'),
('DOSIS10', '10 dosis', 'Frasco de 10 dosis', 'dosis'),
('DOSIS20', '20 dosis', 'Frasco de 20 dosis', 'dosis'),
('DOSIS50', '50 dosis', 'Frasco de 50 dosis', 'dosis'),
('JERINP', 'Jeringa precargada', 'Jeringa lista para usar', 'jeringa'),
('AMPOLL', 'Ampolla', 'Ampolla de vidrio', 'ampolla');

-- Insertar vías de aplicación iniciales
INSERT IGNORE INTO `vias_aplicacion` (`codigo`, `nombre`, `descripcion`) VALUES
('IM', 'Intramuscular', 'Inyección en el músculo'),
('SC', 'Subcutánea', 'Inyección bajo la piel'),
('IV', 'Intravenosa', 'Inyección en vena'),
('ID', 'Intradérmica', 'Inyección en la dermis'),
('ORAL', 'Vía Oral', 'Administración por boca'),
('NASAL', 'Vía Nasal', 'Administración por fosas nasales'),
('OCULAR', 'Vía Ocular', 'Aplicación en los ojos'),
('TOPICA', 'Vía Tópica', 'Aplicación sobre la piel'),
('AEROSOL', 'Aerosol', 'Administración por aspersión'),
('MIXTA', 'Vía Mixta', 'Combinación de vías de administración');

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
-- Esta migración crea el sistema completo de vacunas con:
-- 1. Tablas de catálogos (patologías, presentaciones, vías)
-- 2. Tabla principal de vacunas con todas las relaciones
-- 3. Sistema de stock específico para vacunas con control de lotes
-- 4. Trazabilidad completa de movimientos de stock
-- 5. Datos iniciales para empezar a trabajar
--
-- El sistema mantiene compatibilidad con las tablas existentes:
-- - Reutiliza la tabla 'proveedores' existente
-- - Se integra con el sistema de usuarios para auditoría
-- - Permite futura integración con cotizaciones y planes
-- =====================================================