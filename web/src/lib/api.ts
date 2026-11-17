export type Role = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'INSURANCE';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  isActive?: boolean;
  doctorProfileId?: string | null;
  specialty?: string | null;
  doctorProfile?: {
    id: string;
    specialtyId: string;
    licenseNumber: string;
    bio?: string | null;
    consultationFee: number;
    specialty?: {
      name: string;
    };
    schedules?: DoctorSchedule[];
  } | null;
}

export interface Specialty {
  id: string;
  name: string;
  description?: string | null;
  iconName?: string | null;
  doctorsCount?: number;
}

export interface DoctorSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface DoctorRecentReview {
  id: string;
  patientName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  specialty: Specialty;
  licenseNumber: string;
  bio?: string | null;
  consultationFee: number;
  averageRating?: number;
  reviewCount?: number;
  recentReviews?: DoctorRecentReview[];
  schedules: DoctorSchedule[];
  scheduleLabel?: string;
}

export interface Triage {
  id: string;
  appointmentId: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  weightKg: number;
  heightCm: number;
  oxygenSaturation: number;
  allergies?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface DoctorBlockedDate {
  id: string;
  doctorId: string;
  date: string;
  reason?: string | null;
  createdAt: string;
}

export interface MedicalAttachment {
  id: string;
  medicalRecordId: string;
  fileName: string;
  fileType: string;
  fileDataUrl: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reason: string;
  notes?: string | null;
  queueCode?: string | null;
  consultingRoom?: string | null;
  calledAt?: string | null;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  amountPaid?: number | null;
  paidAt?: string | null;
  consultationFee?: number;
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  doctor: {
    id: string;
    fullName: string;
    specialty: string;
    licenseNumber?: string;
    consultationFee?: number;
  };
  triage?: Triage | null;
  hasMedicalRecord?: boolean;
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  count: number;
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface Medication {
  id: string;
  code: string;
  name: string;
  presentation: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrescriptionItem {
  id: string;
  medicalRecordId: string;
  medicationId: string;
  quantity: number;
  dosage: string;
  unitPrice: number;
  subtotal: number;
  medication?: Medication;
}

export type LabOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING';

export interface LabCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
  createdAt?: string;
}

export interface LabOrder {
  id: string;
  medicalRecordId?: string | null;
  patientId: string;
  doctorId: string;
  catalogItemId: string;
  notes?: string | null;
  status: LabOrderStatus;
  resultSummary?: string | null;
  resultFileBase64?: string | null;
  resultFileName?: string | null;
  price: number;
  paid: boolean;
  createdAt: string;
  completedAt?: string | null;
  catalogItem: LabCatalogItem;
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  doctor: {
    id: string;
    user: { fullName: string };
    specialty: { name: string };
  };
  medicalRecord?: {
    id: string;
    diagnosis: string;
    createdAt: string;
  } | null;
}

export interface ObservationBed {
  id: string;
  code: string;
  name: string;
  status: BedStatus;
  currentPatientId?: string | null;
  currentPatientName?: string | null;
  reason?: string | null;
  procedure?: string | null;
  fee: number;
  paid: boolean;
  admittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  prescription: string;
  notes?: string | null;
  pharmacyTotal?: number;
  pharmacyPaid?: boolean;
  restDays?: number;
  restStartDate?: string | null;
  restEndDate?: string | null;
  cie10Code?: string | null;
  createdAt: string;
  doctor: {
    id: string;
    fullName: string;
    specialty: string;
    licenseNumber?: string;
  };
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  appointment?: {
    scheduledAt: string;
    reason: string;
    status?: string;
  };
  attachments?: MedicalAttachment[];
  prescriptionItems?: PrescriptionItem[];
  labOrders?: LabOrder[];
}

export interface AvailableSlotsResponse {
  date: string;
  dayOfWeek: number;
  available: boolean;
  blocked?: boolean;
  nonWorkingDay?: boolean;
  reason?: string;
  message?: string;
  scheduleLabel?: string;
  schedule?: {
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
  };
  workingDays?: number[];
  slots: string[];
  allSlots?: string[];
  bookedSlots?: string[];
}

export interface PatientHistoryResponse {
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    createdAt: string;
  };
  allergies: string[];
  triagesCount: number;
  triages: (Triage & { date: string })[];
  medicalRecordsCount: number;
  medicalRecords: {
    id: string;
    date: string;
    diagnosis: string;
    prescription: string;
    notes?: string | null;
    doctorName: string;
    specialty: string;
    licenseNumber?: string;
    appointmentReason: string;
    attachments?: MedicalAttachment[];
  }[];
  appointmentsSummary: {
    total: number;
    completed: number;
    cancelled: number;
    pendingOrConfirmed: number;
  };
}

export interface PatientSearchResult {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  totalAppointments: number;
  totalRecords: number;
  lastAppointment?: {
    id: string;
    date: string;
    status: string;
    doctorName: string;
    specialty: string;
  } | null;
}

export interface AnalyticsSummaryResponse {
  financial: {
    totalRevenue: number;
    consultationRevenue?: number;
    pharmacyRevenue?: number;
    pendingRevenue: number;
    pendingConsultationRevenue?: number;
    pendingPharmacyRevenue?: number;
    currency: string;
  };
  appointments: {
    total: number;
    completed: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    attendanceRate: number;
  };
  patients: {
    totalUniqueAttended: number;
  };
  bySpecialty: {
    name: string;
    count: number;
    percentage: number;
  }[];
  topDoctors: {
    name: string;
    specialty: string;
    completedCount: number;
    totalCount: number;
    revenue: number;
  }[];
  pharmacy?: {
    totalMedications: number;
    lowStockCount: number;
    lowStockMedications: {
      id: string;
      code: string;
      name: string;
      presentation: string;
      category: string;
      stock: number;
      minStock: number;
      price: number;
    }[];
    totalRevenue: number;
    pendingRevenue: number;
  };
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: User;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('clinica_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Error ${response.status}: ${response.statusText}`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  // Autenticación
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: { fullName: string; email: string; password: string; phone?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
  }

  // Especialidades
  async getSpecialties(): Promise<{ specialties: Specialty[] }> {
    return this.request<{ specialties: Specialty[] }>('/api/specialties', {
      method: 'GET',
    });
  }

  async createSpecialty(data: {
    name: string;
    description?: string;
    iconName?: string;
  }): Promise<{ message: string; specialty: Specialty }> {
    return this.request<{ message: string; specialty: Specialty }>('/api/specialties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Médicos
  async getDoctors(specialtyId?: string): Promise<{ count: number; doctors: Doctor[] }> {
    const query = specialtyId ? `?specialtyId=${encodeURIComponent(specialtyId)}` : '';
    return this.request<{ count: number; doctors: Doctor[] }>(`/api/doctors${query}`, {
      method: 'GET',
    });
  }

  async createDoctor(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    specialtyId: string;
    licenseNumber: string;
    bio?: string;
    consultationFee: number;
    schedules: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes?: number;
    }[];
  }): Promise<{ message: string; doctor: Doctor }> {
    return this.request<{ message: string; doctor: Doctor }>('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDoctorAvailableSlots(doctorId: string, date: string): Promise<AvailableSlotsResponse> {
    return this.request<AvailableSlotsResponse>(`/api/doctors/${doctorId}/available-slots?date=${encodeURIComponent(date)}`, {
      method: 'GET',
    });
  }

  // Citas médicas
  async getAppointments(filters?: { status?: string; doctorId?: string; patientId?: string }): Promise<{ count: number; appointments: Appointment[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.doctorId) params.append('doctorId', filters.doctorId);
    if (filters?.patientId) params.append('patientId', filters.patientId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request<{ count: number; appointments: Appointment[] }>(`/api/appointments${queryString}`, {
      method: 'GET',
    });
  }

  async createAppointment(data: {
    doctorId: string;
    scheduledAt: string;
    reason: string;
    notes?: string;
    patientId?: string;
  }): Promise<{ message: string; appointment: Appointment }> {
    return this.request<{ message: string; appointment: Appointment }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus
  ): Promise<{ message: string; appointment: any }> {
    return this.request<{ message: string; appointment: any }>(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Triaje de Signos Vitales
  async saveTriage(
    appointmentId: string,
    data: {
      bloodPressure: string;
      heartRate: number;
      temperature: number;
      weightKg: number;
      heightCm: number;
      oxygenSaturation: number;
      allergies?: string;
      notes?: string;
    }
  ): Promise<{ message: string; triage: Triage }> {
    return this.request<{ message: string; triage: Triage }>(`/api/appointments/${appointmentId}/triage`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Pagos
  async registerPayment(
    appointmentId: string,
    data: {
      paymentMethod: PaymentMethod;
      amountPaid?: number;
    }
  ): Promise<{ message: string; payment: any }> {
    return this.request<{ message: string; payment: any }>(`/api/appointments/${appointmentId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Registros e Historial Clínico
  async createMedicalRecord(data: {
    appointmentId: string;
    diagnosis: string;
    prescription: string;
    notes?: string;
    items?: {
      medicationId: string;
      quantity: number;
      dosage: string;
    }[];
    labItemIds?: string[];
    restDays?: number;
    restStartDate?: string;
    restEndDate?: string;
    cie10Code?: string;
  }): Promise<{ message: string; medicalRecord: MedicalRecord }> {
    return this.request<{ message: string; medicalRecord: MedicalRecord }>('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMedicalRecords(): Promise<{ count: number; medicalRecords: MedicalRecord[] }> {
    return this.request<{ count: number; medicalRecords: MedicalRecord[] }>('/api/medical-records', {
      method: 'GET',
    });
  }

  async getPatientHistory(patientId: string): Promise<PatientHistoryResponse> {
    return this.request<PatientHistoryResponse>(`/api/patients/${patientId}/history`, {
      method: 'GET',
    });
  }

  // Analítica
  async getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
    return this.request<AnalyticsSummaryResponse>('/api/analytics/summary', {
      method: 'GET',
    });
  }

  // Perfil y Seguridad
  async updateProfile(data: {
    fullName?: string;
    phone?: string | null;
  }): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updatePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Bloqueo de Fechas del Médico
  async getBlockedDates(doctorId: string): Promise<{ count: number; blockedDates: DoctorBlockedDate[] }> {
    return this.request<{ count: number; blockedDates: DoctorBlockedDate[] }>(`/api/doctors/${doctorId}/blocked-dates`, {
      method: 'GET',
    });
  }

  async blockDoctorDate(
    doctorId: string,
    data: { date: string; reason?: string }
  ): Promise<{ message: string; blockedDate: DoctorBlockedDate }> {
    return this.request<{ message: string; blockedDate: DoctorBlockedDate }>(`/api/doctors/${doctorId}/blocked-dates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBlockedDate(doctorId: string, blockId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/doctors/${doctorId}/blocked-dates/${blockId}`, {
      method: 'DELETE',
    });
  }

  // Directorio y Buscador de Pacientes
  async searchPatients(query: string = ''): Promise<{ count: number; patients: PatientSearchResult[] }> {
    const endpoint = query ? `/api/patients?search=${encodeURIComponent(query)}` : '/api/patients';
    return this.request<{ count: number; patients: PatientSearchResult[] }>(endpoint, {
      method: 'GET',
    });
  }

  // Adjuntos Médicos / Resultados de Laboratorio
  async addMedicalAttachment(
    recordId: string,
    data: { fileName: string; fileType: string; fileDataUrl: string }
  ): Promise<{ message: string; attachment: MedicalAttachment }> {
    return this.request<{ message: string; attachment: MedicalAttachment }>(`/api/medical-records/${recordId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Notificaciones
  async getNotifications(): Promise<NotificationsResponse> {
    return this.request<NotificationsResponse>('/api/notifications', {
      method: 'GET',
    });
  }

  async markNotificationAsRead(id: string): Promise<{ message: string; notification: NotificationItem }> {
    return this.request<{ message: string; notification: NotificationItem }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  }

  // Calificación / Reseña Médica
  async createDoctorReview(
    appointmentId: string,
    data: { rating: number; comment?: string }
  ): Promise<{ message: string; review: any }> {
    return this.request<{ message: string; review: any }>(`/api/appointments/${appointmentId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Botica y Medicamentos
  async getMedications(params?: {
    search?: string;
    category?: string;
    lowStock?: boolean;
  }): Promise<{ count: number; medications: Medication[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.lowStock) query.append('lowStock', 'true');
    const qs = query.toString();
    return this.request<{ count: number; medications: Medication[] }>(`/api/medications${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  }

  async createMedication(data: {
    code: string;
    name: string;
    presentation: string;
    category: string;
    price: number;
    stock: number;
    minStock?: number;
  }): Promise<{ message: string; medication: Medication }> {
    return this.request<{ message: string; medication: Medication }>('/api/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMedication(
    id: string,
    data: {
      code?: string;
      name?: string;
      presentation?: string;
      category?: string;
      price?: number;
      stock?: number;
      replenishQuantity?: number;
      minStock?: number;
      isActive?: boolean;
    }
  ): Promise<{ message: string; medication: Medication }> {
    return this.request<{ message: string; medication: Medication }>(`/api/medications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async dispensePrescription(recordId: string): Promise<{
    message: string;
    medicalRecord: MedicalRecord;
    dispensedItemsCount: number;
    totalCharged: number;
  }> {
    return this.request<{
      message: string;
      medicalRecord: MedicalRecord;
      dispensedItemsCount: number;
      totalCharged: number;
    }>(`/api/medical-records/${recordId}/dispense`, {
      method: 'PATCH',
    });
  }

  // Órdenes de Laboratorio e Imágenes
  async getLabCatalog(): Promise<{ count: number; items: LabCatalogItem[] }> {
    return this.request<{ count: number; items: LabCatalogItem[] }>('/api/lab-orders/catalog', {
      method: 'GET',
    });
  }

  async getLabOrders(params?: { status?: string; search?: string }): Promise<{ count: number; orders: LabOrder[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return this.request<{ count: number; orders: LabOrder[] }>(`/api/lab-orders${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  }

  async payLabOrder(orderId: string): Promise<{ message: string; order: LabOrder }> {
    return this.request<{ message: string; order: LabOrder }>(`/api/lab-orders/${orderId}/pay`, {
      method: 'PATCH',
    });
  }

  async saveLabOrderResult(
    orderId: string,
    data: { resultSummary: string; resultFileBase64?: string; resultFileName?: string }
  ): Promise<{ message: string; order: LabOrder }> {
    return this.request<{ message: string; order: LabOrder }>(`/api/lab-orders/${orderId}/result`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Tópico de Urgencias & Camillas de Observación
  async getBeds(): Promise<{ count: number; beds: ObservationBed[] }> {
    return this.request<{ count: number; beds: ObservationBed[] }>('/api/beds', {
      method: 'GET',
    });
  }

  async admitPatientToBed(
    bedId: string,
    data: {
      currentPatientName: string;
      currentPatientId?: string;
      reason: string;
      procedure?: string;
      fee?: number;
    }
  ): Promise<{ message: string; bed: ObservationBed }> {
    return this.request<{ message: string; bed: ObservationBed }>(`/api/beds/${bedId}/admit`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async dischargeBed(
    bedId: string,
    data?: { paid?: boolean; nextStatus?: 'AVAILABLE' | 'CLEANING' }
  ): Promise<{
    message: string;
    bed: ObservationBed;
    dischargedPatient?: string;
    totalCharged?: number;
    wasPaid?: boolean;
  }> {
    return this.request<{
      message: string;
      bed: ObservationBed;
      dischargedPatient?: string;
      totalCharged?: number;
      wasPaid?: boolean;
    }>(`/api/beds/${bedId}/discharge`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    });
  }

  async updateBedStatus(bedId: string, status: BedStatus): Promise<{ message: string; bed: ObservationBed }> {
    return this.request<{ message: string; bed: ObservationBed }>(`/api/beds/${bedId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==============================================================
  // SALA DE ESPERA Y LLAMADO DE TURNOS (BLOQUE B)
  // ==============================================================
  async getWaitingRoom(): Promise<WaitingRoomData> {
    return this.request<WaitingRoomData>('/api/public/waiting-room', {
      method: 'GET',
    });
  }

  async callAppointment(
    id: string,
    data?: { consultingRoom?: string }
  ): Promise<{ message: string; appointment: any }> {
    return this.request<{ message: string; appointment: any }>(`/api/appointments/${id}/call`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    });
  }

  // ==============================================================
  // CAJA CENTRAL Y LIQUIDACIÓN UNIFICADA (BLOQUE B)
  // ==============================================================
  async getPatientPendingBilling(patientId: string): Promise<PatientPendingBilling> {
    return this.request<PatientPendingBilling>(`/api/billing/patient/${patientId}/pending`, {
      method: 'GET',
    });
  }

  async settlePatientBilling(
    patientId: string,
    data: {
      paymentMethod: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA' | 'TRANSFERENCIA';
      appointmentIds?: string[];
      medicalRecordIds?: string[];
      labOrderIds?: string[];
      bedIds?: string[];
    }
  ): Promise<{ message: string; receipt: UnifiedReceipt }> {
    return this.request<{ message: string; receipt: UnifiedReceipt }>(`/api/billing/patient/${patientId}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDailyCashClose(date?: string): Promise<DailyCashClose> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<DailyCashClose>(`/api/billing/daily-close${query}`, {
      method: 'GET',
    });
  }
}

// Interfaces de Sala de Espera y Caja
export interface WaitingRoomItem {
  id: string;
  queueCode: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  consultingRoom: string;
  status: string;
  calledAt?: string | null;
  scheduledAt?: string | null;
}

export interface WaitingRoomData {
  timestamp: string;
  stats: {
    calledCount: number;
    waitingCount: number;
  };
  called: WaitingRoomItem[];
  waiting: WaitingRoomItem[];
}

export interface BillingPendingItem {
  type: 'CONSULTATION' | 'PHARMACY' | 'LAB_ORDER' | 'TOPIC_BED';
  id: string;
  categoryName: string;
  description: string;
  amount: number;
  detail?: any;
}

export interface PatientPendingBilling {
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  subtotals: {
    consultations: number;
    pharmacy: number;
    lab: number;
    topic: number;
  };
  grandTotal: number;
  itemsCount: number;
  items: BillingPendingItem[];
  counts: {
    appointments: number;
    prescriptions: number;
    labOrders: number;
    beds: number;
  };
}

export interface UnifiedReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  cashier: string;
  paymentMethod: string;
  items: Array<{
    type: string;
    id: string;
    description: string;
    amount: number;
  }>;
  subtotals: {
    consultations: number;
    pharmacy: number;
    lab: number;
    topic: number;
  };
  grandTotal: number;
}

export interface DailyCashClose {
  date: string;
  receiptsCount: number;
  grandTotal: number;
  byArea: {
    consultations: number;
    pharmacy: number;
    lab: number;
    topic: number;
  };
  byPaymentMethod: {
    EFECTIVO: number;
    YAPE_PLIN: number;
    TARJETA: number;
    TRANSFERENCIA: number;
  };
  receipts: Array<{
    id: string;
    receiptNumber: string;
    patientName: string;
    cashierName?: string;
    paymentMethod: string;
    totalAmount: number;
    consultationTotal: number;
    pharmacyTotal: number;
    labTotal: number;
    topicTotal: number;
    createdAt: string;
  }>;
}

export const api = new ApiService();
