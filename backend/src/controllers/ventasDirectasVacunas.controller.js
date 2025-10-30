const { PrismaClient } = require('@prisma/client');
const VentaDirectaPdfService = require('../services/ventaDirectaPdfService');

const prisma = new PrismaClient();
const ventaDirectaPdfService = new VentaDirectaPdfService();

// ===== CONTROLADOR DE VENTAS DIRECTAS DE VACUNAS =====

/**
 * Generar número único de venta directa
 */
function generarNumeroVenta() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `VD-${year}${month}${day}-${random}`;
}

/**
 * Obtener stocks disponibles para selección
 */
exports.getStocksDisponibles = async (req, res) => {
  try {
    const { 
      search,
      id_vacuna,
      solo_disponibles = 'true',
      page = 1,
      limit = 50
    } = req.query;

    // Construir filtros
    const where = {
      estado_stock: 'disponible',
      stock_actual: { gt: 0 }
    };

    if (id_vacuna) {
      where.id_vacuna = parseInt(id_vacuna);
    }

    if (search) {
      where.OR = [
        { lote: { contains: search } },
        { vacuna: { nombre: { contains: search } } },
        { vacuna: { codigo: { contains: search } } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [stocks, totalCount] = await Promise.all([
      prisma.stockVacuna.findMany({
        where,
        include: {
          vacuna: {
            include: {
              proveedor: {
                select: { nombre: true }
              },
              patologia: {
                select: { nombre: true }
              },
              presentacion: {
                select: { nombre: true, unidad_medida: true }
              }
            }
          }
        },
        orderBy: [
          { fecha_vencimiento: 'asc' },
          { vacuna: { nombre: 'asc' } }
        ],
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.stockVacuna.count({ where })
    ]);

    // Formatear respuesta con información adicional
    const stocksFormatted = stocks.map(stock => {
      const today = new Date();
      const fechaVencimiento = new Date(stock.fecha_vencimiento);
      const diasHastaVencimiento = Math.ceil((fechaVencimiento - today) / (1000 * 60 * 60 * 24));
      
      // Para ventas fuera de plan, usar el stock_actual total (stock físico real)
      // No restar stock_reservado porque la reserva es solo organizativa
      const dosisDisponibles = stock.stock_actual;
      
      // Calcular en frascos basado en el stock actual total
      const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1000;
      const frascosDisponibles = Math.floor(dosisDisponibles / dosisPorFrasco);

      return {
        id: Number(stock.id_stock_vacuna), // Mapear a 'id' para el frontend
        id_stock_vacuna: Number(stock.id_stock_vacuna),
        id_vacuna: Number(stock.id_vacuna),
        lote: stock.lote,
        fechaVencimiento: stock.fecha_vencimiento, // Mapear para el frontend
        ubicacion_fisica: stock.ubicacion_fisica || null, // Ubicación física del stock
        cantidadDisponible: frascosDisponibles, // FRASCOS TOTALES disponibles físicamente
        dosisDisponibles: dosisDisponibles, // Dosis totales disponibles físicamente
        dosisPorFrasco: dosisPorFrasco, // Para cálculos en el frontend
        precioVenta: stock.precio_compra ? parseFloat(stock.precio_compra) : 0, // Mapear para el frontend
        stock_disponible: dosisDisponibles,
        stock_reservado: stock.stock_reservado, // Incluir para referencia
        dias_hasta_vencimiento: diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        proximo_vencimiento: diasHastaVencimiento <= 30 && diasHastaVencimiento >= 0,
        precio_compra: stock.precio_compra ? parseFloat(stock.precio_compra) : null,
        vacuna: {
          ...stock.vacuna,
          proveedor: stock.vacuna.proveedor?.nombre || 'Sin proveedor' // Simplificar para el frontend
        }
      };
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: stocksFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener stocks disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener stocks disponibles'
    });
  }
};

/**
 * Obtener listas de precios disponibles
 */
exports.getListasPrecios = async (req, res) => {
  try {
    const listas = await prisma.listaPrecio.findMany({
      where: {
        activa: true
      },
      select: {
        id_lista: true,
        tipo: true,
        nombre: true,
        descripcion: true,
        porcentaje_recargo: true
      },
      orderBy: {
        tipo: 'asc'
      }
    });

    res.json({
      success: true,
      data: listas.map(lista => ({
        id: lista.id_lista,
        tipo: lista.tipo,
        nombre: lista.nombre,
        descripcion: lista.descripcion,
        porcentajeRecargo: parseFloat(lista.porcentaje_recargo)
      }))
    });

  } catch (error) {
    console.error('Error al obtener listas de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener listas de precios'
    });
  }
};

/**
 * Crear nueva venta directa de vacunas
 */
exports.crearVentaDirecta = async (req, res) => {
  try {
    const {
      id_cliente,
      id_lista_precio,
      vacunas, // Array de { id_stock_vacuna, cantidad, precio_unitario, observaciones }
      observaciones_venta,
      responsable_entrega,
      responsable_recibe
    } = req.body;

    // Log para depuración
    console.log('=== CREAR VENTA DIRECTA ===');
    console.log('Vacunas recibidas:', JSON.stringify(vacunas, null, 2));

    // Validaciones básicas
    if (!id_cliente || !vacunas || vacunas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cliente y al menos una vacuna son requeridos'
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que el cliente existe
      const cliente = await tx.cliente.findUnique({
        where: { id_cliente: parseInt(id_cliente) }
      });

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Validar stocks y cantidades disponibles
      for (const item of vacunas) {
        const stock = await tx.stockVacuna.findUnique({
          where: { id_stock_vacuna: parseInt(item.id_stock_vacuna) },
          include: { vacuna: { select: { nombre: true } } }
        });

        if (!stock) {
          throw new Error(`Stock con ID ${item.id_stock_vacuna} no encontrado`);
        }

        if (stock.estado_stock !== 'disponible') {
          throw new Error(`Stock de ${stock.vacuna.nombre} no está disponible`);
        }

        const stockDisponible = stock.stock_actual - stock.stock_reservado;
        if (stockDisponible < item.cantidad) {
          throw new Error(`Stock insuficiente para ${stock.vacuna.nombre}. Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}`);
        }
      }

      // Generar número único de venta
      let numeroVenta;
      let numeroExiste = true;
      
      while (numeroExiste) {
        numeroVenta = generarNumeroVenta();
        const existente = await tx.ventaDirecta.findUnique({
          where: { numero_venta: numeroVenta }
        });
        numeroExiste = !!existente;
      }

      // Obtener lista de precios si fue seleccionada
      let listaPrecio = null;
      let porcentajeRecargo = 0;
      
      if (id_lista_precio) {
        listaPrecio = await tx.listaPrecio.findUnique({
          where: { id_lista: parseInt(id_lista_precio) }
        });
        
        if (listaPrecio) {
          porcentajeRecargo = parseFloat(listaPrecio.porcentaje_recargo);
        }
      }

      // Crear detalles de la venta y calcular precio total
      const detallesData = [];
      let precioTotal = 0;
      
      for (const item of vacunas) {
        const stock = await tx.stockVacuna.findUnique({
          where: { id_stock_vacuna: parseInt(item.id_stock_vacuna) },
          include: { 
            vacuna: {
              include: {
                presentacion: true
              }
            }
          }
        });

        // Convertir cantidad de FRASCOS a DOSIS
        const cantidadFrascos = parseInt(item.cantidad);
        const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1000;
        const cantidadDosis = cantidadFrascos * dosisPorFrasco;

        // Precio base del stock
        const precioBase = parseFloat(item.precio_unitario || stock.precio_venta || 0);
        
        // Aplicar recargo de lista de precios al precio unitario
        const precioConRecargo = precioBase * (1 + porcentajeRecargo / 100);
        
        // Calcular subtotal (precio es por frasco, cantidad es en frascos)
        const subtotal = precioConRecargo * cantidadFrascos;
        precioTotal += subtotal;

        console.log(`Item - Stock ID: ${item.id_stock_vacuna}, Frascos: ${cantidadFrascos}, Dosis: ${cantidadDosis}, Precio base: ${precioBase}, Precio con recargo: ${precioConRecargo}, Subtotal: ${subtotal}`);

        detallesData.push({
          id_venta_directa: null, // Se asignará después de crear la venta
          id_producto: stock.id_vacuna, // Usar id_vacuna como id_producto para compatibilidad
          cantidad: cantidadFrascos, // Guardar cantidad en frascos
          precio_unitario: precioConRecargo, // Guardar el precio con recargo aplicado (por frasco)
          subtotal: subtotal,
          observaciones: item.observaciones || `Lote: ${stock.lote}`
        });
      }

      // Crear la venta directa con el precio total calculado
      const ventaDirecta = await tx.ventaDirecta.create({
        data: {
          numero_venta: numeroVenta,
          id_cliente: parseInt(id_cliente),
          id_lista_precio: id_lista_precio ? parseInt(id_lista_precio) : null,
          fecha_venta: new Date(),
          precio_total: precioTotal,
          estado_venta: 'pendiente',
          responsable_entrega: responsable_entrega || null,
          responsable_recibe: responsable_recibe || null,
          observaciones: observaciones_venta,
          created_by: req.user?.id_usuario || null
        }
      });

      // Asignar el id de la venta a los detalles
      detallesData.forEach(detalle => {
        detalle.id_venta_directa = ventaDirecta.id_venta_directa;
      });

      await tx.detalleVentaDirecta.createMany({
        data: detallesData
      });

      // Actualizar stocks - descontar en DOSIS (no frascos)
      for (const item of vacunas) {
        const stock = await tx.stockVacuna.findUnique({
          where: { id_stock_vacuna: parseInt(item.id_stock_vacuna) },
          include: {
            vacuna: {
              include: { presentacion: true }
            }
          }
        });

        // Convertir frascos a dosis para descontar
        const cantidadFrascos = parseInt(item.cantidad);
        const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1000;
        const cantidadDosisADescontar = cantidadFrascos * dosisPorFrasco;
        
        console.log(`Descontando stock - ID: ${item.id_stock_vacuna}, Frascos: ${cantidadFrascos}, Dosis a descontar: ${cantidadDosisADescontar}, Stock anterior: ${stock.stock_actual}`);

        // Actualizar stock actual (descontar DOSIS)
        await tx.stockVacuna.update({
          where: { id_stock_vacuna: parseInt(item.id_stock_vacuna) },
          data: {
            stock_actual: {
              decrement: cantidadDosisADescontar
            }
          }
        });

        // Registrar movimiento de stock (en DOSIS)
        await tx.movimientoStockVacuna.create({
          data: {
            id_stock_vacuna: parseInt(item.id_stock_vacuna),
            tipo_movimiento: 'egreso',
            cantidad: cantidadDosisADescontar,
            stock_anterior: stock.stock_actual,
            stock_posterior: stock.stock_actual - cantidadDosisADescontar,
            motivo: 'Venta directa',
            observaciones: `Venta directa ${numeroVenta} - ${cantidadFrascos} frascos (${cantidadDosisADescontar} dosis) - Cliente: ${cliente.nombre}`,
            id_usuario: req.user?.id_usuario || null
          }
        });
      }

      return {
        ...ventaDirecta,
        detalles: detallesData
      };
    });

    res.status(201).json({
      success: true,
      message: 'Venta directa creada exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error al crear venta directa:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear la venta directa'
    });
  }
};

/**
 * Obtener ventas directas con filtros
 */
exports.getVentasDirectas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      estado_venta,
      id_cliente,
      fecha_desde,
      fecha_hasta
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir filtros
    const where = {};
    
    if (estado_venta) where.estado_venta = estado_venta;
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_venta = {};
      if (fecha_desde) where.fecha_venta.gte = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_venta.lte = new Date(fecha_hasta);
    }

    const [ventas, total] = await Promise.all([
      prisma.ventaDirecta.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              cuit: true,
              email: true
            }
          },
          listaPrecio: {
            select: {
              tipo: true,
              nombre: true,
              porcentaje_recargo: true
            }
          },
          detalle_venta: {
            include: {
              producto: {
                select: {
                  id_producto: true,
                  nombre: true,
                  tipo_producto: true
                }
              }
            }
          }
        },
        orderBy: {
          fecha_venta: 'desc'
        }
      }),
      prisma.ventaDirecta.count({ where })
    ]);

    // Formatear respuesta para el frontend
    const ventasFormateadas = ventas.map(venta => ({
      id: venta.id_venta_directa,
      numeroVenta: venta.numero_venta,
      fechaVenta: venta.fecha_venta,
      estado: venta.estado_venta,
      montoTotal: parseFloat(venta.precio_total),
      observaciones: venta.observaciones,
      cliente: {
        id: venta.cliente.id_cliente,
        nombre: venta.cliente.nombre,
        cuit: venta.cliente.cuit,
        email: venta.cliente.email
      },
      listaPrecio: venta.listaPrecio ? {
        tipo: venta.listaPrecio.tipo,
        nombre: venta.listaPrecio.nombre,
        porcentajeRecargo: parseFloat(venta.listaPrecio.porcentaje_recargo)
      } : null,
      detalles: venta.detalle_venta.map(detalle => ({
        id: detalle.id_detalle_venta,
        producto: {
          id: detalle.producto.id_producto,
          nombre: detalle.producto.nombre,
          tipo: detalle.producto.tipo_producto
        },
        cantidad: detalle.cantidad,
        precioUnitario: parseFloat(detalle.precio_unitario),
        subtotal: parseFloat(detalle.subtotal)
      }))
    }));

    res.json({
      success: true,
      data: ventasFormateadas,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_count: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener ventas directas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas directas',
      data: [] // Devolver array vacío en caso de error
    });
  }
};

/**
 * Obtener venta directa por ID
 */
exports.getVentaDirectaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const venta = await prisma.ventaDirecta.findUnique({
      where: { id_venta_directa: parseInt(id) },
      include: {
        cliente: true,
        detalle_venta: {
          include: {
            producto: true
          }
        },
        remitos: true
      }
    });

    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta directa no encontrada'
      });
    }

    // Enriquecer con información de vacunas
    const detallesEnriquecidos = [];
    for (const detalle of venta.detalle_venta) {
      let detalleEnriquecido = { ...detalle };
      
      try {
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: detalle.id_producto },
          include: {
            proveedor: { select: { nombre: true } },
            patologia: { select: { nombre: true } }
          }
        });
        
        if (vacuna) {
          detalleEnriquecido.vacuna_info = {
            id_vacuna: vacuna.id_vacuna,
            codigo: vacuna.codigo,
            nombre: vacuna.nombre,
            detalle: vacuna.detalle,
            proveedor: vacuna.proveedor?.nombre,
            patologia: vacuna.patologia?.nombre
          };
        }
      } catch (error) {
        console.log(`No se pudo obtener info de vacuna para producto ${detalle.id_producto}`);
      }
      
      detallesEnriquecidos.push(detalleEnriquecido);
    }

    res.json({
      success: true,
      data: {
        ...venta,
        detalle_venta: detallesEnriquecidos
      }
    });

  } catch (error) {
    console.error('Error al obtener venta directa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la venta directa'
    });
  }
};

/**
 * Actualizar estado de venta directa
 */
exports.actualizarEstadoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_venta, observaciones } = req.body;

    const estadosValidos = ['pendiente', 'preparando', 'entregada', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado_venta)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de venta no válido'
      });
    }

    const venta = await prisma.ventaDirecta.update({
      where: { id_venta_directa: parseInt(id) },
      data: {
        estado_venta,
        observaciones: observaciones || undefined,
        updated_at: new Date()
      },
      include: {
        cliente: { select: { nombre: true } }
      }
    });

    res.json({
      success: true,
      message: 'Estado de venta actualizado exitosamente',
      data: {
        id_venta_directa: venta.id_venta_directa,
        numero_venta: venta.numero_venta,
        estado_venta: venta.estado_venta,
        cliente: venta.cliente.nombre
      }
    });

  } catch (error) {
    console.error('Error al actualizar estado de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de la venta'
    });
  }
};

/**
 * Genera un remito PDF para una venta directa específica
 */
exports.generarRemitoPdf = async (req, res) => {
  try {
    const { ventaId } = req.params;

    console.log('Generando remito PDF para venta directa:', ventaId);

    // Obtener la venta completa con todos los datos necesarios
    const venta = await prisma.ventaDirecta.findUnique({
      where: { id_venta_directa: parseInt(ventaId) },
      include: {
        detalle_venta: true, // Solo incluir el detalle sin relaciones por ahora
        cliente: true,
        listaPrecio: {
          select: {
            tipo: true,
            nombre: true,
            porcentaje_recargo: true
          }
        }
      }
    });

    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta directa no encontrada'
      });
    }

    // Verificar que la venta esté en estado válido para generar remito
    if (venta.estado === 'CANCELADA') {
      return res.status(400).json({
        success: false,
        message: 'No se puede generar remito para una venta cancelada'
      });
    }

    // Preparar datos para el PDF
    const datosRemito = {
      numeroRemito: `VD-${venta.numero_venta}`,
      fechaEmision: new Date().toLocaleDateString('es-AR'),
      horaEmision: new Date().toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),

      // Datos del cliente
      cliente: {
        nombre: venta.cliente.nombre,
        cuit: venta.cliente.cuit || 'No informado',
        email: venta.cliente.email || 'No informado',
        telefono: venta.cliente.telefono || 'No informado',
        direccion: venta.cliente.direccion || 'No informada',
        localidad: venta.cliente.localidad || 'No informada'
      },

      // Datos de la venta
      venta: {
        numeroVenta: venta.numero_venta,
        fechaVenta: venta.fecha_venta,
        estado: venta.estado_venta,
        observaciones: venta.observaciones,
        listaPrecio: venta.listaPrecio ? venta.listaPrecio.tipo : '' // Solo el código (L15, L30, etc.) o string vacío
      },

      // Datos de entrega
      entrega: {
        responsableEntrega: venta.responsable_entrega || 'Por definir',
        responsableRecibe: venta.responsable_recibe || venta.cliente.nombre
      },

      // Vacunas del detalle - obtener datos de vacuna manualmente
      vacunas: await Promise.all(venta.detalle_venta.map(async (detalle) => {
        // Como guardamos id_vacuna en id_producto, obtenemos la vacuna directamente
        const vacuna = await prisma.vacuna.findUnique({
          where: { id_vacuna: detalle.id_producto },
          include: {
            proveedor: true,
            patologia: true
          }
        });
        
        return {
          nombre: vacuna?.nombre || 'Vacuna no encontrada',
          descripcion: vacuna?.detalle || 'Sin descripción',
          codigo: vacuna?.codigo || 'SIN-CODIGO',
          proveedor: vacuna?.proveedor?.nombre || 'Sin proveedor',
          lote: 'N/A', // El lote específico no se guarda en detalle_venta
          fechaVencimiento: null, // La fecha vencimiento no se guarda en detalle_venta
          cantidad: detalle.cantidad,
          precioUnitario: parseFloat(detalle.precio_unitario)
        };
      })),

      // Totales (sin IVA como solicita el usuario)
      totales: {
        subtotal: parseFloat(venta.precio_total),
        total: parseFloat(venta.precio_total),
        mostrarIva: false // No mostrar IVA en el remito
      }
    };

    // Generar el PDF
    const pdfBuffer = await ventaDirectaPdfService.generarRemitoPdf(datosRemito);

    // Configurar headers para descargar el PDF
    const nombreArchivo = `remito-venta-directa-${venta.numeroVenta}-${new Date().getTime()}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Content-Length': pdfBuffer.length
    });

    // Enviar el PDF
    res.send(pdfBuffer);

    console.log('Remito PDF generado exitosamente para venta:', venta.numeroVenta);

  } catch (error) {
    console.error('Error generando remito PDF venta directa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar el remito PDF',
      error: error.message
    });
  }
};

/**
 * Confirma una venta directa y actualiza el estado
 */
exports.confirmarVentaDirecta = async (req, res) => {
  try {
    const { ventaId } = req.params;
    const { responsableEntrega, responsableRecibe } = req.body;

    console.log('Confirmando venta directa:', ventaId);

    // Actualizar estado a ENTREGADA
    const ventaActualizada = await prisma.ventaDirecta.update({
      where: { id_venta_directa: parseInt(ventaId) },
      data: {
        estado_venta: 'completada', // Cambiar a completada en lugar de ENTREGADA
        updated_at: new Date()
      },
      include: {
        detalle_venta: true, // Solo incluir el detalle sin relaciones por ahora
        cliente: true,
        listaPrecio: {
          select: {
            tipo: true,
            nombre: true,
            porcentaje_recargo: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Venta directa confirmada exitosamente',
      data: ventaActualizada
    });

  } catch (error) {
    console.error('Error confirmando venta directa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al confirmar la venta',
      error: error.message
    });
  }
};

module.exports = exports;