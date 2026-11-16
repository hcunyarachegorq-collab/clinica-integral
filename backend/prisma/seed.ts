import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed de Base de Datos Médica ---');

  // 1. Password Hashes
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const doctorPassword = await bcrypt.hash('Doctor123!', 10);
  const patientPassword = await bcrypt.hash('Paciente123!', 10);

  // 2. Administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      fullName: 'Administrador del Sistema',
      phone: '+1 800-555-0100',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`[Seed] Administrador creado/verificado: ${admin.email}`);

  // 3. Especialidades
  const medGeneral = await prisma.specialty.upsert({
    where: { name: 'Medicina General' },
    update: {},
    create: {
      name: 'Medicina General',
      description: 'Atención primaria y diagnóstico preventivo integral para pacientes de todas las edades.',
      iconName: 'stethoscope',
    },
  });

  const cardiologia = await prisma.specialty.upsert({
    where: { name: 'Cardiología' },
    update: {},
    create: {
      name: 'Cardiología',
      description: 'Diagnóstico, tratamiento y prevención de trastornos del corazón y del sistema circulatorio.',
      iconName: 'heart-pulse',
    },
  });

  const pediatria = await prisma.specialty.upsert({
    where: { name: 'Pediatría' },
    update: {},
    create: {
      name: 'Pediatría',
      description: 'Cuidado médico, control de desarrollo y vacunación para infantes y adolescentes.',
      iconName: 'baby',
    },
  });
  console.log('[Seed] Especialidades creadas: Medicina General, Cardiología, Pediatría');

  // 4. Doctor 1: Dr. Carlos García (Medicina General)
  const userGarcia = await prisma.user.upsert({
    where: { email: 'dr.garcia@clinica.com' },
    update: {},
    create: {
      email: 'dr.garcia@clinica.com',
      fullName: 'Dr. Carlos García',
      phone: '+1 800-555-0101',
      passwordHash: doctorPassword,
      role: Role.DOCTOR,
      isActive: true,
    },
  });

  const doctorGarcia = await prisma.doctorProfile.upsert({
    where: { userId: userGarcia.id },
    update: {},
    create: {
      userId: userGarcia.id,
      specialtyId: medGeneral.id,
      licenseNumber: 'MED-10492-GEN',
      bio: 'Médico con más de 12 años de trayectoria en atención primaria, manejo de enfermedades crónicas y medicina preventiva.',
      consultationFee: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '14:00', slotDurationMinutes: 30 }, // Lunes
          { dayOfWeek: 3, startTime: '08:00', endTime: '14:00', slotDurationMinutes: 30 }, // Miércoles
          { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDurationMinutes: 30 }, // Viernes
        ],
      },
    },
  });
  console.log(`[Seed] Doctor 1 registrado: ${userGarcia.fullName} (${medGeneral.name})`);

  // 5. Doctor 2: Dra. Elena López (Cardiología)
  const userLopez = await prisma.user.upsert({
    where: { email: 'dra.lopez@clinica.com' },
    update: {},
    create: {
      email: 'dra.lopez@clinica.com',
      fullName: 'Dra. Elena López',
      phone: '+1 800-555-0102',
      passwordHash: doctorPassword,
      role: Role.DOCTOR,
      isActive: true,
    },
  });

  const doctorLopez = await prisma.doctorProfile.upsert({
    where: { userId: userLopez.id },
    update: {},
    create: {
      userId: userLopez.id,
      specialtyId: cardiologia.id,
      licenseNumber: 'CARDIO-88310-ESP',
      bio: 'Especialista en ecocardiografía avanzada, hipertensión arterial y prevención de riesgo cardiovascular.',
      consultationFee: 85.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30 }, // Martes
          { dayOfWeek: 4, startTime: '09:00', endTime: '16:00', slotDurationMinutes: 30 }, // Jueves
        ],
      },
    },
  });
  console.log(`[Seed] Doctor 2 registrada: ${userLopez.fullName} (${cardiologia.name})`);

  // 6. Paciente de prueba
  const paciente = await prisma.user.upsert({
    where: { email: 'paciente@clinica.com' },
    update: {},
    create: {
      email: 'paciente@clinica.com',
      fullName: 'Juan Pérez Gómez',
      phone: '+1 800-555-0199',
      passwordHash: patientPassword,
      role: Role.PATIENT,
      isActive: true,
    },
  });
  console.log(`[Seed] Paciente de prueba registrado: ${paciente.email}`);

  console.log('--- Seed completado exitosamente ---');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
