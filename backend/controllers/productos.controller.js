const db = require('../db/connection');

exports.getProductos = (req, res) => {
  db.query('SELECT * FROM productos', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

exports.createProducto = (req, res) => {
  const { nombre, precio_unitario, descripcion } = req.body;

  if (!nombre || precio_unitario === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  const query = `
    INSERT INTO productos (nombre, precio_unitario, descripcion)
    VALUES (?, ?, ?)
  `;
  db.query(query, [nombre, precio_unitario, descripcion || ''], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ id_producto: result.insertId, nombre, precio_unitario, descripcion });
  });
};

exports.updateProducto = (req, res) => {
  const { id } = req.params;
  const { nombre, precio_unitario, descripcion } = req.body;

  if (!nombre || precio_unitario === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  const query = `
    UPDATE productos
    SET nombre = ?, precio_unitario = ?, descripcion = ?
    WHERE id_producto = ?
  `;
  db.query(query, [nombre, precio_unitario, descripcion || '', id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ id_producto: parseInt(id), nombre, precio_unitario, descripcion });
  });
};
