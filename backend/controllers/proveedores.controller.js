const db = require('../db/connection');

// Obtener todos los proveedores
exports.getProveedores = (req, res) => {
  db.query('SELECT * FROM proveedores', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

// Crear un proveedor
exports.createProveedor = (req, res) => {
  const { nombre, activo = true } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  db.query(
    'INSERT INTO proveedores (nombre, activo) VALUES (?, ?)',
    [nombre, activo],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.status(201).json({ id_proveedor: result.insertId, nombre, activo });
    }
  );
};

// Actualizar proveedor
exports.updateProveedor = (req, res) => {
  const { id } = req.params;
  const { nombre, activo } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  db.query(
    'UPDATE proveedores SET nombre = ?, activo = ? WHERE id_proveedor = ?',
    [nombre, activo, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ id_proveedor: parseInt(id), nombre, activo });
    }
  );
};

// Desactivar proveedor (baja lógica)
exports.eliminarProveedor = (req, res) => {
  const { id } = req.params;

  db.query(
    'UPDATE proveedores SET activo = FALSE WHERE id_proveedor = ?',
    [id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ mensaje: 'Proveedor desactivado correctamente' });
    }
  );
};

// Obtener productos de un proveedor (útil para reportes o filtros)
exports.getProductosPorProveedor = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT p.id_producto, p.nombre, p.descripcion, p.precio_unitario
    FROM productos p
    WHERE p.id_proveedor = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};
