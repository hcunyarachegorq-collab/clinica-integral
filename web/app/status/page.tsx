'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Database,
  Server,
  Smartphone,
  RefreshCw,
  Layers,
  HeartPulse,
  Clock,
  Zap,
  ArrowLeft,
} from 'lucide-react';

interface HealthResponse {
  status: string;
  database: string;
  timestamp?: string;
  uptimeSeconds?: number;
  error?: string;
}

export default function StatusPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        cache: 'no-store',
      });
      const data: HealthResponse = await response.json();
      const endTime = performance.now();

      setLatency(Math.round(endTime - startTime));
      setHealthData(data);
      setLastCheck(new Date().toLocaleTimeString());

      if (!response.ok || data.status !== 'ok') {
        setError(data.error || 'La API devolvió un estado no saludable.');
      }
    } catch (err: any) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setError(
        err.message ||
          'No se pudo conectar con el Backend API. Verifica que el contenedor esté activo en el puerto 4000.'
      );
      setHealthData(null);
      setLastCheck(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const isApiConnected = !loading && healthData?.status === 'ok';
  const isDbConnected = !loading && healthData?.database === 'connected';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10">
      {/* Navbar Superior */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            title="Volver a la Clínica"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-lg shadow-teal-500/10">
            <HeartPulse className="h-7 w-7 animate-pulse text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Telemetría y Estado del Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Arquitectura Monorepo Médica • Diagnóstico de Conectividad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
            <Layers className="h-3.5 w-3.5 text-teal-400" />
            Docker Compose v3.8
          </span>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all text-white shadow-md shadow-teal-900/40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Comprobando...' : 'Reverificar'}
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="max-w-6xl w-full mx-auto my-10 space-y-8">
        {/* Banner de Bienvenida */}
        <section className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Diagnóstico de Infraestructura en Tiempo Real
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Estado de los Microservicios
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Monitoreo activo del portal Web (Next.js), el microservicio Backend (Express + TypeScript) y la base de datos relacional (PostgreSQL + Prisma ORM).
            </p>
          </div>
        </section>

        {/* Tarjetas de Estado Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta: Estado Backend API */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden transition-all hover:border-slate-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Backend API</h3>
                  <p className="text-xs text-slate-400">Node.js + Express + TypeScript</p>
                </div>
              </div>

              {loading ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Verificando...
                </span>
              ) : isApiConnected ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  En línea
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="h-3.5 w-3.5" />
                  Sin conexión
                </span>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-sm">
              <div className="flex justify-between items-center text-slate-400">
                <span>Ruta Endpoint:</span>
                <code className="text-xs bg-slate-950 px-2 py-0.5 rounded text-teal-300 font-mono">
                  GET {apiUrl}/api/health
                </code>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Puerto contenedor:</span>
                <span className="text-slate-200 font-medium">4000:4000</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Tiempo de respuesta:</span>
                <span className="text-slate-200 font-medium flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  {latency !== null ? `${latency} ms` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta: Estado Base de Datos */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden transition-all hover:border-slate-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Base de Datos</h3>
                  <p className="text-xs text-slate-400">PostgreSQL 16 Alpine + Prisma ORM</p>
                </div>
              </div>

              {loading ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Verificando...
                </span>
              ) : isDbConnected ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conectada
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="h-3.5 w-3.5" />
                  Desconectada
                </span>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-sm">
              <div className="flex justify-between items-center text-slate-400">
                <span>Base de Datos:</span>
                <span className="text-teal-300 font-mono text-xs">clinica_db</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Puerto host/contenedor:</span>
                <span className="text-slate-200 font-medium">5432:5432</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Persistencia:</span>
                <span className="text-slate-200 font-medium">Volumen postgres_data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalle Técnico de la Respuesta API */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              Telemetría de la Respuesta HTTP
            </h3>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Última verificación: {lastCheck || 'Consultando...'}
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <p className="font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                Error de conexión reportado:
              </p>
              <p className="mt-1 font-mono text-xs text-rose-200">{error}</p>
            </div>
          )}

          <div className="relative">
            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800/70">
              {JSON.stringify(
                healthData || {
                  status: loading ? 'checking' : 'error',
                  database: loading ? 'checking' : 'disconnected',
                  message: error || 'Consultando backend...',
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Sistema Clínico Integral © {new Date().getFullYear()} • Diagnóstico técnico de microservicios.
      </footer>
    </main>
  );
}
