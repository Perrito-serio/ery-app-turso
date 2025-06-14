// src/app/page.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader'; // Importamos el header público

// --- Iconos para la sección de características (pueden ser reutilizados o movidos) ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-400"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-400"><path d="M15.75 2.25a.75.75 0 01.75.75v.75h-7.5V3a.75.75 0 01.75-.75h4.5z" /><path fillRule="evenodd" d="M4.5 3.75A.75.75 0 015.25 3h13.5a.75.75 0 01.75.75v9a.75.75 0 01-.75.75h-6.375a3 3 0 00-3 3v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5a3 3 0 00-3-3H5.25a.75.75 0 01-.75-.75v-9zM15 4.5v1.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75V4.5h6z" clipRule="evenodd" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-400"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.052A9.75 9.75 0 0118.635 8.25H17.25a.75.75 0 000 1.5h3a.75.75 0 00.75-.75V6a.75.75 0 00-1.5 0v1.127a11.252 11.252 0 00-9.865-6.872.75.75 0 00-.61 1.031Zm-2.033 18.428a.75.75 0 001.071-1.052A9.75 9.75 0 015.365 15.75H6.75a.75.75 0 000-1.5h-3a.75.75 0 00-.75.75V18a.75.75 0 001.5 0v-1.127a11.252 11.252 0 009.865 6.872.75.75 0 00.61-1.031Z" clipRule="evenodd" /></svg>;


export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  // Redirigir al usuario a su dashboard si ya ha iniciado sesión
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/my-dashboard');
    }
  }, [status, router]);

  // Mostrar un loader mientras se determina el estado de la sesión,
  // para evitar un "parpadeo" de la landing page antes de redirigir.
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Si no está autenticado, mostrar la Landing Page
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <PublicHeader />
      <main>
        {/* Sección Hero */}
        <section className="h-screen flex items-center justify-center text-center bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(17, 24, 39, 0.8), rgba(17, 24, 39, 1)), url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop)' }}>
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Transforma tus Hábitos, <span className="text-indigo-400">Eleva tu Vida.</span>
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              "Ery" es tu compañero digital para construir rutinas positivas, superar malos hábitos y gamificar tu progreso personal.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-block px-10 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition-transform duration-300"
              >
                ¡Es hora de empezar!
              </Link>
              <p className="mt-3 text-sm text-gray-400">Crea tu primer hábito en menos de un minuto.</p>
            </div>
          </div>
        </section>

        {/* Sección de Características - Placeholder */}
        <section className="py-20 bg-gray-800">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold mb-10">Todo lo que necesitas para tu superación</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="p-6">
                        <CheckCircleIcon />
                        <h3 className="text-xl font-semibold mt-4">Seguimiento de Hábitos</h3>
                        <p className="text-gray-400 mt-2">Define y sigue hábitos de Sí/No o medibles para construir rutinas sólidas.</p>
                    </div>
                    <div className="p-6">
                        <ShieldCheckIcon />
                        <h3 className="text-xl font-semibold mt-4">Supera Adicciones</h3>
                        <p className="text-gray-400 mt-2">Mantén un registro de tus rachas de abstinencia y mantente motivado.</p>
                    </div>
                    <div className="p-6">
                        <TrophyIcon />
                        <h3 className="text-xl font-semibold mt-4">Gamifica tu Progreso</h3>
                        <p className="text-gray-400 mt-2">Sube de nivel y desbloquea logros a medida que alcanzas tus metas.</p>
                    </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}
