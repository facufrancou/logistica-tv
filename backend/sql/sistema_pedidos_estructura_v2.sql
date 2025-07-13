CREATE DATABASE IF NOT EXISTS sistema_pedidos;
USE sistema_pedidos;

-- ...existing code...
CREATE TABLE clientes (
  id_cliente INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  cuit VARCHAR(255) NOT NULL,
  email TEXT,
  telefono VARCHAR(255),
  direccion TEXT,
  PRIMARY KEY (id_cliente)
);

CREATE TABLE rol (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rol_type BIGINT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE usuarios (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  rol_id BIGINT UNSIGNED NOT NULL,
  id_cliente INT NULL,
  PRIMARY KEY (id_usuario),
  FOREIGN KEY (rol_id) REFERENCES rol(id),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE productos (
  id_producto INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio_unitario DECIMAL(10,2) NOT NULL,
  stock INT,
  id_proveedor INT,
  PRIMARY KEY (id_producto),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE pedidos (
  id_pedido INT NOT NULL AUTO_INCREMENT,
  id_cliente INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2),
  seguimiento_dist VARCHAR(50) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  fecha_proximo_pedido DATE NULL,
  PRIMARY KEY (id_pedido),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE detalle_pedido (
  id_detalle INT NOT NULL AUTO_INCREMENT,
  id_pedido INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2),
  PRIMARY KEY (id_detalle),
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

CREATE TABLE pedido_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(100) NOT NULL UNIQUE,
  id_cliente INT NOT NULL,
  expires_at DATETIME NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE proveedores (
  id_proveedor INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id_proveedor)
);

ALTER TABLE clientes ADD COLUMN habilitado BOOLEAN DEFAULT true;
ALTER TABLE clientes ADD COLUMN fecha_proximo_pedido DATE;

-- Crear tabla productos habilitados por cliente
CREATE TABLE productos_habilitados (
  id_cliente INT NOT NULL,
  id_producto INT NOT NULL,
  PRIMARY KEY (id_cliente, id_producto),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- NUEVAS FUNCIONALIDADES --

-- Gestión de lotes y vencimientos
CREATE TABLE lotes (
  id_lote INT NOT NULL AUTO_INCREMENT,
  id_producto INT NOT NULL,
  nro_lote VARCHAR(100),
  fecha_vencimiento DATE,
  cantidad INT,
  PRIMARY KEY (id_lote),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- Gestión de compras
CREATE TABLE ordenes_compra (
  id_orden INT NOT NULL AUTO_INCREMENT,
  id_proveedor INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'pendiente',
  total DECIMAL(10,2),
  PRIMARY KEY (id_orden),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE detalle_orden_compra (
  id_detalle INT NOT NULL AUTO_INCREMENT,
  id_orden INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  PRIMARY KEY (id_detalle),
  FOREIGN KEY (id_orden) REFERENCES ordenes_compra(id_orden),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- Gestión de cuentas corrientes
CREATE TABLE cuentas_corrientes (
  id_ctacte INT NOT NULL AUTO_INCREMENT,
  id_cliente INT NOT NULL,
  nro_cuenta VARCHAR(100),
  limite DECIMAL(10,2),
  observaciones TEXT,
  PRIMARY KEY (id_ctacte),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE movimientos_ctacte (
  id_movimiento INT NOT NULL AUTO_INCREMENT,
  id_ctacte INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(50),
  monto DECIMAL(10,2),
  descripcion TEXT,
  PRIMARY KEY (id_movimiento),
  FOREIGN KEY (id_ctacte) REFERENCES cuentas_corrientes(id_ctacte)
);

-- Auditoría y registro de actividad
CREATE TABLE auditoria (
  id INT NOT NULL AUTO_INCREMENT,
  id_usuario INT,
  accion VARCHAR(255),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  detalles TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
