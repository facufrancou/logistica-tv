const prisma = require('../lib/prisma');
const crypto = require('crypto');

exports.getPedidos = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    
    let whereClause = {};
    if (desde && hasta) {
      whereClause.fecha_pedido = {
        gte: new Date(desde + 'T00:00:00.000Z'),
        lte: new Date(hasta + 'T23:59:59.999Z')
      };
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      include: {
        clientes: {
          select: { nombre: true }
        },
        usuarios: {
          select: { nombre: true }
        },
        detalle_pedido: {
          include: {
            productos: {
              include: {
                proveedores: {
                  select: { nombre: true }
                }
              }
            }
          }
        }
      },
      orderBy: {
        fecha_pedido: 'desc'
      }
    });

    // Formatear respuesta para mantener compatibilidad con el frontend
    const pedidosFormatted = pedidos.map(p => {
      const productos = p.detalle_pedido.map(dp => ({
        id_producto: Number(dp.id_producto),
        nombre: dp.productos.nombre,
        descripcion: dp.productos.descripcion,
        cantidad: dp.cantidad,
        proveedor_nombre: dp.productos.proveedores?.nombre || null
      }));

      return {
        id_pedido: Number(p.id_pedido),
        cliente: p.clientes.nombre,
        vendedor: p.usuarios.nombre,
        fecha_pedido_iso: p.fecha_pedido,
        fecha_pedido: new Date(p.fecha_pedido).toLocaleString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        total: new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          minimumFractionDigits: 2,
        }).format(p.total || 0),
        estado: p.estado,
        seguimiento_dist: p.seguimiento_dist,
        fecha_proximo_pedido: p.fecha_proximo_pedido,
        productos
      };
    });

    res.json(pedidosFormatted);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

exports.createPedido = async (req, res) => {
  try {
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

    // Verificar que el cliente esté habilitado
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: parseInt(id_cliente) },
      select: { habilitado: true }
    });

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    if (!cliente.habilitado) {
      return res.status(400).json({ error: "Cliente no habilitado para realizar pedidos" });
    }

    // Verificar token si se proporciona
    if (token) {
      const pedidoToken = await prisma.pedidoToken.findUnique({
        where: { token },
        include: { clientes: true }
      });

      if (!pedidoToken || pedidoToken.usado || new Date() > pedidoToken.expires_at) {
        return res.status(400).json({ error: "Token inválido o expirado" });
      }

      if (pedidoToken.id_cliente !== parseInt(id_cliente)) {
        return res.status(400).json({ error: "Token no corresponde al cliente" });
      }

      // Marcar token como usado
      await prisma.pedidoToken.update({
        where: { token },
        data: { usado: true }
      });
    }

    // Calcular total del pedido
    let total = 0;
    const productosConPrecios = [];

    for (const item of productos) {
      const producto = await prisma.producto.findUnique({
        where: { id_producto: parseInt(item.id_producto) },
        select: { precio_unitario: true, nombre: true }
      });

      if (!producto) {
        return res.status(400).json({ 
          error: `Producto con ID ${item.id_producto} no encontrado` 
        });
      }

      const subtotal = parseFloat(producto.precio_unitario) * parseInt(item.cantidad);
      total += subtotal;

      productosConPrecios.push({
        id_producto: parseInt(item.id_producto),
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(producto.precio_unitario),
        subtotal
      });
    }

    // Crear pedido y detalle en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear pedido principal
      const nuevoPedido = await tx.pedido.create({
        data: {
          id_cliente: parseInt(id_cliente),
          id_usuario: id_usuario ? parseInt(id_usuario) : 1, // Usuario por defecto si no se especifica
          seguimiento_dist: seguimiento_dist || 'pendiente',
          total: total,
          estado: 'pendiente',
          fecha_proximo_pedido: fecha_proximo_pedido ? new Date(fecha_proximo_pedido) : null
        }
      });

      // Crear detalles del pedido
      for (const item of productosConPrecios) {
        await tx.detallePedido.create({
          data: {
            id_pedido: nuevoPedido.id_pedido,
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          }
        });
      }

      // Actualizar fecha próximo pedido del cliente si se especifica
      if (fecha_proximo_pedido) {
        await tx.cliente.update({
          where: { id_cliente: parseInt(id_cliente) },
          data: { fecha_proximo_pedido: new Date(fecha_proximo_pedido) }
        });
      }

      return nuevoPedido;
    });

    res.status(201).json({
      mensaje: "Pedido creado exitosamente",
      id_pedido: Number(result.id_pedido),
      total: total
    });

  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getPedidoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await prisma.pedido.findUnique({
      where: { id_pedido: parseInt(id) },
      include: {
        clientes: {
          select: { nombre: true, id_cliente: true }
        },
        usuarios: {
          select: { nombre: true }
        },
        detalle_pedido: {
          include: {
            productos: {
              select: {
                id_producto: true,
                nombre: true,
                descripcion: true,
                precio_unitario: true
              }
            }
          }
        }
      }
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedidoFormatted = {
      id_pedido: Number(pedido.id_pedido),
      id_cliente: Number(pedido.id_cliente),
      cliente: pedido.clientes.nombre,
      vendedor: pedido.usuarios.nombre,
      fecha_pedido: pedido.fecha_pedido,
      total: Number(pedido.total),
      estado: pedido.estado,
      seguimiento_dist: pedido.seguimiento_dist,
      fecha_proximo_pedido: pedido.fecha_proximo_pedido,
      productos: pedido.detalle_pedido.map(dp => ({
        id_producto: Number(dp.id_producto),
        nombre: dp.productos.nombre,
        descripcion: dp.productos.descripcion,
        cantidad: dp.cantidad,
        precio_unitario: Number(dp.precio_unitario),
        subtotal: Number(dp.subtotal)
      }))
    };

    res.json(pedidoFormatted);
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.completarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.pedido.update({
      where: { id_pedido: parseInt(id) },
      data: { estado: 'completado' }
    });

    res.json({ mensaje: 'Pedido completado exitosamente' });
  } catch (error) {
    console.error('Error al completar pedido:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminar pedido y sus detalles en transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar detalles primero (por foreign key)
      await tx.detallePedido.deleteMany({
        where: { id_pedido: parseInt(id) }
      });

      // Eliminar pedido
      await tx.pedido.delete({
        where: { id_pedido: parseInt(id) }
      });
    });

    res.json({ mensaje: 'Pedido eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { productos, seguimiento_dist, fecha_proximo_pedido } = req.body;

    if (!productos || productos.length === 0) {
      return res.status(400).json({ error: "Faltan productos del pedido" });
    }

    // Calcular nuevo total
    let nuevoTotal = 0;
    const productosConPrecios = [];

    for (const item of productos) {
      const producto = await prisma.producto.findUnique({
        where: { id_producto: parseInt(item.id_producto) },
        select: { precio_unitario: true }
      });

      if (!producto) {
        return res.status(400).json({ 
          error: `Producto con ID ${item.id_producto} no encontrado` 
        });
      }

      const subtotal = parseFloat(producto.precio_unitario) * parseInt(item.cantidad);
      nuevoTotal += subtotal;

      productosConPrecios.push({
        id_producto: parseInt(item.id_producto),
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(producto.precio_unitario),
        subtotal
      });
    }

    // Actualizar pedido y detalle en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar pedido principal
      await tx.pedido.update({
        where: { id_pedido: parseInt(id) },
        data: {
          total: nuevoTotal,
          seguimiento_dist: seguimiento_dist || undefined,
          fecha_proximo_pedido: fecha_proximo_pedido ? new Date(fecha_proximo_pedido) : undefined
        }
      });

      // Eliminar detalles actuales
      await tx.detallePedido.deleteMany({
        where: { id_pedido: parseInt(id) }
      });

      // Crear nuevos detalles
      for (const item of productosConPrecios) {
        await tx.detallePedido.create({
          data: {
            id_pedido: parseInt(id),
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          }
        });
      }
    });

    res.json({ mensaje: 'Pedido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.generarLinkPedido = async (req, res) => {
  try {
    const { id_cliente } = req.params;
    const token = crypto.randomBytes(16).toString("hex");
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await prisma.pedidoToken.create({
      data: {
        token,
        id_cliente: parseInt(id_cliente),
        expires_at
      }
    });

    const link = `https://gestion.tierravolga.com.ar/pedido/acceso?token=${token}`;
    res.json({ 
      id_cliente: parseInt(id_cliente), 
      token, 
      link 
    });
  } catch (error) {
    console.error('Error al generar token:', error);
    res.status(500).json({ error: 'Error al generar token' });
  }
};

exports.validarTokenPedido = async (req, res) => {
  try {
    const { token } = req.params;

    const pedidoToken = await prisma.pedidoToken.findUnique({
      where: { token },
      include: {
        clientes: {
          select: {
            id_cliente: true,
            nombre: true,
            cuit: true
          }
        }
      }
    });

    if (!pedidoToken || pedidoToken.usado || new Date() > pedidoToken.expires_at) {
      return res.status(404).json({ error: "Token inválido o expirado" });
    }

    const cliente = {
      id_cliente: Number(pedidoToken.clientes.id_cliente),
      nombre: pedidoToken.clientes.nombre,
      cuit: pedidoToken.clientes.cuit,
    };

    // Traer productos habilitados para el cliente
    const productosHabilitados = await prisma.productoHabilitado.findMany({
      where: { id_cliente: cliente.id_cliente },
      include: {
        productos: {
          include: {
            proveedores: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    const productos = productosHabilitados.map(ph => ({
      id_producto: Number(ph.productos.id_producto),
      nombre: ph.productos.nombre,
      descripcion: ph.productos.descripcion,
      precio_unitario: Number(ph.productos.precio_unitario),
      id_proveedor: ph.productos.id_proveedor ? Number(ph.productos.id_proveedor) : null,
      proveedor_nombre: ph.productos.proveedores?.nombre || null
    }));

    res.json({ cliente, productos });
  } catch (error) {
    console.error('Error al validar token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getPedidoParaRepetir = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await prisma.pedido.findUnique({
      where: { id_pedido: parseInt(id) },
      select: {
        id_cliente: true,
        seguimiento_dist: true
      },
      include: {
        detalle_pedido: {
          select: {
            id_producto: true,
            cantidad: true
          }
        }
      }
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const pedidoFormatted = {
      id_cliente: Number(pedido.id_cliente),
      seguimiento_dist: pedido.seguimiento_dist,
      productos: pedido.detalle_pedido.map(dp => ({
        id_producto: Number(dp.id_producto),
        cantidad: dp.cantidad
      }))
    };

    res.json(pedidoFormatted);
  } catch (error) {
    console.error('Error al obtener pedido para repetir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getUltimoPedidoPorCliente = async (req, res) => {
  try {
    const { id_cliente } = req.params;

    const ultimoPedido = await prisma.pedido.findFirst({
      where: { id_cliente: parseInt(id_cliente) },
      include: {
        clientes: {
          select: { nombre: true }
        },
        detalle_pedido: {
          include: {
            productos: {
              select: {
                id_producto: true,
                nombre: true,
                descripcion: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha_pedido: 'desc'
      }
    });

    if (!ultimoPedido) {
      return res.status(404).json({ error: "No hay pedidos anteriores" });
    }

    const pedidoFormatted = {
      id_pedido: Number(ultimoPedido.id_pedido),
      fecha_pedido: ultimoPedido.fecha_pedido,
      cliente: ultimoPedido.clientes.nombre,
      productos: ultimoPedido.detalle_pedido.map(dp => ({
        id_producto: Number(dp.id_producto),
        nombre: dp.productos.nombre,
        descripcion: dp.productos.descripcion,
        cantidad: dp.cantidad
      }))
    };

    res.json(pedidoFormatted);
  } catch (error) {
    console.error('Error al obtener último pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getPedidosProximos = async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({ error: "Parámetros desde y hasta requeridos" });
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        fecha_proximo_pedido: {
          gte: new Date(desde + 'T00:00:00.000Z'),
          lte: new Date(hasta + 'T23:59:59.999Z')
        }
      },
      include: {
        clientes: {
          select: { nombre: true }
        },
        usuarios: {
          select: { nombre: true }
        }
      },
      orderBy: {
        fecha_proximo_pedido: 'asc'
      }
    });

    const pedidosFormatted = pedidos.map(p => ({
      id_pedido: Number(p.id_pedido),
      cliente: p.clientes.nombre,
      vendedor: p.usuarios.nombre,
      fecha_pedido: p.fecha_pedido,
      total: Number(p.total),
      estado: p.estado,
      seguimiento_dist: p.seguimiento_dist,
      fecha_proximo_pedido: p.fecha_proximo_pedido
    }));

    res.json(pedidosFormatted);
  } catch (error) {
    console.error('Error al obtener pedidos próximos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getPedidosPorSemana = async (req, res) => {
  try {
    // Obtener pedidos con fecha_proximo_pedido definida
    const pedidos = await prisma.pedido.findMany({
      where: {
        fecha_proximo_pedido: {
          not: null
        }
      },
      select: {
        id_pedido: true,
        fecha_proximo_pedido: true,
        id_cliente: true,
        clientes: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Agrupar por semana
    const agrupado = {};

    pedidos.forEach((p) => {
      const fecha = new Date(p.fecha_proximo_pedido);
      const semana = getNumeroSemana(fecha);

      if (!agrupado[semana]) agrupado[semana] = [];
      agrupado[semana].push({
        id_pedido: Number(p.id_pedido),
        fecha_proximo_pedido: p.fecha_proximo_pedido,
        cliente: p.clientes.nombre,
        id_cliente: Number(p.id_cliente)
      });
    });

    res.json(agrupado);
  } catch (error) {
    console.error('Error al obtener pedidos por semana:', error);
    res.status(500).json({ error: 'Error al obtener pedidos por semana' });
  }
};

// Función auxiliar para obtener número de semana
function getNumeroSemana(fecha) {
  const primerDiaAño = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha - primerDiaAño) / (24 * 60 * 60 * 1000));
  return Math.ceil((dias + primerDiaAño.getDay() + 1) / 7);
}
