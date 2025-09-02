const app = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend v2 (Prisma) corriendo en http://localhost:${PORT}`);
  console.log(`📊 Prisma Studio: npx prisma studio`);
});
