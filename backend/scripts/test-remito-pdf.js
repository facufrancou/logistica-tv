const prisma = require('../src/lib/prisma');
const pdfService = require('../src/services/pdfService');

async function testRemitoPDF() {
  try {
    console.log('🧪 Iniciando prueba de generación de remito PDF...');

    // Buscar un calendario con entrega registrada para probar
    const calendarioConEntrega = await prisma.calendarioVacunacion.findFirst({
      where: {
        dosis_entregadas: {
          gt: 0
        }
      },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        },
        producto: true,
        control_entregas: {
          orderBy: { fecha_entrega: 'desc' },
          take: 1
        }
      }
    });

    if (!calendarioConEntrega) {
      console.log('❌ No se encontró ningún calendario con entregas registradas para probar');
      return;
    }

    if (!calendarioConEntrega.control_entregas.length) {
      console.log('❌ No hay entregas registradas en control_entrega_vacunas para este calendario');
      return;
    }

    console.log(`📋 Usando calendario ID: ${calendarioConEntrega.id_calendario}`);
    console.log(`📋 Cotización: ${calendarioConEntrega.cotizacion.numero_cotizacion}`);
    console.log(`📋 Cliente: ${calendarioConEntrega.cotizacion.cliente.nombre}`);
    console.log(`📋 Producto: ${calendarioConEntrega.producto.nombre}`);

    const ultimaEntrega = calendarioConEntrega.control_entregas[0];

    // Preparar datos de prueba
    const pdfData = {
      cliente: {
        nombre: calendarioConEntrega.cotizacion.cliente.nombre,
        email: calendarioConEntrega.cotizacion.cliente.email,
        telefono: calendarioConEntrega.cotizacion.cliente.telefono,
        direccion: calendarioConEntrega.cotizacion.cliente.direccion,
        localidad: calendarioConEntrega.cotizacion.cliente.localidad,
        cuit: calendarioConEntrega.cotizacion.cliente.cuit
      },
      plan: {
        numeroCotizacion: calendarioConEntrega.cotizacion.numero_cotizacion,
        numeroSemana: calendarioConEntrega.numero_semana,
        fechaProgramada: calendarioConEntrega.fecha_programada,
        cantidadAnimales: calendarioConEntrega.cotizacion.cantidad_animales,
        estado: calendarioConEntrega.cotizacion.estado,
        fechaInicio: calendarioConEntrega.cotizacion.fecha_inicio_plan
      },
      producto: {
        nombre: calendarioConEntrega.producto.nombre,
        descripcion: calendarioConEntrega.producto.descripcion,
        cantidadProgramada: calendarioConEntrega.cantidad_dosis
      },
      entrega: {
        cantidadEntregada: ultimaEntrega.cantidad_entregada,
        tipoEntrega: ultimaEntrega.tipo_entrega,
        fechaEntrega: ultimaEntrega.fecha_entrega,
        responsable: ultimaEntrega.responsable_entrega,
        observaciones: ultimaEntrega.observaciones,
        estado: calendarioConEntrega.estado_entrega
      }
    };

    console.log('📄 Generando PDF...');
    
    // Generar PDF
    const pdfBuffer = await pdfService.generateRemitoPDF(pdfData);
    
    console.log(`✅ PDF generado exitosamente: ${pdfBuffer.length} bytes`);
    
    // Guardar PDF de prueba
    const fs = require('fs');
    const path = require('path');
    const fileName = `remito-prueba-${calendarioConEntrega.cotizacion.numero_cotizacion}-semana-${calendarioConEntrega.numero_semana}.pdf`;
    const filePath = path.join(__dirname, fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`💾 PDF guardado en: ${filePath}`);
    
    console.log('🎉 Prueba completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testRemitoPDF();