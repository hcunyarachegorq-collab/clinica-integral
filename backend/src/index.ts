import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';

// Importar rutas modulares
import authRoutes from './routes/auth.routes';
import specialtyRoutes from './routes/specialty.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import medicalRecordRoutes from './routes/medical-record.routes';
import patientRoutes from './routes/patient.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Configuración de Middlewares
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (como herramientas de prueba/curl/SSR o apps móviles Flutter)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Flexibilidad en desarrollo
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para asegurar codificación UTF-8 en todas las respuestas JSON
app.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Endpoint raíz informativo con catálogo de endpoints
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Clinica Medical API',
    version: '1.2.0',
    status: 'online',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      specialties: 'GET /api/specialties, POST /api/specialties',
      doctors: {
        list: 'GET /api/doctors',
        create: 'POST /api/doctors (Admin)',
        availableSlots: 'GET /api/doctors/:id/available-slots?date=YYYY-MM-DD',
      },
      appointments: {
        list: 'GET /api/appointments',
        create: 'POST /api/appointments',
        updateStatus: 'PATCH /api/appointments/:id/status',
        triage: 'POST /api/appointments/:id/triage',
        payment: 'PATCH /api/appointments/:id/payment',
      },
      patients: {
        history: 'GET /api/patients/:id/history (Doctor / Admin)',
      },
      medicalRecords: {
        list: 'GET /api/medical-records',
        create: 'POST /api/medical-records (Doctor)',
      },
      analytics: {
        summary: 'GET /api/analytics/summary (Admin)',
      },
    },
  });
});

// Endpoint de comprobación de salud y conexión a PostgreSQL
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error: any) {
    console.error('Error al verificar conexión con la base de datos:', error.message);
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message || 'No fue posible conectar con la base de datos',
      timestamp: new Date().toISOString(),
    });
  }
});

// Registro de rutas API
app.use('/api/auth', authRoutes);
app.use('/api/specialties', specialtyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Inicio del servidor HTTP
const server = app.listen(Number(port), '0.0.0.0', () => {
  console.log(`[Backend] Servidor ejecutándose en http://0.0.0.0:${port}`);
  console.log(`[Backend] Endpoint de salud: http://localhost:${port}/api/health`);
});

// Manejo de apagado graceful
const handleShutdown = async (signal: string) => {
  console.log(`[Backend] Señal recibida: ${signal}. Cerrando conexiones...`);
  try {
    await prisma.$disconnect();
    server.close(() => {
      console.log('[Backend] Servidor HTTP cerrado correctamente.');
      process.exit(0);
    });
  } catch (err) {
    console.error('[Backend] Error durante el cierre:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
