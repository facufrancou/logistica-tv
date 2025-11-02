// =====================================================
// GUÍA DE OPTIMIZACIÓN DE CONSULTAS PRISMA
// =====================================================

/* 
PROBLEMA: Consultas con muchos includes cargan datos innecesarios

MAL ❌:
const cotizaciones = await prisma.cotizacion.findMany({
  include: {
    cliente: true,
    productos: {
      include: {
        producto: {
          include: {
            proveedor: true,
            categoria: true
          }
        }
      }
    },
    calendario: {
      include: {
        stock: {
          include: {
            vacuna: true
          }
        }
      }
    }
  }
}); // Puede devolver 10MB+ de datos

BIEN ✅:
const cotizaciones = await prisma.cotizacion.findMany({
  select: {
    id_cotizacion: true,
    numero_cotizacion: true,
    estado: true,
    total: true,
    cliente: {
      select: {
        razon_social: true,
        nombre_fantasia: true
      }
    }
  },
  take: 50, // PAGINACIÓN
  skip: offset,
  orderBy: { fecha_creacion: 'desc' }
}); // Solo los campos necesarios
*/

// =====================================================
// RECOMENDACIONES ESPECÍFICAS
// =====================================================

// 1. SIEMPRE usar paginación en listados
// 2. Usar 'select' en lugar de 'include' cuando sea posible
// 3. Cargar relaciones solo cuando sean necesarias
// 4. Usar 'findFirst' en lugar de 'findMany' cuando esperas 1 resultado
// 5. Agregar where clauses para filtrar en la BD, no en JS

// EJEMPLO: Cotizaciones con paginación
exports.getCotizacionesPaginadas = async (req, res) => {
  const { page = 1, limit = 20, estado, id_cliente } = req.query;
  const skip = (page - 1) * limit;

  const where = {};
  if (estado) where.estado = estado;
  if (id_cliente) where.id_cliente = parseInt(id_cliente);

  const [cotizaciones, total] = await Promise.all([
    prisma.cotizacion.findMany({
      where,
      select: {
        id_cotizacion: true,
        numero_cotizacion: true,
        estado: true,
        total: true,
        fecha_creacion: true,
        cliente: {
          select: {
            razon_social: true,
            nombre_fantasia: true
          }
        }
      },
      take: parseInt(limit),
      skip: skip,
      orderBy: { fecha_creacion: 'desc' }
    }),
    prisma.cotizacion.count({ where })
  ]);

  res.json({
    cotizaciones,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

// EJEMPLO: Stock vacunas optimizado
exports.getStockVacunasOptimizado = async (req, res) => {
  const { id_vacuna, solo_disponibles } = req.query;

  const where = { activo: true };
  if (id_vacuna) where.id_vacuna = parseInt(id_vacuna);
  if (solo_disponibles === 'true') {
    where.stock_actual = { gt: 0 };
    where.fecha_vencimiento = { gt: new Date() };
  }

  const stocks = await prisma.stockVacuna.findMany({
    where,
    select: {
      id_stock_vacuna: true,
      lote: true,
      stock_actual: true,
      stock_reservado: true,
      fecha_vencimiento: true,
      vacuna: {
        select: {
          nombre: true,
          id_vacuna: true
        }
      },
      proveedor: {
        select: {
          nombre_comercial: true
        }
      }
    },
    orderBy: { fecha_vencimiento: 'asc' },
    take: 100 // Limitar resultados
  });

  res.json(stocks);
};
