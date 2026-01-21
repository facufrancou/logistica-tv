import React, { useState, useEffect } from 'react';
import { getOrdenCompraById } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OrdenCompraDetalle = ({ ordenId, onClose, onRegistrarIngreso }) => {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  // Función auxiliar para cargar el logo de la empresa
  const cargarLogo = () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        ctx.drawImage(this, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: this.naturalWidth,
          height: this.naturalHeight,
          ratio: this.naturalWidth / this.naturalHeight
        });
      };
      img.onerror = () => {
        console.warn('No se pudo cargar logo.png, intentando Logo blanco.png');
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = function() {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = this.naturalWidth;
          canvas.height = this.naturalHeight;
          ctx.drawImage(this, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width: this.naturalWidth,
            height: this.naturalHeight,
            ratio: this.naturalWidth / this.naturalHeight
          });
        };
        fallbackImg.onerror = () => {
          console.warn('No se pudo cargar ningún logo');
          resolve(null);
        };
        fallbackImg.src = '/img/Logo blanco.png';
      };
      img.src = '/img/logo.png';
    });
  };

  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'numeric', 
      year: 'numeric'
    });
  };

  useEffect(() => {
    cargarOrden();
  }, [ordenId]);

  const cargarOrden = async () => {
    setLoading(true);
    try {
      const response = await getOrdenCompraById(ordenId);
      if (response.success) {
        setOrden(response.data);
      }
    } catch (error) {
      console.error('Error al cargar orden:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMoney = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  const getEstadoTexto = (estado) => {
    const estados = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      parcial: 'Ingreso Parcial',
      ingresada: 'Ingresada',
      cancelada: 'Cancelada'
    };
    return estados[estado] || estado;
  };

  const getEstadoItemTexto = (estado) => {
    const estados = {
      pendiente: 'Pendiente',
      parcial: 'Parcial',
      completo: 'Completo',
      cancelado: 'Cancelado'
    };
    return estados[estado] || estado;
  };

  // Descargar PDF completo (uso interno) - Igual al calendario
  const handleExportarPDFCompleto = async () => {
    if (!orden) return;
    
    setDescargandoPDF(true);
    try {
      // Agrupar items por proveedor
      const proveedoresMap = {};
      orden.detalle_orden.forEach(item => {
        const provId = item.proveedor?.id_proveedor || 'sin_proveedor';
        const provNombre = item.proveedor?.nombre || 'Sin proveedor';
        const dosisPorFrasco = item.dosis_por_frasco || item.vacuna?.presentacion?.dosis_por_frasco || 1;
        
        if (!proveedoresMap[provId]) {
          proveedoresMap[provId] = {
            nombre_proveedor: provNombre,
            vacunas: [],
            total_frascos_proveedor: 0,
            total_dosis_proveedor: 0
          };
        }
        
        const frascos = Math.ceil(item.cantidad_solicitada / dosisPorFrasco);
        
        proveedoresMap[provId].vacunas.push({
          nombre: item.vacuna?.nombre || 'N/A',
          patologia: item.vacuna?.patologia?.nombre || 'N/A',
          presentacion: item.vacuna?.presentacion?.nombre || `${dosisPorFrasco} dosis`,
          cantidad_solicitada: item.cantidad_solicitada,
          frascos: frascos
        });
        
        proveedoresMap[provId].total_frascos_proveedor += frascos;
        proveedoresMap[provId].total_dosis_proveedor += item.cantidad_solicitada;
      });
      
      const proveedores = Object.values(proveedoresMap);
      const totalFrascos = proveedores.reduce((sum, p) => sum + p.total_frascos_proveedor, 0);
      const totalDosis = proveedores.reduce((sum, p) => sum + p.total_dosis_proveedor, 0);

      // Crear PDF con jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colores y medidas - Bordó corporativo
      const primaryColor = [125, 12, 10];
      const secondaryColor = [96, 96, 96];
      const accentColor = [158, 15, 13];
      const lightGray = [245, 245, 245];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      let yPos = margin;

      // ============ CABECERA ============
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Título principal
      doc.setFont('courier', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('ORDEN DE COMPRA', pageWidth / 2, 15, { align: 'center' });

      // Subtítulo
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.text('Vacunas sin lote asignado', pageWidth / 2, 22, { align: 'center' });

      // Número de orden y fecha
      doc.setFontSize(9);
      doc.text(`Orden N°: ${orden.numero_orden}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Fecha: ${formatearFecha(orden.fecha_creacion)}`, pageWidth / 2, 33, { align: 'center' });

      yPos = 45;

      // ============ INFORMACIÓN DEL CLIENTE Y PLAN ============
      const infoBoxHeight = 22;
      const infoBoxWidth = (pageWidth - 2 * margin - 3) / 2;

      // Recuadro izquierdo - Cliente
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, infoBoxWidth, infoBoxHeight, 'F');
      doc.rect(margin, yPos, infoBoxWidth, infoBoxHeight, 'S');

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL CLIENTE', margin + 2, yPos + 4);

      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      
      const clienteNombre = orden.cotizacion?.cliente?.nombre || 'N/A';
      const clienteCuit = orden.cotizacion?.cliente?.cuit || 'N/A';
      const clienteEmail = orden.cotizacion?.cliente?.email || 'N/A';
      const clienteTelefono = orden.cotizacion?.cliente?.telefono || 'N/A';
      
      doc.text(`Cliente: ${clienteNombre}`, margin + 2, yPos + 8);
      doc.text(`CUIT: ${clienteCuit}`, margin + 2, yPos + 11);
      doc.text(`Email: ${clienteEmail}`, margin + 2, yPos + 14);
      doc.text(`Teléfono: ${clienteTelefono}`, margin + 2, yPos + 17);

      // Recuadro derecho - Plan
      doc.setFillColor(...lightGray);
      doc.rect(margin + infoBoxWidth + 3, yPos, infoBoxWidth - 3, infoBoxHeight, 'F');
      doc.rect(margin + infoBoxWidth + 3, yPos, infoBoxWidth - 3, infoBoxHeight, 'S');

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL PLAN', margin + infoBoxWidth + 5, yPos + 4);

      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      
      const planNombre = orden.cotizacion?.plan_vacunal?.nombre || 'N/A';
      const numeroCotizacion = orden.cotizacion?.numero_cotizacion || 'N/A';
      const cantidadAnimales = orden.cotizacion?.cantidad_animales || 0;
      const duracionSemanas = orden.cotizacion?.duracion_semanas || 0;
      
      doc.text(`Plan: ${planNombre}`, margin + infoBoxWidth + 5, yPos + 8);
      doc.text(`Cotización: ${numeroCotizacion}`, margin + infoBoxWidth + 5, yPos + 11);
      doc.text(`Animales: ${cantidadAnimales.toLocaleString()}`, margin + infoBoxWidth + 5, yPos + 14);
      doc.text(`Duración: ${duracionSemanas} semanas`, margin + infoBoxWidth + 5, yPos + 17);

      yPos += infoBoxHeight + 8;

      // ============ RESUMEN ============
      doc.setFillColor(...accentColor);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`RESUMEN: ${proveedores.length} Proveedor(es) | ${totalDosis.toLocaleString()} Dosis | ${totalFrascos} Frascos`, margin + 2, yPos + 6);

      yPos += 14;

      // ============ DETALLES POR PROVEEDOR ============
      for (let i = 0; i < proveedores.length; i++) {
        const proveedor = proveedores[i];

        // Verificar si necesitamos nueva página
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        }

        // Cabecera del proveedor
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');

        doc.setFont('courier', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`PROVEEDOR: ${proveedor.nombre_proveedor.toUpperCase()}`, margin + 2, yPos + 8);

        yPos += 16;

        // Tabla de vacunas (sin columnas de SEMANAS y STOCK que no aplican para órdenes guardadas)
        const tableHeaders = ['VACUNA', 'PATOLOGÍA', 'PRESENTACIÓN', 'DOSIS SOLICITADAS', 'FRASCOS'];
        const tableData = proveedor.vacunas.map(vacuna => [
          vacuna.nombre.substring(0, 35),
          vacuna.patologia,
          vacuna.presentacion,
          vacuna.cantidad_solicitada.toLocaleString(),
          vacuna.frascos.toString()
        ]);

        autoTable(doc, {
          head: [tableHeaders],
          body: tableData,
          startY: yPos,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            halign: 'center',
            valign: 'middle',
            lineColor: primaryColor,
            lineWidth: 0.2,
            font: 'courier'
          },
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            font: 'courier'
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          },
          columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25, fontStyle: 'bold', textColor: primaryColor }
          }
        });

        yPos = doc.lastAutoTable.finalY + 4;

        // Total del proveedor
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'S');

        doc.setFont('courier', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text(`TOTAL FRASCOS ${proveedor.nombre_proveedor}: ${proveedor.total_frascos_proveedor}`, pageWidth - margin - 2, yPos + 5, { align: 'right' });

        yPos += 14;
      }

      // ============ PIE DE PÁGINA ============
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');

      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.setFont('courier', 'bold');
      doc.text('Sistema de Gestión - Tierra Volga', margin, pageHeight - 12);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, margin, pageHeight - 8);
      doc.text('Documento de uso interno - Orden de compra', margin, pageHeight - 4);

      // Descargar PDF
      const fileName = `orden-compra-${orden.numero_orden}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF: ' + error.message);
    } finally {
      setDescargandoPDF(false);
    }
  };

  // Descargar PDF por proveedor (para enviar al laboratorio) - Igual al calendario
  const handleExportarPDFProveedor = async (idProveedor) => {
    if (!orden) return;
    
    setDescargandoPDF(true);
    try {
      // Obtener datos del proveedor
      const proveedorData = orden.por_proveedor?.find(p => p.id_proveedor === idProveedor);
      if (!proveedorData) {
        throw new Error('Proveedor no encontrado');
      }

      // Cargar logo de la empresa
      const logoData = await cargarLogo();

      // Crear PDF con jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colores y medidas - Bordó corporativo
      const primaryColor = [125, 12, 10];
      const secondaryColor = [96, 96, 96];
      const lightGray = [245, 245, 245];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      let yPos = margin;

      // ============ CABECERA ============
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Logo de la empresa
      if (logoData) {
        try {
          const maxLogoHeight = 15;
          const maxLogoWidth = 60;
          
          let logoWidth, logoHeight;
          
          if (logoData.ratio > (maxLogoWidth / maxLogoHeight)) {
            logoWidth = maxLogoWidth;
            logoHeight = maxLogoWidth / logoData.ratio;
          } else {
            logoHeight = maxLogoHeight;
            logoWidth = maxLogoHeight * logoData.ratio;
          }
          
          const logoY = 8 + (24 - logoHeight) / 2;
          doc.addImage(logoData.dataUrl, 'PNG', margin, logoY, logoWidth, logoHeight, undefined, 'FAST');
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error);
        }
      }

      // Título principal
      doc.setFont('courier', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('ORDEN DE COMPRA', pageWidth / 2, 15, { align: 'center' });

      // Subtítulo con nombre del proveedor
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.text(proveedorData.nombre.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

      // Número de orden y fecha
      doc.setFontSize(9);
      doc.text(`Orden N°: ${orden.numero_orden}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Fecha: ${formatearFecha(new Date().toISOString().split('T')[0])}`, pageWidth / 2, 33, { align: 'center' });

      yPos = 45;

      // ============ INFORMACIÓN DE TIERRA VOLGA ============
      const infoBoxHeight = 20;

      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, infoBoxHeight, 'F');
      doc.rect(margin, yPos, pageWidth - 2 * margin, infoBoxHeight, 'S');

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('TIERRA VOLGA', margin + 2, yPos + 4);

      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('Razón Social: TIERRA VOLGA S.A.S.', margin + 2, yPos + 8);
      doc.text('CUIT: 30-71676009-6', margin + 2, yPos + 11);
      doc.text('Dirección: RN12 KM 406, Crespo, Entre Ríos', margin + 2, yPos + 14);
      doc.text('Email: contacto@tierravolga.com.ar', margin + 2, yPos + 17);

      yPos += infoBoxHeight + 8;

      // ============ DETALLE DE PRODUCTOS SOLICITADOS ============
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('DETALLE DE PRODUCTOS SOLICITADOS', margin + 2, yPos + 6);

      yPos += 14;

      // Tabla de vacunas del proveedor
      const tableHeaders = ['PRODUCTO', 'PATOLOGÍA', 'PRESENTACIÓN', 'DOSIS REQ.', 'FRASCOS'];
      const tableData = proveedorData.items.map(item => {
        const dosisPorFrasco = item.dosis_por_frasco || item.vacuna?.presentacion?.dosis_por_frasco || 1;
        return [
          item.vacuna?.nombre || 'N/A',
          item.vacuna?.patologia?.nombre || 'N/A',
          item.vacuna?.presentacion?.nombre || `${dosisPorFrasco} dosis`,
          item.cantidad_solicitada.toLocaleString(),
          Math.ceil(item.cantidad_solicitada / dosisPorFrasco).toString()
        ];
      });

      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: 'center',
          valign: 'middle',
          lineColor: primaryColor,
          lineWidth: 0.2,
          font: 'courier'
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          font: 'courier'
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25, fontStyle: 'bold', textColor: primaryColor }
        }
      });

      yPos = doc.lastAutoTable.finalY + 6;

      // Total de frascos
      const totalFrascos = proveedorData.items.reduce((sum, item) => {
        const dosisPorFrasco = item.dosis_por_frasco || item.vacuna?.presentacion?.dosis_por_frasco || 1;
        return sum + Math.ceil(item.cantidad_solicitada / dosisPorFrasco);
      }, 0);

      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'S');

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text(`TOTAL FRASCOS: ${totalFrascos}`, pageWidth - margin - 2, yPos + 6, { align: 'right' });

      yPos += 16;

      // ============ FIRMA Y ACEPTACIÓN ============
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      
      const firmaY = pageHeight - 50;
      const firmaWidth = (pageWidth - 2 * margin - 10) / 2;

      // Línea para firma comprador
      doc.line(margin, firmaY, margin + firmaWidth, firmaY);
      doc.setFontSize(8);
      doc.setFont('courier', 'bold');
      doc.setTextColor(...secondaryColor);
      doc.text('Firma y Sello - Tierra Volga', margin, firmaY + 5);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text('Responsable de Compras', margin, firmaY + 9);

      // Línea para firma proveedor
      const firmaX2 = margin + firmaWidth + 10;
      doc.line(firmaX2, firmaY, firmaX2 + firmaWidth, firmaY);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.text(`Firma y Sello - ${proveedorData.nombre}`, firmaX2, firmaY + 5);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text('Acuse de Recibo', firmaX2, firmaY + 9);

      // ============ PIE DE PÁGINA ============
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');

      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.setFont('courier', 'bold');
      doc.text('Sistema de Gestión - Tierra Volga', margin, pageHeight - 12);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text(`Generado: ${formatearFecha(new Date().toISOString().split('T')[0])} ${new Date().toLocaleTimeString('es-ES')}`, margin, pageHeight - 8);
      doc.text(`Orden de compra para: ${proveedorData.nombre}`, margin, pageHeight - 4);

      // Descargar PDF
      const fileName = `orden-compra-${proveedorData.nombre.replace(/\s+/g, '-')}-${orden.numero_orden}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generando PDF por proveedor:', error);
      alert('Error al generar PDF: ' + error.message);
    } finally {
      setDescargandoPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '1000px' }}>
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Error</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>No se pudo cargar la orden de compra</p>
          </div>
        </div>
      </div>
    );
  }

  const totalDosis = orden.detalle_orden.reduce((sum, d) => sum + d.cantidad_solicitada, 0);
  const totalRecibido = orden.detalle_orden.reduce((sum, d) => sum + d.cantidad_recibida, 0);
  const porcentajeRecibido = totalDosis > 0 ? Math.round((totalRecibido / totalDosis) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1100px' }}>
        <div className="modal-header">
          <h2>
            Orden de Compra: {orden.numero_orden}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Header con información principal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Card Estado */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#718096', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</p>
              <span className={`estado-badge ${orden.estado}`} style={{ fontSize: '0.9rem' }}>
                {getEstadoTexto(orden.estado)}
              </span>
            </div>

            {/* Card Fecha */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#718096', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Creación</p>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1a365d', fontWeight: '700' }}>
                {formatFecha(orden.fecha_creacion)}
              </h3>
            </div>

            {/* Card Progreso */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progreso</p>
                <span style={{ 
                  fontSize: '1.4rem', 
                  fontWeight: '700',
                  color: porcentajeRecibido === 100 ? '#059669' : 
                         porcentajeRecibido >= 50 ? '#d97706' : '#dc2626'
                }}>
                  {porcentajeRecibido}%
                </span>
              </div>
              <div style={{
                background: '#e2e8f0',
                borderRadius: '10px',
                height: '12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${porcentajeRecibido}%`,
                  height: '100%',
                  borderRadius: '10px',
                  background: porcentajeRecibido === 100 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 
                              porcentajeRecibido >= 50 ? 'linear-gradient(90deg, #fbbf24 0%, #d97706 100%)' : 
                              'linear-gradient(90deg, #f87171 0%, #dc2626 100%)',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#718096' }}>
                <span>Recibido: {totalRecibido.toLocaleString()}</span>
                <span>Total: {totalDosis.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Cotización asociada */}
          {orden.cotizacion && (
            <div style={{
              background: '#f0fff4',
              border: '1px solid #68d391',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#276749' }}>Cotización Asociada: </span>
                <a 
                  href={`/cotizaciones/${orden.cotizacion.id_cotizacion}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#2c5282', 
                    textDecoration: 'none',
                    fontWeight: '600',
                    borderBottom: '1px dashed #2c5282'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#1a365d'}
                  onMouseOut={(e) => e.target.style.color = '#2c5282'}
                >
                  {orden.cotizacion.numero_cotizacion}
                </a>
                {orden.cotizacion.cliente && (
                  <span style={{ color: '#718096' }}> - {orden.cotizacion.cliente.nombre}</span>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('general')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'general' ? '#2c5282' : 'transparent',
                  color: activeTab === 'general' ? 'white' : '#4a5568',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Items ({orden.detalle_orden.length})
              </button>
              <button
                onClick={() => setActiveTab('proveedores')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'proveedores' ? '#2c5282' : 'transparent',
                  color: activeTab === 'proveedores' ? 'white' : '#4a5568',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Por Proveedor ({orden.por_proveedor?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('ingresos')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === 'ingresos' ? '#2c5282' : 'transparent',
                  color: activeTab === 'ingresos' ? 'white' : '#4a5568',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Ingresos
              </button>
            </div>
          </div>

          {/* Tab: Items General */}
          {activeTab === 'general' && (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Vacuna</th>
                    <th>Proveedor</th>
                    <th style={{ textAlign: 'right' }}>Solicitado</th>
                    <th style={{ textAlign: 'right' }}>Recibido</th>
                    <th style={{ textAlign: 'right' }}>Pendiente</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orden.detalle_orden.map((detalle) => (
                    <tr key={detalle.id_detalle_orden}>
                      <td>
                        <strong>{detalle.vacuna?.nombre}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                          {detalle.vacuna?.codigo}
                        </div>
                      </td>
                      <td>{detalle.proveedor?.nombre}</td>
                      <td style={{ textAlign: 'right' }}>
                        {detalle.cantidad_solicitada.toLocaleString()} dosis
                      </td>
                      <td style={{ textAlign: 'right', color: detalle.cantidad_recibida > 0 ? '#38a169' : '#718096' }}>
                        {detalle.cantidad_recibida.toLocaleString()} dosis
                      </td>
                      <td style={{ textAlign: 'right', color: detalle.pendiente_recibir > 0 ? '#e53e3e' : '#38a169' }}>
                        {detalle.pendiente_recibir?.toLocaleString() || 0} dosis
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`estado-badge ${detalle.estado_item}`}>
                          {getEstadoItemTexto(detalle.estado_item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
                    <td colSpan="2">TOTALES</td>
                    <td style={{ textAlign: 'right' }}>{totalDosis.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{totalRecibido.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{(totalDosis - totalRecibido).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Tab: Por Proveedor */}
          {activeTab === 'proveedores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {orden.por_proveedor?.map((prov) => (
                <div key={prov.id_proveedor} style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #722F37 0%, #5a252c 100%)',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ 
                        color: 'white', 
                        fontWeight: '700', 
                        fontSize: '1.1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {prov.nombre}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}>
                        {prov.total_dosis.toLocaleString()} dosis
                      </span>
                    </div>
                    <button
                      onClick={() => handleExportarPDFProveedor(prov.id_proveedor)}
                      disabled={descargandoPDF}
                      title="Descargar PDF para enviar al laboratorio"
                      style={{
                        background: 'white',
                        color: '#722F37',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#f7f7f7';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      📄 {descargandoPDF ? 'Generando...' : 'Descargar PDF'}
                    </button>
                  </div>
                  <table className="items-table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Vacuna</th>
                        <th style={{ textAlign: 'right' }}>Solicitado</th>
                        <th style={{ textAlign: 'right' }}>Recibido</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prov.items.map((item) => (
                        <tr key={item.id_detalle_orden}>
                          <td>{item.vacuna?.nombre}</td>
                          <td style={{ textAlign: 'right' }}>{item.cantidad_solicitada.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{item.cantidad_recibida.toLocaleString()}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`estado-badge ${item.estado_item}`}>
                              {getEstadoItemTexto(item.estado_item)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Ingresos */}
          {activeTab === 'ingresos' && (
            <div>
              {orden.detalle_orden.some(d => d.ingresos?.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {orden.detalle_orden
                    .filter(d => d.ingresos?.length > 0)
                    .map((detalle) => (
                      <div key={detalle.id_detalle_orden} style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: '#f7fafc',
                          padding: '12px 16px',
                          borderBottom: '1px solid #e2e8f0',
                          fontWeight: 'bold'
                        }}>
                          {detalle.vacuna?.nombre}
                          <span style={{ fontWeight: 'normal', color: '#718096', marginLeft: '8px' }}>
                            ({detalle.ingresos.length} ingresos)
                          </span>
                        </div>
                        <table className="items-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Lote</th>
                              <th>Vencimiento</th>
                              <th style={{ textAlign: 'right' }}>Cantidad</th>
                              <th>Ubicación</th>
                              <th style={{ textAlign: 'right' }}>Precio</th>
                              <th>Remito/Observaciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.ingresos.map((ingreso) => (
                              <tr key={ingreso.id_ingreso}>
                                <td>{formatFecha(ingreso.fecha_ingreso)}</td>
                                <td><strong>{ingreso.lote}</strong></td>
                                <td>{formatFecha(ingreso.fecha_vencimiento)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {ingreso.cantidad_ingresada.toLocaleString()} dosis
                                </td>
                                <td>{ingreso.ubicacion_fisica || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {formatMoney(ingreso.precio_compra)}
                                </td>
                                <td style={{ color: ingreso.observaciones ? '#2d3748' : '#a0aec0' }}>
                                  {ingreso.observaciones || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <h3>Sin ingresos registrados</h3>
                  <p>Aún no se han registrado ingresos para esta orden</p>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          {orden.observaciones && (
            <div className="observaciones-section" style={{ marginTop: '20px' }}>
              <div className="observaciones-title">Observaciones</div>
              <p style={{ margin: 0 }}>{orden.observaciones}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={handleExportarPDFCompleto}
            disabled={descargandoPDF}
          >
            {descargandoPDF ? 'Generando...' : 'Exportar PDF Completo'}
          </button>
          {['confirmada', 'parcial'].includes(orden.estado) && (
            <button className="btn btn-success" onClick={onRegistrarIngreso}>
              Registrar Ingreso
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdenCompraDetalle;
