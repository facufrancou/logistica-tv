/**
 * Sistema de Tracking Automático de Precios
 * 
 * Este módulo implementa el seguimiento automático de cambios de precios
 * registrando todas las modificaciones en el historial de precios.
 */

const prisma = require('./prisma');

class PriceTracker {
  /**
   * Registra un cambio de precio automáticamente
   * @param {Object} params - Parámetros del cambio de precio
   */
  static async registrarCambioPrecio(params) {
    const {
      id_producto,
      id_lista_precio,
      precio_anterior,
      precio_nuevo,
      motivo = 'Actualización automática',
      usuario_id = null
    } = params;

    try {
      // Verificar que realmente hay un cambio
      if (precio_anterior === precio_nuevo) {
        return null;
      }

      // Calcular variación porcentual
      const variacion_porcentual = precio_anterior > 0 
        ? ((precio_nuevo - precio_anterior) / precio_anterior) * 100 
        : 0;

      // Determinar tipo de cambio
      const tipo_cambio = precio_nuevo > precio_anterior ? 'aumento' : 'disminucion';

      // Registrar en historial usando el esquema existente
      const historial = await prisma.historialPrecio.create({
        data: {
          id_producto,
          id_lista_precio,
          precio_anterior,
          precio_nuevo,
          motivo_cambio: motivo,
          fecha_cambio: new Date(),
          id_usuario: usuario_id,
          observaciones: `Variación: ${variacion_porcentual.toFixed(2)}% (${tipo_cambio})`
        }
      });

      console.log(`[PriceTracker] Registrado cambio de precio para producto ${id_producto}: ${precio_anterior} → ${precio_nuevo}`);
      
      return historial;
    } catch (error) {
      console.error('[PriceTracker] Error al registrar cambio de precio:', error);
      throw error;
    }
  }

  /**
   * Hook que se ejecuta antes de actualizar un precio en ProductoListaPrecio
   */
  static async beforePriceUpdate(id_producto, id_lista_precio, nuevo_precio, usuario_id = null) {
    try {
      // Obtener precio actual
      const precioActual = await prisma.productoListaPrecio.findUnique({
        where: {
          id_producto_id_lista_precio: {
            id_producto,
            id_lista_precio
          }
        }
      });

      if (precioActual) {
        // Programar el registro del cambio después de la actualización
        process.nextTick(async () => {
          await this.registrarCambioPrecio({
            id_producto,
            id_lista_precio,
            precio_anterior: precioActual.precio,
            precio_nuevo: nuevo_precio,
            motivo: 'Actualización manual',
            usuario_id
          });
        });
      }
    } catch (error) {
      console.error('[PriceTracker] Error en beforePriceUpdate:', error);
    }
  }

  /**
   * Registra cambios masivos de precios
   */
  static async registrarCambiosMasivos(cambios, motivo = 'Actualización masiva', usuario_id = null) {
    try {
      const registros = cambios.map(cambio => {
        const variacion_porcentual = cambio.precio_anterior > 0 
          ? ((cambio.precio_nuevo - cambio.precio_anterior) / cambio.precio_anterior) * 100
          : 0;
        const tipo_cambio = cambio.precio_nuevo > cambio.precio_anterior ? 'aumento' : 'disminucion';
        
        return {
          id_producto: cambio.id_producto,
          id_lista_precio: cambio.id_lista_precio,
          precio_anterior: cambio.precio_anterior,
          precio_nuevo: cambio.precio_nuevo,
          motivo_cambio: motivo,
          fecha_cambio: new Date(),
          id_usuario: usuario_id,
          observaciones: `Variación: ${variacion_porcentual.toFixed(2)}% (${tipo_cambio})`
        };
      });

      const resultado = await prisma.historialPrecio.createMany({
        data: registros,
        skipDuplicates: true
      });

      console.log(`[PriceTracker] Registrados ${resultado.count} cambios de precio masivos`);
      
      return resultado;
    } catch (error) {
      console.error('[PriceTracker] Error al registrar cambios masivos:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de cambios de precio
   */
  static async getEstadisticasCambios(fechaInicio, fechaFin) {
    try {
      // Obtener todos los cambios en el período
      const cambios = await prisma.historialPrecio.findMany({
        where: {
          fecha_cambio: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      });

      // Calcular estadísticas manualmente
      const aumentos = cambios.filter(c => c.precio_nuevo > c.precio_anterior);
      const disminuciones = cambios.filter(c => c.precio_nuevo < c.precio_anterior);
      
      const promedioVariacionAumentos = aumentos.length > 0 
        ? aumentos.reduce((acc, c) => acc + ((c.precio_nuevo - c.precio_anterior) / c.precio_anterior) * 100, 0) / aumentos.length
        : 0;
        
      const promedioVariacionDisminuciones = disminuciones.length > 0 
        ? disminuciones.reduce((acc, c) => acc + ((c.precio_nuevo - c.precio_anterior) / c.precio_anterior) * 100, 0) / disminuciones.length
        : 0;

      const estadisticas = [
        {
          tipo_cambio: 'aumento',
          _count: { id: aumentos.length },
          _avg: { variacion_porcentual: promedioVariacionAumentos }
        },
        {
          tipo_cambio: 'disminucion',
          _count: { id: disminuciones.length },
          _avg: { variacion_porcentual: promedioVariacionDisminuciones }
        }
      ];

      // Calcular productos más afectados
      const productosAfectados = await prisma.historialPrecio.groupBy({
        by: ['id_producto'],
        where: {
          fecha_cambio: {
            gte: fechaInicio,
            lte: fechaFin
          }
        },
        _count: {
          id_historial: true
        },
        orderBy: {
          _count: {
            id_historial: 'desc'
          }
        },
        take: 10
      });

      return {
        resumen_cambios: estadisticas,
        productos_mas_afectados: productosAfectados
      };
    } catch (error) {
      console.error('[PriceTracker] Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Detecta cambios anómalos de precios
   */
  static async detectarCambiosAnomalos(umbral_porcentual = 50) {
    try {
      const cambiosRecientes = await prisma.historialPrecio.findMany({
        where: {
          fecha_cambio: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        },
        include: {
          productos: {
            select: {
              nombre: true,
              id_producto: true
            }
          },
          lista_precio: {
            select: {
              nombre: true
            }
          }
        },
        orderBy: {
          fecha_cambio: 'desc'
        }
      });

      // Filtrar cambios anómalos manualmente
      const cambiosAnomalos = cambiosRecientes.filter(cambio => {
        const variacion = ((cambio.precio_nuevo - cambio.precio_anterior) / cambio.precio_anterior) * 100;
        return Math.abs(variacion) >= umbral_porcentual;
      }).map(cambio => ({
        ...cambio,
        variacion_porcentual: ((cambio.precio_nuevo - cambio.precio_anterior) / cambio.precio_anterior) * 100,
        producto: cambio.productos
      }));

      return cambiosAnomalos;
    } catch (error) {
      console.error('[PriceTracker] Error al detectar cambios anómalos:', error);
      throw error;
    }
  }
}

module.exports = PriceTracker;
