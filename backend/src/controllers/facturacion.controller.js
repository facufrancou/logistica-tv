const prisma = require('../lib/prisma');

// ===== FUNCIONES AUXILIARES =====

function generarNumeroFactura() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `FACT-${year}${month}${day}-${random}`;
}

function calcularFechaVencimiento(fechaEmision, diasVencimiento = 30) {
  const fecha = new Date(fechaEmision);
  fecha.setDate(fecha.getDate() + diasVencimiento);
  return fecha;
}

async function obtenerConfiguracionFacturacion(idCliente) {
  let configuracion = await prisma.configuracionFacturacion.findFirst({
    where: { 
      id_cliente: idCliente,
      activo: true 
    }
  });

  // Si no existe configuración específica del cliente, usar configuración por defecto
  if (!configuracion) {
    configuracion = {
      modalidad_default: 'total_inicio',
      porcentaje_default: null,
      dias_vencimiento: 30,
      incluir_impuestos: true,
      moneda: 'ARS',
      descuento_pronto_pago: 0,
      observaciones_default: null,
      datos_fiscales_default: null
    };
  }

  return configuracion;
}

function calcularMontoSegunModalidad(cotizacion, modalidad, porcentaje = null) {
  const precioTotal = parseFloat(cotizacion.precio_total);
  
  switch (modalidad) {
    case 'total_inicio':
      return precioTotal;
    
    case 'por_aplicacion':
      // Facturar proporcional a las dosis aplicadas
      const totalDosis = cotizacion.detalle_cotizacion.reduce((total, detalle) => 
        total + detalle.cantidad_total, 0);
      
      const dosisAplicadas = cotizacion.aplicaciones_dosis.length;
      
      if (totalDosis === 0) return 0;
      return (precioTotal * dosisAplicadas) / totalDosis;
    
    case 'porcentaje_custom':
      if (!porcentaje || porcentaje <= 0 || porcentaje > 100) {
        throw new Error('Porcentaje requerido para modalidad personalizada');
      }
      return (precioTotal * porcentaje) / 100;
    
    case 'mensual':
      const duracionSemanas = cotizacion.plan.duracion_semanas;
      const meses = Math.ceil(duracionSemanas / 4.33); // Promedio semanas por mes
      return precioTotal / meses;
    
    default:
      throw new Error('Modalidad de facturación no válida');
  }
}

async function calcularImpuestosYDescuentos(montoBase, configuracion, cliente) {
  let impuestos = 0;
  let descuentos = 0;

  // Calcular impuestos si está habilitado
  if (configuracion.incluir_impuestos) {
    // Ejemplo: IVA 21% (puede personalizarse según país/región)
    impuestos = montoBase * 0.21;
  }

  // Aplicar descuento por pronto pago si corresponde
  if (configuracion.descuento_pronto_pago > 0) {
    descuentos = montoBase * (configuracion.descuento_pronto_pago / 100);
  }

  // Verificar descuentos específicos del cliente
  const descuentosCliente = await prisma.descuento.findMany({
    where: {
      id_cliente: cliente.id_cliente,
      activo: true,
      fecha_inicio: { lte: new Date() },
      OR: [
        { fecha_fin: null },
        { fecha_fin: { gte: new Date() } }
      ]
    }
  });

  for (const descuento of descuentosCliente) {
    if (descuento.tipo === 'porcentaje') {
      descuentos += montoBase * (parseFloat(descuento.valor) / 100);
    } else if (descuento.tipo === 'monto_fijo') {
      descuentos += parseFloat(descuento.valor);
    }
  }

  return { impuestos, descuentos };
}

// ===== CONTROLADORES =====

// POST /api/facturas/generar
const generarFactura = async (req, res) => {
  try {
    const { 
      id_cotizacion, 
      modalidad_facturacion, 
      porcentaje_aplicado,
      fecha_emision,
      observaciones,
      datos_fiscales
    } = req.body;

    // Validaciones básicas
    if (!id_cotizacion) {
      return res.status(400).json({
        success: false,
        message: 'ID de cotización es requerido'
      });
    }

    // Obtener cotización con datos relacionados
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id_cotizacion) },
      include: {
        cliente: true,
        plan: true,
        lista_precio: true,
        detalle_cotizacion: {
          include: { producto: true }
        },
        aplicaciones_dosis: true
      }
    });

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada'
      });
    }

    if (cotizacion.estado !== 'aceptada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden facturar cotizaciones aceptadas'
      });
    }

    // Obtener configuración de facturación
    const configuracion = await obtenerConfiguracionFacturacion(cotizacion.id_cliente);

    // Determinar modalidad y porcentaje
    const modalidadFinal = modalidad_facturacion || configuracion.modalidad_default;
    const porcentajeFinal = porcentaje_aplicado || configuracion.porcentaje_default;

    // Calcular monto base según modalidad
    const montoBase = calcularMontoSegunModalidad(cotizacion, modalidadFinal, porcentajeFinal);

    // Calcular impuestos y descuentos
    const { impuestos, descuentos } = await calcularImpuestosYDescuentos(
      montoBase, 
      configuracion, 
      cotizacion.cliente
    );

    const montoTotal = montoBase + impuestos - descuentos;

    // Generar número de factura único
    let numeroFactura;
    let intentos = 0;
    
    do {
      numeroFactura = generarNumeroFactura();
      const facturaExistente = await prisma.factura.findUnique({
        where: { numero_factura: numeroFactura }
      });
      
      if (!facturaExistente) break;
      intentos++;
    } while (intentos < 10);

    if (intentos >= 10) {
      return res.status(500).json({
        success: false,
        message: 'Error generando número de factura único'
      });
    }

    // Crear factura
    const fechaEmisionFinal = fecha_emision ? new Date(fecha_emision) : new Date();
    const fechaVencimiento = calcularFechaVencimiento(fechaEmisionFinal, configuracion.dias_vencimiento);

    const factura = await prisma.factura.create({
      data: {
        numero_factura: numeroFactura,
        id_cotizacion: cotizacion.id_cotizacion,
        estado_factura: 'pendiente',
        fecha_emision: fechaEmisionFinal,
        fecha_vencimiento: fechaVencimiento,
        monto_total: montoTotal,
        monto_pagado: 0,
        descuento_aplicado: descuentos,
        porcentaje_facturado: modalidadFinal === 'porcentaje_custom' ? porcentajeFinal : null,
        observaciones: observaciones || configuracion.observaciones_default,
        datos_fiscales: datos_fiscales || configuracion.datos_fiscales_default,
        created_by: req.session?.user?.id_usuario || null
      }
    });

    // Crear detalle de factura
    const detallesFactura = [];

    // Detalle principal del plan
    detallesFactura.push({
      id_factura: factura.id_factura,
      concepto: `Plan Vacunal: ${cotizacion.plan.nombre}`,
      descripcion: `Cotización: ${cotizacion.numero_cotizacion}`,
      cantidad: 1,
      precio_unitario: montoBase,
      subtotal: montoBase,
      descuento: 0,
      impuestos: 0,
      tipo_item: 'plan_vacunal',
      referencia_id: cotizacion.id_plan
    });

    // Detalle de impuestos si aplica
    if (impuestos > 0) {
      detallesFactura.push({
        id_factura: factura.id_factura,
        concepto: 'Impuestos',
        descripcion: 'IVA y otros impuestos aplicables',
        cantidad: 1,
        precio_unitario: impuestos,
        subtotal: impuestos,
        descuento: 0,
        impuestos: 0,
        tipo_item: 'impuesto'
      });
    }

    // Detalle de descuentos si aplica
    if (descuentos > 0) {
      detallesFactura.push({
        id_factura: factura.id_factura,
        concepto: 'Descuentos',
        descripcion: 'Descuentos por pronto pago y promociones',
        cantidad: 1,
        precio_unitario: -descuentos,
        subtotal: -descuentos,
        descuento: 0,
        impuestos: 0,
        tipo_item: 'descuento'
      });
    }

    await prisma.detalleFactura.createMany({
      data: detallesFactura
    });

    // Actualizar modalidad de facturación en la cotización
    await prisma.cotizacion.update({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      data: {
        modalidad_facturacion: modalidadFinal,
        porcentaje_aplicado: porcentajeFinal
      }
    });

    // Obtener factura completa para respuesta
    const facturaCompleta = await prisma.factura.findUnique({
      where: { id_factura: factura.id_factura },
      include: {
        cotizacion: {
          include: {
            cliente: true,
            plan: true
          }
        },
        detalle_factura: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Factura generada exitosamente',
      data: facturaCompleta
    });

  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET /api/facturas/:id/detalle
const obtenerDetalleFactura = async (req, res) => {
  try {
    const { id } = req.params;

    const factura = await prisma.factura.findUnique({
      where: { id_factura: parseInt(id) },
      include: {
        cotizacion: {
          include: {
            cliente: true,
            plan: true,
            lista_precio: true,
            detalle_cotizacion: {
              include: { producto: true }
            },
            aplicaciones_dosis: {
              include: { producto: true }
            }
          }
        },
        detalle_factura: true
      }
    });

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Calcular métricas adicionales
    const totalDosisProgramadas = factura.cotizacion.detalle_cotizacion.reduce(
      (total, detalle) => total + detalle.cantidad_total, 0
    );

    const totalDosisAplicadas = factura.cotizacion.aplicaciones_dosis.length;

    const porcentajeAvance = totalDosisProgramadas > 0 
      ? (totalDosisAplicadas / totalDosisProgramadas) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        ...factura,
        metricas: {
          total_dosis_programadas: totalDosisProgramadas,
          total_dosis_aplicadas: totalDosisAplicadas,
          porcentaje_avance: Math.round(porcentajeAvance * 100) / 100,
          dias_vencimiento: factura.fecha_vencimiento ? 
            Math.ceil((new Date(factura.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)) : null
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo detalle de factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// PUT /api/cotizaciones/:id/configurar-facturacion
const configurarFacturacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { modalidad_facturacion, porcentaje_aplicado } = req.body;

    // Validaciones
    if (!modalidad_facturacion) {
      return res.status(400).json({
        success: false,
        message: 'Modalidad de facturación es requerida'
      });
    }

    if (modalidad_facturacion === 'porcentaje_custom' && (!porcentaje_aplicado || porcentaje_aplicado <= 0 || porcentaje_aplicado > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Porcentaje válido requerido para modalidad personalizada'
      });
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: parseInt(id) }
    });

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada'
      });
    }

    const cotizacionActualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: parseInt(id) },
      data: {
        modalidad_facturacion,
        porcentaje_aplicado: modalidad_facturacion === 'porcentaje_custom' ? porcentaje_aplicado : null,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Configuración de facturación actualizada',
      data: cotizacionActualizada
    });

  } catch (error) {
    console.error('Error configurando facturación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/facturas
const listarFacturas = async (req, res) => {
  try {
    const { 
      cliente_id, 
      estado, 
      fecha_desde, 
      fecha_hasta, 
      page = 1, 
      limit = 20 
    } = req.query;

    const whereConditions = {};

    if (cliente_id) {
      whereConditions.cotizacion = {
        id_cliente: parseInt(cliente_id)
      };
    }

    if (estado) {
      whereConditions.estado_factura = estado;
    }

    if (fecha_desde || fecha_hasta) {
      whereConditions.fecha_emision = {};
      if (fecha_desde) whereConditions.fecha_emision.gte = new Date(fecha_desde);
      if (fecha_hasta) whereConditions.fecha_emision.lte = new Date(fecha_hasta);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [facturas, totalCount] = await Promise.all([
      prisma.factura.findMany({
        where: whereConditions,
        include: {
          cotizacion: {
            include: {
              cliente: true,
              plan: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.factura.count({ where: whereConditions })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: facturas,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error listando facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// PUT /api/facturas/:id/estado
const cambiarEstadoFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_factura, fecha_pago, monto_pagado, observaciones } = req.body;

    // Validaciones
    const estadosValidos = ['pendiente', 'enviada', 'pagada', 'vencida', 'cancelada'];
    if (!estadosValidos.includes(estado_factura)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de factura no válido'
      });
    }

    const factura = await prisma.factura.findUnique({
      where: { id_factura: parseInt(id) }
    });

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const updateData = {
      estado_factura,
      updated_at: new Date()
    };

    if (estado_factura === 'pagada') {
      updateData.fecha_pago = fecha_pago ? new Date(fecha_pago) : new Date();
      updateData.monto_pagado = monto_pagado || factura.monto_total;
    }

    if (observaciones) {
      updateData.observaciones = observaciones;
    }

    const facturaActualizada = await prisma.factura.update({
      where: { id_factura: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Estado de factura actualizado',
      data: facturaActualizada
    });

  } catch (error) {
    console.error('Error cambiando estado de factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/facturas/reportes/financiero
const generarReporteFinanciero = async (req, res) => {
  try {
    const { 
      fecha_desde, 
      fecha_hasta, 
      cliente_id, 
      agrupacion = 'mes' 
    } = req.query;

    const whereConditions = {};

    if (cliente_id) {
      whereConditions.cotizacion = {
        id_cliente: parseInt(cliente_id)
      };
    }

    if (fecha_desde || fecha_hasta) {
      whereConditions.fecha_emision = {};
      if (fecha_desde) whereConditions.fecha_emision.gte = new Date(fecha_desde);
      if (fecha_hasta) whereConditions.fecha_emision.lte = new Date(fecha_hasta);
    }

    // Obtener facturas para el reporte
    const facturas = await prisma.factura.findMany({
      where: whereConditions,
      include: {
        cotizacion: {
          include: {
            cliente: true,
            plan: true
          }
        }
      },
      orderBy: { fecha_emision: 'asc' }
    });

    // Calcular métricas
    const metricas = {
      total_facturado: 0,
      total_cobrado: 0,
      total_pendiente: 0,
      facturas_pendientes: 0,
      facturas_pagadas: 0,
      facturas_vencidas: 0,
      por_modalidad: {}
    };

    const facturacionPorPeriodo = {};

    facturas.forEach(factura => {
      const monto = parseFloat(factura.monto_total);
      const montoPagado = parseFloat(factura.monto_pagado || 0);

      metricas.total_facturado += monto;
      metricas.total_cobrado += montoPagado;

      if (factura.estado_factura === 'pendiente') {
        metricas.total_pendiente += monto - montoPagado;
        metricas.facturas_pendientes++;
      } else if (factura.estado_factura === 'pagada') {
        metricas.facturas_pagadas++;
      } else if (factura.estado_factura === 'vencida') {
        metricas.facturas_vencidas++;
      }

      // Agrupar por modalidad
      const modalidad = factura.cotizacion.modalidad_facturacion || 'total_inicio';
      if (!metricas.por_modalidad[modalidad]) {
        metricas.por_modalidad[modalidad] = {
          cantidad: 0,
          monto_total: 0
        };
      }
      metricas.por_modalidad[modalidad].cantidad++;
      metricas.por_modalidad[modalidad].monto_total += monto;

      // Agrupar por período
      const fechaEmision = new Date(factura.fecha_emision);
      let periodo;

      if (agrupacion === 'dia') {
        periodo = fechaEmision.toISOString().split('T')[0];
      } else if (agrupacion === 'semana') {
        const weekStart = new Date(fechaEmision);
        weekStart.setDate(fechaEmision.getDate() - fechaEmision.getDay());
        periodo = weekStart.toISOString().split('T')[0];
      } else { // mes
        periodo = `${fechaEmision.getFullYear()}-${String(fechaEmision.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!facturacionPorPeriodo[periodo]) {
        facturacionPorPeriodo[periodo] = {
          periodo,
          total_facturado: 0,
          total_cobrado: 0,
          cantidad_facturas: 0
        };
      }

      facturacionPorPeriodo[periodo].total_facturado += monto;
      facturacionPorPeriodo[periodo].total_cobrado += montoPagado;
      facturacionPorPeriodo[periodo].cantidad_facturas++;
    });

    res.json({
      success: true,
      data: {
        metricas,
        facturacion_por_periodo: Object.values(facturacionPorPeriodo),
        parametros: {
          fecha_desde,
          fecha_hasta,
          cliente_id,
          agrupacion
        }
      }
    });

  } catch (error) {
    console.error('Error generando reporte financiero:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  generarFactura,
  obtenerDetalleFactura,
  configurarFacturacion,
  listarFacturas,
  cambiarEstadoFactura,
  generarReporteFinanciero
};
