'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Clock,
  Tv,
  Calendar,
  Sparkles,
  Stethoscope,
  Activity,
  ArrowRight,
  Maximize,
  Minimize,
} from 'lucide-react';
import { api, WaitingRoomData, WaitingRoomItem } from '../../src/lib/api';

export default function WaitingRoomPage() {
  const [data, setData] = useState<WaitingRoomData>({
    timestamp: new Date().toISOString(),
    stats: { calledCount: 0, waitingCount: 0 },
    called: [],
    waiting: [],
  });
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastCalledIdRef = useRef<string | null>(null);

  // Sintetizador Web Audio API nativo para timbre de llamado hospitalario (sin archivos externos)
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Acorde mayor brillante)
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.0);
      });
    } catch (err) {
      console.warn('No se pudo reproducir el timbre sonoro:', err);
    }
  }, []);

  // Carga de turnos en sala de espera
  const fetchWaitingRoom = useCallback(async () => {
    try {
      const res = await api.getWaitingRoom();
      setData(res);

      // Si hay un llamado nuevo o más reciente y el sonido está activado
      if (res.called.length > 0) {
        const topCalled = res.called[0];
        if (lastCalledIdRef.current && lastCalledIdRef.current !== topCalled.id) {
          if (soundEnabled) {
            playChime();
          }
        }
        lastCalledIdRef.current = topCalled.id;
      }
    } catch (err) {
      console.error('Error al cargar turnos de sala de espera:', err);
    } finally {
      setLoading(false);
    }
  }, [playChime, soundEnabled]);

  // Reloj digital en vivo a 1 segundo
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Polling automático cada 8 segundos para pantalla de sala de espera en TV
  useEffect(() => {
    fetchWaitingRoom();
    const pollTimer = setInterval(fetchWaitingRoom, 8000);
    return () => clearInterval(pollTimer);
  }, [fetchWaitingRoom]);

  // Manejo de pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentCalled = data.called[0];
  const otherCalled = data.called.slice(1, 4);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans relative">
      {/* Fondo con brillo ambiental sutil */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ============================================================== */}
      {/* ENCABEZADO SUPERIOR DE LA SALA DE ESPERA (TV HEADER)           */}
      {/* ============================================================== */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Identidad de la Clínica */}
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-teal-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              CLÍNICA INTEGRAL
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                Sala de Espera
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Panel de Llamado y Turnos Médicos en Vivo</p>
          </div>
        </div>

        {/* Indicador de Transmisión en Vivo */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          TRANSMISIÓN EN VIVO
        </div>

        {/* Controles de Sonido, Pantalla Completa y Reloj Digital */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playChime();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              soundEnabled
                ? 'bg-teal-600/20 text-teal-300 border-teal-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Activar o silenciar timbre de llamado"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-teal-400" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sonido Activado' : 'Activar Timbre'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-all"
            title="Pantalla Completa TV"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          {/* Reloj Digital en Vivo */}
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
            <Clock className="h-4 w-4 text-cyan-400" />
            <div className="text-right">
              <span className="font-mono text-base font-bold text-white tracking-widest block leading-none">
                {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mt-0.5">
                {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* CUERPO PRINCIPAL: 2 COLUMNAS (LLAMADO ACTUAL + PRÓXIMOS TURNOS)*/}
      {/* ============================================================== */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* COLUMNA IZQUIERDA (7 COLS): LLAMANDO AHORA / EN CONSULTORIO */}
        <section className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-400 animate-pulse" />
              <h2 className="text-lg font-extrabold uppercase tracking-wider text-slate-200">
                Llamando Ahora / En Consultorio
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              {data.stats.calledCount} en atención
            </span>
          </div>

          {currentCalled ? (
            <motion.div
              key={currentCalled.id + (currentCalled.calledAt || '')}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-teal-950/40 border-2 border-teal-500/50 p-6 md:p-8 shadow-2xl shadow-teal-950/50 flex-1 flex flex-col justify-between"
            >
              {/* Resplandor animado de llamada */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
                    Turno Prioritario
                  </span>

                  <span className="text-xs font-mono text-slate-400">
                    Llamado:{' '}
                    {currentCalled.calledAt
                      ? new Date(currentCalled.calledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                      : 'Ahora'}
                  </span>
                </div>

                {/* Código de Turno Gigante */}
                <div className="my-3">
                  <span className="text-5xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-white font-mono tracking-tight drop-shadow-md">
                    {currentCalled.queueCode}
                  </span>
                </div>

                {/* Nombre del Paciente */}
                <div className="space-y-1 mt-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Paciente:</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {currentCalled.patientName}
                  </h3>
                </div>
              </div>

              {/* Destino: Consultorio y Especialista */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Especialista:</span>
                  <p className="text-base font-bold text-slate-200">{currentCalled.doctorName}</p>
                  <p className="text-xs text-teal-400 font-semibold">{currentCalled.specialty}</p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/40 shadow-inner text-right sm:text-center self-start sm:self-auto">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 block mb-0.5">
                    Diríjase a:
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white font-mono block">
                    {currentCalled.consultingRoom}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
              <Tv className="h-16 w-16 text-slate-700 animate-pulse" />
              <div className="space-y-1 max-w-sm">
                <h3 className="text-lg font-bold text-slate-300">Sala en Espera de Llamados</h3>
                <p className="text-xs text-slate-400">
                  Los médicos están atendiendo en sus consultorios. Su turno aparecerá aquí en cuanto sea llamado.
                </p>
              </div>
            </div>
          )}

          {/* Tarjetas secundarias de otros pacientes llamados */}
          {otherCalled.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Otros Consultorios en Atención:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {otherCalled.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black font-mono text-teal-400">{app.queueCode}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {app.consultingRoom}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate">{app.patientName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{app.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* COLUMNA DERECHA (5 COLS): PRÓXIMOS TURNOS EN ESPERA */}
        <section className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-extrabold uppercase tracking-wider text-slate-200">
                Próximos Turnos en Espera
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              {data.waiting.length} en fila
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1 no-scrollbar">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : data.waiting.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                <Sparkles className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No hay turnos pendientes en espera por el momento.</p>
              </div>
            ) : (
              <AnimatePresence>
                {data.waiting.map((app, idx) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-black text-cyan-300 text-lg shadow-inner">
                        {app.queueCode}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-white block">{app.patientName}</span>
                        <span className="text-xs text-slate-400 block">{app.specialty}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                        {app.scheduledAt
                          ? new Date(app.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {app.consultingRoom}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Mensaje de orientación al paciente */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/30 text-cyan-300/80 text-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
              <ArrowRight className="h-4 w-4" />
            </div>
            <span>
              Por favor manténgase en la sala principal y observe la pantalla. Su turno será llamado por audio y video.
            </span>
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* CINTA INFORMATIVA INFERIOR (MARQUEE / TICKER CONTINUO)         */}
      {/* ============================================================== */}
      <footer className="bg-slate-900/90 border-t border-slate-800/80 py-2.5 px-4 overflow-hidden flex items-center gap-4">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-400 px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/20 shrink-0">
          Avisos
        </span>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <p className="animate-marquee inline-block text-xs text-slate-300 font-medium">
            Por favor acérquese a su consultorio asignado tan pronto vea su código de turno en pantalla • Recuerde tener
            a la mano su documento de identidad • Para atención de urgencias y procedimientos diríjase directamente a
            Tópico • Horario de Botica Interna: 07:00 a 21:00 hrs • Clínica Integral: Cuidando de tu salud con
            excelencia y calidez humana.
          </p>
        </div>
      </footer>
    </div>
  );
}
