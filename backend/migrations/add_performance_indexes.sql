-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE PERFORMANCE
-- Ejecutar con: mysql -u root -p sistema_pedidos < add_performance_indexes.sql 2>/dev/null || true
-- Los errores de índices duplicados se ignoran automáticamente
-- =====================================================

-- COTIZACIONES (consultas por cliente, estado, fecha)
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones (id_cliente);
CREATE INDEX idx_cotizaciones_fecha ON cotizaciones (fecha_creacion);
CREATE INDEX idx_cotizaciones_numero ON cotizaciones (numero_cotizacion);

-- PEDIDOS (consultas por cliente, fecha, estado)
CREATE INDEX idx_pedidos_cliente ON pedidos (id_cliente);
CREATE INDEX idx_pedidos_fecha ON pedidos (fecha_pedido);
CREATE INDEX idx_pedidos_estado ON pedidos (estado);
CREATE INDEX idx_pedidos_cotizacion ON pedidos (id_cotizacion);

-- DETALLE PEDIDOS (joins frecuentes con pedidos y productos)
CREATE INDEX idx_detalle_pedido ON detalle_pedido (id_pedido);
CREATE INDEX idx_detalle_producto ON detalle_pedido (id_producto);

-- STOCK VACUNAS (consultas por vacuna, vencimiento, estado)
CREATE INDEX idx_stock_vacuna ON stock_vacunas (id_vacuna);
CREATE INDEX idx_stock_vencimiento ON stock_vacunas (fecha_vencimiento);
CREATE INDEX idx_stock_activo ON stock_vacunas (activo);
CREATE INDEX idx_stock_lote ON stock_vacunas (lote);
CREATE INDEX idx_stock_proveedor ON stock_vacunas (id_proveedor);

-- CALENDARIO VACUNACIÓN (consultas por cotización, fecha)
CREATE INDEX idx_calendario_cotizacion ON calendario_vacunacion (id_cotizacion);
CREATE INDEX idx_calendario_fecha ON calendario_vacunacion (fecha_aplicacion_programada);
CREATE INDEX idx_calendario_estado ON calendario_vacunacion (estado_entrega);
CREATE INDEX idx_calendario_stock ON calendario_vacunacion (id_stock_vacuna);

-- CONTROL ENTREGAS (consultas por calendario, fecha)
CREATE INDEX idx_control_calendario ON control_entregas (id_calendario);
CREATE INDEX idx_control_fecha ON control_entregas (fecha_entrega);

-- MOVIMIENTOS STOCK VACUNAS (consultas por stock, fecha)
CREATE INDEX idx_movimientos_stock ON movimientos_stock_vacunas (id_stock_vacuna);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock_vacunas (fecha_movimiento);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock_vacunas (tipo_movimiento);

-- RESERVAS STOCK (consultas por stock y cotización)
CREATE INDEX idx_reservas_stock ON reservas_stock_vacunas (id_stock_vacuna);
CREATE INDEX idx_reservas_cotizacion ON reservas_stock_vacunas (id_cotizacion);
CREATE INDEX idx_reservas_activa ON reservas_stock_vacunas (activa);

-- PRODUCTOS (consultas por tipo, estado)
CREATE INDEX idx_productos_tipo ON productos (tipo_producto);
CREATE INDEX idx_productos_habilitado ON productos (habilitado);

-- VACUNAS (consultas por proveedor, patología)
CREATE INDEX idx_vacunas_proveedor ON vacunas (id_proveedor);
CREATE INDEX idx_vacunas_patologia ON vacunas (id_patologia);
CREATE INDEX idx_vacunas_activa ON vacunas (activa);

-- CLIENTES (consultas por estado, búsqueda por nombre/razón social)
CREATE INDEX idx_clientes_habilitado ON clientes (habilitado);
CREATE INDEX idx_clientes_bloqueado ON clientes (bloqueado);
CREATE INDEX idx_clientes_razon_social ON clientes (razon_social);

-- LIQUIDACIONES (consultas por cotización, fecha)
CREATE INDEX idx_liquidaciones_cotizacion ON liquidaciones (id_cotizacion);
CREATE INDEX idx_liquidaciones_fecha ON liquidaciones (fecha_liquidacion);
CREATE INDEX idx_liquidaciones_estado ON liquidaciones (estado);

-- LISTAS DE PRECIOS
CREATE INDEX idx_listas_activa ON listas_precios (activa);
CREATE INDEX idx_listas_tipo ON listas_precios (tipo);

-- PRECIOS POR LISTA (joins frecuentes)
CREATE INDEX idx_precios_producto ON precios_por_lista (id_producto);
CREATE INDEX idx_precios_lista ON precios_por_lista (id_lista);
CREATE INDEX idx_precios_activo ON precios_por_lista (activo);

-- ÍNDICES COMPUESTOS para consultas complejas frecuentes
CREATE INDEX idx_stock_vacuna_activo_vencimiento ON stock_vacunas (id_vacuna, activo, fecha_vencimiento);
CREATE INDEX idx_calendario_cotizacion_fecha ON calendario_vacunacion (id_cotizacion, fecha_aplicacion_programada);
CREATE INDEX idx_cotizaciones_cliente_fecha ON cotizaciones (id_cliente, fecha_creacion);

-- Verificar índices creados
SHOW INDEX FROM cotizaciones;
SHOW INDEX FROM pedidos;
SHOW INDEX FROM stock_vacunas;
SHOW INDEX FROM calendario_vacunacion;
