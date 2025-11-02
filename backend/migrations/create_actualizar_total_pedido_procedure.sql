-- Script para crear el procedimiento almacenado actualizar_total_pedido
-- Este procedimiento se ejecuta automáticamente cuando se modifican detalles de pedido

DELIMITER $$

DROP PROCEDURE IF EXISTS `actualizar_total_pedido`$$

CREATE PROCEDURE `actualizar_total_pedido`(IN pedido_id INT)
BEGIN
    DECLARE nuevo_total DECIMAL(10,2);
    
    -- Calcular el nuevo total sumando todos los subtotales del detalle
    SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_total
    FROM detalle_pedido
    WHERE id_pedido = pedido_id;
    
    -- Actualizar el total en la tabla pedidos
    UPDATE pedidos
    SET total = nuevo_total,
        updated_at = NOW()
    WHERE id_pedido = pedido_id;
END$$

DELIMITER ;

-- Verificar que el procedimiento se creó correctamente
SHOW PROCEDURE STATUS WHERE Name = 'actualizar_total_pedido';
