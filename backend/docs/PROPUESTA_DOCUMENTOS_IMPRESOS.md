# Propuesta: Sistema de Persistencia de Documentos Impresos

## 📋 Resumen Ejecutivo

Actualmente, las órdenes de compra y remitos de entrega se regeneran cada vez que se imprimen, sin mantener una numeración correlativa consistente ni un historial de impresiones. Esta propuesta presenta una solución integral para:

1. **Mantener numeración correlativa** única y persistente
2. **Guardar historial de impresiones** para auditoría
3. **Almacenar snapshot de datos** al momento de imprimir
4. **Permitir reimpresión** con el mismo número original

---

## 🔍 Análisis del Estado Actual

### Órdenes de Compra
- **Modelo existente**: `OrdenCompra` con campo `numero_orden`
- **Problema**: El número se genera con formato `OC-YYMMDD-XXX` donde XXX es aleatorio
- **Código**: [ordenesCompra.controller.js](backend/src/controllers/ordenesCompra.controller.js#L7-L14)

```javascript
// ACTUAL: Número aleatorio, puede duplicarse o no ser consecutivo
function generarNumeroOrden() {
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `OC-${year}${month}${day}-${random}`;
}
```

### Remitos de Entrega
- **Modelo existente**: `Remito` para remitos de venta directa
- **Problema**: Los remitos de entrega desde calendario (`generarRemitoPDF`) no se guardan
- **Código**: [cotizaciones.controller.js](backend/src/controllers/cotizaciones.controller.js#L3467) - Genera PDF dinámicamente sin persistir

---

## 🏗️ Arquitectura Propuesta

### Nuevas Tablas

```
┌─────────────────────────────────────────────────────────────┐
│                   secuencias_documentos                      │
├─────────────────────────────────────────────────────────────┤
│ Mantiene contadores correlativos por tipo de documento      │
│ - Garantiza números únicos y consecutivos                   │
│ - Soporta reinicio anual opcional                           │
│ - Thread-safe con FOR UPDATE                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   documentos_impresos                        │
├─────────────────────────────────────────────────────────────┤
│ Registro de cada documento generado                         │
│ - Número oficial asignado                                   │
│ - Snapshot JSON de datos al momento de imprimir             │
│ - Referencias a entidades origen (orden, remito, etc.)      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   archivos_documentos    │   │  historial_impresiones   │
├──────────────────────────┤   ├──────────────────────────┤
│ Almacena PDF binario     │   │ Auditoría de acciones:   │
│ (opcional)               │   │ - Primera impresión      │
│                          │   │ - Reimpresión            │
│                          │   │ - Descarga               │
│                          │   │ - Envío por email        │
└──────────────────────────┘   └──────────────────────────┘
```

### Flujo de Impresión

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Usuario solicita│     │ ¿Tiene número        │ SÍ  │ Usar número     │
│ imprimir doc    │────▶│ oficial asignado?    │────▶│ existente       │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                    │ NO                      │
                                    ▼                         │
                        ┌──────────────────────┐              │
                        │ Llamar SP:           │              │
                        │ sp_siguiente_numero  │              │
                        └──────────────────────┘              │
                                    │                         │
                                    ▼                         │
                        ┌──────────────────────┐              │
                        │ Crear registro en    │              │
                        │ documentos_impresos  │              │
                        └──────────────────────┘              │
                                    │                         │
                                    ▼                         ▼
                        ┌──────────────────────────────────────┐
                        │ Generar PDF con número oficial       │
                        └──────────────────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────────────────────┐
                        │ Registrar en historial_impresiones   │
                        └──────────────────────────────────────┘
```

---

## 📁 Archivos a Modificar/Crear

### Nuevos Archivos

| Archivo | Descripción |
|---------|-------------|
| `migrations/create_documentos_impresos.sql` | Migración con todas las tablas ✅ |
| `prisma/schema.prisma` | Agregar nuevos modelos |
| `src/services/documentosService.js` | Servicio para gestión de documentos |
| `src/controllers/documentos.controller.js` | Endpoints para consulta de documentos |
| `src/routes/documentos.routes.js` | Rutas API |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `controllers/ordenesCompra.controller.js` | Integrar generación de número oficial |
| `controllers/cotizaciones.controller.js` | `generarRemitoPDF()` debe persistir |
| `controllers/remitos.controller.js` | Usar numeración correlativa |

---

## 💻 Implementación del Servicio

### documentosService.js (propuesto)

```javascript
const prisma = require('../lib/prisma');

class DocumentosService {
  
  /**
   * Obtiene o genera número de documento oficial
   * @param {string} tipoDocumento - 'orden_compra', 'remito_entrega', 'remito_venta'
   * @param {object} referencias - { idOrdenCompra, idRemito, idCalendario, etc. }
   * @param {object} datosSnapshot - Datos a guardar para futuras reimpresiones
   * @param {number} usuarioId - ID del usuario que imprime
   */
  async obtenerNumeroDocumento(tipoDocumento, referencias, datosSnapshot, usuarioId) {
    // Verificar si ya existe un documento para esta referencia
    const documentoExistente = await this.buscarDocumentoExistente(tipoDocumento, referencias);
    
    if (documentoExistente) {
      // Ya tiene número oficial - registrar reimpresión
      await this.registrarReimpresion(documentoExistente.id_documento, usuarioId);
      return {
        id_documento: documentoExistente.id_documento,
        numero_documento: documentoExistente.numero_documento,
        es_reimpresion: true,
        datos_originales: documentoExistente.datos_snapshot
      };
    }
    
    // Primera impresión - generar número nuevo
    const resultado = await this.generarNuevoDocumento(
      tipoDocumento, 
      referencias, 
      datosSnapshot, 
      usuarioId
    );
    
    return {
      ...resultado,
      es_reimpresion: false
    };
  }

  async buscarDocumentoExistente(tipoDocumento, referencias) {
    const where = { tipo_documento: tipoDocumento };
    
    if (referencias.idOrdenCompra) {
      where.id_orden_compra = referencias.idOrdenCompra;
    }
    if (referencias.idCalendario) {
      where.id_calendario = referencias.idCalendario;
    }
    // ... más referencias
    
    return await prisma.documentoImpreso.findFirst({ where });
  }

  async generarNuevoDocumento(tipoDocumento, referencias, datosSnapshot, usuarioId) {
    // Usar stored procedure para número correlativo thread-safe
    const [result] = await prisma.$queryRaw`
      CALL sp_registrar_documento_impreso(
        ${tipoDocumento},
        ${referencias.idOrdenCompra || null},
        ${referencias.idRemito || null},
        ${referencias.idCalendario || null},
        ${referencias.idCotizacion || null},
        ${referencias.idProveedor || null},
        ${referencias.idCliente || null},
        ${JSON.stringify(datosSnapshot)},
        ${usuarioId},
        @id_doc,
        @num_doc
      )
    `;
    
    const [ids] = await prisma.$queryRaw`
      SELECT @id_doc as id_documento, @num_doc as numero_documento
    `;
    
    return ids;
  }

  async registrarReimpresion(idDocumento, usuarioId, observaciones = null) {
    return await prisma.historialImpresiones.create({
      data: {
        id_documento: idDocumento,
        tipo_accion: 'reimpresion',
        usuario_id: usuarioId,
        observaciones
      }
    });
  }

  /**
   * Guardar PDF generado (opcional)
   */
  async guardarPDF(idDocumento, pdfBuffer, nombreArchivo) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    
    return await prisma.archivoDocumento.create({
      data: {
        id_documento: idDocumento,
        nombre_archivo: nombreArchivo,
        contenido_pdf: pdfBuffer,
        tamano_bytes: pdfBuffer.length,
        hash_archivo: hash
      }
    });
  }

  /**
   * Obtener historial de impresiones de un documento
   */
  async getHistorialImpresiones(idDocumento) {
    return await prisma.historialImpresiones.findMany({
      where: { id_documento: idDocumento },
      orderBy: { fecha_accion: 'desc' }
    });
  }
}

module.exports = new DocumentosService();
```

---

## 🔄 Ejemplo de Integración

### En ordenesCompra.controller.js

```javascript
// ANTES (actual)
exports.descargarOrdenCompraPDF = async (req, res) => {
  // ... obtener orden
  const pdfBuffer = await pdfService.generateOrdenCompraCompletaPDF(pdfData);
  res.setHeader('Content-Disposition', `attachment; filename="Orden_${orden.numero_orden}.pdf"`);
  res.end(pdfBuffer);
};

// DESPUÉS (propuesto)
const documentosService = require('../services/documentosService');

exports.descargarOrdenCompraPDF = async (req, res) => {
  const { id } = req.params;
  const orden = await prisma.ordenCompra.findUnique({ /* ... */ });
  
  // Obtener o generar número oficial
  const docResult = await documentosService.obtenerNumeroDocumento(
    'orden_compra',
    { idOrdenCompra: parseInt(id), idCotizacion: orden.id_cotizacion },
    { orden, cotizacion: orden.cotizacion, detalle: orden.detalle_orden }, // snapshot
    req.user?.id_usuario
  );
  
  // Actualizar orden si es primera impresión
  if (!docResult.es_reimpresion) {
    await prisma.ordenCompra.update({
      where: { id_orden_compra: parseInt(id) },
      data: { 
        numero_documento_oficial: docResult.numero_documento,
        fecha_primera_impresion: new Date()
      }
    });
  }
  
  // Usar número oficial en el PDF
  const pdfData = {
    ...orden,
    numero_documento_oficial: docResult.numero_documento // Este es el número a mostrar
  };
  
  const pdfBuffer = await pdfService.generateOrdenCompraCompletaPDF(pdfData);
  
  // Guardar PDF (opcional)
  await documentosService.guardarPDF(
    docResult.id_documento, 
    pdfBuffer, 
    `OC_${docResult.numero_documento}.pdf`
  );
  
  res.setHeader('Content-Disposition', `attachment; filename="Orden_Compra_${docResult.numero_documento}.pdf"`);
  res.end(pdfBuffer);
};
```

### En cotizaciones.controller.js (generarRemitoPDF)

```javascript
// DESPUÉS (propuesto)
exports.generarRemitoPDF = async (req, res) => {
  const { id_calendario } = req.params;
  const calendario = await prisma.calendarioVacunacion.findUnique({ /* ... */ });
  
  // Verificar si ya tiene remito asignado
  let numeroRemito = calendario.numero_remito_entrega;
  
  if (!numeroRemito) {
    // Primera impresión - generar número
    const docResult = await documentosService.obtenerNumeroDocumento(
      'remito_entrega',
      { 
        idCalendario: parseInt(id_calendario),
        idCotizacion: calendario.id_cotizacion,
        idCliente: calendario.cotizacion.id_cliente 
      },
      { calendario, cliente: calendario.cotizacion.cliente, producto: pdfData.producto },
      req.user?.id_usuario
    );
    
    numeroRemito = docResult.numero_documento;
    
    // Actualizar calendario con el número asignado
    await prisma.calendarioVacunacion.update({
      where: { id_calendario: parseInt(id_calendario) },
      data: { 
        numero_remito_entrega: numeroRemito,
        fecha_impresion_remito: new Date()
      }
    });
  } else {
    // Reimpresión - solo registrar
    const docExistente = await documentosService.buscarDocumentoExistente(
      'remito_entrega', 
      { idCalendario: parseInt(id_calendario) }
    );
    if (docExistente) {
      await documentosService.registrarReimpresion(docExistente.id_documento, req.user?.id_usuario);
    }
  }
  
  // Generar PDF con número oficial
  pdfData.remito = { numero: numeroRemito };
  const pdfBuffer = await pdfService.generateRemitoPDF(pdfData);
  
  res.send(pdfBuffer);
};
```

---

## 📊 Endpoints Nuevos Sugeridos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/documentos` | Listar documentos con filtros |
| GET | `/api/documentos/:id` | Detalle de documento con historial |
| GET | `/api/documentos/:id/pdf` | Descargar PDF almacenado |
| GET | `/api/documentos/:id/historial` | Historial de impresiones |
| GET | `/api/documentos/secuencias` | Ver estado de secuencias |
| POST | `/api/documentos/secuencias/:tipo/reset` | Reiniciar secuencia (admin) |

---

## 🔐 Consideraciones de Seguridad

1. **Inmutabilidad**: Una vez asignado un número, no puede cambiar
2. **Auditoría completa**: Cada acción queda registrada con usuario, IP y timestamp
3. **Integridad**: Hash SHA-256 para verificar que el PDF no fue modificado
4. **Permisos**: Solo ciertos roles pueden ver historial o reiniciar secuencias

---

## 📈 Beneficios

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Numeración** | Aleatoria, puede repetirse | Correlativa, única garantizada |
| **Trazabilidad** | Ninguna | Historial completo de impresiones |
| **Consistencia** | Datos pueden cambiar entre impresiones | Snapshot preserva datos originales |
| **Auditoría** | No existe | Quién, cuándo, qué imprimió |
| **Espacio** | Mínimo | Configurable (guardar o no PDFs) |

---

## 🚀 Plan de Implementación

### Fase 1: Base de datos (1-2 días)
- [ ] Ejecutar migración `create_documentos_impresos.sql`
- [ ] Actualizar `schema.prisma`
- [ ] Ejecutar `prisma generate`

### Fase 2: Backend (2-3 días)
- [ ] Crear `documentosService.js`
- [ ] Modificar `ordenesCompra.controller.js`
- [ ] Modificar `cotizaciones.controller.js` (remitos)
- [ ] Crear endpoints de consulta

### Fase 3: Frontend (1-2 días)
- [ ] Mostrar número oficial en lugar de número interno
- [ ] Agregar indicador de "Reimpresión" si aplica
- [ ] Vista de historial de documentos

### Fase 4: Testing y ajustes (1-2 días)
- [ ] Pruebas de concurrencia en numeración
- [ ] Verificar compatibilidad con documentos existentes
- [ ] Ajustes de formato de número según requerimientos

---

## ❓ Decisiones Pendientes

1. **¿Guardar PDF binario?**
   - Opción A: Sí, en base de datos (fácil backup, usa espacio)
   - Opción B: Sí, en filesystem (menos carga BD, requiere gestión archivos)
   - Opción C: No, regenerar desde snapshot (menos espacio, más CPU)

2. **¿Reinicio anual de numeración?**
   - Configurable por tipo de documento

3. **¿Formato de número deseado?**
   - Actual propuesto: `OC-2601-00001` (tipo-añomes-numero)
   - Alternativa: `OC-00001/2026` (tipo-numero/año)

4. **¿Migrar documentos existentes?**
   - Opción A: Asignar números retroactivamente
   - Opción B: Solo nuevos documentos usan el sistema

---

## 📝 Notas Finales

Esta propuesta está diseñada para ser **no invasiva** con el sistema actual. Los documentos existentes seguirán funcionando, y el nuevo sistema se activa solo cuando se genera un nuevo documento.

La migración SQL ya está lista en: [create_documentos_impresos.sql](backend/migrations/create_documentos_impresos.sql)
