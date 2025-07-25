-- Script para agregar campo 'bloqueado' a la tabla clientes
USE sistema_pedidos;

-- Agregar la columna bloqueado después de habilitado
ALTER TABLE clientes 
ADD COLUMN bloqueado TINYINT(1) DEFAULT 0 AFTER habilitado;

-- Actualizar la columna para todos los clientes existentes
UPDATE clientes SET bloqueado = 0 WHERE bloqueado IS NULL;
