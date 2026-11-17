import { Router, Request, Response } from 'express';
import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const router = Router();

// Función auxiliar para anonimizar el nombre del paciente por privacidad
function formatPatientShortName(fullName: string): string {
  if (!fullName) return 'Paciente';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[1] ? `${parts[1][0].toUpperCase()}.` : '';
  return `${firstName} ${lastInitial}`.trim();
}

// GET /api/public/waiting-room - Pantalla pública de sala de espera (sin auth)
router.get('/waiting-room', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Citas que han sido llamadas recientemente (En consultorio / Llamando ahora)
    const calledAppointments = await prisma.appointment.findMany({
      where: {
        calledAt: {
          not: null,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
      include: {
        patient: {
          select: { fullName: true },
        },
        doctor: {
          include: {
            user: { select: { fullName: true } },
            specialty: { select: { name: true } },
          },
        },
      },
      orderBy: {
        calledAt: 'desc',
      },
      take: 8,
    });

    // 2. Próximos turnos en espera
    const waitingAppointments = await prisma.appointment.findMany({
      where: {
        calledAt: null,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
      include: {
        patient: {
          select: { fullName: true },
        },
        doctor: {
          include: {
            user: { select: { fullName: true } },
            specialty: { select: { name: true } },
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      take: 12,
    });

    // Mapear citas protegiendo privacidad
    const mapWaitingItem = (app: any) => ({
      id: app.id,
      queueCode: app.queueCode || 'TUR-00',
      patientName: formatPatientShortName(app.patient.fullName),
      doctorName: app.doctor.user.fullName,
      specialty: app.doctor.specialty.name,
      consultingRoom: app.consultingRoom || 'Consultorio 1',
      status: app.calledAt ? 'IN_PROGRESS' : app.status,
      calledAt: app.calledAt,
      scheduledAt: app.scheduledAt,
    });

    return res.status(200).json({
      timestamp: now.toISOString(),
      stats: {
        calledCount: calledAppointments.length,
        waitingCount: waitingAppointments.length,
      },
      called: calledAppointments.map(mapWaitingItem),
      waiting: waitingAppointments.map(mapWaitingItem),
    });
  } catch (error: any) {
    console.error('Error al obtener datos de la sala de espera pública:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar la sala de espera.',
    });
  }
});

export default router;
