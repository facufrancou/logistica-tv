const htmlPdf = require('html-pdf-node');
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
}

module.exports = new PDFService();