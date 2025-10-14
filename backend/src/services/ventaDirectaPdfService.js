const path = require('path');
const fs = require('fs').promises;
const htmlPdf = require('html-pdf-node');

class VentaDirectaPdfService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/remito-venta-directa.html');
    this.options = {
      format: 'A4',
      border: {
        top: "10mm",
        right: "10mm",
        bottom: "15mm",
        left: "10mm"
      },
      type: 'pdf',
      timeout: 30000,
      quality: 100,
      zoomFactor: 1,
      phantomPath: null,
      phantomArgs: [],
      localUrlAccess: false,
      httpHeaders: {},
      renderDelay: 500
    };
  }

  /**
   * Genera un PDF de remito para venta directa de vacunas
   * @param {Object} ventaDirectaData - Datos de la venta directa
   * @returns {Promise<Buffer>} Buffer del PDF generado
   */
  async generarRemitoPdf(ventaDirectaData) {
    try {
      console.log('Iniciando generación de PDF para venta directa:', ventaDirectaData.venta?.numeroVenta);

      // Validar que tenemos los datos mínimos necesarios
      this.validarDatosMinimos(ventaDirectaData);

      // Leer el template HTML
      const template = await this.leerTemplate();

      // Procesar los datos y reemplazar placeholders
      const htmlCompleto = this.procesarTemplate(template, ventaDirectaData);

      // Generar el PDF
      const file = { content: htmlCompleto };
      const pdfBuffer = await htmlPdf.generatePdf(file, this.options);

      console.log('PDF de venta directa generado exitosamente');
      return pdfBuffer;

    } catch (error) {
      console.error('Error generando PDF de venta directa:', error);
      throw new Error(`Error al generar PDF de venta directa: ${error.message}`);
    }
  }

  /**
   * Valida que los datos mínimos estén presentes
   * @param {Object} data - Datos de la venta directa
   */
  validarDatosMinimos(data) {
    if (!data) {
      throw new Error('No se proporcionaron datos para generar el PDF');
    }

    if (!data.venta) {
      throw new Error('Datos de venta son requeridos');
    }

    if (!data.cliente) {
      throw new Error('Datos del cliente son requeridos');
    }

    if (!data.vacunas || !Array.isArray(data.vacunas) || data.vacunas.length === 0) {
      throw new Error('Se requiere al menos una vacuna para generar el remito');
    }
  }

  /**
   * Lee el template HTML desde el archivo
   * @returns {Promise<string>} Contenido del template
   */
  async leerTemplate() {
    try {
      const template = await fs.readFile(this.templatePath, 'utf8');
      return template;
    } catch (error) {
      console.error('Error leyendo template:', error);
      throw new Error(`Error al leer template de venta directa: ${error.message}`);
    }
  }

  /**
   * Procesa el template reemplazando todos los placeholders con datos reales
   * @param {string} template - Template HTML
   * @param {Object} data - Datos para reemplazar
   * @returns {string} HTML procesado
   */
  procesarTemplate(template, data) {
    try {
      // Preparar datos con valores por defecto
      const datosCompletos = this.prepararDatos(data);

      // Reemplazar placeholders simples
      let html = this.reemplazarPlaceholdersSimples(template, datosCompletos);

      // Procesar tabla de vacunas
      html = this.procesarTablaVacunas(html, datosCompletos.vacunas);

      // Procesar condicionales
      html = this.procesarCondicionales(html, datosCompletos);

      return html;

    } catch (error) {
      console.error('Error procesando template:', error);
      throw new Error(`Error al procesar template: ${error.message}`);
    }
  }

  /**
   * Prepara y completa los datos con valores por defecto
   * @param {Object} data - Datos originales
   * @returns {Object} Datos completos con defaults
   */
  prepararDatos(data) {
    const fechaActual = new Date();
    const formatoFecha = fechaActual.toLocaleDateString('es-AR');
    const formatoHora = fechaActual.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return {
      // Información del remito
      numeroRemito: data.numeroRemito || `VD-${Date.now()}`,
      fechaEmision: data.fechaEmision || formatoFecha,
      horaEmision: data.horaEmision || formatoHora,
      fechaGeneracion: formatoFecha,
      horaGeneracion: formatoHora,

      // Datos del cliente
      cliente: {
        nombre: data.cliente?.nombre || 'Cliente no especificado',
        cuit: data.cliente?.cuit || 'No informado',
        email: data.cliente?.email || 'No informado',
        telefono: data.cliente?.telefono || 'No informado',
        direccion: data.cliente?.direccion || 'No informada',
        localidad: data.cliente?.localidad || 'No informada'
      },

      // Datos de la venta
      venta: {
        numeroVenta: data.venta?.numeroVenta || 'Sin número',
        fechaVenta: data.venta?.fechaVenta ? 
          new Date(data.venta.fechaVenta).toLocaleDateString('es-AR') : 
          formatoFecha,
        estado: data.venta?.estado || 'Pendiente',
        observaciones: data.venta?.observaciones || null,
        listaPrecio: (data.venta && typeof data.venta.listaPrecio === 'string') ? data.venta.listaPrecio : ''
      },

      // Datos de entrega
      entrega: {
        responsableEntrega: data.venta?.responsableEntrega || data.entrega?.responsableEntrega || 'Por definir',
        responsableRecibe: data.venta?.responsableRecibe || data.entrega?.responsableRecibe || 'Por definir'
      },

      // Vacunas procesadas
      vacunas: this.procesarVacunas(data.vacunas || []),

      // Totales calculados
      totales: this.calcularTotales(data.vacunas || [], data.totales)
    };
  }

  /**
   * Procesa los datos de las vacunas
   * @param {Array} vacunas - Array de vacunas
   * @returns {Array} Vacunas procesadas
   */
  procesarVacunas(vacunas) {
    return vacunas.map(vacuna => ({
      nombre: vacuna.nombre || 'Vacuna sin nombre',
      descripcion: vacuna.descripcion || 'Sin descripción',
      codigo: vacuna.codigo || 'Sin código',
      proveedor: vacuna.proveedor || 'No especificado',
      lote: vacuna.lote || 'Sin lote',
      fechaVencimiento: vacuna.fechaVencimiento ? 
        new Date(vacuna.fechaVencimiento).toLocaleDateString('es-AR') : 
        'No especificada',
      cantidad: vacuna.cantidad || 0,
      precioUnitario: this.formatearPrecio(vacuna.precioUnitario || 0),
      subtotal: this.formatearPrecio((vacuna.cantidad || 0) * (vacuna.precioUnitario || 0))
    }));
  }

  /**
   * Calcula los totales de la venta
   * @param {Array} vacunas - Array de vacunas
   * @param {Object} totalesExistentes - Totales ya calculados
   * @returns {Object} Totales completos
   */
  calcularTotales(vacunas, totalesExistentes = {}) {
    const subtotal = vacunas.reduce((suma, vacuna) => {
      return suma + ((vacuna.cantidad || 0) * (vacuna.precioUnitario || 0));
    }, 0);

    const cantidadItems = vacunas.length;
    const dosisTotal = vacunas.reduce((suma, vacuna) => suma + (vacuna.cantidad || 0), 0);
    
    // Sin IVA - total es igual al subtotal  
    const total = subtotal;

    return {
      cantidadItems,
      dosisTotal,
      subtotal: this.formatearPrecio(subtotal),
      total: this.formatearPrecio(total),
      mostrarIva: false
    };
  }

  /**
   * Formatea un precio para mostrar
   * @param {number} precio - Precio a formatear
   * @returns {string} Precio formateado
   */
  formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(precio || 0);
  }

  /**
   * Reemplaza placeholders simples en el HTML
   * @param {string} html - HTML original
   * @param {Object} datos - Datos para reemplazar
   * @returns {string} HTML con placeholders reemplazados
   */
  reemplazarPlaceholdersSimples(html, datos) {
    const reemplazos = this.construirMapaReemplazos(datos);
    
    let htmlProcesado = html;
    
    Object.entries(reemplazos).forEach(([placeholder, valor]) => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      htmlProcesado = htmlProcesado.replace(regex, valor || '');
    });

    return htmlProcesado;
  }

  /**
   * Construye el mapa de reemplazos para placeholders
   * @param {Object} datos - Datos completos
   * @returns {Object} Mapa de reemplazos
   */
  construirMapaReemplazos(datos) {
    return {
      // Información del remito
      'numeroRemito': datos.numeroRemito,
      'fechaEmision': datos.fechaEmision,
      'horaEmision': datos.horaEmision,
      'fechaGeneracion': datos.fechaGeneracion,
      'horaGeneracion': datos.horaGeneracion,

      // Cliente
      'cliente.nombre': datos.cliente.nombre,
      'cliente.cuit': datos.cliente.cuit,
      'cliente.email': datos.cliente.email,
      'cliente.telefono': datos.cliente.telefono,
      'cliente.direccion': datos.cliente.direccion,
      'cliente.localidad': datos.cliente.localidad,

      // Venta
      'venta.numeroVenta': datos.venta.numeroVenta,
      'venta.fechaVenta': datos.venta.fechaVenta,
      'venta.estado': datos.venta.estado,
      'venta.observaciones': datos.venta.observaciones,
      'venta.listaPrecio': datos.venta.listaPrecio,

      // Entrega
      'entrega.responsableEntrega': datos.entrega.responsableEntrega,
      'entrega.responsableRecibe': datos.entrega.responsableRecibe,

      // Totales
      'totales.cantidadItems': datos.totales.cantidadItems,
      'totales.dosisTotal': datos.totales.dosisTotal,
      'totales.subtotal': datos.totales.subtotal,
      'totales.porcentajeIva': datos.totales.porcentajeIva,

      // Controles condicionales
      'LISTA_PRECIO_DISPLAY': datos.venta.listaPrecio && datos.venta.listaPrecio.trim() ? '' : 'display: none;',
      'OBSERVACIONES_DISPLAY': datos.venta.observaciones && datos.venta.observaciones.trim() ? '' : 'display: none;',
      'totales.iva': datos.totales.iva,
      'totales.total': datos.totales.total
    };
  }

  /**
   * Procesa la tabla de vacunas reemplazando el loop {{#each vacunas}}
   * @param {string} html - HTML original
   * @param {Array} vacunas - Array de vacunas
   * @returns {string} HTML con tabla procesada
   */
  procesarTablaVacunas(html, vacunas) {
    const inicioLoop = html.indexOf('{{#each vacunas}}');
    const finLoop = html.indexOf('{{/each}}');

    if (inicioLoop === -1 || finLoop === -1) {
      console.warn('No se encontró el loop de vacunas en el template');
      return html;
    }

    // Extraer el template del row
    const templateRow = html.substring(inicioLoop + 17, finLoop); // 17 = length of '{{#each vacunas}}'
    
    // Generar HTML para cada vacuna
    let filasHtml = '';
    vacunas.forEach(vacuna => {
      let filaHtml = templateRow;
      
      // Reemplazar placeholders de la vacuna
      Object.entries(vacuna).forEach(([key, value]) => {
        const regex = new RegExp(`{{this\\.${key}}}`, 'g');
        filaHtml = filaHtml.replace(regex, value || '');
      });
      
      filasHtml += filaHtml;
    });

    // Reemplazar todo el loop con las filas generadas
    return html.substring(0, inicioLoop) + filasHtml + html.substring(finLoop + 9); // 9 = length of '{{/each}}'
  }

  /**
   * Procesa condicionales como {{#if venta.observaciones}}
   * @param {string} html - HTML original
   * @param {Object} datos - Datos completos
   * @returns {string} HTML con condicionales procesados
   */
  procesarCondicionales(html, datos) {
    // Procesar {{#if venta.observaciones}}
    const regex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    
    return html.replace(regex, (match, condicion, contenido) => {
      const valor = this.evaluarCondicion(condicion, datos);
      return valor ? contenido : '';
    });
  }

  /**
   * Evalúa una condición para los condicionales
   * @param {string} condicion - Condición a evaluar
   * @param {Object} datos - Datos para evaluar
   * @returns {boolean} Resultado de la evaluación
   */
  evaluarCondicion(condicion, datos) {
    const path = condicion.trim();
    const keys = path.split('.');
    
    let valor = datos;
    for (const key of keys) {
      valor = valor?.[key];
      if (valor === undefined || valor === null) {
        return false;
      }
    }
    
    // Considerar strings vacíos como falsy
    if (typeof valor === 'string' && valor.trim() === '') {
      return false;
    }
    
    return Boolean(valor);
  }
}

module.exports = VentaDirectaPdfService;