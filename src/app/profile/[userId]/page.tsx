// src/app/profile/[userId]/page.tsx
'use client';

import React, { useState, useEffect, use } from 'react';
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
  // Nuevos campos para estadísticas detalladas
  goodHabitsCount: number;
  addictionsCount: number;
  bestGoodHabitStreak: number;
  bestAddictionStreak: number;
  habitsWithStats: Array<{
    id: number;
    nombre: string;
    tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
    racha_actual: number;
  }>;
}

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ params }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friendProfile, setFriendProfile] = useState<FriendProfileData | null>(null);
  const [achievements, setAchievements] = useState<FriendAchievement[]>([]);
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inyectar animaciones CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.5); }
        50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6); }
      }
      .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
      .animate-slideUp { animation: slideUp 0.5s ease-out; }
      .animate-shimmer { animation: shimmer 2s infinite; }
      .animate-pulse-custom { animation: pulse 2s infinite; }
      .animate-glow { animation: glow 2s infinite; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const resolvedParams = use(params);
  const friendId = parseInt(resolvedParams.userId);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Verificar que no sea el mismo usuario
    if (session.user.id === resolvedParams.userId) {
      router.push('/my-dashboard');
      return;
    }

    loadFriendData();
  }, [session, status, resolvedParams.userId, router]);

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
        joinDate: joinDate.toLocaleDateString('es-ES'),
        // Nuevos campos
        goodHabitsCount: statsData.good_habits_count || 0,
        addictionsCount: statsData.addictions_count || 0,
        bestGoodHabitStreak: statsData.best_good_habit_streak || 0,
        bestAddictionStreak: statsData.best_addiction_streak || 0,
        habitsWithStats: statsData.habits_with_stats || []
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex justify-center items-center">
          <div className="text-center animate-fadeIn">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 mx-auto mb-6"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2 animate-glow"></div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-8 py-4 shadow-lg border border-white/20">
              <p className="text-slate-700 font-medium text-lg mb-2">Cargando perfil...</p>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-shimmer" style={{backgroundSize: '200px 100%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex justify-center items-center p-6">
          <div className="max-w-md w-full animate-slideUp">
            <div className="bg-white/90 backdrop-blur-sm border border-red-200/50 rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-custom">
                <span className="text-white text-3xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-4">Error</h2>
              <p className="text-red-700 mb-6 leading-relaxed">{error}</p>
              <button
                onClick={() => router.back()}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-medium"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!friendProfile) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex justify-center items-center p-6">
          <div className="max-w-md w-full animate-fadeIn">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 text-center shadow-xl">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-3xl">👤</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Perfil no disponible</h2>
              <p className="text-gray-600 mb-6">No se pudo cargar el perfil del usuario.</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-medium"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-black">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          {/* Header del perfil */}
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/30 p-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg animate-glow">
                    {friendProfile.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse-custom"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">{friendProfile.nombre}</h1>
                  <p className="text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                    Miembro desde {stats?.joinDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-medium border border-gray-600/50"
              >
                ← Volver
              </button>
            </div>

            {/* Estadísticas básicas */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp">
                  <div className="text-3xl font-bold mb-2">{stats.totalAchievements}</div>
                  <div className="text-blue-100 font-medium">Logros Obtenidos</div>
                  <div className="mt-2 text-4xl opacity-20">🏆</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.1s'}}>
                  <div className="text-3xl font-bold mb-2">{stats.currentStreak}</div>
                  <div className="text-green-100 font-medium">Racha Actual</div>
                  <div className="mt-2 text-4xl opacity-20">🔥</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.2s'}}>
                  <div className="text-3xl font-bold mb-2">{stats.longestStreak}</div>
                  <div className="text-orange-100 font-medium">Racha Más Larga</div>
                  <div className="mt-2 text-4xl opacity-20">⚡</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.3s'}}>
                  <div className="text-3xl font-bold mb-2">{stats.totalCompletions}</div>
                  <div className="text-purple-100 font-medium">Hábitos Completados</div>
                  <div className="mt-2 text-4xl opacity-20">✅</div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen de Progreso Detallado */}
          {stats && (
            <div className="bg-gradient-to-br from-black to-gray-950 rounded-2xl shadow-2xl p-8 animate-fadeIn border border-gray-800/50">
              <h2 className="text-2xl font-bold text-gray-100 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center text-sm">📊</span>
                Resumen de Progreso
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-gradient-to-br from-green-700 to-green-600 p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp">
                  <div className="text-3xl font-bold text-white mb-2">{stats.goodHabitsCount}</div>
                  <div className="text-green-100 font-medium">Hábitos Positivos</div>
                  <div className="mt-2 text-2xl opacity-30">✅</div>
                </div>
                <div className="bg-gradient-to-br from-red-700 to-red-600 p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.1s'}}>
                  <div className="text-3xl font-bold text-white mb-2">{stats.addictionsCount}</div>
                  <div className="text-red-100 font-medium">Adicciones</div>
                  <div className="mt-2 text-2xl opacity-30">🚫</div>
                </div>
                <div className="bg-gradient-to-br from-orange-700 to-orange-600 p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.2s'}}>
                  <div className="text-3xl font-bold text-white mb-2">{stats.bestGoodHabitStreak}</div>
                  <div className="text-orange-100 font-medium">Mejor racha (hábitos)</div>
                  <div className="mt-2 text-2xl opacity-30">🔥</div>
                </div>
                <div className="bg-gradient-to-br from-purple-700 to-purple-600 p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.3s'}}>
                  <div className="text-3xl font-bold text-white mb-2">{stats.bestAddictionStreak}</div>
                  <div className="text-purple-100 font-medium">Mejor racha (adicciones)</div>
                  <div className="mt-2 text-2xl opacity-30">💪</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-700 to-yellow-600 p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slideUp" style={{animationDelay: '0.4s'}}>
                  <div className="text-3xl font-bold text-white mb-2">{stats.totalAchievements}</div>
                  <div className="text-yellow-100 font-medium">Logros desbloqueados</div>
                  <div className="mt-2 text-2xl opacity-30">🏆</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendario de actividad */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/30 p-8 animate-slideUp hover:shadow-2xl transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg flex items-center justify-center text-white text-sm">📅</span>
                Actividad de {friendProfile.nombre}
              </h2>
              <FriendActivityCalendar friendId={friendId} friendName={friendProfile.nombre} />
            </div>

            {/* Hábitos y Rachas */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/30 p-8 animate-slideUp hover:shadow-2xl transition-all duration-300" style={{animationDelay: '0.1s'}}>
              <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
                Hábitos y Rachas
              </h2>
              {stats && stats.habitsWithStats.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {stats.habitsWithStats.map((habit, index) => (
                    <div key={habit.id} className={`p-5 rounded-xl border-l-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-102 animate-fadeIn ${
                      habit.tipo === 'MAL_HABITO' 
                        ? 'border-red-400 bg-gradient-to-r from-red-900/80 to-red-800/60' 
                        : 'border-green-400 bg-gradient-to-r from-green-900/80 to-green-800/60'
                    }`} style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{habit.nombre}</h3>
                          <p className={`text-sm font-medium ${
                            habit.tipo === 'MAL_HABITO' ? 'text-red-300' : 'text-green-300'
                          }`}>
                            {habit.tipo === 'MAL_HABITO' ? '🚫 Adicción' : 
                             habit.tipo === 'SI_NO' ? '✅ Hábito Sí/No' : '📈 Hábito Medible'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold mb-1 ${
                            habit.tipo === 'MAL_HABITO' ? 'text-red-200' : 'text-green-200'
                          }`}>
                            {habit.racha_actual}
                          </div>
                          <div className="text-xs text-gray-300 font-medium">
                            {habit.tipo === 'MAL_HABITO' ? 'días sin recaída' : 'días consecutivos'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-70">
                    <span className="text-white text-2xl">📊</span>
                  </div>
                  <p className="text-gray-300 font-medium">No tiene hábitos registrados</p>
                  <p className="text-gray-400 text-sm mt-2">Los hábitos aparecerán aquí cuando estén disponibles</p>
                </div>
              )}
            </div>

            {/* Logros recientes */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/30 p-8 animate-slideUp hover:shadow-2xl transition-all duration-300" style={{animationDelay: '0.2s'}}>
              <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-r from-yellow-600 to-orange-700 rounded-lg flex items-center justify-center text-white text-sm">🏆</span>
                Logros Recientes
              </h2>
              {achievements.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {achievements.slice(0, 10).map((achievement, index) => (
                    <div key={achievement.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-102 animate-fadeIn border border-yellow-700/30" style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-full flex items-center justify-center shadow-lg">
                        {achievement.icono_url ? (
                          <img src={achievement.icono_url} alt={achievement.nombre} className="w-7 h-7" />
                        ) : (
                          <span className="text-white text-xl">🏆</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-100 mb-1">{achievement.nombre}</h3>
                        <p className="text-sm text-gray-300 mb-2">{achievement.descripcion}</p>
                        <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                          Obtenido el {formatDate(achievement.fecha_obtencion)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {achievements.length > 10 && (
                    <div className="text-center py-4">
                      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-3 border border-yellow-700/30">
                        <p className="text-sm text-gray-300 font-medium">Y {achievements.length - 10} logros más...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">🏆</span>
                  </div>
                  <p className="text-gray-300 font-medium">Aún no tiene logros obtenidos</p>
                  <p className="text-gray-400 text-sm mt-2">Los logros aparecerán aquí cuando los desbloquee</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;