const prisma = require('../lib/prisma');

// Obtener todos los proveedores
exports.getProveedores = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: {
        nombre: 'asc'
      }
    });

    // Convertir BigInt a Number para compatibilidad JSON
    const proveedoresFormatted = proveedores.map(proveedor => ({
      ...proveedor,
      id_proveedor: Number(proveedor.id_proveedor)
    }));

    res.json(proveedoresFormatted);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un proveedor
exports.createProveedor = async (req, res) => {
  try {
    const { nombre, activo = true } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        nombre,
        activo
      }
    });

    // Convertir BigInt a Number
    const proveedorFormatted = {
      ...nuevoProveedor,
      id_proveedor: Number(nuevoProveedor.id_proveedor)
    };

    res.status(201).json(proveedorFormatted);
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar proveedor
exports.updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const proveedorActualizado = await prisma.proveedor.update({
      where: { id_proveedor: parseInt(id) },
      data: {
        nombre,
        activo
      }
    });

    // Convertir BigInt a Number
    const proveedorFormatted = {
      ...proveedorActualizado,
      id_proveedor: Number(proveedorActualizado.id_proveedor)
    };

    res.json(proveedorFormatted);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Desactivar proveedor (baja lógica)
exports.eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.proveedor.update({
      where: { id_proveedor: parseInt(id) },
      data: { activo: false }
    });

    res.json({ mensaje: 'Proveedor desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar proveedor:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener productos de un proveedor (útil para reportes o filtros)
exports.getProductosPorProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    const productos = await prisma.producto.findMany({
      where: { id_proveedor: parseInt(id) },
      select: {
        id_producto: true,
        nombre: true,
        descripcion: true,
        precio_unitario: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Convertir BigInt a Number para compatibilidad JSON
    const productosFormatted = productos.map(producto => ({
      ...producto,
      id_producto: Number(producto.id_producto)
    }));

    res.json(productosFormatted);
  } catch (error) {
    console.error('Error al obtener productos del proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
