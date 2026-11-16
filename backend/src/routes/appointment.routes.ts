import { Router, Response } from 'express';
import { z } from 'zod';
import { AppointmentStatus, Role, PaymentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Esquema Zod para creación de citas
const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('ID de doctor inválido'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha y hora inválida. Debe ser un formato ISO válido (ej: 2026-11-20T10:00:00Z)',
  }),
  reason: z.string().min(3, 'El motivo de la cita debe tener al menos 3 caracteres'),
  notes: z.string().optional(),
  patientId: z.string().uuid('ID de paciente inválido').optional(),
});

// Esquema Zod para actualización de estado
const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, {
    errorMap: () => ({ message: 'Estado inválido. Opciones: PENDING, CONFIRMED, COMPLETED, CANCELLED' }),
  }),
});

// Esquema Zod para Triaje de Signos Vitales
const triageSchema = z.object({
  bloodPressure: z.string().min(3, 'Presión arterial requerida (ej. 120/80)'),
  heartRate: z.number().int().min(20).max(300, 'Frecuencia cardíaca inválida'),
  temperature: z.number().min(30).max(45, 'Temperatura corporal inválida'),
  weightKg: z.number().min(1).max(500, 'Peso en kg inválido'),
  heightCm: z.number().min(30).max(300, 'Talla en cm inválida'),
  oxygenSaturation: z.number().int().min(50).max(100, 'Saturación O2 inválida'),
  allergies: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema Zod para Registro de Pago
const paymentSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Método de pago inválido. Opciones: CASH, CARD, TRANSFER, INSURANCE' }),
  }),
  amountPaid: z.number().positive('El monto abonado debe ser mayor a 0').optional(),
});

// POST /api/appointments - Crear cita médica
router.post('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos de la cita médica inválidos',
        details: parseResult.error.format(),
      });
    }

    const { doctorId, scheduledAt, reason, notes, patientId } = parseResult.data;

    // Determinar ID del paciente según rol
    let effectivePatientId = req.user.id;
    if (req.user.role === Role.ADMIN || req.user.role === Role.RECEPTIONIST) {
      if (patientId) {
        const patientExists = await prisma.user.findUnique({
          where: { id: patientId },
        });
        if (!patientExists) {
          return res.status(404).json({ error: 'El paciente especificado no existe.' });
        }
        effectivePatientId = patientId;
      }
    }

    // Verificar que el doctor exista
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { fullName: true, email: true } },
        specialty: { select: { name: true } },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'El médico especificado no fue encontrado.' });
    }

    const scheduledDate = new Date(scheduledAt);

    // Validar cruce de horario para ese doctor (rango de 30 minutos)
    const slotDurationMinutes = 30;
    const windowStart = new Date(scheduledDate.getTime() - (slotDurationMinutes - 1) * 60 * 1000);
    const windowEnd = new Date(scheduledDate.getTime() + (slotDurationMinutes - 1) * 60 * 1000);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        error: 'El médico ya tiene una consulta programada en ese bloque horario.',
        details: {
          doctorId,
          doctorName: doctor.user.fullName,
          conflictingTime: conflictingAppointment.scheduledAt,
        },
      });
    }

    // Crear la cita médica
    const newAppointment = await prisma.appointment.create({
      data: {
        patientId: effectivePatientId,
        doctorId,
        scheduledAt: scheduledDate,
        reason,
        notes,
        status: AppointmentStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          include: {
            user: { select: { fullName: true, email: true } },
            specialty: { select: { name: true } },
          },
        },
        triage: true,
      },
    });

    return res.status(201).json({
      message: 'Cita médica agendada exitosamente',
      appointment: {
        id: newAppointment.id,
        scheduledAt: newAppointment.scheduledAt,
        status: newAppointment.status,
        reason: newAppointment.reason,
        notes: newAppointment.notes,
        paymentStatus: newAppointment.paymentStatus,
        paymentMethod: newAppointment.paymentMethod,
        amountPaid: newAppointment.amountPaid ? Number(newAppointment.amountPaid) : null,
        paidAt: newAppointment.paidAt,
        consultationFee: Number(newAppointment.doctor.consultationFee),
        patient: newAppointment.patient,
        doctor: {
          id: newAppointment.doctor.id,
          fullName: newAppointment.doctor.user.fullName,
          specialty: newAppointment.doctor.specialty.name,
          licenseNumber: newAppointment.doctor.licenseNumber,
          consultationFee: Number(newAppointment.doctor.consultationFee),
        },
        triage: newAppointment.triage,
        createdAt: newAppointment.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error al agendar cita:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al programar la cita médica.',
    });
  }
});

// GET /api/appointments - Listar citas filtradas por rol
router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const whereClause: any = {};

    if (req.user.role === Role.PATIENT) {
      whereClause.patientId = req.user.id;
    } else if (req.user.role === Role.DOCTOR) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!doctorProfile) {
        return res.status(200).json({ count: 0, appointments: [] });
      }

      whereClause.doctorId = doctorProfile.id;
    } else {
      const { doctorId, patientId, status } = req.query;
      if (doctorId && typeof doctorId === 'string') whereClause.doctorId = doctorId;
      if (patientId && typeof patientId === 'string') whereClause.patientId = patientId;
      if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        whereClause.status = status as AppointmentStatus;
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          include: {
            user: { select: { fullName: true, email: true } },
            specialty: { select: { name: true } },
          },
        },
        triage: true,
        medicalRecord: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    return res.status(200).json({
      count: appointments.length,
      appointments: appointments.map((app) => ({
        id: app.id,
        scheduledAt: app.scheduledAt,
        status: app.status,
        reason: app.reason,
        notes: app.notes,
        paymentStatus: app.paymentStatus,
        paymentMethod: app.paymentMethod,
        amountPaid: app.amountPaid ? Number(app.amountPaid) : null,
        paidAt: app.paidAt,
        consultationFee: Number(app.doctor.consultationFee),
        patient: app.patient,
        doctor: {
          id: app.doctor.id,
          fullName: app.doctor.user.fullName,
          specialty: app.doctor.specialty.name,
          licenseNumber: app.doctor.licenseNumber,
          consultationFee: Number(app.doctor.consultationFee),
        },
        triage: app.triage,
        hasMedicalRecord: !!app.medicalRecord,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error al listar citas:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar citas médicas.',
    });
  }
});

// POST /api/appointments/:id/triage - Registrar o actualizar signos vitales
router.post(
  '/:id/triage',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = triageSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos de triaje inválidos',
          details: parseResult.error.format(),
        });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita médica no encontrada.' });
      }

      const triage = await prisma.triage.upsert({
        where: { appointmentId: id },
        update: {
          ...parseResult.data,
        },
        create: {
          appointmentId: id,
          ...parseResult.data,
        },
      });

      return res.status(200).json({
        message: 'Signos vitales de triaje registrados exitosamente',
        triage,
      });
    } catch (error: any) {
      console.error('Error al registrar triaje:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al guardar el triaje.',
      });
    }
  }
);

// PATCH /api/appointments/:id/payment - Registrar cobro de cita
router.patch(
  '/:id/payment',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = paymentSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos de pago inválidos',
          details: parseResult.error.format(),
        });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          doctor: true,
          patient: { select: { fullName: true, email: true } },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita médica no encontrada.' });
      }

      const finalAmount = parseResult.data.amountPaid ?? Number(appointment.doctor.consultationFee);

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: parseResult.data.paymentMethod,
          amountPaid: finalAmount,
          paidAt: new Date(),
        },
        include: {
          patient: { select: { fullName: true, email: true, phone: true } },
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      return res.status(200).json({
        message: 'Pago registrado exitosamente',
        payment: {
          appointmentId: updated.id,
          paymentStatus: updated.paymentStatus,
          paymentMethod: updated.paymentMethod,
          amountPaid: Number(updated.amountPaid),
          paidAt: updated.paidAt,
          patientName: updated.patient.fullName,
          doctorName: updated.doctor.user.fullName,
          specialty: updated.doctor.specialty.name,
        },
      });
    } catch (error: any) {
      console.error('Error al registrar pago:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al procesar el pago.',
      });
    }
  }
);

// PATCH /api/appointments/:id/status - Actualizar estado de cita
router.patch('/:id/status', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const parseResult = updateStatusSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Estado de cita inválido',
        details: parseResult.error.format(),
      });
    }

    const { status: targetStatus } = parseResult.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita médica no encontrada.' });
    }

    if (req.user.role === Role.PATIENT) {
      if (appointment.patientId !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permiso para modificar esta cita.' });
      }
      if (targetStatus !== AppointmentStatus.CANCELLED) {
        return res.status(403).json({
          error: 'Los pacientes únicamente tienen permitido cancelar citas programadas.',
        });
      }
    } else if (req.user.role === Role.DOCTOR) {
      if (appointment.doctor.userId !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permiso para modificar una cita de otro médico.' });
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: targetStatus },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        doctor: {
          include: {
            user: { select: { fullName: true } },
            specialty: { select: { name: true } },
          },
        },
      },
    });

    return res.status(200).json({
      message: `Estado de la cita actualizado a ${targetStatus}`,
      appointment: {
        id: updatedAppointment.id,
        scheduledAt: updatedAppointment.scheduledAt,
        status: updatedAppointment.status,
        patientName: updatedAppointment.patient.fullName,
        doctorName: updatedAppointment.doctor.user.fullName,
        specialty: updatedAppointment.doctor.specialty.name,
        updatedAt: updatedAppointment.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error al actualizar estado de la cita:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al actualizar el estado de la cita.',
    });
  }
});

export default router;
