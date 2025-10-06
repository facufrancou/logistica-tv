const axios = require('axios');

// URL base del API (asumiendo que está corriendo en puerto 3001)
const API_BASE = 'http://localhost:3001';

// Datos de vacunas para importar
const vacunasData = [
  { cod: 14, detalle: "9-R", proveedor: "BIAFAR", patologia: "SALMONELLA", presentacion: "1000", via_aplicacion: "SC", precio: 36182.15 },
  { cod: 132, detalle: "COLERA AVIAR 1000DS", proveedor: "BIAFAR", patologia: "COLERA", presentacion: "1000", via_aplicacion: "SC", precio: 26147.09 },
  { cod: 176, detalle: "CORIZA MG", proveedor: "BIAFAR", patologia: "CORIZA + MICOPLASMA G", presentacion: "1000", via_aplicacion: "SC", precio: 89520.15 },
  { cod: 15, detalle: "DILUYENTE", proveedor: "BIAFAR", patologia: "DILUYENTE", presentacion: "1000", via_aplicacion: "", precio: 1.00 },
  { cod: 175, detalle: "MG OLEOSA", proveedor: "BIAFAR", patologia: "MICOPLASMA MG", presentacion: "1000", via_aplicacion: "SC", precio: 65278.00 },
  { cod: 13, detalle: "SALMONELLA TRIPLE", proveedor: "BIAFAR", patologia: "SALMONELA E T Y G", presentacion: "1000", via_aplicacion: "SC", precio: 42461.52 },
  { cod: 12, detalle: "TRIVAC", proveedor: "BIAFAR", patologia: "CORIZA", presentacion: "1000", via_aplicacion: "IM", precio: 36182.15 },
  { cod: 141, detalle: "GALLIMUNE SE", proveedor: "BOEHRINGER INGELHEIM", patologia: "SALMONELA E Y T", presentacion: "1000", via_aplicacion: "IM", precio: 1.00 },
  { cod: 120, detalle: "VECTORMUNE FP LT", proveedor: "CEVA", patologia: "VIRUELA LARINGO", presentacion: "2000", via_aplicacion: "PUNCION ALAR", precio: 1.00 },
  { cod: 37, detalle: "COR 4 IB+ND+EDS X 1000 DS (CUADRUPLE)", proveedor: "MSD", patologia: "CORIZA-NW-BR-EDS", presentacion: "1000", via_aplicacion: "IM", precio: 215351.00 },
  { cod: 33, detalle: "CORVAC 4 X 1000 DS (CORIZA)", proveedor: "MSD", patologia: "CORIZA", presentacion: "1000", via_aplicacion: "SC", precio: 76070.00 },
  { cod: 205, detalle: "GUMBORO 228 E X 5000 DS", proveedor: "MSD", patologia: "GUMBORO", presentacion: "5000", via_aplicacion: "AGUA", precio: 26744.00 },
  { cod: 35, detalle: "LT IVAX X 1000 DS (LARINGOTRAQUEITIS)", proveedor: "MSD", patologia: "LARINGOTRAQUEITIS", presentacion: "1000", via_aplicacion: "GOTA OCULAR", precio: 51806.00 },
  { cod: 32, detalle: "MA5 + CLONE 30 X 1000 DS (BRONQUITIS + NEWCASTLE)", proveedor: "MSD", patologia: "BR+NW", presentacion: "1000", via_aplicacion: "SPRAY", precio: 13629.00 },
  { cod: 198, detalle: "MG 6/85 X 1000 DS", proveedor: "MSD", patologia: "MICOPLASMA MG", presentacion: "1000", via_aplicacion: "SPRAY", precio: 104892.00 },
  { cod: 180, detalle: "SALENVAC T X 1000 DS", proveedor: "MSD", patologia: "SALMONELA E Y T", presentacion: "1000", via_aplicacion: "SC", precio: 172496.00 },
  { cod: 34, detalle: "SG 9R X 1000 DS (SALMONELA VIVA)", proveedor: "MSD", patologia: "SALMONELA VIVI", presentacion: "1000", via_aplicacion: "SC", precio: 100156.00 },
  { cod: 38, detalle: "SPHEREON IB 4/91 X 1000 DS (BRONQUITIS VARIANTE)", proveedor: "MSD", patologia: "BRONQUITIS VARIANTE", presentacion: "1000", via_aplicacion: "AGUA/SPRAY", precio: 10403.00 },
  { cod: 45, detalle: "SPHEREON IB 4/91 X 5000 DS (BRONQUITIS VARIANTE)", proveedor: "MSD", patologia: "BRONQUITIS VARIANTE", presentacion: "5000", via_aplicacion: "AGUA/SPRAY", precio: 45538.00 },
  { cod: 206, detalle: "SPHEREON IB MA5 X 10000 DS", proveedor: "MSD", patologia: "BRONQUITIS MASS", presentacion: "10000", via_aplicacion: "AGUA/SPRAY", precio: 39286.00 },
  { cod: 58, detalle: "SPHEREON IB MA5 X 5000 DS", proveedor: "MSD", patologia: "BRONQUITIS MASS", presentacion: "5000", via_aplicacion: "AGUA/SPRAY", precio: 39286.00 },
  { cod: 204, detalle: "UNIVAX BD X 5000 DS", proveedor: "MSD", patologia: "GUMBORO", presentacion: "5000", via_aplicacion: "AGUA", precio: 1.00 },
  { cod: 148, detalle: "BIO COCCIVET R", proveedor: "VAXXINOVA", patologia: "COCCIDIOS", presentacion: "1000", via_aplicacion: "SPRAY", precio: 1.00 },
  { cod: 144, detalle: "BURSINE-2 X 5000 DS", proveedor: "ZOETIS", patologia: "GUMBORO", presentacion: "5000", via_aplicacion: "AGUA", precio: 1.00 },
  { cod: 48, detalle: "NEWCASTLE B1 BRONQUITIS MASS X 1.000 DS", proveedor: "ZOETIS", patologia: "NW+BR", presentacion: "1000", via_aplicacion: "SPRAY", precio: 11760.00 },
  { cod: 138, detalle: "NEWCASTLE B1 BRONQUITIS MASS X 10.000 DS", proveedor: "ZOETIS", patologia: "NW+BR", presentacion: "10000", via_aplicacion: "SPRAY", precio: 41069.00 },
  { cod: 46, detalle: "POULVAC E.COLI X 5000 DS (E.COLI)", proveedor: "ZOETIS", patologia: "E.COLI", presentacion: "5000", via_aplicacion: "IM", precio: 76946.00 },
  { cod: 47, detalle: "POULVAC I CORIZA ABC OIL X 1000 DS (CORIZA)", proveedor: "ZOETIS", patologia: "CORIZA", presentacion: "1000", via_aplicacion: "IM", precio: 40022.00 },
  { cod: 49, detalle: "POULVAC MIX 6 X 1000 DS (CUADRUPLE)", proveedor: "ZOETIS", patologia: "CORIZA-NW-BR-EDS", presentacion: "1000", via_aplicacion: "IM", precio: 114506.00 },
  { cod: 36, detalle: "POXINE X 1000 DS (VIRUELA)", proveedor: "ZOETIS", patologia: "VIRUELA", presentacion: "1000", via_aplicacion: "PUNCION ALAR", precio: 20076.00 }
];

// Configuración de headers para autenticación (simulamos usuario admin)
const headers = {
  'Content-Type': 'application/json',
  'Cookie': 'usuario=admin' // Esto debería ser configurado según tu sistema de auth
};

async function crearElemento(endpoint, data) {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, data, { headers });
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      // Elemento ya existe
      return null;
    }
    console.log(`⚠️  Error creando ${endpoint}:`, data.nombre || data.codigo, error.response?.data || error.message);
    return null;
  }
}

async function obtenerElementos(endpoint) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
    return response.data.data || response.data;
  } catch (error) {
    console.log(`⚠️  Error obteniendo ${endpoint}:`, error.response?.data || error.message);
    return [];
  }
}

async function importarDatos() {
  console.log('🚀 Iniciando importación de datos de vacunas via API...');

  try {
    // 1. Extraer y crear proveedores únicos
    const proveedoresUnicos = [...new Set(vacunasData.map(v => v.proveedor))];
    console.log(`📦 Procesando ${proveedoresUnicos.length} proveedores...`);
    
    const proveedoresExistentes = await obtenerElementos('/proveedores');
    const proveedoresMap = {};
    
    for (const proveedor of proveedoresExistentes) {
      proveedoresMap[proveedor.nombre] = proveedor.id_proveedor;
      proveedoresMap[proveedor.razon_social] = proveedor.id_proveedor;
    }

    for (const nombreProveedor of proveedoresUnicos) {
      if (!proveedoresMap[nombreProveedor]) {
        const nuevoProveedor = await crearElemento('/proveedores', {
          nombre: nombreProveedor,
          razon_social: nombreProveedor,
          tipo_producto: 'vacunas',
          activo: true
        });
        
        if (nuevoProveedor) {
          proveedoresMap[nombreProveedor] = nuevoProveedor.id_proveedor;
          console.log(`   ✅ Creado proveedor: ${nombreProveedor}`);
        }
      } else {
        console.log(`   ♻️  Proveedor existente: ${nombreProveedor}`);
      }
    }

    // 2. Crear patologías
    const patologiasUnicas = [...new Set(vacunasData.map(v => v.patologia).filter(p => p && p.trim() !== ''))];
    console.log(`🦠 Procesando ${patologiasUnicas.length} patologías...`);
    
    const patologiasExistentes = await obtenerElementos('/catalogos/patologias');
    const patologiasMap = {};
    
    for (const patologia of patologiasExistentes) {
      patologiasMap[patologia.nombre] = patologia.id_patologia;
    }

    for (const nombrePatologia of patologiasUnicas) {
      if (!patologiasMap[nombrePatologia]) {
        // Generar código simple para la patología
        const codigo = nombrePatologia.substring(0, 10).toUpperCase().replace(/\s+/g, '');
        
        const nuevaPatologia = await crearElemento('/catalogos/patologias', {
          codigo: codigo,
          nombre: nombrePatologia,
          descripcion: `Patología: ${nombrePatologia}`,
          activo: true
        });
        
        if (nuevaPatologia) {
          patologiasMap[nombrePatologia] = nuevaPatologia.id_patologia;
          console.log(`   ✅ Creada patología: ${nombrePatologia}`);
        }
      } else {
        console.log(`   ♻️  Patología existente: ${nombrePatologia}`);
      }
    }

    // 3. Crear presentaciones
    const presentacionesUnicas = [...new Set(vacunasData.map(v => v.presentacion).filter(p => p && p.trim() !== ''))];
    console.log(`💊 Procesando ${presentacionesUnicas.length} presentaciones...`);
    
    const presentacionesExistentes = await obtenerElementos('/catalogos/presentaciones');
    const presentacionesMap = {};
    
    for (const presentacion of presentacionesExistentes) {
      presentacionesMap[presentacion.nombre] = presentacion.id_presentacion;
    }

    for (const nombrePresentacion of presentacionesUnicas) {
      const nombreCompleto = `${nombrePresentacion} dosis`;
      if (!presentacionesMap[nombreCompleto]) {
        // Generar código simple para la presentación
        const codigo = `P${nombrePresentacion}`;
        
        const nuevaPresentacion = await crearElemento('/catalogos/presentaciones', {
          codigo: codigo,
          nombre: nombreCompleto,
          descripcion: `Presentación de ${nombrePresentacion} dosis`,
          unidad_medida: 'dosis',
          volumen_dosis: parseFloat(nombrePresentacion) || null,
          activo: true
        });
        
        if (nuevaPresentacion) {
          presentacionesMap[nombreCompleto] = nuevaPresentacion.id_presentacion;
          console.log(`   ✅ Creada presentación: ${nombreCompleto}`);
        }
      } else {
        console.log(`   ♻️  Presentación existente: ${nombreCompleto}`);
      }
      
      // También mapear por el nombre original
      presentacionesMap[nombrePresentacion] = presentacionesMap[nombreCompleto];
    }

    // 4. Crear vías de aplicación
    const viasUnicas = [...new Set(vacunasData.map(v => v.via_aplicacion).filter(v => v && v.trim() !== ''))];
    console.log(`💉 Procesando ${viasUnicas.length} vías de aplicación...`);
    
    const viasExistentes = await obtenerElementos('/catalogos/vias-aplicacion');
    const viasMap = {};
    
    for (const via of viasExistentes) {
      viasMap[via.nombre] = via.id_via_aplicacion;
    }

    for (const nombreVia of viasUnicas) {
      if (!viasMap[nombreVia]) {
        // Determinar abreviación y descripción
        let abreviacion = nombreVia;
        let descripcion = nombreVia;
        let codigo = nombreVia.substring(0, 5).toUpperCase().replace(/\s+/g, '');
        
        switch(nombreVia) {
          case 'SC':
            abreviacion = 'SC';
            descripcion = 'Subcutánea';
            codigo = 'SC';
            break;
          case 'IM':
            abreviacion = 'IM';
            descripcion = 'Intramuscular';
            codigo = 'IM';
            break;
          case 'AGUA':
            abreviacion = 'AGUA';
            descripcion = 'Vía oral en agua de bebida';
            codigo = 'AGUA';
            break;
          case 'SPRAY':
            abreviacion = 'SPRAY';
            descripcion = 'Aspersión/Pulverización';
            codigo = 'SPRAY';
            break;
          case 'GOTA OCULAR':
            abreviacion = 'GO';
            descripcion = 'Gota ocular';
            codigo = 'GO';
            break;
          case 'PUNCION ALAR':
            abreviacion = 'PA';
            descripcion = 'Punción en el ala';
            codigo = 'PA';
            break;
          case 'AGUA/SPRAY':
            abreviacion = 'AS';
            descripcion = 'Agua de bebida o spray';
            codigo = 'AS';
            break;
        }

        const nuevaVia = await crearElemento('/catalogos/vias-aplicacion', {
          codigo: codigo,
          nombre: nombreVia,
          descripcion: descripcion,
          abreviacion: abreviacion,
          activo: true
        });
        
        if (nuevaVia) {
          viasMap[nombreVia] = nuevaVia.id_via_aplicacion;
          console.log(`   ✅ Creada vía: ${nombreVia}`);
        }
      } else {
        console.log(`   ♻️  Vía existente: ${nombreVia}`);
      }
    }

    // 5. Crear las vacunas
    console.log(`💉 Procesando ${vacunasData.length} vacunas...`);
    
    const vacunasExistentes = await obtenerElementos('/vacunas');
    const vacunasExistentesMap = {};
    for (const vacuna of vacunasExistentes) {
      vacunasExistentesMap[vacuna.codigo] = vacuna;
    }

    let vacunasCreadas = 0;
    let vacunasYaExistentes = 0;

    for (const vacunaData of vacunasData) {
      const codigoStr = vacunaData.cod.toString();
      
      if (!vacunasExistentesMap[codigoStr]) {
        const datosVacuna = {
          codigo: codigoStr,
          nombre: vacunaData.detalle,
          detalle: `Vacuna ${vacunaData.detalle} - ${vacunaData.patologia || 'Sin patología específica'}`,
          id_proveedor: proveedoresMap[vacunaData.proveedor],
          id_patologia: vacunaData.patologia ? patologiasMap[vacunaData.patologia] : null,
          id_presentacion: vacunaData.presentacion ? presentacionesMap[vacunaData.presentacion] : null,
          id_via_aplicacion: vacunaData.via_aplicacion ? viasMap[vacunaData.via_aplicacion] : null,
          precio_lista: vacunaData.precio,
          activa: true
        };

        const nuevaVacuna = await crearElemento('/vacunas', datosVacuna);
        
        if (nuevaVacuna) {
          console.log(`   ✅ Creada vacuna: ${codigoStr} - ${vacunaData.detalle}`);
          vacunasCreadas++;
        }
      } else {
        console.log(`   ♻️  Vacuna existente: ${codigoStr} - ${vacunaData.detalle}`);
        vacunasYaExistentes++;
      }
    }

    console.log('\n🎉 IMPORTACIÓN COMPLETADA VIA API:');
    console.log(`   📦 Proveedores procesados: ${proveedoresUnicos.length}`);
    console.log(`   🦠 Patologías procesadas: ${patologiasUnicas.length}`);
    console.log(`   💊 Presentaciones procesadas: ${presentacionesUnicas.length}`);
    console.log(`   💉 Vías aplicación procesadas: ${viasUnicas.length}`);
    console.log(`   ✅ Vacunas creadas: ${vacunasCreadas}`);
    console.log(`   ♻️  Vacunas ya existentes: ${vacunasYaExistentes}`);
    console.log(`   📊 Total vacunas: ${vacunasCreadas + vacunasYaExistentes}`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    throw error;
  }
}

// Ejecutar la importación
if (require.main === module) {
  importarDatos()
    .then(() => {
      console.log('✅ Importación finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la importación:', error);
      process.exit(1);
    });
}

module.exports = { importarDatos };