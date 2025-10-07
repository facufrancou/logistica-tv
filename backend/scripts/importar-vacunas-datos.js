const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function importarDatos() {
  console.log('🚀 Iniciando importación de datos de vacunas...');

  try {
    // 1. Extraer y crear proveedores únicos
    const proveedoresUnicos = [...new Set(vacunasData.map(v => v.proveedor))];
    console.log(`📦 Creando ${proveedoresUnicos.length} proveedores...`);
    
    const proveedoresMap = {};
    for (const nombreProveedor of proveedoresUnicos) {
      // Verificar si ya existe
      let proveedor = await prisma.proveedor.findFirst({
        where: { 
          nombre: nombreProveedor
        }
      });

      if (!proveedor) {
        proveedor = await prisma.proveedor.create({
          data: {
            nombre: nombreProveedor,
            activo: true,
            created_by: 1
          }
        });
        console.log(`   ✅ Creado proveedor: ${nombreProveedor}`);
      } else {
        console.log(`   ♻️  Proveedor existente: ${nombreProveedor}`);
      }
      
      proveedoresMap[nombreProveedor] = proveedor.id_proveedor;
    }

    // 2. Extraer y crear patologías únicas
    const patologiasUnicas = [...new Set(vacunasData.map(v => v.patologia).filter(p => p && p.trim() !== ''))];
    console.log(`🦠 Creando ${patologiasUnicas.length} patologías...`);
    
    const patologiasMap = {};
    for (let i = 0; i < patologiasUnicas.length; i++) {
      const nombrePatologia = patologiasUnicas[i];
      let patologia = await prisma.patologia.findFirst({
        where: { nombre: nombrePatologia }
      });

      if (!patologia) {
        // Generar código único usando índice para evitar conflictos
        const codigoBase = nombrePatologia.substring(0, 8).toUpperCase().replace(/\s+/g, '');
        const codigo = `${codigoBase}_${String(i + 1).padStart(2, '0')}`;
        
        patologia = await prisma.patologia.create({
          data: {
            codigo: codigo,
            nombre: nombrePatologia,
            descripcion: `Patología: ${nombrePatologia}`,
            activa: true,
            created_by: 1
          }
        });
        console.log(`   ✅ Creada patología: ${nombrePatologia} (${codigo})`);
      } else {
        console.log(`   ♻️  Patología existente: ${nombrePatologia}`);
      }
      
      patologiasMap[nombrePatologia] = patologia.id_patologia;
    }

    // 3. Extraer y crear presentaciones únicas
    const presentacionesUnicas = [...new Set(vacunasData.map(v => v.presentacion).filter(p => p && p.trim() !== ''))];
    console.log(`💊 Creando ${presentacionesUnicas.length} presentaciones...`);
    
    const presentacionesMap = {};
    for (let i = 0; i < presentacionesUnicas.length; i++) {
      const nombrePresentacion = presentacionesUnicas[i];
      let presentacion = await prisma.presentacion.findFirst({
        where: { nombre: `${nombrePresentacion} dosis` }
      });

      if (!presentacion) {
        // Generar código único
        const codigo = `DOSIS_${nombrePresentacion}_${String(i + 1).padStart(2, '0')}`;
        
        presentacion = await prisma.presentacion.create({
          data: {
            codigo: codigo,
            nombre: `${nombrePresentacion} dosis`,
            descripcion: `Presentación de ${nombrePresentacion} dosis`,
            unidad_medida: 'dosis',
            activa: true,
            created_by: 1
          }
        });
        console.log(`   ✅ Creada presentación: ${nombrePresentacion} dosis (${codigo})`);
      } else {
        console.log(`   ♻️  Presentación existente: ${nombrePresentacion} dosis`);
      }
      
      presentacionesMap[nombrePresentacion] = presentacion.id_presentacion;
    }

    // 4. Extraer y crear vías de aplicación únicas
    const viasUnicas = [...new Set(vacunasData.map(v => v.via_aplicacion).filter(v => v && v.trim() !== ''))];
    console.log(`💉 Creando ${viasUnicas.length} vías de aplicación...`);
    
    const viasMap = {};
    for (let i = 0; i < viasUnicas.length; i++) {
      const nombreVia = viasUnicas[i];
      let via = await prisma.viaAplicacion.findFirst({
        where: { nombre: nombreVia }
      });

      if (!via) {
        // Determinar código y descripción
        let codigo = nombreVia.replace(/\s+/g, '_').toUpperCase();
        let descripcion = nombreVia;
        
        switch(nombreVia) {
          case 'SC':
            codigo = 'SC';
            descripcion = 'Subcutánea';
            break;
          case 'IM':
            codigo = 'IM';
            descripcion = 'Intramuscular';
            break;
          case 'AGUA':
            codigo = 'AGUA';
            descripcion = 'Vía oral en agua de bebida';
            break;
          case 'SPRAY':
            codigo = 'SPRAY';
            descripcion = 'Aspersión/Pulverización';
            break;
          case 'GOTA OCULAR':
            codigo = 'GO';
            descripcion = 'Gota ocular';
            break;
          case 'PUNCION ALAR':
            codigo = 'PA';
            descripcion = 'Punción en el ala';
            break;
          case 'AGUA/SPRAY':
            codigo = 'AS';
            descripcion = 'Agua de bebida o spray';
            break;
          default:
            codigo = `VIA_${String(i + 1).padStart(2, '0')}`;
            break;
        }

        via = await prisma.viaAplicacion.create({
          data: {
            codigo: codigo,
            nombre: nombreVia,
            descripcion: descripcion,
            activa: true,
            created_by: 1
          }
        });
        console.log(`   ✅ Creada vía: ${nombreVia} (${codigo})`);
      } else {
        console.log(`   ♻️  Vía existente: ${nombreVia}`);
      }
      
      viasMap[nombreVia] = via.id_via_aplicacion;
    }

    // 5. Crear las vacunas
    console.log(`💉 Creando ${vacunasData.length} vacunas...`);
    
    let vacunasCreadas = 0;
    let vacunasExistentes = 0;

    for (const vacunaData of vacunasData) {
      // Verificar si la vacuna ya existe por código
      let vacuna = await prisma.vacuna.findFirst({
        where: { codigo: vacunaData.cod.toString() }
      });

      if (!vacuna) {
        // Validar que existan las relaciones necesarias
        if (!proveedoresMap[vacunaData.proveedor]) {
          console.log(`   ❌ Error: Proveedor no encontrado: ${vacunaData.proveedor}`);
          continue;
        }
        
        if (!vacunaData.patologia || !patologiasMap[vacunaData.patologia]) {
          console.log(`   ❌ Error: Patología no encontrada para vacuna ${vacunaData.cod}: ${vacunaData.patologia}`);
          continue;
        }
        
        if (!vacunaData.presentacion || !presentacionesMap[vacunaData.presentacion]) {
          console.log(`   ❌ Error: Presentación no encontrada para vacuna ${vacunaData.cod}: ${vacunaData.presentacion}`);
          continue;
        }
        
        if (!vacunaData.via_aplicacion || !viasMap[vacunaData.via_aplicacion]) {
          console.log(`   ❌ Error: Vía de aplicación no encontrada para vacuna ${vacunaData.cod}: ${vacunaData.via_aplicacion}`);
          continue;
        }

        const datosVacuna = {
          codigo: vacunaData.cod.toString(),
          nombre: vacunaData.detalle,
          detalle: `Vacuna ${vacunaData.detalle} - ${vacunaData.patologia}`,
          id_proveedor: proveedoresMap[vacunaData.proveedor],
          id_patologia: patologiasMap[vacunaData.patologia],
          id_presentacion: presentacionesMap[vacunaData.presentacion],
          id_via_aplicacion: viasMap[vacunaData.via_aplicacion],
          precio_lista: vacunaData.precio,
          activa: true,
          created_by: 1
        };

        vacuna = await prisma.vacuna.create({
          data: datosVacuna
        });
        
        console.log(`   ✅ Creada vacuna: ${vacunaData.cod} - ${vacunaData.detalle}`);
        vacunasCreadas++;
      } else {
        console.log(`   ♻️  Vacuna existente: ${vacunaData.cod} - ${vacunaData.detalle}`);
        vacunasExistentes++;
      }
    }

    console.log('\n🎉 IMPORTACIÓN COMPLETADA:');
    console.log(`   📦 Proveedores: ${proveedoresUnicos.length}`);
    console.log(`   🦠 Patologías: ${patologiasUnicas.length}`);
    console.log(`   💊 Presentaciones: ${presentacionesUnicas.length}`);
    console.log(`   💉 Vías aplicación: ${viasUnicas.length}`);
    console.log(`   ✅ Vacunas creadas: ${vacunasCreadas}`);
    console.log(`   ♻️  Vacunas existentes: ${vacunasExistentes}`);
    console.log(`   📊 Total vacunas: ${vacunasCreadas + vacunasExistentes}`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
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