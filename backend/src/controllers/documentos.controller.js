const prisma = require('../lib/prisma');
const documentosService = require('../services/documentosService');

// ===== CONTROLADORES DE CONSULTA =====

/**
 * Obtener todos los documentos impresos con filtros
 */
exports.getDocumentos = async (req, res) => {
  try {
    const {
      tipo_documento,
      fecha_desde,
      fecha_hasta,
      id_cliente,
      id_proveedor,
      id_cotizacion,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (tipo_documento) {
      where.tipo_documento = tipo_documento;
    }

    if (id_cliente) {
      where.id_cliente = parseInt(id_cliente);
    }

    if (id_proveedor) {
      where.id_proveedor = parseInt(id_proveedor);
    }

    if (id_cotizacion) {
      where.id_cotizacion = parseInt(id_cotizacion);
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha_emision = {};
      if (fecha_desde) {
        where.fecha_emision.gte = new Date(fecha_desde + 'T00:00:00.000Z');
      }
      if (fecha_hasta) {
        where.fecha_emision.lte = new Date(fecha_hasta + 'T23:59:59.999Z');
      }
    }

    if (search) {
      where.numero_documento = { contains: search };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [documentos, totalCount] = await Promise.all([
      prisma.documentoImpreso.findMany({
        where,
        include: {
          cliente: { select: { id_cliente: true, nombre: true } },
          proveedor: { select: { id_proveedor: true, nombre: true } },
          cotizacion: { select: { id_cotizacion: true, numero_cotizacion: true } },
          orden_compra: { select: { id_orden_compra: true, numero_orden: true } },
          _count: { select: { historial: true } }
        },
        orderBy: { fecha_emision: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.documentoImpreso.count({ where })
    ]);

    const documentosFormatted = documentos.map(doc => {
      // Parsear datos_snapshot si existe
      let datosSnapshot = null;
      if (doc.datos_snapshot) {
        try {
          datosSnapshot = typeof doc.datos_snapshot === 'string' 
            ? JSON.parse(doc.datos_snapshot) 
            : doc.datos_snapshot;
        } catch (e) {
          console.error('Error parseando datos_snapshot:', e);
        }
      }
      
      return {
        ...doc,
        datos_snapshot: datosSnapshot,
        total_impresiones: doc._count.historial,
        _count: undefined
      };
    });

    res.json({
      success: true,
      data: documentosFormatted,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Obtener documento por ID con historial
 */
exports.getDocumentoById = async (req, res) => {
  try {
    const { id } = req.params;

    const documento = await prisma.documentoImpreso.findUnique({
      where: { id_documento: parseInt(id) },
      include: {
        cliente: { select: { id_cliente: true, nombre: true, cuit: true } },
        proveedor: { select: { id_proveedor: true, nombre: true } },
        cotizacion: { select: { id_cotizacion: true, numero_cotizacion: true } },
        orden_compra: { select: { id_orden_compra: true, numero_orden: true, estado: true } },
        remito: { select: { id_remito: true, numero_remito: true, estado_remito: true } },
        calendario: { 
          select: { 
            id_calendario: true, 
            numero_semana: true, 
            fecha_programada: true,
            cantidad_dosis: true
          } 
        },
        historial: {
          orderBy: { fecha_accion: 'desc' },
          take: 50
        },
        archivos: {
          select: {
            id_archivo: true,
            nombre_archivo: true,
            tamano_bytes: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!documento) {
      return res.status(404).json({ 
        success: false, 
        error: 'Documento no encontrado' 
      });
    }

    res.json({
      success: true,
      data: documento
    });

  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Obtener historial de impresiones de un documento
 */
exports.getHistorialDocumento = async (req, res) => {
  try {
    const { id } = req.params;

    const historial = await documentosService.getHistorialImpresiones(parseInt(id));

    res.json({
      success: true,
      data: historial
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Obtener PDF almacenado de un documento
 */
exports.descargarPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const archivo = await documentosService.obtenerPDF(parseInt(id));

    if (!archivo || !archivo.contenido_pdf) {
      return res.status(404).json({ 
        success: false, 
        error: 'PDF no encontrado. El documento no tiene un PDF almacenado.' 
      });
    }

    // Registrar descarga
    await documentosService.registrarDescarga(
      parseInt(id), 
      req.user?.id_usuario,
      req.ip
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', archivo.contenido_pdf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre_archivo}"`);
    res.send(archivo.contenido_pdf);

  } catch (error) {
    console.error('Error al descargar PDF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al descargar el PDF' 
    });
  }
};

/**
 * Reimprimir documento regenerando el PDF desde el snapshot
 */
exports.reimprimirDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener documento con snapshot
    const documento = await prisma.documentoImpreso.findUnique({
      where: { id_documento: parseInt(id) }
    });
    
    if (!documento) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }
    
    if (!documento.datos_snapshot) {
      return res.status(400).json({
        success: false,
        error: 'El documento no tiene datos guardados para reimprimir'
      });
    }
    
    // Parsear snapshot
    let snapshotData;
    try {
      snapshotData = typeof documento.datos_snapshot === 'string'
        ? JSON.parse(documento.datos_snapshot)
        : documento.datos_snapshot;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Error al leer los datos del documento'
      });
    }
    
    // Marcar como reimpresión
    if (snapshotData.remito) {
      snapshotData.remito.es_reimpresion = true;
    }
    
    // Registrar reimpresión
    await documentosService.registrarReimpresion(
      parseInt(id),
      req.user?.id_usuario,
      req.ip
    );
    
    // Generar PDF según el tipo de documento
    let pdfBuffer;
    const pdfService = require('../services/pdfService');
    
    if (documento.tipo_documento === 'remito_entrega') {
      pdfBuffer = await pdfService.generateRemitoPDF(snapshotData);
    } else if (documento.tipo_documento === 'orden_compra') {
      pdfBuffer = await pdfService.generateOrdenCompraPDF(snapshotData);
    } else if (documento.tipo_documento === 'remito_venta_directa') {
      const VentaDirectaPdfService = require('../services/ventaDirectaPdfService');
      const ventaDirectaPdfService = new VentaDirectaPdfService();
      // Asegurar que use el número de documento original
      snapshotData.numeroRemito = documento.numero_documento;
      snapshotData.esReimpresion = true;
      pdfBuffer = await ventaDirectaPdfService.generarRemitoPdf(snapshotData);
    } else {
      return res.status(400).json({
        success: false,
        error: `Tipo de documento no soportado para reimpresión: ${documento.tipo_documento}`
      });
    }
    
    // Configurar headers
    const filename = `${documento.numero_documento}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error al reimprimir documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el PDF: ' + error.message
    });
  }
};

/**
 * Obtener estado de secuencias de numeración
 */
exports.getSecuencias = async (req, res) => {
  try {
    const secuencias = await documentosService.getSecuencias();

    // Calcular próximo número ejemplo para cada secuencia
    const secuenciasFormatted = secuencias.map(seq => {
      const fecha = new Date();
      const anio = fecha.getFullYear().toString().slice(-2);
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const siguienteNum = String(seq.ultimo_numero + 1).padStart(seq.digitos_numero, '0');
      
      let proximoEjemplo = seq.formato
        .replace('{PREFIJO}', seq.prefijo)
        .replace('{ANIO}', anio)
        .replace('{MES}', mes)
        .replace('{NUMERO}', siguienteNum);

      return {
        ...seq,
        proximo_numero: seq.ultimo_numero + 1,
        proximo_ejemplo: proximoEjemplo
      };
    });

    res.json({
      success: true,
      data: secuenciasFormatted
    });

  } catch (error) {
    console.error('Error al obtener secuencias:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Buscar documento por número
 */
exports.buscarPorNumero = async (req, res) => {
  try {
    const { numero } = req.query;

    if (!numero) {
      return res.status(400).json({ 
        success: false, 
        error: 'Debe proporcionar un número de documento' 
      });
    }

    const documentos = await prisma.documentoImpreso.findMany({
      where: {
        numero_documento: { contains: numero }
      },
      include: {
        cliente: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
        cotizacion: { select: { numero_cotizacion: true } }
      },
      take: 20,
      orderBy: { fecha_emision: 'desc' }
    });

    res.json({
      success: true,
      data: documentos
    });

  } catch (error) {
    console.error('Error al buscar documento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Estadísticas de documentos impresos
 */
exports.getEstadisticas = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    const whereDate = {};
    if (fecha_desde || fecha_hasta) {
      whereDate.fecha_emision = {};
      if (fecha_desde) {
        whereDate.fecha_emision.gte = new Date(fecha_desde + 'T00:00:00.000Z');
      }
      if (fecha_hasta) {
        whereDate.fecha_emision.lte = new Date(fecha_hasta + 'T23:59:59.999Z');
      }
    }

    // Contar por tipo
    const porTipo = await prisma.documentoImpreso.groupBy({
      by: ['tipo_documento'],
      where: whereDate,
      _count: { id_documento: true }
    });

    // Total de documentos
    const totalDocumentos = await prisma.documentoImpreso.count({ where: whereDate });

    // Total de impresiones (historial)
    const totalImpresiones = await prisma.historialImpresion.count({
      where: fecha_desde || fecha_hasta ? {
        fecha_accion: whereDate.fecha_emision
      } : {}
    });

    // Últimos documentos
    const ultimosDocumentos = await prisma.documentoImpreso.findMany({
      where: whereDate,
      include: {
        cliente: { select: { nombre: true } },
        proveedor: { select: { nombre: true } }
      },
      orderBy: { fecha_emision: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      data: {
        total_documentos: totalDocumentos,
        total_impresiones: totalImpresiones,
        por_tipo: porTipo.reduce((acc, item) => {
          acc[item.tipo_documento] = item._count.id_documento;
          return acc;
        }, {}),
        ultimos_documentos: ultimosDocumentos
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

// ===== CONTROLADORES DE ACCIÓN =====

/**
 * Registrar visualización de documento (sin descargar)
 */
exports.registrarVisualizacion = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.historialImpresion.create({
      data: {
        id_documento: parseInt(id),
        tipo_accion: 'visualizacion',
        usuario_id: req.user?.id_usuario || null,
        ip_origen: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Visualización registrada'
    });

  } catch (error) {
    console.error('Error al registrar visualización:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Actualizar configuración de secuencia (solo admin)
 */
exports.actualizarSecuencia = async (req, res) => {
  try {
    const { tipo_documento } = req.params;
    const { formato, digitos_numero, reinicio_anual } = req.body;

    const secuencia = await prisma.secuenciaDocumento.updateMany({
      where: { 
        tipo_documento: tipo_documento,
        activo: true 
      },
      data: {
        formato: formato || undefined,
        digitos_numero: digitos_numero || undefined,
        reinicio_anual: reinicio_anual !== undefined ? reinicio_anual : undefined
      }
    });

    if (secuencia.count === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Secuencia no encontrada' 
      });
    }

    res.json({
      success: true,
      message: 'Secuencia actualizada correctamente'
    });

  } catch (error) {
    console.error('Error al actualizar secuencia:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

// ===== EXPORTAR SERVICIO PARA USO EN OTROS CONTROLADORES =====
exports.documentosService = documentosService;
