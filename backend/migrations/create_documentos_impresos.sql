-- =====================================================
-- MIGRACIÓN: SISTEMA DE PERSISTENCIA DE DOCUMENTOS IMPRESOS
-- Fecha: 2026-01-20
-- Descripción: Crear tablas para gestión de numeración correlativa
-- y persistencia de documentos impresos (órdenes de compra y remitos)
-- =====================================================

-- =====================================================
-- TABLA: Secuencias de Numeración
-- Mantiene los contadores correlativos para cada tipo de documento
-- =====================================================
CREATE TABLE IF NOT EXISTS secuencias_documentos (
    id_secuencia INT AUTO_INCREMENT PRIMARY KEY,
    tipo_documento ENUM('orden_compra', 'remito_entrega', 'remito_venta', 'factura') NOT NULL,
    prefijo VARCHAR(20) NOT NULL DEFAULT '',
    ultimo_numero INT NOT NULL DEFAULT 0,
    formato VARCHAR(50) NOT NULL DEFAULT '{PREFIJO}{ANIO}{MES}{NUMERO}',
    digitos_numero INT NOT NULL DEFAULT 5,
    reinicio_anual BOOLEAN DEFAULT FALSE,
    anio_actual INT DEFAULT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_tipo_prefijo (tipo_documento, prefijo),
    INDEX idx_secuencia_tipo (tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar secuencias iniciales (formato: PREFIJO-DDMMAAAA-SECUENCIAL)
INSERT INTO secuencias_documentos (tipo_documento, prefijo, ultimo_numero, formato, digitos_numero, reinicio_anual) VALUES
('orden_compra', 'OC', 0, 'OC-{DIA}{MES}{ANIO4}-{NUMERO}', 5, FALSE),
('remito_entrega', 'RE', 0, 'RE-{DIA}{MES}{ANIO4}-{NUMERO}', 5, FALSE),
('remito_venta', 'RV', 0, 'RV-{DIA}{MES}{ANIO4}-{NUMERO}', 5, FALSE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- TABLA: Documentos Impresos
-- Almacena metadatos de cada documento impreso
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos_impresos (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    tipo_documento ENUM('orden_compra', 'remito_entrega', 'remito_venta', 'factura') NOT NULL,
    numero_documento VARCHAR(50) NOT NULL,
    
    -- Referencias opcionales según el tipo
    id_orden_compra INT NULL,
    id_remito INT NULL,
    id_calendario INT NULL,
    id_cotizacion INT NULL,
    id_proveedor INT NULL,
    id_cliente INT NULL,
    
    -- Datos del documento al momento de imprimir
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datos_snapshot JSON NULL COMMENT 'Snapshot de los datos al momento de imprimir',
    
    -- Metadatos de impresión
    version_impresion INT DEFAULT 1 COMMENT 'Versión si se reimprime con cambios',
    motivo_reimpresion VARCHAR(255) NULL,
    es_copia BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    impreso_por INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    UNIQUE KEY uk_tipo_numero (tipo_documento, numero_documento),
    INDEX idx_doc_tipo (tipo_documento),
    INDEX idx_doc_fecha (fecha_emision),
    INDEX idx_doc_orden (id_orden_compra),
    INDEX idx_doc_remito (id_remito),
    INDEX idx_doc_calendario (id_calendario),
    INDEX idx_doc_cotizacion (id_cotizacion),
    INDEX idx_doc_proveedor (id_proveedor),
    INDEX idx_doc_cliente (id_cliente),
    
    -- Foreign keys
    CONSTRAINT fk_doc_orden FOREIGN KEY (id_orden_compra) 
        REFERENCES ordenes_compra(id_orden_compra) ON DELETE SET NULL,
    CONSTRAINT fk_doc_remito FOREIGN KEY (id_remito) 
        REFERENCES remitos(id_remito) ON DELETE SET NULL,
    CONSTRAINT fk_doc_calendario FOREIGN KEY (id_calendario) 
        REFERENCES calendario_vacunacion(id_calendario) ON DELETE SET NULL,
    CONSTRAINT fk_doc_cotizacion FOREIGN KEY (id_cotizacion) 
        REFERENCES cotizaciones(id_cotizacion) ON DELETE SET NULL,
    CONSTRAINT fk_doc_proveedor FOREIGN KEY (id_proveedor) 
        REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
    CONSTRAINT fk_doc_cliente FOREIGN KEY (id_cliente) 
        REFERENCES clientes(id_cliente) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: Archivos PDF Almacenados (opcional)
-- Para guardar una copia del PDF generado
-- =====================================================
CREATE TABLE IF NOT EXISTS archivos_documentos (
    id_archivo INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NULL COMMENT 'Ruta en disco si se guarda en filesystem',
    contenido_pdf LONGBLOB NULL COMMENT 'PDF binario si se guarda en BD',
    tamano_bytes INT NULL,
    hash_archivo VARCHAR(64) NULL COMMENT 'SHA-256 para verificación de integridad',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_archivo_documento (id_documento),
    
    CONSTRAINT fk_archivo_documento FOREIGN KEY (id_documento) 
        REFERENCES documentos_impresos(id_documento) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: Historial de Impresiones
-- Para auditoría de cada vez que se imprime/descarga
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_impresiones (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    tipo_accion ENUM('primera_impresion', 'reimpresion', 'descarga', 'visualizacion', 'envio_email') NOT NULL,
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NULL,
    ip_origen VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    observaciones VARCHAR(255) NULL,
    
    INDEX idx_hist_documento (id_documento),
    INDEX idx_hist_fecha (fecha_accion),
    INDEX idx_hist_usuario (usuario_id),
    
    CONSTRAINT fk_hist_documento FOREIGN KEY (id_documento) 
        REFERENCES documentos_impresos(id_documento) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STORED PROCEDURE: Generar siguiente número de documento
-- Garantiza numeración correlativa thread-safe
-- =====================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_siguiente_numero_documento(
    IN p_tipo_documento VARCHAR(30),
    IN p_prefijo VARCHAR(20),
    OUT p_numero_completo VARCHAR(50)
)
BEGIN
    DECLARE v_ultimo_numero INT;
    DECLARE v_formato VARCHAR(50);
    DECLARE v_digitos INT;
    DECLARE v_reinicio_anual BOOLEAN;
    DECLARE v_anio_actual INT;
    DECLARE v_anio_nuevo INT;
    DECLARE v_nuevo_numero INT;
    
    -- Obtener año actual
    SET v_anio_nuevo = YEAR(CURDATE());
    
    -- Bloquear la fila para actualización atómica
    SELECT 
        ultimo_numero, 
        formato, 
        digitos_numero, 
        reinicio_anual,
        COALESCE(anio_actual, v_anio_nuevo)
    INTO 
        v_ultimo_numero, 
        v_formato, 
        v_digitos, 
        v_reinicio_anual,
        v_anio_actual
    FROM secuencias_documentos
    WHERE tipo_documento = p_tipo_documento 
      AND prefijo = COALESCE(p_prefijo, '')
      AND activo = TRUE
    FOR UPDATE;
    
    -- Si no existe la secuencia, crear una por defecto
    IF v_ultimo_numero IS NULL THEN
        INSERT INTO secuencias_documentos (tipo_documento, prefijo, ultimo_numero, formato, digitos_numero)
        VALUES (p_tipo_documento, COALESCE(p_prefijo, ''), 0, CONCAT(COALESCE(p_prefijo, ''), '-{ANIO}{MES}-{NUMERO}'), 5);
        
        SET v_ultimo_numero = 0;
        SET v_formato = CONCAT(COALESCE(p_prefijo, ''), '-{ANIO}{MES}-{NUMERO}');
        SET v_digitos = 5;
        SET v_reinicio_anual = FALSE;
        SET v_anio_actual = v_anio_nuevo;
    END IF;
    
    -- Verificar si hay que reiniciar por cambio de año
    IF v_reinicio_anual = TRUE AND v_anio_actual < v_anio_nuevo THEN
        SET v_nuevo_numero = 1;
    ELSE
        SET v_nuevo_numero = v_ultimo_numero + 1;
    END IF;
    
    -- Actualizar el contador
    UPDATE secuencias_documentos
    SET 
        ultimo_numero = v_nuevo_numero,
        anio_actual = v_anio_nuevo,
        updated_at = CURRENT_TIMESTAMP
    WHERE tipo_documento = p_tipo_documento 
      AND prefijo = COALESCE(p_prefijo, '')
      AND activo = TRUE;
    
    -- Construir el número formateado
    SET p_numero_completo = v_formato;
    SET p_numero_completo = REPLACE(p_numero_completo, '{PREFIJO}', COALESCE(p_prefijo, ''));
    SET p_numero_completo = REPLACE(p_numero_completo, '{ANIO}', SUBSTRING(CAST(v_anio_nuevo AS CHAR), 3, 2));
    SET p_numero_completo = REPLACE(p_numero_completo, '{ANIO4}', CAST(v_anio_nuevo AS CHAR));
    SET p_numero_completo = REPLACE(p_numero_completo, '{MES}', LPAD(MONTH(CURDATE()), 2, '0'));
    SET p_numero_completo = REPLACE(p_numero_completo, '{DIA}', LPAD(DAY(CURDATE()), 2, '0'));
    SET p_numero_completo = REPLACE(p_numero_completo, '{NUMERO}', LPAD(v_nuevo_numero, v_digitos, '0'));
    
END //

-- =====================================================
-- STORED PROCEDURE: Registrar documento impreso
-- =====================================================
CREATE PROCEDURE IF NOT EXISTS sp_registrar_documento_impreso(
    IN p_tipo_documento VARCHAR(30),
    IN p_id_orden_compra INT,
    IN p_id_remito INT,
    IN p_id_calendario INT,
    IN p_id_cotizacion INT,
    IN p_id_proveedor INT,
    IN p_id_cliente INT,
    IN p_datos_snapshot JSON,
    IN p_impreso_por INT,
    OUT p_id_documento INT,
    OUT p_numero_documento VARCHAR(50)
)
BEGIN
    DECLARE v_prefijo VARCHAR(20);
    
    -- Determinar prefijo según tipo
    CASE p_tipo_documento
        WHEN 'orden_compra' THEN SET v_prefijo = 'OC';
        WHEN 'remito_entrega' THEN SET v_prefijo = 'RE';
        WHEN 'remito_venta' THEN SET v_prefijo = 'RV';
        ELSE SET v_prefijo = 'DOC';
    END CASE;
    
    -- Obtener siguiente número correlativo
    CALL sp_siguiente_numero_documento(p_tipo_documento, v_prefijo, p_numero_documento);
    
    -- Insertar el documento
    INSERT INTO documentos_impresos (
        tipo_documento,
        numero_documento,
        id_orden_compra,
        id_remito,
        id_calendario,
        id_cotizacion,
        id_proveedor,
        id_cliente,
        fecha_emision,
        datos_snapshot,
        impreso_por
    ) VALUES (
        p_tipo_documento,
        p_numero_documento,
        p_id_orden_compra,
        p_id_remito,
        p_id_calendario,
        p_id_cotizacion,
        p_id_proveedor,
        p_id_cliente,
        NOW(),
        p_datos_snapshot,
        p_impreso_por
    );
    
    SET p_id_documento = LAST_INSERT_ID();
    
    -- Registrar en historial
    INSERT INTO historial_impresiones (id_documento, tipo_accion, usuario_id)
    VALUES (p_id_documento, 'primera_impresion', p_impreso_por);
    
END //

DELIMITER ;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de documentos recientes
CREATE OR REPLACE VIEW v_documentos_recientes AS
SELECT 
    di.id_documento,
    di.tipo_documento,
    di.numero_documento,
    di.fecha_emision,
    di.version_impresion,
    di.es_copia,
    c.nombre AS cliente_nombre,
    p.nombre AS proveedor_nombre,
    cot.numero_cotizacion,
    oc.numero_orden AS orden_compra_numero,
    (SELECT COUNT(*) FROM historial_impresiones WHERE id_documento = di.id_documento) AS total_impresiones,
    (SELECT MAX(fecha_accion) FROM historial_impresiones WHERE id_documento = di.id_documento) AS ultima_impresion
FROM documentos_impresos di
LEFT JOIN clientes c ON di.id_cliente = c.id_cliente
LEFT JOIN proveedores p ON di.id_proveedor = p.id_proveedor
LEFT JOIN cotizaciones cot ON di.id_cotizacion = cot.id_cotizacion
LEFT JOIN ordenes_compra oc ON di.id_orden_compra = oc.id_orden_compra
ORDER BY di.fecha_emision DESC;

-- Vista de secuencias activas
CREATE OR REPLACE VIEW v_secuencias_activas AS
SELECT 
    tipo_documento,
    prefijo,
    ultimo_numero,
    formato,
    CASE 
        WHEN reinicio_anual THEN 'Anual'
        ELSE 'Continuo'
    END AS tipo_reinicio,
    CONCAT(
        REPLACE(
            REPLACE(
                REPLACE(formato, '{ANIO}', SUBSTRING(CAST(YEAR(CURDATE()) AS CHAR), 3, 2)),
                '{MES}', LPAD(MONTH(CURDATE()), 2, '0')
            ),
            '{NUMERO}', LPAD(ultimo_numero + 1, digitos_numero, '0')
        )
    ) AS proximo_numero_ejemplo
FROM secuencias_documentos
WHERE activo = TRUE;

-- =====================================================
-- ACTUALIZACIÓN DE TABLAS EXISTENTES
-- (MySQL no soporta IF NOT EXISTS para columnas, usamos procedimiento)
-- =====================================================

DELIMITER //

-- Procedimiento para agregar columnas de forma segura
DROP PROCEDURE IF EXISTS sp_add_column_if_not_exists //
CREATE PROCEDURE sp_add_column_if_not_exists(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_definition VARCHAR(500)
)
BEGIN
    DECLARE v_column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO v_column_exists
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name 
      AND COLUMN_NAME = p_column_name;
    
    IF v_column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', p_table_name, ' ADD COLUMN ', p_column_name, ' ', p_column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

-- Procedimiento para agregar índices de forma segura
DROP PROCEDURE IF EXISTS sp_add_index_if_not_exists //
CREATE PROCEDURE sp_add_index_if_not_exists(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_column_name VARCHAR(64)
)
BEGIN
    DECLARE v_index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO v_index_exists
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name 
      AND INDEX_NAME = p_index_name;
    
    IF v_index_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', p_table_name, ' ADD INDEX ', p_index_name, ' (', p_column_name, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- Agregar campos a ordenes_compra
CALL sp_add_column_if_not_exists('ordenes_compra', 'numero_documento_oficial', "VARCHAR(50) NULL COMMENT 'Número correlativo oficial asignado al imprimir'");
CALL sp_add_column_if_not_exists('ordenes_compra', 'fecha_primera_impresion', 'DATETIME NULL');
CALL sp_add_index_if_not_exists('ordenes_compra', 'idx_oc_num_oficial', 'numero_documento_oficial');

-- Agregar campos a calendario_vacunacion
CALL sp_add_column_if_not_exists('calendario_vacunacion', 'numero_remito_entrega', "VARCHAR(50) NULL COMMENT 'Número de remito de entrega asignado'");
CALL sp_add_column_if_not_exists('calendario_vacunacion', 'fecha_impresion_remito', 'DATETIME NULL');
CALL sp_add_index_if_not_exists('calendario_vacunacion', 'idx_cal_num_remito', 'numero_remito_entrega');

-- Agregar campos a remitos
CALL sp_add_column_if_not_exists('remitos', 'numero_documento_oficial', 'VARCHAR(50) NULL');
CALL sp_add_column_if_not_exists('remitos', 'fecha_primera_impresion', 'DATETIME NULL');
CALL sp_add_index_if_not_exists('remitos', 'idx_rem_num_oficial', 'numero_documento_oficial');

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================
/*
ESTRATEGIA DE IMPLEMENTACIÓN:

1. PRIMERA IMPRESIÓN:
   - Cuando se genera un PDF por primera vez, llamar sp_registrar_documento_impreso
   - Esto asigna un número correlativo único y guarda el snapshot de datos
   - El número asignado se actualiza en la tabla fuente (ordenes_compra, calendario, etc.)

2. REIMPRESIÓN:
   - Si el registro ya tiene numero_documento_oficial, usar ese número
   - Registrar en historial_impresiones como 'reimpresion'
   - Opcionalmente verificar si los datos cambiaron desde el snapshot

3. COPIAS:
   - Marcar es_copia = TRUE para indicar que es una copia del original
   - Mantener el mismo número pero agregar "COPIA" al PDF

4. ALMACENAMIENTO DE PDF:
   - Opción A: Guardar en archivos_documentos.contenido_pdf (BLOB)
   - Opción B: Guardar en filesystem y solo guardar ruta_archivo
   - Opción C: No guardar PDF, regenerar desde datos_snapshot cuando sea necesario

5. COMPATIBILIDAD HACIA ATRÁS:
   - Documentos existentes seguirán usando sus números actuales
   - Solo nuevas impresiones obtendrán números del sistema correlativo

EJEMPLO DE USO EN CÓDIGO:

// Verificar si ya tiene número oficial
if (!ordenCompra.numero_documento_oficial) {
  // Primera impresión - obtener número correlativo
  const result = await prisma.$queryRaw`
    CALL sp_registrar_documento_impreso(
      'orden_compra',
      ${ordenId}, NULL, NULL, ${cotizacionId}, ${proveedorId}, ${clienteId},
      ${JSON.stringify(datosOrden)}, ${usuarioId},
      @id_doc, @num_doc
    );
    SELECT @id_doc as id_documento, @num_doc as numero_documento;
  `;
  
  // Actualizar orden con número oficial
  await prisma.ordenCompra.update({
    where: { id_orden_compra: ordenId },
    data: { 
      numero_documento_oficial: result.numero_documento,
      fecha_primera_impresion: new Date()
    }
  });
} else {
  // Reimpresión - registrar solo en historial
  await prisma.historialImpresiones.create({
    data: {
      id_documento: documentoExistente.id_documento,
      tipo_accion: 'reimpresion',
      usuario_id: usuarioId
    }
  });
}
*/
