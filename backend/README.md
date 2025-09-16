# Backend v2 - Migración a Prisma

## 🎯 Objetivo
Migración gradual del backend actual (MySQL2) a Prisma, manteniendo **exactamente** las mismas rutas y endpoints.

## ✅ Fase 1 Completada - Setup Inicial
- ✅ Configuración base de Prisma
- ✅ Schema completo basado en BD actual (14 tablas)
- ✅ Estructura de carpetas idéntica al backend original
- ✅ Rutas base configuradas
- ✅ Auth controller migrado a Prisma
- ✅ Middleware de autenticación copiado

## 🔄 Rutas Disponibles
- `/auth` - ✅ **MIGRADO** (login, logout, me)
- `/clientes` - ⏳ Pendiente (Fase 2)
- `/productos` - ⏳ Pendiente (Fase 2)
- `/pedidos` - ⏳ Pendiente (Fase 2)
- `/proveedores` - ⏳ Pendiente (Fase 2)

## 🚀 Cómo probar
```bash
# Desarrollo
npm run dev

# Producción
npm start

# Prisma Studio (ver BD)
npm run prisma:studio
```

## 📋 Siguiente: Fase 2
1. Migrar controladores de clientes
2. Migrar controladores de productos/proveedores
3. Migrar controladores de pedidos (más complejo)
4. Migrar auditoría y configuraciones

## ⚠️ Importante
- **NO modificar** el backend original
- **NO modificar** el frontend
- Mantener exactamente las mismas rutas y respuestas JSON
- Base de datos existente: `sistema_pedidos`
