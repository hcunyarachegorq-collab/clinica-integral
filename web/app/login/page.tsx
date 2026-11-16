'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HeartPulse,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Shield,
  Stethoscope,
  User,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-teal-500 selection:text-white">
      {/* Botón Volver */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 items-center justify-center text-teal-400 shadow-xl shadow-teal-500/10 mb-2">
            <HeartPulse className="h-7 w-7 text-teal-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ingresa a tu cuenta para gestionar citas médicas y consultas
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@clinica.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white shadow-lg shadow-teal-900/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Tarjeta de Acceso Rápido Demo */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block text-center">
              Acceso Rápido Demo (Pruebas)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin@clinica.com', 'Admin123!')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition-all group"
                title="Admin: admin@clinica.com"
              >
                <Shield className="h-4 w-4 text-purple-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-300 block">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('dr.garcia@clinica.com', 'Doctor123!')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition-all group"
                title="Doctor: dr.garcia@clinica.com"
              >
                <Stethoscope className="h-4 w-4 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-300 block">Médico</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('paciente@clinica.com', 'Paciente123!')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition-all group"
                title="Paciente: paciente@clinica.com"
              >
                <User className="h-4 w-4 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-300 block">Paciente</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enlace de Registro */}
        <p className="text-center text-xs text-slate-400">
          ¿Aún no tienes cuenta?{' '}
          <Link
            href="/register"
            className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-4"
          >
            Regístrate como nuevo paciente
          </Link>
        </p>
      </div>
    </div>
  );
}
