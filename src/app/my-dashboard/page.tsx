// src/app/my-dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import ActivityCalendar from '@/components/ActivityCalendar'; // 1. Componente importado

// --- Interfaces ---
interface HabitWithStats {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: Date;
  racha_actual: number;
}

// --- Iconos ---
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-400"><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v9.375c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75zM6 13.125c-1.035 0-1.875.84-1.875 1.875v4.875c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V15c0-1.035-.84-1.875-1.875-1.875H6z" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-orange-400"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.052A9.75 9.75 0 0118.635 8.25H17.25a.75.75 0 000 1.5h3a.75.75 0 00.75-.75V6a.75.75 0 00-1.5 0v1.127a11.252 11.252 0 00-9.865-6.872.75.75 0 00-.61 1.031Zm-2.033 18.428a.75.75 0 001.071-1.052A9.75 9.75 0 015.365 15.75H6.75a.75.75 0 000-1.5h-3a.75.75 0 00-.75.75V18a.75.75 0 001.5 0v-1.127a11.252 11.252 0 009.865 6.872.75.75 0 00.61-1.031Z" clipRule="evenodd" /></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-400"><path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 011.5 1.5v1.5h-3v-1.5a1.5 1.5 0 011.5-1.5zM8.25 3.75a1.5 1.5 0 011.5 1.5v1.5H6v-1.5a1.5 1.5 0 011.5-1.5zM12 2.25a.75.75 0 01.75.75v17.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM4.5 9.75a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75zM4.5 12.75a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
const PositiveHabitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-green-400"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.496-12.744a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>;
const NegativeHabitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-red-400"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;

export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [habitsData, setHabitsData] = useState<HabitWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('No se pudo cargar la información del dashboard.');
      }
      const data = await response.json();
      setHabitsData(data.habits_con_estadisticas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchDashboardData]);

  if (status === 'loading' || isLoading) {
    return <MainLayout pageTitle="Mi Dashboard"><div className="text-center p-8">Cargando tu progreso...</div></MainLayout>;
  }

  if (status === 'unauthenticated') {
    return <MainLayout pageTitle="Redirigiendo"><div className="text-center p-8">Redirigiendo...</div></MainLayout>;
  }

  const totalHabits = habitsData.length;
  const bestStreak = habitsData.reduce((max, habit) => habit.racha_actual > max ? habit.racha_actual : max, 0);
  
  return (
    <MainLayout pageTitle="Mi Dashboard">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* --- Columna Principal (2/3 del ancho) --- */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4"><ChartBarIcon /><div><p className="text-sm text-gray-400">Hábitos Activos</p><p className="text-2xl font-bold text-white">{totalHabits}</p></div></div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4"><FireIcon /><div><p className="text-sm text-gray-400">Mejor Racha Actual</p><p className="text-2xl font-bold text-white">{bestStreak} días</p></div></div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4"><TrophyIcon /><div><p className="text-sm text-gray-400">Logros</p><p className="text-2xl font-bold text-white">0</p></div></div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Progreso de Hábitos</h3>
            {error && <div className="bg-red-700 text-white p-4 rounded-lg mb-6">{error}</div>}
            {habitsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {habitsData.map(habit => (
                  <div key={habit.id} className={`p-5 rounded-lg shadow-md border-l-4 ${habit.tipo === 'MAL_HABITO' ? 'border-red-500' : 'border-green-500'} bg-gray-800`}>
                    <p className="font-bold text-white">{habit.nombre}</p>
                    <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-400">Racha Actual:</span>
                      <span className="text-lg font-bold text-orange-400">{habit.racha_actual} días</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-2">¡Es hora de empezar!</h3>
                <p>Aún no tienes hábitos para seguir.</p>
                <Link href="/habits" className="mt-4 inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg">Crea tu primer hábito</Link>
              </div>
            )}
          </div>
        </div>

        {/* --- Columna Derecha (1/3 del ancho) --- */}
        <div className="lg:col-span-1 space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">Actividad Reciente</h3>
                <p className="text-gray-400 text-sm">Aún no hay actividad reciente.</p>
            </div>

            {/* 2. Aquí se renderiza el nuevo Calendario */}
            <ActivityCalendar />
        </div>
      </div>
    </MainLayout>
  );
}
