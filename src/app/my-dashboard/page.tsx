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

// --- Iconos Mejorados ---
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-blue-400 drop-shadow-lg"><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v9.375c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75zM6 13.125c-1.035 0-1.875.84-1.875 1.875v4.875c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V15c0-1.035-.84-1.875-1.875-1.875H6z" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-orange-400 animate-pulse drop-shadow-lg"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.052A9.75 9.75 0 0118.635 8.25H17.25a.75.75 0 000 1.5h3a.75.75 0 00.75-.75V6a.75.75 0 00-1.5 0v1.127a11.252 11.252 0 00-9.865-6.872.75.75 0 00-.61 1.031Zm-2.033 18.428a.75.75 0 001.071-1.052A9.75 9.75 0 015.365 15.75H6.75a.75.75 0 000-1.5h-3a.75.75 0 00-.75.75V18a.75.75 0 001.5 0v-1.127a11.252 11.252 0 009.865 6.872.75.75 0 00.61-1.031Z" clipRule="evenodd" /></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-yellow-400 drop-shadow-lg"><path d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.618.65 18.47 18.47 0 00-.31 6.876c.052.312.25.604.918.851C3.294 12.906 4.667 13.5 6.75 13.5c.847 0 1.716-.15 2.5-.384.784.234 1.653.384 2.5.384 2.083 0 3.456-.594 4.665-1.081.668-.247.866-.539.918-.85a18.47 18.47 0 00-.31-6.877.75.75 0 00-.618-.65 20.905 20.905 0 00-3.071-.543V2.621a.75.75 0 00-.75-.75H5.916a.75.75 0 00-.75.75zM7.5 15.75a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75z" /><path d="M12 18a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 18z" /><path d="M9 21.75a.75.75 0 000 1.5h6a.75.75 0 000-1.5H9z" /></svg>;
const LeafIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-emerald-400 drop-shadow-lg"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>;
const NoSmokingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-red-400 drop-shadow-lg"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;
const ArrowTrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-400"><path fillRule="evenodd" d="M15.22 6.268a.75.75 0 01.44.97l-1.09 2.5a.75.75 0 01-1.409-.026l-1.08-2.5a.75.75 0 01.437-.97l2.702-.968zM12.5 8.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm-8.5 5.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75zm16.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
const ArrowTrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-400"><path fillRule="evenodd" d="M1.72 5.47a.75.75 0 011.06 0L9 11.69l3.756-3.756a.75.75 0 01.985-.066 12.698 12.698 0 014.575 6.832l.308 1.149 2.277-3.943a.75.75 0 111.299.75l-3.182 5.51a.75.75 0 01-1.025.275l-5.511-3.181a.75.75 0 01.75-1.3l3.943 2.277-.308-1.149a11.194 11.194 0 00-3.528-5.617l-3.809 3.81a.75.75 0 01-1.06 0L1.72 6.53a.75.75 0 010-1.061z" clipRule="evenodd" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-300 animate-pulse"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" /></svg>;

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
    return (
      <MainLayout pageTitle="Mi Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">Cargando tu progreso</h3>
            <p className="text-gray-400 animate-pulse">Preparando tu dashboard personalizado...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <MainLayout pageTitle="Redirigiendo">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">Redirigiendo</h3>
            <p className="text-gray-400">Te estamos llevando a la página de inicio de sesión...</p>
          </div>
        </div>
      </MainLayout>
    );
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
          {/* --- Tarjetas de Estadísticas Mejoradas con Animaciones --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 p-6 rounded-xl shadow-xl border border-emerald-500/20 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25 animate-in slide-in-from-left duration-700" style={{animationDelay: '0ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors duration-300 group-hover:scale-110 transform">
                  <LeafIcon />
                </div>
                <div>
                  <p className="text-sm text-emerald-200 font-medium">Hábitos Positivos</p>
                  <p className="text-3xl font-bold text-white group-hover:text-emerald-100 transition-colors duration-300 group-hover:scale-110 transform">{totalGoodHabits}</p>
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 p-6 rounded-xl shadow-xl border border-red-500/20 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25 animate-in slide-in-from-bottom duration-700" style={{animationDelay: '100ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-red-500/20 rounded-xl group-hover:bg-red-500/30 transition-colors duration-300 group-hover:scale-110 transform">
                  <NoSmokingIcon />
                </div>
                <div>
                  <p className="text-sm text-red-200 font-medium">Adicciones</p>
                  <p className="text-3xl font-bold text-white group-hover:text-red-100 transition-colors duration-300 group-hover:scale-110 transform">{totalAddictions}</p>
                </div>
              </div>
            </div>
            
            <div className="group relative bg-gradient-to-br from-yellow-600 via-amber-700 to-orange-800 p-6 rounded-xl shadow-xl border border-yellow-500/20 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 animate-in slide-in-from-right duration-700" style={{animationDelay: '200ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl group-hover:bg-yellow-500/30 transition-colors duration-300 group-hover:scale-110 transform">
                  <TrophyIcon />
                </div>
                <div>
                  <p className="text-sm text-yellow-200 font-medium">Logros</p>
                  <p className="text-3xl font-bold text-white group-hover:text-yellow-100 transition-colors duration-300 group-hover:scale-110 transform">{unlockedAchievementsCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* --- Pestañas Mejoradas con Barra Deslizante --- */}
          <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden">
            <div className="relative bg-gray-900/50 border-b border-gray-700/50 p-1">
              {/* Indicador deslizante animado */}
              <div 
                className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r rounded-lg transition-all duration-500 ease-out shadow-lg ${
                  activeTab === 'habits' 
                    ? 'left-1 from-emerald-500/80 to-emerald-600/80 shadow-emerald-500/25' 
                    : 'left-1/2 from-red-500/80 to-red-600/80 shadow-red-500/25'
                }`}
              ></div>
              
              <div className="relative flex">
                <button 
                  onClick={() => setActiveTab('habits')} 
                  className={`group relative flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 z-10 rounded-lg ${
                    activeTab === 'habits' 
                      ? 'text-white transform scale-105' 
                      : 'text-gray-400 hover:text-emerald-300 hover:scale-102'
                  }`}
                >
                  <span className="flex items-center justify-center gap-3 transition-all duration-300">
                    <ArrowTrendingUpIcon /> 
                    <span className="font-bold">Hábitos Positivos</span>
                  </span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('addictions')} 
                  className={`group relative flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 z-10 rounded-lg ${
                    activeTab === 'addictions' 
                      ? 'text-white transform scale-105' 
                      : 'text-gray-400 hover:text-red-300 hover:scale-102'
                  }`}
                >
                  <span className="flex items-center justify-center gap-3 transition-all duration-300">
                    <ArrowTrendingDownIcon /> 
                    <span className="font-bold">Adicciones</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="p-8">
              {error && (
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-xl mb-8 border border-red-500/30 shadow-lg animate-in slide-in-from-top duration-500">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-200 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
              
              {/* --- Contenido de la pestaña de Hábitos Positivos --- */}
              {activeTab === 'habits' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-in slide-in-from-left duration-700">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Progreso de Hábitos Positivos</h3>
                      <p className="text-gray-400">Mantén el impulso y construye rutinas saludables</p>
                    </div>
                    <div className="flex items-center space-x-3 bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 rounded-full shadow-lg border border-emerald-500/30 hover:scale-105 transition-transform duration-300">
                      <FireIcon />
                      <div className="text-center">
                        <div className="text-white font-bold text-lg">{bestGoodStreak}</div>
                        <div className="text-emerald-200 text-xs font-medium">días</div>
                      </div>
                    </div>
                  </div>
                  
                  {goodHabits.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {goodHabits.map((habit, index) => (
                        <div 
                          key={habit.id} 
                          className={`group relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 rounded-2xl shadow-xl border transition-all duration-300 cursor-pointer overflow-hidden animate-in slide-in-from-bottom duration-500 ${
                            expandedHabitId === habit.id 
                              ? 'border-emerald-400/50 shadow-2xl shadow-emerald-500/20 scale-[1.02]' 
                              : 'border-gray-700/50 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-[1.01]'
                          }`}
                          style={{animationDelay: `${index * 100}ms`}}
                          onClick={(e) => { if (!e.defaultPrevented) toggleHabitExpansion(habit.id); }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-r-full"></div>
                          
                          <div className="relative flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-lg mb-2 group-hover:text-emerald-100 transition-colors duration-300">{habit.nombre}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium hover:bg-emerald-500/30 transition-colors duration-300">
                                  {habit.tipo === 'SI_NO' ? 'Sí/No' : 'Medible'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-emerald-400 group-hover:scale-110 transition-transform duration-300">{habit.racha_actual}</div>
                                <div className="text-xs text-gray-400 font-medium">días</div>
                              </div>
                              <span className="text-emerald-400 transition-transform duration-300 group-hover:scale-110 hover:rotate-12">
                                {expandedHabitId === habit.id ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                  </svg>
                                )}
                              </span>
                            </div>
                          </div>
                          
                          {expandedHabitId === habit.id && (
                            <div className="mt-6 pt-6 border-t border-gray-700/50 space-y-4 animate-in slide-in-from-top-2 duration-300 relative z-10">
                              <p className="text-gray-300 leading-relaxed">{habit.descripcion || 'Sin descripción disponible'}</p>
                              <div className="flex justify-between items-center pt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <span>Racha actual:</span>
                                  <span className="font-bold text-emerald-400">{habit.racha_actual} días</span>
                                </div>
                                <span 
                                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium cursor-pointer transition-all duration-300 hover:underline relative z-20 hover:bg-emerald-500/10 px-2 py-1 rounded-md hover:translate-x-2 transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    router.push(`/habits/${habit.id}`);
                                  }}
                                >
                                  Ver detalles
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg animate-in slide-in-from-bottom duration-700">
                      <h3 className="text-xl font-semibold text-white mb-2">¡Es hora de empezar!</h3>
                      <p>Aún no tienes hábitos positivos para seguir.</p>
                      <Link href="/habits" className="mt-4 inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-all duration-300 hover:scale-105 transform">
                        Crea tu primer hábito
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {/* --- Contenido de la pestaña de Adicciones --- */}
              {activeTab === 'addictions' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-in slide-in-from-left duration-700">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Control de Adicciones</h3>
                      <p className="text-gray-400">Mantén el control y supera tus desafíos</p>
                    </div>
                    <div className="flex items-center space-x-3 bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 rounded-full shadow-lg border border-red-500/30 hover:scale-105 transition-transform duration-300">
                      <FireIcon />
                      <div className="text-center">
                        <div className="text-white font-bold text-lg">{bestAddictionStreak}</div>
                        <div className="text-red-200 text-xs font-medium">días</div>
                      </div>
                    </div>
                  </div>
                  
                  {addictions.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {addictions.map((habit, index) => (
                        <div 
                          key={habit.id} 
                          className={`group relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 rounded-2xl shadow-xl border transition-all duration-300 cursor-pointer overflow-hidden animate-in slide-in-from-bottom duration-500 ${
                            expandedHabitId === habit.id 
                              ? 'border-rose-400/50 shadow-2xl shadow-rose-500/20 scale-[1.02]' 
                              : 'border-gray-700/50 hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/10 hover:scale-[1.01]'
                          }`}
                          style={{animationDelay: `${index * 100}ms`}}
                          onClick={(e) => { if (!e.defaultPrevented) toggleHabitExpansion(habit.id); }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 to-rose-600 rounded-r-full"></div>
                          
                          <div className="relative flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-lg mb-2 group-hover:text-rose-100 transition-colors duration-300">{habit.nombre}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="px-2 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-medium hover:bg-rose-500/30 transition-colors duration-300">
                                  Adicción
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-rose-400 group-hover:scale-110 transition-transform duration-300">{habit.racha_actual}</div>
                                <div className="text-xs text-gray-400 font-medium">días</div>
                              </div>
                              <span className="text-rose-400 transition-transform duration-300 group-hover:scale-110 hover:rotate-12">
                                {expandedHabitId === habit.id ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                  </svg>
                                )}
                              </span>
                            </div>
                          </div>
                          
                          {expandedHabitId === habit.id && (
                            <div className="mt-6 pt-6 border-t border-gray-700/50 space-y-4 animate-in slide-in-from-top-2 duration-300 relative z-10">
                              <p className="text-gray-300 leading-relaxed">{habit.descripcion || 'Sin descripción disponible'}</p>
                              <div className="flex justify-between items-center pt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <span>Días sin recaer:</span>
                                  <span className="font-bold text-rose-400">{habit.racha_actual} días</span>
                                </div>
                                <span 
                                  className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 text-sm font-medium cursor-pointer transition-all duration-300 hover:underline relative z-20 hover:bg-rose-500/10 px-2 py-1 rounded-md hover:translate-x-2 transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    router.push(`/habits/${habit.id}`);
                                  }}
                                >
                                  Ver detalles
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg animate-in slide-in-from-bottom duration-700">
                      <h3 className="text-xl font-semibold text-white mb-2">¡Excelente!</h3>
                      <p>No tienes adicciones registradas para controlar.</p>
                      <Link href="/habits" className="mt-4 inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-lg transition-all duration-300 hover:scale-105 transform">
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
          
          <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent flex items-center">
                <div className="w-8 h-8 text-yellow-500 mr-3 drop-shadow-lg animate-pulse">
                  <TrophyIcon />
                </div>
                Logros Recientes
              </h3>
              <div className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-medium">
                {unlockedAchievementsCount} logros
              </div>
            </div>
            {achievementsData.filter(ach => ach.unlocked).length > 0 ? (
              <div className="space-y-4">
                {achievementsData.filter(ach => ach.unlocked).slice(0, 3).map((achievement, index) => (
                  <div key={achievement.id} className="group relative overflow-hidden">
                    <div className="flex items-center p-5 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-xl border border-gray-600/30 hover:border-yellow-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <div className="w-7 h-7 text-white drop-shadow-sm">
                            <TrophyIcon />
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg group-hover:text-yellow-100 transition-colors duration-300">Logro #{achievement.id}</p>
                        <p className="text-gray-400 leading-relaxed mt-1">Logro desbloqueado con éxito</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                          Reciente
                        </span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 text-gray-500">
                    <TrophyIcon />
                  </div>
                </div>
                <p className="text-gray-400 text-lg font-medium">No hay logros aún</p>
                <p className="text-gray-500 text-sm mt-2">¡Sigue trabajando en tus hábitos para desbloquear logros!</p>
              </div>
            )}
          </div>
          <ActivityCalendar />
        </div>
      </div>
    </MainLayout>
  );
}
