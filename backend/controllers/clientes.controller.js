const db = require('../db/connection');

exports.getClientes = (req, res) => {
  db.query('SELECT * FROM clientes', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

exports.createCliente = (req, res) => {
  const { nombre, cuit, direccion, telefono, email, habilitado = true } = req.body;

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    INSERT INTO clientes (nombre, cuit, direccion, telefono, email, habilitado)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [nombre, cuit, direccion, telefono, email, habilitado], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ id_cliente: result.insertId, nombre, cuit, direccion, telefono, email, habilitado });
  });
};

exports.updateCliente = (req, res) => {
  const { id } = req.params;
  const { nombre, cuit, direccion, telefono, email, habilitado = true } = req.body;

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    UPDATE clientes
    SET nombre = ?, cuit = ?, direccion = ?, telefono = ?, email = ?, habilitado = ?
    WHERE id_cliente = ?
  `;
  db.query(query, [nombre, cuit, direccion, telefono, email, habilitado, id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ id_cliente: parseInt(id), nombre, cuit, direccion, telefono, email, habilitado });
  });
};

// NUEVO: obtener productos habilitados para un cliente
exports.getProductosHabilitados = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT p.id_producto, p.nombre, p.descripcion, p.precio_unitario
    FROM productos_habilitados ph
    JOIN productos p ON ph.id_producto = p.id_producto
    WHERE ph.id_cliente = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener productos habilitados:', err);
      return res.status(500).send(err);
    }
    res.json(results);
  });
};

// NUEVO: asignar productos habilitados (reemplaza todos los actuales)
exports.setProductosHabilitados = (req, res) => {
  const { id } = req.params;
  const { productos } = req.body; // Array de IDs

  if (!Array.isArray(productos)) {
    return res.status(400).json({ error: 'Se esperaba un array de productos' });
  }

  const deleteQuery = 'DELETE FROM productos_habilitados WHERE id_cliente = ?';
  const insertQuery = 'INSERT INTO productos_habilitados (id_cliente, id_producto) VALUES ?';

  db.query(deleteQuery, [id], (err) => {
    if (err) {
      console.error('Error al borrar productos anteriores:', err);
      return res.status(500).send(err);
    }

    if (productos.length === 0) return res.json({ ok: true }); // nada más que borrar

    const values = productos.map(idProd => [id, idProd]);
    db.query(insertQuery, [values], (err) => {
      if (err) {
        console.error('Error al insertar productos nuevos:', err);
        return res.status(500).send(err);
      }

      res.json({ ok: true });
    });
  });
};

exports.getClientesConPedidosProximos = (req, res) => {
  const dias = parseInt(req.query.dias) || 0;

  let query = `
    SELECT 
      c.id_cliente,
      c.nombre,
      c.cuit,
      c.email,
      c.telefono,
      p.fecha_proximo_pedido
    FROM clientes c
    JOIN pedidos p ON c.id_cliente = p.id_cliente
    WHERE p.fecha_proximo_pedido IS NOT NULL
      AND p.fecha_proximo_pedido >= CURDATE()
      AND p.estado != 'completado'
  `;

  if (dias > 0) {
    query += ` AND p.fecha_proximo_pedido <= DATE_ADD(CURDATE(), INTERVAL ${dias} DAY)`;
  }

  query += ` ORDER BY p.fecha_proximo_pedido ASC`;

  const formatearFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  };

  /* const normalizarTelefono = (telefono) => {
    if (!telefono) return null;

    const limpio = telefono.replace(/\D/g, '');
    if (limpio.startsWith('549')) return `+${limpio}`;
    if (limpio.startsWith('54')) return `+${limpio}`;
    if (limpio.startsWith('0')) return `+549${limpio.slice(1)}`;
    if (limpio.length === 10) return `+549${limpio}`;
    return `+549${limpio}`;
  };
 */
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);

   /*  const formateados = results.map(cliente => ({
      ...cliente,
      fecha_proximo_pedido: formatearFecha(cliente.fecha_proximo_pedido),
      telefono: normalizarTelefono(cliente.telefono)
    }));
 */
    const formateados = results.map(cliente => ({
      ...cliente,
      fecha_proximo_pedido: formatearFecha(cliente.fecha_proximo_pedido),
      telefono: cliente.telefono
    }));

    res.json(formateados);
  });
};



