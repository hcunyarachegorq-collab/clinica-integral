import { Router, Response } from 'express';
import { z } from 'zod';
import { AppointmentStatus, Role, PaymentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';
import { generateQueueCode, assignConsultingRoom } from '../utils/queue.utils';

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

// Esquema Zod para Calificación Médica (Reseña)
const reviewSchema = z.object({
  rating: z.number().int().min(1, 'La calificación mínima es 1 estrella').max(5, 'La calificación máxima es 5 estrellas'),
  comment: z.string().max(1000, 'El comentario no puede exceder 1000 caracteres').optional(),
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

    // Generar código de turno correlativo y consultorio
    const queueCode = await generateQueueCode(doctor.specialty.name, scheduledDate);
    const consultingRoom = assignConsultingRoom(doctor.id);

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
        queueCode,
        consultingRoom,
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

    // Disparar notificación automática al médico asignado
    try {
      const scheduledFormatted = scheduledDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeFormatted = scheduledDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      await prisma.notification.create({
        data: {
          userId: doctor.userId,
          title: 'Nueva Cita Médica Agendada',
          message: `El/La paciente ${newAppointment.patient.fullName} agendó una cita para el ${scheduledFormatted} a las ${timeFormatted}. Motivo: "${reason}".`,
          type: 'APPOINTMENT',
        },
      });
    } catch (notifErr) {
      console.error('Error al generar notificación para el médico:', notifErr);
    }

    return res.status(201).json({
      message: 'Cita médica agendada exitosamente',
      appointment: {
        id: newAppointment.id,
        scheduledAt: newAppointment.scheduledAt,
        status: newAppointment.status,
        queueCode: newAppointment.queueCode,
        consultingRoom: newAppointment.consultingRoom,
        calledAt: newAppointment.calledAt,
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
        review: true,
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
        queueCode: app.queueCode,
        consultingRoom: app.consultingRoom,
        calledAt: app.calledAt,
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
        review: app.review
          ? {
              id: app.review.id,
              rating: app.review.rating,
              comment: app.review.comment,
              createdAt: app.review.createdAt,
            }
          : null,
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

// POST y PATCH /api/appointments/:id/triage - Registrar o actualizar signos vitales (Triaje)
const handleTriage = async (req: AuthRequest, res: Response) => {
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
};

router.post(
  '/:id/triage',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR, Role.NURSE),
  handleTriage
);

router.patch(
  '/:id/triage',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR, Role.NURSE),
  handleTriage
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
        doctor: {
          include: {
            specialty: true,
          },
        },
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

    const updateData: any = { status: targetStatus };
    if (targetStatus === AppointmentStatus.CONFIRMED) {
      if (!appointment.queueCode) {
        updateData.queueCode = await generateQueueCode(appointment.doctor.specialty.name, appointment.scheduledAt);
      }
      if (!appointment.consultingRoom) {
        updateData.consultingRoom = assignConsultingRoom(appointment.doctorId);
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
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

    // Disparar notificaciones automáticas según el nuevo estado
    try {
      const scheduledFormatted = new Date(updatedAppointment.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeFormatted = new Date(updatedAppointment.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const docName = updatedAppointment.doctor.user.fullName;

      if (targetStatus === AppointmentStatus.CONFIRMED) {
        await prisma.notification.create({
          data: {
            userId: updatedAppointment.patient.id,
            title: 'Cita Médica Confirmada',
            message: `Tu cita médica con el/la Dr(a). ${docName} para el ${scheduledFormatted} a las ${timeFormatted} ha sido confirmada.`,
            type: 'APPOINTMENT',
          },
        });
      } else if (targetStatus === AppointmentStatus.CANCELLED) {
        if (req.user.role === Role.PATIENT) {
          // Si el paciente cancela, notificar al médico
          await prisma.notification.create({
            data: {
              userId: appointment.doctor.userId,
              title: 'Cita Cancelada por el Paciente',
              message: `El/La paciente ${updatedAppointment.patient.fullName} canceló su cita del ${scheduledFormatted} a las ${timeFormatted}.`,
              type: 'APPOINTMENT',
            },
          });
        } else {
          // Si el doctor/admin cancela, notificar al paciente
          await prisma.notification.create({
            data: {
              userId: updatedAppointment.patient.id,
              title: 'Cita Médica Cancelada',
              message: `Tu cita médica con el/la Dr(a). ${docName} para el ${scheduledFormatted} ha sido cancelada.`,
              type: 'APPOINTMENT',
            },
          });
        }
      } else if (targetStatus === AppointmentStatus.COMPLETED) {
        await prisma.notification.create({
          data: {
            userId: updatedAppointment.patient.id,
            title: 'Atención Médica Completada',
            message: `Tu consulta con el/la Dr(a). ${docName} ha finalizado. ¡Ya puedes calificar tu atención recibida!`,
            type: 'APPOINTMENT',
          },
        });
      }
    } catch (notifErr) {
      console.error('Error al generar notificación de cambio de estado:', notifErr);
    }

    return res.status(200).json({
      message: `Estado de la cita actualizado a ${targetStatus}`,
      appointment: {
        id: updatedAppointment.id,
        scheduledAt: updatedAppointment.scheduledAt,
        status: updatedAppointment.status,
        queueCode: updatedAppointment.queueCode,
        consultingRoom: updatedAppointment.consultingRoom,
        calledAt: updatedAppointment.calledAt,
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

// POST /api/appointments/:id/review - Calificar atención médica recibida (Solo Paciente titular)
router.post(
  '/:id/review',
  authenticateJwt,
  authorizeRoles(Role.PATIENT),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;
      const parseResult = reviewSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos de calificación inválidos',
          details: parseResult.error.format(),
        });
      }

      const { rating, comment } = parseResult.data;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true } },
            },
          },
          review: true,
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita médica no encontrada.' });
      }

      if (appointment.patientId !== req.user.id) {
        return res.status(403).json({ error: 'Solo el paciente titular puede calificar esta consulta médica.' });
      }

      if (appointment.status !== AppointmentStatus.COMPLETED) {
        return res.status(400).json({
          error: 'Solo se pueden calificar consultas médicas completadas.',
        });
      }

      if (appointment.review) {
        return res.status(400).json({
          error: 'Esta cita médica ya ha sido calificada previamente.',
        });
      }

      const newReview = await prisma.doctorReview.create({
        data: {
          appointmentId: id,
          patientId: req.user.id,
          doctorId: appointment.doctorId,
          rating,
          comment: comment?.trim() || null,
        },
        include: {
          patient: {
            select: { fullName: true },
          },
        },
      });

      // Notificación automática al médico por su nueva reseña
      try {
        await prisma.notification.create({
          data: {
            userId: appointment.doctor.userId,
            title: 'Nueva Calificación de Paciente',
            message: `El/La paciente ${newReview.patient.fullName} calificó tu atención con ${rating} estrella(s).${comment ? ` Comentario: "${comment}"` : ''}`,
            type: 'SYSTEM',
          },
        });
      } catch (notifErr) {
        console.error('Error al generar notificación de reseña para el médico:', notifErr);
      }

      return res.status(201).json({
        message: '¡Muchas gracias por calificar la atención médica!',
        review: {
          id: newReview.id,
          appointmentId: newReview.appointmentId,
          rating: newReview.rating,
          comment: newReview.comment,
          patientName: newReview.patient.fullName,
          createdAt: newReview.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Error al registrar reseña:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al procesar la calificación.',
      });
    }
  }
);

// PATCH /api/appointments/:id/call - Llamar paciente a consultorio (DOCTOR, ADMIN, RECEPTIONIST)
router.patch(
  '/:id/call',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { consultingRoom } = req.body;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita médica no encontrada.' });
      }

      // Si es DOCTOR, verificar que sea el médico de la cita
      if (req.user?.role === Role.DOCTOR && appointment.doctor.userId !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permiso para llamar citas asignadas a otro especialista.' });
      }

      let queueCode = appointment.queueCode;
      if (!queueCode) {
        queueCode = await generateQueueCode(appointment.doctor.specialty.name, appointment.scheduledAt);
      }

      const room = consultingRoom?.trim() || appointment.consultingRoom || assignConsultingRoom(appointment.doctorId);
      const now = new Date();

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          calledAt: now,
          queueCode,
          consultingRoom: room,
          status: appointment.status === AppointmentStatus.PENDING ? AppointmentStatus.CONFIRMED : appointment.status,
        },
        include: {
          patient: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      // Notificación automática al paciente
      try {
        await prisma.notification.create({
          data: {
            userId: appointment.patient.id,
            title: '¡Es tu turno de atención médica!',
            message: `Estimado(a) ${appointment.patient.fullName}, es tu turno. Por favor acércate a ${room} con el/la especialista ${appointment.doctor.user.fullName} (${appointment.doctor.specialty.name}). Tu código de turno es ${queueCode}.`,
            type: 'APPOINTMENT',
          },
        });
      } catch (notifErr) {
        console.error('Error al generar notificación de llamado:', notifErr);
      }

      return res.status(200).json({
        message: `Paciente ${appointment.patient.fullName} llamado a ${room}`,
        appointment: {
          id: updated.id,
          queueCode: updated.queueCode,
          consultingRoom: updated.consultingRoom,
          calledAt: updated.calledAt,
          status: updated.status,
          scheduledAt: updated.scheduledAt,
          patient: updated.patient,
          doctor: {
            id: updated.doctor.id,
            fullName: updated.doctor.user.fullName,
            specialty: updated.doctor.specialty.name,
          },
        },
      });
    } catch (error: any) {
      console.error('Error al llamar al paciente a consultorio:', error);
      return res.status(500).json({ error: 'Error interno del servidor al llamar al paciente.' });
    }
  }
);

export default router;
