const htmlPdf = require('html-pdf-node');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');

class PDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates');
    this.registerHandlebarsHelpers();
  }

  registerHandlebarsHelpers() {
    // Helper para formatear fechas
    Handlebars.registerHelper('formatDate', (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    });

    // Helper para formatear tiempo
    Handlebars.registerHelper('formatTime', (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Helper para badges de estado
    Handlebars.registerHelper('estadoBadge', (estado) => {
      switch (estado?.toLowerCase()) {
        case 'entregada':
        case 'completada':
        case 'confirmada':
          return 'success';
        case 'parcial':
        case 'pendiente':
          return 'warning';
        case 'en_proceso':
        case 'programada':
          return 'info';
        default:
          return 'secondary';
      }
    });
  }

  async generateRemitoPDF(data) {
    try {
      // Leer el template HTML
      const templatePath = path.join(this.templatePath, 'remito-entrega.html');
      const htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Compilar template con Handlebars
      console.log('Compilando el template con handlebars');
      const template = Handlebars.compile(htmlTemplate);

      // Preparar datos con valores adicionales
      const templateData = {
        ...data,
        numeroRemito: this.generateRemitoNumber(),
        fechaEmision: new Date(),
        horaEmision: new Date(),
        fechaGeneracion: new Date(),
        horaGeneracion: new Date()
      };

      // Renderizar template
      const htmlContent = template(templateData);

      // Configuración del PDF
      const options = {
        format: 'A4',
        width: '210mm',
        height: '297mm',
        border: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        paginationOffset: 1,
        type: 'pdf',
        quality: '75',
        httpHeaders: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      };

      const file = { content: htmlContent };
      
      // Generar PDF
      const pdfBuffer = await htmlPdf.generatePdf(file, options);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generando PDF de remito:', error);
      throw new Error('Error al generar el remito PDF: ' + error.message);
    }
  }



  generateRemitoNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().substr(-6);
    
    return `REM-${year}${month}${day}-${time}`;
  }

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoBadge(estado) {
    switch (estado?.toLowerCase()) {
      case 'entregada':
      case 'completada':
      case 'confirmada':
        return 'success';
      case 'parcial':
      case 'pendiente':
        return 'warning';
      case 'en_proceso':
      case 'programada':
        return 'info';
      default:
        return 'secondary';
    }
  }

  /**
   * Genera PDF de Orden de Compra Completa (uso interno)
   * Incluye todos los proveedores, datos del cliente, etc.
   */
  async generateOrdenCompraCompletaPDF(data) {
    let browser = null;
    try {
      const templatePath = path.join(this.templatePath, 'orden-compra.html');
      const htmlTemplate = await fs.readFile(templatePath, 'utf8');
      const template = Handlebars.compile(htmlTemplate);

      // Formatear datos de proveedores
      const proveedoresFormateados = data.proveedores.map(prov => ({
        nombre: prov.proveedor?.nombre || 'Sin nombre',
        subtotal_formatted: this.formatCurrency(prov.subtotal),
        items: prov.items.map(item => ({
          vacuna_codigo: item.vacuna?.codigo || '',
          vacuna_nombre: item.vacuna?.nombre || 'Sin nombre',
          presentacion: item.vacuna?.presentacion?.nombre || '-',
          cantidad_solicitada: (item.cantidad_solicitada || 0).toLocaleString('es-AR') + ' dosis',
          precio_formatted: this.formatCurrency(item.precio_estimado || 0),
          subtotal_formatted: this.formatCurrency((item.precio_estimado || 0) * item.cantidad_solicitada)
        }))
      }));

      // Calcular totales
      const totalDosis = data.proveedores.reduce((sum, p) => 
        sum + p.items.reduce((s, i) => s + (i.cantidad_solicitada || 0), 0), 0);
      const totalItems = data.proveedores.reduce((sum, p) => sum + p.items.length, 0);

      const templateData = {
        numero_orden: data.orden.numero_orden,
        estado: data.orden.estado,
        estado_texto: this.getEstadoTexto(data.orden.estado),
        fecha_creacion: this.formatDate(data.orden.fecha_creacion),
        fecha_esperada: data.orden.fecha_esperada ? this.formatDate(data.orden.fecha_esperada) : 'No especificada',
        numero_cotizacion: data.cotizacion?.numero_cotizacion || 'Sin cotización',
        cliente_nombre: data.cotizacion?.cliente?.nombre || null,
        total_proveedores: data.proveedores.length,
        total_items: totalItems,
        total_dosis: totalDosis.toLocaleString('es-AR'),
        total_general_formatted: this.formatCurrency(data.total_general),
        observaciones: data.orden.observaciones,
        proveedores: proveedoresFormateados,
        fecha_generacion: this.formatDateTime(new Date()),
        logo_url: ''
      };

      const htmlContent = template(templateData);

      // Usar Puppeteer para mejor soporte de CSS
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        preferCSSPageSize: false
      });
      
      await browser.close();
      browser = null;
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generando PDF de orden completa:', error);
      throw new Error('Error al generar PDF de orden de compra: ' + error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Genera PDF de Orden de Compra por Proveedor (para enviar al laboratorio)
   */
  async generateOrdenCompraProveedorPDF(data) {
    let browser = null;
    try {
      const templatePath = path.join(this.templatePath, 'orden-compra-proveedor.html');
      const htmlTemplate = await fs.readFile(templatePath, 'utf8');
      const template = Handlebars.compile(htmlTemplate);

      // Formatear items
      const itemsFormateados = data.items.map(item => ({
        vacuna_codigo: item.vacuna?.codigo || '',
        vacuna_nombre: item.vacuna?.nombre || 'Sin nombre',
        patologia: item.vacuna?.patologia?.nombre || '',
        presentacion: item.vacuna?.presentacion?.nombre || '-',
        cantidad_solicitada: (item.cantidad_solicitada || 0).toLocaleString('es-AR'),
        precio_formatted: this.formatCurrency(item.precio_estimado || 0),
        subtotal_formatted: this.formatCurrency((item.precio_estimado || 0) * item.cantidad_solicitada)
      }));

      // Calcular totales
      const totalDosis = data.items.reduce((sum, i) => sum + (i.cantidad_solicitada || 0), 0);
      const totalFrascos = data.items.reduce((sum, i) => {
        const dosisPorFrasco = i.vacuna?.presentacion?.dosis_por_frasco || 1;
        return sum + Math.ceil((i.cantidad_solicitada || 0) / dosisPorFrasco);
      }, 0);

      const templateData = {
        numero_orden: data.orden.numero_orden,
        proveedor_nombre: data.proveedor?.nombre || 'Sin nombre',
        fecha_creacion: this.formatDate(data.orden.fecha_creacion),
        fecha_esperada: data.orden.fecha_esperada ? this.formatDate(data.orden.fecha_esperada) : 'No especificada',
        numero_cotizacion: data.cotizacion?.numero_cotizacion || 'N/A',
        items: itemsFormateados,
        total_items: data.items.length,
        total_dosis: totalDosis.toLocaleString('es-AR'),
        total_frascos: totalFrascos.toLocaleString('es-AR'),
        total_formatted: this.formatCurrency(data.subtotal),
        observaciones: data.orden.observaciones,
        fecha_generacion: this.formatDateTime(new Date()),
        logo_url: ''
      };

      const htmlContent = template(templateData);

      // Usar Puppeteer para mejor soporte de CSS
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        preferCSSPageSize: false
      });
      
      await browser.close();
      browser = null;
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generando PDF de orden por proveedor:', error);
      throw new Error('Error al generar PDF de orden de compra: ' + error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  formatCurrency(value) {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoTexto(estado) {
    const estados = {
      'borrador': 'Borrador',
      'pendiente': 'Pendiente',
      'confirmada': 'Confirmada',
      'parcial': 'Parcial',
      'ingresada': 'Ingresada',
      'cancelada': 'Cancelada'
    };
    return estados[estado] || estado;
  }
}

module.exports = new PDFService();