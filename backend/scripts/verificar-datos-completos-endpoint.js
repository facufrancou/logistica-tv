const prisma = require('../src/lib/prisma');

async function verificarDatosCompletos() {
  console.log('=== VERIFICANDO DATOS COMPLETOS DEL ENDPOINT ===\n');

  try {
    // Simular exactamente lo que hace el endpoint getEstadoStock
    const productos = await prisma.producto.findMany({
      where: {
        requiere_control_stock: true
      },
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

    // Obtener cotizaciones activas
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: {
          in: ['en_proceso', 'enviada', 'aceptada']
        }
      },
      include: {
        plan: {
          include: {
            productos_plan: {
              include: {
                producto: {
                  select: {
                    id_producto: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Cotizaciones activas: ${cotizacionesActivas.length}`);
    cotizacionesActivas.forEach(cot => {
      console.log(`  - ${cot.numero_cotizacion} (${cot.estado})`);
    });

    // Calcular stock afectado
    const stockAfectadoPorProducto = {};
    
    cotizacionesActivas.forEach(cotizacion => {
      cotizacion.plan.productos_plan.forEach(planProducto => {
        const idProducto = planProducto.id_producto;
        const dosisNecesarias = planProducto.cantidad_total * planProducto.dosis_por_semana;
        
        if (!stockAfectadoPorProducto[idProducto]) {
          stockAfectadoPorProducto[idProducto] = {
            reservado: 0,
            afectado: 0,
            faltante: 0
          };
        }
        
        if (cotizacion.estado === 'en_proceso' || cotizacion.estado === 'enviada') {
          stockAfectadoPorProducto[idProducto].reservado += dosisNecesarias;
        } else if (cotizacion.estado === 'aceptada') {
          stockAfectadoPorProducto[idProducto].afectado += dosisNecesarias;
        }
      });
    });

    // Buscar AD140001 específicamente
    const ad140001 = productos.find(p => p.nombre === 'AD140001');
    if (ad140001) {
      const idProducto = ad140001.id_producto;
      const stock = ad140001.stock || 0;
      
      const afectacion = stockAfectadoPorProducto[idProducto] || {
        reservado: 0,
        afectado: 0,
        faltante: 0
      };
      
      const totalReservado = afectacion.reservado;
      const totalAfectado = afectacion.afectado;
      const totalComprometido = totalReservado + totalAfectado;
      const stockDisponible = Math.max(0, stock - totalComprometido);
      
      let faltante = 0;
      if (totalComprometido > stock) {
        faltante = totalComprometido - stock;
      }

      console.log(`\n=== DATOS PARA AD140001 ===`);
      console.log(`stock: ${stock}`);
      console.log(`stock_reservado: ${totalReservado}`);
      console.log(`stock_afectado: ${totalAfectado}`);
      console.log(`stock_disponible: ${stockDisponible}`);
      console.log(`stock_faltante: ${faltante}`);
      console.log(`estado_stock: ${faltante > 0 ? 'critico' : (stock <= 0 ? 'critico' : 'normal')}`);

      console.log(`\n=== JSON QUE ENVÍA EL BACKEND ===`);
      const resultado = {
        id_producto: Number(ad140001.id_producto),
        nombre: ad140001.nombre,
        descripcion: ad140001.descripcion,
        stock: stock,
        stock_minimo: ad140001.stock_minimo || 0,
        stock_reservado: totalReservado,
        stock_afectado: totalAfectado,
        stock_disponible: stockDisponible,
        stock_faltante: faltante,
        estado_stock: faltante > 0 ? 'critico' : (stock <= 0 ? 'critico' : 'normal'),
        requiere_control_stock: ad140001.requiere_control_stock,
        tipo_producto: ad140001.tipo_producto,
        proveedor_nombre: ad140001.proveedores?.nombre || null
      };
      
      console.log(JSON.stringify(resultado, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarDatosCompletos();