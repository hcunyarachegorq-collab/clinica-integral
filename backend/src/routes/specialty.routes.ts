import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';

const router = Router();

const createSpecialtySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  iconName: z.string().optional(),
});

// GET /api/specialties
router.get('/', async (_req: Request, res: Response) => {
  try {
    const specialties = await prisma.specialty.findMany({
      include: {
        _count: {
          select: { doctors: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      specialties: specialties.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        iconName: s.iconName,
        doctorsCount: s._count.doctors,
      })),
    });
  } catch (error: any) {
    console.error('Error en /api/specialties:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar las especialidades.',
    });
  }
});

// POST /api/specialties (Solo Administradores)
router.post(
  '/',
  authenticateJwt,
  authorizeRoles(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const parseResult = createSpecialtySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos inválidos para la especialidad',
          details: parseResult.error.format(),
        });
      }

      const { name, description, iconName } = parseResult.data;

      const existing = await prisma.specialty.findUnique({
        where: { name },
      });

      if (existing) {
        return res.status(409).json({
          error: 'Ya existe una especialidad con este nombre.',
        });
      }

      const specialty = await prisma.specialty.create({
        data: { name, description, iconName },
      });

      return res.status(201).json({
        message: 'Especialidad creada exitosamente',
        specialty,
      });
    } catch (error: any) {
      console.error('Error al crear especialidad:', error);
      return res.status(500).json({
        error: 'Error interno al registrar la especialidad.',
      });
    }
  }
);

export default router;
