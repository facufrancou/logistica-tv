const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarUsuarios() {
  console.log('🔍 Verificando usuarios disponibles...\n');

  try {
    const usuarios = await prisma.usuario.findMany({
      take: 5,
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        activo: true
      }
    });

    if (usuarios.length === 0) {
      console.log('❌ No se encontraron usuarios en la base de datos');
    } else {
      console.log(`✅ Se encontraron ${usuarios.length} usuarios:`);
      usuarios.forEach(user => {
        console.log(`   - ID: ${user.id_usuario}, Email: ${user.email}, Nombre: ${user.nombre}, Activo: ${user.activo}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarUsuarios();