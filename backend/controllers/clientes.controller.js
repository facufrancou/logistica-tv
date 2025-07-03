const db = require('../db/connection');

exports.getClientes = (req, res) => {
  db.query('SELECT * FROM clientes', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

exports.createCliente = (req, res) => {
  const { nombre, cuit, direccion, telefono, email } = req.body;

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    INSERT INTO clientes (nombre, cuit, direccion, telefono, email)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(query, [nombre, cuit, direccion, telefono, email], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ id_cliente: result.insertId, nombre, cuit, direccion, telefono, email });
  });
};

exports.updateCliente = (req, res) => {
  const { id } = req.params;
  const { nombre, cuit, direccion, telefono, email } = req.body;

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    UPDATE clientes
    SET nombre = ?, cuit = ?, direccion = ?, telefono = ?, email = ?
    WHERE id_cliente = ?
  `;
  db.query(query, [nombre, cuit, direccion, telefono, email, id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ id_cliente: parseInt(id), nombre, cuit, direccion, telefono, email });
  });
};
