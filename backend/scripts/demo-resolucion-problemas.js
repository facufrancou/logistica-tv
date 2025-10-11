/**
 * Script de demostración para mostrar la resolución automática
 * de problemas de stock detectados por el sistema de alertas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Demo: Resolución automática de problemas de stock\n');

  const cotizacionId = 36; // Cotización con problemas detectados

  try {
    // 1. Verificar problemas actuales
    console.log('1️⃣ Verificando problemas actuales...');
    const response = await fetch(`http://localhost:3001/cotizaciones/${cotizacionId}/verificar-lotes`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const verificacion = await response.json();
    const { resumen, problemas } = verificacion.data;
    
    console.log(`   📊 Total calendarios: ${resumen.total_calendarios}`);
    console.log(`   🚨 Con problemas: ${resumen.calendarios_con_problemas}`);
    console.log(`   ✅ Sin problemas: ${resumen.calendarios_sin_problemas}\n`);

    if (problemas.length === 0) {
      console.log('🎉 ¡No hay problemas que resolver!');
      return;
    }

    // 2. Intentar resolución automática
    console.log('2️⃣ Intentando resolución automática...\n');
    
    for (const problema of problemas) {
      console.log(`🔧 Resolviendo Semana ${problema.semana}:`);
      
      const tieneProblemaStock = problema.problemas.some(p => 
        p.tipo === 'sin_lote' || p.tipo === 'cantidad_insuficiente'
      );
      
      if (tieneProblemaStock) {
        try {
          // Intentar reasignación automática
          const reasignResponse = await fetch(
            `http://localhost:3001/cotizaciones/calendario/${problema.id_calendario}/reasignar-lote`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            }
          );

          if (reasignResponse.ok) {
            const result = await reasignResponse.json();
            if (result.success) {
              console.log(`   ✅ Reasignación exitosa: Lote ${result.data.lote}`);
              console.log(`   📅 Vencimiento: ${result.data.fecha_vencimiento}`);
              console.log(`   📦 Stock disponible: ${result.data.stock_disponible}`);
            } else {
              console.log(`   ❌ Fallo en reasignación: ${result.message}`);
              
              // Si la reasignación automática falla, intentar multi-lote
              console.log(`   🔄 Intentando asignación multi-lote...`);
              
              const multiResponse = await fetch(
                `http://localhost:3001/cotizaciones/calendario/${problema.id_calendario}/asignar-multilote`,
                {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cantidad_requerida: problema.cantidad_requerida
                  })
                }
              );

              if (multiResponse.ok) {
                const multiResult = await multiResponse.json();
                if (multiResult.success) {
                  console.log(`   ✅ Multi-lote exitoso: ${multiResult.data.lotes_asignados.length} lotes`);
                  multiResult.data.lotes_asignados.forEach((lote, index) => {
                    console.log(`      ${index + 1}. Lote ${lote.lote}: ${lote.cantidad_asignada} dosis`);
                  });
                }
              }
            }
          }
        } catch (error) {
          console.log(`   ❌ Error en resolución: ${error.message}`);
        }
      }
      
      // Verificar problemas de vencimiento
      const tieneProblemaVencimiento = problema.problemas.some(p => p.tipo === 'lote_vencido');
      if (tieneProblemaVencimiento) {
        console.log(`   ⚠️  Problema de vencimiento detectado - requiere intervención manual`);
      }
      
      console.log('');
    }

    // 3. Verificar estado después de la resolución
    console.log('3️⃣ Verificando estado después de la resolución...');
    
    const responsePost = await fetch(`http://localhost:3001/cotizaciones/${cotizacionId}/verificar-lotes`, {
      credentials: 'include'
    });
    
    if (responsePost.ok) {
      const verificacionPost = await responsePost.json();
      const resumenPost = verificacionPost.data.resumen;
      const problemasPost = verificacionPost.data.problemas;
      
      console.log(`   📊 Resultados finales:`);
      console.log(`   ✅ Sin problemas: ${resumenPost.calendarios_sin_problemas}`);
      console.log(`   🚨 Con problemas: ${resumenPost.calendarios_con_problemas}`);
      
      if (problemasPost.length > 0) {
        console.log(`\n   🔍 Problemas restantes:`);
        problemasPost.forEach(p => {
          console.log(`   - Semana ${p.semana}: ${p.problemas.map(pr => pr.mensaje).join(', ')}`);
        });
      } else {
        console.log(`\n   🎉 ¡Todos los problemas han sido resueltos!`);
      }
    }

    // 4. Mostrar estadísticas de mejora
    const problemasIniciales = resumen.calendarios_con_problemas;
    const problemasFinales = verificacionPost ? verificacionPost.data.resumen.calendarios_con_problemas : problemasIniciales;
    const problemasResueltos = problemasIniciales - problemasFinales;
    
    console.log(`\n📈 ESTADÍSTICAS DE RESOLUCIÓN:`);
    console.log(`   🔧 Problemas resueltos: ${problemasResueltos}/${problemasIniciales}`);
    console.log(`   📊 Tasa de éxito: ${Math.round((problemasResueltos / problemasIniciales) * 100)}%`);
    
    if (problemasFinales === 0) {
      console.log(`   🏆 Estado final: PERFECTO - Todos los lotes están correctamente asignados`);
    } else {
      console.log(`   ⚠️  Estado final: ${problemasFinales} problemas requieren atención manual`);
    }

  } catch (error) {
    console.error('❌ Error en la demo:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    console.log('\n🏁 Demo completada');
  });