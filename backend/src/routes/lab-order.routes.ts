import { Router, Response } from 'express';
import { Role, LabOrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/lab-orders/catalog - Listar catálogo de exámenes (ADMIN, DOCTOR, RECEPTIONIST)
router.get(
  '/catalog',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  async (_req: AuthRequest, res: Response) => {
    try {
      const items = await prisma.labCatalogItem.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return res.status(200).json({
        count: items.length,
        items,
      });
    } catch (error: any) {
      console.error('Error al obtener catálogo de laboratorio:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al consultar catálogo de exámenes.',
      });
    }
  }
);

// GET /api/lab-orders - Listar órdenes según rol del usuario
router.get(
  '/',
  authenticateJwt,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { status, search } = req.query;

      let whereClause: any = {};

      if (user.role === Role.PATIENT) {
        whereClause.patientId = user.id;
      } else if (user.role === Role.DOCTOR) {
        const docProfile = await prisma.doctorProfile.findUnique({
          where: { userId: user.id },
        });
        if (docProfile) {
          whereClause.doctorId = docProfile.id;
        }
      }

      if (status && typeof status === 'string' && status !== 'TODOS') {
        whereClause.status = status as LabOrderStatus;
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        const query = search.trim();
        whereClause.OR = [
          { catalogItem: { name: { contains: query, mode: 'insensitive' } } },
          { catalogItem: { code: { contains: query, mode: 'insensitive' } } },
          { patient: { fullName: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const orders = await prisma.labOrder.findMany({
        where: whereClause,
        include: {
          catalogItem: true,
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
          medicalRecord: {
            select: {
              id: true,
              diagnosis: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        count: orders.length,
        orders,
      });
    } catch (error: any) {
      console.error('Error al listar órdenes de laboratorio:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al consultar órdenes de laboratorio e imágenes.',
      });
    }
  }
);

// PATCH /api/lab-orders/:id/pay - Marcar orden como pagada (ADMIN, RECEPTIONIST)
router.patch(
  '/:id/pay',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const order = await prisma.labOrder.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({ error: 'Orden de laboratorio no encontrada.' });
      }

      const updated = await prisma.labOrder.update({
        where: { id },
        data: { paid: true },
        include: {
          catalogItem: true,
          patient: { select: { fullName: true } },
        },
      });

      return res.status(200).json({
        message: 'Orden marcada como pagada correctamente.',
        order: updated,
      });
    } catch (error: any) {
      console.error('Error al registrar pago de orden de laboratorio:', error);
      return res.status(500).json({
        error: 'Error interno al registrar el cobro de la orden.',
      });
    }
  }
);

// PATCH /api/lab-orders/:id/result - Registrar resultado y completar orden
router.patch(
  '/:id/result',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { resultSummary, resultFileBase64, resultFileName } = req.body;

      if (!resultSummary || typeof resultSummary !== 'string' || resultSummary.trim() === '') {
        return res.status(400).json({
          error: 'El resumen o informe del resultado clínico es obligatorio.',
        });
      }

      const order = await prisma.labOrder.findUnique({
        where: { id },
        include: {
          catalogItem: true,
          patient: { select: { id: true, fullName: true } },
          doctor: { select: { userId: true, user: { select: { fullName: true } } } },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Orden de laboratorio no encontrada.' });
      }

      const updatedOrder = await prisma.labOrder.update({
        where: { id },
        data: {
          resultSummary: resultSummary.trim(),
          resultFileBase64: resultFileBase64 || null,
          resultFileName: resultFileName || null,
          status: LabOrderStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          catalogItem: true,
          patient: { select: { id: true, fullName: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      });

      // Notificación automática al paciente
      await prisma.notification.create({
        data: {
          userId: order.patient.id,
          title: 'Resultado de Examen Disponible',
          message: `El resultado de tu examen "${order.catalogItem.name}" ya se encuentra listo y disponible en tu historial.`,
          type: 'LAB_RESULT',
        },
      }).catch((e) => console.error('Error creando notificación al paciente:', e));

      // Notificación automática al médico solicitante
      if (order.doctor.userId) {
        await prisma.notification.create({
          data: {
            userId: order.doctor.userId,
            title: 'Resultado de Examen Registrado',
            message: `El informe del examen "${order.catalogItem.name}" del paciente ${order.patient.fullName} ya fue completado.`,
            type: 'LAB_RESULT',
          },
        }).catch((e) => console.error('Error creando notificación al médico:', e));
      }

      return res.status(200).json({
        message: 'Resultado registrado y orden completada con éxito.',
        order: updatedOrder,
      });
    } catch (error: any) {
      console.error('Error al registrar resultado de laboratorio:', error);
      return res.status(500).json({
        error: 'Error interno al registrar el resultado de laboratorio.',
      });
    }
  }
);

export default router;
