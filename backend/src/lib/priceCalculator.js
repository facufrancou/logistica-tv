/**
 * Servicio para cálculo de precios con recargos
 * Maneja la nueva lógica de precios basada en porcentajes de recargo
 */

class PriceCalculator {
  
  /**
   * Calcula el precio con recargo aplicado
   * @param {number} precioBase - Precio base del producto
   * @param {number} porcentajeRecargo - Porcentaje de recargo (ej: 15 para 15%)
   * @returns {number} Precio final con recargo aplicado
   */
  static calcularPrecioConRecargo(precioBase, porcentajeRecargo) {
    if (!precioBase || precioBase <= 0) {
      throw new Error('El precio base debe ser mayor a 0');
    }

    if (porcentajeRecargo < 0 || porcentajeRecargo > 200) {
      throw new Error('El porcentaje de recargo debe estar entre 0 y 200%');
    }

    const recargo = precioBase * (porcentajeRecargo / 100);
    const precioFinal = precioBase + recargo;
    
    // Redondear a 2 decimales
    return Math.round(precioFinal * 100) / 100;
  }

  /**
   * Calcula precios para múltiples productos con una lista de precios
   * @param {Array} productos - Array de productos con sus precios base
   * @param {Object} listaPrecio - Objeto de lista de precios con porcentaje_recargo
   * @returns {Array} Array de productos con precios calculados
   */
  static aplicarListaPrecios(productos, listaPrecio) {
    if (!Array.isArray(productos)) {
      throw new Error('Los productos deben ser un array');
    }

    if (!listaPrecio || typeof listaPrecio.porcentaje_recargo !== 'number') {
      throw new Error('Lista de precio inválida o sin porcentaje de recargo');
    }

    return productos.map(producto => {
      const precioBase = parseFloat(producto.precio_unitario);
      const precioFinal = this.calcularPrecioConRecargo(precioBase, listaPrecio.porcentaje_recargo);
      
      return {
        ...producto,
        precio_base_producto: precioBase,
        porcentaje_aplicado: listaPrecio.porcentaje_recargo,
        precio_final_calculado: precioFinal,
        precio_unitario: precioFinal // Para compatibilidad
      };
    });
  }

  /**
   * Calcula subtotal para un item de cotización
   * @param {number} precioUnitario - Precio unitario del producto
   * @param {number} cantidad - Cantidad de productos
   * @returns {number} Subtotal calculado
   */
  static calcularSubtotal(precioUnitario, cantidad) {
    if (!precioUnitario || precioUnitario <= 0) {
      throw new Error('El precio unitario debe ser mayor a 0');
    }

    if (!cantidad || cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    const subtotal = precioUnitario * cantidad;
    return Math.round(subtotal * 100) / 100;
  }

  /**
   * Valida un porcentaje de recargo
   * @param {number} porcentaje - Porcentaje a validar
   * @returns {boolean} True si es válido
   */
  static validarPorcentajeRecargo(porcentaje) {
    return typeof porcentaje === 'number' && 
           porcentaje >= 0 && 
           porcentaje <= 200 && 
           !isNaN(porcentaje);
  }

  /**
   * Calcula el recargo aplicado en pesos
   * @param {number} precioBase - Precio base del producto
   * @param {number} porcentajeRecargo - Porcentaje de recargo aplicado
   * @returns {number} Monto del recargo en pesos
   */
  static calcularMontoRecargo(precioBase, porcentajeRecargo) {
    if (!this.validarPorcentajeRecargo(porcentajeRecargo)) {
      throw new Error('Porcentaje de recargo inválido');
    }

    const recargo = precioBase * (porcentajeRecargo / 100);
    return Math.round(recargo * 100) / 100;
  }

  /**
   * Calcula el precio base desde un precio final y porcentaje de recargo
   * @param {number} precioFinal - Precio final con recargo
   * @param {number} porcentajeRecargo - Porcentaje de recargo aplicado
   * @returns {number} Precio base original
   */
  static calcularPrecioBase(precioFinal, porcentajeRecargo) {
    if (!precioFinal || precioFinal <= 0) {
      throw new Error('El precio final debe ser mayor a 0');
    }

    if (!this.validarPorcentajeRecargo(porcentajeRecargo)) {
      throw new Error('Porcentaje de recargo inválido');
    }

    const precioBase = precioFinal / (1 + porcentajeRecargo / 100);
    return Math.round(precioBase * 100) / 100;
  }

  /**
   * Formatea un precio para mostrar
   * @param {number} precio - Precio a formatear
   * @param {string} moneda - Símbolo de moneda (default: '$')
   * @returns {string} Precio formateado
   */
  static formatearPrecio(precio, moneda = '$') {
    if (typeof precio !== 'number' || isNaN(precio)) {
      return `${moneda}0.00`;
    }

    return `${moneda}${precio.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Calcula estadísticas de precios para un conjunto de productos
   * @param {Array} productosConPrecios - Array de productos con precios calculados
   * @returns {Object} Estadísticas de precios
   */
  static calcularEstadisticasPrecios(productosConPrecios) {
    if (!Array.isArray(productosConPrecios) || productosConPrecios.length === 0) {
      return {
        total_productos: 0,
        precio_promedio_base: 0,
        precio_promedio_final: 0,
        recargo_promedio: 0,
        total_base: 0,
        total_final: 0,
        total_recargo: 0
      };
    }

    const totalProductos = productosConPrecios.length;
    const totalBase = productosConPrecios.reduce((sum, p) => sum + parseFloat(p.precio_base_producto || 0), 0);
    const totalFinal = productosConPrecios.reduce((sum, p) => sum + parseFloat(p.precio_final_calculado || 0), 0);
    const totalRecargo = totalFinal - totalBase;

    return {
      total_productos: totalProductos,
      precio_promedio_base: Math.round((totalBase / totalProductos) * 100) / 100,
      precio_promedio_final: Math.round((totalFinal / totalProductos) * 100) / 100,
      recargo_promedio: totalBase > 0 ? Math.round((totalRecargo / totalBase * 100) * 100) / 100 : 0,
      total_base: Math.round(totalBase * 100) / 100,
      total_final: Math.round(totalFinal * 100) / 100,
      total_recargo: Math.round(totalRecargo * 100) / 100
    };
  }
}

module.exports = PriceCalculator;