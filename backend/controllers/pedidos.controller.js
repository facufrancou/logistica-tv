const db = require("../db/connection");
const crypto = require("crypto");

exports.getPedidos = (req, res) => {
  const { desde, hasta } = req.query;

  let query = `
    SELECT 
      p.id_pedido, c.nombre AS cliente, u.nombre AS vendedor,
      p.fecha_pedido, p.total, p.estado, p.seguimiento_dist, p.fecha_proximo_pedido
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    JOIN usuarios u ON p.id_usuario = u.id_usuario
  `;

  const params = [];
  if (desde && hasta) {
    query += " WHERE DATE(p.fecha_pedido) BETWEEN ? AND ?";
    params.push(desde, hasta);
  }

  query += " ORDER BY p.fecha_pedido DESC";

  db.query(query, params, (err, pedidos) => {
    if (err) return res.status(500).json({ error: "Error al obtener pedidos" });

    const procesados = [];
    let completados = 0;

    if (pedidos.length === 0) return res.json([]);

    pedidos.forEach((p) => {
      db.query(
        `
        SELECT 
          dp.id_producto,
          pr.nombre,
          pr.descripcion,
          dp.cantidad,
          prov.nombre AS proveedor_nombre
        FROM detalle_pedido dp
        JOIN productos pr ON dp.id_producto = pr.id_producto
        LEFT JOIN proveedores prov ON pr.id_proveedor = prov.id_proveedor
        WHERE dp.id_pedido = ?
        `,
        [p.id_pedido],
        (err2, productos) => {
          if (err2) productos = [];

          p.productos = productos || [];

          p.fecha_pedido_iso = p.fecha_pedido;
          p.fecha_pedido = new Date(p.fecha_pedido).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          p.total = new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
          }).format(p.total || 0);

          procesados.push(p);
          completados++;

          if (completados === pedidos.length) {
            res.json(procesados);
          }
        }
      );
    });
  });
};


exports.createPedido = (req, res) => {
  const {
    id_cliente,
    id_usuario,
    seguimiento_dist,
    productos,
    token,
    fecha_proximo_pedido,
  } = req.body;
  if (!id_cliente || !productos || productos.length === 0) {
    return res.status(400).json({ error: "Faltan datos del pedido" });
  }

  db.query(
    "SELECT habilitado FROM clientes WHERE id_cliente = ?",
    [id_cliente],
    (err, rows) => {
      if (err) return res.status(500).send(err);
      if (rows.length === 0)
        return res.status(404).json({ error: "Cliente no encontrado" });

      const clienteHabilitado = rows[0].habilitado === 1;
      const fecha_pedido = new Date();
      const estado = "pendiente";

      const ids = productos.map((p) => p.id_producto);
      const precioQuery = `SELECT id_producto, precio_unitario FROM productos WHERE id_producto IN (${ids.join(
        ","
      )})`;

      db.query(precioQuery, (err, rows) => {
        if (err) return res.status(500).send(err);

        let total = 0;
        const detalleInsert = [];

        productos.forEach((p) => {
          const productoDB = rows.find((r) => r.id_producto === p.id_producto);
          if (!productoDB) return;

          const precio_unitario = productoDB.precio_unitario;
          const subtotal = precio_unitario * p.cantidad;
          total += subtotal;

          detalleInsert.push({
            ...p,
            precio_unitario,
            subtotal,
          });
        });

        const pedidoQuery = `
        INSERT INTO pedidos (id_cliente, id_usuario, fecha_pedido, total, seguimiento_dist, estado, fecha_proximo_pedido)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

        db.query(
          pedidoQuery,
          [
            id_cliente,
            id_usuario || 1,
            fecha_pedido,
            total,
            seguimiento_dist || "",
            estado,
            fecha_proximo_pedido || null,
          ],
          (err2, result) => {
            if (err2) return res.status(500).send(err2);

            const id_pedido = result.insertId;
            const values = detalleInsert.map((p) => [
              id_pedido,
              p.id_producto,
              p.cantidad,
              p.precio_unitario,
              p.subtotal,
            ]);

            const detalleQuery = `
          INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ?
        `;

            db.query(detalleQuery, [values], (err3) => {
              if (err3) return res.status(500).send(err3);

              if (token) {
                db.query(
                  "UPDATE pedido_tokens SET usado = TRUE WHERE token = ?",
                  [token]
                );
              }

              if (!clienteHabilitado) {
                return res.status(200).json({
                  id_pedido,
                  total,
                  advertencia:
                    "El pedido fue registrado pero requiere revisión. Pónganse en contacto con su distribuidor ",
                });
              }

              res.status(201).json({ id_pedido, total });
            });
          }
        );
      });
    }
  );
};

exports.actualizarPedido = (req, res) => {
  const { id } = req.params;
  const { id_cliente, seguimiento_dist, productos, fecha_proximo_pedido } =
    req.body;

  if (!id_cliente || !productos || productos.length === 0) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const ids = productos.map((p) => p.id_producto);
  const precioQuery = `SELECT id_producto, precio_unitario FROM productos WHERE id_producto IN (${ids.join(
    ","
  )})`;

  db.query(precioQuery, (err, rows) => {
    if (err) return res.status(500).send(err);

    let total = 0;
    const detalleInsert = [];

    productos.forEach((p) => {
      const prod = rows.find((r) => r.id_producto === p.id_producto);
      if (!prod) return;
      const subtotal = prod.precio_unitario * p.cantidad;
      total += subtotal;
      detalleInsert.push([
        id,
        p.id_producto,
        p.cantidad,
        prod.precio_unitario,
        subtotal,
      ]);
    });

    const updatePedido = `
      UPDATE pedidos 
      SET id_cliente = ?, seguimiento_dist = ?, total = ?, fecha_proximo_pedido = ?
      WHERE id_pedido = ?
    `;

    db.query(
      updatePedido,
      [
        id_cliente,
        seguimiento_dist || "",
        total,
        fecha_proximo_pedido || null,
        id,
      ],
      (err2) => {
        if (err2) return res.status(500).send(err2);

        db.query(
          "DELETE FROM detalle_pedido WHERE id_pedido = ?",
          [id],
          (err3) => {
            if (err3) return res.status(500).send(err3);

            db.query(
              `
          INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ?
        `,
              [detalleInsert],
              (err4) => {
                if (err4) return res.status(500).send(err4);
                res.sendStatus(200);
              }
            );
          }
        );
      }
    );
  });
};

exports.getPedidoPorId = (req, res) => {
  const { id } = req.params;

  const queryPedido = "SELECT * FROM pedidos WHERE id_pedido = ?";
  const queryDetalle =
    "SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?";

  db.query(queryPedido, [id], (err, pedidos) => {
    if (err) return res.status(500).send(err);
    if (pedidos.length === 0)
      return res.status(404).json({ error: "Pedido no encontrado" });

    const pedido = pedidos[0];

    db.query(queryDetalle, [id], (err2, detalle) => {
      if (err2) return res.status(500).send(err2);
      pedido.productos = detalle;
      res.json(pedido);
    });
  });
};

exports.completarPedido = (req, res) => {
  const { id } = req.params;
  db.query(
    'UPDATE pedidos SET estado = "completado" WHERE id_pedido = ?',
    [id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.sendStatus(200);
    }
  );
};

exports.eliminarPedido = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM detalle_pedido WHERE id_pedido = ?", [id], (err1) => {
    if (err1) return res.status(500).send(err1);

    db.query("DELETE FROM pedidos WHERE id_pedido = ?", [id], (err2) => {
      if (err2) return res.status(500).send(err2);
      res.sendStatus(200);
    });
  });
};

exports.generarLinkPedido = (req, res) => {
  const { id_cliente } = req.params;
  const token = crypto.randomBytes(16).toString("hex");
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  const query = `
    INSERT INTO pedido_tokens (token, id_cliente, expires_at)
    VALUES (?, ?, ?)
  `;

  db.query(query, [token, id_cliente, expires_at], (err) => {
    if (err) return res.status(500).json({ error: "Error al generar token" });

    const link = `https://api.tierravolga.com.ar/pedido/acceso?token=${token}`;
    /* const link = `http://localhost:3001/pedido/acceso?token=${token}`; */
    res.json({ id_cliente, token, link });
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
    if (rows.length === 0)
      return res.status(404).json({ error: "Token inválido o expirado" });

    const cliente = {
      id_cliente: rows[0].id_cliente,
      nombre: rows[0].nombre,
      cuit: rows[0].cuit,
    };

    // NUEVA CONSULTA: traer solo productos habilitados
    const productosQuery = `
      SELECT pr.id_producto, pr.nombre, pr.descripcion, pr.precio_unitario, pr.id_proveedor, p.nombre AS proveedor_nombre
      FROM productos_habilitados ph
      JOIN productos pr ON ph.id_producto = pr.id_producto
      LEFT JOIN proveedores p ON pr.id_proveedor = p.id_proveedor
      WHERE ph.id_cliente = ?
    `;

    db.query(productosQuery, [cliente.id_cliente], (err2, productos) => {
      if (err2) return res.status(500).send(err2);
      res.json({ cliente, productos });
    });
  });
};

exports.getPedidoParaRepetir = (req, res) => {
  const { id } = req.params;

  const queryPedido =
    "SELECT id_cliente, seguimiento_dist FROM pedidos WHERE id_pedido = ?";
  const queryDetalle =
    "SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?";

  db.query(queryPedido, [id], (err, pedidos) => {
    if (err) return res.status(500).send(err);
    if (pedidos.length === 0)
      return res.status(404).json({ error: "Pedido no encontrado" });

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
    SELECT p.id_pedido, p.fecha_pedido, c.nombre AS cliente
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    WHERE p.id_cliente = ?
    ORDER BY p.fecha_pedido DESC
    LIMIT 1
  `;

  db.query(query, [id_cliente], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.length === 0)
      return res.status(404).json({ error: "No hay pedidos anteriores" });

    const pedido = result[0];

    db.query(
      `
      SELECT pr.id_producto, pr.nombre, pr.descripcion, dp.cantidad
      FROM detalle_pedido dp
      JOIN productos pr ON dp.id_producto = pr.id_producto
      WHERE dp.id_pedido = ?
      `,
      [pedido.id_pedido],
      (err2, productos) => {
        if (err2) return res.status(500).send(err2);
        pedido.productos = productos;
        res.json(pedido);
      }
    );
  });
};

exports.getPedidosProximos = (req, res) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res
      .status(400)
      .json({ error: "Parámetros desde y hasta requeridos" });
  }

  const query = `
    SELECT 
      p.id_pedido, 
      c.nombre AS cliente, 
      u.nombre AS vendedor, 
      p.fecha_pedido, 
      p.total, 
      p.estado,
      p.seguimiento_dist,
      p.fecha_proximo_pedido
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    JOIN usuarios u ON p.id_usuario = u.id_usuario
    WHERE DATE(p.fecha_proximo_pedido) BETWEEN ? AND ?
    ORDER BY p.fecha_proximo_pedido ASC
  `;

  db.query(query, [desde, hasta], (err, results) => {
    if (err) {
      console.error("Error en getPedidosProximos:", err);
      return res.status(500).send(err);
    }

    // ✅ Elimina el if que cortaba la respuesta
    const pedidos = (results || []).map((p) => ({
      ...p,
      fecha_pedido: new Date(p.fecha_pedido).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      fecha_proximo_pedido: p.fecha_proximo_pedido
        ? new Date(p.fecha_proximo_pedido).toISOString().split("T")[0]
        : null,
      total: new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
      }).format(p.total || 0),
    }));

    res.json(pedidos); // 🔁 SIEMPRE devuelve un array, vacío o no
  });
};

// Obtener pedidos agrupados por semana
exports.getPedidosPorSemana = (req, res) => {
  const query = `
    SELECT 
      p.id_pedido,
      p.fecha_proximo_pedido,
      c.nombre AS cliente,
      p.id_cliente
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    WHERE p.fecha_proximo_pedido IS NOT NULL
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });

    const agrupado = {};

    results.forEach((p) => {
      const fecha = new Date(p.fecha_proximo_pedido);
      const semana = getNumeroSemana(fecha); // Usamos función auxiliar

      if (!agrupado[semana]) agrupado[semana] = [];
      agrupado[semana].push(p);
    });

    res.json(agrupado);
  });
};

// Función auxiliar para obtener número de semana
function getNumeroSemana(fecha) {
  const primerDiaAño = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha - primerDiaAño) / (24 * 60 * 60 * 1000));
  return Math.ceil((dias + primerDiaAño.getDay() + 1) / 7);
}
