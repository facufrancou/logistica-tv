const htmlPdf = require('html-pdf-node');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates');
  }

  async generateRemitoPDF(data) {
    try {
      // Leer el template HTML
      const templatePath = path.join(this.templatePath, 'remito-entrega.html');
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Reemplazar placeholders con datos reales
      htmlTemplate = this.replacePlaceholders(htmlTemplate, data);

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

      const file = { content: htmlTemplate };
      
      // Generar PDF
      const pdfBuffer = await htmlPdf.generatePdf(file, options);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generando PDF de remito:', error);
      throw new Error('Error al generar el remito PDF: ' + error.message);
    }
  }

  replacePlaceholders(template, data) {
    let processedTemplate = template;

    // Función auxiliar para reemplazar placeholders simples
    const replace = (placeholder, value) => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value || '');
    };

    // Función auxiliar para manejar condicionales {{#if}}
    const replaceConditional = (condition, content) => {
      const regex = new RegExp(`{{#if ${condition}}}([\\s\\S]*?){{/if}}`, 'g');
      if (data[condition]) {
        processedTemplate = processedTemplate.replace(regex, '$1');
      } else {
        processedTemplate = processedTemplate.replace(regex, '');
      }
    };

    // Datos básicos del documento
    replace('numeroRemito', this.generateRemitoNumber());
    replace('fechaEmision', this.formatDate(new Date()));
    replace('horaEmision', this.formatTime(new Date()));
    replace('fechaGeneracion', this.formatDate(new Date()));
    replace('horaGeneracion', this.formatTime(new Date()));

    // Datos del cliente
    replace('cliente.nombre', data.cliente?.nombre);
    replace('cliente.email', data.cliente?.email);
    replace('cliente.telefono', data.cliente?.telefono);
    replace('cliente.direccion', data.cliente?.direccion);
    replace('cliente.localidad', data.cliente?.localidad);
    replace('cliente.cuit', data.cliente?.cuit);

    // Datos del plan
    replace('plan.numeroCotizacion', data.plan?.numeroCotizacion);
    replace('plan.numeroSemana', data.plan?.numeroSemana);
    replace('plan.fechaProgramada', this.formatDate(data.plan?.fechaProgramada));
    replace('plan.cantidadAnimales', data.plan?.cantidadAnimales);
    replace('plan.estado', data.plan?.estado);
    replace('plan.estadoBadge', this.getEstadoBadge(data.plan?.estado));
    replace('plan.fechaInicio', this.formatDate(data.plan?.fechaInicio));

    // Datos del producto
    replace('producto.nombre', data.producto?.nombre);
    replace('producto.descripcion', data.producto?.descripcion);
    replace('producto.cantidadProgramada', data.producto?.cantidadProgramada);

    // Datos de la entrega
    replace('entrega.cantidadEntregada', data.entrega?.cantidadEntregada);
    replace('entrega.tipoEntrega', data.entrega?.tipoEntrega);
    replace('entrega.fechaEntrega', this.formatDate(data.entrega?.fechaEntrega));
    replace('entrega.responsable', data.entrega?.responsable);
    replace('entrega.responsableRecibe', data.entrega?.responsableRecibe);
    replace('entrega.observaciones', data.entrega?.observaciones);
    replace('entrega.estado', data.entrega?.estado);
    replace('entrega.estadoBadge', this.getEstadoBadge(data.entrega?.estado));
    replace('entrega.dosisRestantes', data.entrega?.dosisRestantes);
    
    // Lógica para mostrar tipo de entrega en el PDF
    const tipoEntregaDisplay = data.entrega?.tipoEntrega === 'completa' 
      ? 'COMPLETA' 
      : `RESTANTES: ${data.entrega?.dosisRestantes || 0} dosis`;
    
    replace('entrega.tipoEntregaDisplay', tipoEntregaDisplay);

    // Manejar condicionales
    replaceConditional('entrega.responsable', data.entrega?.responsable);
    replaceConditional('entrega.observaciones', data.entrega?.observaciones);

    return processedTemplate;
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
}

module.exports = new PDFService();