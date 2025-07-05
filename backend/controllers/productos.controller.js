const db = require('../db/connection');

exports.getProductos = (req, res) => {
  const query = `
    SELECT pr.*, p.nombre AS proveedor_nombre
    FROM productos pr
    LEFT JOIN proveedores p ON pr.id_proveedor = p.id_proveedor
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};


exports.createProducto = (req, res) => {
  const { nombre, precio_unitario, descripcion, id_proveedor } = req.body;

  if (!nombre || precio_unitario === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  const query = `
    INSERT INTO productos (nombre, precio_unitario, descripcion, id_proveedor)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    query,
    [nombre, precio_unitario, descripcion || '', id_proveedor || null],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.status(201).json({
        id_producto: result.insertId,
        nombre,
        precio_unitario,
        descripcion,
        id_proveedor
      });
    }
  );
};

exports.updateProducto = (req, res) => {
  const { id } = req.params;
  const { nombre, precio_unitario, descripcion, id_proveedor } = req.body;

  if (!nombre || precio_unitario === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  const query = `
    UPDATE productos
    SET nombre = ?, precio_unitario = ?, descripcion = ?, id_proveedor = ?
    WHERE id_producto = ?
  `;

  db.query(
    query,
    [nombre, precio_unitario, descripcion || '', id_proveedor || null, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({
        id_producto: parseInt(id),
        nombre,
        precio_unitario,
        descripcion,
        id_proveedor
      });
    }
  );
};
