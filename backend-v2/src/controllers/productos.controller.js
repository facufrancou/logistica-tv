const prisma = require('../lib/prisma');

exports.getProductos = async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        proveedores: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Formatear respuesta para mantener compatibilidad con el frontend
    const productosFormatted = productos.map(producto => ({
      ...producto,
      id_producto: Number(producto.id_producto),
      id_proveedor: producto.id_proveedor ? Number(producto.id_proveedor) : null,
      proveedor_nombre: producto.proveedores?.nombre || null
    }));

    res.json(productosFormatted);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.createProducto = async (req, res) => {
  try {
    const { nombre, precio_unitario, descripcion, id_proveedor } = req.body;

    if (!nombre || precio_unitario === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    const nuevoProducto = await prisma.producto.create({
      data: {
        nombre,
        precio_unitario: parseFloat(precio_unitario),
        descripcion: descripcion || '',
        id_proveedor: id_proveedor ? parseInt(id_proveedor) : null
      }
    });

    // Convertir BigInt a Number
    const productoFormatted = {
      ...nuevoProducto,
      id_producto: Number(nuevoProducto.id_producto),
      id_proveedor: nuevoProducto.id_proveedor ? Number(nuevoProducto.id_proveedor) : null
    };

    res.status(201).json(productoFormatted);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio_unitario, descripcion, id_proveedor } = req.body;

    if (!nombre || precio_unitario === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    const productoActualizado = await prisma.producto.update({
      where: { id_producto: parseInt(id) },
      data: {
        nombre,
        precio_unitario: parseFloat(precio_unitario),
        descripcion: descripcion || '',
        id_proveedor: id_proveedor ? parseInt(id_proveedor) : null
      }
    });

    // Convertir BigInt a Number
    const productoFormatted = {
      ...productoActualizado,
      id_producto: Number(productoActualizado.id_producto),
      id_proveedor: productoActualizado.id_proveedor ? Number(productoActualizado.id_proveedor) : null
    };

    res.json(productoFormatted);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
