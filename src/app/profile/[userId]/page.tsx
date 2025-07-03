// src/app/profile/[userId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import FriendActivityCalendar from '@/components/FriendActivityCalendar';

interface FriendAchievement {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  fecha_obtencion: string;
}

interface FriendProfileData {
  id: number;
  nombre: string;
  email: string;
  fecha_creacion: string;
}

interface FriendStats {
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  totalAchievements: number;
  joinDate: string;
}

interface ProfilePageProps {
  params: { userId: string };
}

const ProfilePage: React.FC<ProfilePageProps> = ({ params }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friendProfile, setFriendProfile] = useState<FriendProfileData | null>(null);
  const [achievements, setAchievements] = useState<FriendAchievement[]>([]);
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const friendId = parseInt(params.userId);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Verificar que no sea el mismo usuario
    if (session.user.id === params.userId) {
      router.push('/my-dashboard');
      return;
    }

    loadFriendData();
  }, [session, status, params.userId, router]);

  const loadFriendData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar datos del perfil del amigo, logros y estadísticas en paralelo
      const [profileRes, achievementsRes, statsRes] = await Promise.all([
        fetch(`/api/users/${friendId}`),
        fetch(`/api/friends/${friendId}/achievements`),
        fetch(`/api/users/${friendId}/stats`)
      ]);

      if (!profileRes.ok) {
        if (profileRes.status === 403) {
          throw new Error('No tienes permiso para ver este perfil');
        } else if (profileRes.status === 404) {
          throw new Error('Usuario no encontrado');
        } else {
          throw new Error('Error al cargar el perfil');
        }
      }

      if (!achievementsRes.ok) {
        if (achievementsRes.status === 403) {
          throw new Error('No tienes una amistad con este usuario');
        } else {
          throw new Error('Error al cargar los logros');
        }
      }

      if (!statsRes.ok) {
        if (statsRes.status === 403) {
          throw new Error('No tienes permiso para ver las estadísticas de este usuario');
        } else {
          throw new Error('Error al cargar las estadísticas');
        }
      }

      const profileData = await profileRes.json();
      const achievementsData = await achievementsRes.json();
      const statsData = await statsRes.json();

      setFriendProfile(profileData.user || profileData);
      setAchievements(achievementsData.achievements || []);

      // Usar estadísticas reales del nuevo endpoint
      const joinDate = new Date(statsData.join_date);
      setStats({
        totalCompletions: statsData.total_habits_completed || 0,
        currentStreak: statsData.current_streak || 0,
        longestStreak: statsData.longest_streak || 0,
        totalAchievements: statsData.total_achievements || 0,
        joinDate: joinDate.toLocaleDateString('es-ES')
      });

    } catch (error) {
      console.error('Error loading friend data:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando perfil...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!friendProfile) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-600">No se pudo cargar el perfil del usuario.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header del perfil */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {friendProfile.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{friendProfile.nombre}</h1>
                <p className="text-gray-600">Miembro desde {stats?.joinDate}</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Volver
            </button>
          </div>

          {/* Estadísticas básicas */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalAchievements}</div>
                <div className="text-sm text-blue-800">Logros Obtenidos</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.currentStreak}</div>
                <div className="text-sm text-green-800">Racha Actual</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.longestStreak}</div>
                <div className="text-sm text-orange-800">Racha Más Larga</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalCompletions}</div>
                <div className="text-sm text-purple-800">Hábitos Completados</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendario de actividad */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad de {friendProfile.nombre}</h2>
            <FriendActivityCalendar friendId={friendId} friendName={friendProfile.nombre} />
          </div>

          {/* Logros recientes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Logros Recientes</h2>
            {achievements.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {achievements.slice(0, 10).map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      {achievement.icono_url ? (
                        <img src={achievement.icono_url} alt={achievement.nombre} className="w-6 h-6" />
                      ) : (
                        <span className="text-yellow-600 text-lg">🏆</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{achievement.nombre}</h3>
                      <p className="text-sm text-gray-600">{achievement.descripcion}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Obtenido el {formatDate(achievement.fecha_obtencion)}
                      </p>
                    </div>
                  </div>
                ))}
                {achievements.length > 10 && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-500">Y {achievements.length - 10} logros más...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">🏆</div>
                <p className="text-gray-600">Aún no tiene logros obtenidos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;