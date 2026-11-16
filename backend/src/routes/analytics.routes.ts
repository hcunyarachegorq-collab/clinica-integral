import { Router, Response } from 'express';
import { Role, AppointmentStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/analytics/summary (Solo ADMIN)
router.get(
  '/summary',
  authenticateJwt,
  authorizeRoles(Role.ADMIN),
  async (_req: AuthRequest, res: Response) => {
    try {
      // 1. Citas totales con doctores y especialidades
      const appointments = await prisma.appointment.findMany({
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      // 2. Ingresos recaudados (PAID) e ingresos pendientes (UNPAID y no CANCELLED)
      let totalRevenue = 0;
      let pendingRevenue = 0;

      for (const app of appointments) {
        if (app.paymentStatus === PaymentStatus.PAID) {
          totalRevenue += app.amountPaid ? Number(app.amountPaid) : Number(app.doctor.consultationFee);
        } else if (app.paymentStatus === PaymentStatus.UNPAID && app.status !== AppointmentStatus.CANCELLED) {
          pendingRevenue += Number(app.doctor.consultationFee);
        }
      }

      // 3. Distribución por Estado
      const totalAppointments = appointments.length;
      const completedCount = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
      const confirmedCount = appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length;
      const pendingCount = appointments.filter((a) => a.status === AppointmentStatus.PENDING).length;
      const cancelledCount = appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length;

      const nonCancelledCount = totalAppointments - cancelledCount;
      const attendanceRate = nonCancelledCount > 0
        ? Math.round((completedCount / nonCancelledCount) * 100)
        : 0;

      // 4. Pacientes únicos atendidos
      const uniquePatients = new Set(
        appointments
          .filter((a) => a.status === AppointmentStatus.COMPLETED)
          .map((a) => a.patientId)
      );

      // 5. Citas agrupadas por especialidad
      const specialtyMap: Record<string, number> = {};
      for (const app of appointments) {
        const specName = app.doctor.specialty.name;
        specialtyMap[specName] = (specialtyMap[specName] || 0) + 1;
      }

      const bySpecialty = Object.entries(specialtyMap).map(([name, count]) => ({
        name,
        count,
        percentage: totalAppointments > 0 ? Math.round((count / totalAppointments) * 100) : 0,
      }));

      // 6. Rendimiento y Top de Médicos
      const doctorMap: Record<
        string,
        {
          name: string;
          specialty: string;
          completedCount: number;
          totalCount: number;
          revenue: number;
        }
      > = {};

      for (const app of appointments) {
        const docId = app.doctorId;
        if (!doctorMap[docId]) {
          doctorMap[docId] = {
            name: app.doctor.user.fullName,
            specialty: app.doctor.specialty.name,
            completedCount: 0,
            totalCount: 0,
            revenue: 0,
          };
        }

        doctorMap[docId].totalCount += 1;
        if (app.status === AppointmentStatus.COMPLETED) {
          doctorMap[docId].completedCount += 1;
        }
        if (app.paymentStatus === PaymentStatus.PAID) {
          doctorMap[docId].revenue += app.amountPaid ? Number(app.amountPaid) : Number(app.doctor.consultationFee);
        }
      }

      const topDoctors = Object.values(doctorMap).sort((a, b) => b.completedCount - a.completedCount);

      return res.status(200).json({
        financial: {
          totalRevenue,
          pendingRevenue,
          currency: 'USD',
        },
        appointments: {
          total: totalAppointments,
          completed: completedCount,
          confirmed: confirmedCount,
          pending: pendingCount,
          cancelled: cancelledCount,
          attendanceRate,
        },
        patients: {
          totalUniqueAttended: uniquePatients.size,
        },
        bySpecialty,
        topDoctors,
      });
    } catch (error: any) {
      console.error('Error al generar resumen analítico:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al calcular métricas analíticas.',
      });
    }
  }
);

export default router;
