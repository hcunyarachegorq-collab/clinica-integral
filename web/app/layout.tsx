import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../src/context/AuthContext';

export const metadata: Metadata = {
  title: 'Sistema Clínico Integral | Centro Médico',
  description: 'Plataforma integral para gestión clínica médica, citas e historias clínicas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="antialiased selection:bg-teal-500 selection:text-white bg-slate-950 text-slate-100 min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
