const db = require('../db/connection');
const crypto = require('crypto');

exports.getPedidos = (req, res) => {
  const query = `
    SELECT 
      p.id_pedido, 
      c.nombre AS cliente, 
      u.nombre AS vendedor, 
      p.fecha_pedido, 
      p.total, 
      p.estado,
      p.seguimiento_dist  -- ✅ agregado
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    JOIN usuarios u ON p.id_usuario = u.id_usuario
    ORDER BY p.fecha_pedido DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);

    const pedidosFormateados = results.map(p => {
      return {
        ...p,
        fecha_pedido: new Date(p.fecha_pedido).toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        total: new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 2
        }).format(p.total || 0)
      };
    });

    res.json(pedidosFormateados);
  });
};

exports.createPedido = (req, res) => {
  const { id_cliente, id_usuario, seguimiento_dist, productos, token } = req.body;
  if (!id_cliente || !productos || productos.length === 0) {
    return res.status(400).json({ error: 'Faltan datos del pedido' });
  }

  // Verificar si el cliente está habilitado
  db.query('SELECT habilitado FROM clientes WHERE id_cliente = ?', [id_cliente], (err, rows) => {
    if (err) return res.status(500).send(err);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const clienteHabilitado = rows[0].habilitado === 1;

    const fecha_pedido = new Date();
    const estado = 'pendiente';

    const ids = productos.map(p => p.id_producto);
    const precioQuery = `SELECT id_producto, precio_unitario FROM productos WHERE id_producto IN (${ids.join(',')})`;

    db.query(precioQuery, (err, rows) => {
      if (err) return res.status(500).send(err);

      let total = 0;
      const detalleInsert = [];

      productos.forEach(p => {
        const productoDB = rows.find(r => r.id_producto === p.id_producto);
        if (!productoDB) return;

        const precio_unitario = productoDB.precio_unitario;
        const subtotal = precio_unitario * p.cantidad;
        total += subtotal;

        detalleInsert.push({
          ...p,
          precio_unitario,
          subtotal
        });
      });

      const pedidoQuery = `
        INSERT INTO pedidos (id_cliente, id_usuario, fecha_pedido, total, seguimiento_dist, estado)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(pedidoQuery, [id_cliente, id_usuario || 1, fecha_pedido, total, seguimiento_dist || '', estado], (err2, result) => {
        if (err2) return res.status(500).send(err2);

        const id_pedido = result.insertId;
        const values = detalleInsert.map(p => [id_pedido, p.id_producto, p.cantidad, p.precio_unitario, p.subtotal]);

        const detalleQuery = `
          INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ?
        `;

        db.query(detalleQuery, [values], (err3) => {
          if (err3) return res.status(500).send(err3);

          if (token) {
            db.query('UPDATE pedido_tokens SET usado = TRUE WHERE token = ?', [token]);
          }

          // ✅ Respuesta personalizada si cliente está inhabilitado
          if (!clienteHabilitado) {
            return res.status(200).json({
              id_pedido,
              total,
              advertencia: 'El pedido fue registrado pero requiere revisión. Pónganse en contacto con su distribuidor '
            });
          }

          res.status(201).json({ id_pedido, total });
        });
      });
    });
  });
};

exports.completarPedido = (req, res) => {
  const { id } = req.params;
  db.query('UPDATE pedidos SET estado = "completado" WHERE id_pedido = ?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
};

exports.eliminarPedido = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM detalle_pedido WHERE id_pedido = ?', [id], (err1) => {
    if (err1) return res.status(500).send(err1);

    db.query('DELETE FROM pedidos WHERE id_pedido = ?', [id], (err2) => {
      if (err2) return res.status(500).send(err2);
      res.sendStatus(200);
    });
  });
};

exports.generarLinkPedido = (req, res) => {
  const { id_cliente } = req.params;
  const token = crypto.randomBytes(16).toString('hex');
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  const query = `
    INSERT INTO pedido_tokens (token, id_cliente, expires_at)
    VALUES (?, ?, ?)
  `;

  db.query(query, [token, id_cliente, expires_at], (err) => {
    if (err) return res.status(500).json({ error: 'Error al generar token' });

    const link = `http://localhost:3001/pedido/acceso?token=${token}`;
    res.json({ token, link });
  });
};

exports.validarTokenPedido = (req, res) => {
  const { token } = req.params;

  const query = `
    SELECT pt.id_cliente, c.nombre, c.cuit
    FROM pedido_tokens pt
    JOIN clientes c ON pt.id_cliente = c.id_cliente
    WHERE pt.token = ? AND pt.expires_at > NOW() AND pt.usado = FALSE
  `;

  db.query(query, [token], (err, rows) => {
    if (err) return res.status(500).send(err);
    if (rows.length === 0) return res.status(404).json({ error: 'Token inválido o expirado' });

    const cliente = {
      id_cliente: rows[0].id_cliente,
      nombre: rows[0].nombre,
      cuit: rows[0].cuit
    };

    // NUEVA CONSULTA: traer solo productos habilitados
    const productosQuery = `
      SELECT p.id_producto, p.nombre, p.precio_unitario, p.descripcion
      FROM productos_habilitados ph
      JOIN productos p ON p.id_producto = ph.id_producto
      WHERE ph.id_cliente = ?
    `;

    db.query(productosQuery, [cliente.id_cliente], (err2, productos) => {
      if (err2) return res.status(500).send(err2);
      res.json({ cliente, productos });
    });
  });
};

exports.actualizarPedido = (req, res) => {
  const { id } = req.params;
  const { id_cliente, seguimiento_dist, productos } = req.body;

  if (!id_cliente || !productos || productos.length === 0) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const ids = productos.map(p => p.id_producto);
  const precioQuery = `SELECT id_producto, precio_unitario FROM productos WHERE id_producto IN (${ids.join(',')})`;

  db.query(precioQuery, (err, rows) => {
    if (err) return res.status(500).send(err);

    let total = 0;
    const detalleInsert = [];

    productos.forEach(p => {
      const prod = rows.find(r => r.id_producto === p.id_producto);
      if (!prod) return;
      const subtotal = prod.precio_unitario * p.cantidad;
      total += subtotal;
      detalleInsert.push([id, p.id_producto, p.cantidad, prod.precio_unitario, subtotal]);
    });

    const updatePedido = `
      UPDATE pedidos SET id_cliente = ?, seguimiento_dist = ?, total = ? WHERE id_pedido = ?
    `;

    db.query(updatePedido, [id_cliente, seguimiento_dist || '', total, id], (err2) => {
      if (err2) return res.status(500).send(err2);

      const deleteDetalle = `DELETE FROM detalle_pedido WHERE id_pedido = ?`;
      db.query(deleteDetalle, [id], (err3) => {
        if (err3) return res.status(500).send(err3);

        const insertDetalle = `
          INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ?
        `;
        db.query(insertDetalle, [detalleInsert], (err4) => {
          if (err4) return res.status(500).send(err4);
          res.sendStatus(200);
        });
      });
    });
  });
};

exports.getPedidoPorId = (req, res) => {
  const { id } = req.params;

  const queryPedido = 'SELECT * FROM pedidos WHERE id_pedido = ?';
  const queryDetalle = 'SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?';

  db.query(queryPedido, [id], (err, pedidos) => {
    if (err) return res.status(500).send(err);
    if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    const pedido = pedidos[0];

    db.query(queryDetalle, [id], (err2, detalle) => {
      if (err2) return res.status(500).send(err2);
      pedido.productos = detalle;
      res.json(pedido);
    });
  });
};

exports.getPedidoParaRepetir = (req, res) => {
  const { id } = req.params;

  const queryPedido = 'SELECT id_cliente, seguimiento_dist FROM pedidos WHERE id_pedido = ?';
  const queryDetalle = 'SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?';

  db.query(queryPedido, [id], (err, pedidos) => {
    if (err) return res.status(500).send(err);
    if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    const pedido = pedidos[0];

    db.query(queryDetalle, [id], (err2, detalle) => {
      if (err2) return res.status(500).send(err2);
      pedido.productos = detalle;
      res.json(pedido);
    });
  });
};

exports.getUltimoPedidoPorCliente = (req, res) => {
  const { id_cliente } = req.params;

  const query = `
    SELECT p.id_pedido
    FROM pedidos p
    WHERE p.id_cliente = ?
    ORDER BY p.fecha_pedido DESC
    LIMIT 1
  `;

  db.query(query, [id_cliente], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.length === 0) return res.status(404).json({ error: 'No hay pedidos anteriores' });

    const id_pedido = result[0].id_pedido;

    db.query(
      'SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?',
      [id_pedido],
      (err2, productos) => {
        if (err2) return res.status(500).send(err2);
        res.json({ id_pedido, productos });
      }
    );
  });
};
