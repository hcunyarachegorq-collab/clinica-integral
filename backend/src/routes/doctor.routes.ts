import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Esquema Zod para creación de Doctor (Solo Admin)
const createDoctorSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().optional(),
  specialtyId: z.string().uuid('ID de especialidad inválido'),
  licenseNumber: z.string().min(3, 'El número de colegiatura es obligatorio'),
  bio: z.string().optional(),
  consultationFee: z.number().positive('La tarifa de consulta debe ser mayor a 0'),
  schedules: z
    .array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm requerido'),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm requerido'),
        slotDurationMinutes: z.number().min(10).max(120).default(30).optional(),
      })
    )
    .min(1, 'Debe especificar al menos un bloque de horario semanal'),
});

// GET /api/doctors (filtrable por query param specialtyId)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { specialtyId } = req.query;

    const whereClause: any = {
      user: {
        isActive: true,
      },
    };

    if (specialtyId && typeof specialtyId === 'string') {
      whereClause.specialtyId = specialtyId;
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        specialty: {
          select: {
            id: true,
            name: true,
            description: true,
            iconName: true,
          },
        },
        schedules: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
      orderBy: {
        user: {
          fullName: 'asc',
        },
      },
    });

    return res.status(200).json({
      count: doctors.length,
      doctors: doctors.map((doc) => ({
        id: doc.id,
        userId: doc.userId,
        fullName: doc.user.fullName,
        email: doc.user.email,
        phone: doc.user.phone,
        specialty: doc.specialty,
        licenseNumber: doc.licenseNumber,
        bio: doc.bio,
        consultationFee: Number(doc.consultationFee),
        schedules: doc.schedules.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes,
        })),
      })),
    });
  } catch (error: any) {
    console.error('Error en /api/doctors:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar los médicos.',
    });
  }
});

// GET /api/doctors/:id/available-slots?date=YYYY-MM-DD
router.get('/:id/available-slots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'El parámetro de fecha "date" es obligatorio y debe tener formato YYYY-MM-DD.',
      });
    }

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        schedules: true,
        user: { select: { fullName: true } },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Médico no encontrado.' });
    }

    // Verificar si la fecha específica ha sido bloqueada por el médico
    const blockedRecord = await prisma.doctorBlockedDate.findUnique({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date,
        },
      },
    });

    if (blockedRecord) {
      const [bYear, bMonth, bDay] = date.split('-').map(Number);
      const bDayOfWeek = new Date(Date.UTC(bYear, bMonth - 1, bDay)).getUTCDay();
      return res.status(200).json({
        date,
        dayOfWeek: bDayOfWeek,
        available: false,
        blocked: true,
        reason: blockedRecord.reason || 'Fecha no disponible / bloqueada por el médico.',
        doctor: {
          id: doctor.id,
          fullName: doctor.user.fullName,
        },
        workingDays: doctor.schedules.map((s) => s.dayOfWeek),
        slots: [],
        allSlots: [],
        bookedSlots: [],
      });
    }

    // Calcular el día de la semana en UTC para consistencia
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

    const schedule = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);

    const workingDays = doctor.schedules.map((s) => s.dayOfWeek);

    if (!schedule) {
      return res.status(200).json({
        date,
        dayOfWeek,
        available: false,
        message: 'El médico no atiende consultas en este día de la semana.',
        workingDays,
        slots: [],
      });
    }

    // Funciones auxiliares para generar intervalos de tiempo
    const parseMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutes = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const m = (totalMinutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const startMinutes = parseMinutes(schedule.startTime);
    const endMinutes = parseMinutes(schedule.endTime);
    const duration = schedule.slotDurationMinutes || 30;

    const allSlots: string[] = [];
    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      allSlots.push(formatMinutes(m));
    }

    // Consultar citas ya programadas (PENDING o CONFIRMED) para ese doctor en esa fecha
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    const bookedSlots = bookedAppointments.map((app) => {
      const appDate = new Date(app.scheduledAt);
      const h = appDate.getUTCHours().toString().padStart(2, '0');
      const m = appDate.getUTCMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    });

    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

    return res.status(200).json({
      date,
      dayOfWeek,
      available: true,
      doctor: {
        id: doctor.id,
        fullName: doctor.user.fullName,
      },
      schedule: {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotDurationMinutes: duration,
      },
      workingDays,
      slots: availableSlots,
      allSlots,
      bookedSlots,
    });
  } catch (error: any) {
    console.error('Error al calcular slots disponibles:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al calcular disponibilidad.',
    });
  }
});

// POST /api/doctors (Solo ADMIN)
router.post(
  '/',
  authenticateJwt,
  authorizeRoles(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const parseResult = createDoctorSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos inválidos para dar de alta al médico',
          details: parseResult.error.format(),
        });
      }

      const {
        fullName,
        email,
        password,
        phone,
        specialtyId,
        licenseNumber,
        bio,
        consultationFee,
        schedules,
      } = parseResult.data;

      // Validar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        return res.status(409).json({
          error: 'El correo electrónico ya se encuentra registrado en el sistema.',
        });
      }

      // Validar si la colegiatura ya existe
      const existingLicense = await prisma.doctorProfile.findUnique({
        where: { licenseNumber },
      });
      if (existingLicense) {
        return res.status(409).json({
          error: 'El número de colegiatura médica ya se encuentra registrado.',
        });
      }

      // Validar que la especialidad exista
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId },
      });
      if (!specialty) {
        return res.status(404).json({ error: 'La especialidad especificada no existe.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Transacción atómica en Prisma: crear User, DoctorProfile y DoctorSchedule
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            fullName,
            email: email.toLowerCase(),
            passwordHash,
            phone,
            role: Role.DOCTOR,
            isActive: true,
          },
        });

        const newProfile = await tx.doctorProfile.create({
          data: {
            userId: newUser.id,
            specialtyId,
            licenseNumber,
            bio,
            consultationFee,
            schedules: {
              create: schedules.map((s) => ({
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                slotDurationMinutes: s.slotDurationMinutes || 30,
              })),
            },
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
              },
            },
            specialty: true,
            schedules: true,
          },
        });

        return newProfile;
      });

      return res.status(201).json({
        message: 'Médico registrado exitosamente con sus horarios de atención',
        doctor: {
          id: result.id,
          userId: result.userId,
          fullName: result.user.fullName,
          email: result.user.email,
          phone: result.user.phone,
          specialty: result.specialty,
          licenseNumber: result.licenseNumber,
          bio: result.bio,
          consultationFee: Number(result.consultationFee),
          schedules: result.schedules,
        },
      });
    } catch (error: any) {
      console.error('Error al crear doctor:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al crear el médico.',
      });
    }
  }
);

const blockDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido (ej: 2026-12-25)'),
  reason: z.string().optional(),
});

// POST /api/doctors/:id/blocked-dates (DOCTOR y ADMIN)
router.post(
  '/:id/blocked-dates',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const { id } = req.params;
      const parseResult = blockDateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos de fecha bloqueada inválidos',
          details: parseResult.error.format(),
        });
      }

      const doctor = await prisma.doctorProfile.findUnique({
        where: { id },
      });

      if (!doctor) {
        return res.status(404).json({ error: 'Médico no encontrado.' });
      }

      if (req.user.role === Role.DOCTOR && doctor.userId !== req.user.id) {
        return res.status(403).json({
          error: 'No tienes permiso para bloquear fechas de otro médico.',
        });
      }

      const blockedDate = await prisma.doctorBlockedDate.upsert({
        where: {
          doctorId_date: {
            doctorId: id,
            date: parseResult.data.date,
          },
        },
        update: {
          reason: parseResult.data.reason,
        },
        create: {
          doctorId: id,
          date: parseResult.data.date,
          reason: parseResult.data.reason,
        },
      });

      return res.status(201).json({
        message: 'Fecha bloqueada exitosamente',
        blockedDate,
      });
    } catch (error: any) {
      console.error('Error al bloquear fecha del médico:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al registrar la fecha bloqueada.',
      });
    }
  }
);

// GET /api/doctors/:id/blocked-dates (Público / Autenticado)
router.get('/:id/blocked-dates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const blockedDates = await prisma.doctorBlockedDate.findMany({
      where: { doctorId: id },
      orderBy: { date: 'asc' },
    });

    return res.status(200).json({
      count: blockedDates.length,
      blockedDates,
    });
  } catch (error: any) {
    console.error('Error al consultar fechas bloqueadas:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar fechas bloqueadas.',
    });
  }
});

// DELETE /api/doctors/:id/blocked-dates/:blockId (DOCTOR y ADMIN)
router.delete(
  '/:id/blocked-dates/:blockId',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const { id, blockId } = req.params;

      const blockedRecord = await prisma.doctorBlockedDate.findUnique({
        where: { id: blockId },
        include: {
          doctor: true,
        },
      });

      if (!blockedRecord || blockedRecord.doctorId !== id) {
        return res.status(404).json({ error: 'Registro de fecha bloqueada no encontrado.' });
      }

      if (req.user.role === Role.DOCTOR && blockedRecord.doctor.userId !== req.user.id) {
        return res.status(403).json({
          error: 'No tienes permiso para eliminar bloqueos de otro médico.',
        });
      }

      await prisma.doctorBlockedDate.delete({
        where: { id: blockId },
      });

      return res.status(200).json({
        message: 'Bloqueo de fecha eliminado correctamente',
      });
    } catch (error: any) {
      console.error('Error al eliminar fecha bloqueada:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al eliminar fecha bloqueada.',
      });
    }
  }
);

export default router;
