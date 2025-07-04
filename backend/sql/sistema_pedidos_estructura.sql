
CREATE DATABASE IF NOT EXISTS sistema_pedidos;
USE sistema_pedidos;


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
  password VARCHAR(255) NOT NULL,         -- 👈 nueva columna
  rol_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_usuario),
  FOREIGN KEY (rol_id) REFERENCES rol(id)
);


CREATE TABLE productos (
  id_producto INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio_unitario DECIMAL(10,2) NOT NULL,
  stock INT,
  PRIMARY KEY (id_producto)
);

CREATE TABLE pedidos (
  id_pedido INT NOT NULL AUTO_INCREMENT,
  id_cliente INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2),
  seguimiento_dist VARCHAR(50) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
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

-- Agregar campo para inhabilitar clientes
ALTER TABLE clientes ADD COLUMN habilitado BOOLEAN DEFAULT true;

-- Agregar campo de próxima fecha de pedido
ALTER TABLE clientes ADD COLUMN fecha_proximo_pedido DATE;

-- Agregar campo de próxima fecha de pedido
ALTER TABLE pedidos ADD COLUMN fecha_proximo_pedido DATE NULL;

-- Crear tabla productos habilitados por cliente
CREATE TABLE productos_habilitados (
  id_cliente INT NOT NULL,
  id_producto INT NOT NULL,
  PRIMARY KEY (id_cliente, id_producto),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);