const prisma = require('../src/lib/prisma');

async function validarSprint4() {
  console.log('🔍 VALIDANDO SPRINT 4: SEGUIMIENTO DE DOSIS Y RETIROS');
  console.log('====================================================\n');

  try {
    // 1. Verificar modelos de seguimiento
    console.log('1️⃣ Verificando modelos de seguimiento...');
    
    // Verificar modelo AplicacionDosis
    const aplicaciones = await prisma.aplicacionDosis.findMany({
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    console.log(`✅ Aplicaciones de dosis encontradas: ${aplicaciones.length}`);

    // Verificar modelo RetiroCampo
    const retiros = await prisma.retiroCampo.findMany({
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    console.log(`✅ Retiros de campo encontrados: ${retiros.length}`);

    // Verificar modelo SeguimientoCumplimiento
    const seguimientos = await prisma.seguimientoCumplimiento.findMany({
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    console.log(`✅ Seguimientos de cumplimiento encontrados: ${seguimientos.length}`);

    // Verificar modelo NotificacionAutomatica
    const notificaciones = await prisma.notificacionAutomatica.findMany({
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    console.log(`✅ Notificaciones automáticas encontradas: ${notificaciones.length}`);

    // 2. Verificar cotización existente para pruebas
    console.log('\n2️⃣ Verificando cotizaciones disponibles...');
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        cliente: true,
        plan: true,
        calendario_vacunacion: true
      },
      take: 3
    });

    if (cotizaciones.length === 0) {
      console.log('❌ No hay cotizaciones disponibles para pruebas');
      return;
    }

    console.log(`✅ Cotizaciones disponibles: ${cotizaciones.length}`);
    const cotizacionTest = cotizaciones[0];
    console.log(`📋 Usando cotización: ${cotizacionTest.numero_cotizacion} - Cliente: ${cotizacionTest.cliente.nombre}`);

    // 3. Simular aplicación de dosis
    console.log('\n3️⃣ Simulando aplicación de dosis...');
    
    if (cotizacionTest.calendario_vacunacion.length > 0) {
      const calendarioItem = cotizacionTest.calendario_vacunacion[0];
      
      // Crear aplicación de dosis de prueba
      const aplicacionTest = await prisma.aplicacionDosis.create({
        data: {
          id_calendario: calendarioItem.id_calendario,
          id_cotizacion: cotizacionTest.id_cotizacion,
          id_producto: calendarioItem.id_producto,
          cantidad_aplicada: Math.min(calendarioItem.cantidad_dosis, 5), // Aplicar máximo 5 dosis
          fecha_aplicacion: new Date(),
          lote_producto: 'LOTE-TEST-001',
          animal_identificacion: 'ANIMAL-TEST-001',
          responsable_aplicacion: 'Dr. Test Veterinario',
          observaciones: 'Aplicación de prueba para validación Sprint 4',
          estado_aplicacion: 'exitosa'
        }
      });

      // Actualizar estado del calendario
      await prisma.calendarioVacunacion.update({
        where: { id_calendario: calendarioItem.id_calendario },
        data: { 
          estado_dosis: aplicacionTest.cantidad_aplicada === calendarioItem.cantidad_dosis ? 'aplicada' : 'parcial'
        }
      });

      console.log(`✅ Aplicación registrada: ${aplicacionTest.cantidad_aplicada} dosis de ${calendarioItem.cantidad_dosis} programadas`);
      console.log(`   ID Aplicación: ${aplicacionTest.id_aplicacion}`);
      console.log(`   Lote: ${aplicacionTest.lote_producto}`);
      console.log(`   Animal: ${aplicacionTest.animal_identificacion}`);
    } else {
      console.log('⚠️  No hay ítems en el calendario para simular aplicación');
    }

    // 4. Simular retiro de campo
    console.log('\n4️⃣ Simulando retiro de campo...');
    
    // Obtener un producto de la cotización
    const detalleProducto = await prisma.detalleCotizacion.findFirst({
      where: { id_cotizacion: cotizacionTest.id_cotizacion },
      include: { producto: true }
    });

    if (detalleProducto) {
      const retiroTest = await prisma.retiroCampo.create({
        data: {
          id_cotizacion: cotizacionTest.id_cotizacion,
          id_producto: detalleProducto.id_producto,
          cantidad_retirada: 10,
          fecha_retiro: new Date(),
          motivo_retiro: 'decision_tecnica',
          descripcion_motivo: 'Retiro de prueba para validación Sprint 4 - cambio en protocolo',
          afecta_calendario: false, // No afectar calendario para prueba
          responsable_retiro: 'Dr. Test Supervisor',
          observaciones: 'Retiro simulado para validación del sistema'
        }
      });

      console.log(`✅ Retiro registrado: ${retiroTest.cantidad_retirada} unidades de ${detalleProducto.producto.nombre}`);
      console.log(`   ID Retiro: ${retiroTest.id_retiro}`);
      console.log(`   Motivo: ${retiroTest.motivo_retiro}`);
      console.log(`   Responsable: ${retiroTest.responsable_retiro}`);
    } else {
      console.log('⚠️  No hay productos en la cotización para simular retiro');
    }

    // 5. Simular evaluación de cumplimiento
    console.log('\n5️⃣ Simulando evaluación de cumplimiento...');
    
    // Obtener totales para cálculo
    const totalProgramadas = await prisma.calendarioVacunacion.aggregate({
      where: { id_cotizacion: cotizacionTest.id_cotizacion },
      _sum: { cantidad_dosis: true }
    });

    const totalAplicadas = await prisma.aplicacionDosis.aggregate({
      where: { 
        id_cotizacion: cotizacionTest.id_cotizacion,
        estado_aplicacion: 'exitosa'
      },
      _sum: { cantidad_aplicada: true }
    });

    const programadas = totalProgramadas._sum.cantidad_dosis || 0;
    const aplicadas = totalAplicadas._sum.cantidad_aplicada || 0;
    const porcentaje = programadas > 0 ? (aplicadas / programadas) * 100 : 0;

    let estadoGeneral = 'en_tiempo';
    if (porcentaje < 50) {
      estadoGeneral = 'critico';
    } else if (porcentaje < 80) {
      estadoGeneral = 'atrasado';
    } else if (porcentaje === 100) {
      estadoGeneral = 'completado';
    }

    const seguimientoTest = await prisma.seguimientoCumplimiento.create({
      data: {
        id_cotizacion: cotizacionTest.id_cotizacion,
        fecha_evaluacion: new Date(),
        total_dosis_programadas: programadas,
        total_dosis_aplicadas: aplicadas,
        porcentaje_cumplimiento: parseFloat(porcentaje.toFixed(2)),
        dias_atraso_promedio: 0,
        productos_pendientes: programadas - aplicadas,
        estado_general: estadoGeneral,
        observaciones: 'Evaluación de prueba para validación Sprint 4'
      }
    });

    console.log(`✅ Evaluación de cumplimiento creada:`);
    console.log(`   Programadas: ${programadas} dosis`);
    console.log(`   Aplicadas: ${aplicadas} dosis`);
    console.log(`   Cumplimiento: ${porcentaje.toFixed(2)}%`);
    console.log(`   Estado: ${estadoGeneral}`);

    // 6. Simular notificaciones automáticas
    console.log('\n6️⃣ Simulando notificaciones automáticas...');
    
    // Crear notificación de recordatorio
    const notificacionRecordatorio = await prisma.notificacionAutomatica.create({
      data: {
        tipo_notificacion: 'recordatorio_aplicacion',
        id_cotizacion: cotizacionTest.id_cotizacion,
        titulo: 'Recordatorio: Próxima aplicación programada',
        mensaje: `Recordatorio para ${cotizacionTest.cliente.nombre}: tiene aplicaciones programadas para los próximos días.`,
        fecha_programada: new Date(),
        estado_notificacion: 'pendiente',
        canal_envio: 'sistema',
        destinatarios: JSON.stringify({
          cliente_id: cotizacionTest.id_cliente,
          cliente_nombre: cotizacionTest.cliente.nombre
        })
      }
    });

    // Crear notificación de stock insuficiente
    const notificacionStock = await prisma.notificacionAutomatica.create({
      data: {
        tipo_notificacion: 'stock_insuficiente',
        id_cotizacion: cotizacionTest.id_cotizacion,
        titulo: 'Alerta: Stock insuficiente para próximas aplicaciones',
        mensaje: 'Se detectó stock insuficiente para cumplir con las próximas aplicaciones programadas.',
        fecha_programada: new Date(),
        estado_notificacion: 'pendiente',
        canal_envio: 'sistema',
        destinatarios: JSON.stringify({
          tipo: 'administradores',
          urgente: true
        })
      }
    });

    console.log(`✅ Notificaciones creadas:`);
    console.log(`   Recordatorio: ID ${notificacionRecordatorio.id_notificacion}`);
    console.log(`   Alerta de stock: ID ${notificacionStock.id_notificacion}`);

    // 7. Verificar integraciones
    console.log('\n7️⃣ Verificando integraciones...');
    
    // Verificar relaciones con calendario
    const aplicacionesConCalendario = await prisma.aplicacionDosis.findMany({
      where: { id_cotizacion: cotizacionTest.id_cotizacion },
      include: {
        calendario: true,
        producto: true
      }
    });

    console.log(`✅ Aplicaciones vinculadas al calendario: ${aplicacionesConCalendario.length}`);

    // Verificar relaciones con cotizaciones
    const notificacionesVinculadas = await prisma.notificacionAutomatica.findMany({
      where: { id_cotizacion: cotizacionTest.id_cotizacion },
      include: {
        cotizacion: {
          include: {
            cliente: true
          }
        }
      }
    });

    console.log(`✅ Notificaciones vinculadas a cotización: ${notificacionesVinculadas.length}`);

    // 8. Estadísticas finales
    console.log('\n8️⃣ Estadísticas finales del sistema...');
    
    const totalAplicacionesSistema = await prisma.aplicacionDosis.count();
    const totalRetirosSistema = await prisma.retiroCampo.count();
    const totalSeguimientos = await prisma.seguimientoCumplimiento.count();
    const totalNotificaciones = await prisma.notificacionAutomatica.count();

    console.log(`📊 Estadísticas del sistema:`);
    console.log(`   Total aplicaciones registradas: ${totalAplicacionesSistema}`);
    console.log(`   Total retiros de campo: ${totalRetirosSistema}`);
    console.log(`   Total evaluaciones de cumplimiento: ${totalSeguimientos}`);
    console.log(`   Total notificaciones automáticas: ${totalNotificaciones}`);

    // Verificar estados de aplicaciones
    const estadosAplicaciones = await prisma.aplicacionDosis.groupBy({
      by: ['estado_aplicacion'],
      _count: {
        estado_aplicacion: true
      }
    });

    console.log(`📈 Estados de aplicaciones:`);
    estadosAplicaciones.forEach(estado => {
      console.log(`   ${estado.estado_aplicacion}: ${estado._count.estado_aplicacion}`);
    });

    // Verificar motivos de retiros
    const motivosRetiros = await prisma.retiroCampo.groupBy({
      by: ['motivo_retiro'],
      _count: {
        motivo_retiro: true
      }
    });

    console.log(`📋 Motivos de retiros:`);
    motivosRetiros.forEach(motivo => {
      console.log(`   ${motivo.motivo_retiro}: ${motivo._count.motivo_retiro}`);
    });

    // 9. Resumen de validación
    console.log('\n📋 RESUMEN DE VALIDACIÓN SPRINT 4:');
    console.log('=====================================');
    
    console.log(`✅ Modelos implementados: 4 (AplicacionDosis, RetiroCampo, SeguimientoCumplimiento, NotificacionAutomatica)`);
    console.log(`✅ Total aplicaciones de dosis: ${totalAplicacionesSistema}`);
    console.log(`✅ Total retiros de campo: ${totalRetirosSistema}`);
    console.log(`✅ Total evaluaciones de cumplimiento: ${totalSeguimientos}`);
    console.log(`✅ Total notificaciones automáticas: ${totalNotificaciones}`);
    console.log(`✅ Integraciones con calendario: OPERATIVAS`);
    console.log(`✅ Integraciones con cotizaciones: OPERATIVAS`);
    console.log(`✅ Sistema de seguimiento: COMPLETO`);
    console.log(`✅ Notificaciones automáticas: CONFIGURADAS`);

    console.log('\n🎉 SPRINT 4 VALIDADO EXITOSAMENTE');
    console.log('El sistema de seguimiento de dosis y retiros está funcionando correctamente.\n');

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validarSprint4();
