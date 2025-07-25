-- --------------------------------------------------------
-- Script de actualización para sistema_pedidos
-- --------------------------------------------------------
-- Ejecutar este script después de que base.sql haya creado la estructura inicial
-- Fecha: Julio 2025
-- --------------------------------------------------------

-- Usar la base de datos
USE `sistema_pedidos`;

-- --------------------------------------------------------
-- 1. COLUMNAS DE AUDITORÍA
-- --------------------------------------------------------

-- Columnas de auditoría para tabla clientes
ALTER TABLE `sistema_pedidos`.`clientes`
ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN `created_by` INT NULL,
ADD COLUMN `updated_by` INT NULL;

-- Columnas de auditoría para tabla productos
ALTER TABLE `sistema_pedidos`.`productos`
ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN `created_by` INT NULL,
ADD COLUMN `updated_by` INT NULL;

-- Columnas de auditoría para tabla pedidos
ALTER TABLE `sistema_pedidos`.`pedidos`
ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN `created_by` INT NULL,
ADD COLUMN `updated_by` INT NULL;

-- Columnas de auditoría para tabla proveedores
ALTER TABLE `sistema_pedidos`.`proveedores`
ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN `created_by` INT NULL,
ADD COLUMN `updated_by` INT NULL;

-- Columnas de auditoría para tabla detalle_pedido
ALTER TABLE `sistema_pedidos`.`detalle_pedido`
ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN `created_by` INT NULL,
ADD COLUMN `updated_by` INT NULL;

-- --------------------------------------------------------
-- 2. ÍNDICES PARA MEJORAR RENDIMIENTO
-- --------------------------------------------------------

-- Índices para búsquedas frecuentes
ALTER TABLE `sistema_pedidos`.`productos` ADD INDEX `idx_productos_nombre` (`nombre`);
ALTER TABLE `sistema_pedidos`.`clientes` ADD INDEX `idx_clientes_nombre` (`nombre`);
ALTER TABLE `sistema_pedidos`.`clientes` ADD INDEX `idx_clientes_cuit` (`cuit`);
ALTER TABLE `sistema_pedidos`.`pedidos` ADD INDEX `idx_pedidos_estado` (`estado`);
ALTER TABLE `sistema_pedidos`.`pedidos` ADD INDEX `idx_pedidos_fecha` (`fecha_pedido`);
ALTER TABLE `sistema_pedidos`.`pedidos` ADD INDEX `idx_pedidos_fecha_prox` (`fecha_proximo_pedido`);

-- --------------------------------------------------------
-- 3. RESTRICCIONES DE INTEGRIDAD
-- --------------------------------------------------------

-- Validaciones a nivel de base de datos
ALTER TABLE `sistema_pedidos`.`productos` ADD CONSTRAINT `chk_precio_positivo` CHECK (`precio_unitario` > 0);
ALTER TABLE `sistema_pedidos`.`detalle_pedido` ADD CONSTRAINT `chk_cantidad_positiva` CHECK (`cantidad` > 0);
ALTER TABLE `sistema_pedidos`.`detalle_pedido` ADD CONSTRAINT `chk_precio_detalle_positivo` CHECK (`precio_unitario` > 0);

-- --------------------------------------------------------
-- 4. NUEVAS TABLAS PARA FUNCIONALIDADES ADICIONALES
-- --------------------------------------------------------

-- Sistema de notificaciones
CREATE TABLE IF NOT EXISTS `sistema_pedidos`.`notificaciones` (
  `id_notificacion` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NULL,
  `id_cliente` INT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `leida` TINYINT(1) DEFAULT 0,
  `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `fecha_lectura` DATETIME NULL,
  PRIMARY KEY (`id_notificacion`),
  INDEX `id_usuario` (`id_usuario`),
  INDEX `id_cliente` (`id_cliente`),
  CONSTRAINT `fk_notificaciones_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `sistema_pedidos`.`usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_notificaciones_clientes` FOREIGN KEY (`id_cliente`) REFERENCES `sistema_pedidos`.`clientes` (`id_cliente`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Historial de precios de productos
CREATE TABLE IF NOT EXISTS `sistema_pedidos`.`historial_precios` (
  `id_historial` INT NOT NULL AUTO_INCREMENT,
  `id_producto` INT NOT NULL,
  `precio_anterior` DECIMAL(10,2) NOT NULL,
  `precio_nuevo` DECIMAL(10,2) NOT NULL,
  `fecha_cambio` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` INT NULL,
  PRIMARY KEY (`id_historial`),
  INDEX `id_producto` (`id_producto`),
  INDEX `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_historial_productos` FOREIGN KEY (`id_producto`) REFERENCES `sistema_pedidos`.`productos` (`id_producto`) ON DELETE CASCADE,
  CONSTRAINT `fk_historial_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `sistema_pedidos`.`usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Sistema de descuentos
CREATE TABLE IF NOT EXISTS `sistema_pedidos`.`descuentos` (
  `id_descuento` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `tipo` ENUM('porcentaje', 'monto_fijo') NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NULL,
  `id_cliente` INT NULL,
  `id_producto` INT NULL,
  `activo` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  PRIMARY KEY (`id_descuento`),
  INDEX `id_cliente` (`id_cliente`),
  INDEX `id_producto` (`id_producto`),
  INDEX `idx_descuentos_fecha` (`fecha_inicio`, `fecha_fin`),
  INDEX `idx_descuentos_activo` (`activo`),
  CONSTRAINT `fk_descuentos_clientes` FOREIGN KEY (`id_cliente`) REFERENCES `sistema_pedidos`.`clientes` (`id_cliente`) ON DELETE CASCADE,
  CONSTRAINT `fk_descuentos_productos` FOREIGN KEY (`id_producto`) REFERENCES `sistema_pedidos`.`productos` (`id_producto`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Configuraciones del sistema
CREATE TABLE IF NOT EXISTS `sistema_pedidos`.`configuraciones` (
  `clave` VARCHAR(50) NOT NULL,
  `valor` TEXT NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT NULL,
  PRIMARY KEY (`clave`),
  INDEX `updated_by` (`updated_by`),
  CONSTRAINT `fk_config_usuarios` FOREIGN KEY (`updated_by`) REFERENCES `sistema_pedidos`.`usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Tabla de auditoría general
CREATE TABLE IF NOT EXISTS `sistema_pedidos`.`auditoria_acciones` (
  `id_auditoria` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NULL,
  `tipo_accion` VARCHAR(50) NOT NULL,
  `tabla` VARCHAR(50) NOT NULL,
  `registro_id` INT NULL,
  `detalle` TEXT NULL,
  `valor_anterior` TEXT NULL,
  `valor_nuevo` TEXT NULL,
  `direccion_ip` VARCHAR(45) NULL,
  `fecha_accion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  INDEX `id_usuario` (`id_usuario`),
  INDEX `idx_auditoria_tipo` (`tipo_accion`),
  INDEX `idx_auditoria_tabla` (`tabla`),
  INDEX `idx_auditoria_fecha` (`fecha_accion`),
  CONSTRAINT `fk_auditoria_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `sistema_pedidos`.`usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 5. PROCEDIMIENTOS ALMACENADOS
-- --------------------------------------------------------

DELIMITER $$

-- Procedimiento para registrar cambios de precio
CREATE PROCEDURE `sistema_pedidos`.`registrar_cambio_precio`(
    IN p_id_producto INT,
    IN p_precio_nuevo DECIMAL(10,2),
    IN p_id_usuario INT
)
BEGIN
    DECLARE v_precio_anterior DECIMAL(10,2);
    
    -- Obtener el precio actual
    SELECT precio_unitario INTO v_precio_anterior 
    FROM `sistema_pedidos`.`productos` 
    WHERE id_producto = p_id_producto;
    
    -- Insertar en historial solo si el precio cambió
    IF v_precio_anterior != p_precio_nuevo THEN
        INSERT INTO `sistema_pedidos`.`historial_precios` 
        (id_producto, precio_anterior, precio_nuevo, id_usuario)
        VALUES 
        (p_id_producto, v_precio_anterior, p_precio_nuevo, p_id_usuario);
        
        -- Actualizar el precio en productos
        UPDATE `sistema_pedidos`.`productos` 
        SET precio_unitario = p_precio_nuevo, updated_by = p_id_usuario
        WHERE id_producto = p_id_producto;
    END IF;
END$$

-- Procedimiento para calcular precio con descuentos
CREATE PROCEDURE `sistema_pedidos`.`calcular_precio_con_descuento`(
    IN p_id_producto INT,
    IN p_id_cliente INT,
    OUT p_precio_final DECIMAL(10,2)
)
BEGIN
    DECLARE v_precio_base DECIMAL(10,2);
    DECLARE v_descuento DECIMAL(10,2) DEFAULT 0;
    
    -- Obtener precio base
    SELECT precio_unitario INTO v_precio_base
    FROM `sistema_pedidos`.`productos`
    WHERE id_producto = p_id_producto;
    
    -- Buscar descuento específico para este producto y cliente
    SELECT COALESCE(
        (SELECT 
            CASE 
                WHEN tipo = 'porcentaje' THEN v_precio_base * (valor/100)
                ELSE valor
            END
        FROM `sistema_pedidos`.`descuentos`
        WHERE id_producto = p_id_producto 
        AND id_cliente = p_id_cliente
        AND activo = 1
        AND CURRENT_DATE BETWEEN fecha_inicio AND IFNULL(fecha_fin, '9999-12-31')
        LIMIT 1),
        
        -- Si no hay específico, buscar descuento para el cliente en general
        (SELECT 
            CASE 
                WHEN tipo = 'porcentaje' THEN v_precio_base * (valor/100)
                ELSE valor
            END
        FROM `sistema_pedidos`.`descuentos`
        WHERE id_producto IS NULL
        AND id_cliente = p_id_cliente
        AND activo = 1
        AND CURRENT_DATE BETWEEN fecha_inicio AND IFNULL(fecha_fin, '9999-12-31')
        LIMIT 1),
        
        -- Si no hay para el cliente, buscar descuento general del producto
        (SELECT 
            CASE 
                WHEN tipo = 'porcentaje' THEN v_precio_base * (valor/100)
                ELSE valor
            END
        FROM `sistema_pedidos`.`descuentos`
        WHERE id_producto = p_id_producto
        AND id_cliente IS NULL
        AND activo = 1
        AND CURRENT_DATE BETWEEN fecha_inicio AND IFNULL(fecha_fin, '9999-12-31')
        LIMIT 1),
        
        0) INTO v_descuento;
    
    SET p_precio_final = v_precio_base - v_descuento;
    -- Asegurar que nunca sea negativo
    IF p_precio_final < 0 THEN
        SET p_precio_final = 0;
    END IF;
END$$

-- Procedimiento para crear una notificación
CREATE PROCEDURE `sistema_pedidos`.`crear_notificacion`(
    IN p_id_usuario INT,
    IN p_id_cliente INT,
    IN p_tipo VARCHAR(50),
    IN p_mensaje TEXT
)
BEGIN
    INSERT INTO `sistema_pedidos`.`notificaciones` 
    (id_usuario, id_cliente, tipo, mensaje)
    VALUES 
    (p_id_usuario, p_id_cliente, p_tipo, p_mensaje);
END$$

-- Procedimiento para actualizar el total de un pedido
CREATE PROCEDURE `sistema_pedidos`.`actualizar_total_pedido`(
    IN p_id_pedido INT
)
BEGIN
    UPDATE `sistema_pedidos`.`pedidos` p
    SET p.total = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM `sistema_pedidos`.`detalle_pedido`
        WHERE id_pedido = p_id_pedido
    )
    WHERE p.id_pedido = p_id_pedido;
END$$

-- Procedimiento para registrar acción de auditoría
CREATE PROCEDURE `sistema_pedidos`.`registrar_auditoria`(
    IN p_id_usuario INT,
    IN p_tipo_accion VARCHAR(50),
    IN p_tabla VARCHAR(50),
    IN p_registro_id INT,
    IN p_detalle TEXT,
    IN p_valor_anterior TEXT,
    IN p_valor_nuevo TEXT,
    IN p_direccion_ip VARCHAR(45)
)
BEGIN
    INSERT INTO `sistema_pedidos`.`auditoria_acciones`
    (id_usuario, tipo_accion, tabla, registro_id, detalle, valor_anterior, valor_nuevo, direccion_ip)
    VALUES
    (p_id_usuario, p_tipo_accion, p_tabla, p_registro_id, p_detalle, p_valor_anterior, p_valor_nuevo, p_direccion_ip);
END$$

DELIMITER ;

-- --------------------------------------------------------
-- 6. TRIGGERS
-- --------------------------------------------------------

DELIMITER $$

-- Trigger para actualizar subtotal en detalle_pedido
CREATE TRIGGER `sistema_pedidos`.`trg_detalle_before_insert`
BEFORE INSERT ON `sistema_pedidos`.`detalle_pedido`
FOR EACH ROW
BEGIN
    SET NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
END$$

CREATE TRIGGER `sistema_pedidos`.`trg_detalle_before_update`
BEFORE UPDATE ON `sistema_pedidos`.`detalle_pedido`
FOR EACH ROW
BEGIN
    SET NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
END$$

-- Trigger para actualizar total del pedido cuando cambia un detalle
CREATE TRIGGER `sistema_pedidos`.`trg_detalle_after_insert`
AFTER INSERT ON `sistema_pedidos`.`detalle_pedido`
FOR EACH ROW
BEGIN
    CALL `sistema_pedidos`.`actualizar_total_pedido`(NEW.id_pedido);
END$$

CREATE TRIGGER `sistema_pedidos`.`trg_detalle_after_update`
AFTER UPDATE ON `sistema_pedidos`.`detalle_pedido`
FOR EACH ROW
BEGIN
    CALL `sistema_pedidos`.`actualizar_total_pedido`(NEW.id_pedido);
END$$

CREATE TRIGGER `sistema_pedidos`.`trg_detalle_after_delete`
AFTER DELETE ON `sistema_pedidos`.`detalle_pedido`
FOR EACH ROW
BEGIN
    CALL `sistema_pedidos`.`actualizar_total_pedido`(OLD.id_pedido);
END$$

-- Trigger para registrar cambios de precio
CREATE TRIGGER `sistema_pedidos`.`trg_producto_before_update`
BEFORE UPDATE ON `sistema_pedidos`.`productos`
FOR EACH ROW
BEGIN
    IF OLD.precio_unitario != NEW.precio_unitario THEN
        INSERT INTO `sistema_pedidos`.`historial_precios`
        (id_producto, precio_anterior, precio_nuevo, id_usuario)
        VALUES
        (OLD.id_producto, OLD.precio_unitario, NEW.precio_unitario, NEW.updated_by);
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------
-- 7. DATOS INICIALES PARA NUEVAS TABLAS
-- --------------------------------------------------------

-- Configuraciones básicas del sistema
INSERT INTO `sistema_pedidos`.`configuraciones` 
(clave, valor, descripcion) VALUES
('SISTEMA_NOMBRE', 'Sistema de Pedidos TV', 'Nombre del sistema'),
('EMAIL_NOTIFICACIONES', 'notificaciones@tierravolga.com', 'Email para envío de notificaciones'),
('DIAS_RECORDATORIO_PEDIDO', '7', 'Días de anticipación para recordar pedidos programados'),
('VERSION_DB', '1.2.0', 'Versión actual de la base de datos');

-- --------------------------------------------------------
-- 8. ÍNDICES ADICIONALES PARA MEJORAR BÚSQUEDAS COMUNES
-- --------------------------------------------------------

-- Índice para búsqueda rápida de usuarios por email
ALTER TABLE `sistema_pedidos`.`usuarios` ADD INDEX `idx_usuarios_email` (`email`);

-- Índice compuesto para buscar pedidos por cliente y estado
ALTER TABLE `sistema_pedidos`.`pedidos` ADD INDEX `idx_pedidos_cliente_estado` (`id_cliente`, `estado`);

-- Índice compuesto para buscar pedidos por fecha y estado
ALTER TABLE `sistema_pedidos`.`pedidos` ADD INDEX `idx_pedidos_fecha_estado` (`fecha_pedido`, `estado`);
