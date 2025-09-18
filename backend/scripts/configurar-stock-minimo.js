const prisma = require('../src/lib/prisma');

async function configurarStockMinimo() {
  try {
    console.log('🔧 Configurando stock mínimo para productos...');

    // Obtener productos que requieren control de stock pero no tienen mínimo configurado
    const productos = await prisma.producto.findMany({
      where: {
        requiere_control_stock: true,
        OR: [
          { stock_minimo: null },
          { stock_minimo: 0 }
        ]
      }
    });

    console.log(`📊 Productos encontrados sin stock mínimo: ${productos.length}`);

    let productosActualizados = 0;
    const resumen = {
      sinMovimiento: 0,
      conMovimientoBajo: 0,
      conMovimientoAlto: 0,
      stockMinimoPromedio: 0
    };

    for (const producto of productos) {
      // Para simplificar, usar un algoritmo basado en el stock actual
      const stockActual = producto.stock || 0;
      let stockMinimo = 5; // Valor base

      if (stockActual > 0) {
        // Configurar un 30% del stock actual como mínimo, con un mínimo de 5
        stockMinimo = Math.max(Math.ceil(stockActual * 0.3), 5);
        // Máximo razonable de 30 unidades
        stockMinimo = Math.min(stockMinimo, 30);
      }

      await prisma.producto.update({
        where: { id_producto: producto.id_producto },
        data: { 
          stock_minimo: stockMinimo,
          requiere_control_stock: true
        }
      });

      console.log(`✅ ${producto.nombre}: Stock mínimo ${stockMinimo} (stock actual: ${stockActual})`);
      productosActualizados++;
      resumen.stockMinimoPromedio += stockMinimo;
    }

    resumen.stockMinimoPromedio = productos.length > 0 ? Math.round(resumen.stockMinimoPromedio / productos.length) : 0;

    console.log(`\n🎉 Configuración completada:`);
    console.log(`   ✅ Productos actualizados: ${productosActualizados}`);
    console.log(`   📈 Stock mínimo promedio: ${resumen.stockMinimoPromedio}`);

    // Verificar alertas después de la configuración
    console.log('\n🔍 Verificando alertas generadas...');
    
    const alertasGeneradas = await verificarAlertas();
    console.log(`   🚨 Alertas detectadas después de configuración: ${alertasGeneradas.total}`);
    console.log(`   🔴 Críticas: ${alertasGeneradas.criticas}`);
    console.log(`   🟡 Advertencias: ${alertasGeneradas.warnings}`);
    console.log(`   🔵 Información: ${alertasGeneradas.info}`);

    return {
      productosActualizados,
      alertasGeneradas,
      resumen
    };

  } catch (error) {
    console.error('❌ Error configurando stock mínimo:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verificarAlertas() {
  const productos = await prisma.producto.findMany({
    where: { requiere_control_stock: true }
  });

  let criticas = 0;
  let warnings = 0;
  let info = 0;

  productos.forEach(producto => {
    const stock = Number(producto.stock) || 0;
    const stockMinimo = Number(producto.stock_minimo) || 5;
    const stockReservado = Number(producto.stock_reservado) || 0;
    const stockDisponible = stock - stockReservado;
    
    // Stock agotado
    if (stock === 0) {
      criticas++;
    }
    // Stock crítico
    else if (stock > 0 && stock <= stockMinimo * 0.5) {
      criticas++;
    }
    // Stock bajo
    else if (stock > stockMinimo * 0.5 && stock <= stockMinimo) {
      warnings++;
    }
    
    // Stock totalmente reservado
    if (stock > 0 && stockDisponible <= 0 && stockReservado > 0) {
      warnings++;
    }
    
    // Sin configuración pero con movimiento (simplificado)
    if (!producto.stock_minimo || producto.stock_minimo === 0) {
      info++;
    }
  });

  return {
    total: criticas + warnings + info,
    criticas,
    warnings,
    info
  };
}

// Función para configurar solo productos específicos
async function configurarProductosEspecificos(idsProductos) {
  try {
    console.log(`🎯 Configurando stock mínimo para productos específicos: ${idsProductos.join(', ')}`);
    
    const productos = await prisma.producto.findMany({
      where: {
        id_producto: { in: idsProductos },
        requiere_control_stock: true
      },
      include: {
        detalle_cotizaciones: {
          include: {
            cotizacion: {
              select: {
                estado: true
              }
            }
          }
        }
      }
    });

    for (const producto of productos) {
      const stockActual = producto.stock || 0;
      const stockMinimo = Math.max(Math.ceil(stockActual * 0.3), 5);

      await prisma.producto.update({
        where: { id_producto: producto.id_producto },
        data: { stock_minimo: stockMinimo }
      });

      console.log(`✅ ${producto.nombre}: Stock mínimo configurado en ${stockMinimo}`);
    }

    console.log(`🎉 Configuración completada para ${productos.length} productos`);

  } catch (error) {
    console.error('❌ Error configurando productos específicos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === '--productos') {
    // Configurar productos específicos
    const ids = args.slice(1).map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length > 0) {
      configurarProductosEspecificos(ids);
    } else {
      console.error('❌ IDs de productos inválidos');
      process.exit(1);
    }
  } else {
    // Configurar todos los productos
    configurarStockMinimo();
  }
}

module.exports = { 
  configurarStockMinimo, 
  configurarProductosEspecificos, 
  verificarAlertas 
};