// src/app/admin/stats/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Inyectar animaciones CSS
const injectAnimations = () => {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      @keyframes shimmer {
        0% {
          background-position: -100% 0;
        }
        100% {
          background-position: 100% 0;
        }
      }
      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6);
        }
      }
      @keyframes pulse-custom {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.05);
        }
      }
      
      .animate-fadeInUp {
        animation: fadeInUp 0.6s ease-out;
      }
      .animate-slideInLeft {
        animation: slideInLeft 0.6s ease-out;
      }
      .animate-slideInRight {
        animation: slideInRight 0.6s ease-out;
      }
      .animate-pulse-custom {
        animation: pulse-custom 2s infinite;
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        background-size: 200% 100%;
      }
      .animate-bounceIn {
        animation: bounceIn 0.6s ease-out;
      }
      .animate-glow {
        animation: glow 2s infinite;
      }
      
      .gradient-border {
        background: linear-gradient(145deg, #1f2937, #111827);
        border: 1px solid;
        border-image: linear-gradient(145deg, #6366f1, #8b5cf6, #06b6d4) 1;
        border-radius: 12px;
        position: relative;
        overflow: hidden;
      }
      
      .gradient-border::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(145deg, #6366f1, #8b5cf6, #06b6d4);
        border-radius: 12px;
        padding: 1px;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
        z-index: -1;
      }
      
      .gradient-border-content {
        background: linear-gradient(145deg, #1f2937, #111827);
        border-radius: 11px;
        position: relative;
        z-index: 1;
      }
      
      .card-hover {
        transition: all 0.3s ease;
      }
      
      .card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
};

// Definición de iconos SVG
const ChartBarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface UserStats {
  user_id: number;
  user_name: string;
  user_email: string;
  total_habits: number;
  completed_habits: number;
  success_percentage: number;
  total_relapses: number;
  best_streak: number;
  week_start: string;
  week_end: string;
}

interface GlobalStats {
  total_users: number;
  active_users: number;
  total_habits_created: number;
  average_success_rate: number;
  top_performers: UserStats[];
  recent_activity: UserStats[];
}

export default function AdminStatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  // Inyectar animaciones al montar el componente
  useEffect(() => {
    injectAnimations();
  }, []);

  const isLoading = status === 'loading';
  const user = session?.user;

  // Calcular fecha de inicio de semana actual (lunes)
  const getCurrentWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return monday.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (!selectedWeek) {
      setSelectedWeek(getCurrentWeekStart());
    }
  }, [status, router, selectedWeek]);

  useEffect(() => {
    if (user && selectedWeek) {
      fetchGlobalStats();
    }
  }, [user, selectedWeek]);

  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener lista de usuarios (usando autenticación por cookies)
      const usersResponse = await fetch('/api/admin/users');

      if (!usersResponse.ok) {
        throw new Error('Error al obtener usuarios');
      }

      const usersData = await usersResponse.json();
      const users = usersData.users || [];
      const activeUsers = users.filter((u: any) => u.estado === 'activo');

      // Obtener estadísticas semanales para usuarios activos (máximo 20 para rendimiento)
      const userStatsPromises = activeUsers.slice(0, 20).map(async (user: any) => {
        try {
          const statsResponse = await fetch(
            `/api/admin/weekly-stats?user_id=${user.id}&week_start=${selectedWeek}`
          );

          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            return {
              user_id: user.id,
              user_name: user.nombre,
              user_email: user.email,
              total_habits: stats.total_habits,
              completed_habits: stats.completed_habits,
              success_percentage: stats.success_percentage,
              total_relapses: stats.total_relapses,
              best_streak: stats.best_streak,
              week_start: stats.week_start,
              week_end: stats.week_end
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching stats for user ${user.id}:`, error);
          return null;
        }
      });

      const userStatsResults = await Promise.all(userStatsPromises);
      const validUserStats = userStatsResults.filter(stat => stat !== null) as UserStats[];

      // Obtener estadísticas generales del sistema
      const systemStatsResponse = await fetch('/api/admin/stats');
      let totalHabitsCreated = 0;
      if (systemStatsResponse.ok) {
        const systemStats = await systemStatsResponse.json();
        totalHabitsCreated = systemStats.total_habits;
      }
      const averageSuccessRate = validUserStats.length > 0 
        ? Math.round(validUserStats.reduce((sum, stat) => sum + stat.success_percentage, 0) / validUserStats.length)
        : 0;

      // Top performers (ordenados por porcentaje de éxito y racha)
      const topPerformers = [...validUserStats]
        .sort((a, b) => {
          if (b.success_percentage !== a.success_percentage) {
            return b.success_percentage - a.success_percentage;
          }
          return b.best_streak - a.best_streak;
        })
        .slice(0, 5);

      // Actividad reciente (usuarios con hábitos completados esta semana)
      const recentActivity = validUserStats
        .filter(stat => stat.completed_habits > 0)
        .sort((a, b) => b.completed_habits - a.completed_habits)
        .slice(0, 10);

      setGlobalStats({
        total_users: users.length,
        active_users: activeUsers.length,
        total_habits_created: totalHabitsCreated,
        average_success_rate: averageSuccessRate,
        top_performers: topPerformers,
        recent_activity: recentActivity
      });

    } catch (error) {
      console.error('Error fetching global stats:', error);
      setError('Error al cargar las estadísticas globales');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout pageTitle="Estadísticas Globales">
        <div className="flex flex-col items-center justify-center text-center h-full animate-fadeInUp">
          <div className="gradient-border card-hover p-8 max-w-md">
            <div className="gradient-border-content p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                  <ChartBarIcon />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Cargando Estadísticas</h1>
              <p className="text-gray-400 mb-6">Analizando datos del sistema...</p>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-shimmer"></div>
              </div>
              <div className="flex justify-center">
                <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user || !user.roles?.includes('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos necesarios para ver esta página.
          </p>
          <Link href="/dashboard" className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow">
            Volver al Dashboard
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Estadísticas Globales">
      <div className="space-y-6">
        {/* Header */}
        <div className="gradient-border card-hover animate-slideInLeft">
          <div className="gradient-border-content p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <ChartBarIcon />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-white">Estadísticas Globales</h1>
                  <p className="text-gray-400">Análisis de rendimiento y actividad de usuarios</p>
                </div>
              </div>
              <Link 
                href="/dashboard" 
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver al Dashboard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Selector de Semana */}
        <div className="gradient-border card-hover animate-slideInRight">
          <div className="gradient-border-content p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg">
                <CalendarIcon />
              </div>
              <div>
                <label htmlFor="week-select" className="block text-lg font-semibold text-white">
                  Seleccionar Semana de Análisis
                </label>
                <p className="text-sm text-gray-400">
                  Selecciona el lunes de la semana que deseas analizar
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                id="week-select"
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:bg-gray-600/50"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <CalendarIcon />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="animate-bounceIn">
            <div className="gradient-border card-hover">
              <div className="gradient-border-content p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-300 font-semibold">Error al cargar datos</h3>
                    <p className="text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : globalStats ? (
          <>
            {/* Métricas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="gradient-border card-hover animate-fadeInUp" style={{animationDelay: '0.1s'}}>
                <div className="gradient-border-content p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                      <UsersIcon />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-custom"></div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">Total Usuarios</h3>
                  <p className="text-3xl font-bold text-white mb-1">{globalStats.total_users}</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <p className="text-sm text-gray-400">{globalStats.active_users} activos</p>
                  </div>
                </div>
              </div>
              
              <div className="gradient-border card-hover animate-fadeInUp" style={{animationDelay: '0.2s'}}>
                <div className="gradient-border-content p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                      <ActivityIcon />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-custom"></div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">Total Hábitos</h3>
                  <p className="text-3xl font-bold text-white mb-1">{globalStats.total_habits_created}</p>
                  <p className="text-sm text-gray-400">Creados en el sistema</p>
                </div>
              </div>
              
              <div className="gradient-border card-hover animate-fadeInUp" style={{animationDelay: '0.3s'}}>
                <div className="gradient-border-content p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl">
                      <TrendingUpIcon />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse-custom"></div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Tasa de Éxito</h3>
                  <p className="text-3xl font-bold text-white mb-1">{globalStats.average_success_rate}%</p>
                  <p className="text-sm text-gray-400">Promedio general</p>
                </div>
              </div>
              
              <div className="gradient-border card-hover animate-fadeInUp" style={{animationDelay: '0.4s'}}>
                <div className="gradient-border-content p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                      <TrophyIcon />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse-custom"></div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">Usuarios Activos</h3>
                  <p className="text-3xl font-bold text-white mb-1">{globalStats.recent_activity.length}</p>
                  <p className="text-sm text-gray-400">Esta semana</p>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="gradient-border card-hover animate-slideInLeft">
              <div className="gradient-border-content p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl">
                    <TrophyIcon />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Top Performers</h2>
                    <p className="text-gray-400">Los usuarios con mejor rendimiento esta semana</p>
                  </div>
                </div>
                
                {globalStats.top_performers.length > 0 ? (
                  <div className="space-y-4">
                    {globalStats.top_performers.map((user, index) => (
                      <div 
                        key={user.user_id} 
                        className="gradient-border card-hover animate-fadeInUp"
                        style={{animationDelay: `${(index + 1) * 0.1}s`}}
                      >
                        <div className="gradient-border-content p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600">
                                <span className="text-2xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-white">{user.user_name}</p>
                                <p className="text-sm text-gray-400">{user.user_email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-1">
                                <TrendingUpIcon />
                                <p className="text-xl font-bold text-green-400">{user.success_percentage}%</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-custom"></div>
                                <p className="text-sm text-gray-400">{user.best_streak} días racha</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 animate-fadeInUp">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                      <TrophyIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No hay datos de rendimiento</h3>
                    <p className="text-gray-500">No se encontraron datos para esta semana</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="gradient-border card-hover animate-slideInRight">
              <div className="gradient-border-content p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <ActivityIcon />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Actividad Reciente</h2>
                    <p className="text-gray-400">Usuarios con actividad registrada esta semana</p>
                  </div>
                </div>
                
                {globalStats.recent_activity.length > 0 ? (
                  <div className="space-y-4">
                    {globalStats.recent_activity.map((user, index) => (
                      <div 
                        key={user.user_id} 
                        className="gradient-border card-hover animate-fadeInUp"
                        style={{animationDelay: `${(index + 1) * 0.1}s`}}
                      >
                        <div className="gradient-border-content p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
                                <ActivityIcon />
                              </div>
                              <div>
                                <p className="font-semibold text-white">{user.user_name}</p>
                                <p className="text-sm text-gray-400">{user.user_email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="text-2xl font-bold text-blue-400">{user.completed_habits}</div>
                                <span className="text-gray-500">/</span>
                                <div className="text-lg text-gray-300">{user.total_habits}</div>
                              </div>
                              <p className="text-sm text-gray-400 mb-1">hábitos completados</p>
                              {user.total_relapses > 0 && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  <p className="text-sm text-red-400">{user.total_relapses} recaídas</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 animate-fadeInUp">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                      <ActivityIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No hay actividad registrada</h3>
                    <p className="text-gray-500">No se encontró actividad para esta semana</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No se pudieron cargar las estadísticas</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}