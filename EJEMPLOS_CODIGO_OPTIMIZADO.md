# Ejemplos de Código Optimizado - Implementación Práctica
## Sistema de Logística TV

Este documento contiene ejemplos listos para implementar de los controllers optimizados.

---

## 📁 Estructura de Archivos a Modificar

```
backend/src/controllers/
├── cotizaciones.controller.js ⚠️ CRÍTICO
├── productos.controller.js    🟡 IMPORTANTE  
├── stock.controller.js         🟡 IMPORTANTE
├── dashboard.controller.js     🔴 CRÍTICO
├── pedidos.controller.js       🟡 IMPORTANTE
└── vacunas.controller.js       🟢 RECOMENDABLE
```

---

## 1. COTIZACIONES CONTROLLER (VERSIÓN COMPLETA OPTIMIZADA)

### Archivo: `backend/src/controllers/cotizaciones.controller.js`

```javascript
const prisma = require('../lib/prisma');
const PriceCalculator = require('../lib/priceCalculator');

// ===== FUNCIONES AUXILIARES =====

function generarNumeroCotizacion() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `COT-${year}${month}${day}-${random}`;
}

async function generarNumeroCotizacionUnico(tx = prisma) {
  let numeroCotizacion;
  let existeNumero = true;
  let intentos = 0;
  const maxIntentos = 10;
  
  while (existeNumero && intentos < maxIntentos) {
    numeroCotizacion = generarNumeroCotizacion();
    const cotizacionExistente = await tx.cotizacion.findUnique({
      where: { numero_cotizacion: numeroCotizacion },
      select: { id_cotizacion: true }
    });
    existeNumero = !!cotizacionExistente;
    intentos++;
  }
  
  if (intentos >= maxIntentos) {
    throw new Error('No se pudo generar un número de cotización único');
  }
  
  return numeroCotizacion;
}

// ===== ENDPOINTS OPTIMIZADOS =====

/**
 * GET /cotizaciones
 * Obtener listado de cotizaciones con paginación y filtros
 */
exports.getCotizaciones = async (req, res) => {
  try {
    const { 
      estado, 
      id_cliente, 
      fecha_desde, 
      fecha_hasta,
      numero_cotizacion,
      page = 1,
      limit = 50
    } = req.query;
    
    // Construir filtros
    const where = {};
    if (estado) where.estado = estado;
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    if (numero_cotizacion) where.numero_cotizacion = { contains: numero_cotizacion };
    
    if (fecha_desde && fecha_hasta) {
      where.created_at = {
        gte: new Date(fecha_desde + 'T00:00:00.000Z'),
        lte: new Date(fecha_hasta + 'T23:59:59.999Z')
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // ✅ OPTIMIZACIÓN: Paginación + conteo paralelo
    const [cotizaciones, totalCount] = await Promise.all([
      prisma.cotizacion.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        select: {
          id_cotizacion: true,
          numero_cotizacion: true,
          estado: true,
          fecha_inicio_plan: true,
          cantidad_animales: true,
          precio_total: true,
          modalidad_facturacion: true,
          porcentaje_aplicado: true,
          observaciones: true,
          created_at: true,
          updated_at: true,
          fecha_envio: true,
          fecha_aceptacion: true,
          // Cliente
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              cuit: true,
              email: true
            }
          },
          // Plan
          plan: {
            select: {
              id_plan: true,
              nombre: true,
              duracion_semanas: true,
              descripcion: true
            }
          },
          // Lista de precios
          lista_precio: {
            select: {
              id_lista: true,
              tipo: true,
              nombre: true,
              porcentaje_recargo: true
            }
          },
          // Detalle - solo campos esenciales
          detalle_cotizacion: {
            select: {
              id_detalle_cotizacion: true,
              id_producto: true,
              cantidad_total: true,
              precio_unitario: true,
              subtotal: true,
              semana_inicio: true,
              semana_fin: true,
              dosis_por_semana: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.cotizacion.count({ where })
    ]);

    // ✅ OPTIMIZACIÓN: Una sola query para todas las vacunas
    const idsVacunas = [...new Set(
      cotizaciones.flatMap(c => c.detalle_cotizacion.map(dc => dc.id_producto))
    )];
    
    const vacunasMap = new Map();
    if (idsVacunas.length > 0) {
      const vacunas = await prisma.vacuna.findMany({
        where: { id_vacuna: { in: idsVacunas } },
        select: {
          id_vacuna: true,
          codigo: true,
          nombre: true,
          detalle: true
        }
      });
      vacunas.forEach(v => vacunasMap.set(v.id_vacuna, v));
    }

    // Formatear respuesta
    const cotizacionesFormatted = cotizaciones.map(cotizacion => ({
      id_cotizacion: cotizacion.id_cotizacion,
      numero_cotizacion: cotizacion.numero_cotizacion,
      estado: cotizacion.estado,
      precio_total: parseFloat(cotizacion.precio_total),
      cantidad_animales: cotizacion.cantidad_animales,
      fecha_inicio_plan: cotizacion.fecha_inicio_plan,
      modalidad_facturacion: cotizacion.modalidad_facturacion,
      porcentaje_aplicado: cotizacion.porcentaje_aplicado ? parseFloat(cotizacion.porcentaje_aplicado) : null,
      observaciones: cotizacion.observaciones,
      created_at: cotizacion.created_at,
      updated_at: cotizacion.updated_at,
      fecha_envio: cotizacion.fecha_envio,
      fecha_aceptacion: cotizacion.fecha_aceptacion,
      // Cliente
      cliente: {
        id_cliente: cotizacion.cliente.id_cliente,
        nombre: cotizacion.cliente.nombre,
        cuit: cotizacion.cliente.cuit,
        email: cotizacion.cliente.email
      },
      // Plan
      plan: {
        id_plan: cotizacion.plan.id_plan,
        nombre: cotizacion.plan.nombre,
        duracion_semanas: cotizacion.plan.duracion_semanas,
        descripcion: cotizacion.plan.descripcion
      },
      // Lista de precios
      lista_precio: cotizacion.lista_precio ? {
        id_lista: cotizacion.lista_precio.id_lista,
        tipo: cotizacion.lista_precio.tipo,
        nombre: cotizacion.lista_precio.nombre,
        porcentaje_recargo: parseFloat(cotizacion.lista_precio.porcentaje_recargo)
      } : null,
      // Productos con info de vacunas
      productos: cotizacion.detalle_cotizacion.map(dc => {
        const vacuna = vacunasMap.get(dc.id_producto);
        return {
          id_detalle_cotizacion: dc.id_detalle_cotizacion,
          id_producto: dc.id_producto,
          codigo: vacuna?.codigo || null,
          nombre: vacuna?.nombre || 'Vacuna no encontrada',
          detalle: vacuna?.detalle || null,
          cantidad_total: dc.cantidad_total,
          precio_unitario: parseFloat(dc.precio_unitario),
          subtotal: parseFloat(dc.subtotal),
          semana_inicio: dc.semana_inicio,
          semana_fin: dc.semana_fin,
          dosis_por_semana: dc.dosis_por_semana
        };
      })
    }));

    res.json({
      success: true,
      data: cotizacionesFormatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
};

/**
 * GET /cotizaciones/:id
 * Obtener detalle completo de una cotización
 */
exports.getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const idCotizacion = parseInt(id);

    if (isNaN(idCotizacion)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de cotización debe ser un número válido' 
      });
    }

    // ✅ OPTIMIZACIÓN: Una sola consulta principal con selects específicos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: {
        id_cotizacion: true,
        numero_cotizacion: true,
        estado: true,
        fecha_inicio_plan: true,
        cantidad_animales: true,
        precio_total: true,
        modalidad_facturacion: true,
        porcentaje_aplicado: true,
        observaciones: true,
        created_at: true,
        updated_at: true,
        fecha_envio: true,
        fecha_aceptacion: true,
        id_cliente: true,
        id_plan: true,
        id_lista_precio: true,
        // Cliente completo
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            cuit: true,
            email: true,
            telefono: true,
            direccion: true
          }
        },
        // Plan con vacunas
        plan: {
          select: {
            id_plan: true,
            nombre: true,
            descripcion: true,
            duracion_semanas: true,
            estado: true,
            precio_total: true,
            vacunas_plan: {
              select: {
                id_plan_vacuna: true,
                id_vacuna: true,
                cantidad_total: true,
                dosis_por_semana: true,
                semana_inicio: true,
                semana_fin: true,
                observaciones: true,
                vacuna: {
                  select: {
                    id_vacuna: true,
                    codigo: true,
                    nombre: true,
                    detalle: true,
                    precio_lista: true,
                    presentacion: {
                      select: {
                        nombre: true,
                        dosis_por_frasco: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        // Lista de precios
        lista_precio: {
          select: {
            id_lista: true,
            tipo: true,
            nombre: true,
            descripcion: true,
            porcentaje_recargo: true,
            activa: true
          }
        },
        // Detalle de cotización
        detalle_cotizacion: {
          select: {
            id_detalle_cotizacion: true,
            id_producto: true,
            cantidad_total: true,
            precio_base_producto: true,
            porcentaje_aplicado: true,
            precio_unitario: true,
            precio_final_calculado: true,
            subtotal: true,
            facturacion_tipo: true,
            editado_manualmente: true,
            semana_inicio: true,
            semana_fin: true,
            dosis_por_semana: true,
            observaciones: true
          },
          orderBy: {
            semana_inicio: 'asc'
          }
        },
        // Calendario de vacunación
        calendario_vacunacion: {
          select: {
            id_calendario: true,
            id_producto: true,
            id_stock_vacuna: true,
            numero_semana: true,
            fecha_programada: true,
            cantidad_dosis: true,
            estado_dosis: true,
            estado_entrega: true,
            fecha_aplicacion: true,
            dosis_entregadas: true,
            fecha_entrega: true,
            lote_asignado: true,
            fecha_vencimiento_lote: true,
            observaciones: true,
            es_desdoblamiento: true,
            numero_desdoblamiento: true
          },
          orderBy: [
            { numero_semana: 'asc' },
            { id_producto: 'asc' }
          ]
        }
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ 
        success: false,
        error: 'Cotización no encontrada' 
      });
    }

    // ✅ OPTIMIZACIÓN: Cargar vacunas del detalle en UNA consulta
    const idsVacunasDetalle = cotizacion.detalle_cotizacion.map(dc => dc.id_producto);
    const vacunasDetalleMap = new Map();
    
    if (idsVacunasDetalle.length > 0) {
      const vacunas = await prisma.vacuna.findMany({
        where: { id_vacuna: { in: idsVacunasDetalle } },
        select: {
          id_vacuna: true,
          codigo: true,
          nombre: true,
          detalle: true,
          precio_lista: true
        }
      });
      vacunas.forEach(v => vacunasDetalleMap.set(v.id_vacuna, v));
    }

    // ✅ OPTIMIZACIÓN: Cargar vacunas del calendario en UNA consulta
    const idsVacunasCalendario = [...new Set(cotizacion.calendario_vacunacion.map(cv => cv.id_producto))];
    const vacunasCalendarioMap = new Map();
    
    if (idsVacunasCalendario.length > 0) {
      const vacunas = await prisma.vacuna.findMany({
        where: { id_vacuna: { in: idsVacunasCalendario } },
        select: {
          id_vacuna: true,
          codigo: true,
          nombre: true
        }
      });
      vacunas.forEach(v => vacunasCalendarioMap.set(v.id_vacuna, v));
    }

    // Formatear respuesta completa
    const cotizacionFormatted = {
      // Datos principales
      id_cotizacion: cotizacion.id_cotizacion,
      numero_cotizacion: cotizacion.numero_cotizacion,
      estado: cotizacion.estado,
      precio_total: parseFloat(cotizacion.precio_total),
      cantidad_animales: cotizacion.cantidad_animales,
      fecha_inicio_plan: cotizacion.fecha_inicio_plan,
      modalidad_facturacion: cotizacion.modalidad_facturacion,
      porcentaje_aplicado: cotizacion.porcentaje_aplicado ? parseFloat(cotizacion.porcentaje_aplicado) : null,
      observaciones: cotizacion.observaciones,
      created_at: cotizacion.created_at,
      updated_at: cotizacion.updated_at,
      fecha_envio: cotizacion.fecha_envio,
      fecha_aceptacion: cotizacion.fecha_aceptacion,
      
      // Cliente
      cliente: cotizacion.cliente,
      
      // Plan
      plan: {
        ...cotizacion.plan,
        precio_total: cotizacion.plan.precio_total ? parseFloat(cotizacion.plan.precio_total) : null,
        vacunas_plan: cotizacion.plan.vacunas_plan.map(pv => ({
          ...pv,
          vacuna: {
            ...pv.vacuna,
            precio_lista: parseFloat(pv.vacuna.precio_lista)
          }
        }))
      },
      
      // Lista de precios
      lista_precio: cotizacion.lista_precio ? {
        ...cotizacion.lista_precio,
        porcentaje_recargo: parseFloat(cotizacion.lista_precio.porcentaje_recargo)
      } : null,
      
      // Detalle con información de vacunas
      detalle_productos: cotizacion.detalle_cotizacion.map(dc => {
        const vacuna = vacunasDetalleMap.get(dc.id_producto);
        return {
          id_detalle_cotizacion: dc.id_detalle_cotizacion,
          id_producto: dc.id_producto,
          codigo_vacuna: vacuna?.codigo || null,
          nombre_producto: vacuna?.nombre || 'Vacuna no encontrada',
          detalle_producto: vacuna?.detalle || null,
          cantidad_total: dc.cantidad_total,
          precio_base_producto: parseFloat(dc.precio_base_producto),
          porcentaje_aplicado: dc.porcentaje_aplicado ? parseFloat(dc.porcentaje_aplicado) : null,
          precio_unitario: parseFloat(dc.precio_unitario),
          precio_final_calculado: parseFloat(dc.precio_final_calculado),
          subtotal: parseFloat(dc.subtotal),
          facturacion_tipo: dc.facturacion_tipo,
          editado_manualmente: dc.editado_manualmente,
          semana_inicio: dc.semana_inicio,
          semana_fin: dc.semana_fin,
          dosis_por_semana: dc.dosis_por_semana,
          observaciones: dc.observaciones
        };
      }),
      
      // Calendario con información de vacunas
      calendario: cotizacion.calendario_vacunacion.map(cv => {
        const vacuna = vacunasCalendarioMap.get(cv.id_producto);
        return {
          id_calendario: cv.id_calendario,
          id_producto: cv.id_producto,
          codigo_vacuna: vacuna?.codigo || null,
          nombre_producto: vacuna?.nombre || 'Vacuna no encontrada',
          id_stock_vacuna: cv.id_stock_vacuna,
          numero_semana: cv.numero_semana,
          fecha_programada: cv.fecha_programada,
          cantidad_dosis: cv.cantidad_dosis,
          estado_dosis: cv.estado_dosis,
          estado_entrega: cv.estado_entrega,
          fecha_aplicacion: cv.fecha_aplicacion,
          dosis_entregadas: cv.dosis_entregadas,
          fecha_entrega: cv.fecha_entrega,
          lote_asignado: cv.lote_asignado,
          fecha_vencimiento_lote: cv.fecha_vencimiento_lote,
          observaciones: cv.observaciones,
          es_desdoblamiento: cv.es_desdoblamiento,
          numero_desdoblamiento: cv.numero_desdoblamiento
        };
      })
    };

    res.json({
      success: true,
      data: cotizacionFormatted
    });

  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

/**
 * POST /cotizaciones
 * Crear nueva cotización
 */
exports.createCotizacion = async (req, res) => {
  try {
    const { 
      id_cliente, 
      id_plan, 
      fecha_inicio_plan,
      id_lista_precio,
      observaciones,
      cantidad_animales 
    } = req.body;

    // Validaciones
    if (!id_cliente || !id_plan || !fecha_inicio_plan || !cantidad_animales) {
      return res.status(400).json({ 
        success: false,
        error: 'Cliente, plan, fecha de inicio y cantidad de animales son obligatorios' 
      });
    }

    const cantidadAnimalesNum = parseInt(cantidad_animales);
    if (isNaN(cantidadAnimalesNum) || cantidadAnimalesNum <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'La cantidad de animales debe ser un número mayor a 0' 
      });
    }

    // ✅ OPTIMIZACIÓN: Consultas paralelas de validación
    const [cliente, plan] = await Promise.all([
      prisma.cliente.findUnique({
        where: { id_cliente: parseInt(id_cliente) },
        select: { 
          id_cliente: true, 
          nombre: true, 
          habilitado: true,
          bloqueado: true
        }
      }),
      prisma.planVacunal.findUnique({
        where: { id_plan: parseInt(id_plan) },
        select: {
          id_plan: true,
          nombre: true,
          estado: true,
          duracion_semanas: true,
          id_lista_precio: true,
          vacunas_plan: {
            select: {
              id_plan_vacuna: true,
              id_vacuna: true,
              cantidad_total: true,
              dosis_por_semana: true,
              semana_inicio: true,
              semana_fin: true,
              observaciones: true,
              vacuna: {
                select: {
                  id_vacuna: true,
                  nombre: true,
                  precio_lista: true,
                  presentacion: {
                    select: {
                      dosis_por_frasco: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    // Validar cliente
    if (!cliente) {
      return res.status(404).json({ 
        success: false,
        error: 'Cliente no encontrado' 
      });
    }

    if (!cliente.habilitado) {
      return res.status(400).json({ 
        success: false,
        error: 'Cliente no habilitado para generar cotizaciones' 
      });
    }

    if (cliente.bloqueado) {
      return res.status(400).json({ 
        success: false,
        error: 'Cliente bloqueado, no se pueden generar cotizaciones' 
      });
    }

    // Validar plan
    if (!plan) {
      return res.status(404).json({ 
        success: false,
        error: 'Plan vacunal no encontrado' 
      });
    }

    if (plan.estado !== 'activo') {
      return res.status(400).json({ 
        success: false,
        error: 'El plan debe estar activo para generar cotizaciones' 
      });
    }

    if (!plan.vacunas_plan || plan.vacunas_plan.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'El plan debe tener al menos una vacuna' 
      });
    }

    // ✅ OPTIMIZACIÓN: Transacción con batch operations
    const nuevaCotizacion = await prisma.$transaction(async (tx) => {
      // Generar número único de cotización
      const numeroCotizacion = await generarNumeroCotizacionUnico(tx);

      // Obtener lista de precios si corresponde
      const listaPrecios = id_lista_precio ? parseInt(id_lista_precio) : plan.id_lista_precio;
      let listaPrecio = null;
      
      if (listaPrecios) {
        listaPrecio = await tx.listaPrecio.findUnique({
          where: { id_lista: listaPrecios },
          select: {
            id_lista: true,
            porcentaje_recargo: true,
            activa: true
          }
        });
        
        if (!listaPrecio || !listaPrecio.activa) {
          throw new Error('Lista de precios no encontrada o inactiva');
        }
      }

      // Calcular precios y preparar detalle
      const detalleVacunas = [];
      let precioTotal = 0;

      for (const planVacuna of plan.vacunas_plan) {
        const precioBase = parseFloat(planVacuna.vacuna.precio_lista);
        const porcentajeRecargo = listaPrecio?.porcentaje_recargo || 0;
        const precioFinal = precioBase * (1 + porcentajeRecargo / 100);
        
        // Calcular frascos necesarios
        const dosisNecesarias = cantidadAnimalesNum; // 1 dosis por animal
        const dosisPorFrasco = planVacuna.vacuna.presentacion?.dosis_por_frasco || 1;
        const frascosNecesarios = Math.ceil(dosisNecesarias / dosisPorFrasco);
        
        const subtotal = precioFinal * frascosNecesarios;
        precioTotal += subtotal;

        detalleVacunas.push({
          id_producto: planVacuna.id_vacuna,
          cantidad_total: frascosNecesarios,
          precio_base_producto: precioBase,
          porcentaje_aplicado: porcentajeRecargo || null,
          precio_unitario: precioFinal,
          precio_final_calculado: precioFinal,
          subtotal: subtotal,
          facturacion_tipo: 'pendiente',
          editado_manualmente: false,
          semana_inicio: planVacuna.semana_inicio,
          semana_fin: planVacuna.semana_fin,
          dosis_por_semana: planVacuna.dosis_por_semana,
          observaciones: planVacuna.observaciones
        });
      }

      // Crear cotización
      const cotizacion = await tx.cotizacion.create({
        data: {
          numero_cotizacion: numeroCotizacion,
          id_cliente: parseInt(id_cliente),
          id_plan: parseInt(id_plan),
          id_lista_precio: listaPrecios || null,
          fecha_inicio_plan: new Date(fecha_inicio_plan + 'T12:00:00'),
          cantidad_animales: cantidadAnimalesNum,
          precio_total: precioTotal,
          observaciones: observaciones || '',
          estado: 'en_proceso',
          created_by: req.user?.id_usuario || null
        }
      });

      // ✅ OPTIMIZACIÓN: createMany en lugar de múltiples create
      await tx.detalleCotizacion.createMany({
        data: detalleVacunas.map(vacuna => ({
          id_cotizacion: cotizacion.id_cotizacion,
          ...vacuna
        }))
      });

      // ✅ OPTIMIZACIÓN: Generar calendario en batch
      const calendarioItems = [];
      
      for (const planVacuna of plan.vacunas_plan) {
        const semanaInicio = planVacuna.semana_inicio;
        const semanaFin = planVacuna.semana_fin || semanaInicio;
        const dosisReales = cantidadAnimalesNum;
        
        for (let semana = semanaInicio; semana <= semanaFin; semana++) {
          const fechaProgramada = new Date(fecha_inicio_plan);
          fechaProgramada.setDate(fechaProgramada.getDate() + ((semana - 1) * 7));
          
          calendarioItems.push({
            id_cotizacion: cotizacion.id_cotizacion,
            id_producto: planVacuna.id_vacuna,
            numero_semana: semana,
            fecha_programada: fechaProgramada,
            cantidad_dosis: dosisReales,
            estado_dosis: 'pendiente',
            estado_entrega: 'pendiente'
          });
        }
      }

      if (calendarioItems.length > 0) {
        await tx.calendarioVacunacion.createMany({
          data: calendarioItems
        });
      }

      return cotizacion;
    });

    res.status(201).json({
      success: true,
      message: 'Cotización creada exitosamente',
      data: {
        id_cotizacion: nuevaCotizacion.id_cotizacion,
        numero_cotizacion: nuevaCotizacion.numero_cotizacion,
        precio_total: parseFloat(nuevaCotizacion.precio_total),
        estado: nuevaCotizacion.estado,
        cantidad_animales: nuevaCotizacion.cantidad_animales,
        fecha_inicio_plan: nuevaCotizacion.fecha_inicio_plan
      }
    });

  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

module.exports = exports;
```

---

## 2. DASHBOARD CONTROLLER (VERSIÓN OPTIMIZADA)

### Archivo: `backend/src/controllers/dashboard.controller.js`

```javascript
const prisma = require('../lib/prisma');
const { Prisma } = require('@prisma/client');

// Funciones auxiliares
function obtenerFechaComparacion(periodo = '30d') {
  const ahora = new Date();
  const fechaComparacion = new Date();
  
  switch (periodo) {
    case '7d':
      fechaComparacion.setDate(ahora.getDate() - 7);
      break;
    case '30d':
      fechaComparacion.setDate(ahora.getDate() - 30);
      break;
    case '90d':
      fechaComparacion.setDate(ahora.getDate() - 90);
      break;
    case '1y':
      fechaComparacion.setFullYear(ahora.getFullYear() - 1);
      break;
    default:
      fechaComparacion.setDate(ahora.getDate() - 30);
  }
  
  return fechaComparacion;
}

/**
 * GET /dashboard/metricas-planes
 * Métricas generales de planes y cotizaciones
 */
exports.getMetricasPlanes = async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const fechaComparacion = obtenerFechaComparacion(periodo);

    // ✅ OPTIMIZACIÓN: Todas las métricas en paralelo
    const [
      metricasPlanes,
      metricasCotizaciones,
      metricasFinancieras,
      planesPopulares,
      actividadDiaria
    ] = await Promise.all([
      // Métricas de planes agrupadas por estado
      prisma.planVacunal.groupBy({
        by: ['estado'],
        _count: { id_plan: true },
        where: {
          estado: { in: ['activo', 'borrador', 'inactivo'] }
        }
      }),
      
      // Métricas de cotizaciones agrupadas por estado
      prisma.cotizacion.groupBy({
        by: ['estado'],
        _count: { id_cotizacion: true },
        _sum: { precio_total: true },
        where: {
          estado: { in: ['en_proceso', 'enviada', 'aceptada', 'rechazada'] }
        }
      }),
      
      // Métricas financieras con aggregate
      prisma.factura.aggregate({
        _sum: { 
          monto_total: true,
          monto_pagado: true
        },
        _count: { id_factura: true },
        where: {
          created_at: { gte: fechaComparacion }
        }
      }),
      
      // Top 5 planes más usados
      prisma.planVacunal.findMany({
        select: {
          id_plan: true,
          nombre: true,
          duracion_semanas: true,
          precio_total: true,
          estado: true,
          _count: {
            select: { cotizaciones: true }
          }
        },
        orderBy: {
          cotizaciones: { _count: 'desc' }
        },
        take: 5,
        where: {
          estado: 'activo'
        }
      }),
      
      // Actividad diaria (últimos días del período)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as fecha,
          COUNT(*) as cantidad_cotizaciones,
          SUM(precio_total) as total_precio
        FROM cotizaciones 
        WHERE created_at >= ${fechaComparacion}
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `
    ]);

    // Procesar métricas de planes
    const planesMap = metricasPlanes.reduce((acc, item) => {
      acc[item.estado] = item._count.id_plan;
      return acc;
    }, {});

    // Procesar métricas de cotizaciones
    const cotizacionesMap = metricasCotizaciones.reduce((acc, item) => {
      acc[item.estado] = {
        cantidad: item._count.id_cotizacion,
        total_precio: parseFloat(item._sum.precio_total || 0)
      };
      return acc;
    }, {});

    // Calcular totales y tasas
    const totalPlanes = Object.values(planesMap).reduce((a, b) => a + b, 0);
    const totalCotizaciones = Object.values(cotizacionesMap).reduce((a, b) => a + b.cantidad, 0);
    const tasaConversion = totalCotizaciones > 0 ? 
      ((cotizacionesMap['aceptada']?.cantidad || 0) / totalCotizaciones) * 100 : 0;
    const tasaCobranza = parseFloat(metricasFinancieras._sum.monto_total || 0) > 0 ? 
      (parseFloat(metricasFinancieras._sum.monto_pagado || 0) / parseFloat(metricasFinancieras._sum.monto_total || 0)) * 100 : 0;

    const response = {
      success: true,
      data: {
        resumen: {
          total_planes: totalPlanes,
          planes_activos: planesMap['activo'] || 0,
          planes_borrador: planesMap['borrador'] || 0,
          planes_inactivos: planesMap['inactivo'] || 0,
          tasa_conversion_cotizaciones: Math.round(tasaConversion * 100) / 100
        },
        cotizaciones: {
          total: totalCotizaciones,
          en_proceso: cotizacionesMap['en_proceso']?.cantidad || 0,
          enviadas: cotizacionesMap['enviada']?.cantidad || 0,
          aceptadas: cotizacionesMap['aceptada']?.cantidad || 0,
          rechazadas: cotizacionesMap['rechazada']?.cantidad || 0,
          valor_total_en_proceso: cotizacionesMap['en_proceso']?.total_precio || 0,
          valor_total_aceptadas: cotizacionesMap['aceptada']?.total_precio || 0
        },
        financiero: {
          total_facturado: parseFloat(metricasFinancieras._sum.monto_total || 0),
          total_cobrado: parseFloat(metricasFinancieras._sum.monto_pagado || 0),
          facturas_recientes: metricasFinancieras._count.id_factura,
          tasa_cobranza: Math.round(tasaCobranza * 100) / 100,
          pendiente_cobro: parseFloat(metricasFinancieras._sum.monto_total || 0) - parseFloat(metricasFinancieras._sum.monto_pagado || 0)
        },
        planes_populares: planesPopulares.map(plan => ({
          id_plan: plan.id_plan,
          nombre: plan.nombre,
          cotizaciones_generadas: plan._count.cotizaciones,
          duracion_semanas: plan.duracion_semanas,
          precio_total: plan.precio_total ? parseFloat(plan.precio_total) : null,
          estado: plan.estado
        })),
        actividad_diaria: actividadDiaria.map(item => ({
          fecha: item.fecha,
          cantidad_cotizaciones: Number(item.cantidad_cotizaciones),
          total_precio: parseFloat(item.total_precio || 0)
        }))
      },
      periodo_analizado: periodo,
      fecha_desde: fechaComparacion,
      fecha_hasta: new Date()
    };

    res.json(response);

  } catch (error) {
    console.error('Error obteniendo métricas de planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * GET /dashboard/metricas-operativas
 * Métricas operativas de stock y aplicaciones
 */
exports.getMetricasOperativas = async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const fechaComparacion = obtenerFechaComparacion(periodo);

    // ✅ OPTIMIZACIÓN: Una sola query SQL optimizada para stock
    const [
      metricasStock,
      metricasAplicaciones,
      clientesActivos,
      vacunasDemandadas
    ] = await Promise.all([
      // Métricas de stock en una sola query
      prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN stock <= stock_minimo AND requiere_control_stock = 1 THEN 1 END) as productos_stock_bajo,
          COUNT(CASE WHEN stock <= 0 AND requiere_control_stock = 1 THEN 1 END) as productos_sin_stock,
          (SELECT COUNT(*) FROM movimientos_stock WHERE created_at >= ${fechaComparacion}) as total_movimientos,
          (SELECT SUM(cantidad) FROM movimientos_stock WHERE tipo_movimiento = 'ingreso' AND created_at >= ${fechaComparacion}) as total_ingresos,
          (SELECT SUM(cantidad) FROM movimientos_stock WHERE tipo_movimiento = 'egreso' AND created_at >= ${fechaComparacion}) as total_egresos
        FROM productos
      `,
      
      // Métricas de aplicaciones de dosis
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_aplicaciones,
          COUNT(CASE WHEN estado_aplicacion = 'exitosa' THEN 1 END) as aplicaciones_exitosas,
          COUNT(CASE WHEN created_at >= ${fechaComparacion} THEN 1 END) as aplicaciones_recientes,
          (SELECT COUNT(*) FROM retiros_campo WHERE created_at >= ${fechaComparacion}) as retiros_recientes
        FROM aplicaciones_dosis
      `,
      
      // Top 10 clientes activos del período
      prisma.$queryRaw`
        SELECT 
          c.id_cliente,
          c.nombre,
          c.cuit,
          COUNT(cot.id_cotizacion) as total_cotizaciones,
          SUM(cot.precio_total) as valor_total,
          MAX(cot.created_at) as ultima_cotizacion
        FROM clientes c
        INNER JOIN cotizaciones cot ON c.id_cliente = cot.id_cliente
        WHERE cot.created_at >= ${fechaComparacion}
        GROUP BY c.id_cliente, c.nombre, c.cuit
        ORDER BY total_cotizaciones DESC, valor_total DESC
        LIMIT 10
      `,
      
      // Top 10 vacunas más demandadas del período
      prisma.$queryRaw`
        SELECT 
          v.id_vacuna,
          v.codigo,
          v.nombre,
          SUM(dc.cantidad_total) as cantidad_demandada,
          COUNT(DISTINCT dc.id_cotizacion) as cotizaciones_relacionadas,
          SUM(dc.subtotal) as valor_total_ventas
        FROM vacunas v
        INNER JOIN detalle_cotizacion dc ON v.id_vacuna = dc.id_producto
        INNER JOIN cotizaciones cot ON dc.id_cotizacion = cot.id_cotizacion
        WHERE cot.created_at >= ${fechaComparacion}
        GROUP BY v.id_vacuna, v.codigo, v.nombre
        ORDER BY cantidad_demandada DESC
        LIMIT 10
      `
    ]);

    const stockMetrics = metricasStock[0];
    const aplicacionesMetrics = metricasAplicaciones[0];
    
    const tasaExito = Number(aplicacionesMetrics.total_aplicaciones) > 0 ?
      (Number(aplicacionesMetrics.aplicaciones_exitosas) / Number(aplicacionesMetrics.total_aplicaciones)) * 100 : 0;

    const response = {
      success: true,
      data: {
        stock: {
          productos_stock_bajo: Number(stockMetrics.productos_stock_bajo),
          productos_sin_stock: Number(stockMetrics.productos_sin_stock),
          total_movimientos: Number(stockMetrics.total_movimientos),
          total_ingresos: Number(stockMetrics.total_ingresos || 0),
          total_egresos: Number(stockMetrics.total_egresos || 0),
          balance_stock: Number(stockMetrics.total_ingresos || 0) - Number(stockMetrics.total_egresos || 0)
        },
        aplicaciones: {
          total_aplicaciones: Number(aplicacionesMetrics.total_aplicaciones),
          aplicaciones_exitosas: Number(aplicacionesMetrics.aplicaciones_exitosas),
          aplicaciones_recientes: Number(aplicacionesMetrics.aplicaciones_recientes),
          retiros_recientes: Number(aplicacionesMetrics.retiros_recientes),
          tasa_exito: Math.round(tasaExito * 100) / 100
        },
        clientes_activos: clientesActivos.map(cliente => ({
          id_cliente: Number(cliente.id_cliente),
          nombre: cliente.nombre,
          cuit: cliente.cuit,
          total_cotizaciones: Number(cliente.total_cotizaciones),
          valor_total: parseFloat(cliente.valor_total || 0),
          ultima_cotizacion: cliente.ultima_cotizacion
        })),
        vacunas_demandadas: vacunasDemandadas.map(vacuna => ({
          id_vacuna: Number(vacuna.id_vacuna),
          codigo: vacuna.codigo,
          nombre: vacuna.nombre,
          cantidad_demandada: Number(vacuna.cantidad_demandada),
          cotizaciones_relacionadas: Number(vacuna.cotizaciones_relacionadas),
          valor_total_ventas: parseFloat(vacuna.valor_total_ventas || 0)
        }))
      },
      periodo_analizado: periodo,
      fecha_desde: fechaComparacion,
      fecha_hasta: new Date()
    };

    res.json(response);

  } catch (error) {
    console.error('Error obteniendo métricas operativas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = exports;
```

---

## 3. ÍNDICES SQL PARA IMPLEMENTAR

### Archivo: `backend/migrations/add_performance_indexes.sql`

```sql
-- ==================================================
-- ÍNDICES DE OPTIMIZACIÓN PARA SISTEMA LOGÍSTICA TV
-- ==================================================

-- COTIZACIONES: Búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente_estado_fecha 
ON cotizaciones (id_cliente, estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado_fecha 
ON cotizaciones (estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero 
ON cotizaciones (numero_cotizacion);

-- DETALLE COTIZACIÓN: Joins y agregaciones
CREATE INDEX IF NOT EXISTS idx_detalle_cotizacion_producto_cotizacion 
ON detalle_cotizacion (id_producto, id_cotizacion);

CREATE INDEX IF NOT EXISTS idx_detalle_cotizacion_cotizacion 
ON detalle_cotizacion (id_cotizacion);

-- PRODUCTOS: Filtros múltiples
CREATE INDEX IF NOT EXISTS idx_productos_tipo_stock_activo 
ON productos (tipo_producto, stock, requiere_control_stock);

CREATE INDEX IF NOT EXISTS idx_productos_nombre_activo 
ON productos (nombre, activa);

-- VACUNAS: Búsquedas y filtros
CREATE INDEX IF NOT EXISTS idx_vacunas_codigo 
ON vacunas (codigo);

CREATE INDEX IF NOT EXISTS idx_vacunas_nombre_activa 
ON vacunas (nombre, activa);

CREATE INDEX IF NOT EXISTS idx_vacunas_proveedor_patologia 
ON vacunas (id_proveedor, id_patologia, activa);

-- STOCK VACUNAS: FIFO y disponibilidad
CREATE INDEX IF NOT EXISTS idx_stock_vacunas_vacuna_vencimiento_estado 
ON stock_vacunas (id_vacuna, fecha_vencimiento, estado_stock, stock_actual);

CREATE INDEX IF NOT EXISTS idx_stock_vacunas_lote 
ON stock_vacunas (lote);

-- CALENDARIO VACUNACIÓN: Ordenamiento y filtros
CREATE INDEX IF NOT EXISTS idx_calendario_cotizacion_semana_producto 
ON calendario_vacunacion (id_cotizacion, numero_semana, id_producto);

CREATE INDEX IF NOT EXISTS idx_calendario_fecha_estado 
ON calendario_vacunacion (fecha_programada, estado_dosis, estado_entrega);

-- MOVIMIENTOS STOCK: Auditoría y reportes
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto_fecha_tipo 
ON movimientos_stock (id_producto, created_at DESC, tipo_movimiento);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha 
ON movimientos_stock (created_at DESC);

-- MOVIMIENTOS STOCK VACUNAS: Trazabilidad
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_vacunas_stock_fecha 
ON movimientos_stock_vacunas (id_stock_vacuna, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_vacunas_cotizacion 
ON movimientos_stock_vacunas (id_cotizacion, id_calendario);

-- PEDIDOS: Historial y filtros
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_fecha_estado 
ON pedidos (id_cliente, fecha_pedido DESC, estado);

CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado 
ON pedidos (fecha_pedido DESC, estado);

-- FACTURAS: Estados y vencimientos
CREATE INDEX IF NOT EXISTS idx_facturas_estado_fecha_emision 
ON facturas (estado_factura, fecha_emision DESC);

CREATE INDEX IF NOT EXISTS idx_facturas_vencimiento_estado 
ON facturas (fecha_vencimiento, estado_factura);

CREATE INDEX IF NOT EXISTS idx_facturas_cotizacion 
ON facturas (id_cotizacion);

-- REMITOS: Seguimiento
CREATE INDEX IF NOT EXISTS idx_remitos_numero 
ON remitos (numero_remito);

CREATE INDEX IF NOT EXISTS idx_remitos_cliente_fecha 
ON remitos (id_cliente, fecha_emision DESC);

CREATE INDEX IF NOT EXISTS idx_remitos_estado_tipo 
ON remitos (estado_remito, tipo_remito);

-- PLANES VACUNALES: Activos y búsquedas
CREATE INDEX IF NOT EXISTS idx_planes_vacunales_estado_nombre 
ON planes_vacunales (estado, nombre);

-- CLIENTES: Búsquedas
CREATE INDEX IF NOT EXISTS idx_clientes_nombre 
ON clientes (nombre);

CREATE INDEX IF NOT EXISTS idx_clientes_cuit 
ON clientes (cuit);

CREATE INDEX IF NOT EXISTS idx_clientes_habilitado_bloqueado 
ON clientes (habilitado, bloqueado);

-- ==================================================
-- VERIFICAR ÍNDICES EXISTENTES
-- ==================================================
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX,
  CARDINALITY
FROM information_schema.statistics 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN (
  'cotizaciones', 'detalle_cotizacion', 'productos', 'vacunas',
  'stock_vacunas', 'calendario_vacunacion', 'movimientos_stock',
  'movimientos_stock_vacunas', 'pedidos', 'facturas', 'remitos',
  'planes_vacunales', 'clientes'
)
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

---

Este documento contiene código listo para implementar. Los cambios son **backward-compatible** y no afectan los endpoints existentes del frontend.
