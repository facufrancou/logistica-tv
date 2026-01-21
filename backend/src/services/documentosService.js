const prisma = require('../lib/prisma');

/**
 * Servicio para gestión de documentos impresos
 * Maneja numeración correlativa y persistencia de documentos
 */
class DocumentosService {
  
  // Mapeo de tipos de documento a sus prefijos
  static PREFIJOS = {
    'orden_compra': 'OC',
    'remito_entrega': 'RE',
    'remito_venta': 'RV',
    'factura': 'FAC',
    'remito_venta_directa': 'RVD'
  };

  /**
   * Obtiene el siguiente número correlativo para un tipo de documento
   * Usa stored procedure para garantizar thread-safety
   */
  async obtenerSiguienteNumero(tipoDocumento) {
    try {
      // Obtener el prefijo correcto para este tipo de documento
      const prefijo = DocumentosService.PREFIJOS[tipoDocumento] || '';
      
      // Llamar al stored procedure con el prefijo correcto
      await prisma.$executeRaw`CALL sp_siguiente_numero_documento(${tipoDocumento}, ${prefijo}, @numero_doc)`;
      
      // Obtener el resultado
      const result = await prisma.$queryRaw`SELECT @numero_doc as numero_documento`;
      
      return result[0]?.numero_documento || null;
    } catch (error) {
      console.error('Error al obtener siguiente número:', error);
      throw error;
    }
  }

  /**
   * Busca si ya existe un documento impreso para una referencia específica
   */
  async buscarDocumentoExistente(tipoDocumento, referencias) {
    const where = { tipo_documento: tipoDocumento };
    
    if (referencias.idOrdenCompra) {
      where.id_orden_compra = referencias.idOrdenCompra;
    }
    if (referencias.idRemito) {
      where.id_remito = referencias.idRemito;
    }
    if (referencias.idCalendario) {
      where.id_calendario = referencias.idCalendario;
    }
    if (referencias.idProveedor) {
      where.id_proveedor = referencias.idProveedor;
    }
    if (referencias.idVentaDirecta) {
      where.id_venta_directa = referencias.idVentaDirecta;
    }
    
    // Para órdenes de compra por proveedor, necesitamos ambos
    if (referencias.idOrdenCompra && referencias.idProveedor) {
      where.id_orden_compra = referencias.idOrdenCompra;
      where.id_proveedor = referencias.idProveedor;
    }
    
    console.log('🔍 Buscando documento existente con:', JSON.stringify(where));
    
    const resultado = await prisma.documentoImpreso.findFirst({ 
      where,
      orderBy: { created_at: 'desc' }
    });
    
    console.log('🔍 Resultado búsqueda:', resultado ? `Encontrado: ${resultado.numero_documento}` : 'No encontrado');
    
    return resultado;
  }

  /**
   * Registra un nuevo documento impreso y obtiene número correlativo
   */
  async registrarDocumento(tipoDocumento, referencias, datosSnapshot, usuarioId) {
    try {
      // Obtener siguiente número
      const numeroDocumento = await this.obtenerSiguienteNumero(tipoDocumento);
      
      if (!numeroDocumento) {
        throw new Error('No se pudo generar número de documento');
      }

      // Preparar datos para crear el documento
      // Prisma no acepta null para campos opcionales, usar undefined
      const createData = {
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        impreso_por: usuarioId || undefined
      };

      // Solo agregar referencias que tengan valor
      if (referencias.idOrdenCompra) createData.id_orden_compra = referencias.idOrdenCompra;
      if (referencias.idRemito) createData.id_remito = referencias.idRemito;
      if (referencias.idCalendario) createData.id_calendario = referencias.idCalendario;
      if (referencias.idCotizacion) createData.id_cotizacion = referencias.idCotizacion;
      if (referencias.idProveedor) createData.id_proveedor = referencias.idProveedor;
      if (referencias.idCliente) createData.id_cliente = referencias.idCliente;
      if (referencias.idVentaDirecta) createData.id_venta_directa = referencias.idVentaDirecta;
      if (datosSnapshot) createData.datos_snapshot = JSON.stringify(datosSnapshot);

      // Crear el documento
      const documento = await prisma.documentoImpreso.create({
        data: createData
      });

      // Registrar en historial
      await prisma.historialImpresion.create({
        data: {
          id_documento: documento.id_documento,
          tipo_accion: 'primera_impresion',
          usuario_id: usuarioId || undefined
        }
      });

      return {
        id_documento: documento.id_documento,
        numero_documento: numeroDocumento,
        es_reimpresion: false
      };
    } catch (error) {
      console.error('Error al registrar documento:', error);
      throw error;
    }
  }

  /**
   * Obtiene o genera número de documento
   * Si ya existe, retorna el existente y registra reimpresión
   * Si no existe, genera uno nuevo
   * @param {boolean} options.forzarNuevo - Si es true, siempre genera un nuevo número (útil para entregas múltiples)
   */
  async obtenerOGenerarNumero(tipoDocumento, referencias, datosSnapshot, usuarioId, ipOrigen = null, options = {}) {
    const { forzarNuevo = false } = options;
    
    // Si forzarNuevo es true, generar nuevo documento sin buscar existente
    if (forzarNuevo) {
      console.log('🆕 Forzando nuevo número de documento (entrega múltiple)');
      return await this.registrarDocumento(tipoDocumento, referencias, datosSnapshot, usuarioId);
    }
    
    // Buscar documento existente
    const documentoExistente = await this.buscarDocumentoExistente(tipoDocumento, referencias);
    
    if (documentoExistente) {
      // Ya existe - registrar reimpresión
      await this.registrarReimpresion(documentoExistente.id_documento, usuarioId, ipOrigen);
      
      return {
        id_documento: documentoExistente.id_documento,
        numero_documento: documentoExistente.numero_documento,
        es_reimpresion: true,
        datos_originales: documentoExistente.datos_snapshot
      };
    }
    
    // No existe - generar nuevo
    return await this.registrarDocumento(tipoDocumento, referencias, datosSnapshot, usuarioId);
  }

  /**
   * Registra una reimpresión en el historial
   */
  async registrarReimpresion(idDocumento, usuarioId, ipOrigen = null, observaciones = null) {
    return await prisma.historialImpresion.create({
      data: {
        id_documento: idDocumento,
        tipo_accion: 'reimpresion',
        usuario_id: usuarioId || null,
        ip_origen: ipOrigen,
        observaciones
      }
    });
  }

  /**
   * Registra una descarga en el historial
   */
  async registrarDescarga(idDocumento, usuarioId, ipOrigen = null) {
    return await prisma.historialImpresion.create({
      data: {
        id_documento: idDocumento,
        tipo_accion: 'descarga',
        usuario_id: usuarioId || null,
        ip_origen: ipOrigen
      }
    });
  }

  /**
   * Guarda el PDF binario asociado a un documento
   */
  async guardarPDF(idDocumento, pdfBuffer, nombreArchivo) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    
    return await prisma.archivoDocumento.create({
      data: {
        id_documento: idDocumento,
        nombre_archivo: nombreArchivo,
        contenido_pdf: pdfBuffer,
        tamano_bytes: pdfBuffer.length,
        hash_archivo: hash
      }
    });
  }

  /**
   * Obtiene el PDF almacenado de un documento
   */
  async obtenerPDF(idDocumento) {
    return await prisma.archivoDocumento.findFirst({
      where: { id_documento: idDocumento },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Obtiene historial de impresiones de un documento
   */
  async getHistorialImpresiones(idDocumento) {
    return await prisma.historialImpresion.findMany({
      where: { id_documento: idDocumento },
      orderBy: { fecha_accion: 'desc' }
    });
  }

  /**
   * Obtiene el estado actual de las secuencias
   */
  async getSecuencias() {
    return await prisma.secuenciaDocumento.findMany({
      where: { activo: true },
      orderBy: { tipo_documento: 'asc' }
    });
  }

  /**
   * Actualiza el número de documento oficial en la tabla fuente
   */
  async actualizarNumeroOficialOrden(idOrdenCompra, numeroDocumento) {
    return await prisma.ordenCompra.update({
      where: { id_orden_compra: idOrdenCompra },
      data: {
        numero_documento_oficial: numeroDocumento,
        fecha_primera_impresion: new Date()
      }
    });
  }

  /**
   * Actualiza el número de remito en calendario
   */
  async actualizarNumeroRemitoCalendario(idCalendario, numeroDocumento) {
    return await prisma.calendarioVacunacion.update({
      where: { id_calendario: idCalendario },
      data: {
        numero_remito_entrega: numeroDocumento,
        fecha_impresion_remito: new Date()
      }
    });
  }

  /**
   * Actualiza el número de documento oficial en remito
   */
  async actualizarNumeroOficialRemito(idRemito, numeroDocumento) {
    return await prisma.remito.update({
      where: { id_remito: idRemito },
      data: {
        numero_documento_oficial: numeroDocumento,
        fecha_primera_impresion: new Date()
      }
    });
  }

  /**
   * Actualiza el número de remito oficial en venta directa
   */
  async actualizarNumeroRemitoVentaDirecta(idVentaDirecta, numeroDocumento) {
    return await prisma.ventaDirecta.update({
      where: { id_venta_directa: idVentaDirecta },
      data: {
        numero_remito_oficial: numeroDocumento,
        fecha_primera_impresion: new Date()
      }
    });
  }

  /**
   * Actualiza el snapshot de datos de un documento existente
   * Usado para guardar los datos completos después de generar el número
   */
  async actualizarSnapshotDocumento(idDocumento, datosSnapshot) {
    return await prisma.documentoImpreso.update({
      where: { id_documento: idDocumento },
      data: {
        datos_snapshot: JSON.stringify(datosSnapshot)
      }
    });
  }

  /**
   * Registra un documento que ya existía antes del sistema de numeración
   * Usado para entregas anteriores que ya tienen número asignado manualmente
   */
  async registrarDocumentoExistente(tipoDocumento, numeroDocumento, referencias, datosSnapshot, usuarioId) {
    try {
      // Verificar si ya existe para evitar duplicados
      const existente = await this.buscarDocumentoExistente(tipoDocumento, referencias);
      if (existente) {
        return existente;
      }

      // Preparar datos para crear el documento
      // Prisma no acepta null para campos opcionales, usar undefined
      const createData = {
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        impreso_por: usuarioId || undefined
      };

      // Solo agregar referencias que tengan valor
      if (referencias.idOrdenCompra) createData.id_orden_compra = referencias.idOrdenCompra;
      if (referencias.idRemito) createData.id_remito = referencias.idRemito;
      if (referencias.idCalendario) createData.id_calendario = referencias.idCalendario;
      if (referencias.idCotizacion) createData.id_cotizacion = referencias.idCotizacion;
      if (referencias.idProveedor) createData.id_proveedor = referencias.idProveedor;
      if (referencias.idCliente) createData.id_cliente = referencias.idCliente;
      if (referencias.idVentaDirecta) createData.id_venta_directa = referencias.idVentaDirecta;
      if (datosSnapshot) createData.datos_snapshot = JSON.stringify(datosSnapshot);

      // Crear el documento con el número existente
      const documento = await prisma.documentoImpreso.create({
        data: createData
      });

      return documento;
    } catch (error) {
      console.error('Error al registrar documento existente:', error);
      throw error;
    }
  }

  /**
   * Actualiza el snapshot de un documento existente
   * Útil cuando se necesita guardar datos adicionales después de la creación
   */
  async actualizarSnapshot(idDocumento, datosSnapshot) {
    try {
      return await prisma.documentoImpreso.update({
        where: { id_documento: idDocumento },
        data: {
          datos_snapshot: JSON.stringify(datosSnapshot)
        }
      });
    } catch (error) {
      console.error('Error al actualizar snapshot del documento:', error);
      throw error;
    }
  }
}

module.exports = new DocumentosService();
