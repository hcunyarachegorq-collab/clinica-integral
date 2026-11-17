import { Router, Response } from 'express';
import { z } from 'zod';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

const prescriptionItemInputSchema = z.object({
  medicationId: z.string().uuid('ID de medicamento inválido'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  dosage: z.string().min(2, 'La posología o dosis es requerida'),
});

const createMedicalRecordSchema = z.object({
  appointmentId: z.string().uuid('ID de cita médica inválido'),
  diagnosis: z.string().min(3, 'El diagnóstico debe tener al menos 3 caracteres'),
  prescription: z.string().min(3, 'La receta / tratamiento debe tener al menos 3 caracteres'),
  notes: z.string().optional(),
  items: z.array(prescriptionItemInputSchema).optional(),
});

// POST /api/medical-records (Solo DOCTOR)
router.post(
  '/',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const parseResult = createMedicalRecordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos inválidos para la ficha médica',
          details: parseResult.error.format(),
        });
      }

      const { appointmentId, diagnosis, prescription, notes, items } = parseResult.data;

      // Buscar perfil del doctor autenticado
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!doctorProfile) {
        return res.status(403).json({ error: 'Perfil de médico no encontrado para este usuario.' });
      }

      // Buscar la cita médica
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          medicalRecord: true,
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita médica no encontrada.' });
      }

      if (appointment.doctorId !== doctorProfile.id) {
        return res.status(403).json({
          error: 'No tienes permiso para emitir un registro médico para una cita asignada a otro doctor.',
        });
      }

      if (appointment.medicalRecord) {
        return res.status(409).json({ error: 'Esta cita ya cuenta con un registro médico registrado.' });
      }

      // Procesar y congelar precios de medicamentos de botica si se recetaron
      let pharmacyTotal = 0;
      const verifiedItems: {
        medicationId: string;
        quantity: number;
        dosage: string;
        unitPrice: number;
        subtotal: number;
      }[] = [];

      if (items && items.length > 0) {
        for (const item of items) {
          const med = await prisma.medication.findUnique({
            where: { id: item.medicationId },
          });

          if (!med || !med.isActive) {
            return res.status(400).json({
              error: `El medicamento seleccionado (${item.medicationId}) no existe o está inactivo en botica.`,
            });
          }

          if (med.stock < item.quantity) {
            return res.status(400).json({
              error: `Stock insuficiente para "${med.name}". Stock actual disponible: ${med.stock}, solicitado: ${item.quantity}.`,
            });
          }

          const subtotal = Number((med.price * item.quantity).toFixed(2));
          pharmacyTotal += subtotal;

          verifiedItems.push({
            medicationId: med.id,
            quantity: item.quantity,
            dosage: item.dosage,
            unitPrice: med.price,
            subtotal,
          });
        }
      }
      pharmacyTotal = Number(pharmacyTotal.toFixed(2));

      // Transacción atómica en Prisma: Crear MedicalRecord con items y cambiar Appointment a COMPLETED
      const result = await prisma.$transaction(async (tx) => {
        const record = await tx.medicalRecord.create({
          data: {
            appointmentId,
            patientId: appointment.patientId,
            doctorId: doctorProfile.id,
            diagnosis,
            prescription,
            notes,
            pharmacyTotal,
            pharmacyPaid: false,
            prescriptionItems: {
              create: verifiedItems.map((v) => ({
                medicationId: v.medicationId,
                quantity: v.quantity,
                dosage: v.dosage,
                unitPrice: v.unitPrice,
                subtotal: v.subtotal,
              })),
            },
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
                user: { select: { fullName: true } },
                specialty: { select: { name: true } },
              },
            },
            appointment: {
              select: {
                scheduledAt: true,
                reason: true,
              },
            },
            prescriptionItems: {
              include: {
                medication: true,
              },
            },
          },
        });

        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        });

        return record;
      });

      // Disparar notificación automática al paciente sobre su receta médica
      try {
        await prisma.notification.create({
          data: {
            userId: result.patient.id,
            title: 'Receta Médica y Diagnóstico Disponible',
            message: `El/La Dr(a). ${result.doctor.user.fullName} (${result.doctor.specialty.name}) ha emitido tu receta médica y diagnóstico. Ya puedes revisarla y descargarla en PDF.`,
            type: 'MEDICAL_RECORD',
          },
        });
      } catch (notifErr) {
        console.error('Error al generar notificación de receta para el paciente:', notifErr);
      }

      return res.status(201).json({
        message: 'Registro médico guardado y cita médica completada con éxito',
        medicalRecord: {
          id: result.id,
          appointmentId: result.appointmentId,
          diagnosis: result.diagnosis,
          prescription: result.prescription,
          notes: result.notes,
          pharmacyTotal: result.pharmacyTotal,
          pharmacyPaid: result.pharmacyPaid,
          createdAt: result.createdAt,
          patient: result.patient,
          doctor: {
            id: result.doctor.id,
            fullName: result.doctor.user.fullName,
            specialty: result.doctor.specialty.name,
            licenseNumber: result.doctor.licenseNumber,
          },
          appointment: result.appointment,
          prescriptionItems: result.prescriptionItems,
        },
      });
    } catch (error: any) {
      console.error('Error al crear registro médico:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al crear el registro médico.',
      });
    }
  }
);

// GET /api/medical-records (Historial Clínico según rol)
router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const whereClause: any = {};

    if (req.user.role === Role.PATIENT) {
      whereClause.patientId = req.user.id;
    } else if (req.user.role === Role.DOCTOR) {
      const docProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!docProfile) {
        return res.status(200).json({ count: 0, medicalRecords: [] });
      }
      whereClause.doctorId = docProfile.id;
    }
    // Si es ADMIN o RECEPTIONIST, whereClause queda vacío para consultar todos

    const records = await prisma.medicalRecord.findMany({
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
        appointment: {
          select: {
            scheduledAt: true,
            reason: true,
            status: true,
          },
        },
        attachments: true,
        prescriptionItems: {
          include: {
            medication: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      count: records.length,
      medicalRecords: records.map((r) => ({
        id: r.id,
        appointmentId: r.appointmentId,
        diagnosis: r.diagnosis,
        prescription: r.prescription,
        notes: r.notes,
        pharmacyTotal: r.pharmacyTotal,
        pharmacyPaid: r.pharmacyPaid,
        createdAt: r.createdAt,
        patient: r.patient,
        doctor: {
          id: r.doctor.id,
          fullName: r.doctor.user.fullName,
          specialty: r.doctor.specialty.name,
          licenseNumber: r.doctor.licenseNumber,
        },
        appointment: r.appointment,
        attachments: r.attachments,
        prescriptionItems: r.prescriptionItems,
      })),
    });
  } catch (error: any) {
    console.error('Error al consultar historial clínico:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar el historial médico.',
    });
  }
});

// PATCH /api/medical-records/:id/dispense (Solo ADMIN o RECEPTIONIST: cobro y despacho en botica)
router.patch(
  '/:id/dispense',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const record = await prisma.medicalRecord.findUnique({
        where: { id },
        include: {
          patient: true,
          prescriptionItems: {
            include: { medication: true },
          },
        },
      });

      if (!record) {
        return res.status(404).json({ error: 'Registro médico no encontrado.' });
      }

      if (record.pharmacyPaid) {
        return res.status(400).json({ error: 'Esta receta ya fue cobrada y despachada previamente en botica.' });
      }

      if (record.prescriptionItems.length === 0) {
        return res.status(400).json({
          error: 'Este registro médico no contiene medicamentos de botica para despachar.',
        });
      }

      // Validar stock antes de ejecutar
      for (const item of record.prescriptionItems) {
        if (item.medication.stock < item.quantity) {
          return res.status(400).json({
            error: `Stock insuficiente para despachar "${item.medication.name}". Stock disponible: ${item.medication.stock}, requerido: ${item.quantity}.`,
          });
        }
      }

      // Transacción atómica: descontar stock y marcar como pagado
      const updatedRecord = await prisma.$transaction(async (tx) => {
        for (const item of record.prescriptionItems) {
          await tx.medication.update({
            where: { id: item.medicationId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        return tx.medicalRecord.update({
          where: { id },
          data: {
            pharmacyPaid: true,
          },
          include: {
            prescriptionItems: {
              include: { medication: true },
            },
            patient: {
              select: { id: true, fullName: true, email: true },
            },
          },
        });
      });

      // Notificación al paciente
      try {
        await prisma.notification.create({
          data: {
            userId: record.patientId,
            title: 'Receta Despachada y Pagada en Botica',
            message: `Tu receta médica (${record.prescriptionItems.length} medicamento(s), Total: S/ ${record.pharmacyTotal.toFixed(2)}) ha sido despachada y pagada en caja exitosamente.`,
            type: 'MEDICAL_RECORD',
          },
        });
      } catch (_) {}

      return res.status(200).json({
        message: 'Receta cobrada y despachada exitosamente. Stock actualizado en botica.',
        medicalRecord: updatedRecord,
      });
    } catch (error: any) {
      console.error('Error al despachar receta:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al despachar receta médica.',
      });
    }
  }
);

// POST /api/medical-records/:id/attachments (DOCTOR y ADMIN)
const attachmentSchema = z.object({
  fileName: z.string().min(1, 'El nombre del archivo es obligatorio'),
  fileType: z.string().min(1, 'El tipo MIME del archivo es obligatorio'),
  fileDataUrl: z.string().min(10, 'El contenido del archivo (DataURL) es obligatorio'),
});

router.post(
  '/:id/attachments',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const { id } = req.params;
      const parseResult = attachmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos de archivo adjunto inválidos',
          details: parseResult.error.format(),
        });
      }

      const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { id },
        include: {
          doctor: true,
        },
      });

      if (!medicalRecord) {
        return res.status(404).json({ error: 'Registro médico no encontrado.' });
      }

      // Si es DOCTOR, verificar que pertenezca al doctor autenticado
      if (req.user.role === Role.DOCTOR) {
        const doctorProfile = await prisma.doctorProfile.findUnique({
          where: { userId: req.user.id },
        });

        if (!doctorProfile || medicalRecord.doctorId !== doctorProfile.id) {
          return res.status(403).json({
            error: 'No tienes permiso para agregar adjuntos al registro médico de otro profesional.',
          });
        }
      }

      const { fileName, fileType, fileDataUrl } = parseResult.data;

      const attachment = await prisma.medicalAttachment.create({
        data: {
          medicalRecordId: id,
          fileName,
          fileType,
          fileDataUrl,
        },
      });

      return res.status(201).json({
        message: 'Archivo adjunto guardado exitosamente',
        attachment,
      });
    } catch (error: any) {
      console.error('Error al guardar adjunto médico:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al guardar el archivo adjunto.',
      });
    }
  }
);

export default router;
