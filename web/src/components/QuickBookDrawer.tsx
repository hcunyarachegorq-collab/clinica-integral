'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Lock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarOff,
  Sparkles,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { api, Doctor, AvailableSlotsResponse } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface QuickBookDrawerProps {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: () => void;
}

export function QuickBookDrawer({
  doctor,
  isOpen,
  onClose,
  onBookingSuccess,
}: QuickBookDrawerProps) {
  const { user, login, register } = useAuth();
  const toast = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado para autenticación integrada dentro del drawer
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Cargar turnos disponibles al cambiar doctor o fecha
  useEffect(() => {
    if (!doctor || !selectedDate || !isOpen) {
      setSlotsData(null);
      setSelectedSlot('');
      return;
    }

    let isMounted = true;
    async function fetchSlots() {
      setLoadingSlots(true);
      setErrorMsg(null);
      setSelectedSlot('');
      try {
        const res = await api.getDoctorAvailableSlots(doctor!.id, selectedDate);
        if (isMounted) {
          setSlotsData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Error al obtener horarios del especialista');
          setSlotsData(null);
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    }

    fetchSlots();

    return () => {
      isMounted = false;
    };
  }, [doctor, selectedDate, isOpen]);

  if (!isOpen || !doctor) return null;

  const handleBooking = async (activeUserId?: string) => {
    if (!selectedDate || !selectedSlot) {
      setErrorMsg('Por favor selecciona una fecha y un horario disponible.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Por favor describe brevemente el motivo de tu consulta.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedSlot}:00Z`).toISOString();
      await api.createAppointment({
        doctorId: doctor.id,
        scheduledAt: scheduledDateTime,
        reason: reason.trim(),
        patientId: activeUserId,
      });

      toast.success(
        '¡Cita Agendada con Éxito!',
        `Tu cita con el Dr. ${doctor.fullName} ha sido registrada para el ${selectedDate} a las ${selectedSlot}.`
      );

      onClose();
      if (onBookingSuccess) {
        onBookingSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al confirmar la cita médica');
      toast.error('Error al agendar', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineAuthAndBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMsg('Primero elige un horario disponible arriba.');
      return;
    }

    setAuthSubmitting(true);
    setErrorMsg(null);

    try {
      let loggedUser;
      if (authMode === 'login') {
        loggedUser = await login({
          email: authEmail.trim(),
          password: authPassword,
        });
        toast.info('Sesión Iniciada', `Hola de nuevo, ${loggedUser.fullName}`);
      } else {
        if (!authFullName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo');
        }
        loggedUser = await register({
          fullName: authFullName.trim(),
          email: authEmail.trim(),
          password: authPassword,
          phone: authPhone.trim() || undefined,
        });
        toast.success('Cuenta Creada', `Bienvenido(a), ${loggedUser.fullName}`);
      }

      // Proceder de inmediato con la reserva
      await handleBooking(loggedUser.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la autenticación');
      toast.error('Error', err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Fondo oscuro con desenfoque */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        aria-hidden="true"
      />

      {/* Panel lateral deslizante */}
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Cabecera del Drawer */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300 font-bold text-lg">
              {doctor.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20">
                  {doctor.specialty?.name || 'Especialidad'}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  ${doctor.consultationFee.toFixed(2)}
                </span>
              </div>
              <h3 className="font-bold text-base text-white mt-1">{doctor.fullName}</h3>
              <p className="text-xs text-slate-400">CMP: {doctor.licenseNumber}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Selección de Fecha */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              1. Selecciona la Fecha de Atención
            </label>
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-all font-mono"
            />
          </div>

          {/* 2. Horarios Disponibles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                2. Horarios Disponibles en Vivo
              </label>
              {loadingSlots && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />}
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                <span>Calculando turnos disponibles...</span>
              </div>
            ) : slotsData?.blocked ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <CalendarOff className="h-4 w-4 text-amber-400" />
                  <span>Día No Laborable</span>
                </div>
                <p>El especialista no atenderá en la fecha seleccionada.</p>
                {slotsData.reason && (
                  <p className="text-[11px] text-amber-300/80 italic">Motivo: &ldquo;{slotsData.reason}&rdquo;</p>
                )}
              </div>
            ) : slotsData?.slots && slotsData.slots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slotsData.slots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-semibold transition-all text-center ${
                        isSelected
                          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30 scale-105 border border-teal-400'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-teal-500/50'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                No hay turnos disponibles para este día según el horario regular del médico.
              </div>
            )}
          </div>

          {/* 3. Motivo de Consulta */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
              3. Motivo de la Consulta
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe tus síntomas o el motivo de tu visita médica..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all resize-none"
            />
          </div>

          {/* 4. Estado de Autenticación */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            {user ? (
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs flex items-center justify-between text-teal-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-400" />
                  <div>
                    <span className="font-bold text-white block">{user.fullName}</span>
                    <span className="text-[11px] text-teal-300">Sesión activa ({user.email})</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold uppercase">
                  {user.role}
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-bold text-white">Paso Final: Identificación</span>
                  </div>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        authMode === 'login'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Ingresar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        authMode === 'register'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Registrarme
                    </button>
                  </div>
                </div>

                <form onSubmit={handleInlineAuthAndBook} className="space-y-3">
                  {authMode === 'register' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">Nombre Completo</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                          <input
                            type="text"
                            required
                            value={authFullName}
                            onChange={(e) => setAuthFullName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">Teléfono (Opcional)</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                          <input
                            type="tel"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            placeholder="Ej. 987654321"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting || !selectedSlot}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2 transition-all"
                  >
                    {authSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Autenticando y confirmando cita...</span>
                      </>
                    ) : (
                      <>
                        {authMode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        <span>{authMode === 'login' ? 'Ingresar y Confirmar Cita' : 'Registrarme y Confirmar Cita'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Botón inferior para usuario ya autenticado */}
        {user && (
          <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleBooking()}
              disabled={submitting || !selectedSlot || !selectedDate}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white shadow-lg shadow-teal-900/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Confirmar y Agendar Cita</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
