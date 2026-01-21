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
 * Función auxiliar para generar datos de remito (usada como fallback en reimpresiones sin snapshot)
 */
async function generarDatosRemitoVentaDirecta(venta, numeroRemito, esReimpresion) {
  return {
    numeroRemito: numeroRemito,
    numeroVentaOriginal: venta.numero_venta,
    esReimpresion: esReimpresion,
    fechaEmision: new Date().toLocaleDateString('es-AR'),
    horaEmision: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    cliente: {
      nombre: venta.cliente.nombre,
      cuit: venta.cliente.cuit || 'No informado',
      email: venta.cliente.email || 'No informado',
      telefono: venta.cliente.telefono || 'No informado',
      direccion: venta.cliente.direccion || 'No informada',
      localidad: venta.cliente.localidad || 'No informada'
    },
    venta: {
      numeroVenta: venta.numero_venta,
      fechaVenta: venta.fecha_venta,
      estado: venta.estado_venta,
      observaciones: venta.observaciones,
      listaPrecio: venta.listaPrecio ? venta.listaPrecio.tipo : ''
    },
    entrega: {
      responsableEntrega: venta.responsable_entrega || 'Por definir',
      responsableRecibe: venta.responsable_recibe || venta.cliente.nombre
    },
    vacunas: await Promise.all(venta.detalle_venta.map(async (detalle) => {
      const vacuna = await prisma.vacuna.findUnique({
        where: { id_vacuna: detalle.id_producto },
        include: { proveedor: true, patologia: true }
      });
      return {
        nombre: vacuna?.nombre || 'Vacuna no encontrada',
        descripcion: vacuna?.detalle || 'Sin descripción',
        codigo: vacuna?.codigo || 'SIN-CODIGO',
        proveedor: vacuna?.proveedor?.nombre || 'Sin proveedor',
        lote: detalle.lote || 'N/A',
        fechaVencimiento: detalle.fecha_vencimiento || null,
        cantidad: detalle.cantidad,
        precioUnitario: parseFloat(detalle.precio_unitario)
      };
    })),
    totales: {
      subtotal: parseFloat(venta.precio_total),
      total: parseFloat(venta.precio_total),
      mostrarIva: false
    }
  };
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
      limit = 100
    } = req.query;

    // Construir filtros - Mostrar todos los stocks con stock físico > 0
    const where = {
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

    console.log('getStocksDisponibles - Filtros aplicados:', JSON.stringify(where));

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
                select: { nombre: true, unidad_medida: true, dosis_por_frasco: true }
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

    console.log(`getStocksDisponibles - Encontrados: ${stocks.length} stocks de ${totalCount} total`);

    // Formatear respuesta con información adicional
    const stocksFormatted = stocks.map(stock => {
      const today = new Date();
      const fechaVencimiento = new Date(stock.fecha_vencimiento);
      const diasHastaVencimiento = Math.ceil((fechaVencimiento - today) / (1000 * 60 * 60 * 24));
      
      // Para ventas fuera de plan, usar el stock_actual total (stock físico real)
      // No restar stock_reservado porque la reserva es solo organizativa
      const dosisDisponibles = stock.stock_actual;
      
      // Calcular en frascos basado en el stock actual total
      const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1;
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

        // Para ventas fuera de plan, validar contra el stock físico total (stock_actual)
        // Las reservas son solo organizativas y no impiden ventas directas
        if (stock.stock_actual < item.cantidad) {
          throw new Error(`Stock insuficiente para ${stock.vacuna.nombre}. Stock físico: ${stock.stock_actual}, Solicitado: ${item.cantidad}`);
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
        const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1;
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
          id_stock_vacuna: parseInt(item.id_stock_vacuna), // Referencia al stock específico
          cantidad: cantidadFrascos, // Guardar cantidad en frascos
          precio_unitario: precioConRecargo, // Guardar el precio con recargo aplicado (por frasco)
          subtotal: subtotal,
          lote: stock.lote, // Snapshot del lote
          fecha_vencimiento: stock.fecha_vencimiento, // Snapshot de la fecha de vencimiento
          observaciones: item.observaciones || null
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
        const dosisPorFrasco = stock.vacuna?.presentacion?.dosis_por_frasco || 1;
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
    const documentosService = require('../services/documentosService');

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

    // === INTEGRACIÓN CON SISTEMA DE DOCUMENTOS ===
    // Verificar si ya tiene número de remito asignado
    let numeroRemitoOficial = venta.numero_remito_oficial;
    let esReimpresion = false;
    let datosRemitoFinal = null;
    
    if (!numeroRemitoOficial) {
      // Primera impresión - generar número correlativo y preparar datos
      
      // Preparar datos para el PDF (primera vez)
      const datosRemito = {
        numeroVentaOriginal: venta.numero_venta,
        fechaEmision: new Date().toLocaleDateString('es-AR'),
        horaEmision: new Date().toLocaleTimeString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        cliente: {
          nombre: venta.cliente.nombre,
          cuit: venta.cliente.cuit || 'No informado',
          email: venta.cliente.email || 'No informado',
          telefono: venta.cliente.telefono || 'No informado',
          direccion: venta.cliente.direccion || 'No informada',
          localidad: venta.cliente.localidad || 'No informada'
        },
        venta: {
          numeroVenta: venta.numero_venta,
          fechaVenta: venta.fecha_venta,
          estado: venta.estado_venta,
          observaciones: venta.observaciones,
          listaPrecio: venta.listaPrecio ? venta.listaPrecio.tipo : ''
        },
        entrega: {
          responsableEntrega: venta.responsable_entrega || 'Por definir',
          responsableRecibe: venta.responsable_recibe || venta.cliente.nombre
        },
        vacunas: await Promise.all(venta.detalle_venta.map(async (detalle) => {
          const vacuna = await prisma.vacuna.findUnique({
            where: { id_vacuna: detalle.id_producto },
            include: { proveedor: true, patologia: true }
          });
          return {
            nombre: vacuna?.nombre || 'Vacuna no encontrada',
            descripcion: vacuna?.detalle || 'Sin descripción',
            codigo: vacuna?.codigo || 'SIN-CODIGO',
            proveedor: vacuna?.proveedor?.nombre || 'Sin proveedor',
            lote: detalle.lote || 'N/A',
            fechaVencimiento: detalle.fecha_vencimiento || null,
            cantidad: detalle.cantidad,
            precioUnitario: parseFloat(detalle.precio_unitario)
          };
        })),
        totales: {
          subtotal: parseFloat(venta.precio_total),
          total: parseFloat(venta.precio_total),
          mostrarIva: false
        }
      };
      
      // Generar número y guardar snapshot
      const docResult = await documentosService.obtenerOGenerarNumero(
        'remito_venta_directa',
        { 
          idVentaDirecta: parseInt(ventaId),
          idCliente: venta.id_cliente
        },
        datosRemito, // Guardar snapshot inicial
        req.user?.id_usuario,
        req.ip
      );
      
      numeroRemitoOficial = docResult.numero_documento;
      datosRemito.numeroRemito = numeroRemitoOficial;
      datosRemito.esReimpresion = false;
      datosRemitoFinal = datosRemito;
      
      // Actualizar el snapshot con el número de remito oficial para futuras reimpresiones
      await documentosService.actualizarSnapshot(docResult.id_documento, datosRemito);
      
      // Actualizar venta directa con el número de remito asignado
      await documentosService.actualizarNumeroRemitoVentaDirecta(parseInt(ventaId), numeroRemitoOficial);
      
    } else {
      // Es reimpresión - usar datos del snapshot original
      esReimpresion = true;
      const docExistente = await documentosService.buscarDocumentoExistente(
        'remito_venta_directa',
        { idVentaDirecta: parseInt(ventaId) }
      );
      
      if (docExistente) {
        // Registrar reimpresión en historial
        await documentosService.registrarReimpresion(docExistente.id_documento, req.user?.id_usuario, req.ip);
        
        // Usar datos del snapshot si existen
        if (docExistente.datos_snapshot) {
          try {
            const snapshotData = typeof docExistente.datos_snapshot === 'string' 
              ? JSON.parse(docExistente.datos_snapshot) 
              : docExistente.datos_snapshot;
            datosRemitoFinal = snapshotData;
            datosRemitoFinal.numeroRemito = numeroRemitoOficial;
            datosRemitoFinal.esReimpresion = true;
            console.log('📋 Usando datos del snapshot original para reimpresión de venta directa');
          } catch (parseError) {
            console.warn('⚠️ Error al parsear snapshot, regenerando datos:', parseError.message);
            // Fallback: regenerar datos si no se puede parsear el snapshot
            datosRemitoFinal = await generarDatosRemitoVentaDirecta(venta, numeroRemitoOficial, true);
          }
        } else {
          // No hay snapshot, regenerar datos
          datosRemitoFinal = await generarDatosRemitoVentaDirecta(venta, numeroRemitoOficial, true);
        }
      }
    }

    // Generar el PDF
    const pdfBuffer = await ventaDirectaPdfService.generarRemitoPdf(datosRemitoFinal);

    // Configurar headers para descargar el PDF con número oficial
    const nombreArchivo = `remito-${numeroRemitoOficial}-venta-${venta.numero_venta}${esReimpresion ? '-COPIA' : ''}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Content-Length': pdfBuffer.length
    });

    // Enviar el PDF
    res.send(pdfBuffer);

    console.log(`Remito PDF generado exitosamente: ${numeroRemitoOficial} (${esReimpresion ? 'reimpresión' : 'primera impresión'})`);

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