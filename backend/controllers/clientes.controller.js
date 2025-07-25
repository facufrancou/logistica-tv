const db = require('../db/connection');

exports.getClientes = (req, res) => {
  // Nos aseguramos de seleccionar explícitamente todos los campos relevantes
  db.query('SELECT id_cliente, nombre, cuit, email, telefono, direccion, habilitado, bloqueado, fecha_proximo_pedido FROM clientes', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

/**
 * Obtiene un cliente específico por su ID
 */
exports.getClienteById = (req, res) => {
  const { id } = req.params;
  
  db.query('SELECT id_cliente, nombre, cuit, email, telefono, direccion, habilitado, bloqueado, fecha_proximo_pedido FROM clientes WHERE id_cliente = ?', 
    [id], 
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener el cliente', details: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      
      res.json(results[0]);
    }
  );
};

exports.createCliente = (req, res) => {
  const { nombre, cuit, direccion, telefono, email, habilitado = true, bloqueado = false } = req.body;

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    INSERT INTO clientes (nombre, cuit, direccion, telefono, email, habilitado, bloqueado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [nombre, cuit, direccion, telefono, email, habilitado, bloqueado], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ id_cliente: result.insertId, nombre, cuit, direccion, telefono, email, habilitado, bloqueado });
  });
};

exports.updateCliente = (req, res) => {
  const { id } = req.params;
  const { nombre, cuit, direccion, telefono, email, habilitado = true, bloqueado = false } = req.body;

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    UPDATE clientes
    SET nombre = ?, cuit = ?, direccion = ?, telefono = ?, email = ?, habilitado = ?, bloqueado = ?
    WHERE id_cliente = ?
  `;
  db.query(query, [nombre, cuit, direccion, telefono, email, habilitado, bloqueado, id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ id_cliente: parseInt(id), nombre, cuit, direccion, telefono, email, habilitado, bloqueado });
  });
};

/**
 * Actualiza específicamente el estado de activación de un cliente
 */
exports.updateClienteEstado = (req, res) => {
  const { id } = req.params;
  const { habilitado } = req.body;
  
  if (habilitado === undefined) {
    return res.status(400).json({ error: 'El estado de habilitación es obligatorio' });
  }

  const query = `
    UPDATE clientes
    SET habilitado = ?
    WHERE id_cliente = ?
  `;
  
  db.query(query, [habilitado, id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar el estado del cliente', details: err.message });
    
    db.query('SELECT * FROM clientes WHERE id_cliente = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener el cliente actualizado', details: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      
      res.json(results[0]);
    });
  });
};

/**
 * Actualiza específicamente el estado de bloqueo de un cliente
 */
exports.updateClienteBloqueo = (req, res) => {
  const { id } = req.params;
  const { bloqueado } = req.body;
  
  if (bloqueado === undefined) {
    return res.status(400).json({ error: 'El estado de bloqueo es obligatorio' });
  }

  const query = `
    UPDATE clientes
    SET bloqueado = ?
    WHERE id_cliente = ?
  `;
  
  db.query(query, [bloqueado, id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar el estado de bloqueo del cliente', details: err.message });
    
    db.query('SELECT * FROM clientes WHERE id_cliente = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener el cliente actualizado', details: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      
      res.json(results[0]);
    });
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



