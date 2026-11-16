import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJwt, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/notifications - Listar las últimas 20 notificaciones del usuario
router.get('/', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      }),
    ]);

    return res.status(200).json({
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar notificaciones.',
    });
  }
});

// PATCH /api/notifications/read-all - Marcar todas como leídas
router.patch('/read-all', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      message: 'Todas las notificaciones han sido marcadas como leídas',
    });
  } catch (error: any) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    return res.status(500).json({
      error: 'Error interno al actualizar notificaciones.',
    });
  }
});

// PATCH /api/notifications/:id/read - Marcar una notificación individual como leída
router.patch('/:id/read', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada o no pertenece a tu cuenta.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({
      message: 'Notificación marcada como leída',
      notification: updated,
    });
  } catch (error: any) {
    console.error('Error al marcar notificación como leída:', error);
    return res.status(500).json({
      error: 'Error interno al actualizar la notificación.',
    });
  }
});

export default router;
