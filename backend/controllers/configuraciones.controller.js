const db = require('../db/connection');

// Obtener todas las configuraciones
exports.getConfiguraciones = (req, res) => {
  const query = `
    SELECT * FROM configuraciones 
    ORDER BY clave
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    
    // Convertir a objeto para fácil acceso desde el frontend
    const config = {};
    results.forEach(item => {
      config[item.clave] = {
        valor: item.valor,
        descripcion: item.descripcion,
        updated_at: item.updated_at
      };
    });
    
    res.json(config);
  });
};

// Obtener una configuración específica
exports.getConfiguracion = (req, res) => {
  const { clave } = req.params;
  
  const query = `
    SELECT * FROM configuraciones 
    WHERE clave = ?
  `;
  
  db.query(query, [clave], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).json({ error: 'Configuración no encontrada' });
    
    res.json(results[0]);
  });
};

// Actualizar una configuración
exports.updateConfiguracion = (req, res) => {
  const { clave } = req.params;
  const { valor, descripcion } = req.body;
  const id_usuario = req.usuario?.id_usuario;
  
  if (!valor) {
    return res.status(400).json({ error: 'El valor es obligatorio' });
  }
  
  // Primero verificamos si la configuración existe
  db.query('SELECT * FROM configuraciones WHERE clave = ?', [clave], (err, results) => {
    if (err) return res.status(500).send(err);
    
    const oldConfig = results[0];
    
    if (results.length === 0) {
      // Si no existe, la creamos
      const insertQuery = `
        INSERT INTO configuraciones (clave, valor, descripcion, updated_by)
        VALUES (?, ?, ?, ?)
      `;
      
      db.query(insertQuery, [clave, valor, descripcion || null, id_usuario], (err, result) => {
        if (err) return res.status(500).send(err);
        
        // Registrar en auditoría
        const auditQuery = `CALL registrar_auditoria(?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(
          auditQuery,
          [
            id_usuario, 
            'INSERT', 
            'configuraciones', 
            clave,
            'Creación de configuración',
            null,
            JSON.stringify({ clave, valor, descripcion }),
            req.ip
          ]
        );
        
        res.status(201).json({ clave, valor, descripcion });
      });
    } else {
      // Si existe, la actualizamos
      const updateQuery = `
        UPDATE configuraciones
        SET valor = ?, descripcion = ?, updated_by = ?
        WHERE clave = ?
      `;
      
      db.query(updateQuery, [valor, descripcion || oldConfig.descripcion, id_usuario, clave], (err) => {
        if (err) return res.status(500).send(err);
        
        // Registrar en auditoría
        const auditQuery = `CALL registrar_auditoria(?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(
          auditQuery,
          [
            id_usuario, 
            'UPDATE', 
            'configuraciones', 
            clave,
            'Actualización de configuración',
            JSON.stringify(oldConfig),
            JSON.stringify({ clave, valor, descripcion }),
            req.ip
          ]
        );
        
        res.json({ clave, valor, descripcion: descripcion || oldConfig.descripcion });
      });
    }
  });
};

// Eliminar una configuración
exports.deleteConfiguracion = (req, res) => {
  const { clave } = req.params;
  const id_usuario = req.usuario?.id_usuario;
  
  // Primero verificamos si la configuración existe para la auditoría
  db.query('SELECT * FROM configuraciones WHERE clave = ?', [clave], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).json({ error: 'Configuración no encontrada' });
    
    const oldConfig = results[0];
    
    db.query('DELETE FROM configuraciones WHERE clave = ?', [clave], (err) => {
      if (err) return res.status(500).send(err);
      
      // Registrar en auditoría
      const auditQuery = `CALL registrar_auditoria(?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(
        auditQuery,
        [
          id_usuario, 
          'DELETE', 
          'configuraciones', 
          clave,
          'Eliminación de configuración',
          JSON.stringify(oldConfig),
          null,
          req.ip
        ]
      );
      
      res.json({ mensaje: 'Configuración eliminada correctamente' });
    });
  });
};
