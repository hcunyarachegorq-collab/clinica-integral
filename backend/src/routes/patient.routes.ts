import { Router, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/patients?search=... (Directorio y buscador para ADMIN, RECEPTIONIST, DOCTOR)
router.get(
  '/',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const search = req.query.search ? String(req.query.search).trim() : '';

      const whereClause: any = {
        role: Role.PATIENT,
        isActive: true,
      };

      if (search) {
        whereClause.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      const patients = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: {
            select: {
              appointments: true,
              medicalRecords: true,
            },
          },
          appointments: {
            orderBy: { scheduledAt: 'desc' },
            take: 1,
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              doctor: {
                select: {
                  user: { select: { fullName: true } },
                  specialty: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { fullName: 'asc' },
        take: 50,
      });

      return res.status(200).json({
        count: patients.length,
        patients: patients.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          createdAt: p.createdAt,
          totalAppointments: p._count.appointments,
          totalRecords: p._count.medicalRecords,
          lastAppointment: p.appointments[0]
            ? {
                id: p.appointments[0].id,
                date: p.appointments[0].scheduledAt,
                status: p.appointments[0].status,
                doctorName: p.appointments[0].doctor.user.fullName,
                specialty: p.appointments[0].doctor.specialty.name,
              }
            : null,
        })),
      });
    } catch (error: any) {
      console.error('Error al listar pacientes:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al consultar el directorio de pacientes.',
      });
    }
  }
);

// GET /api/patients/:id/history (DOCTOR, ADMIN, RECEPTIONIST)
router.get(
  '/:id/history',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const patient = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado.' });
      }

      // Consultar todas las citas del paciente con triajes y registros médicos
      const appointments = await prisma.appointment.findMany({
        where: { patientId: id },
        include: {
          triage: true,
          medicalRecord: true,
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      });

      // Extraer y consolidar alergias reportadas en triajes
      const allergiesSet = new Set<string>();
      const triagesList = appointments
        .filter((a) => a.triage !== null)
        .map((a) => {
          if (a.triage?.allergies && a.triage.allergies.trim()) {
            allergiesSet.add(a.triage.allergies.trim());
          }
          return {
            appointmentId: a.id,
            date: a.scheduledAt,
            ...a.triage,
          };
        });

      // Consultar historial de atenciones médicas completadas
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: { patientId: id },
        include: {
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
          attachments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({
        patient,
        allergies: Array.from(allergiesSet),
        triagesCount: triagesList.length,
        triages: triagesList,
        medicalRecordsCount: medicalRecords.length,
        medicalRecords: medicalRecords.map((m) => ({
          id: m.id,
          date: m.createdAt,
          diagnosis: m.diagnosis,
          prescription: m.prescription,
          notes: m.notes,
          doctorName: m.doctor.user.fullName,
          specialty: m.doctor.specialty.name,
          licenseNumber: m.doctor.licenseNumber,
          appointmentReason: m.appointment.reason,
          attachments: m.attachments,
        })),
        appointmentsSummary: {
          total: appointments.length,
          completed: appointments.filter((a) => a.status === 'COMPLETED').length,
          cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
          pendingOrConfirmed: appointments.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status)).length,
        },
      });
    } catch (error: any) {
      console.error('Error al obtener expediente histórico del paciente:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al consultar el expediente del paciente.',
      });
    }
  }
);

export default router;
