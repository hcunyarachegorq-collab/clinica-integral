import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, AuthRequest, UserPayload } from '../middlewares/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clinica_jwt_secret_key_2026_super_secure';

// Esquemas de validación Zod
const registerSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  fullName: z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos de registro inválidos',
        details: parseResult.error.format(),
      });
    }

    const { email, password, fullName, phone } = parseResult.data;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado en la plataforma.',
      });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario con rol PATIENT por defecto
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        phone,
        role: Role.PATIENT,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Generar token JWT
    const payload: UserPayload = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Paciente registrado exitosamente',
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error('Error en /api/auth/register:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al procesar el registro.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Credenciales inválidas',
        details: parseResult.error.format(),
      });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        doctorProfile: {
          include: {
            specialty: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas. Verifica tu correo y contraseña.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Tu cuenta se encuentra inactiva. Contacta a recepción.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas. Verifica tu correo y contraseña.',
      });
    }

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        doctorProfileId: user.doctorProfile?.id || null,
        specialty: user.doctorProfile?.specialty?.name || null,
      },
    });
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al procesar el inicio de sesión.',
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        doctorProfile: {
          include: {
            specialty: true,
            schedules: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      user,
    });
  } catch (error: any) {
    console.error('Error en /api/auth/me:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al obtener el perfil.',
    });
  }
});

// PATCH /api/auth/profile (Actualizar nombre y teléfono)
const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres').optional(),
  phone: z.string().optional().nullable(),
});

router.patch('/profile', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos de perfil inválidos',
        details: parseResult.error.format(),
      });
    }

    const { fullName, phone } = parseResult.data;
    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName.trim();
    if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        doctorProfile: {
          include: {
            specialty: true,
            schedules: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al actualizar perfil.',
    });
  }
});

// PATCH /api/auth/password (Cambiar contraseña)
const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

router.patch('/password', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const parseResult = updatePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos de contraseña inválidos',
        details: parseResult.error.format(),
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        error: 'La contraseña actual no es correcta.',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return res.status(200).json({
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error: any) {
    console.error('Error al actualizar contraseña:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al actualizar contraseña.',
    });
  }
});

export default router;
