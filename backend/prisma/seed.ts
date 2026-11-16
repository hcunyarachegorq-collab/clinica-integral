import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface DoctorSeedData {
  fullName: string;
  email: string;
  phone: string;
  specialtyName: string;
  licenseNumber: string;
  bio: string;
  consultationFee: number;
  group: 'A' | 'B' | 'C' | 'D' | 'E';
  reviews?: {
    rating: number;
    comment: string;
  }[];
}

async function main() {
  console.log('--- Iniciando Seed Médico Completo (12 Especialidades & 42 Doctores) ---');

  // 1. Password Hashes comunes
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const doctorPassword = await bcrypt.hash('Doctor123!', 10);
  const patientPassword = await bcrypt.hash('Paciente123!', 10);

  // 2. Administrador del Sistema
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      fullName: 'Administrador del Sistema',
      phone: '+51 987 654 321',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`[Seed] Administrador listo: ${admin.email}`);

  // 3. Paciente de prueba oficial
  const paciente = await prisma.user.upsert({
    where: { email: 'paciente@clinica.com' },
    update: {},
    create: {
      email: 'paciente@clinica.com',
      fullName: 'Juan Pérez Gómez',
      phone: '+51 912 345 678',
      passwordHash: patientPassword,
      role: Role.PATIENT,
      isActive: true,
    },
  });
  console.log(`[Seed] Paciente de prueba listo: ${paciente.email}`);

  // 4. Las 12 Especialidades Médicas
  const specialtiesData = [
    {
      name: 'Medicina General',
      description: 'Atención médica primaria, diagnóstico integral y prevención de enfermedades comunes para toda la familia.',
      iconName: 'stethoscope',
    },
    {
      name: 'Cardiología',
      description: 'Diagnóstico, tratamiento y prevención de trastornos cardiovasculares, hipertensión arterial y arritmias.',
      iconName: 'heart-pulse',
    },
    {
      name: 'Pediatría',
      description: 'Cuidado integral de la salud, crecimiento, nutrición y vacunación para bebés, niños y adolescentes.',
      iconName: 'baby',
    },
    {
      name: 'Dermatología',
      description: 'Cuidado clínico y estético de la piel, cabello y uñas, tratamiento del acné, dermatitis y lesiones cutáneas.',
      iconName: 'sparkles',
    },
    {
      name: 'Ginecología y Obstetricia',
      description: 'Salud integral de la mujer, control prenatal, fertilidad y prevención de patologías ginecológicas.',
      iconName: 'heart',
    },
    {
      name: 'Traumatología y Ortopedia',
      description: 'Diagnóstico y rehabilitación de lesiones del aparato locomotor, fracturas, articulaciones y columna.',
      iconName: 'bone',
    },
    {
      name: 'Neurología',
      description: 'Tratamiento de trastornos del sistema nervioso, cefaleas, migrañas, epilepsia y trastornos neurodegenerativos.',
      iconName: 'brain',
    },
    {
      name: 'Oftalmología',
      description: 'Salud visual, corrección refractiva, tratamiento de glaucoma, cataratas y afecciones de la retina.',
      iconName: 'eye',
    },
    {
      name: 'Odontología Integral',
      description: 'Salud bucal, ortodoncia, endodoncia, periodoncia y estética dental preventiva y restauradora.',
      iconName: 'smile',
    },
    {
      name: 'Gastroenterología',
      description: 'Prevención y tratamiento de enfermedades del tracto digestivo, hígado, reflujo, gastritis y endoscopía.',
      iconName: 'activity',
    },
    {
      name: 'Endocrinología',
      description: 'Control de desórdenes hormonales, diabetes mellitus, patologías tiroideas, metabolismo y obesidad.',
      iconName: 'shield',
    },
    {
      name: 'Otorrinolaringología',
      description: 'Diagnóstico y tratamiento médico-quirúrgico de enfermedades de oído, nariz, senos paranasales y garganta.',
      iconName: 'ear',
    },
  ];

  const specialtyMap = new Map<string, string>();
  for (const s of specialtiesData) {
    const record = await prisma.specialty.upsert({
      where: { name: s.name },
      update: {
        description: s.description,
        iconName: s.iconName,
      },
      create: {
        name: s.name,
        description: s.description,
        iconName: s.iconName,
      },
    });
    specialtyMap.set(record.name, record.id);
  }
  console.log(`[Seed] ${specialtyMap.size} especialidades creadas/actualizadas.`);

  // 5. Configuración de los 5 Grupos de Horarios
  // Grupo A: Lunes a Viernes 07:30 a 13:00 (días 1, 2, 3, 4, 5)
  // Grupo B: Lunes a Viernes 14:00 a 19:30 (días 1, 2, 3, 4, 5)
  // Grupo C: Lunes, Miércoles, Viernes 08:30 a 15:30 (días 1, 3, 5)
  // Grupo D: Martes, Jueves, Sábado 15:00 a 20:30 (días 2, 4, 6)
  // Grupo E: Viernes 14:00 - 19:00 (día 5) y Sábado 08:00 - 14:00 (día 6)
  const getSchedulesForGroup = (group: 'A' | 'B' | 'C' | 'D' | 'E') => {
    switch (group) {
      case 'A':
        return [1, 2, 3, 4, 5].map((day) => ({
          dayOfWeek: day,
          startTime: '07:30',
          endTime: '13:00',
          slotDurationMinutes: 30,
        }));
      case 'B':
        return [1, 2, 3, 4, 5].map((day) => ({
          dayOfWeek: day,
          startTime: '14:00',
          endTime: '19:30',
          slotDurationMinutes: 30,
        }));
      case 'C':
        return [1, 3, 5].map((day) => ({
          dayOfWeek: day,
          startTime: '08:30',
          endTime: '15:30',
          slotDurationMinutes: 30,
        }));
      case 'D':
        return [2, 4, 6].map((day) => ({
          dayOfWeek: day,
          startTime: '15:00',
          endTime: '20:30',
          slotDurationMinutes: 30,
        }));
      case 'E':
        return [
          { dayOfWeek: 5, startTime: '14:00', endTime: '19:00', slotDurationMinutes: 30 },
          { dayOfWeek: 6, startTime: '08:00', endTime: '14:00', slotDurationMinutes: 30 },
        ];
    }
  };

  // 6. Catálogo de los 42 Médicos
  const doctorsCatalog: DoctorSeedData[] = [
    // --- 1. MEDICINA GENERAL (4) ---
    {
      fullName: 'Dr. Carlos García',
      email: 'dr.garcia@clinica.com',
      phone: '+51 981 112 233',
      specialtyName: 'Medicina General',
      licenseNumber: 'MED-10492-GEN',
      bio: 'Médico con más de 12 años de trayectoria en atención primaria, manejo de enfermedades crónicas y medicina preventiva integral.',
      consultationFee: 50.0,
      group: 'C',
    },
    {
      fullName: 'Dra. Sofía Valenzuela',
      email: 'dra.valenzuela@clinica.com',
      phone: '+51 982 223 344',
      specialtyName: 'Medicina General',
      licenseNumber: 'MED-22415-GEN',
      bio: 'Especialista en chequeos preventivos familiares, control de hipertensión, despistajes y medicina comunitaria.',
      consultationFee: 55.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'Excelente atención de la Dra. Sofía, muy detallada en su diagnóstico.' }],
    },
    {
      fullName: 'Dr. Alejandro Morales',
      email: 'dr.morales@clinica.com',
      phone: '+51 983 334 455',
      specialtyName: 'Medicina General',
      licenseNumber: 'MED-33829-GEN',
      bio: 'Amplia experiencia en urgencias médicas ambulatorias, tratamiento de infecciones agudas y salud ocupacional.',
      consultationFee: 60.0,
      group: 'B',
    },
    {
      fullName: 'Dra. Gabriela Navarro',
      email: 'dra.navarro@clinica.com',
      phone: '+51 984 445 566',
      specialtyName: 'Medicina General',
      licenseNumber: 'MED-45190-GEN',
      bio: 'Enfoque integral en el cuidado del adulto y adulto mayor con calidez y seguimiento médico continuo.',
      consultationFee: 50.0,
      group: 'D',
      reviews: [{ rating: 5, comment: 'Puntual y muy amable en todo momento.' }],
    },

    // --- 2. CARDIOLOGÍA (4) ---
    {
      fullName: 'Dra. Elena López',
      email: 'dra.lopez@clinica.com',
      phone: '+51 985 556 677',
      specialtyName: 'Cardiología',
      licenseNumber: 'CARDIO-88310-ESP',
      bio: 'Especialista en ecocardiografía avanzada, hipertensión arterial refractaria y prevención de riesgo cardiovascular.',
      consultationFee: 85.0,
      group: 'D',
    },
    {
      fullName: 'Dr. Roberto Mendoza',
      email: 'dr.mendoza@clinica.com',
      phone: '+51 986 667 788',
      specialtyName: 'Cardiología',
      licenseNumber: 'CARDIO-91204-ESP',
      bio: 'Cardiólogo clínico especializado en pruebas de esfuerzo, ergometría y arritmias cardíacas en adultos.',
      consultationFee: 95.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'El Dr. Mendoza me realizó un electro y explicó cada resultado con gran claridad.' }],
    },
    {
      fullName: 'Dra. Patricia Quispe',
      email: 'dra.quispe@clinica.com',
      phone: '+51 987 778 899',
      specialtyName: 'Cardiología',
      licenseNumber: 'CARDIO-93450-ESP',
      bio: 'Experta en insuficiencia cardíaca, rehabilitación post-infarto y monitorización Holter 24 horas.',
      consultationFee: 90.0,
      group: 'B',
    },
    {
      fullName: 'Dr. Javier Barrientos',
      email: 'dr.barrientos@clinica.com',
      phone: '+51 988 889 900',
      specialtyName: 'Cardiología',
      licenseNumber: 'CARDIO-97812-ESP',
      bio: 'Más de 15 años liderando unidades de cuidados coronarios y chequeos cardiológicos preventivos para deportistas.',
      consultationFee: 110.0,
      group: 'C',
      reviews: [{ rating: 5, comment: 'Atención de primer nivel, instrumental médico muy moderno.' }],
    },

    // --- 3. PEDIATRÍA (4) ---
    {
      fullName: 'Dr. Mateo Fernández',
      email: 'dr.fernandez@clinica.com',
      phone: '+51 989 990 011',
      specialtyName: 'Pediatría',
      licenseNumber: 'PED-44120-COL',
      bio: 'Pediatra con especialización en crecimiento infantil, nutrición en primera infancia y vacunas completas.',
      consultationFee: 65.0,
      group: 'A',
    },
    {
      fullName: 'Dra. Camila Rivas',
      email: 'dra.rivas@clinica.com',
      phone: '+51 990 001 122',
      specialtyName: 'Pediatría',
      licenseNumber: 'PED-50341-COL',
      bio: 'Atención empática de recién nacidos y lactantes, control de hitos del neurodesarrollo y prevención de alergias infantiles.',
      consultationFee: 70.0,
      group: 'B',
      reviews: [{ rating: 5, comment: 'Excelente con mi bebé, muy dulce y acertada con el tratamiento.' }],
    },
    {
      fullName: 'Dr. Daniel Salazar',
      email: 'dr.salazar@clinica.com',
      phone: '+51 991 112 233',
      specialtyName: 'Pediatría',
      licenseNumber: 'PED-56290-COL',
      bio: 'Experto en enfermedades respiratorias pediátricas, asma infantil y seguimiento clínico integral hasta la adolescencia.',
      consultationFee: 65.0,
      group: 'C',
    },
    {
      fullName: 'Dra. Lucía Benítez',
      email: 'dra.benitez@clinica.com',
      phone: '+51 992 223 344',
      specialtyName: 'Pediatría',
      licenseNumber: 'PED-61840-COL',
      bio: 'Cuidado pediátrico de urgencias ambulatorias y orientación en lactancia materna y alimentación complementaria.',
      consultationFee: 75.0,
      group: 'E',
      reviews: [{ rating: 5, comment: 'Nos atendió un sábado por la mañana con máxima calidez.' }],
    },

    // --- 4. DERMATOLOGÍA (4) ---
    {
      fullName: 'Dra. Valeria Ponce',
      email: 'dra.ponce@clinica.com',
      phone: '+51 993 334 455',
      specialtyName: 'Dermatología',
      licenseNumber: 'DERM-31290-ESP',
      bio: 'Dermatóloga clínica y quirúrgica, especialista en acné severo, rosácea, dermatitis atópica y control de lunares.',
      consultationFee: 85.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'Mi tratamiento para la rosácea mejoró mi piel en solo dos semanas.' }],
    },
    {
      fullName: 'Dr. Fernando Cáceres',
      email: 'dr.caceres@clinica.com',
      phone: '+51 994 445 566',
      specialtyName: 'Dermatología',
      licenseNumber: 'DERM-37418-ESP',
      bio: 'Especialista en dermatoscopía digital, prevención y detección precoz de cáncer de piel y psoriasis.',
      consultationFee: 95.0,
      group: 'B',
    },
    {
      fullName: 'Dra. Mariana Estrada',
      email: 'dra.estrada@clinica.com',
      phone: '+51 995 556 677',
      specialtyName: 'Dermatología',
      licenseNumber: 'DERM-42890-ESP',
      bio: 'Manejo integral de afecciones capilares (alopecia), rejuvenecimiento cutáneo médico y cicatrices.',
      consultationFee: 90.0,
      group: 'C',
      reviews: [{ rating: 5, comment: 'Muy profesional, resuelve todas tus dudas con paciencia.' }],
    },
    {
      fullName: 'Dr. Gonzalo Del Solar',
      email: 'dr.delsolar@clinica.com',
      phone: '+51 996 667 788',
      specialtyName: 'Dermatología',
      licenseNumber: 'DERM-48120-ESP',
      bio: 'Tratamiento de infecciones bacterianas y fúngicas de la piel, alergias cutáneas y fotodermatosis.',
      consultationFee: 80.0,
      group: 'D',
    },

    // --- 5. GINECOLOGÍA Y OBSTETRICIA (4) ---
    {
      fullName: 'Dra. Carmen Rojas',
      email: 'dra.rojas@clinica.com',
      phone: '+51 997 778 899',
      specialtyName: 'Ginecología y Obstetricia',
      licenseNumber: 'GIN-28490-ESP',
      bio: 'Especialista en control prenatal de alto riesgo, ecografía obstétrica 4D/5D y salud reproductiva integral.',
      consultationFee: 90.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'La mejor ginecóloga para llevar el control de mi embarazo.' }],
    },
    {
      fullName: 'Dr. Andrés Villavicencio',
      email: 'dr.villavicencio@clinica.com',
      phone: '+51 998 889 900',
      specialtyName: 'Ginecología y Obstetricia',
      licenseNumber: 'GIN-34180-ESP',
      bio: 'Cirugía ginecológica mínimamente invasiva, laparoscopía, manejo de miomas y endometriosis.',
      consultationFee: 100.0,
      group: 'B',
    },
    {
      fullName: 'Dra. Andrea Figueroa',
      email: 'dra.figueroa@clinica.com',
      phone: '+51 999 990 011',
      specialtyName: 'Ginecología y Obstetricia',
      licenseNumber: 'GIN-39210-ESP',
      bio: 'Planificación familiar, chequeos ginecológicos preventivos anuales (Papanicolaou, colposcopía) y climaterio.',
      consultationFee: 85.0,
      group: 'C',
      reviews: [{ rating: 5, comment: 'Muy delicada y profesional durante la consulta.' }],
    },
    {
      fullName: 'Dra. Beatriz Maldonado',
      email: 'dra.maldonado@clinica.com',
      phone: '+51 910 001 122',
      specialtyName: 'Ginecología y Obstetricia',
      licenseNumber: 'GIN-44820-ESP',
      bio: 'Enfoque preventivo en síndrome de ovario poliquístico (SOP), fertilidad y salud hormonal femenina.',
      consultationFee: 95.0,
      group: 'E',
    },

    // --- 6. TRAUMATOLOGÍA Y ORTOPEDIA (4) ---
    {
      fullName: 'Dr. Ricardo Palacios',
      email: 'dr.palacios@clinica.com',
      phone: '+51 911 112 233',
      specialtyName: 'Traumatología y Ortopedia',
      licenseNumber: 'TRAU-23490-ESP',
      bio: 'Cirujano ortopedista especialista en artroscopía de rodilla, lesiones de meniscos y ligamentos cruzados.',
      consultationFee: 95.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'Excelente traumatólogo, me ayudó a recuperar la movilidad de la rodilla.' }],
    },
    {
      fullName: 'Dra. Natalia Huamán',
      email: 'dra.huaman@clinica.com',
      phone: '+51 912 223 344',
      specialtyName: 'Traumatología y Ortopedia',
      licenseNumber: 'TRAU-29840-ESP',
      bio: 'Especialista en traumatología del hombro y codo, manguito rotador y lesiones deportivas de alto rendimiento.',
      consultationFee: 90.0,
      group: 'B',
    },
    {
      fullName: 'Dr. Hugo Zevallos',
      email: 'dr.zevallos@clinica.com',
      phone: '+51 913 334 455',
      specialtyName: 'Traumatología y Ortopedia',
      licenseNumber: 'TRAU-35210-ESP',
      bio: 'Tratamiento conservador y quirúrgico de patologías de columna vertebral, lumbalgias y hernias discales.',
      consultationFee: 110.0,
      group: 'D',
      reviews: [{ rating: 5, comment: 'Muy buen trato y diagnóstico certero para mi dolor de espalda.' }],
    },
    {
      fullName: 'Dr. Esteban Carrillo',
      email: 'dr.carrillo@clinica.com',
      phone: '+51 914 445 566',
      specialtyName: 'Traumatología y Ortopedia',
      licenseNumber: 'TRAU-41890-ESP',
      bio: 'Ortopedia infantil y del adulto, fracturas complejas, pie plano y deformidades posturales.',
      consultationFee: 85.0,
      group: 'E',
    },

    // --- 7. NEUROLOGÍA (3) ---
    {
      fullName: 'Dr. Manuel Chumpitaz',
      email: 'dr.chumpitaz@clinica.com',
      phone: '+51 915 556 677',
      specialtyName: 'Neurología',
      licenseNumber: 'NEURO-19840-ESP',
      bio: 'Neurólogo clínico experto en cefaleas complejas, migrañas crónicas, neuralgia del trigémino y dolor neuropático.',
      consultationFee: 110.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'El Dr. Chumpitaz dio con el tratamiento exacto para mis migrañas de años.' }],
    },
    {
      fullName: 'Dra. Claudia Miranda',
      email: 'dra.miranda@clinica.com',
      phone: '+51 916 667 788',
      specialtyName: 'Neurología',
      licenseNumber: 'NEURO-25410-ESP',
      bio: 'Diagnóstico y tratamiento de epilepsia en adultos, trastornos del sueño y electroencefalografía.',
      consultationFee: 120.0,
      group: 'B',
    },
    {
      fullName: 'Dr. Víctor Alarcón',
      email: 'dr.alarcon@clinica.com',
      phone: '+51 917 778 899',
      specialtyName: 'Neurología',
      licenseNumber: 'NEURO-31920-ESP',
      bio: 'Especialista en enfermedades neurodegenerativas, Parkinson, temblores y trastornos cognitivos de la memoria.',
      consultationFee: 130.0,
      group: 'C',
      reviews: [{ rating: 5, comment: 'Paciencia infinita con adultos mayores y una evaluación impecable.' }],
    },

    // --- 8. OFTALMOLOGÍA (3) ---
    {
      fullName: 'Dra. Silvia Espinoza',
      email: 'dra.espinoza@clinica.com',
      phone: '+51 918 889 900',
      specialtyName: 'Oftalmología',
      licenseNumber: 'OFT-18490-ESP',
      bio: 'Oftalmóloga especialista en cirugía refractiva láser, miopía, astigmatismo y superficie ocular.',
      consultationFee: 85.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'Excelente consulta oftalmológica y equipos de última generación.' }],
    },
    {
      fullName: 'Dr. Rodrigo Pacheco',
      email: 'dr.pacheco@clinica.com',
      phone: '+51 919 990 011',
      specialtyName: 'Oftalmología',
      licenseNumber: 'OFT-24180-ESP',
      bio: 'Experto en diagnóstico temprano y manejo de glaucoma, presión intraocular y campo visual computarizado.',
      consultationFee: 90.0,
      group: 'C',
    },
    {
      fullName: 'Dra. Teresa Samaniego',
      email: 'dra.samaniego@clinica.com',
      phone: '+51 920 001 122',
      specialtyName: 'Oftalmología',
      licenseNumber: 'OFT-29830-ESP',
      bio: 'Oftalmología pediátrica, estrabismo, ojo vago y prevención de retinopatía diabética en adultos.',
      consultationFee: 80.0,
      group: 'D',
      reviews: [{ rating: 5, comment: 'Muy atenta y rápida para recetar mis lentes.' }],
    },

    // --- 9. ODONTOLOGÍA INTEGRAL (3) ---
    {
      fullName: 'Dra. Mónica Arévalo',
      email: 'dra.arevalo@clinica.com',
      phone: '+51 921 112 233',
      specialtyName: 'Odontología Integral',
      licenseNumber: 'ODON-14290-ESP',
      bio: 'Especialista en estética dental, diseño de sonrisa, carillas cerámicas y blanqueamiento dental profesional.',
      consultationFee: 60.0,
      group: 'B',
      reviews: [{ rating: 5, comment: 'Cero dolor y resultados estéticos maravillosos en mi limpieza y curaciones.' }],
    },
    {
      fullName: 'Dr. Jorge Tello',
      email: 'dr.tello@clinica.com',
      phone: '+51 922 223 344',
      specialtyName: 'Odontología Integral',
      licenseNumber: 'ODON-19840-ESP',
      bio: 'Cirujano dentista especialista en endodoncia mecanizada y rehabilitación oral con prótesis fijas.',
      consultationFee: 70.0,
      group: 'C',
    },
    {
      fullName: 'Dra. Diana Córdova',
      email: 'dra.cordova@clinica.com',
      phone: '+51 923 334 455',
      specialtyName: 'Odontología Integral',
      licenseNumber: 'ODON-25410-ESP',
      bio: 'Ortodoncia invisible, brackets de autoligado y prevención de caries para niños y adultos.',
      consultationFee: 65.0,
      group: 'E',
      reviews: [{ rating: 5, comment: 'Excelente atención odontológica un sábado por la mañana.' }],
    },

    // --- 10. GASTROENTEROLOGÍA (3) ---
    {
      fullName: 'Dr. César Montalvo',
      email: 'dr.montalvo@clinica.com',
      phone: '+51 924 445 566',
      specialtyName: 'Gastroenterología',
      licenseNumber: 'GAST-17380-ESP',
      bio: 'Gastroenterólogo clínico y endoscopista, especialista en gastritis crónica, reflujo gastroesofágico y Helicobacter pylori.',
      consultationFee: 95.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'Excelente médico, me explicó detalladamente la dieta y medicación para mi gastritis.' }],
    },
    {
      fullName: 'Dra. Raquel Vega',
      email: 'dra.vega@clinica.com',
      phone: '+51 925 556 677',
      specialtyName: 'Gastroenterología',
      licenseNumber: 'GAST-23190-ESP',
      bio: 'Experta en colonoscopía diagnóstica, síndrome de intestino irritable, hígado graso y enfermedades biliares.',
      consultationFee: 100.0,
      group: 'B',
    },
    {
      fullName: 'Dr. Emilio Prado',
      email: 'dr.prado@clinica.com',
      phone: '+51 926 667 788',
      specialtyName: 'Gastroenterología',
      licenseNumber: 'GAST-28940-ESP',
      bio: 'Más de 14 años en prevención y tratamiento de pólipos de colon, dispepsia funcional y celiaquía.',
      consultationFee: 110.0,
      group: 'D',
      reviews: [{ rating: 5, comment: 'Muy profesional y acertado, cien por ciento recomendado.' }],
    },

    // --- 11. ENDOCRINOLOGÍA (3) ---
    {
      fullName: 'Dra. Lorena Bustamante',
      email: 'dra.bustamante@clinica.com',
      phone: '+51 927 778 899',
      specialtyName: 'Endocrinología',
      licenseNumber: 'ENDOC-16290-ESP',
      bio: 'Especialista en diabetes mellitus tipo 1 y 2, hipotiroidismo, nódulos tiroideos y control metabólico integral.',
      consultationFee: 95.0,
      group: 'A',
      reviews: [{ rating: 5, comment: 'La Dra. Bustamante me ayudó a regular mi tiroides después de meses sin control.' }],
    },
    {
      fullName: 'Dr. Felipe Paredes',
      email: 'dr.paredes@clinica.com',
      phone: '+51 928 889 900',
      specialtyName: 'Endocrinología',
      licenseNumber: 'ENDOC-21840-ESP',
      bio: 'Experto en obesidad mórbida, resistencia a la insulina, síndrome metabólico y trastornos de las glándulas suprarrenales.',
      consultationFee: 105.0,
      group: 'C',
    },
    {
      fullName: 'Dra. Yolanda Sotomayor',
      email: 'dra.sotomayor@clinica.com',
      phone: '+51 929 990 011',
      specialtyName: 'Endocrinología',
      licenseNumber: 'ENDOC-27410-ESP',
      bio: 'Manejo de osteoporosis, déficit de vitamina D, metabolismo mineral óseo y menopausia.',
      consultationFee: 90.0,
      group: 'E',
      reviews: [{ rating: 5, comment: 'Excelente especialista, muy dedicada en cada consulta.' }],
    },

    // --- 12. OTORRINOLARINGOLOGÍA (3) ---
    {
      fullName: 'Dr. Mauricio Guimet',
      email: 'dr.guimet@clinica.com',
      phone: '+51 930 001 122',
      specialtyName: 'Otorrinolaringología',
      licenseNumber: 'ORL-15280-ESP',
      bio: 'Especialista en rinitis alérgica, sinusitis crónica, desviación del tabique nasal y cirugía endoscópica nasosinusal.',
      consultationFee: 90.0,
      group: 'B',
      reviews: [{ rating: 5, comment: 'Me curó de una sinusitis crónica que llevaba meses afectándome. Un gran profesional.' }],
    },
    {
      fullName: 'Dra. Rosa Agüero',
      email: 'dra.aguero@clinica.com',
      phone: '+51 931 112 233',
      specialtyName: 'Otorrinolaringología',
      licenseNumber: 'ORL-20840-ESP',
      bio: 'Diagnóstico y tratamiento de hipoacusia (pérdida auditiva), acúfenos/tinnitus, vértigo postural y otitis media.',
      consultationFee: 85.0,
      group: 'D',
    },
    {
      fullName: 'Dr. Álvaro Ballesteros',
      email: 'dr.ballesteros@clinica.com',
      phone: '+51 932 223 344',
      specialtyName: 'Otorrinolaringología',
      licenseNumber: 'ORL-26410-ESP',
      bio: 'Patología de la voz, cuerdas vocales, ronquido y apnea obstructiva del sueño en niños y adultos.',
      consultationFee: 100.0,
      group: 'E',
      reviews: [{ rating: 5, comment: 'Excelente atención para mi problema de ronquido y respiración.' }],
    },
  ];

  console.log(`[Seed] Procesando catálogo de ${doctorsCatalog.length} médicos...`);

  let countCreated = 0;
  for (const docData of doctorsCatalog) {
    const specialtyId = specialtyMap.get(docData.specialtyName);
    if (!specialtyId) {
      console.error(`Especialidad no encontrada: ${docData.specialtyName}`);
      continue;
    }

    // 1. Upsert Usuario Médico
    const user = await prisma.user.upsert({
      where: { email: docData.email.toLowerCase() },
      update: {
        fullName: docData.fullName,
        phone: docData.phone,
        isActive: true,
      },
      create: {
        email: docData.email.toLowerCase(),
        fullName: docData.fullName,
        phone: docData.phone,
        passwordHash: doctorPassword,
        role: Role.DOCTOR,
        isActive: true,
      },
    });

    // 2. Upsert Perfil Médico
    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {
        specialtyId,
        licenseNumber: docData.licenseNumber,
        bio: docData.bio,
        consultationFee: docData.consultationFee,
      },
      create: {
        userId: user.id,
        specialtyId,
        licenseNumber: docData.licenseNumber,
        bio: docData.bio,
        consultationFee: docData.consultationFee,
      },
    });

    // 3. Sincronizar Horarios según el Grupo Asignado
    const scheduleItems = getSchedulesForGroup(docData.group);
    await prisma.doctorSchedule.deleteMany({
      where: { doctorId: profile.id },
    });
    await prisma.doctorSchedule.createMany({
      data: scheduleItems.map((s) => ({
        doctorId: profile.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMinutes: s.slotDurationMinutes,
      })),
    });

    // 4. Agregar Reseñas Iniciales (si se definieron y no existen)
    if (docData.reviews && docData.reviews.length > 0) {
      for (let rIdx = 0; rIdx < docData.reviews.length; rIdx++) {
        const rev = docData.reviews[rIdx];
        const appointmentMockId = `seed-rev-app-${profile.id.substring(0, 8)}-${rIdx}`;

        // Crear o verificar la cita asociada
        const app = await prisma.appointment.upsert({
          where: { id: appointmentMockId },
          update: {},
          create: {
            id: appointmentMockId,
            patientId: paciente.id,
            doctorId: profile.id,
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (rIdx + 2)), // fecha pasada
            reason: 'Consulta médica preventiva y revisión clínica',
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paymentMethod: 'CARD',
          },
        });

        // Crear o verificar la reseña
        await prisma.doctorReview.upsert({
          where: { appointmentId: app.id },
          update: {
            rating: rev.rating,
            comment: rev.comment,
          },
          create: {
            appointmentId: app.id,
            patientId: paciente.id,
            doctorId: profile.id,
            rating: rev.rating,
            comment: rev.comment,
          },
        });
      }
    }

    countCreated++;
  }

  console.log(`[Seed] ¡Éxito! ${countCreated} médicos creados/sincronizados con sus horarios y reseñas.`);
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
