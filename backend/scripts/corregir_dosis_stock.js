/**
 * Script para corregir cálculos de dosis en stock_vacuna
 * Ejecutar con: node scripts/corregir_dosis_stock.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirDosisStock() {
  try {
    console.log('Iniciando corrección de dosis en stock_vacuna...\n');

    // Obtener todos los registros de stock con su información de presentación
    const stockVacunas = await prisma.stockVacuna.findMany({
      include: {
        vacuna: {
          include: {
            presentacion: {
              select: {
                dosis_por_frasco: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    console.log(`Se encontraron ${stockVacunas.length} registros de stock.\n`);

    let corregidos = 0;
    let sinProblemas = 0;

    for (const stock of stockVacunas) {
      const dosisPorFrasco = stock.vacuna.presentacion?.dosis_por_frasco || 1;
      
      // Calcular lo que deberían ser los valores correctos
      const frascosActuales = Math.floor(stock.stock_actual / dosisPorFrasco);
      const stockActualCorrecto = frascosActuales * dosisPorFrasco;
      
      const frascosReservados = Math.floor(stock.stock_reservado / dosisPorFrasco);
      const stockReservadoCorrecto = frascosReservados * dosisPorFrasco;
      
      // Verificar si hay diferencia
      const dosisActualesSobrantes = stock.stock_actual % dosisPorFrasco;
      const dosisReservadasSobrantes = stock.stock_reservado % dosisPorFrasco;
      
      if (dosisActualesSobrantes !== 0 || dosisReservadasSobrantes !== 0) {
        console.log(`❌ Registro ID ${stock.id_stock_vacuna} - ${stock.vacuna.nombre} (Lote: ${stock.lote})`);
        console.log(`   Dosis por frasco: ${dosisPorFrasco}`);
        console.log(`   Stock actual: ${stock.stock_actual} → ${stockActualCorrecto} (${dosisActualesSobrantes} dosis sobrantes)`);
        console.log(`   Stock reservado: ${stock.stock_reservado} → ${stockReservadoCorrecto} (${dosisReservadasSobrantes} dosis sobrantes)`);
        
        // DESCOMENTAR para aplicar la corrección:
        // await prisma.stockVacuna.update({
        //   where: { id_stock_vacuna: stock.id_stock_vacuna },
        //   data: {
        //     stock_actual: stockActualCorrecto,
        //     stock_reservado: stockReservadoCorrecto
        //   }
        // });
        // console.log(`   ✅ Corregido\n`);
        
        console.log(`   ⚠️  No corregido (modo de prueba)\n`);
        corregidos++;
      } else {
        sinProblemas++;
      }
    }

    console.log('\n=================================');
    console.log(`Resumen:`);
    console.log(`  Registros corregidos: ${corregidos}`);
    console.log(`  Registros sin problemas: ${sinProblemas}`);
    console.log(`  Total procesados: ${stockVacunas.length}`);
    console.log('=================================\n');

  } catch (error) {
    console.error('Error al corregir dosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corregirDosisStock();
