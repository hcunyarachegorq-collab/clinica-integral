import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function cleanText(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  let cleaned = text;

  // Reemplazos específicos para los registros dañados
  cleaned = cleaned
    .replace(/Hipertensi\uFFFDn/g, 'Hipertensión')
    .replace(/Hipertensin/g, 'Hipertensión')
    .replace(/Hipertensin/g, 'Hipertensión')
    .replace(/Losart\uFFFDn/g, 'Losartán')
    .replace(/Losartn/g, 'Losartán')
    .replace(/Losartn/g, 'Losartán')
    .replace(/ma\uFFFDana/g, 'mañana')
    .replace(/maana/g, 'mañana')
    .replace(/maana/g, 'mañana')
    .replace(/Pr\uFFFDximo/g, 'Próximo')
    .replace(/Prximo/g, 'Próximo')
    .replace(/Prximo/g, 'Próximo')
    .replace(/presi\uFFFDn/g, 'presión')
    .replace(/presin/g, 'presión')
    .replace(/presin/g, 'presión')
    .replace(/atenci\uFFFDn/g, 'atención')
    .replace(/atencin/g, 'atención')
    .replace(/atencin/g, 'atención')
    .replace(/quir\uFFFDrgicos/g, 'quirúrgicos')
    .replace(/quirrgicos/g, 'quirúrgicos')
    .replace(/quirrgicos/g, 'quirúrgicos')
    .replace(/Fern\uFFFDndez/g, 'Fernández')
    .replace(/Fernndez/g, 'Fernández')
    .replace(/Fernndez/g, 'Fernández')
    .replace(/Garc\uFFFDa/g, 'García')
    .replace(/Garca/g, 'García')
    .replace(/Garca/g, 'García')
    .replace(/L\uFFFDpez/g, 'López')
    .replace(/Lpez/g, 'López')
    .replace(/Lpez/g, 'López')
    .replace(/P\uFFFDrez/g, 'Pérez')
    .replace(/Prez/g, 'Pérez')
    .replace(/Prez/g, 'Pérez')
    .replace(/nutrici\uFFFDn/g, 'nutrición')
    .replace(/nutricin/g, 'nutrición')
    .replace(/nutricin/g, 'nutrición')
    .replace(/ecocardiograf\uFFFDa/g, 'ecocardiografía')
    .replace(/ecocardiografa/g, 'ecocardiografía')
    .replace(/m\uFFFDdico/g, 'médico')
    .replace(/mdico/g, 'médico')
    .replace(/diagn\uFFFDstico/g, 'diagnóstico')
    .replace(/diagnstico/g, 'diagnóstico')
    .replace(/coraz\uFFFDn/g, 'corazón')
    .replace(/corazn/g, 'corazón')
    .replace(/Pediatr\uFFFDa/g, 'Pediatría')
    .replace(/Pediatra/g, 'Pediatría')
    .replace(/Cardiolog\uFFFDa/g, 'Cardiología')
    .replace(/Cardiologa/g, 'Cardiología')
    // Eliminar cualquier residuo de \uFFFD
    .replace(/\uFFFD/g, '');

  return cleaned;
}

async function fixDatabaseEncoding() {
  console.log('--- Iniciando Limpieza y Corrección de Codificación UTF-8 ---');

  // 1. Corregir MedicalRecords
  const medicalRecords = await prisma.medicalRecord.findMany();
  console.log(`Revisando ${medicalRecords.length} registros médicos...`);
  for (const record of medicalRecords) {
    const updatedDiagnosis = cleanText(record.diagnosis) || record.diagnosis;
    const updatedPrescription = cleanText(record.prescription) || record.prescription;
    const updatedNotes = cleanText(record.notes) ?? record.notes;

    if (
      updatedDiagnosis !== record.diagnosis ||
      updatedPrescription !== record.prescription ||
      updatedNotes !== record.notes
    ) {
      await prisma.medicalRecord.update({
        where: { id: record.id },
        data: {
          diagnosis: updatedDiagnosis,
          prescription: updatedPrescription,
          notes: updatedNotes,
        },
      });
      console.log(`[MedicalRecord Corregido] ID: ${record.id}`);
      console.log(`  Diagnóstico: ${updatedDiagnosis}`);
      console.log(`  Receta: ${updatedPrescription}`);
      console.log(`  Notas: ${updatedNotes}`);
    }
  }

  // 2. Corregir Appointments
  const appointments = await prisma.appointment.findMany();
  console.log(`Revisando ${appointments.length} citas...`);
  for (const app of appointments) {
    const updatedReason = cleanText(app.reason) || app.reason;
    const updatedNotes = cleanText(app.notes) ?? app.notes;

    if (updatedReason !== app.reason || updatedNotes !== app.notes) {
      await prisma.appointment.update({
        where: { id: app.id },
        data: {
          reason: updatedReason,
          notes: updatedNotes,
        },
      });
      console.log(`[Appointment Corregido] ID: ${app.id}: "${updatedReason}"`);
    }
  }

  // 3. Corregir Users
  const users = await prisma.user.findMany();
  console.log(`Revisando ${users.length} usuarios...`);
  for (const u of users) {
    const updatedName = cleanText(u.fullName) || u.fullName;
    if (updatedName !== u.fullName) {
      await prisma.user.update({
        where: { id: u.id },
        data: { fullName: updatedName },
      });
      console.log(`[User Corregido] ${u.email}: "${u.fullName}" -> "${updatedName}"`);
    }
  }

  // 4. Corregir DoctorProfiles
  const doctors = await prisma.doctorProfile.findMany();
  console.log(`Revisando ${doctors.length} perfiles médicos...`);
  for (const d of doctors) {
    const updatedBio = cleanText(d.bio) ?? d.bio;
    if (updatedBio !== d.bio) {
      await prisma.doctorProfile.update({
        where: { id: d.id },
        data: { bio: updatedBio },
      });
      console.log(`[DoctorProfile Corregido] ID: ${d.id}`);
    }
  }

  // 5. Corregir Specialties
  const specialties = await prisma.specialty.findMany();
  console.log(`Revisando ${specialties.length} especialidades...`);
  for (const s of specialties) {
    const updatedName = cleanText(s.name) || s.name;
    const updatedDesc = cleanText(s.description) ?? s.description;
    if (updatedName !== s.name || updatedDesc !== s.description) {
      await prisma.specialty.update({
        where: { id: s.id },
        data: {
          name: updatedName,
          description: updatedDesc,
        },
      });
      console.log(`[Specialty Corregida] ${s.name} -> ${updatedName}`);
    }
  }

  console.log('--- Limpieza de Codificación Finalizada con Éxito ---');
}

fixDatabaseEncoding()
  .catch((e) => {
    console.error('Error durante la corrección:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
