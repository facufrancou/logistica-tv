-- Migración para aumentar la precisión de campos de precio
-- Esto permite manejar cotizaciones con grandes cantidades de animales
-- Cambia de DECIMAL(10,2) a DECIMAL(15,2) para soportar valores hasta 9,999,999,999,999.99

-- Cotizaciones
ALTER TABLE cotizaciones MODIFY COLUMN precio_total DECIMAL(15, 2);

-- Planes Vacunales
ALTER TABLE planes_vacunales MODIFY COLUMN precio_total DECIMAL(15, 2);

-- Remitos
ALTER TABLE remitos MODIFY COLUMN precio_total DECIMAL(15, 2);

-- Ventas Directas
ALTER TABLE ventas_directas MODIFY COLUMN precio_total DECIMAL(15, 2);

-- Detalle Cotizacion (subtotales pueden ser grandes también)
ALTER TABLE detalle_cotizaciones MODIFY COLUMN precio_base_producto DECIMAL(15, 2);
ALTER TABLE detalle_cotizaciones MODIFY COLUMN precio_unitario DECIMAL(15, 2);
ALTER TABLE detalle_cotizaciones MODIFY COLUMN precio_final_calculado DECIMAL(15, 2);
ALTER TABLE detalle_cotizaciones MODIFY COLUMN subtotal DECIMAL(15, 2);

-- Detalle Remitos
ALTER TABLE detalle_remitos MODIFY COLUMN precio_unitario DECIMAL(15, 2);
ALTER TABLE detalle_remitos MODIFY COLUMN subtotal DECIMAL(15, 2);

-- Detalle Ventas Directas
ALTER TABLE detalle_ventas_directas MODIFY COLUMN precio_unitario DECIMAL(15, 2);
ALTER TABLE detalle_ventas_directas MODIFY COLUMN subtotal DECIMAL(15, 2);

-- Facturas (si aplica)
ALTER TABLE facturas MODIFY COLUMN monto_total DECIMAL(15, 2);

-- Resumen Liquidaciones
ALTER TABLE resumenes_liquidacion MODIFY COLUMN total_facturado DECIMAL(15, 2);
ALTER TABLE resumenes_liquidacion MODIFY COLUMN total_pendiente DECIMAL(15, 2);
ALTER TABLE resumenes_liquidacion MODIFY COLUMN total_pagado DECIMAL(15, 2);
