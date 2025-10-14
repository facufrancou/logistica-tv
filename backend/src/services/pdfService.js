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

    // Función auxiliar para reemplazar placeholders simples con validación
    const replace = (placeholder, value) => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      // Asegurar que value sea una string válida
      let safeValue = '';
      if (value !== null && value !== undefined) {
        safeValue = typeof value === 'string' ? value : String(value);
      }
      processedTemplate = processedTemplate.replace(regex, safeValue);
    };

    // Función auxiliar para manejar condicionales {{#if}}
    const replaceConditional = (condition, content) => {
      const regex = new RegExp(`{{#if ${condition}}}([\\s\\S]*?){{/if}}`, 'g');
      
      if (content) {
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

    // Datos del cliente con valores por defecto
    replace('cliente.nombre', data.cliente?.nombre || 'Sin nombre');
    replace('cliente.email', data.cliente?.email || '');
    replace('cliente.telefono', data.cliente?.telefono || '');
    replace('cliente.direccion', data.cliente?.direccion || '');
    replace('cliente.localidad', data.cliente?.localidad || '');
    replace('cliente.cuit', data.cliente?.cuit || '');

    // Datos del plan con valores por defecto
    replace('plan.numeroCotizacion', data.plan?.numeroCotizacion || 'SIN-NUMERO');
    replace('plan.numeroSemana', data.plan?.numeroSemana || 'N/A');
    replace('plan.fechaProgramada', this.formatDate(data.plan?.fechaProgramada) || '');
    replace('plan.cantidadAnimales', data.plan?.cantidadAnimales || '0');
    replace('plan.estado', data.plan?.estado || 'pendiente');
    replace('plan.estadoBadge', this.getEstadoBadge(data.plan?.estado || 'pendiente'));
    replace('plan.fechaInicio', this.formatDate(data.plan?.fechaInicio) || '');

    // Datos del producto/vacuna con valores por defecto
    replace('producto.nombre', data.producto?.nombre || 'Producto sin nombre');
    replace('producto.descripcion', data.producto?.descripcion || 'Sin descripción');
    replace('producto.codigo', data.producto?.codigo || 'SIN-CODIGO');
    replace('producto.lote', data.producto?.lote || 'N/A');
    replace('producto.cantidadProgramada', data.producto?.cantidad_programada || data.producto?.cantidadProgramada || '0');
    replace('producto.proveedor', data.producto?.proveedor || 'Sin proveedor');

    // Datos de la entrega con valores por defecto
    replace('entrega.cantidadEntregada', data.entrega?.cantidadEntregada || '0');
    replace('entrega.tipoEntrega', data.entrega?.tipoEntrega || data.entrega?.tipo || 'completa');
    replace('entrega.fechaEntrega', this.formatDate(data.entrega?.fechaEntrega || data.entrega?.fecha) || '');
    replace('entrega.responsable', data.entrega?.responsable || data.entrega?.responsable_entrega || 'Sistema');
    replace('entrega.responsableRecibe', data.entrega?.responsableRecibe || data.entrega?.responsable_recibe || 'Sin especificar');
    replace('entrega.observaciones_entrega', data.entrega?.observaciones_entrega || data.entrega?.observaciones || '');
    replace('entrega.estado', data.entrega?.estado || 'entregada');
    replace('entrega.estadoBadge', this.getEstadoBadge(data.entrega?.estado || 'entregada'));
    replace('entrega.dosisRestantes', data.entrega?.dosisRestantes || '0');
    
    // Lógica para mostrar tipo de entrega en el PDF
    const tipoEntrega = data.entrega?.tipoEntrega || data.entrega?.tipo || 'completa';
    const dosisRestantes = data.entrega?.dosisRestantes || 0;
    const tipoEntregaDisplay = tipoEntrega === 'completa' 
      ? 'COMPLETA' 
      : `RESTANTES: ${dosisRestantes} dosis`;
    
    replace('entrega.tipoEntregaDisplay', tipoEntregaDisplay);

    // Manejar condicionales con valores por defecto
    const responsableEntrega = data.entrega?.responsable || data.entrega?.responsable_entrega || '';
    const observacionesEntrega = data.entrega?.observaciones_entrega || data.entrega?.observaciones || '';
    
    replaceConditional('entrega.responsable', responsableEntrega);
    replaceConditional('entrega.observaciones_entrega', observacionesEntrega);
    
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