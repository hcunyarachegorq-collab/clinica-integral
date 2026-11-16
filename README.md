# 🏥 Sistema Clínico Integral (Monorepo)

Plataforma integral y modular de gestión médica ambulatoria y hospitalaria desarrollada bajo una arquitectura **Monorepo**. Incluye portal web para administración y pacientes, microservicio de API REST con ORM relacional y aplicación móvil multiplataforma en Flutter para pacientes y especialistas de la salud.

---

## 🏗️ Arquitectura del Sistema

```plaintext
E:/CLINICA/
├── backend/                  # API REST: Node.js 20, Express, TypeScript, Prisma ORM
│   ├── prisma/               # Esquema relacional (schema.prisma) y seeder (seed.ts)
│   ├── src/                  # Controladores, rutas (/api/auth, /api/doctors, /api/patients, /api/medical-records, etc.)
│   └── Dockerfile            # Imagen ligera Alpine con Hot-Reload (tsx watch)
│
├── web/                      # Portal Web: Next.js 14 (App Router), TypeScript, Tailwind CSS
│   ├── app/                  # Rutas públicas (landing, login, registro) y panel /dashboard
│   ├── src/context/          # Gestión global de sesión con AuthContext
│   ├── src/lib/              # Cliente HTTP centralizado con interceptores JWT
│   └── Dockerfile            # Imagen de desarrollo optimizada con polling watch
│
├── mobile/                   # App Móvil: Flutter 3 & Dart (Android, iOS, Web, Windows)
│   ├── lib/core/             # Configuración de URLs dinámicas (emulador/desktop), tema y cliente API
│   ├── lib/models/           # Modelos de datos (User, Doctor, Appointment, Triage, MedicalRecord, Attachment)
│   ├── lib/providers/        # Estado reactivo con Provider (AuthProvider)
│   ├── lib/screens/          # Pantallas de Paciente y Modo Especialista (DoctorAgendaScreen)
│   └── lib/services/         # Emisión e impresión de Receta Médica oficial en PDF
│
├── docker-compose.yml        # Orquestador de contenedores (db, backend, web) en red 'clinica-net'
├── .env.example              # Plantilla de variables de entorno globales
├── .gitignore                # Exclusiones de Git para Node, Next, Flutter y Docker
└── README.md                 # Documentación técnica y guía de despliegue
```

---

## 🧰 Requisitos Previos

- **Docker Desktop** (versión 24 o superior) con soporte para Docker Compose.
- **Node.js** (v20 LTS opcional para herramientas locales).
- **Flutter SDK** (v3.13 o superior) y Dart SDK (para compilar o depurar la app móvil).
- **Git** (v2.30 o superior).

---

## 🚀 Despliegue Rápido con Docker

### 1. Variables de Entorno
El repositorio incluye un archivo `.env.example`. Copia este archivo para generar tu entorno local:

```bash
cp .env.example .env
```

### 2. Construcción e Inicio de Contenedores
Ejecuta en la raíz del proyecto:

```bash
docker compose up -d --build
```

Esto levantará los siguientes 3 servicios en la red puente `clinica-net`:
- **`clinica_db`** (PostgreSQL 16 en puerto `5432`): Almacenamiento relacional con volumen persistente.
- **`clinica_backend`** (Node.js + Express en puerto `4000`): API REST con Prisma ORM.
- **`clinica_web`** (Next.js 14 en puerto `3000`): Aplicación web responsive en tiempo real.

### 3. Poblar la Base de Datos (Seed de Prueba)
Una vez que los contenedores estén corriendo, ejecuta el script de inicialización para crear especialidades, doctores con turnos y usuarios de prueba:

```bash
docker compose exec backend npm run prisma:seed
```

---

## 🌐 URLs y Servicios Activos

| Servicio | URL / Puerto | Descripción |
| :--- | :--- | :--- |
| **Portal Web** | [http://localhost:3000](http://localhost:3000) | Landing page, agendamiento de citas y panel de control. |
| **Backend REST API** | [http://localhost:4000/api](http://localhost:4000/api) | Endpoints de autenticación, pacientes, médicos y recetas. |
| **Health Check** | [http://localhost:4000/api/health](http://localhost:4000/api/health) | Comprobación de salud y estado de la base de datos. |
| **Base de Datos** | `localhost:5432` | PostgreSQL (`clinica_db` / `clinica_admin`). |

---

## 📱 Ejecución de la Aplicación Móvil (Flutter)

La app móvil en `/mobile` detecta automáticamente la plataforma y redirige las peticiones al host correspondiente (`10.0.2.2:4000` en emuladores Android o `localhost:4000` en Windows/Web/Desktop).

1. Ingresa al directorio de la app:
   ```bash
   cd mobile
   ```

2. Descarga las dependencias:
   ```bash
   flutter pub get
   ```

3. Ejecuta en el dispositivo o entorno deseado:
   - **Emulador o Dispositivo Android**:
     ```bash
     flutter run
     ```
   - **Navegador Web (Chrome)**:
     ```bash
     flutter run -d chrome
     ```
   - **Aplicación de Escritorio Windows**:
     ```bash
     flutter run -d windows
     ```

4. Verificación de calidad y pruebas automáticas:
   ```bash
   flutter analyze
   flutter test
   ```

---

## 🔑 Credenciales de Acceso para Pruebas

Todos los usuarios de prueba vienen precargados mediante el seeder oficial:

| Rol | Correo Electrónico | Contraseña | Capacidades y Vistas |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@clinica.com` | `Admin123!` | Directorio de pacientes, agendamiento asistido, cobros en caja, gestión de médicos, bloqueo de fechas y analíticas ejecutivas. |
| **Médico General** | `dr.garcia@clinica.com` | `Doctor123!` | Agenda médica, triaje de signos vitales, emisión de diagnósticos y recetas, bloqueo de días no laborables y vista móvil adaptada (*Modo Doctor*). |
| **Cardióloga** | `dra.lopez@clinica.com` | `Doctor123!` | Consultas especializadas, control cardiovascular, adjuntos clínicos y emisión de recetas. |
| **Paciente** | `paciente@clinica.com` | `Paciente123!` | Reserva de citas según disponibilidad de horarios, consulta de historial clínico, descarga de recetas oficiales en PDF y edición de perfil. |

---

## ✨ Características Principales

1. **Gestión Integral de Citas y Turnos**:
   - Cálculo dinámico de horas disponibles según jornada del doctor.
   - Bloqueo y desbloqueo de días no laborables con motivo para evitar agendamientos erróneos.
2. **Triaje y Signos Vitales**:
   - Presión arterial, frecuencia cardíaca, temperatura, saturación de O2, peso, talla y cálculo automatizado de IMC.
3. **Expediente Clínico & Receta Médica en PDF**:
   - Registro de diagnóstico patológico, prescripción farmacológica e indicaciones.
   - Generación de receta médica en PDF oficial con soporte completo de tildes y eñes (UTF-8), folio y firma digital.
   - Soporte para adjuntos clínicos y resultados de laboratorio (PDF e imágenes en Base64).
4. **Seguridad y Perfil**:
   - Autenticación segura mediante JSON Web Tokens (JWT) y hashing con `bcrypt`.
   - Módulo de cambio de contraseña y edición de datos de contacto tanto en Web como en Mobile.
5. **Modo Doctor en Flutter**:
   - Vista especializada para el profesional médico con control de estados (`CONFIRMED`, `CANCELLED`) y resumen de pacientes.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Desarrollado con fines clínicos y formativos.
