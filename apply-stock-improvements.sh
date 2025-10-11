#!/bin/bash

# Script para aplicar las mejoras de asignación de stock FIFO
# Ejecuta las migraciones y regenera el cliente Prisma

echo "=== Aplicando mejoras de asignación de stock FIFO ==="

# Cambiar al directorio del backend
cd /c/Users/Facu/Desktop/logistica-tv/backend

echo "1. Aplicando migración de esquema de base de datos..."
mysql -u root -p logistica_tv < migrations/add_stock_assignment_fields.sql

echo "2. Regenerando cliente Prisma..."
npx prisma generate

echo "3. Verificando esquema..."
npx prisma db pull

echo "=== Mejoras aplicadas exitosamente ==="
echo ""
echo "Nuevas funcionalidades:"
echo "- ✅ Asignación automática de lotes con lógica FIFO"
echo "- ✅ Validación de fechas de vencimiento"
echo "- ✅ Información de lote en calendarios de vacunación"
echo "- ✅ Información de lote en remitos de entrega"
echo "- ✅ Seguimiento completo de stock reservado"
echo ""
echo "Próximos pasos:"
echo "1. Reiniciar el servidor backend"
echo "2. Probar la creación de nuevas cotizaciones"
echo "3. Verificar que los lotes se asignen correctamente"
echo "4. Revisar que los remitos incluyan información de lotes"