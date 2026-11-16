'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => showToast('success', title, message, duration),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => showToast('error', title, message, duration),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => showToast('info', title, message, duration),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => showToast('warning', title, message, duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      {/* Contenedor flotante de toasts */}
      <aside aria-label="Notificaciones del sistema" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/30'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-100 shadow-rose-950/30'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-amber-100 shadow-amber-950/30'
                : 'bg-slate-900/95 border-sky-500/40 text-sky-100 shadow-sky-950/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-1.5 rounded-xl flex-shrink-0 ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : toast.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400'
                    : toast.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-sky-500/20 text-sky-400'
                }`}
              >
                {toast.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
                {toast.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                {toast.type === 'info' && <Info className="h-5 w-5" />}
              </div>

              <div className="flex-1 pr-2 space-y-0.5">
                <h5 className="font-bold text-sm text-white leading-tight">{toast.title}</h5>
                {toast.message && (
                  <p className="text-xs text-slate-300 leading-relaxed">{toast.message}</p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Barra de progreso inferior animada */}
            {toast.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                <div
                  className={`h-full ${
                    toast.type === 'success'
                      ? 'bg-emerald-500'
                      : toast.type === 'error'
                      ? 'bg-rose-500'
                      : toast.type === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                  style={{
                    animation: `shrinkWidth ${toast.duration}ms linear forwards`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}
