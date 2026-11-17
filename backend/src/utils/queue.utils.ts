import { prisma } from '../lib/prisma';

// Generar prefijo de especialidad (3 letras mayúsculas sin tildes)
export function getSpecialtyPrefix(specialtyName: string): string {
  const normalized = (specialtyName || 'MED')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return normalized.substring(0, 3).padEnd(3, 'X');
}

// Asignar consultorio determinista basado en el identificador del especialista (1 al 12)
export function assignConsultingRoom(doctorLicenseOrId: string): string {
  if (!doctorLicenseOrId) return 'Consultorio 1';
  let hash = 0;
  for (let i = 0; i < doctorLicenseOrId.length; i++) {
    hash = (hash << 5) - hash + doctorLicenseOrId.charCodeAt(i);
    hash |= 0;
  }
  const roomNum = (Math.abs(hash) % 12) + 1;
  return `Consultorio ${roomNum}`;
}

// Generar código de turno correlativo del día (ej. MED-01, CAR-03)
export async function generateQueueCode(specialtyName: string, date: Date = new Date()): Promise<string> {
  const prefix = getSpecialtyPrefix(specialtyName);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const countToday = await prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        queueCode: {
          startsWith: prefix,
        },
      },
    });

    const correlative = countToday + 1;
    return `${prefix}-${String(correlative).padStart(2, '0')}`;
  } catch (err) {
    console.error('Error al generar correlativo de turno:', err);
    return `${prefix}-01`;
  }
}
