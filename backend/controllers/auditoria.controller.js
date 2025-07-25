const db = require('../db/connection');

// Obtener registros de auditoría con filtros
exports.getAuditoriaAcciones = (req, res) => {
  const { 
    id_usuario, 
    tipo_accion,
    tabla,
    fecha_desde,
    fecha_hasta,
    limite = 100
  } = req.query;
  
  let query = `
    SELECT 
      a.*,
      DATE_FORMAT(a.fecha_accion, '%d/%m/%Y %H:%i:%s') as fecha_formateada,
      u.nombre as usuario_nombre,
      u.email as usuario_email
    FROM auditoria_acciones a
    LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
    WHERE 1=1
  `;
  
  const params = [];
  
  if (id_usuario) {
    query += ' AND a.id_usuario = ?';
    params.push(id_usuario);
  }
  
  if (tipo_accion) {
    query += ' AND a.tipo_accion = ?';
    params.push(tipo_accion);
  }
  
  if (tabla) {
    query += ' AND a.tabla = ?';
    params.push(tabla);
  }
  
  if (fecha_desde) {
    query += ' AND DATE(a.fecha_accion) >= ?';
    params.push(fecha_desde);
  }
  
  if (fecha_hasta) {
    query += ' AND DATE(a.fecha_accion) <= ?';
    params.push(fecha_hasta);
  }
  
  query += ' ORDER BY a.fecha_accion DESC LIMIT ?';
  params.push(parseInt(limite));
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

// Obtener un registro de auditoría específico
exports.getAuditoriaAccion = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      a.*,
      DATE_FORMAT(a.fecha_accion, '%d/%m/%Y %H:%i:%s') as fecha_formateada,
      u.nombre as usuario_nombre,
      u.email as usuario_email
    FROM auditoria_acciones a
    LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
    WHERE a.id_auditoria = ?
  `;
  
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    
    res.json(results[0]);
  });
};

// Obtener resumen de actividad por usuario
exports.getAuditoriaResumenUsuarios = (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;
  
  let query = `
    SELECT 
      u.id_usuario,
      u.nombre as usuario_nombre,
      u.email as usuario_email,
      COUNT(a.id_auditoria) as total_acciones,
      MAX(a.fecha_accion) as ultima_accion
    FROM usuarios u
    LEFT JOIN auditoria_acciones a ON u.id_usuario = a.id_usuario
    WHERE 1=1
  `;
  
  const params = [];
  
  if (fecha_desde) {
    query += ' AND DATE(a.fecha_accion) >= ?';
    params.push(fecha_desde);
  }
  
  if (fecha_hasta) {
    query += ' AND DATE(a.fecha_accion) <= ?';
    params.push(fecha_hasta);
  }
  
  query += ' GROUP BY u.id_usuario ORDER BY total_acciones DESC';
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send(err);
    
    // Formatear fechas
    results.forEach(r => {
      if (r.ultima_accion) {
        const fecha = new Date(r.ultima_accion);
        r.ultima_accion_formateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()} ${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
      }
    });
    
    res.json(results);
  });
};

// Obtener historial de cambios de un registro específico
exports.getHistorialCambios = (req, res) => {
  const { tabla, registro_id } = req.query;
  
  if (!tabla || !registro_id) {
    return res.status(400).json({ error: 'Se requiere tabla y registro_id' });
  }
  
  const query = `
    SELECT 
      a.*,
      DATE_FORMAT(a.fecha_accion, '%d/%m/%Y %H:%i:%s') as fecha_formateada,
      u.nombre as usuario_nombre,
      u.email as usuario_email
    FROM auditoria_acciones a
    LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
    WHERE a.tabla = ? AND a.registro_id = ?
    ORDER BY a.fecha_accion DESC
  `;
  
  db.query(query, [tabla, registro_id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};
