'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { api, Specialty, Doctor } from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

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
        return <Stethoscope className="h-6 w-6 text-teal-400" />;
      case 'heart-pulse':
        return <HeartPulse className="h-6 w-6 text-rose-400" />;
      case 'baby':
        return <Baby className="h-6 w-6 text-amber-400" />;
      default:
        return <Activity className="h-6 w-6 text-blue-400" />;
    }
  };

  const getDayName = (day: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[day] || '';
  };

  const filteredDoctors = selectedSpecialty
    ? doctors.filter((doc) => doc.specialty?.id === selectedSpecialty)
    : doctors;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-all shadow-lg shadow-teal-500/10">
              <HeartPulse className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">
                Clínica Médica Integral
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
            <a href="#horarios" className="hover:text-teal-400 transition-colors">
              Horarios & Contacto
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
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-lg shadow-teal-950 transition-all hover:scale-105"
                >
                  <span>Agendar Cita</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(20,184,166,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-300">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span>Plataforma Médica Conectada 24/7</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Cuidado médico de excelencia a tu alcance.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Agenda tu consulta médica online con los mejores especialistas de manera rápida y segura. Gestión de turnos, confirmación en tiempo real y atención humanizada.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href={user ? '/dashboard' : '/login'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-xl shadow-teal-900/50 hover:scale-105 transition-all text-base"
              >
                <Calendar className="h-5 w-5" />
                <span>Reservar Cita Ahora</span>
              </Link>
              <a
                href="#doctores"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:text-white transition-all text-base"
              >
                <span>Conocer Especialistas</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Badges de Confianza */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <CheckCircle2 className="h-5 w-5 text-teal-400 mb-1" />
                <h4 className="font-bold text-white text-sm">Reserva Inmediata</h4>
                <p className="text-xs text-slate-400">Sin filas ni esperas</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <UserCheck className="h-5 w-5 text-teal-400 mb-1" />
                <h4 className="font-bold text-white text-sm">Médicos Expertos</h4>
                <p className="text-xs text-slate-400">Profesionales certificados</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <ShieldCheck className="h-5 w-5 text-teal-400 mb-1" />
                <h4 className="font-bold text-white text-sm">Seguridad Total</h4>
                <p className="text-xs text-slate-400">Datos médicos cifrados</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <Clock className="h-5 w-5 text-teal-400 mb-1" />
                <h4 className="font-bold text-white text-sm">Horarios Flexibles</h4>
                <p className="text-xs text-slate-400">Atención de Lun a Sáb</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Especialidades Médicas */}
      <section id="especialidades" className="py-20 bg-slate-900/40 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Cobertura Clínica Integral
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Especialidades Médicas
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Disponemos de distintas ramas médicas para brindarte un diagnóstico oportuno y un plan de tratamiento adaptado a tus necesidades.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-2xl bg-slate-900/80 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {specialties.map((spec) => {
                const isSelected = selectedSpecialty === spec.id;
                return (
                  <div
                    key={spec.id}
                    onClick={() => setSelectedSpecialty(isSelected ? null : spec.id)}
                    className={`cursor-pointer rounded-2xl p-6 border transition-all duration-200 group ${
                      isSelected
                        ? 'bg-teal-950/30 border-teal-500 shadow-lg shadow-teal-900/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-105 transition-transform">
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
                      <span>{isSelected ? 'Mostrando médicos' : 'Ver doctores'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Sección Staff Médico */}
      <section id="doctores" className="py-20">
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
                Conoce a nuestros médicos certificados, consulta sus horarios y reserva tu turno directamente.
              </p>
            </div>

            {selectedSpecialty && (
              <button
                onClick={() => setSelectedSpecialty(null)}
                className="text-xs font-medium text-teal-400 hover:underline"
              >
                Limpiar filtro de especialidad
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((n) => (
                <div key={n} className="h-64 rounded-2xl bg-slate-900/80 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
              No hay médicos asignados a esta especialidad por el momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl p-6 bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-lg">
                        {doc.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white">{doc.fullName}</h3>
                        <p className="text-xs text-teal-400 font-medium">
                          {doc.specialty?.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-amber-400 font-bold text-xs flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {doc.averageRating && doc.averageRating > 0 ? doc.averageRating.toFixed(1) : 'Nuevo'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {doc.reviewCount && doc.reviewCount > 0
                              ? `(${doc.reviewCount} ${doc.reviewCount === 1 ? 'reseña' : 'reseñas'})`
                              : '(Sin reseñas)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Colegiatura: <span className="font-mono text-slate-300">{doc.licenseNumber}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Tarifa Consulta</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        ${doc.consultationFee.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                      {doc.bio}
                    </p>
                  )}

                  {/* Horarios de Atención */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-teal-400" />
                      Días y Horarios de Atención:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {doc.schedules.length > 0 ? (
                        doc.schedules.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            <span className="font-bold text-teal-300">{getDayName(s.dayOfWeek)}</span>: {s.startTime} - {s.endTime}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">Horarios a coordinar</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={user ? `/dashboard?doctorId=${doc.id}` : `/login?redirect=/dashboard`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-950"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Agendar Cita con este Especialista</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer Institucional */}
      <footer id="horarios" className="bg-slate-900 border-t border-slate-800/80 pt-16 pb-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <HeartPulse className="h-6 w-6 text-teal-400" />
                <span>Clínica San Rafael</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Comprometidos con la salud y bienestar integral de tu familia a través de innovación médica y atención humana de excelencia.
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
    </div>
  );
}
