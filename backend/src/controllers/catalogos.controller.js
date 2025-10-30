const prisma = require('../lib/prisma');

// ===== CONTROLADOR DE PATOLOGÍAS =====

/**
 * Obtener todas las patologías
 */
exports.getPatologias = async (req, res) => {
  try {
    const { activa, search } = req.query;
    
    const where = {};
    if (activa !== undefined) where.activa = activa === 'true';
    
    if (search) {
      where.OR = [
        { codigo: { contains: search } },
        { nombre: { contains: search } },
        { descripcion: { contains: search } }
      ];
    }

    const patologias = await prisma.patologia.findMany({
      where,
      orderBy: {
        nombre: 'asc'
      }
    });

    const patologiasFormatted = patologias.map(patologia => ({
      ...patologia,
      id_patologia: Number(patologia.id_patologia)
    }));

    res.json(patologiasFormatted);

  } catch (error) {
    console.error('Error al obtener patologías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear nueva patología
 */
exports.createPatologia = async (req, res) => {
  try {
    const { codigo, nombre, descripcion } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    }

    const nuevaPatologia = await prisma.patologia.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        created_by: req.user?.id || null
      }
    });

    const patologiaFormatted = {
      ...nuevaPatologia,
      id_patologia: Number(nuevaPatologia.id_patologia)
    };

    res.status(201).json(patologiaFormatted);

  } catch (error) {
    console.error('Error al crear patología:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una patología con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualizar patología
 */
exports.updatePatologia = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, activa } = req.body;

    const patologiaActualizada = await prisma.patologia.update({
      where: { id_patologia: parseInt(id) },
      data: {
        codigo: codigo || undefined,
        nombre: nombre || undefined,
        descripcion: descripcion !== undefined ? descripcion : undefined,
        activa: activa !== undefined ? Boolean(activa) : undefined,
        updated_by: req.user?.id || null
      }
    });

    const patologiaFormatted = {
      ...patologiaActualizada,
      id_patologia: Number(patologiaActualizada.id_patologia)
    };

    res.json(patologiaFormatted);

  } catch (error) {
    console.error('Error al actualizar patología:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Patología no encontrada' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una patología con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Eliminar patología (soft delete)
 */
exports.deletePatologia = async (req, res) => {
  try {
    const { id } = req.params;

    const patologiaActualizada = await prisma.patologia.update({
      where: { id_patologia: parseInt(id) },
      data: {
        activa: false,
        updated_by: req.user?.id || null
      }
    });

    res.json({ 
      message: 'Patología desactivada correctamente',
      id_patologia: Number(patologiaActualizada.id_patologia)
    });

  } catch (error) {
    console.error('Error al eliminar patología:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Patología no encontrada' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== CONTROLADOR DE PRESENTACIONES =====

/**
 * Obtener todas las presentaciones
 */
exports.getPresentaciones = async (req, res) => {
  try {
    const { activa, search } = req.query;
    
    const where = {};
    if (activa !== undefined) where.activa = activa === 'true';
    
    if (search) {
      where.OR = [
        { codigo: { contains: search } },
        { nombre: { contains: search } },
        { descripcion: { contains: search } }
      ];
    }

    const presentaciones = await prisma.presentacion.findMany({
      where,
      orderBy: {
        nombre: 'asc'
      }
    });

    const presentacionesFormatted = presentaciones.map(presentacion => ({
      ...presentacion,
      id_presentacion: Number(presentacion.id_presentacion)
    }));

    res.json(presentacionesFormatted);

  } catch (error) {
    console.error('Error al obtener presentaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear nueva presentación
 */
exports.createPresentacion = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, unidad_medida, dosis_por_frasco } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    }

    const nuevaPresentacion = await prisma.presentacion.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        unidad_medida: unidad_medida || null,
        dosis_por_frasco: dosis_por_frasco ? parseInt(dosis_por_frasco) : 1,
        created_by: req.user?.id || null
      }
    });

    const presentacionFormatted = {
      ...nuevaPresentacion,
      id_presentacion: Number(nuevaPresentacion.id_presentacion)
    };

    res.status(201).json(presentacionFormatted);

  } catch (error) {
    console.error('Error al crear presentación:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una presentación con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualizar presentación
 */
exports.updatePresentacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, unidad_medida, dosis_por_frasco, activa } = req.body;

    const presentacionActualizada = await prisma.presentacion.update({
      where: { id_presentacion: parseInt(id) },
      data: {
        codigo: codigo || undefined,
        nombre: nombre || undefined,
        descripcion: descripcion !== undefined ? descripcion : undefined,
        unidad_medida: unidad_medida !== undefined ? unidad_medida : undefined,
        dosis_por_frasco: dosis_por_frasco !== undefined ? parseInt(dosis_por_frasco) : undefined,
        activa: activa !== undefined ? Boolean(activa) : undefined,
        updated_by: req.user?.id || null
      }
    });

    const presentacionFormatted = {
      ...presentacionActualizada,
      id_presentacion: Number(presentacionActualizada.id_presentacion)
    };

    res.json(presentacionFormatted);

  } catch (error) {
    console.error('Error al actualizar presentación:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Presentación no encontrada' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una presentación con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Eliminar presentación (soft delete)
 */
exports.deletePresentacion = async (req, res) => {
  try {
    const { id } = req.params;

    const presentacionActualizada = await prisma.presentacion.update({
      where: { id_presentacion: parseInt(id) },
      data: {
        activa: false,
        updated_by: req.user?.id || null
      }
    });

    res.json({ 
      message: 'Presentación desactivada correctamente',
      id_presentacion: Number(presentacionActualizada.id_presentacion)
    });

  } catch (error) {
    console.error('Error al eliminar presentación:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Presentación no encontrada' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== CONTROLADOR DE VÍAS DE APLICACIÓN =====

/**
 * Obtener todas las vías de aplicación
 */
exports.getViasAplicacion = async (req, res) => {
  try {
    const { activa, search } = req.query;
    
    const where = {};
    if (activa !== undefined) where.activa = activa === 'true';
    
    if (search) {
      where.OR = [
        { codigo: { contains: search } },
        { nombre: { contains: search } },
        { descripcion: { contains: search } }
      ];
    }

    const viasAplicacion = await prisma.viaAplicacion.findMany({
      where,
      orderBy: {
        nombre: 'asc'
      }
    });

    const viasFormatted = viasAplicacion.map(via => ({
      ...via,
      id_via_aplicacion: Number(via.id_via_aplicacion)
    }));

    res.json(viasFormatted);

  } catch (error) {
    console.error('Error al obtener vías de aplicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Crear nueva vía de aplicación
 */
exports.createViaAplicacion = async (req, res) => {
  try {
    const { codigo, nombre, descripcion } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    }

    const nuevaVia = await prisma.viaAplicacion.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        created_by: req.user?.id || null
      }
    });

    const viaFormatted = {
      ...nuevaVia,
      id_via_aplicacion: Number(nuevaVia.id_via_aplicacion)
    };

    res.status(201).json(viaFormatted);

  } catch (error) {
    console.error('Error al crear vía de aplicación:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una vía de aplicación con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualizar vía de aplicación
 */
exports.updateViaAplicacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, activa } = req.body;

    const viaActualizada = await prisma.viaAplicacion.update({
      where: { id_via_aplicacion: parseInt(id) },
      data: {
        codigo: codigo || undefined,
        nombre: nombre || undefined,
        descripcion: descripcion !== undefined ? descripcion : undefined,
        activa: activa !== undefined ? Boolean(activa) : undefined,
        updated_by: req.user?.id || null
      }
    });

    const viaFormatted = {
      ...viaActualizada,
      id_via_aplicacion: Number(viaActualizada.id_via_aplicacion)
    };

    res.json(viaFormatted);

  } catch (error) {
    console.error('Error al actualizar vía de aplicación:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vía de aplicación no encontrada' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una vía de aplicación con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Eliminar vía de aplicación (soft delete)
 */
exports.deleteViaAplicacion = async (req, res) => {
  try {
    const { id } = req.params;

    const viaActualizada = await prisma.viaAplicacion.update({
      where: { id_via_aplicacion: parseInt(id) },
      data: {
        activa: false,
        updated_by: req.user?.id || null
      }
    });

    res.json({ 
      message: 'Vía de aplicación desactivada correctamente',
      id_via_aplicacion: Number(viaActualizada.id_via_aplicacion)
    });

  } catch (error) {
    console.error('Error al eliminar vía de aplicación:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Vía de aplicación no encontrada' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};