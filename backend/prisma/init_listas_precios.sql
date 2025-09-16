-- Script para inicializar las listas de precios básicas
-- Ejecutar después de aplicar las migraciones

INSERT INTO listas_precios (tipo, nombre, descripcion, activa, created_at, updated_at) VALUES
('L15', 'Lista de precios L15', 'Lista de precios con descuento del 15%', true, NOW(), NOW()),
('L18', 'Lista de precios L18', 'Lista de precios con descuento del 18%', true, NOW(), NOW()),
('L20', 'Lista de precios L20', 'Lista de precios con descuento del 20%', true, NOW(), NOW()),
('L25', 'Lista de precios L25', 'Lista de precios con descuento del 25%', true, NOW(), NOW()),
('L30', 'Lista de precios L30', 'Lista de precios con descuento del 30%', true, NOW(), NOW());
