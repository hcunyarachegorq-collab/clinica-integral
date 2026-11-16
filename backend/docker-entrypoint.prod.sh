#!/bin/sh
set -e

echo "[Clinica Backend Prod] Sincronizando esquema de base de datos con Prisma..."
npx prisma db push --skip-generate

echo "[Clinica Backend Prod] Iniciando servidor Express..."
exec node dist/index.js
