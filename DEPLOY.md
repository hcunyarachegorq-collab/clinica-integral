# 🚀 Guía de Despliegue en Producción (Linux VPS)
## Sistema Clínico Integral • Monorepo Docker + Nginx + SSL + Flutter

Esta guía detalla el procedimiento paso a paso para desplegar todo el sistema clínico en un servidor Linux VPS (Ubuntu 22.04 / 24.04 LTS) con dominio propio, certificado SSL/HTTPS gratuito emitido por Let's Encrypt y conexión con la aplicación móvil Flutter.

---

## 🏛️ Arquitectura en Producción

```
                           [ Internet / Usuarios ]
                                      │
                         HTTP (80) / HTTPS (443)
                                      ▼
                      ┌───────────────────────────────┐
                      │    Nginx 1.27 (Reverse Proxy) │
                      │  - SSL / TLS 1.2 & 1.3        │
                      │  - Gzip & Cabeceras Seguras   │
                      │  - Max Body: 15MB (Adjuntos)  │
                      └──────────────┬────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │       clinica_web       │             │     clinica_backend     │
    │     Next.js 14 (Prod)   │             │   Express API + Prisma  │
    │    Puerto interno 3000  │             │    Puerto interno 4000  │
    └─────────────────────────┘             └────────────┬────────────┘
                                                         │
                                                         ▼
                                            ┌─────────────────────────┐
                                            │       clinica_db        │
                                            │   PostgreSQL 16 Alpine  │
                                            │   Puerto interno 5432   │
                                            │ (Sin exposición pública)│
                                            └─────────────────────────┘
```

> [!IMPORTANT]
> **Seguridad de Red:** En producción, únicamente **Nginx** expone los puertos `80` y `443` a Internet. La base de datos PostgreSQL, la API Express y el contenedor Next.js se ejecutan en una red interna privada de Docker (`clinica_prod_net`), protegidos de escaneos o accesos externos no autorizados.

---

## 📋 Requisitos Previos

1. **Servidor VPS:**
   * Sistema Operativo: **Ubuntu 22.04 LTS** o **24.04 LTS** (DigitalOcean, AWS EC2, Linode, Hetzner, etc.).
   * Recursos mínimos: **2 GB de RAM** (o 1 GB RAM + 2 GB Swap), 1 vCPU, 25 GB SSD.
2. **Dominio Propio:**
   * Un dominio o subdominio registrado (ejemplo: `clinica.tudominio.com`).
   * **Registro DNS tipo A:** Apuntando a la dirección IPv4 pública de tu VPS.
3. **Puertos Abiertos en el Firewall del VPS:**
   * `22` (SSH para administración)
   * `80` (HTTP para validación de certificados y redirección)
   * `443` (HTTPS para tráfico cifrado seguro)

---

## 🛠️ Paso 1: Preparación del VPS e Instalación de Docker

Conéctate a tu servidor mediante SSH:

```bash
ssh usuario@ip-de-tu-vps
```

### 1.1. Actualizar el sistema y configurar memoria Swap (si tienes 1GB o 2GB de RAM)

```bash
sudo apt update && sudo apt upgrade -y

# Si tu VPS tiene 1GB o 2GB de RAM, crea 2GB de Swap para evitar OOM al compilar Next.js:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.2. Instalar Docker Engine y Docker Compose

```bash
# Instalar dependencias previas
sudo apt install -y ca-certificates curl gnupg lsb-release

# Agregar llave GPG oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Agregar repositorio oficial
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker y plugin de Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agregar usuario al grupo docker (opcional para no usar sudo siempre)
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3. Configurar Firewall UFW en Ubuntu

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 📂 Paso 2: Clonar el Repositorio y Configurar Variables

```bash
# Clonar el proyecto en el servidor
git clone https://github.com/hcunyarachegorq-collab/clinica-integral.git /var/www/clinica
cd /var/www/clinica

# Crear el archivo de entorno de producción
cp .env.prod.example .env.prod
```

Edita `.env.prod` con tu editor preferido (`nano .env.prod`) y define tus credenciales reales:

```env
DOMAIN=clinica.tudominio.com
CERTBOT_EMAIL=admin@tudominio.com

POSTGRES_USER=clinica_prod_user
POSTGRES_PASSWORD=ClaveUltraSegura2026_xyz123!
POSTGRES_DB=clinica_prod_db

JWT_SECRET=super_secret_jwt_key_production_2026_minimo_32_caracteres_aleatorios

CORS_ORIGIN=https://clinica.tudominio.com
NEXT_PUBLIC_API_URL=/api
```

---

## 🔒 Paso 3: Emisión de Certificado SSL Gratuito con Let's Encrypt

Para emitir el certificado SSL por primera vez sin errores de Nginx, sigue este procedimiento de 3 etapas:

### 3.1. Iniciar servicios en modo HTTP inicial (Puerto 80)

El archivo `nginx/nginx.conf` ya viene configurado para responder en el puerto 80 y servir los retos de Certbot en `/.well-known/acme-challenge/`.

Levanta los contenedores:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Verifica que Nginx esté corriendo:

```bash
docker compose -f docker-compose.prod.yml ps
```

### 3.2. Solicitar el certificado con Certbot

Ejecuta el siguiente comando reemplazando con tu dominio y correo:

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  -d clinica.tudominio.com \
  --email admin@tudominio.com \
  --agree-tos --no-eff-email --force-renewal" certbot
```

> [!NOTE]
> Tras la ejecución exitosa, Certbot guardará los certificados en `/etc/letsencrypt/live/clinica.tudominio.com/` (en el volumen persistente `certbot_conf`).

### 3.3. Activar HTTPS en `nginx/nginx.conf`

Abre `nginx/nginx.conf` con `nano nginx/nginx.conf`:
1. En el bloque `server` del puerto 80, reemplaza el contenido o añade la redirección a HTTPS:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name clinica.tudominio.com;

       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }

       location / {
           return 301 https://$host$request_uri;
       }
   }
   ```
2. Descomenta el bloque `server` del puerto 443 (al final del archivo) y reemplaza `tu-dominio.com` por tu dominio real (ej. `clinica.tudominio.com`).

3. Recarga Nginx sin interrumpir el servicio:
   ```bash
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

¡Tu plataforma web y API REST ya están operando con **HTTPS y candado verde**! 🔒

---

## 🩺 Paso 4: Verificación y Health Check

Prueba la disponibilidad de los servicios en producción:

```bash
# 1. Comprobar API Backend y Base de Datos PostgreSQL
curl -s -i https://clinica.tudominio.com/api/health

# Respuesta esperada:
# HTTP/2 200
# content-type: application/json; charset=utf-8
# {"status":"ok","database":"connected","timestamp":"...","uptimeSeconds":...}

# 2. Comprobar Frontend Web
curl -s -I https://clinica.tudominio.com
```

---

## 📱 Paso 5: Conectar la App Móvil Flutter a Producción

La aplicación móvil ya cuenta con soporte nativo para conectarse a tu VPS de producción:

### Opción 1: Sin recompilar (Usando la app instalada)
1. Abre la aplicación en tu teléfono Android.
2. En la pantalla de inicio de sesión, toca el icono de **engranaje (⚙️)** en la esquina superior derecha.
3. En el campo de URL, escribe tu dominio de producción:  
   `https://clinica.tudominio.com`
4. Toca **"Probar Conexión"**. La app validará el endpoint `https://clinica.tudominio.com/api/health`.
5. Toca **"Guardar"**. La URL se guardará permanentemente en el almacenamiento local del teléfono.

### Opción 2: Compilar el APK con la URL de Producción por defecto
Si deseas distribuir un APK que ya tenga configurado tu dominio HTTPS de fábrica:
1. En `mobile/lib/core/api_config.dart`, edita la constante:
   ```dart
   static const String defaultLanUrl = 'https://clinica.tudominio.com';
   ```
2. Compila el APK Release:
   ```bash
   cd mobile
   flutter build apk --release
   ```
3. El APK resultante en `mobile/build/app/outputs/flutter-apk/app-release.apk` apuntará directamente a tu servidor en la nube.

---

## 🛡️ Mantenimiento y Operaciones

### Ver logs en tiempo real
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100 backend
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100 web
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100 nginx
```

### Respaldos automáticos de PostgreSQL (Backup)
Para generar un volcado SQL completo de la base de datos de producción:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U clinica_prod_user clinica_prod_db > backup_clinica_$(date +%Y%m%d_%H%M%S).sql
```

Para restaurar un respaldo:
```bash
cat backup_clinica_20261116.sql | docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db psql -U clinica_prod_user -d clinica_prod_db
```

### Actualización del Sistema (Continuous Delivery)
Cuando subas cambios a GitHub (`git push origin main`):

```bash
cd /var/www/clinica
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
El contenedor `backend` ejecutará automáticamente `npx prisma db push --skip-generate` sin perder datos antes de reiniciar la API.
