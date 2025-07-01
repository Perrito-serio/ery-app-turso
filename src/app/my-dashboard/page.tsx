// src/app/my-dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import ActivityCalendar from '@/components/ActivityCalendar';

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

// --- Nueva interfaz para los datos de logros ---
interface AchievementStatus {
  id: number;
  unlocked: boolean;
}

// --- Iconos ---
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-400"><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v9.375c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75zM6 13.125c-1.035 0-1.875.84-1.875 1.875v4.875c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V15c0-1.035-.84-1.875-1.875-1.875H6z" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-orange-400"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.052A9.75 9.75 0 0118.635 8.25H17.25a.75.75 0 000 1.5h3a.75.75 0 00.75-.75V6a.75.75 0 00-1.5 0v1.127a11.252 11.252 0 00-9.865-6.872.75.75 0 00-.61 1.031Zm-2.033 18.428a.75.75 0 001.071-1.052A9.75 9.75 0 015.365 15.75H6.75a.75.75 0 000-1.5h-3a.75.75 0 00-.75.75V18a.75.75 0 001.5 0v-1.127a11.252 11.252 0 009.865 6.872.75.75 0 00.61-1.031Z" clipRule="evenodd" /></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-400"><path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 011.5 1.5v1.5h-3v-1.5a1.5 1.5 0 011.5-1.5zM8.25 3.75a1.5 1.5 0 011.5 1.5v1.5H6v-1.5a1.5 1.5 0 011.5-1.5zM12 2.25a.75.75 0 01.75.75v17.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM4.5 9.75a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75zM4.5 12.75a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
const LeafIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-500"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>;
const NoSmokingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;
const ArrowTrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-400"><path fillRule="evenodd" d="M15.22 6.268a.75.75 0 01.44.97l-1.09 2.5a.75.75 0 01-1.409-.026l-1.08-2.5a.75.75 0 01.437-.97l2.702-.968zM12.5 8.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm-8.5 5.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75zm16.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
const ArrowTrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-400"><path fillRule="evenodd" d="M1.72 5.47a.75.75 0 011.06 0L9 11.69l3.756-3.756a.75.75 0 01.985-.066 12.698 12.698 0 014.575 6.832l.308 1.149 2.277-3.943a.75.75 0 111.299.75l-3.182 5.51a.75.75 0 01-1.025.275l-5.511-3.181a.75.75 0 01.75-1.3l3.943 2.277-.308-1.149a11.194 11.194 0 00-3.528-5.617l-3.809 3.81a.75.75 0 01-1.06 0L1.72 6.53a.75.75 0 010-1.061z" clipRule="evenodd" /></svg>;

export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [habitsData, setHabitsData] = useState<HabitWithStats[]>([]);
  const [achievementsData, setAchievementsData] = useState<AchievementStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'habits' | 'addictions'>('habits');
  const [expandedHabitId, setExpandedHabitId] = useState<number | null>(null);

  // Función para cargar datos del dashboard y logros en paralelo
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashboardRes, achievementsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/achievements')
      ]);

      if (!dashboardRes.ok) throw new Error('No se pudo cargar la información del dashboard.');
      if (!achievementsRes.ok) throw new Error('No se pudo cargar la información de logros.');
      
      const dashboardData = await dashboardRes.json();
      const achievementsData = await achievementsRes.json();

      setHabitsData(dashboardData.habits_con_estadisticas || []);
      setAchievementsData(achievementsData.achievements || []);

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

  // Función para alternar la expansión de un hábito
  const toggleHabitExpansion = (habitId: number) => {
    setExpandedHabitId(expandedHabitId === habitId ? null : habitId);
  };

  if (status === 'loading' || isLoading) {
    return <MainLayout pageTitle="Mi Dashboard"><div className="text-center p-8">Cargando tu progreso...</div></MainLayout>;
  }

  if (status === 'unauthenticated') {
    return <MainLayout pageTitle="Redirigiendo"><div className="text-center p-8">Redirigiendo...</div></MainLayout>;
  }

  // Separar hábitos y adicciones
  const goodHabits = habitsData.filter(habit => habit.tipo !== 'MAL_HABITO');
  const addictions = habitsData.filter(habit => habit.tipo === 'MAL_HABITO');
  
  // Calcular estadísticas
  const totalGoodHabits = goodHabits.length;
  const totalAddictions = addictions.length;
  const bestGoodStreak = goodHabits.reduce((max, habit) => habit.racha_actual > max ? habit.racha_actual : max, 0);
  const bestAddictionStreak = addictions.reduce((max, habit) => habit.racha_actual > max ? habit.racha_actual : max, 0);
  const unlockedAchievementsCount = achievementsData.filter(ach => ach.unlocked).length;
  
  return (
    <MainLayout pageTitle="Mi Dashboard">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* --- Columna Principal (2/3 del ancho) --- */}
        <div className="xl:col-span-2 space-y-8">
          {/* --- Tarjetas de Estadísticas --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 transform transition-all hover:scale-105">
              <LeafIcon />
              <div>
                <p className="text-sm text-indigo-200">Hábitos Positivos</p>
                <p className="text-2xl font-bold text-white">{totalGoodHabits}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-900 to-red-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 transform transition-all hover:scale-105">
              <NoSmokingIcon />
              <div>
                <p className="text-sm text-red-200">Adicciones</p>
                <p className="text-2xl font-bold text-white">{totalAddictions}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-900 to-amber-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 transform transition-all hover:scale-105">
              <TrophyIcon />
              <div>
                <p className="text-sm text-amber-200">Logros</p>
                <p className="text-2xl font-bold text-white">{unlockedAchievementsCount}</p>
              </div>
            </div>
          </div>

          {/* --- Pestañas para alternar entre hábitos y adicciones --- */}
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="flex border-b border-gray-700">
              <button 
                onClick={() => setActiveTab('habits')} 
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'habits' ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <ArrowTrendingUpIcon /> Hábitos Positivos
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('addictions')} 
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'addictions' ? 'bg-red-700 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <ArrowTrendingDownIcon /> Adicciones
                </span>
              </button>
            </div>

            <div className="p-6">
              {error && <div className="bg-red-700 text-white p-4 rounded-lg mb-6">{error}</div>}
              
              {/* --- Contenido de la pestaña de Hábitos Positivos --- */}
              {activeTab === 'habits' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-white">Progreso de Hábitos Positivos</h3>
                    <div className="flex items-center space-x-2 bg-indigo-900 px-4 py-2 rounded-full">
                      <FireIcon />
                      <span className="text-white font-bold">{bestGoodStreak} días</span>
                    </div>
                  </div>
                  
                  {goodHabits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {goodHabits.map(habit => (
                        <div 
                          key={habit.id} 
                          className={`p-5 rounded-lg shadow-md border-l-4 border-green-500 bg-gray-800 transition-all duration-300 ${expandedHabitId === habit.id ? 'ring-2 ring-green-400' : 'hover:bg-gray-700'}`}
                          onClick={() => toggleHabitExpansion(habit.id)}
                        >
                          <div className="flex justify-between items-center cursor-pointer">
                            <p className="font-bold text-white">{habit.nombre}</p>
                            <span className="text-green-400">
                              {expandedHabitId === habit.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              )}
                            </span>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                            <span className="text-sm text-gray-400">Racha Actual:</span>
                            <span className="text-lg font-bold text-orange-400">{habit.racha_actual} días</span>
                          </div>
                          
                          {expandedHabitId === habit.id && (
                            <div className="mt-4 pt-4 border-t border-gray-700 text-gray-300 text-sm">
                              <p className="mb-2">{habit.descripcion || 'Sin descripción'}</p>
                              <div className="flex justify-between items-center mt-4">
                                <span>Tipo: {habit.tipo === 'SI_NO' ? 'Sí/No' : 'Medible'}</span>
                                <Link href={`/habits/${habit.id}`} className="text-indigo-400 hover:text-indigo-300 flex items-center">
                                  Ver detalles
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
                      <h3 className="text-xl font-semibold text-white mb-2">¡Es hora de empezar!</h3>
                      <p>Aún no tienes hábitos positivos para seguir.</p>
                      <Link href="/habits" className="mt-4 inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-colors">
                        Crea tu primer hábito
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {/* --- Contenido de la pestaña de Adicciones --- */}
              {activeTab === 'addictions' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-white">Control de Adicciones</h3>
                    <div className="flex items-center space-x-2 bg-red-900 px-4 py-2 rounded-full">
                      <FireIcon />
                      <span className="text-white font-bold">{bestAddictionStreak} días</span>
                    </div>
                  </div>
                  
                  {addictions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addictions.map(habit => (
                        <div 
                          key={habit.id} 
                          className={`p-5 rounded-lg shadow-md border-l-4 border-red-500 bg-gray-800 transition-all duration-300 ${expandedHabitId === habit.id ? 'ring-2 ring-red-400' : 'hover:bg-gray-700'}`}
                          onClick={() => toggleHabitExpansion(habit.id)}
                        >
                          <div className="flex justify-between items-center cursor-pointer">
                            <p className="font-bold text-white">{habit.nombre}</p>
                            <span className="text-red-400">
                              {expandedHabitId === habit.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              )}
                            </span>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                            <span className="text-sm text-gray-400">Días sin recaída:</span>
                            <span className="text-lg font-bold text-orange-400">{habit.racha_actual} días</span>
                          </div>
                          
                          {expandedHabitId === habit.id && (
                            <div className="mt-4 pt-4 border-t border-gray-700 text-gray-300 text-sm">
                              <p className="mb-2">{habit.descripcion || 'Sin descripción'}</p>
                              <div className="flex justify-between items-center mt-4">
                                <span>Tipo: Adicción</span>
                                <Link href={`/habits/${habit.id}`} className="text-red-400 hover:text-red-300 flex items-center">
                                  Ver detalles
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
                      <h3 className="text-xl font-semibold text-white mb-2">¡Excelente!</h3>
                      <p>No tienes adicciones registradas para controlar.</p>
                      <Link href="/habits" className="mt-4 inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-lg transition-colors">
                        Registrar una adicción
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Columna Derecha (1/3 del ancho) --- */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Resumen de Progreso</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Hábitos positivos:</span>
                <span className="text-green-400 font-bold">{totalGoodHabits}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Adicciones:</span>
                <span className="text-red-400 font-bold">{totalAddictions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Mejor racha (hábitos):</span>
                <span className="text-orange-400 font-bold">{bestGoodStreak} días</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Mejor racha (adicciones):</span>
                <span className="text-orange-400 font-bold">{bestAddictionStreak} días</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Logros desbloqueados:</span>
                <span className="text-yellow-400 font-bold">{unlockedAchievementsCount}</span>
              </div>
            </div>
          </div>
          <ActivityCalendar />
        </div>
      </div>
    </MainLayout>
  );
}
