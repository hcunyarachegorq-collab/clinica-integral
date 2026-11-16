'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse,
  Stethoscope,
  Activity,
  Baby,
  Calendar,
  Clock,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  LogIn,
  LayoutDashboard,
  LogOut,
  Phone,
  MapPin,
  Sparkles,
  Star,
  Search,
  FileText,
  Shield,
  Zap,
  TrendingUp,
  Download,
  Award,
  Heart,
  Bone,
  Brain,
  Eye,
  Smile,
  Ear,
} from 'lucide-react';
import { api, Specialty, Doctor } from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';
import { QuickBookDrawer } from '../src/components/QuickBookDrawer';
import { DoctorCardSkeleton } from '../src/components/SkeletonCard';

export default function LandingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [doctorSearch, setDoctorSearch] = useState<string>('');
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<Doctor | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [specRes, docRes] = await Promise.all([
          api.getSpecialties(),
          api.getDoctors(),
        ]);
        setSpecialties(specRes.specialties);
        setDoctors(docRes.doctors);
      } catch (error) {
        console.error('Error al cargar datos en landing page:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getSpecialtyIcon = (iconName?: string | null) => {
    switch (iconName?.toLowerCase()) {
      case 'stethoscope':
        return <Stethoscope className="h-6 w-6 text-teal-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'heart-pulse':
        return <HeartPulse className="h-6 w-6 text-rose-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'baby':
        return <Baby className="h-6 w-6 text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'sparkles':
        return <Sparkles className="h-6 w-6 text-fuchsia-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'heart':
        return <Heart className="h-6 w-6 text-pink-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'bone':
        return <Bone className="h-6 w-6 text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'brain':
        return <Brain className="h-6 w-6 text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'eye':
        return <Eye className="h-6 w-6 text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'smile':
        return <Smile className="h-6 w-6 text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'activity':
        return <Activity className="h-6 w-6 text-orange-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'shield':
        return <ShieldCheck className="h-6 w-6 text-yellow-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      case 'ear':
        return <Ear className="h-6 w-6 text-cyan-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
      default:
        return <Activity className="h-6 w-6 text-cyan-400 group-hover:scale-110 group-hover:rotate-6 transition-transform" />;
    }
  };

  const getDayName = (day: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[day] || '';
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpec = !selectedSpecialty || doc.specialty?.id === selectedSpecialty;
    const query = doctorSearch.trim().toLowerCase();
    const matchesQuery =
      !query ||
      doc.fullName.toLowerCase().includes(query) ||
      (doc.specialty?.name && doc.specialty.name.toLowerCase().includes(query)) ||
      (doc.bio && doc.bio.toLowerCase().includes(query));
    return matchesSpec && matchesQuery;
  });

  const marqueeItems = [
    { icon: Stethoscope, label: 'Triaje Inteligente con Signos Vitales' },
    { icon: FileText, label: 'Recetas Médicas Oficiales en PDF' },
    { icon: ShieldCheck, label: 'Historial Clínico Digital Cifrado' },
    { icon: Calendar, label: 'Turnos Disponibles en Tiempo Real' },
    { icon: Activity, label: 'Monitor de Presión, Pulso y SatO2' },
    { icon: Star, label: 'Calificaciones Verificadas de Pacientes' },
    { icon: Award, label: 'Cuerpo Médico Certificado' },
    { icon: Zap, label: 'Atención Inmediata sin Filas' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 group-hover:border-teal-400 transition-all shadow-lg shadow-teal-500/10">
              <HeartPulse className="h-6 w-6 text-teal-400 group-hover:animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">
                Clínica Médica Integral
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Atención Digital Activa
              </span>
            </div>
          </Link>

          {/* Menú de Navegación */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#especialidades" className="hover:text-teal-400 transition-colors">
              Especialidades
            </a>
            <a href="#doctores" className="hover:text-teal-400 transition-colors">
              Staff Médico
            </a>
            <a href="#beneficios" className="hover:text-teal-400 transition-colors">
              Beneficios
            </a>
            <a href="#horarios" className="hover:text-teal-400 transition-colors">
              Contacto
            </a>
          </nav>

          {/* Botones de Autenticación */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40 transition-all hover:scale-105"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Mi Panel ({user.role})</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-900 transition-all"
                >
                  <LogIn className="h-4 w-4 text-teal-400" />
                  <span>Ingresar</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('doctores');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-lg shadow-teal-950 transition-all hover:scale-105"
                >
                  <span>Agendar Cita</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1. HERO SECTION DE ALTO IMPACTO (2 COLUMNAS ASIMÉTRICAS)        */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-28">
        {/* Orbes de luz difuminados con animación orgánica lenta */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-blob-delayed" />
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[36rem] h-[20rem] bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-blob-slow" />
        {/* Patrón de cuadrícula sutil con máscara radial */}
        <div className="absolute inset-0 bg-grid-pattern opacity-60 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Columna Izquierda: Información, Headline y CTAs */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="lg:col-span-7 space-y-6 text-left"
            >
              {/* Badge animado con punto pulsante */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-950/40 backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
                <span>Plataforma Médica Conectada 24/7 • Admisión en Vivo</span>
              </div>

              {/* Título Principal con Palabras en Gradiente Vibrante */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
                Cuidado médico de excelencia{' '}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                  en tiempo real.
                </span>
              </h1>

              {/* Subtítulo Descriptivo */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Agenda tu consulta online con especialistas de élite sin filas ni esperas. Consulta turnos disponibles al instante, gestiona recetas médicas oficiales en PDF y accede a tu historial clínico en una plataforma segura y moderna.
              </p>

              {/* Botones de Acción con Shimmer y Brillo Exterior */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('doctores');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="relative group overflow-hidden inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-base"
                >
                  <span className="absolute inset-0 w-full h-full animate-shimmer pointer-events-none" />
                  <Calendar className="h-5 w-5 text-white" />
                  <span>Reservar Cita Ahora</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#especialidades"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 hover:text-white transition-all text-base backdrop-blur-sm"
                >
                  <span>Ver Especialidades</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
              </div>

              {/* Fila de 3 Estadísticas Clave */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">12+</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Especialidades Médicas</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-teal-300 font-mono">99.8%</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Atención Puntual</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">4.9</p>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Calificación Pacientes</p>
                </div>
              </div>
            </motion.div>

            {/* Columna Derecha: Composición Visual Interactiva */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="lg:col-span-5 relative"
            >
              {/* Tarjeta Flotante 1: Cita Confirmada (Arriba a la derecha) */}
              <div className="absolute -top-6 -right-2 sm:-right-6 z-20 animate-float bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-3.5 shadow-xl shadow-emerald-950/40 backdrop-blur-md flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">Cita Confirmada</p>
                  <p className="text-[10px] text-emerald-300">Dr. García • 10:30 AM</p>
                </div>
              </div>

              {/* Tarjeta Flotante 2: Signos Vitales (Abajo a la izquierda) */}
              <div className="absolute -bottom-6 -left-2 sm:-left-6 z-20 animate-float-delayed bg-slate-900/90 border border-teal-500/40 rounded-2xl p-3.5 shadow-xl shadow-teal-950/40 backdrop-blur-md flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">Triaje & Signos Vitales</p>
                  <p className="text-[10px] text-teal-300">IMC Óptimo & Pulso 72 bpm</p>
                </div>
              </div>

              {/* Tarjeta Flotante 3: Receta Digital PDF Lista (Abajo a la derecha) */}
              <div className="absolute bottom-16 -right-4 sm:-right-8 z-20 animate-float-reverse bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-3 shadow-xl shadow-cyan-950/40 backdrop-blur-md flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">Receta Digital PDF</p>
                  <p className="text-[10px] text-cyan-300 flex items-center gap-1">
                    <Download className="h-2.5 w-2.5" /> Descarga Oficial Lista
                  </p>
                </div>
              </div>

              {/* Tarjeta Central Glassmorphism: "Panel Clínico en Vivo" */}
              <div className="rounded-3xl bg-slate-900/75 border border-emerald-500/30 p-6 sm:p-7 backdrop-blur-2xl shadow-2xl shadow-emerald-950/50 space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-0.5 shadow-md shadow-teal-500/20">
                      <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-300 font-bold text-sm">
                        DR
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Dra. Elena Silva</h4>
                      <p className="text-xs text-teal-400 font-medium">Cardiología & Hemodinámica</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Consulta
                  </span>
                </div>

                {/* Onda de Ritmo Cardíaco (SVG animado) */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <HeartPulse className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                      Frecuencia Cardíaca en Vivo
                    </span>
                    <span className="font-mono font-bold text-emerald-400">72 BPM</span>
                  </div>
                  <div className="h-10 w-full flex items-center justify-center overflow-hidden">
                    <svg className="w-full h-8 text-emerald-400" viewBox="0 0 300 40" fill="none">
                      <path
                        d="M0 20 H60 L70 5 L80 35 L90 10 L100 25 L110 20 H180 L190 5 L200 35 L210 10 L220 25 L230 20 H300"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-90"
                      />
                    </svg>
                  </div>
                </div>

                {/* Métricas de Signos Vitales */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Presión</span>
                    <span className="text-xs font-bold text-white font-mono">120/80</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Temperatura</span>
                    <span className="text-xs font-bold text-white font-mono">36.6 °C</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Saturación O2</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">99%</span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                    Expediente clínico protegido con cifrado SSL de extremo a extremo
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. CINTA ANIMADA (MARQUEE INFINITO)                             */}
      {/* ============================================================== */}
      <div className="relative py-4 border-y border-slate-800/80 bg-slate-950/80 backdrop-blur-lg overflow-hidden">
        <div className="animate-marquee flex items-center gap-12 whitespace-nowrap text-xs font-semibold tracking-wider uppercase text-slate-400">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-2.5 hover:text-teal-300 transition-colors cursor-default">
                <Icon className="h-4 w-4 text-teal-400" />
                <span>{item.label}</span>
                <span className="text-slate-700 ml-4">•</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SECCIÓN BENEFICIOS CLÍNICOS (REVEAL EN CASCADA)             */}
      {/* ============================================================== */}
      <section id="beneficios" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Innovación en Salud
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              ¿Por qué elegir nuestra Clínica Integral?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Combinamos tecnología de vanguardia y calidez humana para ofrecerte una experiencia médica ágil, precisa y confiable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: CheckCircle2,
                color: 'text-emerald-400',
                title: 'Reserva Inmediata',
                desc: 'Turnos disponibles en tiempo real, evitando llamadas y tiempos muertos.',
              },
              {
                icon: UserCheck,
                color: 'text-teal-400',
                title: 'Médicos Expertos',
                desc: 'Especialistas certificados con número de colegiatura y trayectoria comprobada.',
              },
              {
                icon: ShieldCheck,
                color: 'text-cyan-400',
                title: 'Seguridad Total',
                desc: 'Cifrado de datos y privacidad absoluta para tu historial clínico familiar.',
              },
              {
                icon: Clock,
                color: 'text-amber-400',
                title: 'Horarios Flexibles',
                desc: 'Atención continua de lunes a sábado con guardia médica para urgencias.',
              },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:-translate-y-2 hover:bg-slate-900/90 transition-all duration-300 group shadow-lg shadow-black/20"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-teal-500/50 transition-all">
                    <Icon className={`h-6 w-6 ${b.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {b.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. SECCIÓN ESPECIALIDADES MÉDICAS INTERACTIVAS                  */}
      {/* ============================================================== */}
      <section id="especialidades" className="py-20 bg-slate-900/40 border-y border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Cobertura Clínica Integral
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Especialidades Médicas
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Disponemos de distintas ramas médicas para brindarte un diagnóstico oportuno y un plan de tratamiento adaptado a tus necesidades.
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-2xl bg-slate-900/80 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {specialties.map((spec, i) => {
                const isSelected = selectedSpecialty === spec.id;
                return (
                  <motion.div
                    key={spec.id}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    onClick={() => setSelectedSpecialty(isSelected ? null : spec.id)}
                    className={`cursor-pointer rounded-2xl p-6 border transition-all duration-300 group hover:-translate-y-2 ${
                      isSelected
                        ? 'bg-teal-950/40 border-teal-500 shadow-xl shadow-teal-900/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-emerald-400/60 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-black/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        {getSpecialtyIcon(spec.iconName)}
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                        {spec.doctorsCount} {spec.doctorsCount === 1 ? 'médico' : 'médicos'}
                      </span>
                    </div>

                    <h3 className="mt-5 font-bold text-lg text-white group-hover:text-teal-300 transition-colors">
                      {spec.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-3 leading-relaxed">
                      {spec.description || 'Consulta especializada de evaluación médica diagnóstica.'}
                    </p>

                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-teal-400">
                      <span>{isSelected ? 'Mostrando médicos seleccionados' : 'Ver especialistas'}</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. SECCIÓN STAFF MÉDICO CON BUSCADOR Y DRAWER DE RESERVA        */}
      {/* ============================================================== */}
      <section id="doctores" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Cuerpo Médico Profesional
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Nuestros Especialistas
              </h2>
              <p className="text-slate-400 text-sm">
                Conoce a nuestro equipo de médicos calificados y agenda tu consulta con disponibilidad en tiempo real.
              </p>
            </div>

            {selectedSpecialty && (
              <button
                onClick={() => setSelectedSpecialty(null)}
                className="text-xs text-teal-400 hover:text-teal-300 underline underline-offset-4 self-start sm:self-auto font-medium"
              >
                Limpiar filtro de especialidad
              </button>
            )}
          </div>

          {/* Barra de Búsqueda y Chips de Filtro */}
          <div className="space-y-4">
            {/* Buscador en Vivo */}
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Buscar por nombre, especialidad o palabra clave..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              />
              {doctorSearch && (
                <button
                  onClick={() => setDoctorSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Chips de Especialidad */}
            {specialties.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedSpecialty(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    !selectedSpecialty
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  Todas ({doctors.length})
                </button>
                {specialties.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSpecialty(selectedSpecialty === s.id ? null : s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedSpecialty === s.id
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {s.name} ({s.doctorsCount || 0})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid de Doctores */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <DoctorCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <p className="text-base font-semibold">No se encontraron especialistas</p>
              <p className="text-xs text-slate-500">Intenta con otro término de búsqueda o limpia los filtros activos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 hover:-translate-y-2 p-6 flex flex-col justify-between space-y-6 hover:shadow-2xl hover:shadow-emerald-950/30 transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-0.5 shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                          <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-300 font-bold text-sm">
                            {doc.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base group-hover:text-teal-300 transition-colors">
                            {doc.fullName}
                          </h3>
                          <p className="text-xs text-teal-400 font-medium">
                            {doc.specialty?.name || 'Medicina General'}
                          </p>
                        </div>
                      </div>

                      {doc.averageRating && doc.averageRating > 0 ? (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-300">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{doc.averageRating.toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {doc.bio || 'Médico especialista enfocado en atención integral, preventiva y diagnóstico oportuno.'}
                    </p>

                    {/* Días y Horarios */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-teal-400" />
                        <span className="font-semibold">Horario de Atención:</span>
                      </div>
                      <p className="text-[11px] text-teal-300/90 pl-5 font-medium">
                        {doc.scheduleLabel ||
                          (doc.schedules && doc.schedules.length > 0
                            ? doc.schedules
                                .map((s) => `${getDayName(s.dayOfWeek)} (${s.startTime} - ${s.endTime})`)
                                .join(' • ')
                            : 'Horario regular de atención')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">Tarifa de Consulta:</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        ${doc.consultationFee.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctorForBooking(doc);
                        setIsDrawerOpen(true);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white transition-all shadow-lg shadow-teal-950 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Agendar Cita con este Especialista</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. FOOTER INSTITUCIONAL                                        */}
      {/* ============================================================== */}
      <footer id="horarios" className="bg-slate-900 border-t border-slate-800/80 pt-16 pb-12 text-slate-400 text-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <HeartPulse className="h-6 w-6 text-teal-400" />
                <span>Clínica Médica Integral</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Comprometidos con la salud y bienestar integral de tu familia a través de innovación médica, telemetría y atención humana de excelencia.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                Horarios de Atención
              </h4>
              <p className="text-xs text-slate-300">Lunes a Viernes: 07:00 - 20:00</p>
              <p className="text-xs text-slate-300">Sábados: 08:00 - 15:00</p>
              <p className="text-xs text-teal-400 font-semibold">Urgencias: 24 Horas</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                Contacto & Ubicación
              </h4>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-teal-400" />
                +1 (800) 555-CLINICA
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                Av. Médica Central 1024, Edificio Salud
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                Soporte & Diagnóstico
              </h4>
              <p className="text-xs text-slate-400">
                ¿Personal técnico o administrador? Accede a la consola de salud del sistema:
              </p>
              <Link
                href="/status"
                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium underline underline-offset-4"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Consola de Telemetría (/status)</span>
              </Link>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Clínica Médica Integral. Todos los derechos reservados.</p>
            <p>Monorepo Integral: Next.js 14 • Express API • PostgreSQL • Flutter Ready</p>
          </div>
        </div>
      </footer>

      {/* Drawer Deslizante de Reserva Rápida */}
      <QuickBookDrawer
        doctor={selectedDoctorForBooking}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onBookingSuccess={() => {
          setIsDrawerOpen(false);
          router.push('/dashboard');
        }}
      />
    </div>
  );
}
