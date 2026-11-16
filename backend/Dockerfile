FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma en Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Copiar manifiestos y esquema de base de datos
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Generar cliente de Prisma para el entorno Linux
RUN npx prisma generate

# Copiar el código fuente
COPY . .

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
