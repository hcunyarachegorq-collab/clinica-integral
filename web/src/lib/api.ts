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

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  prescription: string;
  notes?: string | null;
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
    pendingRevenue: number;
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
}

export const api = new ApiService();
