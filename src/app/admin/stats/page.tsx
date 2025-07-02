// src/app/admin/stats/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

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
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-3xl font-bold">Cargando...</h1>
          <svg className="animate-spin h-8 w-8 text-white mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Estadísticas Globales</h1>
            <p className="text-gray-400">Análisis de rendimiento y actividad de usuarios</p>
          </div>
          <Link 
            href="/dashboard" 
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            ← Volver al Dashboard
          </Link>
        </div>

        {/* Selector de Semana */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <label htmlFor="week-select" className="block text-sm font-medium text-gray-300 mb-2">
            Seleccionar Semana:
          </label>
          <input
            id="week-select"
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Selecciona el lunes de la semana que deseas analizar
          </p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
            {error}
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
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-400 mb-2">Total Usuarios</h3>
                <p className="text-3xl font-bold">{globalStats.total_users}</p>
                <p className="text-sm text-gray-400">{globalStats.active_users} activos</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-green-400 mb-2">Total Hábitos</h3>
                <p className="text-3xl font-bold">{globalStats.total_habits_created}</p>
                <p className="text-sm text-gray-400">En el sistema</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-yellow-400 mb-2">Tasa de Éxito Promedio</h3>
                <p className="text-3xl font-bold">{globalStats.average_success_rate}%</p>
                <p className="text-sm text-gray-400">Todos los usuarios</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-purple-400 mb-2">Usuarios Activos</h3>
                <p className="text-3xl font-bold">{globalStats.recent_activity.length}</p>
                <p className="text-sm text-gray-400">Con actividad esta semana</p>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-green-400">🏆 Top Performers</h2>
              {globalStats.top_performers.length > 0 ? (
                <div className="space-y-3">
                  {globalStats.top_performers.map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between bg-gray-700 p-4 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <div>
                          <p className="font-medium">{user.user_name}</p>
                          <p className="text-sm text-gray-400">{user.user_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">{user.success_percentage}%</p>
                        <p className="text-sm text-gray-400">{user.best_streak} días racha</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No hay datos de rendimiento para esta semana</p>
              )}
            </div>

            {/* Actividad Reciente */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-blue-400">📊 Actividad Reciente</h2>
              {globalStats.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {globalStats.recent_activity.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between bg-gray-700 p-4 rounded">
                      <div>
                        <p className="font-medium">{user.user_name}</p>
                        <p className="text-sm text-gray-400">{user.user_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{user.completed_habits}/{user.total_habits}</p>
                        <p className="text-sm text-gray-400">hábitos completados</p>
                        {user.total_relapses > 0 && (
                          <p className="text-sm text-red-400">{user.total_relapses} recaídas</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No hay actividad registrada para esta semana</p>
              )}
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