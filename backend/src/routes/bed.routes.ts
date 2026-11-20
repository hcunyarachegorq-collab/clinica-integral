import { Router, Response } from 'express';
import { Role, BedStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/beds - Listar camillas y boxes de observación
router.get(
  '/',
  authenticateJwt,
  async (_req: AuthRequest, res: Response) => {
    try {
      const beds = await prisma.observationBed.findMany({
        orderBy: { code: 'asc' },
      });

      return res.status(200).json({
        count: beds.length,
        beds,
      });
    } catch (error: any) {
      console.error('Error al listar camillas de observación:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al consultar camillas de observación.',
      });
    }
  }
);

// PATCH /api/beds/:id/admit - Ingresar paciente a un box o camilla
router.patch(
  '/:id/admit',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST, Role.NURSE),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        currentPatientName,
        currentPatientId,
        reason,
        procedure,
        fee,
      } = req.body;

      if (!currentPatientName || typeof currentPatientName !== 'string' || currentPatientName.trim() === '') {
        return res.status(400).json({
          error: 'El nombre del paciente es obligatorio para el ingreso a observación.',
        });
      }

      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return res.status(400).json({
          error: 'El motivo de observación o urgencia es obligatorio.',
        });
      }

      const bed = await prisma.observationBed.findUnique({
        where: { id },
      });

      if (!bed) {
        return res.status(404).json({ error: 'Camilla o Box no encontrado.' });
      }

      const updatedBed = await prisma.observationBed.update({
        where: { id },
        data: {
          status: BedStatus.OCCUPIED,
          currentPatientName: currentPatientName.trim(),
          currentPatientId: currentPatientId || null,
          reason: reason.trim(),
          procedure: procedure ? procedure.trim() : 'Observación y monitorización',
          fee: fee ? Number(fee) : 0,
          paid: false,
          admittedAt: new Date(),
        },
      });

      return res.status(200).json({
        message: `Paciente ingresado exitosamente a ${bed.code}.`,
        bed: updatedBed,
      });
    } catch (error: any) {
      console.error('Error al ingresar paciente a camilla:', error);
      return res.status(500).json({
        error: 'Error interno al registrar el ingreso a camilla.',
      });
    }
  }
);

// PATCH /api/beds/:id/discharge - Dar de alta y liberar camilla / box
router.patch(
  '/:id/discharge',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST, Role.NURSE),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { paid, nextStatus } = req.body;

      const bed = await prisma.observationBed.findUnique({
        where: { id },
      });

      if (!bed) {
        return res.status(404).json({ error: 'Camilla o Box no encontrado.' });
      }

      const targetStatus: BedStatus =
        nextStatus === 'CLEANING' ? BedStatus.CLEANING : BedStatus.AVAILABLE;

      const updatedBed = await prisma.observationBed.update({
        where: { id },
        data: {
          status: targetStatus,
          currentPatientName: null,
          currentPatientId: null,
          reason: null,
          procedure: null,
          fee: 0,
          paid: false,
          admittedAt: null,
        },
      });

      return res.status(200).json({
        message: `Box ${bed.code} dado de alta y marcado como ${targetStatus === BedStatus.AVAILABLE ? 'Disponible' : 'En Limpieza'}.`,
        bed: updatedBed,
        dischargedPatient: bed.currentPatientName,
        totalCharged: bed.fee,
        wasPaid: paid === true || bed.paid,
      });
    } catch (error: any) {
      console.error('Error al dar de alta camilla:', error);
      return res.status(500).json({
        error: 'Error interno al procesar el alta de la camilla.',
      });
    }
  }
);

// PATCH /api/beds/:id/status - Cambiar estado directo (ej. de CLEANING a AVAILABLE)
router.patch(
  '/:id/status',
  authenticateJwt,
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.RECEPTIONIST, Role.NURSE),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(BedStatus).includes(status)) {
        return res.status(400).json({ error: 'Estado de camilla no válido.' });
      }

      const updatedBed = await prisma.observationBed.update({
        where: { id },
        data: { status },
      });

      return res.status(200).json({
        message: `Estado de camilla actualizado a ${status}.`,
        bed: updatedBed,
      });
    } catch (error: any) {
      console.error('Error al cambiar estado de camilla:', error);
      return res.status(500).json({
        error: 'Error interno al actualizar estado de camilla.',
      });
    }
  }
);

export default router;
