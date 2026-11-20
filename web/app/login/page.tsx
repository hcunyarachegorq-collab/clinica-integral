'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthCard } from '../../components/AuthCard';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#E8F0F7] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <AuthCard initialMode="login" />
    </Suspense>
  );
}
