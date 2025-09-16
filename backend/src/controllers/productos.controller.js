const prisma = require('../lib/prisma');
const PriceTracker = require('../lib/priceTracker');

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
    const usuario_id = req.user?.id || null;

    if (!nombre || precio_unitario === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    // Obtener precio actual para tracking
    const productoActual = await prisma.producto.findUnique({
      where: { id_producto: parseInt(id) }
    });

    if (!productoActual) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Actualizar producto
    const productoActualizado = await prisma.producto.update({
      where: { id_producto: parseInt(id) },
      data: {
        nombre,
        precio_unitario: parseFloat(precio_unitario),
        descripcion: descripcion || '',
        id_proveedor: id_proveedor ? parseInt(id_proveedor) : null
      }
    });

    // Registrar cambio de precio si es diferente
    if (productoActual.precio_unitario !== parseFloat(precio_unitario)) {
      try {
        await PriceTracker.registrarCambioPrecio({
          id_producto: parseInt(id),
          id_lista_precio: null, // Para precio base del producto
          precio_anterior: productoActual.precio_unitario,
          precio_nuevo: parseFloat(precio_unitario),
          motivo: 'Actualización de precio base del producto',
          usuario_id
        });
      } catch (trackingError) {
        console.error('Error al registrar cambio de precio:', trackingError);
        // No fallar la actualización por error de tracking
      }
    }

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

// ===== FUNCIONES SPRINT 6: HISTORIAL DE PRECIOS =====

// GET /api/productos/:id/historial-precios
exports.getHistorialPrecios = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id_lista_precio, 
      fecha_desde, 
      fecha_hasta, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Validar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id_producto: parseInt(id) },
      select: { id_producto: true, nombre: true }
    });

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Construir filtros
    const whereConditions = {
      id_producto: parseInt(id)
    };

    if (id_lista_precio) {
      whereConditions.id_lista_precio = parseInt(id_lista_precio);
    }

    if (fecha_desde || fecha_hasta) {
      whereConditions.fecha_cambio = {};
      if (fecha_desde) whereConditions.fecha_cambio.gte = new Date(fecha_desde);
      if (fecha_hasta) whereConditions.fecha_cambio.lte = new Date(fecha_hasta);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener historial con paginación
    const [historial, totalCount] = await Promise.all([
      prisma.historialPrecio.findMany({
        where: whereConditions,
        include: {
          lista_precio: {
            select: {
              id_lista: true,
              tipo: true,
              nombre: true
            }
          },
          usuarios: {
            select: {
              id_usuario: true,
              nombre: true
            }
          }
        },
        orderBy: { fecha_cambio: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.historialPrecio.count({ where: whereConditions })
    ]);

    // Calcular estadísticas del historial
    const estadisticas = {
      total_cambios: totalCount,
      precio_actual: 0,
      precio_minimo: 0,
      precio_maximo: 0,
      cambio_promedio: 0
    };

    if (historial.length > 0) {
      const precios = historial.map(h => parseFloat(h.precio_nuevo));
      estadisticas.precio_actual = precios[0]; // El más reciente
      estadisticas.precio_minimo = Math.min(...precios);
      estadisticas.precio_maximo = Math.max(...precios);
      
      // Calcular cambio promedio entre precios consecutivos
      if (precios.length > 1) {
        const cambios = [];
        for (let i = 0; i < precios.length - 1; i++) {
          cambios.push(Math.abs(precios[i] - precios[i + 1]));
        }
        estadisticas.cambio_promedio = cambios.reduce((a, b) => a + b, 0) / cambios.length;
      }
    }

    // Formatear respuesta
    const historialFormatted = historial.map(item => ({
      ...item,
      id_historial: Number(item.id_historial),
      id_producto: Number(item.id_producto),
      id_lista_precio: item.id_lista_precio ? Number(item.id_lista_precio) : null,
      precio_anterior: parseFloat(item.precio_anterior),
      precio_nuevo: parseFloat(item.precio_nuevo),
      diferencia: parseFloat(item.precio_nuevo) - parseFloat(item.precio_anterior),
      porcentaje_cambio: parseFloat(item.precio_anterior) > 0 
        ? ((parseFloat(item.precio_nuevo) - parseFloat(item.precio_anterior)) / parseFloat(item.precio_anterior)) * 100 
        : 0
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        producto,
        historial: historialFormatted,
        estadisticas,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: totalCount,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para registrar cambio de precio
exports.registrarCambioPrecio = async (idProducto, precioAnterior, precioNuevo, idListaPrecio = null, motivo = null, observaciones = null, idUsuario = null) => {
  try {
    if (parseFloat(precioAnterior) === parseFloat(precioNuevo)) {
      return null; // No hay cambio real de precio
    }

    const historialItem = await prisma.historialPrecio.create({
      data: {
        id_producto: parseInt(idProducto),
        id_lista_precio: idListaPrecio ? parseInt(idListaPrecio) : null,
        precio_anterior: parseFloat(precioAnterior),
        precio_nuevo: parseFloat(precioNuevo),
        motivo_cambio: motivo,
        observaciones,
        id_usuario: idUsuario ? parseInt(idUsuario) : null
      }
    });

    return historialItem;
  } catch (error) {
    console.error('Error registrando cambio de precio:', error);
    throw error;
  }
};

/**
 * Actualización masiva de precios con tracking automático
 */
exports.actualizarPreciosMasivo = async (req, res) => {
  try {
    const { productos, motivo = 'Actualización masiva', id_lista_precio = null } = req.body;
    const usuario_id = req.user?.id || null;

    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({ error: 'Se requiere un array de productos' });
    }

    const resultados = [];
    const cambios = [];

    for (const item of productos) {
      const { id_producto, precio_nuevo } = item;
      
      try {
        let precioAnterior;
        
        if (id_lista_precio) {
          // Actualizar en lista de precios específica
          const registroActual = await prisma.productoListaPrecio.findUnique({
            where: {
              id_producto_id_lista_precio: {
                id_producto: parseInt(id_producto),
                id_lista_precio: parseInt(id_lista_precio)
              }
            }
          });

          if (registroActual) {
            precioAnterior = registroActual.precio;
            
            await prisma.productoListaPrecio.update({
              where: {
                id_producto_id_lista_precio: {
                  id_producto: parseInt(id_producto),
                  id_lista_precio: parseInt(id_lista_precio)
                }
              },
              data: { precio: parseFloat(precio_nuevo) }
            });
          } else {
            // Crear nuevo registro en lista de precios
            await prisma.productoListaPrecio.create({
              data: {
                id_producto: parseInt(id_producto),
                id_lista_precio: parseInt(id_lista_precio),
                precio: parseFloat(precio_nuevo)
              }
            });
            precioAnterior = 0; // Precio inicial
          }
        } else {
          // Actualizar precio base del producto
          const productoActual = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id_producto) }
          });

          if (productoActual) {
            precioAnterior = productoActual.precio_unitario;
            
            await prisma.producto.update({
              where: { id_producto: parseInt(id_producto) },
              data: { precio_unitario: parseFloat(precio_nuevo) }
            });
          }
        }

        // Registrar cambio para tracking masivo
        if (precioAnterior !== undefined && precioAnterior !== parseFloat(precio_nuevo)) {
          cambios.push({
            id_producto: parseInt(id_producto),
            id_lista_precio: id_lista_precio ? parseInt(id_lista_precio) : null,
            precio_anterior: precioAnterior,
            precio_nuevo: parseFloat(precio_nuevo)
          });
        }

        resultados.push({
          id_producto: parseInt(id_producto),
          success: true,
          precio_anterior: precioAnterior,
          precio_nuevo: parseFloat(precio_nuevo)
        });

      } catch (error) {
        console.error(`Error actualizando producto ${id_producto}:`, error);
        resultados.push({
          id_producto: parseInt(id_producto),
          success: false,
          error: error.message
        });
      }
    }

    // Registrar todos los cambios en el historial
    if (cambios.length > 0) {
      try {
        await PriceTracker.registrarCambiosMasivos(cambios, motivo, usuario_id);
      } catch (trackingError) {
        console.error('Error en tracking masivo:', trackingError);
      }
    }

    res.json({
      success: true,
      procesados: resultados.length,
      exitosos: resultados.filter(r => r.success).length,
      fallidos: resultados.filter(r => !r.success).length,
      cambios_registrados: cambios.length,
      resultados
    });

  } catch (error) {
    console.error('Error en actualización masiva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener estadísticas de cambios de precio
 */
exports.getEstadisticasCambiosPrecios = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const fechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fechaFin = fecha_fin ? new Date(fecha_fin) : new Date();

    const estadisticas = await PriceTracker.getEstadisticasCambios(fechaInicio, fechaFin);
    
    res.json(estadisticas);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Detectar cambios anómalos de precios
 */
exports.detectarCambiosAnomalos = async (req, res) => {
  try {
    const { umbral_porcentual = 50 } = req.query;
    
    const cambiosAnomalos = await PriceTracker.detectarCambiosAnomalos(parseFloat(umbral_porcentual));
    
    res.json(cambiosAnomalos);
  } catch (error) {
    console.error('Error detectando cambios anómalos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
