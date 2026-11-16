'use client';

import React from 'react';

export function SkeletonCard({ className = '', height = 'h-32' }: { className?: string; height?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4 animate-pulse ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-800" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded bg-slate-800" />
          <div className="h-3 w-1/2 rounded bg-slate-800/60" />
        </div>
      </div>
      <div className={`w-full rounded-xl bg-slate-800/40 ${height}`} />
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <div className="h-4 w-20 rounded bg-slate-800" />
        <div className="h-8 w-24 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-slate-800" />
            <div className="h-3 w-24 rounded bg-slate-800/60" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-slate-800" />
      </div>

      <div className="space-y-2 py-1">
        <div className="h-3 w-full rounded bg-slate-800/50" />
        <div className="h-3 w-4/5 rounded bg-slate-800/50" />
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
        <div className="h-3 w-28 rounded bg-slate-800/60" />
        <div className="h-3 w-40 rounded bg-slate-800/40" />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="h-6 w-20 rounded bg-slate-800" />
        <div className="h-10 w-32 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="rounded-2xl p-5 bg-slate-900/60 border border-slate-800 space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="h-3 w-28 rounded bg-slate-800/60" />
          <div className="h-3 w-48 rounded bg-slate-800/40" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-6 w-20 rounded-full bg-slate-800" />
          <div className="h-6 w-16 rounded-full bg-slate-800/60" />
        </div>
      </div>
      <div className="h-12 w-full rounded-xl bg-slate-950/70 border border-slate-800/60" />
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="h-8 w-32 rounded-xl bg-slate-800/60" />
        <div className="h-8 w-24 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}
