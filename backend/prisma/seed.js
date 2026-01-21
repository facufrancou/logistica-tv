const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed de secuencias de documentos...');

  // Secuencias de documentos con formato RE-DDMMAAAA-SECUENCIAL
  const secuencias = [
    {
      tipo_documento: 'orden_compra',
      prefijo: 'OC',
      ultimo_numero: 0,
      formato: 'OC-{DIA}{MES}{ANIO4}-{NUMERO}',
      digitos_numero: 5,
      reinicio_anual: false,
      activo: true
    },
    {
      tipo_documento: 'remito_entrega',
      prefijo: 'RE',
      ultimo_numero: 0,
      formato: 'RE-{DIA}{MES}{ANIO4}-{NUMERO}',
      digitos_numero: 5,
      reinicio_anual: false,
      activo: true
    },
    {
      tipo_documento: 'remito_venta',
      prefijo: 'RV',
      ultimo_numero: 0,
      formato: 'RV-{DIA}{MES}{ANIO4}-{NUMERO}',
      digitos_numero: 5,
      reinicio_anual: false,
      activo: true
    },
    {
      tipo_documento: 'remito_venta_directa',
      prefijo: 'RVD',
      ultimo_numero: 0,
      formato: 'RVD-{DIA}{MES}{ANIO4}-{NUMERO}',
      digitos_numero: 5,
      reinicio_anual: false,
      activo: true
    }
  ];

  for (const seq of secuencias) {
    await prisma.secuenciaDocumento.upsert({
      where: {
        uk_tipo_prefijo: {
          tipo_documento: seq.tipo_documento,
          prefijo: seq.prefijo
        }
      },
      update: {
        formato: seq.formato // Actualizar formato si ya existe
      },
      create: seq
    });
    console.log(`✅ Secuencia ${seq.tipo_documento} (${seq.prefijo}) configurada`);
  }

  // También crear el stored procedure para numeración thread-safe
  console.log('📦 Creando stored procedure para numeración...');
  
  try {
    // Eliminar si existe
    await prisma.$executeRawUnsafe(`DROP PROCEDURE IF EXISTS sp_siguiente_numero_documento`);
    
    // Crear el stored procedure
    await prisma.$executeRawUnsafe(`
      CREATE PROCEDURE sp_siguiente_numero_documento(
        IN p_tipo_documento VARCHAR(30),
        IN p_prefijo VARCHAR(20),
        OUT p_numero_completo VARCHAR(50)
      )
      BEGIN
        DECLARE v_ultimo_numero INT;
        DECLARE v_formato VARCHAR(50);
        DECLARE v_digitos INT;
        DECLARE v_reinicio_anual BOOLEAN;
        DECLARE v_anio_actual INT;
        DECLARE v_anio_nuevo INT;
        DECLARE v_nuevo_numero INT;
        
        SET v_anio_nuevo = YEAR(CURDATE());
        
        SELECT 
          ultimo_numero, 
          formato, 
          digitos_numero, 
          reinicio_anual,
          COALESCE(anio_actual, v_anio_nuevo)
        INTO 
          v_ultimo_numero, 
          v_formato, 
          v_digitos, 
          v_reinicio_anual,
          v_anio_actual
        FROM secuencias_documentos
        WHERE tipo_documento = p_tipo_documento 
          AND prefijo = COALESCE(p_prefijo, '')
          AND activo = TRUE
        FOR UPDATE;
        
        IF v_ultimo_numero IS NULL THEN
          INSERT INTO secuencias_documentos (tipo_documento, prefijo, ultimo_numero, formato, digitos_numero)
          VALUES (p_tipo_documento, COALESCE(p_prefijo, ''), 0, CONCAT(COALESCE(p_prefijo, ''), '-{DIA}{MES}{ANIO4}-{NUMERO}'), 5);
          
          SET v_ultimo_numero = 0;
          SET v_formato = CONCAT(COALESCE(p_prefijo, ''), '-{DIA}{MES}{ANIO4}-{NUMERO}');
          SET v_digitos = 5;
          SET v_reinicio_anual = FALSE;
          SET v_anio_actual = v_anio_nuevo;
        END IF;
        
        IF v_reinicio_anual = TRUE AND v_anio_actual < v_anio_nuevo THEN
          SET v_nuevo_numero = 1;
        ELSE
          SET v_nuevo_numero = v_ultimo_numero + 1;
        END IF;
        
        UPDATE secuencias_documentos
        SET 
          ultimo_numero = v_nuevo_numero,
          anio_actual = v_anio_nuevo,
          updated_at = CURRENT_TIMESTAMP
        WHERE tipo_documento = p_tipo_documento 
          AND prefijo = COALESCE(p_prefijo, '')
          AND activo = TRUE;
        
        SET p_numero_completo = v_formato;
        SET p_numero_completo = REPLACE(p_numero_completo, '{PREFIJO}', COALESCE(p_prefijo, ''));
        SET p_numero_completo = REPLACE(p_numero_completo, '{ANIO}', SUBSTRING(CAST(v_anio_nuevo AS CHAR), 3, 2));
        SET p_numero_completo = REPLACE(p_numero_completo, '{ANIO4}', CAST(v_anio_nuevo AS CHAR));
        SET p_numero_completo = REPLACE(p_numero_completo, '{MES}', LPAD(MONTH(CURDATE()), 2, '0'));
        SET p_numero_completo = REPLACE(p_numero_completo, '{DIA}', LPAD(DAY(CURDATE()), 2, '0'));
        SET p_numero_completo = REPLACE(p_numero_completo, '{NUMERO}', LPAD(v_nuevo_numero, v_digitos, '0'));
      END
    `);
    console.log('✅ Stored procedure creado correctamente');
  } catch (error) {
    console.warn('⚠️ No se pudo crear stored procedure (puede que ya exista o no sea compatible):', error.message);
  }

  console.log('🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
