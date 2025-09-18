const prisma = require('../src/lib/prisma');

async function probarNuevoEndpointStock() {
  console.log('=== PROBANDO NUEVO ENDPOINT DE STOCK ===\n');

  try {
    // Simular la llamada al endpoint
    const { requiere_control_stock, tipo_producto } = { requiere_control_stock: 'true' };
    
    // Construir filtros
    let whereClause = {};
    
    if (requiere_control_stock !== undefined) {
      whereClause.requiere_control_stock = requiere_control_stock === 'true';
    }
    
    if (tipo_producto) {
      whereClause.tipo_producto = tipo_producto;
    }

    // Obtener productos
    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: {
        id_producto: true,
        nombre: true,
        descripcion: true,
        stock: true,
        stock_minimo: true,
        requiere_control_stock: true,
        tipo_producto: true,
        proveedores: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`Productos encontrados: ${productos.length}`);

    // Obtener todas las cotizaciones activas con sus detalles
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
        }
      },
      include: {
        detalle_cotizacion: {
          include: {
            producto: {
              select: {
                id_producto: true
              }
            }
          }
        }
      }
    });

    console.log(`\nCotizaciones activas encontradas: ${cotizacionesActivas.length}`);
    cotizacionesActivas.forEach(cot => {
      console.log(`  - ${cot.numero_cotizacion} (${cot.estado}): ${cot.detalle_cotizacion.length} productos`);
    });

    // Calcular stock afectado por producto y estado
    const stockAfectadoPorProducto = {};
    
    cotizacionesActivas.forEach(cotizacion => {
      cotizacion.detalle_cotizacion.forEach(detalle => {
        const idProducto = detalle.id_producto;
        const dosisNecesarias = detalle.cantidad_total * detalle.dosis_por_semana;
        
        if (!stockAfectadoPorProducto[idProducto]) {
          stockAfectadoPorProducto[idProducto] = {
            reservado: 0,    // en_proceso + enviada
            afectado: 0,     // aceptada
            faltante: 0      // cantidad que excede el stock disponible
          };
        }
        
        console.log(`    Producto ${idProducto}: ${dosisNecesarias} dosis para cotización ${cotizacion.numero_cotizacion} (${cotizacion.estado})`);
        
        if (cotizacion.estado === 'en_proceso' || cotizacion.estado === 'enviada') {
          stockAfectadoPorProducto[idProducto].reservado += dosisNecesarias;
        } else if (cotizacion.estado === 'aceptada') {
          stockAfectadoPorProducto[idProducto].afectado += dosisNecesarias;
        }
      });
    });

    console.log('\nStock afectado por producto:');
    Object.entries(stockAfectadoPorProducto).forEach(([idProducto, afectacion]) => {
      console.log(`  Producto ${idProducto}:`);
      console.log(`    Reservado: ${afectacion.reservado}`);
      console.log(`    Afectado: ${afectacion.afectado}`);
      console.log(`    Total: ${afectacion.reservado + afectacion.afectado}`);
    });

    // Calcular stock disponible y faltante para cada producto
    const estadoStock = productos.map(producto => {
      const stock = producto.stock || 0;
      const stockMinimo = producto.stock_minimo || 0;
      const idProducto = producto.id_producto;
      
      const afectacion = stockAfectadoPorProducto[idProducto] || {
        reservado: 0,
        afectado: 0,
        faltante: 0
      };
      
      // Calcular totales
      const totalReservado = afectacion.reservado;
      const totalAfectado = afectacion.afectado;
      const totalComprometido = totalReservado + totalAfectado;
      
      // Calcular stock disponible
      const stockDisponible = Math.max(0, stock - totalComprometido);
      
      // Calcular faltante (solo si el stock total es insuficiente)
      let faltante = 0;
      if (totalComprometido > stock) {
        faltante = totalComprometido - stock;
      }
      
      // Determinar estado del stock
      let estado = 'normal';
      if (stock <= 0) {
        estado = 'critico';
      } else if (faltante > 0) {
        estado = 'critico';
      } else if (stock <= stockMinimo) {
        estado = stockDisponible <= 0 ? 'critico' : 'bajo';
      } else if (stockDisponible <= stockMinimo) {
        estado = 'bajo';
      }

      return {
        id_producto: Number(producto.id_producto),
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        stock: stock,
        stock_minimo: stockMinimo,
        stock_reservado: totalReservado,     // Para cotizaciones en proceso/enviadas
        stock_afectado: totalAfectado,       // Para cotizaciones aceptadas
        stock_disponible: stockDisponible,
        stock_faltante: faltante,            // Cantidad que excede el stock disponible
        estado_stock: estado,
        requiere_control_stock: producto.requiere_control_stock,
        tipo_producto: producto.tipo_producto,
        proveedor_nombre: producto.proveedores?.nombre || null
      };
    });

    console.log('\n=== RESULTADO FINAL ===');
    estadoStock.forEach(producto => {
      console.log(`\nProducto: ${producto.nombre}`);
      console.log(`  Stock Total: ${producto.stock}`);
      console.log(`  Stock Mínimo: ${producto.stock_minimo}`);
      console.log(`  Stock Reservado: ${producto.stock_reservado} (en proceso + enviada)`);
      console.log(`  Stock Afectado: ${producto.stock_afectado} (aceptada)`);
      console.log(`  Stock Disponible: ${producto.stock_disponible}`);
      console.log(`  Stock Faltante: ${producto.stock_faltante}`);
      console.log(`  Estado: ${producto.estado_stock}`);
    });

    console.log('\n✅ Prueba del endpoint completada');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
probarNuevoEndpointStock();