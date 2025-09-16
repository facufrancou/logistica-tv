const prisma = require('../lib/prisma');

exports.getClientes = async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      select: {
        id_cliente: true,
        nombre: true,
        cuit: true,
        email: true,
        telefono: true,
        direccion: true,
        habilitado: true,
        bloqueado: true,
        fecha_proximo_pedido: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Convertir BigInt a Number para compatibilidad JSON
    const clientesFormatted = clientes.map(cliente => ({
      ...cliente,
      id_cliente: Number(cliente.id_cliente)
    }));

    res.json(clientesFormatted);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene un cliente específico por su ID
 */
exports.getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: parseInt(id) },
      select: {
        id_cliente: true,
        nombre: true,
        cuit: true,
        email: true,
        telefono: true,
        direccion: true,
        habilitado: true,
        bloqueado: true,
        fecha_proximo_pedido: true
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Convertir BigInt a Number
    const clienteFormatted = {
      ...cliente,
      id_cliente: Number(cliente.id_cliente)
    };

    res.json(clienteFormatted);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener el cliente', details: error.message });
  }
};

exports.createCliente = async (req, res) => {
  try {
    const { nombre, cuit, direccion, telefono, email, habilitado = true, bloqueado = false } = req.body;

    if (!nombre || !cuit) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const nuevoCliente = await prisma.cliente.create({
      data: {
        nombre,
        cuit,
        direccion,
        telefono,
        email,
        habilitado,
        bloqueado
      }
    });

    // Convertir BigInt a Number
    const clienteFormatted = {
      ...nuevoCliente,
      id_cliente: Number(nuevoCliente.id_cliente)
    };

    res.status(201).json(clienteFormatted);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cuit, direccion, telefono, email, habilitado = true, bloqueado = false } = req.body;

    if (!nombre || !cuit) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id_cliente: parseInt(id) },
      data: {
        nombre,
        cuit,
        direccion,
        telefono,
        email,
        habilitado,
        bloqueado
      }
    });

    // Convertir BigInt a Number
    const clienteFormatted = {
      ...clienteActualizado,
      id_cliente: Number(clienteActualizado.id_cliente)
    };

    res.json(clienteFormatted);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualiza específicamente el estado de activación de un cliente
 */
exports.updateClienteEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { habilitado } = req.body;
    
    if (habilitado === undefined) {
      return res.status(400).json({ error: 'El estado de habilitación es obligatorio' });
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id_cliente: parseInt(id) },
      data: { habilitado }
    });

    // Convertir BigInt a Number
    const clienteFormatted = {
      ...clienteActualizado,
      id_cliente: Number(clienteActualizado.id_cliente)
    };

    res.json(clienteFormatted);
  } catch (error) {
    console.error('Error al actualizar estado del cliente:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(500).json({ error: 'Error al actualizar el estado del cliente', details: error.message });
  }
};

/**
 * Actualiza específicamente el estado de bloqueo de un cliente
 */
exports.updateClienteBloqueo = async (req, res) => {
  try {
    const { id } = req.params;
    const { bloqueado } = req.body;
    
    if (bloqueado === undefined) {
      return res.status(400).json({ error: 'El estado de bloqueo es obligatorio' });
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id_cliente: parseInt(id) },
      data: { bloqueado }
    });

    // Convertir BigInt a Number
    const clienteFormatted = {
      ...clienteActualizado,
      id_cliente: Number(clienteActualizado.id_cliente)
    };

    res.json(clienteFormatted);
  } catch (error) {
    console.error('Error al actualizar estado de bloqueo del cliente:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(500).json({ error: 'Error al actualizar el estado de bloqueo del cliente', details: error.message });
  }
};

// NUEVO: obtener productos habilitados para un cliente
exports.getProductosHabilitados = async (req, res) => {
  try {
    const { id } = req.params;

    const productosHabilitados = await prisma.productoHabilitado.findMany({
      where: { id_cliente: parseInt(id) },
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
    });

    // Formatear respuesta para mantener compatibilidad
    const productos = productosHabilitados.map(ph => ({
      id_producto: Number(ph.productos.id_producto),
      nombre: ph.productos.nombre,
      descripcion: ph.productos.descripcion,
      precio_unitario: ph.productos.precio_unitario
    }));

    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos habilitados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// NUEVO: asignar productos habilitados (reemplaza todos los actuales)
exports.setProductosHabilitados = async (req, res) => {
  try {
    const { id } = req.params;
    const { productos } = req.body; // Array de IDs

    if (!Array.isArray(productos)) {
      return res.status(400).json({ error: 'Se esperaba un array de productos' });
    }

    // Usar transacción para eliminar los actuales y agregar los nuevos
    await prisma.$transaction(async (tx) => {
      // Eliminar productos habilitados actuales
      await tx.productoHabilitado.deleteMany({
        where: { id_cliente: parseInt(id) }
      });

      // Agregar los nuevos productos habilitados
      if (productos.length > 0) {
        const productosData = productos.map(productId => ({
          id_cliente: parseInt(id),
          id_producto: parseInt(productId)
        }));

        await tx.productoHabilitado.createMany({
          data: productosData
        });
      }
    });

    res.json({ mensaje: 'Productos habilitados actualizados correctamente' });
  } catch (error) {
    console.error('Error al asignar productos habilitados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Clientes con pedidos próximos (ahora que tenemos pedidos migrados)
exports.getClientesConPedidosProximos = async (req, res) => {
  try {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + 7); // Próximos 7 días

    const clientes = await prisma.cliente.findMany({
      where: {
        fecha_proximo_pedido: {
          gte: hoy,
          lte: fechaLimite
        }
      },
      select: {
        id_cliente: true,
        nombre: true,
        telefono: true,
        email: true,
        fecha_proximo_pedido: true
      },
      orderBy: {
        fecha_proximo_pedido: 'asc'
      }
    });

    const clientesFormatted = clientes.map(cliente => ({
      ...cliente,
      id_cliente: Number(cliente.id_cliente)
    }));

    res.json(clientesFormatted);
  } catch (error) {
    console.error('Error al obtener clientes con pedidos próximos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
