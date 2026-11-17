import { Router, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

const createMedicationSchema = z.object({
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres (ej: MED-001)'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  presentation: z.string().min(2, 'La presentación es requerida (ej: Caja x 20 tabletas)'),
  category: z.string().min(2, 'La categoría es requerida'),
  price: z.number().positive('El precio debe ser mayor a 0'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  minStock: z.number().int().min(1, 'El stock mínimo debe ser al menos 1').default(10).optional(),
});

const updateMedicationSchema = z.object({
  name: z.string().min(2).optional(),
  presentation: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(1).optional(),
  replenishQuantity: z.number().int().positive('La cantidad a reponer debe ser mayor a 0').optional(),
  isActive: z.boolean().optional(),
});

// GET /api/medications (ADMIN, DOCTOR, RECEPTIONIST)
router.get(
  '/',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { search, category, lowStockOnly, onlyActive } = req.query;

      const whereClause: any = {};

      if (onlyActive !== 'false') {
        whereClause.isActive = true;
      }

      if (category && typeof category === 'string' && category !== 'TODAS') {
        whereClause.category = category;
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        const query = search.trim();
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { presentation: { contains: query, mode: 'insensitive' } },
        ];
      }

      let medications = await prisma.medication.findMany({
        where: whereClause,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      if (lowStockOnly === 'true') {
        medications = medications.filter((m) => m.stock <= m.minStock);
      }

      return res.status(200).json({
        count: medications.length,
        medications,
      });
    } catch (error: any) {
      console.error('Error al listar medicamentos:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al consultar medicamentos de botica.',
      });
    }
  }
);

// GET /api/medications/:id (ADMIN, DOCTOR, RECEPTIONIST)
router.get(
  '/:id',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const medication = await prisma.medication.findUnique({
        where: { id },
      });

      if (!medication) {
        return res.status(404).json({ error: 'Medicamento no encontrado' });
      }

      return res.status(200).json({ medication });
    } catch (error: any) {
      console.error('Error al obtener medicamento:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// POST /api/medications (Solo ADMIN)
router.post(
  '/',
  authenticateJwt,
  authorizeRoles(Role.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const parseResult = createMedicationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos inválidos para registrar medicamento',
          details: parseResult.error.format(),
        });
      }

      const { code, name, presentation, category, price, stock, minStock } = parseResult.data;

      const existing = await prisma.medication.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (existing) {
        return res.status(409).json({
          error: `Ya existe un medicamento registrado con el código "${code.toUpperCase()}".`,
        });
      }

      const medication = await prisma.medication.create({
        data: {
          code: code.toUpperCase(),
          name,
          presentation,
          category,
          price,
          stock,
          minStock: minStock || 10,
          isActive: true,
        },
      });

      return res.status(201).json({
        message: 'Medicamento registrado exitosamente en la botica',
        medication,
      });
    } catch (error: any) {
      console.error('Error al crear medicamento:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al registrar medicamento.',
      });
    }
  }
);

// PATCH /api/medications/:id (Solo ADMIN: edición o reposición de stock)
router.patch(
  '/:id',
  authenticateJwt,
  authorizeRoles(Role.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = updateMedicationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos inválidos para actualizar medicamento',
          details: parseResult.error.format(),
        });
      }

      const existing = await prisma.medication.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Medicamento no encontrado' });
      }

      const { name, presentation, category, price, stock, minStock, replenishQuantity, isActive } = parseResult.data;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (presentation !== undefined) updateData.presentation = presentation;
      if (category !== undefined) updateData.category = category;
      if (price !== undefined) updateData.price = price;
      if (minStock !== undefined) updateData.minStock = minStock;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (replenishQuantity !== undefined) {
        updateData.stock = { increment: replenishQuantity };
      } else if (stock !== undefined) {
        updateData.stock = stock;
      }

      const updated = await prisma.medication.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        message: 'Medicamento actualizado correctamente',
        medication: updated,
      });
    } catch (error: any) {
      console.error('Error al actualizar medicamento:', error);
      return res.status(500).json({
        error: 'Error interno del servidor al actualizar medicamento.',
      });
    }
  }
);

// DELETE /api/medications/:id (Solo ADMIN: borrado lógico)
router.delete(
  '/:id',
  authenticateJwt,
  authorizeRoles(Role.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await prisma.medication.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Medicamento no encontrado' });
      }

      const deactivated = await prisma.medication.update({
        where: { id },
        data: { isActive: false },
      });

      return res.status(200).json({
        message: 'Medicamento desactivado del catálogo de botica',
        medication: deactivated,
      });
    } catch (error: any) {
      console.error('Error al desactivar medicamento:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

export default router;
