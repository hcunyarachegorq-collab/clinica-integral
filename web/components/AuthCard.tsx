'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  UserPlus,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Stethoscope,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';

export interface AuthCardProps {
  initialMode?: 'login' | 'register';
}

export function AuthCard({ initialMode = 'login' }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sincronizar si viene por query param ?mode=register
  useEffect(() => {
    const qMode = searchParams?.get('mode');
    if (qMode === 'register') setMode('register');
    else if (qMode === 'login') setMode('login');
  }, [searchParams]);

  // Estados de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Estados de Registro
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // Estados comunes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoAccordion, setShowDemoAccordion] = useState(false);

  // Cargar credenciales recordadas si existen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('clinica_remember_email');
      if (savedEmail) {
        setLoginEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  const handleToggleMode = (newMode: 'login' | 'register') => {
    setErrorMessage(null);
    setMode(newMode);
  };

  // Manejar Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('clinica_remember_email', loginEmail.trim());
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('clinica_remember_email');
      }

      toast.success('¡Bienvenido(a)!', `Hola ${loggedUser.fullName}, sesión iniciada con éxito.`);

      // Redirección inteligente por rol
      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'DOCTOR' || loggedUser.role === 'RECEPTIONIST') {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'No se pudo iniciar sesión. Verifica tus credenciales.';
      setErrorMessage(msg);
      toast.error('Error de Acceso', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (registerPassword !== registerConfirmPassword) {
      const msg = 'Las contraseñas no coinciden.';
      setErrorMessage(msg);
      toast.warning('Validación', msg);
      return;
    }

    if (registerPassword.length < 6) {
      const msg = 'La contraseña debe contener al menos 6 caracteres.';
      setErrorMessage(msg);
      toast.warning('Validación', msg);
      return;
    }

    setIsSubmitting(true);

    try {
      const newUser = await register({
        fullName: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        phone: registerPhone.trim() || undefined,
      });

      toast.success('¡Cuenta Creada!', `Bienvenido a Clínica Integral, ${newUser.fullName}`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Error al procesar el registro del paciente.';
      setErrorMessage(msg);
      toast.error('Error de Registro', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Autocompletar credenciales de prueba demo
  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setLoginEmail(demoEmail);
    setLoginPassword(demoPass);
    setErrorMessage(null);
    toast.info('Credencial Demo', `Usuario ${demoEmail} cargado`);
  };

  return (
    <div className="min-h-screen bg-[#E8F0F7] flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* ========================================================== */}
      {/* ESFERAS 3D VOLUMÉTRICAS SUAVES DE FONDO                   */}
      {/* ========================================================== */}
      {/* Esfera 1: Azul Médico (Superior Izquierda) */}
      <motion.div
        animate={{
          y: [0, -18, 0],
          x: [0, 10, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-24 -left-24 w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full sphere-3d-blue pointer-events-none z-0 opacity-90"
      />

      {/* Esfera 2: Teal Pastel Clínico (Inferior Derecha) */}
      <motion.div
        animate={{
          y: [0, 20, 0],
          x: [0, -12, 0],
          scale: [1, 1.04, 1],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-28 -right-28 w-80 h-80 sm:w-[400px] sm:h-[400px] rounded-full sphere-3d-teal pointer-events-none z-0 opacity-85"
      />

      {/* Esfera 3: Perla Suave Translúcida (Superior Derecha / Centro) */}
      <motion.div
        animate={{
          y: [0, -12, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-10 -right-16 w-52 h-52 sm:w-64 sm:h-64 rounded-full sphere-3d-pearl pointer-events-none z-0 opacity-80"
      />

      {/* Barra de Navegación Superior */}
      <header className="w-full max-w-md pt-2 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors py-1.5 px-3 rounded-full neu-button border border-white/80 active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-sky-600" />
          <span>Volver al inicio</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900 tracking-wider">
          <HeartPulse className="h-4 w-4 text-teal-600 animate-pulse" />
          <span className="hidden sm:inline">CLÍNICA INTEGRAL</span>
        </div>
      </header>

      {/* ========================================================== */}
      {/* TARJETA NEUMÓRFICA CENTRAL CON TRANSICIÓN 3D FLIP          */}
      {/* ========================================================== */}
      <main className="w-full max-w-md my-auto py-6 z-10" style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            /* ====================================================== */
            /* FORMULARIO DE INICIO DE SESIÓN                         */
            /* ====================================================== */
            <motion.div
              key="login-card"
              initial={{ rotateY: -75, opacity: 0, scale: 0.95 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: 75, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="neu-card rounded-[28px] border border-white/80 p-7 sm:p-9 relative backdrop-blur-sm"
            >
              {/* Icono Superior en Relieve */}
              <div className="w-16 h-16 rounded-2xl neu-relief border border-white/80 mx-auto flex items-center justify-center mb-4 text-sky-600">
                <Lock className="w-7 h-7 text-sky-600" />
              </div>

              {/* Título de la Tarjeta */}
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-wider uppercase">
                  Iniciar Sesión
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Portal Seguro de Pacientes y Personal Médico
                </p>
              </div>

              {/* Mensaje de Error */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-sm">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Formulario Login */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Campo Correo */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Correo Electrónico"
                      className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full bg-transparent pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-sky-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Fila Recordarme */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                    />
                    <span>Recordarme</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => toast.info('Soporte de Recuperación', 'Comunícate con recepción o soporte técnico para restablecer tu contraseña.')}
                    className="text-sky-600 hover:text-sky-800 font-semibold"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Botón Principal Login */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 neu-button border border-white/80 rounded-2xl py-3.5 px-6 font-extrabold text-xs sm:text-sm tracking-wider uppercase text-sky-600 transition-all duration-300 hover:bg-gradient-to-r hover:from-sky-600 hover:to-teal-600 hover:text-white hover:shadow-lg hover:shadow-sky-600/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-current" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Ingresar al Sistema</span>
                  )}
                </button>
              </form>

              {/* Botón Circular de Cambio Animado a Registro */}
              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  ¿No tienes una cuenta?
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleMode('register')}
                  className="neu-circle-btn w-11 h-11 rounded-full border border-white/80 flex items-center justify-center text-sky-600 hover:text-teal-600 hover:scale-105 active:scale-95 transition-all group"
                  title="Crear cuenta de paciente"
                >
                  <Plus className="h-5 w-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Acordeón Sutil de Accesos Rápidos Demo */}
              <div className="mt-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDemoAccordion(!showDemoAccordion)}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-sky-600 transition-colors uppercase tracking-wider"
                >
                  <Sparkles className="h-3 w-3 text-teal-500" />
                  <span>{showDemoAccordion ? 'Ocultar Accesos de Prueba' : 'Credenciales Demo de Prueba'}</span>
                </button>

                {showDemoAccordion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-3 gap-2 mt-3 pt-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('admin@clinica.com', 'Admin123!')}
                      className="neu-pill p-2 rounded-xl border border-white/70 text-center transition-all group"
                      title="Admin"
                    >
                      <Shield className="h-3.5 w-3.5 text-purple-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-700 block">Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('dr.garcia@clinica.com', 'Doctor123!')}
                      className="neu-pill p-2 rounded-xl border border-white/70 text-center transition-all group"
                      title="Doctor"
                    >
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-700 block">Médico</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('paciente@clinica.com', 'Paciente123!')}
                      className="neu-pill p-2 rounded-xl border border-white/70 text-center transition-all group"
                      title="Paciente"
                    >
                      <User className="h-3.5 w-3.5 text-teal-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-700 block">Paciente</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ====================================================== */
            /* FORMULARIO DE REGISTRO DE PACIENTE                     */
            /* ====================================================== */
            <motion.div
              key="register-card"
              initial={{ rotateY: 75, opacity: 0, scale: 0.95 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: -75, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="neu-card rounded-[28px] border border-white/80 p-7 sm:p-9 relative backdrop-blur-sm"
            >
              {/* Icono Superior en Relieve */}
              <div className="w-16 h-16 rounded-2xl neu-relief border border-white/80 mx-auto flex items-center justify-center mb-4 text-teal-600">
                <UserPlus className="w-7 h-7 text-teal-600" />
              </div>

              {/* Título de la Tarjeta */}
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-wider uppercase">
                  Crear Cuenta
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Registro de Nuevo Paciente en Clínica Integral
                </p>
              </div>

              {/* Mensaje de Error */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-sm">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Formulario Registro */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Nombre Completo */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Nombre y Apellidos"
                      className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Correo Electrónico"
                      className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Teléfono (Opcional) */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="Teléfono móvil (Opcional)"
                      className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Contraseña (mín. 6 caracteres)"
                      className="w-full bg-transparent pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-teal-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-1">
                  <div className="relative neu-inset rounded-2xl border border-white/60 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                    <CheckCircle className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      required
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder="Confirmar Contraseña"
                      className="w-full bg-transparent pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 font-medium outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-teal-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Botón Principal Registro */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 neu-button border border-white/80 rounded-2xl py-3.5 px-6 font-extrabold text-xs sm:text-sm tracking-wider uppercase text-teal-600 transition-all duration-300 hover:bg-gradient-to-r hover:from-teal-600 hover:to-sky-600 hover:text-white hover:shadow-lg hover:shadow-teal-600/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-current" />
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    <span>Crear Cuenta</span>
                  )}
                </button>
              </form>

              {/* Botón Circular de Retorno Animado a Login */}
              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  ¿Ya tienes una cuenta?
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleMode('login')}
                  className="neu-circle-btn w-11 h-11 rounded-full border border-white/80 flex items-center justify-center text-teal-600 hover:text-sky-600 hover:scale-105 active:scale-95 transition-all group"
                  title="Volver a Iniciar Sesión"
                >
                  <ArrowLeft className="h-5 w-5 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform duration-300" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Pie de Página */}
      <footer className="w-full max-w-md pb-2 text-center text-[11px] text-slate-500 font-medium z-10">
        © {new Date().getFullYear()} Clínica Integral • Seguridad y Atención Médica de Excelencia
      </footer>
    </div>
  );
}
