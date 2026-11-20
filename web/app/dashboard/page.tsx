'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  HeartPulse,
  LogOut,
  Calendar,
  Clock,
  User,
  Shield,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlusCircle,
  RefreshCw,
  Filter,
  Check,
  Ban,
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  Sparkles,
  DollarSign,
  Briefcase,
  X,
  ClipboardList,
  Activity,
  CreditCard,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Flame,
  Award,
  UserCheck,
  Lock,
  CalendarOff,
  Search,
  Users,
  UploadCloud,
  Download,
  Eye,
  Paperclip,
  Trash2,
  FolderOpen,
  Bell,
  Star,
  ChevronLeft,
  ChevronRight,
  Pill,
  Package,
  FlaskConical,
  BedDouble,
  FileCheck,
  Timer,
  Tv,
} from 'lucide-react';
import {
  api,
  Appointment,
  AppointmentStatus,
  Doctor,
  Specialty,
  MedicalRecord,
  AvailableSlotsResponse,
  Triage,
  PaymentMethod,
  PatientHistoryResponse,
  AnalyticsSummaryResponse,
  DoctorBlockedDate,
  MedicalAttachment,
  PatientSearchResult,
  NotificationItem,
  Medication,
  PrescriptionItem,
  LabCatalogItem,
  LabOrder,
  LabOrderStatus,
  ObservationBed,
  BedStatus,
  DailyCashClose,
  PatientPendingBilling,
  UnifiedReceipt,
} from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { SkeletonCard, AppointmentCardSkeleton } from '../../src/components/SkeletonCard';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, logout, updateUser } = useAuth();
  const toast = useToast();

  // Estados principales
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modo de visualización de citas: 'list' (lista detallada) o 'week' (agenda semanal)
  const [appointmentsViewMode, setAppointmentsViewMode] = useState<'list' | 'week'>('list');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Días de la semana para la Agenda Semanal (Lunes a Domingo)
  const currentWeekDays = React.useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 Dom, 1 Lun, 2 Mar...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  // Pestañas activas: 'appointments', 'records', 'patients', 'lab_orders', 'observation_beds', 'blocked_dates', 'analytics', 'admin_management', 'pharmacy', 'billing', 'profile'
  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'patients' | 'lab_orders' | 'observation_beds' | 'blocked_dates' | 'analytics' | 'admin_management' | 'pharmacy' | 'billing' | 'profile'>('appointments');

  // Estados para Laboratorio e Imágenes Diagnósticas
  const [labCatalog, setLabCatalog] = useState<LabCatalogItem[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loadingLabOrders, setLoadingLabOrders] = useState<boolean>(false);
  const [labStatusFilter, setLabStatusFilter] = useState<string>('TODOS');
  const [labSearchQuery, setLabSearchQuery] = useState<string>('');

  // Modales de Laboratorio
  const [selectedOrderForResult, setSelectedOrderForResult] = useState<LabOrder | null>(null);
  const [resultSummaryText, setResultSummaryText] = useState<string>('');
  const [resultFileBase64, setResultFileBase64] = useState<string>('');
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultSubmitting, setResultSubmitting] = useState<boolean>(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [viewResultModal, setViewResultModal] = useState<LabOrder | null>(null);

  // Estados para Tópico de Urgencias y Camillas de Observación
  const [bedsList, setBedsList] = useState<ObservationBed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState<boolean>(false);

  // Modales de Camillas / Tópico
  const [selectedBedForAdmit, setSelectedBedForAdmit] = useState<ObservationBed | null>(null);
  const [admitPatientName, setAdmitPatientName] = useState<string>('');
  const [admitReason, setAdmitReason] = useState<string>('');
  const [admitProcedure, setAdmitProcedure] = useState<string>('Nebulización continua y monitorización');
  const [admitFee, setAdmitFee] = useState<string>('45.00');
  const [admitSubmitting, setAdmitSubmitting] = useState<boolean>(false);
  const [admitError, setAdmitError] = useState<string | null>(null);

  const [selectedBedForDischarge, setSelectedBedForDischarge] = useState<ObservationBed | null>(null);
  const [dischargePaid, setDischargePaid] = useState<boolean>(true);
  const [dischargeNextStatus, setDischargeNextStatus] = useState<'AVAILABLE' | 'CLEANING'>('AVAILABLE');
  const [dischargeSubmitting, setDischargeSubmitting] = useState<boolean>(false);

  // Estados para Descanso Médico Oficial para Impresión
  const [printRestCertRecord, setPrintRestCertRecord] = useState<MedicalRecord | null>(null);

  // Estados de Laboratorio y Descanso Médico en Atención (Doctor)
  const [doctorLabCatalog, setDoctorLabCatalog] = useState<LabCatalogItem[]>([]);
  const [selectedLabItemIds, setSelectedLabItemIds] = useState<string[]>([]);
  const [recordRestDays, setRecordRestDays] = useState<number>(0);
  const [recordRestStartDate, setRecordRestStartDate] = useState<string>('');
  const [recordCie10Code, setRecordCie10Code] = useState<string>('');

  // Estados para Botica Interna & Stock (Admin)
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loadingMedications, setLoadingMedications] = useState<boolean>(false);
  const [medSearchQuery, setMedSearchQuery] = useState<string>('');
  const [medCategoryFilter, setMedCategoryFilter] = useState<string>('TODAS');
  const [medLowStockOnly, setMedLowStockOnly] = useState<boolean>(false);

  // Modales de Botica (Admin)
  const [showNewMedModal, setShowNewMedModal] = useState<boolean>(false);
  const [newMedCode, setNewMedCode] = useState<string>('');
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedPresentation, setNewMedPresentation] = useState<string>('');
  const [newMedCategory, setNewMedCategory] = useState<string>('Analgésicos');
  const [newMedPrice, setNewMedPrice] = useState<string>('10.00');
  const [newMedStock, setNewMedStock] = useState<string>('50');
  const [newMedMinStock, setNewMedMinStock] = useState<string>('10');
  const [newMedSubmitting, setNewMedSubmitting] = useState<boolean>(false);
  const [newMedError, setNewMedError] = useState<string | null>(null);

  const [selectedMedForReplenish, setSelectedMedForReplenish] = useState<Medication | null>(null);
  const [replenishQty, setReplenishQty] = useState<string>('20');
  const [replenishSubmitting, setReplenishSubmitting] = useState<boolean>(false);
  const [replenishError, setReplenishError] = useState<string | null>(null);

  // Estados de Botica en Atención Médica (Doctor)
  const [doctorMedList, setDoctorMedList] = useState<Medication[]>([]);
  const [selectedMedIdToAdd, setSelectedMedIdToAdd] = useState<string>('');
  const [medAddQuantity, setMedAddQuantity] = useState<number>(1);
  const [medAddDosage, setMedAddDosage] = useState<string>('1 tableta cada 8 horas por 5 días');
  const [prescribedMedItems, setPrescribedMedItems] = useState<{
    medicationId: string;
    code: string;
    name: string;
    presentation: string;
    price: number;
    stock: number;
    quantity: number;
    dosage: string;
    subtotal: number;
  }[]>([]);

  // Estados para Mi Perfil y Seguridad
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileSubmitting, setProfileSubmitting] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currPassword, setCurrPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passSubmitting, setPassSubmitting] = useState<boolean>(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Estados para Bloqueo de Fechas del Médico
  const [selectedDocForBlock, setSelectedDocForBlock] = useState<string>('');
  const [blockedDatesList, setBlockedDatesList] = useState<DoctorBlockedDate[]>([]);
  const [loadingBlockedDates, setLoadingBlockedDates] = useState<boolean>(false);
  const [newBlockDate, setNewBlockDate] = useState<string>('');
  const [newBlockReason, setNewBlockReason] = useState<string>('');
  const [blockSubmitting, setBlockSubmitting] = useState<boolean>(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockSuccess, setBlockSuccess] = useState<string | null>(null);

  // Estados para Directorio y Buscador de Pacientes
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [patientsList, setPatientsList] = useState<PatientSearchResult[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);
  const [selectedPatientHistoryModal, setSelectedPatientHistoryModal] = useState<PatientHistoryResponse | null>(null);
  const [loadingPatientHistoryModal, setLoadingPatientHistoryModal] = useState<boolean>(false);

  // Modal para agendar cita a un paciente específico desde Recepción/Admin
  const [bookForPatientModal, setBookForPatientModal] = useState<PatientSearchResult | null>(null);
  const [adminBookDoctorId, setAdminBookDoctorId] = useState<string>('');
  const [adminBookDate, setAdminBookDate] = useState<string>('');
  const [adminBookSlot, setAdminBookSlot] = useState<string>('');
  const [adminBookReason, setAdminBookReason] = useState<string>('');
  const [adminBookSlotsData, setAdminBookSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [loadingAdminSlots, setLoadingAdminSlots] = useState<boolean>(false);
  const [adminBookSubmitting, setAdminBookSubmitting] = useState<boolean>(false);
  const [adminBookError, setAdminBookError] = useState<string | null>(null);

  // Estados para Adjuntos Médicos / Resultados
  const [uploadingAttachmentRecordId, setUploadingAttachmentRecordId] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const [uploadAttachmentError, setUploadAttachmentError] = useState<string | null>(null);
  const [viewAttachmentModal, setViewAttachmentModal] = useState<MedicalAttachment | null>(null);

  // Estados para Caja Unificada y Arqueo Diario (Bloque B)
  const [dailyClose, setDailyClose] = useState<DailyCashClose | null>(null);
  const [loadingDailyClose, setLoadingDailyClose] = useState<boolean>(false);
  const [selectedPatientForBilling, setSelectedPatientForBilling] = useState<string>('');
  const [patientPendingBilling, setPatientPendingBilling] = useState<PatientPendingBilling | null>(null);
  const [loadingPendingBilling, setLoadingPendingBilling] = useState<boolean>(false);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [settlingBilling, setSettlingBilling] = useState<boolean>(false);
  const [issuedReceipt, setIssuedReceipt] = useState<UnifiedReceipt | null>(null);
  const [callingAppId, setCallingAppId] = useState<string | null>(null);

  // Estados para Notificaciones
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);

  // Estados para Calificación / Reseña Médica (Paciente)
  const [selectedAppForReview, setSelectedAppForReview] = useState<Appointment | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Filtro de estado de citas y buscador
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState<string>('');

  // Reserva de Citas (Paciente)
  const [bookSpecialtyId, setBookSpecialtyId] = useState<string>('');
  const [bookDoctorId, setBookDoctorId] = useState<string>('');
  const [bookDate, setBookDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [bookReason, setBookReason] = useState<string>('');
  const [bookNotes, setBookNotes] = useState<string>('');
  const [bookSubmitting, setBookSubmitting] = useState<boolean>(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);

  // Modal de Triaje / Signos Vitales
  const [selectedAppForTriage, setSelectedAppForTriage] = useState<Appointment | null>(null);
  const [triageBP, setTriageBP] = useState<string>('120/80');
  const [triageHR, setTriageHR] = useState<string>('75');
  const [triageTemp, setTriageTemp] = useState<string>('36.5');
  const [triageWeight, setTriageWeight] = useState<string>('70');
  const [triageHeight, setTriageHeight] = useState<string>('170');
  const [triageO2, setTriageO2] = useState<string>('98');
  const [triageAllergies, setTriageAllergies] = useState<string>('');
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [triageSubmitting, setTriageSubmitting] = useState<boolean>(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Modal de Atención Médica (Doctor) con Historial del Paciente
  const [selectedAppForRecord, setSelectedAppForRecord] = useState<Appointment | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [recordDiagnosis, setRecordDiagnosis] = useState<string>('');
  const [recordPrescription, setRecordPrescription] = useState<string>('');
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [recordSubmitting, setRecordSubmitting] = useState<boolean>(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Modal de Cobro / Pago (Admin)
  const [selectedAppForPayment, setSelectedAppForPayment] = useState<Appointment | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payAmount, setPayAmount] = useState<string>('50');
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Comprobante de Pago para Impresión / Modal
  const [printReceiptApp, setPrintReceiptApp] = useState<Appointment | null>(null);

  // Receta Médica para Impresión
  const [printRecord, setPrintRecord] = useState<MedicalRecord | null>(null);

  // Formularios de Gestión Clínica (Admin)
  const [newSpecName, setNewSpecName] = useState<string>('');
  const [newSpecDesc, setNewSpecDesc] = useState<string>('');
  const [newSpecIcon, setNewSpecIcon] = useState<string>('stethoscope');
  const [specSubmitting, setSpecSubmitting] = useState<boolean>(false);
  const [specSuccess, setSpecSuccess] = useState<string | null>(null);

  const [docFullName, setDocFullName] = useState<string>('');
  const [docEmail, setDocEmail] = useState<string>('');
  const [docPassword, setDocPassword] = useState<string>('Doctor123!');
  const [docPhone, setDocPhone] = useState<string>('');
  const [docSpecialtyId, setDocSpecialtyId] = useState<string>('');
  const [docLicense, setDocLicense] = useState<string>('');
  const [docBio, setDocBio] = useState<string>('');
  const [docFee, setDocFee] = useState<string>('50');
  const [docDays, setDocDays] = useState<number[]>([1, 3, 5]);
  const [docStartTime, setDocStartTime] = useState<string>('08:00');
  const [docEndTime, setDocEndTime] = useState<string>('14:00');
  const [docSubmitting, setDocSubmitting] = useState<boolean>(false);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Cargar datos principales
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [appRes, recRes, specRes, docRes, notifRes] = await Promise.all([
        api.getAppointments(),
        api.getMedicalRecords(),
        api.getSpecialties(),
        api.getDoctors(),
        api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);
      setAppointments(appRes.appointments);
      setMedicalRecords(recRes.medicalRecords);
      setSpecialties(specRes.specialties);
      setDoctors(docRes.doctors);
      setNotifications(notifRes.notifications);
      setUnreadNotifCount(notifRes.unreadCount);

      if (user.role === 'ADMIN') {
        const anaRes = await api.getAnalyticsSummary();
        setAnalytics(anaRes);
      }

      const queryDocId = searchParams.get('doctorId');
      if (queryDocId) {
        const foundDoc = docRes.doctors.find((d) => d.id === queryDocId);
        if (foundDoc) {
          setBookSpecialtyId(foundDoc.specialty.id);
          setBookDoctorId(foundDoc.id);
        }
      }
    } catch (err: any) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      setProfileName(user.fullName || '');
      setProfilePhone(user.phone || '');
      if (user.role === 'DOCTOR' && user.doctorProfile?.id) {
        setSelectedDocForBlock(user.doctorProfile.id);
      } else if (doctors.length > 0 && !selectedDocForBlock) {
        setSelectedDocForBlock(doctors[0].id);
      }
    }
  }, [user, loadDashboardData, doctors]);

  // Sincronización automática silenciosa cada 15 segundos (sin flicker ni resetear modales abiertos)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const [appRes, notifRes] = await Promise.all([
            api.getAppointments().catch(() => null),
            api.getNotifications().catch(() => null),
          ]);
          if (appRes && appRes.appointments) {
            setAppointments(appRes.appointments);
          }
          if (notifRes) {
            setNotifications(notifRes.notifications || []);
            setUnreadNotifCount(notifRes.unreadCount || 0);
          }
        } catch {
          // Ignorar silenciosamente fallos puntuales de red
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

  // Cargar fechas bloqueadas del médico seleccionado
  const loadBlockedDates = useCallback(async (docId: string) => {
    if (!docId) return;
    setLoadingBlockedDates(true);
    try {
      const res = await api.getBlockedDates(docId);
      setBlockedDatesList(res.blockedDates);
    } catch (err: any) {
      console.error('Error al cargar fechas bloqueadas:', err);
    } finally {
      setLoadingBlockedDates(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDocForBlock) {
      loadBlockedDates(selectedDocForBlock);
    }
  }, [selectedDocForBlock, loadBlockedDates]);

  // Cargar pacientes
  const loadPatients = useCallback(async (query: string = '') => {
    setLoadingPatients(true);
    try {
      const res = await api.searchPatients(query);
      setPatientsList(res.patients);
    } catch (err: any) {
      console.error('Error al cargar pacientes:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'patients') {
      loadPatients(patientSearchQuery);
    }
  }, [activeTab, patientSearchQuery, loadPatients]);

  // Botica: Cargar lista de medicamentos
  const loadMedications = useCallback(async () => {
    setLoadingMedications(true);
    try {
      const res = await api.getMedications();
      setMedications(res.medications);
    } catch (err: any) {
      console.error('Error al cargar catálogo de botica:', err);
    } finally {
      setLoadingMedications(false);
    }
  }, []);

  // Laboratorio & Diagnóstico por Imágenes: Cargar órdenes y catálogo
  const loadLabOrders = useCallback(async () => {
    setLoadingLabOrders(true);
    try {
      const res = await api.getLabOrders({
        status: labStatusFilter !== 'TODOS' ? labStatusFilter : undefined,
        search: labSearchQuery.trim() || undefined,
      });
      setLabOrders(res.orders);
    } catch (err: any) {
      console.error('Error al cargar órdenes de laboratorio:', err);
    } finally {
      setLoadingLabOrders(false);
    }
  }, [labStatusFilter, labSearchQuery]);

  const loadLabCatalog = useCallback(async () => {
    try {
      const res = await api.getLabCatalog();
      setLabCatalog(res.items);
    } catch (err: any) {
      console.error('Error al cargar catálogo de laboratorio:', err);
    }
  }, []);

  // Tópico de Urgencias & Camillas de Observación: Cargar camillas
  const loadBeds = useCallback(async () => {
    setLoadingBeds(true);
    try {
      const res = await api.getBeds();
      setBedsList(res.beds);
    } catch (err: any) {
      console.error('Error al cargar camillas de tópico:', err);
    } finally {
      setLoadingBeds(false);
    }
  }, []);

  // Cargar medicamentos de botica al abrir pestaña de botica
  useEffect(() => {
    if (activeTab === 'pharmacy' && user?.role === 'ADMIN') {
      loadMedications();
    }
  }, [activeTab, user, loadMedications]);

  // Cargar órdenes y catálogo de laboratorio al abrir pestaña
  useEffect(() => {
    if (activeTab === 'lab_orders') {
      loadLabOrders();
      loadLabCatalog();
    }
  }, [activeTab, loadLabOrders, loadLabCatalog]);

  // Cargar camillas al abrir pestaña de tópico de urgencias
  useEffect(() => {
    if (activeTab === 'observation_beds') {
      loadBeds();
      const interval = setInterval(() => {
        loadBeds();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadBeds]);

  // Caja Unificada y Arqueo Diario (Bloque B)
  const loadDailyClose = useCallback(async (date?: string) => {
    setLoadingDailyClose(true);
    try {
      const res = await api.getDailyCashClose(date);
      setDailyClose(res);
    } catch (err: any) {
      console.error('Error al cargar arqueo de caja:', err);
    } finally {
      setLoadingDailyClose(false);
    }
  }, []);

  const loadPatientPendingBilling = useCallback(async (patientId: string) => {
    if (!patientId) {
      setPatientPendingBilling(null);
      return;
    }
    setLoadingPendingBilling(true);
    try {
      const res = await api.getPatientPendingBilling(patientId);
      setPatientPendingBilling(res);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar estado de cuenta del paciente');
      setPatientPendingBilling(null);
    } finally {
      setLoadingPendingBilling(false);
    }
  }, [toast]);

  const handleSettleBilling = async () => {
    if (!selectedPatientForBilling || !patientPendingBilling) return;
    if (patientPendingBilling.grandTotal <= 0) {
      toast.error('El paciente no tiene cargos pendientes por liquidar.');
      return;
    }
    setSettlingBilling(true);
    try {
      const res = await api.settlePatientBilling(selectedPatientForBilling, {
        paymentMethod: settlePaymentMethod,
      });
      toast.success(res.message);
      setIssuedReceipt(res.receipt);
      await loadPatientPendingBilling(selectedPatientForBilling);
      await loadDailyClose();
      loadDashboardData();
    } catch (err: any) {
      toast.error(err?.message || 'Error al liquidar cargos de caja');
    } finally {
      setSettlingBilling(false);
    }
  };

  const handleCallAppointment = async (app: Appointment) => {
    setCallingAppId(app.id);
    try {
      const res = await api.callAppointment(app.id, { consultingRoom: app.consultingRoom || undefined });
      toast.success(`Llamando a ${app.patient.fullName} a ${res.appointment.consultingRoom}. Turno: ${res.appointment.queueCode}. Proyectado en Sala de Espera TV.`);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? { ...a, calledAt: res.appointment.calledAt, queueCode: res.appointment.queueCode, consultingRoom: res.appointment.consultingRoom }
            : a
        )
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error al llamar al paciente a consultorio');
    } finally {
      setCallingAppId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') {
      loadDailyClose();
      loadPatients('');
    }
  }, [activeTab, loadDailyClose, loadPatients]);

  // Slots para agendamiento desde Directorio de Pacientes (Admin/Recepción)
  useEffect(() => {
    async function fetchAdminSlots() {
      if (!adminBookDoctorId || !adminBookDate) {
        setAdminBookSlotsData(null);
        setAdminBookSlot('');
        return;
      }
      setLoadingAdminSlots(true);
      setAdminBookSlot('');
      try {
        const res = await api.getDoctorAvailableSlots(adminBookDoctorId, adminBookDate);
        setAdminBookSlotsData(res);
      } catch (err: any) {
        console.error('Error al obtener slots para admin:', err);
      } finally {
        setLoadingAdminSlots(false);
      }
    }
    fetchAdminSlots();
  }, [adminBookDoctorId, adminBookDate]);

  // Consultar slots disponibles
  useEffect(() => {
    async function fetchSlots() {
      if (!bookDoctorId || !bookDate) {
        setSlotsData(null);
        setSelectedSlot('');
        return;
      }
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const res = await api.getDoctorAvailableSlots(bookDoctorId, bookDate);
        setSlotsData(res);
      } catch (err: any) {
        console.error('Error al obtener slots:', err);
        setSlotsData(null);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [bookDoctorId, bookDate]);

  // Cargar historial del paciente y lista de medicamentos al abrir modal de consulta
  useEffect(() => {
    async function fetchPatientHistoryAndMeds() {
      if (!selectedAppForRecord) {
        setPatientHistory(null);
        return;
      }
      setLoadingHistory(true);
      try {
        const historyRes = await api.getPatientHistory(selectedAppForRecord.patient.id);
        setPatientHistory(historyRes);
      } catch (err) {
        console.error('Error al cargar expediente del paciente:', err);
        setPatientHistory(null);
      } finally {
        setLoadingHistory(false);
      }

      // Cargar medicamentos activos de botica
      try {
        const medRes = await api.getMedications();
        const activeMeds = medRes.medications.filter((m) => m.isActive);
        setDoctorMedList(activeMeds);
        if (activeMeds.length > 0) {
          setSelectedMedIdToAdd(activeMeds[0].id);
        }
      } catch (err) {
        console.error('Error al cargar catálogo de medicamentos para consulta:', err);
      }

      // Cargar catálogo de laboratorio e imágenes diagnósticas
      try {
        const labRes = await api.getLabCatalog();
        const activeLab = labRes.items.filter((item) => item.isActive);
        setDoctorLabCatalog(activeLab);
      } catch (err) {
        console.error('Error al cargar catálogo de laboratorio:', err);
      }

      // Reiniciar estados de laboratorio y descanso médico para la nueva atención
      setSelectedLabItemIds([]);
      setRecordRestDays(0);
      setRecordRestStartDate(new Date().toISOString().split('T')[0]);
      setRecordCie10Code('');
    }
    fetchPatientHistoryAndMeds();
  }, [selectedAppForRecord]);

  // Cálculo de IMC en tiempo real
  const calculateBMI = (weightStr: string, heightStr: string) => {
    const w = parseFloat(weightStr);
    const h = parseFloat(heightStr);
    if (!w || !h || h <= 0) return null;
    const bmi = w / Math.pow(h / 100, 2);
    let category = 'Normal';
    let color = 'text-emerald-400';
    if (bmi < 18.5) {
      category = 'Bajo peso';
      color = 'text-amber-400';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Sobrepeso';
      color = 'text-amber-400';
    } else if (bmi >= 30) {
      category = 'Obesidad';
      color = 'text-rose-400';
    }
    return { value: bmi.toFixed(1), category, color };
  };

  const currentBMI = calculateBMI(triageWeight, triageHeight);

  // Manejo de Reserva de Cita
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookError(null);
    setBookSuccess(null);

    if (!bookDoctorId) {
      setBookError('Por favor selecciona un médico especialista.');
      return;
    }
    if (!bookDate || !selectedSlot) {
      setBookError('Por favor selecciona la fecha y una hora disponible.');
      return;
    }

    setBookSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${bookDate}T${selectedSlot}:00Z`).toISOString();
      await api.createAppointment({
        doctorId: bookDoctorId,
        scheduledAt: scheduledDateTime,
        reason: bookReason.trim(),
        notes: bookNotes.trim() || undefined,
      });

      setBookSuccess('¡Cita médica agendada exitosamente!');
      toast.success('¡Cita médica agendada exitosamente!');
      setBookReason('');
      setBookNotes('');
      setBookDate('');
      setSelectedSlot('');
      setSlotsData(null);

      const updated = await api.getAppointments();
      setAppointments(updated.appointments);
    } catch (err: any) {
      setBookError(err.message || 'Error al programar la cita médica.');
      toast.error(err.message || 'Error al programar la cita médica.');
    } finally {
      setBookSubmitting(false);
    }
  };

  // Manejo de Guardar Triaje
  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForTriage) return;
    setTriageError(null);
    setTriageSubmitting(true);

    try {
      const res = await api.saveTriage(selectedAppForTriage.id, {
        bloodPressure: triageBP.trim(),
        heartRate: parseInt(triageHR, 10),
        temperature: parseFloat(triageTemp),
        weightKg: parseFloat(triageWeight),
        heightCm: parseFloat(triageHeight),
        oxygenSaturation: parseInt(triageO2, 10),
        allergies: triageAllergies.trim() || undefined,
        notes: triageNotes.trim() || undefined,
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedAppForTriage.id ? { ...a, triage: res.triage } : a))
      );
      setSelectedAppForTriage(null);
      toast.success('¡Signos vitales de triaje registrados con éxito!');
    } catch (err: any) {
      setTriageError(err.message || 'Error al guardar el triaje.');
      toast.error(err.message || 'Error al guardar el triaje.');
    } finally {
      setTriageSubmitting(false);
    }
  };

  // Manejo de Guardar Pago
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForPayment) return;
    setPayError(null);
    setPaySubmitting(true);

    try {
      await api.registerPayment(selectedAppForPayment.id, {
        paymentMethod: payMethod,
        amountPaid: parseFloat(payAmount),
      });

      const updated = await api.getAppointments();
      setAppointments(updated.appointments);
      setSelectedAppForPayment(null);
      toast.success('¡Cobro registrado exitosamente!');
    } catch (err: any) {
      setPayError(err.message || 'Error al procesar el pago.');
      toast.error(err.message || 'Error al procesar el pago.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Manejo de Guardar Registro Médico
  const handleSaveMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForRecord) return;
    setRecordError(null);
    setRecordSubmitting(true);

    try {
      const itemsPayload =
        prescribedMedItems.length > 0
          ? prescribedMedItems.map((item) => ({
              medicationId: item.medicationId,
              quantity: item.quantity,
              dosage: item.dosage,
            }))
          : undefined;

      await api.createMedicalRecord({
        appointmentId: selectedAppForRecord.id,
        diagnosis: recordDiagnosis.trim(),
        prescription: recordPrescription.trim(),
        notes: recordNotes.trim() || undefined,
        items: itemsPayload,
        labItemIds: selectedLabItemIds.length > 0 ? selectedLabItemIds : undefined,
        restDays: recordRestDays > 0 ? recordRestDays : undefined,
        restStartDate: recordRestDays > 0 && recordRestStartDate ? recordRestStartDate : undefined,
        cie10Code: recordRestDays > 0 && recordCie10Code.trim() ? recordCie10Code.trim() : undefined,
      });

      const [appRes, recRes] = await Promise.all([
        api.getAppointments(),
        api.getMedicalRecords(),
      ]);
      setAppointments(appRes.appointments);
      setMedicalRecords(recRes.medicalRecords);

      setSelectedAppForRecord(null);
      setRecordDiagnosis('');
      setRecordPrescription('');
      setRecordNotes('');
      setPrescribedMedItems([]);
      setSelectedLabItemIds([]);
      setRecordRestDays(0);
      setRecordRestStartDate('');
      setRecordCie10Code('');
      toast.success('¡Atención médica registrada y cita completada!');
    } catch (err: any) {
      setRecordError(err.message || 'Error al registrar la consulta.');
      toast.error(err.message || 'Error al registrar la consulta.');
    } finally {
      setRecordSubmitting(false);
    }
  };

  // Botica: Agregar medicamento al listado de receta del médico
  const handleAddMedToPrescription = () => {
    if (!selectedMedIdToAdd) {
      toast.error('Selecciona un medicamento de la lista.');
      return;
    }
    const foundMed = doctorMedList.find((m) => m.id === selectedMedIdToAdd);
    if (!foundMed) return;

    if (medAddQuantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }
    if (medAddQuantity > foundMed.stock) {
      toast.error(`Stock insuficiente. Solo quedan ${foundMed.stock} unidades en botica.`);
      return;
    }

    // Verificar si ya fue agregado para sumar cantidad
    const existingIndex = prescribedMedItems.findIndex((p) => p.medicationId === foundMed.id);
    if (existingIndex >= 0) {
      const existing = prescribedMedItems[existingIndex];
      const newQty = existing.quantity + medAddQuantity;
      if (newQty > foundMed.stock) {
        toast.error(`No puedes agregar más del stock disponible (${foundMed.stock} unidades).`);
        return;
      }
      const updated = [...prescribedMedItems];
      updated[existingIndex] = {
        ...existing,
        quantity: newQty,
        dosage: medAddDosage.trim() || existing.dosage,
        subtotal: newQty * foundMed.price,
      };
      setPrescribedMedItems(updated);
    } else {
      const newItem = {
        medicationId: foundMed.id,
        code: foundMed.code,
        name: foundMed.name,
        presentation: foundMed.presentation,
        price: foundMed.price,
        stock: foundMed.stock,
        quantity: medAddQuantity,
        dosage: medAddDosage.trim() || 'Según indicación médica',
        subtotal: medAddQuantity * foundMed.price,
      };
      setPrescribedMedItems((prev) => [...prev, newItem]);
    }

    // Opcionalmente agregar texto sugerido a la receta si el campo está vacío
    const autoLine = `• ${foundMed.name} (${foundMed.presentation}) - Cant: ${medAddQuantity} - ${medAddDosage.trim()}`;
    if (!recordPrescription.trim()) {
      setRecordPrescription(autoLine);
    } else if (!recordPrescription.includes(foundMed.name)) {
      setRecordPrescription((prev) => `${prev}\n${autoLine}`);
    }

    toast.success(`Medicamento ${foundMed.name} añadido a la receta.`);
  };

  // Botica: Quitar medicamento de la receta
  const handleRemoveMedFromPrescription = (medId: string) => {
    setPrescribedMedItems((prev) => prev.filter((p) => p.medicationId !== medId));
  };

  // Botica: Crear nuevo medicamento (Admin)
  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewMedError(null);
    setNewMedSubmitting(true);
    try {
      await api.createMedication({
        code: newMedCode.trim().toUpperCase(),
        name: newMedName.trim(),
        presentation: newMedPresentation.trim(),
        category: newMedCategory.trim(),
        price: parseFloat(newMedPrice),
        stock: parseInt(newMedStock, 10),
        minStock: parseInt(newMedMinStock, 10),
      });
      toast.success('¡Medicamento agregado al catálogo de botica!');
      setShowNewMedModal(false);
      setNewMedCode('');
      setNewMedName('');
      setNewMedPresentation('');
      setNewMedPrice('10.00');
      setNewMedStock('50');
      setNewMedMinStock('10');
      loadMedications();
      if (user?.role === 'ADMIN') {
        api.getAnalyticsSummary().then(setAnalytics).catch(() => {});
      }
    } catch (err: any) {
      setNewMedError(err.message || 'Error al registrar medicamento');
      toast.error(err.message || 'Error al registrar medicamento');
    } finally {
      setNewMedSubmitting(false);
    }
  };

  // Botica: Reponer stock de medicamento (Admin)
  const handleReplenishStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForReplenish) return;
    setReplenishError(null);
    setReplenishSubmitting(true);
    try {
      const qty = parseInt(replenishQty, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error('La cantidad a reponer debe ser mayor a 0');
      }
      await api.updateMedication(selectedMedForReplenish.id, {
        replenishQuantity: qty,
      });
      toast.success(`¡Stock de ${selectedMedForReplenish.name} repuesto (+${qty} unidades)!`);
      setSelectedMedForReplenish(null);
      setReplenishQty('20');
      loadMedications();
      if (user?.role === 'ADMIN') {
        api.getAnalyticsSummary().then(setAnalytics).catch(() => {});
      }
    } catch (err: any) {
      setReplenishError(err.message || 'Error al reponer stock');
      toast.error(err.message || 'Error al reponer stock');
    } finally {
      setReplenishSubmitting(false);
    }
  };

  // Botica: Cobrar y Despachar Receta (Admin y Recepcionista)
  const handleDispensePrescription = async (recordId: string) => {
    setActionLoading(recordId);
    try {
      const res = await api.dispensePrescription(recordId);
      toast.success(
        `¡Receta despachada y cobrada con éxito! Total: S/ ${res.totalCharged.toFixed(2)}`
      );
      setMedicalRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, pharmacyPaid: true } : r))
      );
      if (user?.role === 'ADMIN') {
        loadMedications();
        api.getAnalyticsSummary().then(setAnalytics).catch(() => {});
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al despachar receta');
    } finally {
      setActionLoading(null);
    }
  };

  // Laboratorio: Cobrar examen en caja
  const handlePayLabOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await api.payLabOrder(orderId);
      toast.success(res.message || 'Examen cobrado y registrado en caja.');
      setLabOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paid: true, status: o.status === 'PENDING' ? 'IN_PROGRESS' : o.status } : o))
      );
      if (user?.role === 'ADMIN') {
        api.getAnalyticsSummary().then(setAnalytics).catch(() => {});
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar cobro del examen');
    } finally {
      setActionLoading(null);
    }
  };

  // Laboratorio: Guardar resultado y subir informe
  const handleSaveLabResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForResult) return;
    setResultSubmitting(true);
    setResultError(null);
    try {
      const res = await api.saveLabOrderResult(selectedOrderForResult.id, {
        resultSummary: resultSummaryText.trim(),
        resultFileBase64: resultFileBase64 || undefined,
        resultFileName: resultFileName || undefined,
      });
      toast.success(res.message || '¡Resultado de examen registrado con éxito!');
      setLabOrders((prev) =>
        prev.map((o) => (o.id === selectedOrderForResult.id ? res.order : o))
      );
      setSelectedOrderForResult(null);
      setResultSummaryText('');
      setResultFileBase64('');
      setResultFileName('');
    } catch (err: any) {
      setResultError(err.message || 'Error al guardar resultado');
      toast.error(err.message || 'Error al guardar resultado');
    } finally {
      setResultSubmitting(false);
    }
  };

  // Tópico: Ingreso de paciente a camilla
  const handleAdmitBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedForAdmit) return;
    setAdmitSubmitting(true);
    setAdmitError(null);
    try {
      const feeNum = parseFloat(admitFee) || 0;
      const res = await api.admitPatientToBed(selectedBedForAdmit.id, {
        currentPatientName: admitPatientName.trim(),
        reason: admitReason.trim(),
        procedure: admitProcedure.trim() || undefined,
        fee: feeNum,
      });
      toast.success(res.message || 'Paciente ingresado a camilla de tópico.');
      setBedsList((prev) =>
        prev.map((b) => (b.id === selectedBedForAdmit.id ? res.bed : b))
      );
      setSelectedBedForAdmit(null);
      setAdmitPatientName('');
      setAdmitReason('');
    } catch (err: any) {
      setAdmitError(err.message || 'Error al ingresar paciente a camilla');
      toast.error(err.message || 'Error al ingresar paciente a camilla');
    } finally {
      setAdmitSubmitting(false);
    }
  };

  // Tópico: Alta y liquidación de camilla
  const handleDischargeBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedForDischarge) return;
    setDischargeSubmitting(true);
    try {
      const res = await api.dischargeBed(selectedBedForDischarge.id, {
        paid: dischargePaid,
        nextStatus: dischargeNextStatus,
      });
      toast.success(res.message || 'Paciente dado de alta de camilla.');
      setBedsList((prev) =>
        prev.map((b) => (b.id === selectedBedForDischarge.id ? res.bed : b))
      );
      setSelectedBedForDischarge(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al dar de alta la camilla');
    } finally {
      setDischargeSubmitting(false);
    }
  };

  // Tópico: Actualizar estado de camilla (ej. marcar como AVAILABLE tras limpieza)
  const handleUpdateBedStatus = async (bedId: string, status: BedStatus) => {
    setActionLoading(bedId);
    try {
      const res = await api.updateBedStatus(bedId, status);
      toast.success(res.message || `Estado de camilla actualizado a ${status}`);
      setBedsList((prev) =>
        prev.map((b) => (b.id === bedId ? res.bed : b))
      );
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado de camilla');
    } finally {
      setActionLoading(null);
    }
  };

  // Actualizar estado de cita
  const handleUpdateStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setActionLoading(appointmentId);
    try {
      await api.updateAppointmentStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? { ...app, status: newStatus } : app))
      );
      toast.success(`Cita actualizada a ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado.');
    } finally {
      setActionLoading(null);
    }
  };

  // Admin: Crear Especialidad
  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpecSubmitting(true);
    setSpecSuccess(null);
    try {
      await api.createSpecialty({
        name: newSpecName.trim(),
        description: newSpecDesc.trim() || undefined,
        iconName: newSpecIcon,
      });
      setSpecSuccess(`¡Especialidad "${newSpecName}" creada!`);
      toast.success(`¡Especialidad "${newSpecName}" creada con éxito!`);
      setNewSpecName('');
      setNewSpecDesc('');
      const specRes = await api.getSpecialties();
      setSpecialties(specRes.specialties);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear especialidad.');
    } finally {
      setSpecSubmitting(false);
    }
  };

  // Admin: Crear Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocSubmitting(true);
    setDocError(null);
    setDocSuccess(null);

    try {
      await api.createDoctor({
        fullName: docFullName.trim(),
        email: docEmail.trim(),
        password: docPassword,
        phone: docPhone.trim() || undefined,
        specialtyId: docSpecialtyId,
        licenseNumber: docLicense.trim(),
        bio: docBio.trim() || undefined,
        consultationFee: parseFloat(docFee),
        schedules: docDays.map((d) => ({
          dayOfWeek: d,
          startTime: docStartTime,
          endTime: docEndTime,
          slotDurationMinutes: 30,
        })),
      });

      setDocSuccess(`¡Médico ${docFullName} dado de alta!`);
      setDocFullName('');
      setDocEmail('');
      setDocPhone('');
      setDocLicense('');
      setDocBio('');
      const docRes = await api.getDoctors();
      setDoctors(docRes.doctors);
    } catch (err: any) {
      setDocError(err.message || 'Error al dar de alta al médico.');
    } finally {
      setDocSubmitting(false);
    }
  };

  // Manejador: Actualizar Perfil
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await api.updateProfile({
        fullName: profileName.trim(),
        phone: profilePhone.trim() || null,
      });
      updateUser(res.user);
      setProfileSuccess('¡Perfil actualizado con éxito!');
      toast.success('¡Perfil actualizado con éxito!');
    } catch (err: any) {
      setProfileError(err.message || 'Error al actualizar perfil');
      toast.error(err.message || 'Error al actualizar perfil');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Manejador: Cambiar Contraseña
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    if (newPassword.length < 6) {
      setPassError('La nueva contraseña debe tener al menos 6 caracteres.');
      toast.warning('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas no coinciden.');
      toast.warning('Las contraseñas no coinciden.');
      return;
    }
    setPassSubmitting(true);
    try {
      await api.updatePassword({
        currentPassword: currPassword,
        newPassword,
      });
      setPassSuccess('¡Contraseña actualizada exitosamente!');
      toast.success('¡Contraseña actualizada exitosamente!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Error al actualizar contraseña.');
      toast.error(err.message || 'Error al actualizar contraseña.');
    } finally {
      setPassSubmitting(false);
    }
  };

  // Manejador: Bloquear Fecha de Médico
  const handleBlockDoctorDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForBlock || !newBlockDate) {
      setBlockError('Selecciona el médico y la fecha a bloquear.');
      toast.warning('Selecciona el médico y la fecha a bloquear.');
      return;
    }
    setBlockSubmitting(true);
    setBlockError(null);
    setBlockSuccess(null);
    try {
      await api.blockDoctorDate(selectedDocForBlock, {
        date: newBlockDate,
        reason: newBlockReason.trim() || undefined,
      });
      setBlockSuccess(`¡Fecha ${newBlockDate} marcada como no laborable!`);
      toast.success(`¡Fecha ${newBlockDate} marcada como no laborable!`);
      setNewBlockDate('');
      setNewBlockReason('');
      await loadBlockedDates(selectedDocForBlock);
    } catch (err: any) {
      setBlockError(err.message || 'Error al bloquear fecha.');
      toast.error(err.message || 'Error al bloquear fecha.');
    } finally {
      setBlockSubmitting(false);
    }
  };

  // Manejador: Eliminar Bloqueo
  const handleDeleteBlockedDate = async (blockId: string) => {
    if (!selectedDocForBlock) return;
    if (!confirm('¿Estás seguro de eliminar este bloqueo de fecha?')) return;
    try {
      await api.deleteBlockedDate(selectedDocForBlock, blockId);
      toast.success('Bloqueo de fecha eliminado correctamente');
      await loadBlockedDates(selectedDocForBlock);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar bloqueo');
    }
  };

  // Manejador: Agendar Cita para Paciente desde Directorio (Admin/Recepción)
  const handleAdminBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForPatientModal || !adminBookDoctorId || !adminBookDate || !adminBookSlot) {
      setAdminBookError('Completa todos los campos obligatorios.');
      toast.warning('Completa todos los campos obligatorios.');
      return;
    }
    setAdminBookSubmitting(true);
    setAdminBookError(null);
    try {
      const scheduledDateTime = new Date(`${adminBookDate}T${adminBookSlot}:00Z`).toISOString();
      await api.createAppointment({
        doctorId: adminBookDoctorId,
        scheduledAt: scheduledDateTime,
        reason: adminBookReason.trim() || 'Consulta médica programada desde admisión',
        patientId: bookForPatientModal.id,
      });
      toast.success(`¡Cita agendada exitosamente para ${bookForPatientModal.fullName}!`);
      setBookForPatientModal(null);
      setAdminBookDoctorId('');
      setAdminBookDate('');
      setAdminBookSlot('');
      setAdminBookReason('');
      loadDashboardData();
    } catch (err: any) {
      setAdminBookError(err.message || 'Error al agendar cita');
      toast.error(err.message || 'Error al agendar cita');
    } finally {
      setAdminBookSubmitting(false);
    }
  };

  // Manejador: Subir Adjunto / Resultado de Laboratorio
  const handleUploadAttachment = async (recordId: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no puede exceder los 2MB.');
      return;
    }
    setUploadingAttachment(true);
    setUploadAttachmentError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileDataUrl = reader.result as string;
        const res = await api.addMedicalAttachment(recordId, {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileDataUrl,
        });

        // Actualizar lista en estado local
        setMedicalRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, attachments: [...(r.attachments || []), res.attachment] }
              : r
          )
        );

        if (selectedPatientHistoryModal) {
          setSelectedPatientHistoryModal((prev) =>
            prev
              ? {
                  ...prev,
                  medicalRecords: prev.medicalRecords.map((r) =>
                    r.id === recordId
                      ? { ...r, attachments: [...(r.attachments || []), res.attachment] }
                      : r
                  ),
                }
              : null
          );
        }

        setUploadingAttachmentRecordId(null);
        toast.success('¡Archivo adjunto guardado correctamente!');
      } catch (err: any) {
        setUploadAttachmentError(err.message || 'Error al guardar el adjunto.');
        toast.error(err.message || 'Error al guardar el adjunto.');
      } finally {
        setUploadingAttachment(false);
      }
    };
    reader.onerror = () => {
      setUploadAttachmentError('Error al leer el archivo.');
      toast.error('Error al leer el archivo.');
      setUploadingAttachment(false);
    };
    reader.readAsDataURL(file);
  };

  // Descargar Adjunto
  const handleDownloadAttachment = (att: MedicalAttachment) => {
    const link = document.createElement('a');
    link.href = att.fileDataUrl;
    link.download = att.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manejador: Notificaciones
  const handleMarkNotifAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error al marcar notificación:', err);
    }
  };

  const handleMarkAllNotifsAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch (err: any) {
      console.error('Error al marcar todas las notificaciones como leídas:', err);
    }
  };

  // Manejador: Enviar Calificación de Atención Médica
  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForReview) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await api.createDoctorReview(selectedAppForReview.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      toast.success('¡Muchas gracias por calificar la atención médica recibida!');
      setSelectedAppForReview(null);
      setReviewComment('');
      setReviewRating(5);
      loadDashboardData();
    } catch (err: any) {
      setReviewError(err.message || 'Error al enviar calificación');
      toast.error(err.message || 'Error al enviar calificación');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day] || '';
  };

  const getDayShortName = (day: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[day] || '';
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" /> Pendiente
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmada
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Check className="h-3.5 w-3.5" /> Completada
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3.5 w-3.5" /> Cancelada
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string, method?: string | null) => {
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CreditCard className="h-3 w-3" /> PAGADO {method ? `(${method})` : ''}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="h-3 w-3" /> POR COBRAR
      </span>
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const triagePendingCount = appointments.filter((a) => !a.triage && a.status !== 'CANCELLED').length;
  const triageCompletedCount = appointments.filter((a) => !!a.triage).length;

  const filteredAppointments = appointments.filter((a) => {
    // Filtro por estado o condición de triaje
    if (statusFilter === 'NO_TRIAGE') {
      if (a.triage || a.status === 'CANCELLED') return false;
    } else if (statusFilter !== 'TODOS') {
      if (a.status !== statusFilter) return false;
    }

    // Buscador en citas (paciente, email, médico, motivo, turno)
    if (appointmentSearchQuery.trim()) {
      const q = appointmentSearchQuery.toLowerCase();
      const patientName = a.patient?.fullName?.toLowerCase() || '';
      const patientEmail = a.patient?.email?.toLowerCase() || '';
      const doctorName = a.doctor?.fullName?.toLowerCase() || '';
      const reason = a.reason?.toLowerCase() || '';
      const queue = a.queueCode?.toLowerCase() || '';
      return (
        patientName.includes(q) ||
        patientEmail.includes(q) ||
        doctorName.includes(q) ||
        reason.includes(q) ||
        queue.includes(q)
      );
    }

    return true;
  });

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-teal-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm font-medium text-slate-400">Cargando plataforma médica...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* VISTA IMPRIMIBLE: RECETA MÉDICA OFICIAL */}
      {printRecord && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-[9999]">
          <div className="border-b-2 border-teal-700 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-teal-900 tracking-tight">CLÍNICA MÉDICA INTEGRAL</h1>
              <p className="text-xs text-gray-500">Receta Médica y Hoja de Tratamiento Oficial</p>
              <p className="text-xs text-gray-500">Av. Médica Central 1024 • Tel: +1 800-555-CLINICA</p>
            </div>
            <div className="text-right text-xs">
              <p><span className="font-bold">Fecha:</span> {new Date(printRecord.createdAt).toLocaleDateString('es-ES')}</p>
              <p><span className="font-bold">Folio:</span> {printRecord.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm grid grid-cols-2 gap-4 border border-gray-200">
            <div>
              <p><span className="font-semibold text-gray-600">Paciente:</span> {printRecord.patient.fullName}</p>
              <p><span className="font-semibold text-gray-600">Email:</span> {printRecord.patient.email}</p>
              {printRecord.patient.phone && <p><span className="font-semibold text-gray-600">Tel:</span> {printRecord.patient.phone}</p>}
            </div>
            <div>
              <p><span className="font-semibold text-gray-600">Médico:</span> {printRecord.doctor.fullName}</p>
              <p><span className="font-semibold text-gray-600">Especialidad:</span> {printRecord.doctor.specialty}</p>
              <p><span className="font-semibold text-gray-600">Colegiatura:</span> {printRecord.doctor.licenseNumber}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-teal-900 uppercase text-xs tracking-wider border-b pb-1 mb-2">Diagnóstico Clínico</h3>
              <p className="text-sm bg-gray-50 p-3 rounded border border-gray-100">{printRecord.diagnosis}</p>
            </div>

            <div>
              <h3 className="font-bold text-teal-900 uppercase text-xs tracking-wider border-b pb-1 mb-2">Prescripción y Tratamiento (Rx)</h3>
              <div className="text-sm bg-teal-50/50 p-4 rounded-lg border border-teal-100 font-mono whitespace-pre-line leading-relaxed">
                {printRecord.prescription}
              </div>
            </div>

            {/* Medicamentos Prescritos en Botica Interna */}
            {printRecord.prescriptionItems && printRecord.prescriptionItems.length > 0 && (
              <div>
                <h3 className="font-bold text-teal-900 uppercase text-xs tracking-wider border-b pb-1 mb-2">
                  Medicamentos Formulados en Botica Interna
                </h3>
                <table className="w-full text-left text-xs border border-gray-300">
                  <thead className="bg-gray-100 border-b border-gray-300 text-gray-700">
                    <tr>
                      <th className="p-2">Cód.</th>
                      <th className="p-2">Medicamento & Presentación</th>
                      <th className="p-2">Posología / Dosis</th>
                      <th className="p-2 text-center">Cant.</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {printRecord.prescriptionItems.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-mono text-gray-600">{item.medication?.code || 'MED'}</td>
                        <td className="p-2 font-medium text-gray-900">
                          {item.medication?.name || 'Medicamento'}
                          {item.medication?.presentation && ` (${item.medication.presentation})`}
                        </td>
                        <td className="p-2 text-gray-700">{item.dosage}</td>
                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                        <td className="p-2 text-right font-mono">S/ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-300 font-bold">
                      <td colSpan={4} className="p-2 text-right text-gray-800">Total Botica:</td>
                      <td className="p-2 text-right font-mono text-emerald-800">
                        S/ {(printRecord.pharmacyTotal || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="text-[11px] text-gray-600">
                      <td colSpan={5} className="p-2 text-right">
                        Estado en Caja: <strong className={printRecord.pharmacyPaid ? 'text-emerald-700' : 'text-amber-700'}>
                          {printRecord.pharmacyPaid ? 'PAGADO Y DESPACHADO EN BOTICA' : 'PENDIENTE DE DESPACHO EN CAJA'}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {printRecord.notes && (
              <div>
                <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider border-b pb-1 mb-2">Indicaciones Adicionales</h3>
                <p className="text-xs text-gray-600 italic">{printRecord.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-20 pt-8 border-t border-gray-300 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p>Validez médica certificada.</p>
              <p>Clínica Médica Integral • Sistema Integral</p>
            </div>
            <div className="text-center w-56 border-t border-dashed border-gray-400 pt-2">
              <p className="font-bold text-gray-800">{printRecord.doctor.fullName}</p>
              <p>{printRecord.doctor.specialty}</p>
              <p>Colegiatura: {printRecord.doctor.licenseNumber}</p>
              <p className="text-[10px] text-gray-400 mt-1">Firma y Sello</p>
            </div>
          </div>
        </div>
      )}

      {/* VISTA IMPRIMIBLE: COMPROBANTE DE PAGO */}
      {printReceiptApp && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-10 font-sans z-[9999]">
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900">RECIBO DE CAJA OFICIAL</h1>
              <p className="text-xs text-slate-600">Clínica Médica Integral S.A.</p>
              <p className="text-xs text-slate-600">RUC: 20491029381 • Av. Médica Central 1024</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded border border-emerald-300 mb-1">
                PAGADO
              </span>
              <p className="text-xs text-slate-500">Recibo Nº: REC-{printReceiptApp.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-slate-500">Fecha: {printReceiptApp.paidAt ? new Date(printReceiptApp.paidAt).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm mb-8">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Recibido de:</p>
                <p className="font-bold text-slate-900">{printReceiptApp.patient.fullName}</p>
                <p className="text-xs text-slate-600">Email: {printReceiptApp.patient.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Atención con:</p>
                <p className="font-bold text-slate-900">{printReceiptApp.doctor.fullName}</p>
                <p className="text-xs text-slate-600">Especialidad: {printReceiptApp.doctor.specialty}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-xs text-slate-600">
                  <th className="py-2">Concepto / Servicio</th>
                  <th className="py-2">Método de Pago</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-200">
                  <td className="py-3">
                    Consulta Médica Especializada ({printReceiptApp.doctor.specialty})
                    <br />
                    <span className="text-xs text-slate-500">Motivo: {printReceiptApp.reason}</span>
                  </td>
                  <td className="py-3 font-mono font-semibold">{printReceiptApp.paymentMethod || 'EFECTIVO'}</td>
                  <td className="py-3 text-right font-mono font-bold">
                    ${(printReceiptApp.amountPaid ?? printReceiptApp.doctor.consultationFee ?? 50).toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="py-4 text-right font-bold text-slate-700">Total Cancelado (USD):</td>
                  <td className="py-4 text-right font-mono font-black text-lg text-emerald-800">
                    ${(printReceiptApp.amountPaid ?? printReceiptApp.doctor.consultationFee ?? 50).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between items-center text-xs text-slate-500">
            <div>
              <p>Este recibo electrónico certifica la cancelación del servicio médico.</p>
              <p>Gracias por su confianza en nuestro equipo de salud.</p>
            </div>
            <div className="text-center w-48 border-t border-dashed border-slate-400 pt-2">
              <p className="text-slate-700 font-bold">Caja y Tesorería</p>
              <p className="text-[10px]">Clínica Médica Integral</p>
            </div>
          </div>
        </div>
      )}

      {/* VISTA IMPRIMIBLE: CERTIFICADO DE DESCANSO MÉDICO */}
      {printRestCertRecord && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-10 font-sans z-[9999]">
          <div className="border-b-4 border-emerald-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-lg">
                  +
                </div>
                <div>
                  <h1 className="text-2xl font-black text-emerald-950 tracking-tight">CLÍNICA MÉDICA SAN JUAN</h1>
                  <p className="text-xs font-semibold text-emerald-700">COMPLEJO HOSPITALARIO & CENTRO DE ESPECIALIDADES</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Av. Médica Central 1024 • RUC: 20491029381 • Tel: +51 1 800-CLINICA</p>
            </div>
            <div className="text-right text-xs">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded border border-emerald-300 mb-1">
                CERTIFICADO OFICIAL
              </span>
              <p><span className="font-bold">Nº Folio:</span> CDM-{printRestCertRecord.id.slice(0, 8).toUpperCase()}</p>
              <p><span className="font-bold">Fecha de Emisión:</span> {new Date(printRestCertRecord.createdAt).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div className="text-center my-6">
            <h2 className="text-xl font-black tracking-wide text-gray-900 uppercase border-y-2 border-gray-300 py-2">
              CERTIFICADO MÉDICO DE INCAPACIDAD TEMPORAL / DESCANSO MÉDICO
            </h2>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg mb-6 text-sm grid grid-cols-2 gap-4 border border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Datos del Paciente</p>
              <p className="text-base font-bold text-gray-900 mt-1">{printRestCertRecord.patient.fullName}</p>
              <p className="text-xs text-gray-600">Email: {printRestCertRecord.patient.email}</p>
              {printRestCertRecord.patient.phone && <p className="text-xs text-gray-600">Teléfono: {printRestCertRecord.patient.phone}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Médico Tratante Emisor</p>
              <p className="text-base font-bold text-gray-900 mt-1">{printRestCertRecord.doctor.fullName}</p>
              <p className="text-xs text-gray-600">Especialidad: {printRestCertRecord.doctor.specialty}</p>
              <p className="text-xs text-gray-600">Nº Colegiatura: <strong className="font-mono">{printRestCertRecord.doctor.licenseNumber || 'N/A'}</strong></p>
            </div>
          </div>

          <div className="space-y-6 text-sm">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
              <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">I. Diagnóstico Médico Clínico</h3>
              <p className="text-gray-900 font-medium">{printRestCertRecord.diagnosis}</p>
              {printRestCertRecord.cie10Code && (
                <p className="text-xs text-gray-600">
                  Clasificación Internacional de Enfermedades (CIE-10): <span className="font-mono font-bold text-emerald-800">{printRestCertRecord.cie10Code}</span>
                </p>
              )}
            </div>

            <div className="p-5 rounded-xl border-2 border-emerald-800 bg-emerald-50/50 space-y-3">
              <h3 className="font-bold text-emerald-950 uppercase text-xs tracking-wider">II. Prescripción de Descanso Médico</h3>
              <p className="text-base text-gray-900">
                Por la presente se certifica que el/la paciente antes mencionado(a) requiere reposo físico e incapacidad temporal para el trabajo/estudio durante un período de:
              </p>
              <div className="text-center py-3 bg-white rounded-lg border border-emerald-200">
                <span className="text-3xl font-black text-emerald-900">{printRestCertRecord.restDays || 0} DÍAS CALENDARIO</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-700 pt-2 border-t border-emerald-200">
                <div>
                  Fecha de Inicio: <span className="font-bold text-gray-900">{printRestCertRecord.restStartDate ? new Date(printRestCertRecord.restStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha de emisión'}</span>
                </div>
                <div>
                  Fecha de Culminación: <span className="font-bold text-gray-900">{printRestCertRecord.restEndDate ? new Date(printRestCertRecord.restEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                </div>
              </div>
            </div>

            {printRestCertRecord.notes && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                <p className="font-bold text-gray-700">Recomendaciones y Observaciones:</p>
                <p className="text-gray-600 italic mt-1">{printRestCertRecord.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-24 pt-8 border-t border-gray-300 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p>Documento médico legal expedido para los fines que el interesado estime conveniente.</p>
              <p>Clínica Médica San Juan • Sistema de Gestión Hospitalaria Integral</p>
            </div>
            <div className="text-center w-64 border-t border-dashed border-gray-400 pt-3">
              <p className="font-bold text-gray-900">{printRestCertRecord.doctor.fullName}</p>
              <p>{printRestCertRecord.doctor.specialty}</p>
              <p>CMP / Reg: {printRestCertRecord.doctor.licenseNumber}</p>
              <p className="text-[10px] text-gray-400 mt-2 font-mono">FIRMA Y SELLO PROFESIONAL</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
              title="Volver a la portada"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base leading-none">
                  Portal Clínico Integral
                </h1>
                <span className="text-xs text-slate-400">
                  Triaje, Expediente, Pagos & Analítica
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white">{user.fullName}</span>
              <span className="text-[11px] text-slate-400">{user.email}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
              {user.role === 'NURSE' ? 'Enfermería & Triaje' : user.role}
            </span>

            {/* Campana de Notificaciones */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                title="Notificaciones"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-teal-400" />
                      <h4 className="font-bold text-sm text-white">Notificaciones</h4>
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          {unreadNotifCount} nuevas
                        </span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllNotifsAsRead}
                        className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                      >
                        Marcar todas leídas
                      </button>
                    )}
                  </div>

                  <div className="mt-3 max-h-80 overflow-y-auto space-y-2 divide-y divide-slate-800/40">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No tienes notificaciones
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.isRead && handleMarkNotifAsRead(notif.id)}
                          className={`pt-2.5 pb-2 px-2.5 rounded-xl transition-all cursor-pointer ${
                            notif.isRead
                              ? 'bg-transparent text-slate-400'
                              : 'bg-slate-800/60 text-slate-200 border-l-2 border-teal-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-white">{notif.title}</span>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {new Date(notif.createdAt).toLocaleDateString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-950/30 hover:border-rose-900 text-slate-400 hover:text-rose-400 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:pb-8 space-y-8 flex-1 print:hidden">
        {/* Banner de Bienvenida y Pestañas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/60 to-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Bienvenido(a), {user.fullName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {user.role === 'PATIENT'
                ? 'Gestiona tus citas con horarios en tiempo real, revisa tu triaje y descarga recibos de pago.'
                : user.role === 'DOCTOR'
                ? 'Monitorea signos vitales en triaje, consulta expedientes históricos y prescribe recetas farmacológicas.'
                : user.role === 'NURSE'
                ? 'Estación de Enfermería: Registro y control de Triaje, Camillas/Boxes de Tópico y consulta de Laboratorio.'
                : 'Gestión clínica, control de caja y pagos, y panel analítico ejecutivo.'}
            </p>
          </div>

          {/* Navegación por pestañas */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto max-w-full no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'appointments'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{user.role === 'PATIENT' ? 'Mis Citas' : user.role === 'NURSE' ? 'Citas & Triaje' : 'Citas'}</span>
            </button>

            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'records'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Historial</span>
              {medicalRecords.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-mono">
                  {medicalRecords.length}
                </span>
              )}
            </button>

            {/* Pestaña Laboratorio */}
            <button
              onClick={() => setActiveTab('lab_orders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'lab_orders'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Laboratorio</span>
            </button>

            {/* Pestaña Tópico */}
            {(user.role === 'ADMIN' || user.role === 'DOCTOR' || user.role === 'RECEPTIONIST' || user.role === 'NURSE') && (
              <button
                onClick={() => setActiveTab('observation_beds')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'observation_beds'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BedDouble className="h-3.5 w-3.5" />
                <span>Tópico</span>
              </button>
            )}

            {/* Pestaña Pacientes */}
            {(user.role === 'ADMIN' || user.role === 'DOCTOR' || user.role === 'RECEPTIONIST' || user.role === 'NURSE') && (
              <button
                onClick={() => setActiveTab('patients')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'patients'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Pacientes</span>
              </button>
            )}

            {/* Pestaña Bloqueos */}
            {(user.role === 'DOCTOR' || user.role === 'ADMIN') && (
              <button
                onClick={() => setActiveTab('blocked_dates')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'blocked_dates'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CalendarOff className="h-3.5 w-3.5" />
                <span>Bloqueos</span>
              </button>
            )}

            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Analítica</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin_management')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'admin_management'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Gestión</span>
                </button>

                <button
                  onClick={() => setActiveTab('pharmacy')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'pharmacy'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Pill className="h-3.5 w-3.5" />
                  <span>Botica</span>
                </button>
              </>
            )}

            {/* Pestaña Caja Unificada (ADMIN y RECEPTIONIST) */}
            {(user.role === 'ADMIN' || user.role === 'RECEPTIONIST') && (
              <button
                onClick={() => {
                  setActiveTab('billing');
                  loadDailyClose();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'billing'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Caja</span>
              </button>
            )}

            {/* Pestaña Mi Perfil */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'profile'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Perfil</span>
            </button>

            {/* Acceso Directo a Sala de Espera TV */}
            <a
              href="/sala-espera"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-slate-800/80 transition-all"
              title="Abrir Sala de Espera TV en pestaña nueva"
            >
              <Tv className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Sala TV</span>
            </a>

            <button
              onClick={loadDashboardData}
              disabled={loadingData}
              className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-900 rounded-xl transition-all"
              title="Refrescar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PESTAÑA 1: CITAS, TRIAJE Y PAGOS                              */}
        {/* ============================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-8">
            {/* Si es PACIENTE: Reserva con Slots + Listado con Recibo */}
            {user.role === 'PATIENT' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Formulario de Reserva */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                      <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                        <PlusCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Reservar Cita Médica</h3>
                        <p className="text-xs text-slate-400">Horarios disponibles calculados en tiempo real</p>
                      </div>
                    </div>

                    {bookError && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>{bookError}</span>
                      </div>
                    )}

                    {bookSuccess && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{bookSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateAppointment} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 block">1. Especialidad</label>
                        <select
                          value={bookSpecialtyId}
                          onChange={(e) => {
                            setBookSpecialtyId(e.target.value);
                            setBookDoctorId('');
                            setBookDate('');
                            setSlotsData(null);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        >
                          <option value="">-- Seleccionar Especialidad --</option>
                          {specialties.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 block">2. Médico</label>
                        <select
                          value={bookDoctorId}
                          onChange={(e) => {
                            setBookDoctorId(e.target.value);
                            setBookDate('');
                            setSlotsData(null);
                          }}
                          disabled={!bookSpecialtyId}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-teal-500"
                        >
                          <option value="">-- Seleccionar Médico --</option>
                          {doctors
                            .filter((d) => !bookSpecialtyId || d.specialty?.id === bookSpecialtyId)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.fullName} - Tarifa: ${d.consultationFee.toFixed(2)}{d.averageRating && d.averageRating > 0 ? ` (★ ${d.averageRating.toFixed(1)})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 block">3. Fecha</label>
                        <input
                          type="date"
                          min={todayStr}
                          value={bookDate}
                          disabled={!bookDoctorId}
                          onChange={(e) => setBookDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      {/* Slots */}
                      {bookDoctorId && bookDate && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                            <span>4. Horarios Disponibles:</span>
                            {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-teal-400" />}
                          </label>

                          {loadingSlots ? (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                              Calculando turnos disponibles...
                            </div>
                          ) : slotsData?.blocked ? (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                              <p className="font-semibold flex items-center gap-1.5 text-rose-400">
                                <AlertTriangle className="h-4 w-4 text-rose-400" />
                                Fecha no laborable para el médico
                              </p>
                              <p className="text-[11px] text-rose-200/90">
                                Motivo: {slotsData.reason || 'El especialista ha marcado esta fecha como bloqueada / no disponible.'}
                              </p>
                            </div>
                          ) : slotsData?.available === false ? (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                              <p className="font-semibold flex items-center gap-1.5">
                                <AlertCircle className="h-4 w-4" />
                                {slotsData.message}
                              </p>
                              {slotsData.workingDays && (
                                <p className="text-[11px] text-amber-200/80">
                                  Días de atención habituales: {slotsData.workingDays.map((d) => getDayName(d)).join(', ')}
                                </p>
                              )}
                            </div>
                          ) : slotsData?.slots && slotsData.slots.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                              {slotsData.slots.map((slot) => {
                                const isSelected = selectedSlot === slot;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`py-2 px-1 text-xs font-mono rounded-lg border font-semibold transition-all ${
                                      isSelected
                                        ? 'bg-teal-500 text-white border-teal-400 shadow-md shadow-teal-950 scale-105'
                                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-rose-300 bg-rose-500/10 rounded-xl border border-rose-500/20">
                              No hay turnos libres en esta fecha.
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 block">5. Motivo</label>
                        <input
                          type="text"
                          required
                          value={bookReason}
                          onChange={(e) => setBookReason(e.target.value)}
                          placeholder="Ej: Control de hipertensión, dolor de cabeza..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={bookSubmitting || !selectedSlot}
                        className="w-full py-3 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white shadow-lg shadow-teal-950 transition-all"
                      >
                        {bookSubmitting ? 'Agendando...' : `Confirmar Turno: ${selectedSlot || '--:--'}`}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Listado de Citas de Paciente */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Mis Consultas y Citas</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                      {appointments.length} citas
                    </span>
                  </div>

                  {loadingData && appointments.length === 0 ? (
                    <div className="space-y-4">
                      <AppointmentCardSkeleton />
                      <AppointmentCardSkeleton />
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                      <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400">No tienes citas médicas programadas.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appointments.map((app) => {
                        const scheduledDate = new Date(app.scheduledAt);
                        return (
                          <div
                            key={app.id}
                            className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-bold text-white text-sm">{app.doctor.fullName}</h4>
                                <p className="text-xs text-teal-400 font-medium">{app.doctor.specialty}</p>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                                  {scheduledDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                                  • {scheduledDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {app.queueCode && (
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                      Turno: {app.queueCode}
                                    </span>
                                    {app.consultingRoom && (
                                      <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                                        {app.consultingRoom}
                                      </span>
                                    )}
                                    {app.calledAt && (
                                      <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg animate-pulse">
                                        ¡Llamando ahora! Pase al consultorio
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                {getStatusBadge(app.status)}
                                {getPaymentBadge(app.paymentStatus, app.paymentMethod)}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                              <span className="font-semibold text-slate-400 block mb-0.5">Motivo:</span>
                              <p>{app.reason}</p>
                            </div>

                            {/* Badge de Triaje */}
                            {app.triage && (
                              <div className="p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs flex items-center gap-2 text-teal-300">
                                <Activity className="h-4 w-4 text-teal-400 flex-shrink-0" />
                                <span>
                                  <span className="font-bold">Signos:</span> PA: {app.triage.bloodPressure} • FC: {app.triage.heartRate} lpm • Tº: {app.triage.temperature}°C • Sat: {app.triage.oxygenSaturation}%
                                </span>
                              </div>
                            )}

                            {/* Reseña / Calificación del Paciente */}
                            {app.review && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                                <div>
                                  <span className="font-bold">Tu Calificación: </span>
                                  <span className="font-semibold text-amber-200">{app.review.rating} / 5</span>
                                  {app.review.comment && (
                                    <span className="text-slate-300 italic ml-1">
                                      &ldquo;{app.review.comment}&rdquo;
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                              <div className="flex items-center gap-2">
                                {app.paymentStatus === 'PAID' ? (
                                  <button
                                    onClick={() => {
                                      setPrintReceiptApp(app);
                                      setTimeout(() => window.print(), 150);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                                  >
                                    <Receipt className="h-3.5 w-3.5" />
                                    <span>Descargar / Imprimir Recibo</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">Pago en recepción o caja</span>
                                )}

                                {app.status === 'COMPLETED' && !app.review && (
                                  <button
                                    onClick={() => {
                                      setSelectedAppForReview(app);
                                      setReviewRating(5);
                                      setReviewComment('');
                                      setReviewError('');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
                                  >
                                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                                    <span>Calificar Atención</span>
                                  </button>
                                )}
                              </div>

                              {(app.status === 'PENDING' || app.status === 'CONFIRMED') && (
                                <button
                                  onClick={() => {
                                    if (confirm('¿Deseas cancelar esta cita?')) {
                                      handleUpdateStatus(app.id, 'CANCELLED');
                                    }
                                  }}
                                  disabled={actionLoading === app.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>Cancelar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Si es DOCTOR, ADMIN, NURSE o RECEPTIONIST: Listado con Triaje, Cobro y Atención */}
            {(user.role === 'DOCTOR' || user.role === 'ADMIN' || user.role === 'NURSE' || user.role === 'RECEPTIONIST') && (
              <div className="space-y-6">
                {/* KPIs Superiores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {user.role === 'NURSE' ? (
                    <>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-amber-400">Citas Pendientes</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">{pendingCount}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-emerald-400">Citas Confirmadas</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">{confirmedCount}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-rose-400">Triaje Pendiente</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">{triagePendingCount}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-teal-400">Triaje Completado</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono">{triageCompletedCount}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-slate-400">Total de Citas</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{totalCount}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-amber-400">Pendientes</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">{pendingCount}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-emerald-400">Confirmadas</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">{confirmedCount}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-sky-400">Completadas</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono">{completedCount}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Filtros, Buscador y Selector de Vista (Lista / Agenda Semanal) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    {/* Buscador de Citas */}
                    <div className="relative min-w-[220px] sm:min-w-[280px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar por paciente, médico o turno..."
                        value={appointmentSearchQuery}
                        onChange={(e) => setAppointmentSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
                      />
                      {appointmentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAppointmentSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                          title="Limpiar búsqueda"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Filtros de Estado y Triaje */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                      <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                        <Filter className="h-3.5 w-3.5" /> Filtrar:
                      </span>
                      {['TODOS', 'PENDING', 'CONFIRMED', 'COMPLETED', 'NO_TRIAGE', 'CANCELLED'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            statusFilter === st
                              ? st === 'NO_TRIAGE'
                                ? 'bg-rose-600 text-white shadow-md'
                                : 'bg-teal-600 text-white shadow-md'
                              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          <span>
                            {st === 'TODOS'
                              ? 'Todas'
                              : st === 'PENDING'
                              ? 'Pendientes'
                              : st === 'CONFIRMED'
                              ? 'Confirmadas'
                              : st === 'COMPLETED'
                              ? 'Completadas'
                              : st === 'NO_TRIAGE'
                              ? 'Sin Triaje'
                              : 'Canceladas'}
                          </span>
                          {st === 'NO_TRIAGE' && triagePendingCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                              {triagePendingCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end lg:self-auto">
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      Mostrando {filteredAppointments.length} de {appointments.length} citas
                    </span>

                    {/* Toggle Lista | Agenda Semanal */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAppointmentsViewMode('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          appointmentsViewMode === 'list'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>Lista</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppointmentsViewMode('week')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          appointmentsViewMode === 'week'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Agenda Semanal</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISTA 1: AGENDA SEMANAL */}
                {appointmentsViewMode === 'week' ? (
                  <div className="space-y-4">
                    {/* Barra de Navegación de la Semana */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWeekOffset((prev) => prev - 1)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                          title="Semana anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeekOffset((prev) => prev + 1)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                          title="Semana siguiente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <span className="font-bold text-white text-xs sm:text-sm pl-2">
                          Semana: {currentWeekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {currentWeekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {weekOffset !== 0 && (
                        <button
                          type="button"
                          onClick={() => setWeekOffset(0)}
                          className="text-xs font-semibold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Ir a Hoy
                        </button>
                      )}
                    </div>

                    {/* Columnas por Día (Lunes a Domingo) */}
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                      {currentWeekDays.map((dayDate, idx) => {
                        const isToday =
                          new Date().toDateString() === dayDate.toDateString();
                        const dayName = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][idx];

                        const dayApps = filteredAppointments
                          .filter((app) => {
                            const d = new Date(app.scheduledAt);
                            return (
                              d.getFullYear() === dayDate.getFullYear() &&
                              d.getMonth() === dayDate.getMonth() &&
                              d.getDate() === dayDate.getDate()
                            );
                          })
                          .sort(
                            (a, b) =>
                              new Date(a.scheduledAt).getTime() -
                              new Date(b.scheduledAt).getTime()
                          );

                        return (
                          <div
                            key={dayDate.toISOString()}
                            className={`rounded-2xl p-3 border flex flex-col min-h-[320px] transition-all ${
                              isToday
                                ? 'bg-teal-950/20 border-teal-500/40 shadow-lg shadow-teal-950/20'
                                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Cabecera del Día */}
                            <div className="pb-2.5 mb-2.5 border-b border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                  {dayName}
                                </span>
                                <span className={`text-sm font-extrabold ${isToday ? 'text-teal-400' : 'text-white'}`}>
                                  {dayDate.getDate()} {dayDate.toLocaleDateString('es-ES', { month: 'short' })}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  dayApps.length > 0
                                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono'
                                    : 'text-slate-500'
                                }`}
                              >
                                {dayApps.length}
                              </span>
                            </div>

                            {/* Citas del Día */}
                            <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                              {dayApps.length === 0 ? (
                                <div className="h-24 flex items-center justify-center text-[11px] text-slate-600 italic">
                                  Sin citas
                                </div>
                              ) : (
                                dayApps.map((app) => {
                                  const timeStr = new Date(app.scheduledAt).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  });
                                  return (
                                    <div
                                      key={app.id}
                                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-1.5 shadow-sm text-xs"
                                    >
                                      {/* Hora y Estado */}
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] font-bold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                          {timeStr}
                                        </span>
                                        <span className="text-[10px]">
                                          {getStatusBadge(app.status)}
                                        </span>
                                      </div>

                                      {/* Paciente y Motivo */}
                                      <div>
                                        <p className="font-bold text-white text-xs truncate" title={app.patient.fullName}>
                                          {app.patient.fullName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate" title={app.reason}>
                                          {app.reason}
                                        </p>
                                      </div>

                                      {/* Acciones Rápidas */}
                                      <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
                                        {/* Triaje */}
                                        {app.triage ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedAppForTriage(app);
                                              setTriageBP(app.triage!.bloodPressure);
                                              setTriageHR(app.triage!.heartRate.toString());
                                              setTriageTemp(app.triage!.temperature.toString());
                                              setTriageWeight(app.triage!.weightKg.toString());
                                              setTriageHeight(app.triage!.heightCm.toString());
                                              setTriageO2(app.triage!.oxygenSaturation.toString());
                                              setTriageAllergies(app.triage!.allergies || '');
                                              setTriageNotes(app.triage!.notes || '');
                                            }}
                                            className="w-full text-left py-0.5 px-1.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center justify-between hover:bg-emerald-500/20 transition-all"
                                            title="Editar signos vitales de triaje"
                                          >
                                            <span className="flex items-center gap-1 font-semibold truncate">
                                              <Activity className="h-2.5 w-2.5 text-emerald-400 flex-shrink-0" />
                                              PA {app.triage.bloodPressure}
                                            </span>
                                            <span className="text-[9px] text-emerald-300 font-bold">Editar Triaje</span>
                                          </button>
                                        ) : (
                                          (app.status === 'PENDING' || app.status === 'CONFIRMED') && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppForTriage(app);
                                                setTriageBP('120/80');
                                                setTriageHR('75');
                                                setTriageTemp('36.5');
                                                setTriageWeight('70');
                                                setTriageHeight('170');
                                                setTriageO2('98');
                                                setTriageAllergies('');
                                                setTriageNotes('');
                                              }}
                                              className="w-full py-1 px-1.5 rounded text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1 shadow-sm transition-all"
                                            >
                                              <Activity className="h-2.5 w-2.5" />
                                              <span>Tomar Triaje</span>
                                            </button>
                                          )
                                        )}

                                        {/* Cobro para Admin */}
                                        {user.role === 'ADMIN' && app.paymentStatus === 'UNPAID' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedAppForPayment(app);
                                              setPayAmount((app.doctor.consultationFee ?? 50).toString());
                                            }}
                                            className="w-full py-1 px-1.5 rounded text-[10px] font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 shadow-sm transition-all"
                                          >
                                            <CreditCard className="h-2.5 w-2.5" />
                                            <span>Cobrar</span>
                                          </button>
                                        )}

                                        {/* Atender para Doctor */}
                                        {user.role === 'DOCTOR' && app.status === 'CONFIRMED' && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedAppForRecord(app)}
                                            className="w-full py-1 px-1.5 rounded text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1 shadow-sm transition-all"
                                          >
                                            <Stethoscope className="h-2.5 w-2.5" />
                                            <span>Atender</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* VISTA 2: LISTA DE CITAS CON DETALLES */
                  loadingData && filteredAppointments.length === 0 ? (
                    <div className="space-y-4">
                      <AppointmentCardSkeleton />
                      <AppointmentCardSkeleton />
                      <AppointmentCardSkeleton />
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                      No se encontraron citas con el filtro seleccionado.
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {filteredAppointments.map((app) => {
                      const date = new Date(app.scheduledAt);
                      const isActionable = app.status !== 'COMPLETED' && app.status !== 'CANCELLED';

                      return (
                        <div
                          key={app.id}
                          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                                  {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} • {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {app.queueCode && (
                                  <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                                    Turno: {app.queueCode}
                                  </span>
                                )}
                                {app.consultingRoom && (
                                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 border border-slate-700/80 px-2 py-0.5 rounded">
                                    {app.consultingRoom}
                                  </span>
                                )}
                                {getStatusBadge(app.status)}
                                {getPaymentBadge(app.paymentStatus, app.paymentMethod)}
                              </div>

                              <div className="text-sm">
                                <span className="font-bold text-white">{app.patient.fullName}</span>{' '}
                                <span className="text-xs text-slate-400">({app.patient.email})</span>
                                {app.patient.phone && (
                                  <span className="text-xs text-slate-400 font-mono ml-2">
                                    • Tel: {app.patient.phone}
                                  </span>
                                )}
                              </div>

                              {(user.role === 'ADMIN' || user.role === 'NURSE' || user.role === 'RECEPTIONIST') && (
                                <p className="text-xs text-slate-400">
                                  Médico: <span className="font-semibold text-slate-300">{app.doctor.fullName}</span> ({app.doctor.specialty})
                                  {user.role === 'ADMIN' && ` • Tarifa: $${app.doctor.consultationFee?.toFixed(2)}`}
                                </p>
                              )}

                              <p className="text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">
                                <span className="text-slate-400 font-semibold">Motivo:</span> {app.reason}
                              </p>
                            </div>

                            {/* Acciones principales */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botón Triaje */}
                              {(user.role === 'DOCTOR' || user.role === 'ADMIN' || user.role === 'NURSE' || user.role === 'RECEPTIONIST') && (
                                <button
                                  onClick={() => {
                                    setSelectedAppForTriage(app);
                                    if (app.triage) {
                                      setTriageBP(app.triage.bloodPressure);
                                      setTriageHR(app.triage.heartRate.toString());
                                      setTriageTemp(app.triage.temperature.toString());
                                      setTriageWeight(app.triage.weightKg.toString());
                                      setTriageHeight(app.triage.heightCm.toString());
                                      setTriageO2(app.triage.oxygenSaturation.toString());
                                      setTriageAllergies(app.triage.allergies || '');
                                      setTriageNotes(app.triage.notes || '');
                                    } else {
                                      setTriageBP('120/80');
                                      setTriageHR('75');
                                      setTriageTemp('36.5');
                                      setTriageWeight('70');
                                      setTriageHeight('170');
                                      setTriageO2('98');
                                      setTriageAllergies('');
                                      setTriageNotes('');
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                                    app.triage
                                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/40 ring-1 ring-teal-400/40'
                                  }`}
                                  title={app.triage ? 'Editar signos vitales de triaje' : 'Tomar signos vitales de triaje'}
                                >
                                  <Activity className="h-3.5 w-3.5 text-teal-300" />
                                  <span>{app.triage ? 'Editar Triaje' : 'Tomar Triaje'}</span>
                                </button>
                              )}

                              {/* Botón Registrar Pago (Admin) */}
                              {user.role === 'ADMIN' && app.paymentStatus === 'UNPAID' && (
                                <button
                                  onClick={() => {
                                    setSelectedAppForPayment(app);
                                    setPayAmount((app.doctor.consultationFee || 50).toString());
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  <span>Registrar Cobro</span>
                                </button>
                              )}

                              {/* Recibo si ya está pagado */}
                              {app.paymentStatus === 'PAID' && (
                                <button
                                  onClick={() => {
                                    setPrintReceiptApp(app);
                                    setTimeout(() => window.print(), 150);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
                                  title="Imprimir Comprobante de Pago"
                                >
                                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Recibo</span>
                                </button>
                              )}

                              {/* Botón Llamar Turno (Doctor / Admin) */}
                              {(user.role === 'DOCTOR' || user.role === 'ADMIN') && app.status === 'CONFIRMED' && (
                                <button
                                  type="button"
                                  onClick={() => handleCallAppointment(app)}
                                  disabled={callingAppId === app.id}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    app.calledAt
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950'
                                  }`}
                                  title="Llamar al paciente por altavoz y sala de espera"
                                >
                                  <Tv className="h-3.5 w-3.5" />
                                  <span>{callingAppId === app.id ? 'Llamando...' : app.calledAt ? 'Volver a Llamar' : 'Llamar Turno'}</span>
                                </button>
                              )}

                              {/* Botón Atender Consulta (Doctor) */}
                              {user.role === 'DOCTOR' && app.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => {
                                    setSelectedAppForRecord(app);
                                    setRecordDiagnosis('');
                                    setRecordPrescription('');
                                    setRecordNotes('');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-950 transition-all"
                                >
                                  <Stethoscope className="h-4 w-4" />
                                  <span>Atender / Consulta</span>
                                </button>
                              )}

                              {/* Botones Confirmar / Cancelar */}
                              {app.status === 'PENDING' && (
                                <button
                                  onClick={() => handleUpdateStatus(app.id, 'CONFIRMED')}
                                  disabled={actionLoading === app.id}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                  Confirmar
                                </button>
                              )}

                              {isActionable && (
                                <button
                                  onClick={() => {
                                    if (confirm('¿Deseas cancelar esta cita?')) {
                                      handleUpdateStatus(app.id, 'CANCELLED');
                                    }
                                  }}
                                  disabled={actionLoading === app.id}
                                  className="p-1.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
                                  title="Cancelar Cita"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Resumen visual de triaje si existe */}
                          {app.triage && (
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-wrap items-center gap-4 text-slate-300">
                              <span className="font-bold text-teal-400 flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" /> Triaje:
                              </span>
                              <span>PA: <strong className="text-white">{app.triage.bloodPressure}</strong> mmHg</span>
                              <span>FC: <strong className="text-white">{app.triage.heartRate}</strong> lpm</span>
                              <span>Temp: <strong className="text-white">{app.triage.temperature}</strong> °C</span>
                              <span>Peso: <strong className="text-white">{app.triage.weightKg}</strong> kg</span>
                              <span>Talla: <strong className="text-white">{app.triage.heightCm}</strong> cm</span>
                              <span>SatO2: <strong className="text-white">{app.triage.oxygenSaturation}</strong>%</span>
                              {app.triage.allergies && (
                                <span className="text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  Alergias: {app.triage.allergies}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: HISTORIAL CLÍNICO                                   */}
        {/* ============================================================== */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-teal-400" />
                  Expediente Clínico & Recetas Médicas
                </h3>
                <p className="text-xs text-slate-400">
                  Historial de atenciones médicas completadas y prescripciones oficiales
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300">
                {medicalRecords.length} atenciones registradas
              </span>
            </div>

            {medicalRecords.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <FileText className="h-12 w-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No hay atenciones médicas registradas aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {medicalRecords.map((rec) => {
                  const recordDate = new Date(rec.createdAt);

                  return (
                    <div
                      key={rec.id}
                      className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                              {recordDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-base">
                            {rec.doctor.fullName} • <span className="text-teal-400 text-sm">{rec.doctor.specialty}</span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Paciente: <strong className="text-slate-200">{rec.patient.fullName}</strong> ({rec.patient.email})
                            {rec.doctor.licenseNumber && (
                              <span className="ml-2">• Colegiatura: <code className="text-slate-300">{rec.doctor.licenseNumber}</code></span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {rec.restDays && rec.restDays > 0 && (
                            <button
                              onClick={() => {
                                setPrintRestCertRecord(rec);
                                setTimeout(() => window.print(), 150);
                              }}
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 transition-all"
                            >
                              <FileCheck className="h-4 w-4 text-emerald-400" />
                              <span>Descanso Médico ({rec.restDays} d)</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setPrintRecord(rec);
                              setTimeout(() => window.print(), 150);
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                          >
                            <Printer className="h-4 w-4 text-teal-400" />
                            <span>Imprimir Receta (PDF)</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnóstico Clínico:</span>
                        <p className="text-sm text-slate-200 bg-slate-950/70 p-3 rounded-xl border border-slate-800">{rec.diagnosis}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Prescripción y Tratamiento (Rx):</span>
                        <div className="text-xs text-teal-200 font-mono bg-teal-950/20 p-4 rounded-xl border border-teal-900/40 whitespace-pre-line leading-relaxed">
                          {rec.prescription}
                        </div>
                      </div>

                      {/* Medicamentos Prescritos de Botica */}
                      {rec.prescriptionItems && rec.prescriptionItems.length > 0 && (
                        <div className="space-y-2 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <Pill className="h-4 w-4 text-emerald-400" />
                              <span className="text-xs font-bold uppercase tracking-wider text-white">
                                Medicamentos de Botica Interna ({rec.prescriptionItems.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                Total: S/ {(rec.pharmacyTotal || 0).toFixed(2)}
                              </span>
                              {rec.pharmacyPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <Check className="h-3 w-3" /> PAGADO EN BOTICA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <Clock className="h-3 w-3" /> PENDIENTE EN CAJA
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-800/80">
                                  <th className="py-1.5 px-2">Código</th>
                                  <th className="py-1.5 px-2">Medicamento</th>
                                  <th className="py-1.5 px-2">Posología</th>
                                  <th className="py-1.5 px-2 text-center">Cant.</th>
                                  <th className="py-1.5 px-2 text-right">P. Unit</th>
                                  <th className="py-1.5 px-2 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {rec.prescriptionItems.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-1.5 px-2 font-mono text-slate-400">{item.medication?.code || 'MED'}</td>
                                    <td className="py-1.5 px-2">
                                      <span className="font-semibold text-white">{item.medication?.name || 'Medicamento'}</span>
                                      {item.medication?.presentation && (
                                        <span className="text-[10px] text-slate-400 block">{item.medication.presentation}</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-slate-300">{item.dosage}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-teal-300">{item.quantity}</td>
                                    <td className="py-1.5 px-2 text-right font-mono text-slate-300">S/ {item.unitPrice.toFixed(2)}</td>
                                    <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">
                                      S/ {item.subtotal.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Botón Cobrar y Despachar en Caja (Admin y Recepción) */}
                          {(user.role === 'ADMIN' || user.role === 'RECEPTIONIST') && !rec.pharmacyPaid && (
                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDispensePrescription(rec.id)}
                                disabled={actionLoading === rec.id}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all"
                              >
                                {actionLoading === rec.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>Cobrar y Despachar Receta (S/ {(rec.pharmacyTotal || 0).toFixed(2)})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {rec.notes && (
                        <div className="text-xs text-slate-400 italic">Notas: {rec.notes}</div>
                      )}

                      {/* Órdenes de Laboratorio e Imágenes de esta Consulta */}
                      {rec.labOrders && rec.labOrders.length > 0 && (
                        <div className="space-y-2 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <FlaskConical className="h-4 w-4 text-cyan-400" />
                              <span className="text-xs font-bold uppercase tracking-wider text-white">
                                Exámenes de Laboratorio & Imágenes Solicitados ({rec.labOrders.length})
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-cyan-400">
                              Total: S/ {rec.labOrders.reduce((acc, lo) => acc + (lo.price || 0), 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {rec.labOrders.map((lo) => (
                              <div
                                key={lo.id}
                                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                      {lo.catalogItem?.code || 'LAB'}
                                    </span>
                                    <span className="text-xs font-semibold text-white">
                                      {lo.catalogItem?.name || 'Examen'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 block mt-0.5">
                                    {lo.catalogItem?.category} • S/ {(lo.price || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      lo.status === 'COMPLETED'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : lo.status === 'IN_PROGRESS'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {lo.status === 'COMPLETED'
                                      ? 'Completado'
                                      : lo.status === 'IN_PROGRESS'
                                      ? 'En Proceso'
                                      : 'Pendiente'}
                                  </span>
                                  {lo.status === 'COMPLETED' && (
                                    <button
                                      type="button"
                                      onClick={() => setViewResultModal(lo)}
                                      className="text-[10px] text-cyan-400 hover:underline block mt-1 font-semibold"
                                    >
                                      Ver Informe
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certificado de Descanso Médico Otorgado */}
                      {rec.restDays && rec.restDays > 0 && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <FileCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">
                                Certificado Oficial de Descanso Médico: <span className="text-emerald-400">{rec.restDays} Días Calendario</span>
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {rec.restStartDate && `Desde: ${new Date(rec.restStartDate).toLocaleDateString('es-ES')}`}
                                {rec.restEndDate && ` • Hasta: ${new Date(rec.restEndDate).toLocaleDateString('es-ES')}`}
                                {rec.cie10Code && ` • Diagnóstico CIE-10: ${rec.cie10Code}`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPrintRestCertRecord(rec);
                              setTimeout(() => window.print(), 150);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Imprimir</span>
                          </button>
                        </div>
                      )}

                      {/* Adjuntos y Resultados de Laboratorio */}
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5 text-teal-400" />
                            Resultados y Adjuntos ({rec.attachments?.length || 0})
                          </span>

                          {(user.role === 'DOCTOR' || user.role === 'ADMIN') && (
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-all">
                              <UploadCloud className="h-3.5 w-3.5" />
                              <span>{uploadingAttachment && uploadingAttachmentRecordId === rec.id ? 'Subiendo...' : '+ Subir Adjunto (PDF/Img)'}</span>
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/webp"
                                className="hidden"
                                disabled={uploadingAttachment}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadingAttachmentRecordId(rec.id);
                                    handleUploadAttachment(rec.id, file);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {rec.attachments && rec.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {rec.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-teal-400 shrink-0" />
                                  <div className="truncate">
                                    <p className="text-xs text-slate-200 font-medium truncate">{att.fileName}</p>
                                    <p className="text-[10px] text-slate-500">{new Date(att.createdAt).toLocaleDateString('es-ES')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setViewAttachmentModal(att)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                                    title="Previsualizar"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadAttachment(att)}
                                    className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20"
                                    title="Descargar"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No hay archivos adjuntos en esta consulta médica.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: ANALÍTICA Y FINANZAS (SOLO ADMIN)                   */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && user.role === 'ADMIN' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-400" />
                  Métricas Ejecutivas & Finanzas Clínicas
                </h3>
                <p className="text-xs text-slate-400">Rendimiento financiero, citas y productividad médica en tiempo real</p>
              </div>
            </div>

            {/* Tarjetas Financieras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/20 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Recaudado (Caja)</span>
                  <DollarSign className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black text-white font-mono">
                  ${(analytics?.financial.totalRevenue || 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-emerald-300/80 block">Consultas pagadas</span>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/20 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Por Cobrar</span>
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black text-white font-mono">
                  ${(analytics?.financial.pendingRevenue || 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-amber-300/80 block">Citas activas pendientes de pago</span>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-teal-500/20 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-teal-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Tasa de Asistencia</span>
                  <Award className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black text-white font-mono">
                  {analytics?.appointments.attendanceRate || 0}%
                </p>
                <span className="text-[11px] text-teal-300/80 block">Completadas vs Agendadas</span>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-blue-500/20 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Pacientes Atendidos</span>
                  <User className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black text-white font-mono">
                  {analytics?.patients.totalUniqueAttended || 0}
                </p>
                <span className="text-[11px] text-blue-300/80 block">Pacientes con atenciones completas</span>
              </div>
            </div>

            {/* Gráficos de Barras con Tailwind */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Citas por Especialidad */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  Demanda por Especialidad Médica
                </h4>
                <div className="space-y-4">
                  {analytics?.bySpecialty && analytics.bySpecialty.length > 0 ? (
                    analytics.bySpecialty.map((sp) => (
                      <div key={sp.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-200">{sp.name}</span>
                          <span className="text-slate-400 font-mono">{sp.count} citas ({sp.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(sp.percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Sin datos registrados aún.</p>
                  )}
                </div>
              </div>

              {/* Rendimiento por Médico */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  Rendimiento del Cuerpo Médico
                </h4>
                <div className="space-y-3">
                  {analytics?.topDoctors && analytics.topDoctors.length > 0 ? (
                    analytics.topDoctors.map((doc, idx) => (
                      <div
                        key={doc.name}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-teal-400">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-white text-xs">{doc.name}</p>
                            <p className="text-[11px] text-teal-400">{doc.specialty}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-200 font-mono block">
                            {doc.completedCount} consultas
                          </span>
                          <span className="text-[11px] text-emerald-400 font-mono">
                            ${doc.revenue.toFixed(2)} recaudados
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Sin datos de médicos aún.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 4: GESTIÓN CLÍNICA (SOLO ADMIN)                        */}
        {/* ============================================================== */}
        {activeTab === 'admin_management' && user.role === 'ADMIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Nueva Especialidad */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Nueva Especialidad</h3>
                    <p className="text-xs text-slate-400">Agregar área médica al catálogo</p>
                  </div>
                </div>

                {specSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {specSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateSpecialty} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Nombre</label>
                    <input
                      type="text"
                      required
                      value={newSpecName}
                      onChange={(e) => setNewSpecName(e.target.value)}
                      placeholder="Ej: Odontología, Ginecología..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Descripción</label>
                    <textarea
                      rows={3}
                      value={newSpecDesc}
                      onChange={(e) => setNewSpecDesc(e.target.value)}
                      placeholder="Alcance médico..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Icono</label>
                    <select
                      value={newSpecIcon}
                      onChange={(e) => setNewSpecIcon(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="stethoscope">Estetoscopio</option>
                      <option value="heart-pulse">Corazón</option>
                      <option value="baby">Bebé</option>
                      <option value="activity">Actividad / Pulso</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={specSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white transition-all"
                  >
                    {specSubmitting ? 'Guardando...' : 'Crear Especialidad'}
                  </button>
                </form>
              </div>
            </div>

            {/* Alta de Nuevo Médico */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Alta de Médico Especialista</h3>
                    <p className="text-xs text-slate-400">Creación de cuenta y horarios de consulta</p>
                  </div>
                </div>

                {docError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {docError}
                  </div>
                )}

                {docSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {docSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateDoctor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={docFullName}
                        onChange={(e) => setDocFullName(e.target.value)}
                        placeholder="Ej: Dr. Manuel Santos"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Correo</label>
                      <input
                        type="email"
                        required
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                        placeholder="dr.santos@clinica.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Contraseña</label>
                      <input
                        type="password"
                        required
                        value={docPassword}
                        onChange={(e) => setDocPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Especialidad</label>
                      <select
                        required
                        value={docSpecialtyId}
                        onChange={(e) => setDocSpecialtyId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Seleccionar --</option>
                        {specialties.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Colegiatura</label>
                      <input
                        type="text"
                        required
                        value={docLicense}
                        onChange={(e) => setDocLicense(e.target.value)}
                        placeholder="MED-77120"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Tarifa Consulta ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={docFee}
                        onChange={(e) => setDocFee(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Teléfono (Opcional)</label>
                      <input
                        type="tel"
                        value={docPhone}
                        onChange={(e) => setDocPhone(e.target.value)}
                        placeholder="+1 800 555-0105"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Días y Horarios */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-xs font-semibold text-slate-300 block">Días de Atención:</label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                        const isChecked = docDays.includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setDocDays(docDays.filter((d) => d !== dayNum));
                              } else {
                                setDocDays([...docDays, dayNum].sort());
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isChecked
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            {getDayShortName(dayNum)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hora Inicio</label>
                      <input
                        type="time"
                        value={docStartTime}
                        onChange={(e) => setDocStartTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hora Fin</label>
                      <input
                        type="time"
                        value={docEndTime}
                        onChange={(e) => setDocEndTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={docSubmitting}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg"
                  >
                    {docSubmitting ? 'Registrando...' : 'Dar de Alta al Médico'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA BOTICA INTERNA & STOCK (SOLO ADMIN)                    */}
        {/* ============================================================== */}
        {activeTab === 'pharmacy' && user.role === 'ADMIN' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pill className="h-5 w-5 text-emerald-400" />
                  Botica Interna & Control de Farmacia Clínica
                </h3>
                <p className="text-xs text-slate-400">
                  Catálogo de medicamentos, existencias en tiempo real, alertas de stock mínimo y reposición
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadMedications}
                  disabled={loadingMedications}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Actualizar catálogo"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMedications ? 'animate-spin text-teal-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewMedModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+ Nuevo Medicamento</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Resumen de Botica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 shadow-xl space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Catálogo Total</span>
                  <Package className="h-4 w-4 text-teal-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {medications.length}
                </p>
                <span className="text-[11px] text-slate-400">Medicamentos registrados</span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/20 shadow-xl space-y-1">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Bajo Stock</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                  {medications.filter((m) => m.stock <= m.minStock).length}
                </p>
                <span className="text-[11px] text-amber-300/80">Stock ≤ mínimo requerido</span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/20 shadow-xl space-y-1">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Recaudado Botica</span>
                  <DollarSign className="h-4 w-4" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  S/ {(analytics?.pharmacy?.totalRevenue || 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-emerald-300/80">Recetas cobradas y despachadas</span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-rose-500/20 shadow-xl space-y-1">
                <div className="flex items-center justify-between text-rose-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Por Cobrar en Caja</span>
                  <Clock className="h-4 w-4" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
                  S/ {(analytics?.pharmacy?.pendingRevenue || 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-rose-300/80">Recetas pendientes de despacho</span>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  placeholder="Buscar medicamento por nombre o código (ej. MED-001)..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Categoría:</span>
                  <select
                    value={medCategoryFilter}
                    onChange={(e) => setMedCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TODAS">Todas las Categorías</option>
                    {Array.from(new Set(medications.map((m) => m.category))).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setMedLowStockOnly(!medLowStockOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    medLowStockOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {medLowStockOnly ? '✓ Solo Stock Bajo' : 'Ver Solo Stock Bajo'}
                </button>
              </div>
            </div>

            {/* Tabla de Medicamentos */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Medicamento / Presentación</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-right">Precio Unitario</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Stock Mínimo</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(() => {
                      const filtered = medications.filter((m) => {
                        const matchQuery =
                          !medSearchQuery ||
                          m.name.toLowerCase().includes(medSearchQuery.toLowerCase()) ||
                          m.code.toLowerCase().includes(medSearchQuery.toLowerCase()) ||
                          m.presentation.toLowerCase().includes(medSearchQuery.toLowerCase());
                        const matchCategory =
                          medCategoryFilter === 'TODAS' || m.category === medCategoryFilter;
                        const matchLowStock = !medLowStockOnly || m.stock <= m.minStock;
                        return matchQuery && matchCategory && matchLowStock;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                              No se encontraron medicamentos en botica con los filtros aplicados.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((med) => {
                        const isLowStock = med.stock <= med.minStock;
                        const isWarning = med.stock <= med.minStock * 2 && !isLowStock;

                        return (
                          <tr key={med.id} className="hover:bg-slate-950/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-teal-300">
                              {med.code}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-white block text-sm">{med.name}</span>
                              <span className="text-[11px] text-slate-400">{med.presentation}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {med.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                              S/ {med.price.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold border ${
                                  isLowStock
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                                    : isWarning
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {med.stock} uds.
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">
                              {med.minStock} uds.
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {med.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                                  <Check className="h-3 w-3" /> Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                  <Ban className="h-3 w-3" /> Inactivo
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMedForReplenish(med);
                                  setReplenishQty('20');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700 transition-all"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>+ Reponer Stock</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 4: DIRECTORIO Y BUSCADOR DE PACIENTES                 */}
        {/* ============================================================== */}
        {activeTab === 'patients' && (user.role === 'ADMIN' || user.role === 'DOCTOR' || user.role === 'RECEPTIONIST' || user.role === 'NURSE') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-400" />
                  Directorio y Expediente de Pacientes
                </h3>
                <p className="text-xs text-slate-400">
                  Búsqueda en tiempo real, acceso al historial clínico y agendamiento asistido
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, correo o teléfono..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            {loadingPatients ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Buscando pacientes en la base de datos...</p>
              </div>
            ) : patientsList.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <Users className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No se encontraron pacientes con ese criterio de búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patientsList.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 font-bold flex items-center justify-center">
                          {p.fullName[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{p.fullName}</h4>
                          <p className="text-[11px] text-slate-400">{p.email}</p>
                          {p.phone && <p className="text-[11px] text-slate-500">Tel: {p.phone}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Citas Totales:</span>
                        <strong className="text-white font-mono">{p.totalAppointments}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Fichas Médicas:</span>
                        <strong className="text-teal-400 font-mono">{p.totalRecords}</strong>
                      </div>
                    </div>

                    {p.lastAppointment ? (
                      <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                        <span className="text-slate-500 block font-semibold text-[10px] uppercase">Última Consulta:</span>
                        <p className="text-slate-200">
                          {new Date(p.lastAppointment.date).toLocaleDateString('es-ES')} • {p.lastAppointment.doctorName} ({p.lastAppointment.specialty})
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/30 rounded-lg">
                        Sin consultas médicas previas
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={async () => {
                          setLoadingPatientHistoryModal(true);
                          try {
                            const hist = await api.getPatientHistory(p.id);
                            setSelectedPatientHistoryModal(hist);
                          } catch (err: any) {
                            toast.error(err.message || 'Error al obtener historial');
                          } finally {
                            setLoadingPatientHistoryModal(false);
                          }
                        }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-teal-400" />
                        <span>Ver Expediente</span>
                      </button>

                      <button
                        onClick={() => {
                          setBookForPatientModal(p);
                          setAdminBookDoctorId(doctors.length > 0 ? doctors[0].id : '');
                          setAdminBookDate(todayStr);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Agendar Cita</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 5: GESTIÓN DE DÍAS NO LABORABLES                      */}
        {/* ============================================================== */}
        {activeTab === 'blocked_dates' && (user.role === 'DOCTOR' || user.role === 'ADMIN') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CalendarOff className="h-5 w-5 text-amber-400" />
                  Gestión de Días No Laborables & Feriados
                </h3>
                <p className="text-xs text-slate-400">
                  Bloquea fechas de vacaciones, congresos o descanso para suspender reservas en ese día
                </p>
              </div>

              {user.role === 'ADMIN' && doctors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Médico:</span>
                  <select
                    value={selectedDocForBlock}
                    onChange={(e) => setSelectedDocForBlock(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.specialty.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Formulario para Bloquear Fecha */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Registrar Día No Laborable
                  </h4>

                  {blockError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {blockError}
                    </div>
                  )}

                  {blockSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                      {blockSuccess}
                    </div>
                  )}

                  <form onSubmit={handleBlockDoctorDate} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Fecha a Bloquear *</label>
                      <input
                        type="date"
                        required
                        min={todayStr}
                        value={newBlockDate}
                        onChange={(e) => setNewBlockDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">Motivo (Opcional)</label>
                      <input
                        type="text"
                        value={newBlockReason}
                        onChange={(e) => setNewBlockReason(e.target.value)}
                        placeholder="Ej: Vacaciones anuales, Congreso Médico..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={blockSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg"
                    >
                      {blockSubmitting ? 'Bloqueando fecha...' : 'Confirmar Bloqueo de Fecha'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Lista de Fechas Bloqueadas */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="font-bold text-white text-sm">Fechas Bloqueadas Activas</h4>
                    <span className="text-xs font-mono text-slate-400">
                      {blockedDatesList.length} días bloqueados
                    </span>
                  </div>

                  {loadingBlockedDates ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-400 mb-2" />
                      <p className="text-xs">Consultando bloqueos...</p>
                    </div>
                  ) : blockedDatesList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 italic text-xs">
                      No hay fechas bloqueadas para este médico. Se atenderá normalmente según sus turnos semanales.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blockedDatesList.map((b) => (
                        <div
                          key={b.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-bold text-amber-300">
                              {b.date}
                            </span>
                            <p className="text-xs text-slate-300">
                              {b.reason || 'Sin motivo especificado (Día no laborable)'}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              Registrado el {new Date(b.createdAt).toLocaleDateString('es-ES')}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteBlockedDate(b.id)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                            title="Eliminar Bloqueo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: LABORATORIO CLÍNICO & IMÁGENES DIAGNÓSTICAS           */}
        {/* ============================================================== */}
        {activeTab === 'lab_orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-cyan-400" />
                  Laboratorio Clínico & Diagnóstico por Imágenes
                </h3>
                <p className="text-xs text-slate-400">
                  Gestión integral de órdenes médicas, estado de procesamiento, cobranza y entrega de informes
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300">
                  {labOrders.length} órdenes registradas
                </span>
                <button
                  onClick={loadLabOrders}
                  disabled={loadingLabOrders}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-all"
                  title="Refrescar órdenes"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingLabOrders ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Barra de Filtros y Buscador */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={labSearchQuery}
                  onChange={(e) => setLabSearchQuery(e.target.value)}
                  placeholder="Buscar por paciente, examen o código..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
                {(['TODOS', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setLabStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      labStatusFilter === st
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {st === 'TODOS'
                      ? 'Todos'
                      : st === 'PENDING'
                      ? 'Pendientes'
                      : st === 'IN_PROGRESS'
                      ? 'En Proceso'
                      : 'Completados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Órdenes */}
            {loadingLabOrders ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : labOrders.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <FlaskConical className="h-12 w-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No se encontraron órdenes de laboratorio o imágenes.</p>
                <p className="text-xs text-slate-500">
                  Las órdenes se generan automáticamente cuando el médico las solicita en su consulta médica.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labOrders.map((order) => {
                  const orderDate = new Date(order.createdAt);
                  return (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                              {order.catalogItem?.code || 'LAB'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {order.catalogItem?.category || 'General'}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-base">
                            {order.catalogItem?.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Paciente: <strong className="text-slate-200">{order.patient.fullName}</strong>
                          </p>
                          <p className="text-xs text-slate-500">
                            Médico: {order.doctor.user?.fullName} ({order.doctor.specialty?.name})
                          </p>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <span className="text-sm font-mono font-black text-emerald-400 block">
                            S/ {(order.price || 0).toFixed(2)}
                          </span>
                          {order.paid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Check className="h-3 w-3" /> PAGADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock className="h-3 w-3" /> PENDIENTE PAGO
                            </span>
                          )}
                        </div>
                      </div>

                      {order.notes && (
                        <div className="text-xs text-slate-400 italic bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                          Indicaciones médicas: &quot;{order.notes}&quot;
                        </div>
                      )}

                      {/* Estado del Examen */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Estado de toma/informe:</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                              order.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : order.status === 'IN_PROGRESS'
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                order.status === 'COMPLETED'
                                  ? 'bg-emerald-400'
                                  : order.status === 'IN_PROGRESS'
                                  ? 'bg-cyan-400 animate-ping'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {order.status === 'COMPLETED'
                              ? 'Completado'
                              : order.status === 'IN_PROGRESS'
                              ? 'En Proceso'
                              : 'Pendiente'}
                          </span>
                        </div>

                        {order.completedAt && (
                          <span className="text-[10px] text-slate-500">
                            Listo: {new Date(order.completedAt).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>

                      {/* Resumen del Resultado si está completado */}
                      {order.resultSummary && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                            Resultado / Conclusión Diagnóstica:
                          </span>
                          <p className="text-xs text-slate-200 line-clamp-2">
                            {order.resultSummary}
                          </p>
                        </div>
                      )}

                      {/* Botones de Acción */}
                      <div className="pt-2 flex items-center justify-end gap-2 flex-wrap border-t border-slate-800/60">
                        {/* Botón Cobrar en Caja */}
                        {(user.role === 'ADMIN' || user.role === 'RECEPTIONIST') && !order.paid && (
                          <button
                            type="button"
                            onClick={() => handlePayLabOrder(order.id)}
                            disabled={actionLoading === order.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1 transition-all"
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Cobrar en Caja (S/ {(order.price || 0).toFixed(2)})</span>
                          </button>
                        )}

                        {/* Botón Registrar Resultado (Doctor o Admin) */}
                        {(user.role === 'DOCTOR' || user.role === 'ADMIN') && order.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForResult(order);
                              setResultSummaryText(order.resultSummary || '');
                              setResultFileBase64(order.resultFileBase64 || '');
                              setResultFileName(order.resultFileName || '');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md flex items-center gap-1 transition-all"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                            <span>Registrar Resultado / Informe</span>
                          </button>
                        )}

                        {/* Botón Ver Resultado Completo */}
                        {order.status === 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setViewResultModal(order)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Ver Informe & Adjunto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: TÓPICO DE URGENCIAS & CAMILLAS DE OBSERVACIÓN         */}
        {/* ============================================================== */}
        {activeTab === 'observation_beds' && (user.role === 'ADMIN' || user.role === 'DOCTOR' || user.role === 'RECEPTIONIST' || user.role === 'NURSE') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-indigo-400" />
                  Tópico de Urgencias & Camillas de Observación
                </h3>
                <p className="text-xs text-slate-400">
                  Panel en vivo de boxes de atención ambulatoria, nebulizaciones, hidratación parenteral y procedimientos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadBeds}
                  disabled={loadingBeds}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-400 transition-all"
                  title="Refrescar estado de camillas"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingBeds ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* KPI Cards de Estado de Camillas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">Disponibles</span>
                  <span className="text-2xl font-black text-emerald-200 font-mono">
                    {bedsList.filter((b) => b.status === 'AVAILABLE').length} de {bedsList.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider block">Ocupadas (En Tópico)</span>
                  <span className="text-2xl font-black text-amber-200 font-mono">
                    {bedsList.filter((b) => b.status === 'OCCUPIED').length} de {bedsList.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Activity className="h-6 w-6" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider block">En Desinfección</span>
                  <span className="text-2xl font-black text-cyan-200 font-mono">
                    {bedsList.filter((b) => b.status === 'CLEANING').length} de {bedsList.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Grid Visual de 6 Camillas */}
            {loadingBeds ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bedsList.map((bed) => {
                  const isAvailable = bed.status === 'AVAILABLE';
                  const isOccupied = bed.status === 'OCCUPIED';
                  const isCleaning = bed.status === 'CLEANING';

                  // Cálculo de tiempo transcurrido
                  let elapsedStr = 'Reciente';
                  if (bed.admittedAt) {
                    const diffMs = Date.now() - new Date(bed.admittedAt).getTime();
                    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
                    if (diffMins < 60) {
                      elapsedStr = `${diffMins} min`;
                    } else {
                      const h = Math.floor(diffMins / 60);
                      const m = diffMins % 60;
                      elapsedStr = `${h}h ${m}m`;
                    }
                  }

                  return (
                    <div
                      key={bed.id}
                      className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                        isAvailable
                          ? 'bg-slate-900/70 border-slate-800 hover:border-emerald-500/40'
                          : isOccupied
                          ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-950/20'
                          : 'bg-slate-900/70 border-cyan-500/30'
                      }`}
                    >
                      {/* Cabecera de la Camilla */}
                      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              isAvailable
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isOccupied
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            }`}
                          >
                            <BedDouble className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-mono text-xs font-extrabold text-slate-300 block">
                              {bed.code}
                            </span>
                            <h4 className="font-bold text-white text-sm">{bed.name}</h4>
                          </div>
                        </div>

                        {/* Badge de Estado con Pulso */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isOccupied
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isAvailable
                                ? 'bg-emerald-400'
                                : isOccupied
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-cyan-400'
                            }`}
                          />
                          {isAvailable ? 'Disponible' : isOccupied ? 'Ocupado' : 'Limpieza'}
                        </span>
                      </div>

                      {/* Cuerpo de la Camilla */}
                      <div className="space-y-3 flex-1">
                        {isAvailable && (
                          <div className="py-6 text-center space-y-2">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500/40 mx-auto" />
                            <p className="text-xs text-slate-400">
                              Camilla libre, desinfectada y lista para recepción de paciente.
                            </p>
                          </div>
                        )}

                        {isOccupied && (
                          <div className="space-y-2.5 text-xs">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                Paciente en Observación:
                              </span>
                              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                                <User className="h-4 w-4 text-amber-400" />
                                {bed.currentPatientName || 'Paciente Anónimo'}
                              </p>
                              {bed.reason && (
                                <p className="text-slate-300 pt-1">
                                  <strong>Motivo:</strong> {bed.reason}
                                </p>
                              )}
                              {bed.procedure && (
                                <p className="text-amber-300/90 font-mono text-[11px]">
                                  <strong>Tratamiento:</strong> {bed.procedure}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                              <span className="flex items-center gap-1 font-mono text-amber-300">
                                <Timer className="h-3.5 w-3.5" />
                                Transcurrido: {elapsedStr}
                              </span>
                              <span className="font-mono font-bold text-emerald-400">
                                Tarifa: S/ {(bed.fee || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {isCleaning && (
                          <div className="py-6 text-center space-y-2">
                            <Sparkles className="h-10 w-10 text-cyan-500/40 mx-auto animate-pulse" />
                            <p className="text-xs text-slate-400">
                              Protocolo de recambio de sábanas y desinfección hospitalaria en curso.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Botones de Acción de Camilla */}
                      <div className="pt-3 border-t border-slate-800">
                        {isAvailable && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBedForAdmit(bed);
                                setAdmitPatientName('');
                                setAdmitReason('');
                                setAdmitProcedure('Nebulización continua y monitorización');
                                setAdmitFee('45.00');
                              }}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center gap-1.5 transition-all"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>Ingresar Paciente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateBedStatus(bed.id, 'CLEANING')}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                              title="Poner en limpieza"
                            >
                              <Sparkles className="h-4 w-4 text-cyan-400" />
                            </button>
                          </div>
                        )}

                        {isOccupied && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBedForDischarge(bed);
                              setDischargePaid(bed.paid || true);
                              setDischargeNextStatus('AVAILABLE');
                            }}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md flex items-center justify-center gap-1.5 transition-all"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Dar de Alta & Liquidar</span>
                          </button>
                        )}

                        {isCleaning && (
                          <button
                            type="button"
                            onClick={() => handleUpdateBedStatus(bed.id, 'AVAILABLE')}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Habilitar Camilla (Disponible)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: CAJA UNIFICADA Y ARQUEO DIARIO (BLOQUE B)             */}
        {/* ============================================================== */}
        {activeTab === 'billing' && (user.role === 'ADMIN' || user.role === 'RECEPTIONIST') && (
          <div className="space-y-8">
            {/* Cabecera de Caja */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                  Caja Central & Liquidación Unificada
                </h3>
                <p className="text-xs text-slate-400">
                  Arqueo de ingresos en tiempo real, liquidación hospitalaria integral (Consultas, Botica, Laboratorio y Tópico) y emisión de boletas oficiales.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/sala-espera"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Tv className="h-4 w-4 text-cyan-400" />
                  <span>Pantalla Sala de Espera TV</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    loadDailyClose();
                    if (selectedPatientForBilling) loadPatientPendingBilling(selectedPatientForBilling);
                  }}
                  disabled={loadingDailyClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${loadingDailyClose ? 'animate-spin' : ''}`} />
                  <span>Actualizar Arqueo</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 1: ARQUEO DE CAJA DEL DÍA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Arqueo de Ingresos del Día ({dailyClose?.date || new Date().toISOString().split('T')[0]})
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {dailyClose?.receiptsCount || 0} comprobantes emitidos
                </span>
              </div>

              {/* 5 KPIs de Arqueo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {/* Gran Total */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 space-y-1 shadow-lg shadow-emerald-950/20 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold uppercase text-emerald-400 block tracking-wider">
                    Total Recaudado Hoy
                  </span>
                  <p className="text-2xl font-black text-white font-mono">
                    S/ {(dailyClose?.grandTotal || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Cierre consolidado en vivo</span>
                </div>

                {/* Consultas */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5 text-teal-400" /> Consultas
                  </span>
                  <p className="text-xl font-bold text-teal-300 font-mono">
                    S/ {(dailyClose?.byArea.consultations || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 block">Atenciones médicas</span>
                </div>

                {/* Botica */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Pill className="h-3.5 w-3.5 text-emerald-400" /> Botica Interna
                  </span>
                  <p className="text-xl font-bold text-emerald-300 font-mono">
                    S/ {(dailyClose?.byArea.pharmacy || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 block">Fármacos dispensados</span>
                </div>

                {/* Laboratorio */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <FlaskConical className="h-3.5 w-3.5 text-cyan-400" /> Laboratorio
                  </span>
                  <p className="text-xl font-bold text-cyan-300 font-mono">
                    S/ {(dailyClose?.byArea.lab || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 block">Análisis e imágenes</span>
                </div>

                {/* Tópico */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5 text-indigo-400" /> Tópico & Camillas
                  </span>
                  <p className="text-xl font-bold text-indigo-300 font-mono">
                    S/ {(dailyClose?.byArea.topic || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 block">Urgencias y estancia</span>
                </div>
              </div>

              {/* Desglose por Método de Pago */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                  Por Método de Pago:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono font-semibold">
                    💵 Efectivo: <strong className="text-white">S/ {(dailyClose?.byPaymentMethod.EFECTIVO || 0).toFixed(2)}</strong>
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 font-mono font-semibold">
                    📱 Yape / Plin: <strong className="text-white">S/ {(dailyClose?.byPaymentMethod.YAPE_PLIN || 0).toFixed(2)}</strong>
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 font-mono font-semibold">
                    💳 Tarjeta: <strong className="text-white">S/ {(dailyClose?.byPaymentMethod.TARJETA || 0).toFixed(2)}</strong>
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-teal-950/40 border border-teal-800/40 text-teal-300 font-mono font-semibold">
                    🏦 Transferencia: <strong className="text-white">S/ {(dailyClose?.byPaymentMethod.TRANSFERENCIA || 0).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: LIQUIDACIÓN UNIFICADA DE CARGOS POR PACIENTE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Columna Izquierda (5 cols): Buscador y Selección de Paciente */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-400" />
                      1. Seleccionar Paciente
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {patientsList.length} registrados
                    </span>
                  </div>

                  {/* Input de Búsqueda Rápida */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, DNI o email..."
                      value={patientSearchQuery}
                      onChange={(e) => {
                        setPatientSearchQuery(e.target.value);
                        loadPatients(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Lista de Selección de Pacientes */}
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                    {loadingPatients ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-teal-400" />
                        Buscando pacientes...
                      </div>
                    ) : patientsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No se encontraron pacientes con ese criterio.
                      </div>
                    ) : (
                      patientsList.map((p) => {
                        const isSelected = selectedPatientForBilling === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatientForBilling(p.id);
                              loadPatientPendingBilling(p.id);
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="space-y-0.5 truncate">
                              <span className="font-bold text-xs block text-white truncate">{p.fullName}</span>
                              <span className="text-[11px] text-slate-400 block truncate">{p.email}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                              {isSelected ? 'Seleccionado ✓' : 'Elegir'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha (7 cols): Estado de Cuenta Consolidado y Liquidación */}
              <div className="lg:col-span-7 space-y-4">
                {selectedPatientForBilling && patientPendingBilling ? (
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
                    {/* Encabezado del Paciente */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                          Estado de Cuenta Consolidado
                        </span>
                        <h4 className="text-lg font-extrabold text-white">
                          {patientPendingBilling.patient.fullName}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {patientPendingBilling.patient.email} {patientPendingBilling.patient.phone ? `• Tel: ${patientPendingBilling.patient.phone}` : ''}
                        </p>
                      </div>

                      <div className="text-right sm:text-right bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Total Pendiente:
                        </span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">
                          S/ {patientPendingBilling.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Desglose de Ítems Pendientes */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Conceptos Pendientes de Pago ({patientPendingBilling.itemsCount})
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {patientPendingBilling.counts.appointments} consultas • {patientPendingBilling.counts.prescriptions} recetas • {patientPendingBilling.counts.labOrders} lab • {patientPendingBilling.counts.beds} tópico
                        </span>
                      </div>

                      {patientPendingBilling.items.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 space-y-2">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                          <p className="text-sm font-bold text-white">¡Cuenta al día!</p>
                          <p className="text-xs text-slate-400">Este paciente no tiene cargos pendientes por liquidar.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                          {patientPendingBilling.items.map((item, idx) => (
                            <div
                              key={item.id + idx}
                              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      item.type === 'CONSULTATION'
                                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                                        : item.type === 'PHARMACY'
                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                        : item.type === 'LAB_ORDER'
                                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                        : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                    }`}
                                  >
                                    {item.categoryName}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-200">{item.description}</p>
                              </div>
                              <span className="font-mono font-extrabold text-sm text-white shrink-0">
                                S/ {item.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Subtotales y Selección de Medio de Pago */}
                    {patientPendingBilling.items.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Consultas:</span>
                            <span className="font-mono font-bold text-slate-300">
                              S/ {patientPendingBilling.subtotals.consultations.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Botica:</span>
                            <span className="font-mono font-bold text-slate-300">
                              S/ {patientPendingBilling.subtotals.pharmacy.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Laboratorio:</span>
                            <span className="font-mono font-bold text-slate-300">
                              S/ {patientPendingBilling.subtotals.lab.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Tópico:</span>
                            <span className="font-mono font-bold text-slate-300">
                              S/ {patientPendingBilling.subtotals.topic.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Selector de Método de Pago */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-300 block">
                            Seleccionar Método de Pago:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['EFECTIVO', 'YAPE_PLIN', 'TARJETA', 'TRANSFERENCIA'] as const).map((m) => {
                              const isSelected = settlePaymentMethod === m;
                              const label = m === 'EFECTIVO' ? 'Efectivo' : m === 'YAPE_PLIN' ? 'Yape / Plin' : m === 'TARJETA' ? 'Tarjeta' : 'Transferencia';
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setSettlePaymentMethod(m)}
                                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Botón de Cobro y Liquidación */}
                        <button
                          type="button"
                          onClick={handleSettleBilling}
                          disabled={settlingBilling || patientPendingBilling.grandTotal <= 0}
                          className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-all"
                        >
                          {settlingBilling ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Procesando Liquidación de Caja...</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4" />
                              <span>Liquidar Cuenta Total: S/ {patientPendingBilling.grandTotal.toFixed(2)}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                    <Receipt className="h-12 w-12 text-slate-700 mx-auto" />
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h4 className="font-bold text-slate-300 text-base">Seleccione un Paciente</h4>
                      <p className="text-xs text-slate-400">
                        Elija un paciente en la columna izquierda para inspeccionar sus consultas, recetas, exámenes y estadías pendientes de pago.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: BOLETAS EMITIDAS DEL DÍA */}
            {dailyClose && dailyClose.receipts && dailyClose.receipts.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-400" />
                    Boletas Hospitalarias Emitidas Hoy ({dailyClose.receipts.length})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Historial del día en curso
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dailyClose.receipts.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {r.receiptNumber}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(r.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div>
                        <p className="font-bold text-white text-xs truncate">{r.patientName}</p>
                        <p className="text-[11px] text-slate-400">
                          Método: <strong className="text-slate-300">{r.paymentMethod}</strong> • Cajero: {r.cashierName || 'Caja Central'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <span className="font-mono font-extrabold text-white text-sm">
                          S/ {r.totalAmount.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIssuedReceipt({
                              id: r.id,
                              receiptNumber: r.receiptNumber,
                              date: r.createdAt,
                              patient: { id: '', fullName: r.patientName, email: '' },
                              cashier: r.cashierName || 'Caja Central',
                              paymentMethod: r.paymentMethod,
                              items: [
                                ...(r.consultationTotal > 0 ? [{ type: 'CONSULTATION', id: '1', description: 'Consultas Médicas', amount: r.consultationTotal }] : []),
                                ...(r.pharmacyTotal > 0 ? [{ type: 'PHARMACY', id: '2', description: 'Botica Interna y Fármacos', amount: r.pharmacyTotal }] : []),
                                ...(r.labTotal > 0 ? [{ type: 'LAB_ORDER', id: '3', description: 'Exámenes de Laboratorio', amount: r.labTotal }] : []),
                                ...(r.topicTotal > 0 ? [{ type: 'TOPIC_BED', id: '4', description: 'Tópico y Procedimientos', amount: r.topicTotal }] : []),
                              ],
                              subtotals: {
                                consultations: r.consultationTotal,
                                pharmacy: r.pharmacyTotal,
                                lab: r.labTotal,
                                topic: r.topicTotal,
                              },
                              grandTotal: r.totalAmount,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Printer className="h-3 w-3 text-emerald-400" />
                          <span>Ver / Imprimir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 6: MI PERFIL Y SEGURIDAD                               */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-teal-400" />
                Mi Perfil y Configuración de Seguridad
              </h3>
              <p className="text-xs text-slate-400">
                Actualiza tus datos de contacto y contraseña de acceso al sistema
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Formulario 1: Datos Personales */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Datos Personales</h4>
                    <p className="text-xs text-slate-400">Información básica y teléfono de contacto</p>
                  </div>
                </div>

                {profileError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {profileSuccess}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Correo Electrónico</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-500">Tu correo electrónico es el identificador de acceso único.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Rol del Usuario</label>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {user.role}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Teléfono / Celular</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+51 987 654 321"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-lg"
                  >
                    {profileSubmitting ? 'Guardando...' : 'Guardar Cambios de Perfil'}
                  </button>
                </form>
              </div>

              {/* Formulario 2: Seguridad y Contraseña */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Seguridad & Contraseña</h4>
                    <p className="text-xs text-slate-400">Actualiza tu clave de acceso</p>
                  </div>
                </div>

                {passError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {passError}
                  </div>
                )}

                {passSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {passSuccess}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Contraseña Actual *</label>
                    <input
                      type="password"
                      required
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Nueva Contraseña *</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Confirmar Nueva Contraseña *</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg"
                  >
                    {passSubmitting ? 'Actualizando contraseña...' : 'Actualizar Contraseña'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: REGISTRO DE TRIAJE / SIGNOS VITALES                   */}
      {/* ============================================================== */}
      {selectedAppForTriage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Triaje & Signos Vitales</h3>
                  <p className="text-xs text-slate-400">
                    Paciente: <strong className="text-teal-300">{selectedAppForTriage.patient.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForTriage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {triageError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {triageError}
              </div>
            )}

            <form onSubmit={handleSaveTriage} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Presión Arterial (PA)</label>
                  <input
                    type="text"
                    required
                    value={triageBP}
                    onChange={(e) => setTriageBP(e.target.value)}
                    placeholder="120/80"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Frecuencia Cardíaca (lpm)</label>
                  <input
                    type="number"
                    required
                    value={triageHR}
                    onChange={(e) => setTriageHR(e.target.value)}
                    placeholder="75"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={triageTemp}
                    onChange={(e) => setTriageTemp(e.target.value)}
                    placeholder="36.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Saturación O2 (%)</label>
                  <input
                    type="number"
                    required
                    value={triageO2}
                    onChange={(e) => setTriageO2(e.target.value)}
                    placeholder="98"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Peso, Talla e IMC Automático */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={triageWeight}
                    onChange={(e) => setTriageWeight(e.target.value)}
                    placeholder="70"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Talla (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={triageHeight}
                    onChange={(e) => setTriageHeight(e.target.value)}
                    placeholder="170"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Indicador de IMC Calculado en Tiempo Real */}
              {currentBMI && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Índice de Masa Corporal (IMC):</span>
                  <div className="font-mono font-bold flex items-center gap-2">
                    <span className="text-white text-sm">{currentBMI.value}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] ${currentBMI.color} bg-slate-900 border border-slate-800`}>
                      {currentBMI.category}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Alergias Conocidas</label>
                <input
                  type="text"
                  value={triageAllergies}
                  onChange={(e) => setTriageAllergies(e.target.value)}
                  placeholder="Ej: Penicilina, AINEs, Polen, Ninguna..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Notas de Triaje</label>
                <textarea
                  rows={2}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Observaciones de enfermería o ingreso..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAppForTriage(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={triageSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg"
                >
                  {triageSubmitting ? 'Guardando...' : 'Guardar Signos Vitales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REGISTRO DE COBRO / PAGO (ADMIN)                      */}
      {/* ============================================================== */}
      {selectedAppForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Registrar Cobro de Cita</h3>
                  <p className="text-xs text-slate-400">
                    Paciente: <strong className="text-white">{selectedAppForPayment.patient.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForPayment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {payError}
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Médico:</span>
                  <span className="text-white font-medium">{selectedAppForPayment.doctor.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Especialidad:</span>
                  <span className="text-teal-400">{selectedAppForPayment.doctor.specialty}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Método de Pago</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASH">Efectivo (CASH)</option>
                  <option value="CARD">Tarjeta de Débito / Crédito (CARD)</option>
                  <option value="TRANSFER">Transferencia Bancaria (TRANSFER)</option>
                  <option value="INSURANCE">Seguro Médico / Póliza (INSURANCE)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Monto a Cobrar ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-lg font-bold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAppForPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                >
                  {paySubmitting ? 'Procesando...' : 'Confirmar Pago & Emitir Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ATENCIÓN MÉDICA CON EXPEDIENTE HISTÓRICO (DOCTOR)     */}
      {/* ============================================================== */}
      {selectedAppForRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Atención Médica Integral & Consulta</h3>
                  <p className="text-xs text-slate-400">
                    Paciente: <strong className="text-teal-300">{selectedAppForRecord.patient.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PANEL DIVIDIDO: TRIAJE ACTUAL + EXPEDIENTE PREVIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lado Izquierdo: Signos de Triaje de esta cita */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> Signos Vitales del Triaje
                </h4>
                {selectedAppForRecord.triage ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">PA:</span> <strong className="text-white">{selectedAppForRecord.triage.bloodPressure}</strong></div>
                    <div><span className="text-slate-500">FC:</span> <strong className="text-white">{selectedAppForRecord.triage.heartRate} lpm</strong></div>
                    <div><span className="text-slate-500">Temp:</span> <strong className="text-white">{selectedAppForRecord.triage.temperature} °C</strong></div>
                    <div><span className="text-slate-500">SatO2:</span> <strong className="text-white">{selectedAppForRecord.triage.oxygenSaturation}%</strong></div>
                    <div><span className="text-slate-500">Peso:</span> <strong className="text-white">{selectedAppForRecord.triage.weightKg} kg</strong></div>
                    <div><span className="text-slate-500">Talla:</span> <strong className="text-white">{selectedAppForRecord.triage.heightCm} cm</strong></div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400/90 italic">No se registró triaje previo para esta cita.</p>
                )}
              </div>

              {/* Lado Derecho: Alergias y Antecedentes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Antecedentes & Alergias
                </h4>
                {loadingHistory ? (
                  <p className="text-xs text-slate-500">Cargando expediente previo...</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {patientHistory?.allergies && patientHistory.allergies.length > 0 ? (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold">
                        ⚠️ Alergias: {patientHistory.allergies.join(', ')}
                      </div>
                    ) : (
                      <p className="text-slate-400">Sin alergias críticas registradas.</p>
                    )}
                    <p className="text-slate-400 text-[11px]">
                      Consultas previas completadas: <strong className="text-white">{patientHistory?.medicalRecordsCount || 0}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Formulario de Diagnóstico y Receta */}
            <form onSubmit={handleSaveMedicalRecord} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  1. Diagnóstico Clínico *
                </label>
                <textarea
                  rows={2}
                  required
                  value={recordDiagnosis}
                  onChange={(e) => setRecordDiagnosis(e.target.value)}
                  placeholder="Diagnóstico y observaciones patológicas..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  2. Receta Médica & Tratamiento Farmacológico (Rx) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={recordPrescription}
                  onChange={(e) => setRecordPrescription(e.target.value)}
                  placeholder="1. Medicamento dosis y frecuencia&#10;2. Indicaciones terapéuticas..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-teal-500 leading-relaxed"
                />
              </div>

              {/* 2.1 Selector Interactivo de Medicamentos de Botica Interna */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Pill className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Botica Interna • Dispensación Farmacéutica
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Selecciona medicamentos con stock en vivo para liquidación en caja
                      </p>
                    </div>
                  </div>
                  {prescribedMedItems.length > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Total Botica: S/ {prescribedMedItems.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Formulario rápido para agregar medicamento */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Medicamento (Stock / Precio)
                    </label>
                    <select
                      value={selectedMedIdToAdd}
                      onChange={(e) => setSelectedMedIdToAdd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {doctorMedList.length === 0 ? (
                        <option value="">Cargando medicamentos...</option>
                      ) : (
                        doctorMedList.map((m) => (
                          <option key={m.id} value={m.id} disabled={m.stock <= 0}>
                            {m.name} ({m.presentation}) — S/ {m.price.toFixed(2)} [Stock: {m.stock}]
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={medAddQuantity}
                      onChange={(e) => setMedAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Dosis / Posología
                    </label>
                    <input
                      type="text"
                      value={medAddDosage}
                      onChange={(e) => setMedAddDosage(e.target.value)}
                      placeholder="1 tab c/8h x 5 días"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddMedToPrescription}
                      className="w-full py-2 px-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>+ Agregar</span>
                    </button>
                  </div>
                </div>

                {/* Tabla de Medicamentos Agregados a la Receta */}
                {prescribedMedItems.length > 0 && (
                  <div className="mt-3 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Código</th>
                          <th className="py-2 px-3">Medicamento</th>
                          <th className="py-2 px-3">Posología</th>
                          <th className="py-2 px-3 text-center">Cant.</th>
                          <th className="py-2 px-3 text-right">P. Unit</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                          <th className="py-2 px-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {prescribedMedItems.map((item) => (
                          <tr key={item.medicationId} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.code}</td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-white block">{item.name}</span>
                              <span className="text-[10px] text-slate-400">{item.presentation}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">{item.dosage}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-teal-300">{item.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">S/ {item.price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                              S/ {item.subtotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveMedFromPrescription(item.medicationId)}
                                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                title="Quitar medicamento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-900/60 border-t border-slate-800">
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-right font-bold text-slate-300">
                            Total Botica:
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-400">
                            S/ {prescribedMedItems.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* 2.2 Selector de Órdenes de Laboratorio e Imágenes Diagnósticas */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Órdenes de Laboratorio & Diagnóstico por Imágenes
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Selecciona los análisis o estudios requeridos para el paciente
                      </p>
                    </div>
                  </div>
                  {selectedLabItemIds.length > 0 && (
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                      {selectedLabItemIds.length} examen(es) seleccionados
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {doctorLabCatalog.map((item) => {
                    const isSelected = selectedLabItemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedLabItemIds((prev) =>
                            isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400 px-1 py-0.2 rounded bg-slate-800">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-cyan-400 font-semibold">{item.category}</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate mt-0.5">{item.name}</p>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            S/ {item.price.toFixed(2)}
                          </span>
                        </div>
                        <div className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-cyan-600 border-cyan-500 text-white' : 'border-slate-700 bg-slate-950'
                        }`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2.3 Certificado Oficial de Descanso Médico */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Certificado Oficial de Descanso Médico
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Opcional: prescribe descanso e incapacidad temporal foliado
                      </p>
                    </div>
                  </div>
                  {recordRestDays > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {recordRestDays} días de descanso
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Días de Reposo Físico
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={recordRestDays}
                      onChange={(e) => setRecordRestDays(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0 (sin descanso)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={recordRestStartDate}
                      onChange={(e) => setRecordRestStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Código Diagnóstico CIE-10
                    </label>
                    <input
                      type="text"
                      value={recordCie10Code}
                      onChange={(e) => setRecordCie10Code(e.target.value.toUpperCase())}
                      placeholder="Ej. J00, K29.0, M54.5"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>
                </div>

                {recordRestDays > 0 && (
                  <p className="text-[11px] text-emerald-400/90 italic bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                    ✓ Se generará un certificado médico oficial foliado válido para presentación laboral o educativa.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  3. Indicaciones / Notas de Evolución
                </label>
                <input
                  type="text"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Reposo, controles futuros..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAppForRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recordSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg"
                >
                  {recordSubmitting ? 'Guardando consulta...' : 'Guardar Consulta y Completar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: EXPEDIENTE HISTÓRICO COMPLETO DEL PACIENTE            */}
      {/* ============================================================== */}
      {selectedPatientHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Encabezado */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-teal-400">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">
                      Expediente Clínico: {selectedPatientHistoryModal.patient.fullName}
                    </h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      Historial Médico
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                    <span>{selectedPatientHistoryModal.patient.email}</span>
                    {selectedPatientHistoryModal.patient.phone && (
                      <span>• Tel: {selectedPatientHistoryModal.patient.phone}</span>
                    )}
                    <span>• Registrado: {new Date(selectedPatientHistoryModal.patient.createdAt).toLocaleDateString('es-ES')}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientHistoryModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumen & Alertas Críticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Alergias Críticas */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Alergias y Advertencias
                </span>
                {selectedPatientHistoryModal.allergies && selectedPatientHistoryModal.allergies.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    {selectedPatientHistoryModal.allergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="inline-block mr-1.5 mb-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300"
                      >
                        ⚠️ {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pt-1">Sin alergias conocidas registradas.</p>
                )}
              </div>

              {/* Resumen de Consultas */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4" /> Consultas Realizadas
                </span>
                <p className="text-2xl font-extrabold text-white font-mono">
                  {selectedPatientHistoryModal.medicalRecordsCount}
                </p>
                <p className="text-[11px] text-slate-400">
                  Citas totales: {selectedPatientHistoryModal.appointmentsSummary?.total || 0} ({selectedPatientHistoryModal.appointmentsSummary?.completed || 0} completadas)
                </p>
              </div>

              {/* Registros de Triaje */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> Triajes y Signos Vitales
                </span>
                <p className="text-2xl font-extrabold text-white font-mono">
                  {selectedPatientHistoryModal.triagesCount}
                </p>
                <p className="text-[11px] text-slate-400">
                  Evaluaciones físicas registradas en plataforma
                </p>
              </div>
            </div>

            {/* Historial de Signos Vitales (Triajes) */}
            {selectedPatientHistoryModal.triages && selectedPatientHistoryModal.triages.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-teal-400" /> Línea de Tiempo de Signos Vitales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPatientHistoryModal.triages.map((tr) => {
                    const bmi = tr.heightCm > 0 ? (tr.weightKg / Math.pow(tr.heightCm / 100, 2)).toFixed(1) : null;
                    return (
                      <div key={tr.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px]">
                          <span className="font-mono text-teal-400 font-semibold">
                            {new Date(tr.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {bmi && (
                            <span className="text-slate-400">
                              IMC: <strong className="text-white">{bmi}</strong>
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <div><span className="text-slate-500">PA:</span> <span className="font-bold text-white">{tr.bloodPressure}</span></div>
                          <div><span className="text-slate-500">FC:</span> <span className="font-bold text-white">{tr.heartRate} lpm</span></div>
                          <div><span className="text-slate-500">Temp:</span> <span className="font-bold text-white">{tr.temperature}°C</span></div>
                          <div><span className="text-slate-500">SatO2:</span> <span className="font-bold text-white">{tr.oxygenSaturation}%</span></div>
                          <div><span className="text-slate-500">Peso:</span> <span className="font-bold text-white">{tr.weightKg} kg</span></div>
                          <div><span className="text-slate-500">Talla:</span> <span className="font-bold text-white">{tr.heightCm} cm</span></div>
                        </div>
                        {tr.notes && (
                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                            Obs: {tr.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historial de Consultas Médicas & Recetas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-teal-400" /> Consultas Médicas Registradas ({selectedPatientHistoryModal.medicalRecords.length})
              </h4>

              {selectedPatientHistoryModal.medicalRecords.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 text-xs">
                  Este paciente no posee consultas médicas registradas aún.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedPatientHistoryModal.medicalRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-teal-300">
                            {rec.specialty} • Dr(a). {rec.doctorName}
                          </span>
                          {rec.licenseNumber && (
                            <span className="text-[11px] text-slate-500 ml-2 font-mono">
                              (Reg. {rec.licenseNumber})
                            </span>
                          )}
                          <p className="text-[11px] text-slate-400">
                            Motivo de consulta: <span className="text-slate-300 italic">{rec.appointmentReason}</span>
                          </p>
                        </div>
                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                          {new Date(rec.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-slate-400 block text-[11px] uppercase">Diagnóstico Clínico:</span>
                          <p className="text-white mt-0.5 font-medium">{rec.diagnosis}</p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-400 block text-[11px] uppercase">Receta Médica & Tratamiento:</span>
                          <p className="text-teal-200 mt-0.5 font-mono whitespace-pre-line bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                            {rec.prescription}
                          </p>
                        </div>

                        {rec.notes && (
                          <div>
                            <span className="font-semibold text-slate-400 block text-[11px] uppercase">Indicaciones Adicionales:</span>
                            <p className="text-slate-300 mt-0.5 italic">{rec.notes}</p>
                          </div>
                        )}

                        {/* Resultados y Adjuntos en el expediente */}
                        {rec.attachments && rec.attachments.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1.5">
                            <span className="font-semibold text-slate-400 block text-[11px] uppercase flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5 text-teal-400" /> Resultados y Adjuntos ({rec.attachments.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {rec.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                                >
                                  <span className="font-mono text-[11px] truncate max-w-[160px]">{att.fileName}</span>
                                  <button
                                    type="button"
                                    onClick={() => setViewAttachmentModal(att)}
                                    className="text-teal-400 hover:text-teal-300 p-1"
                                    title="Visualizar documento"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(att)}
                                    className="text-slate-400 hover:text-white p-1"
                                    title="Descargar archivo"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedPatientHistoryModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: AGENDAR CITA A PACIENTE DESDE DIRECTORIO (RECEPCIÓN/ADMIN) */}
      {/* ============================================================== */}
      {bookForPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Agendar Cita Médica</h3>
                  <p className="text-xs text-slate-400">
                    Para: <strong className="text-teal-300">{bookForPatientModal.fullName}</strong> ({bookForPatientModal.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookForPatientModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdminBookAppointment} className="space-y-4">
              {adminBookError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {adminBookError}
                </div>
              )}

              {/* Selección de Médico */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  1. Selecciona el Profesional Médico *
                </label>
                <select
                  value={adminBookDoctorId}
                  onChange={(e) => setAdminBookDoctorId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Elige un médico especialista --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fullName} — {doc.specialty.name} (${doc.consultationFee.toFixed(2)}){doc.averageRating && doc.averageRating > 0 ? ` (★ ${doc.averageRating.toFixed(1)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  2. Fecha de Consulta *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={adminBookDate}
                  onChange={(e) => setAdminBookDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Advertencia si la fecha está bloqueada */}
              {adminBookSlotsData?.blocked && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <CalendarOff className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">Fecha no laborable / bloqueada para este especialista</p>
                    <p className="text-[11px] text-rose-400/90 mt-0.5">
                      Motivo: {adminBookSlotsData.reason || 'Día no laboral o descanso programado'}
                    </p>
                  </div>
                </div>
              )}

              {/* Horarios Disponibles */}
              {adminBookDoctorId && adminBookDate && !adminBookSlotsData?.blocked && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    3. Horario Disponible *
                  </label>
                  {loadingAdminSlots ? (
                    <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                      <span>Consultando agenda del especialista...</span>
                    </div>
                  ) : adminBookSlotsData?.slots && adminBookSlotsData.slots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {adminBookSlotsData.slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setAdminBookSlot(slot)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                            adminBookSlot === slot
                              ? 'bg-teal-500 text-slate-950 shadow-lg scale-105'
                              : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-400/90 italic bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      No hay turnos disponibles para la fecha seleccionada.
                    </p>
                  )}
                </div>
              )}

              {/* Motivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  4. Motivo de la Cita / Observaciones
                </label>
                <input
                  type="text"
                  value={adminBookReason}
                  onChange={(e) => setAdminBookReason(e.target.value)}
                  placeholder="Ej: Control de rutina, revisión de exámenes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBookForPatientModal(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adminBookSubmitting || !adminBookSlot || Boolean(adminBookSlotsData?.blocked)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white shadow-lg flex items-center gap-1.5"
                >
                  {adminBookSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{adminBookSubmitting ? 'Agendando...' : 'Confirmar Cita'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: VISUALIZADOR DE ADJUNTOS / ESTUDIOS MÉDICOS           */}
      {/* ============================================================== */}
      {viewAttachmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 shrink-0">
                  <Paperclip className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{viewAttachmentModal.fileName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {viewAttachmentModal.fileType} • {new Date(viewAttachmentModal.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadAttachment(viewAttachmentModal)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  onClick={() => setViewAttachmentModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-2 flex items-center justify-center min-h-[300px]">
              {viewAttachmentModal.fileType.startsWith('image/') || viewAttachmentModal.fileDataUrl.startsWith('data:image/') ? (
                <img
                  src={viewAttachmentModal.fileDataUrl}
                  alt={viewAttachmentModal.fileName}
                  className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                />
              ) : viewAttachmentModal.fileType === 'application/pdf' || viewAttachmentModal.fileDataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewAttachmentModal.fileDataUrl}
                  title={viewAttachmentModal.fileName}
                  className="w-full h-[75vh] rounded-lg border border-slate-800"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <Paperclip className="h-12 w-12 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Vista previa directa no disponible para el tipo de archivo <strong className="text-white">{viewAttachmentModal.fileType}</strong>.
                  </p>
                  <button
                    onClick={() => handleDownloadAttachment(viewAttachmentModal)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500"
                  >
                    Descargar Archivo para Abrir Localmente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Calificar Atención de Cita */}
      {selectedAppForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Star className="h-5 w-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Calificar Atención</h3>
                  <p className="text-xs text-slate-400">{selectedAppForReview.doctor.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForReview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {reviewError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {reviewError}
              </div>
            )}

            <div className="space-y-4">
              <div className="text-center space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">¿Cómo calificarías tu experiencia?</span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          (hoverRating || reviewRating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-amber-400">
                  {(hoverRating || reviewRating) === 1 && '1 / 5 - Muy insatisfecho'}
                  {(hoverRating || reviewRating) === 2 && '2 / 5 - Insatisfecho'}
                  {(hoverRating || reviewRating) === 3 && '3 / 5 - Regular'}
                  {(hoverRating || reviewRating) === 4 && '4 / 5 - Buena atención'}
                  {(hoverRating || reviewRating) === 5 && '5 / 5 - ¡Excelente atención!'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Comentario u opinión (opcional):
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Comparte detalles de la atención médica brindada..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAppForReview(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendReview}
                  disabled={reviewSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {reviewSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Enviar Calificación</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Medicamento (Admin) */}
      {showNewMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Nuevo Medicamento en Botica</h3>
                  <p className="text-xs text-slate-400">Añadir al catálogo farmacéutico</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMedModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {newMedError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {newMedError}
              </div>
            )}

            <form onSubmit={handleCreateMedication} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Código Único *</label>
                  <input
                    type="text"
                    required
                    value={newMedCode}
                    onChange={(e) => setNewMedCode(e.target.value.toUpperCase())}
                    placeholder="Ej: MED-026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Categoría *</label>
                  <select
                    value={newMedCategory}
                    onChange={(e) => setNewMedCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Analgésicos">Analgésicos</option>
                    <option value="Antibióticos">Antibióticos</option>
                    <option value="Antiinflamatorios">Antiinflamatorios</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Pediátrico">Pediátrico</option>
                    <option value="Gastroenterología">Gastroenterología</option>
                    <option value="Respiratorio">Respiratorio</option>
                    <option value="Dermatológico">Dermatológico</option>
                    <option value="Oftálmico">Oftálmico</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Nombre del Medicamento *</label>
                <input
                  type="text"
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="Ej: Amoxicilina + Ácido Clavulánico 875/125mg"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Presentación / Formato *</label>
                <input
                  type="text"
                  required
                  value={newMedPresentation}
                  onChange={(e) => setNewMedPresentation(e.target.value)}
                  placeholder="Ej: Caja x 14 tabletas recubiertas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Precio (S/) *</label>
                  <input
                    type="number"
                    step="0.10"
                    min="0.10"
                    required
                    value={newMedPrice}
                    onChange={(e) => setNewMedPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Stock Inicial *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMedStock}
                    onChange={(e) => setNewMedStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Stock Mínimo *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMedMinStock}
                    onChange={(e) => setNewMedMinStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewMedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newMedSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950"
                >
                  {newMedSubmitting ? 'Guardando...' : 'Guardar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reponer Stock (Admin) */}
      {selectedMedForReplenish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Reponer Stock</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedMedForReplenish.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMedForReplenish(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {replenishError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {replenishError}
              </div>
            )}

            <form onSubmit={handleReplenishStock} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <p className="font-bold text-white text-sm">{selectedMedForReplenish.name}</p>
                <p className="text-slate-400">{selectedMedForReplenish.presentation}</p>
                <div className="flex justify-between pt-1 border-t border-slate-800/80 mt-2">
                  <span className="text-slate-500">Stock Actual:</span>
                  <span className="font-mono font-bold text-teal-300">{selectedMedForReplenish.stock} unidades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stock Mínimo:</span>
                  <span className="font-mono text-slate-400">{selectedMedForReplenish.minStock} unidades</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Cantidad de Unidades a Añadir *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(e.target.value)}
                  placeholder="20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-400 block">
                  Nuevo stock total será: <strong className="text-emerald-400 font-mono">{selectedMedForReplenish.stock + (parseInt(replenishQty) || 0)} unidades</strong>
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMedForReplenish(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={replenishSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950"
                >
                  {replenishSubmitting ? 'Actualizando...' : 'Confirmar Reposición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRAR RESULTADO / INFORME DE LABORATORIO E IMÁGENES */}
      {/* ============================================================== */}
      {selectedOrderForResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Registrar Resultado de Examen</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedOrderForResult.catalogItem?.code} • {selectedOrderForResult.catalogItem?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resultError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {resultError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">
                Paciente: <strong className="text-white">{selectedOrderForResult.patient.fullName}</strong>
              </p>
              <p className="text-slate-400">
                Médico solicitante: <strong className="text-white">{selectedOrderForResult.doctor.user?.fullName}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveLabResult} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Informe / Conclusiones del Diagnóstico *
                </label>
                <textarea
                  rows={4}
                  required
                  value={resultSummaryText}
                  onChange={(e) => setResultSummaryText(e.target.value)}
                  placeholder="Valores obtenidos, observaciones clínicas, conclusiones diagnósticas..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 leading-relaxed font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Adjuntar Documento o Imagen (PDF, JPG, PNG - Opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-all">
                    <UploadCloud className="h-4 w-4 text-cyan-400" />
                    <span>{resultFileName ? 'Cambiar Archivo' : 'Seleccionar Archivo'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('El informe no puede superar los 5MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setResultFileBase64(reader.result as string);
                          setResultFileName(file.name);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {resultFileName && (
                    <div className="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-950/30 px-2.5 py-1 rounded-lg border border-cyan-800/40">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[200px]">{resultFileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResultFileBase64('');
                          setResultFileName('');
                        }}
                        className="text-rose-400 hover:text-rose-300 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForResult(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resultSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950"
                >
                  {resultSubmitting ? 'Guardando resultado...' : 'Guardar y Completar Informe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VER RESULTADO COMPLETO DEL EXAMEN                       */}
      {/* ============================================================== */}
      {viewResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Informe de Laboratorio & Diagnóstico</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {viewResultModal.catalogItem?.code} • {viewResultModal.catalogItem?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewResultModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-500">Paciente:</span>
                <p className="font-bold text-white">{viewResultModal.patient.fullName}</p>
              </div>
              <div>
                <span className="text-slate-500">Médico:</span>
                <p className="font-bold text-white">{viewResultModal.doctor.user?.fullName}</p>
              </div>
              <div>
                <span className="text-slate-500">Fecha de Orden:</span>
                <p className="font-mono text-slate-300">
                  {new Date(viewResultModal.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Completado el:</span>
                <p className="font-mono text-emerald-400 font-bold">
                  {viewResultModal.completedAt ? new Date(viewResultModal.completedAt).toLocaleDateString('es-ES') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                Resultado Clínico & Conclusiones
              </span>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {viewResultModal.resultSummary || 'Sin resumen registrado.'}
              </div>
            </div>

            {viewResultModal.resultFileBase64 && (
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-white truncate max-w-[220px]">
                    {viewResultModal.resultFileName || 'Informe_Adjunto.pdf'}
                  </span>
                </div>
                <a
                  href={viewResultModal.resultFileBase64}
                  download={viewResultModal.resultFileName || 'Informe_Diagnostico.pdf'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </a>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewResultModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: INGRESAR PACIENTE A CAMILLA DE TÓPICO / OBSERVACIÓN     */}
      {/* ============================================================== */}
      {selectedBedForAdmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Ingreso a Camilla de Tópico</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedBedForAdmit.code} • {selectedBedForAdmit.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBedForAdmit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {admitError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {admitError}
              </div>
            )}

            <form onSubmit={handleAdmitBed} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Nombre del Paciente *</label>
                <input
                  type="text"
                  required
                  value={admitPatientName}
                  onChange={(e) => setAdmitPatientName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Motivo de Ingreso a Tópico *</label>
                <input
                  type="text"
                  required
                  value={admitReason}
                  onChange={(e) => setAdmitReason(e.target.value)}
                  placeholder="Ej. Crisis asmática moderada, dolor abdominal agudo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Procedimiento / Tratamiento Inicial</label>
                <input
                  type="text"
                  value={admitProcedure}
                  onChange={(e) => setAdmitProcedure(e.target.value)}
                  placeholder="Ej. Nebulización con Salbutamol, suero fisiológico IV"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Tarifa por Uso de Camilla (S/) *</label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={admitFee}
                  onChange={(e) => setAdmitFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBedForAdmit(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={admitSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950"
                >
                  {admitSubmitting ? 'Ingresando...' : 'Confirmar Ingreso a Camilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DAR DE ALTA Y LIQUIDAR CAMILLA                          */}
      {/* ============================================================== */}
      {selectedBedForDischarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Alta & Liquidación de Camilla</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedBedForDischarge.code} • {selectedBedForDischarge.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBedForDischarge(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-400">
                Paciente: <strong className="text-white text-sm">{selectedBedForDischarge.currentPatientName}</strong>
              </p>
              {selectedBedForDischarge.reason && (
                <p className="text-slate-400">
                  Motivo: <span className="text-slate-200">{selectedBedForDischarge.reason}</span>
                </p>
              )}
              {selectedBedForDischarge.procedure && (
                <p className="text-slate-400">
                  Procedimiento: <span className="text-slate-200">{selectedBedForDischarge.procedure}</span>
                </p>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-300">Total a Liquidar:</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  S/ {(selectedBedForDischarge.fee || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleDischargeBed} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dischargePaid}
                    onChange={(e) => setDischargePaid(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-950 h-4 w-4"
                  />
                  <span>Marcar tarifa como pagada en caja (S/ {(selectedBedForDischarge.fee || 0).toFixed(2)})</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Estado posterior de la camilla
                </label>
                <select
                  value={dischargeNextStatus}
                  onChange={(e) => setDischargeNextStatus(e.target.value as 'AVAILABLE' | 'CLEANING')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="AVAILABLE">Disponible inmediatamente</option>
                  <option value="CLEANING">En Desinfección / Limpieza de protocolo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBedForDischarge(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={dischargeSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950"
                >
                  {dischargeSubmitting ? 'Procesando alta...' : 'Confirmar Alta y Liberar Camilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOLETA HOSPITALARIA UNIFICADA (BOL-2026-XXXX) */}
      {issuedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative print:border-none print:shadow-none print:bg-white print:text-black print:p-0">
            {/* Cabecera del Comprobante */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 print:border-slate-300">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-extrabold print:text-emerald-700">
                  Comprobante Electrónico Oficial
                </span>
                <h3 className="text-xl font-black text-white print:text-black">CLÍNICA INTEGRAL S.A.C.</h3>
                <p className="text-xs text-slate-400 print:text-slate-600">RUC: 20608945123 • Av. San Martín 450, Lima</p>
                <p className="text-xs text-slate-400 print:text-slate-600">Central Telefónica: (01) 500-6000 • contacto@clinica.com</p>
              </div>

              <div className="text-right p-3 rounded-2xl bg-slate-950 border border-slate-800 print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-600 block">
                  Boleta de Venta
                </span>
                <span className="font-mono text-base font-black text-emerald-400 print:text-emerald-700 block">
                  {issuedReceipt.receiptNumber}
                </span>
              </div>
            </div>

            {/* Datos del Paciente y Transacción */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 print:bg-slate-50 print:border-slate-200">
              <div>
                <span className="text-slate-400 print:text-slate-500 block text-[11px]">Paciente:</span>
                <strong className="text-white print:text-black text-sm">{issuedReceipt.patient.fullName}</strong>
                {issuedReceipt.patient.email && (
                  <span className="text-slate-400 print:text-slate-600 block text-[11px] truncate">
                    {issuedReceipt.patient.email}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-400 print:text-slate-500 block text-[11px]">Fecha y Hora:</span>
                <strong className="text-white print:text-black">
                  {new Date(issuedReceipt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(issuedReceipt.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </strong>
                <span className="text-slate-400 print:text-slate-600 block text-[11px] mt-0.5">
                  Cajero: {issuedReceipt.cashier || 'Caja Central'}
                </span>
              </div>
            </div>

            {/* Tabla Detallada de Ítems */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700 block">
                Detalle de Servicios Hospitalarios
              </span>
              <div className="rounded-xl border border-slate-800 overflow-hidden print:border-slate-300">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-left font-bold">Concepto / Área</th>
                      <th className="py-2 px-3 text-right font-bold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 print:divide-slate-200">
                    {issuedReceipt.items.map((it, idx) => (
                      <tr key={it.id + idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-200 print:text-black">
                          <span className="font-semibold block">{it.description}</span>
                          <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase">{it.type}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white print:text-black">
                          S/ {it.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtotales y Total Liquidado */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 print:bg-slate-100 print:border-slate-300">
              <div className="flex justify-between text-xs text-slate-400 print:text-slate-600">
                <span>Forma de Pago:</span>
                <span className="font-bold text-slate-200 print:text-black uppercase">{issuedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800 print:border-slate-300">
                <span className="font-extrabold uppercase text-white print:text-black">TOTAL CANCELADO:</span>
                <span className="font-mono text-xl font-black text-emerald-400 print:text-emerald-700">
                  S/ {issuedReceipt.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Pie de Boleta */}
            <div className="text-center text-[10px] text-slate-500 print:text-slate-600 space-y-0.5 border-t border-slate-800/80 pt-3 print:border-slate-200">
              <p>¡Gracias por confiar en Clínica Integral!</p>
              <p>Comprobante de pago emitido electrónicamente de acuerdo a normativa hospitalaria vigente.</p>
            </div>

            {/* Acciones de Impresión (Ocultas al Imprimir) */}
            <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setIssuedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Boleta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 print:hidden mb-16 md:mb-0">
        Sistema Clínico Integral • Sesión activa como {user.fullName} ({user.role})
      </footer>

      {/* Barra de Navegación Inferior Móvil (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 flex items-center justify-around shadow-2xl print:hidden">
        {/* Botón Citas */}
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            activeTab === 'appointments'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'appointments' ? 'bg-teal-500/10' : ''}`}>
            <Calendar className="h-4 w-4" />
          </div>
          <span className="text-[10px] leading-none">Citas</span>
        </button>

        {/* Botón Historial / Recetas */}
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            activeTab === 'records'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'records' ? 'bg-teal-500/10' : ''}`}>
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-[10px] leading-none">Historial</span>
        </button>

        {/* Botón Pacientes (ADMIN, DOCTOR, RECEPTIONIST, NURSE) */}
        {(user.role === 'ADMIN' || user.role === 'DOCTOR' || user.role === 'RECEPTIONIST' || user.role === 'NURSE') && (
          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
              activeTab === 'patients'
                ? 'text-teal-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'patients' ? 'bg-teal-500/10' : ''}`}>
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[10px] leading-none">Pacientes</span>
          </button>
        )}

        {/* Botón Fechas Bloqueadas (DOCTOR, ADMIN) */}
        {(user.role === 'DOCTOR' || user.role === 'ADMIN') && (
          <button
            type="button"
            onClick={() => setActiveTab('blocked_dates')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
              activeTab === 'blocked_dates'
                ? 'text-amber-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'blocked_dates' ? 'bg-amber-500/10' : ''}`}>
              <CalendarOff className="h-4 w-4" />
            </div>
            <span className="text-[10px] leading-none">Bloqueos</span>
          </button>
        )}

        {/* Botón Analítica (Solo ADMIN) */}
        {user.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'text-teal-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'analytics' ? 'bg-teal-500/10' : ''}`}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[10px] leading-none">Analítica</span>
          </button>
        )}

        {/* Botón Mi Perfil */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            activeTab === 'profile'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'profile' ? 'bg-teal-500/10' : ''}`}>
            <UserCheck className="h-4 w-4" />
          </div>
          <span className="text-[10px] leading-none">Perfil</span>
        </button>
      </nav>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
