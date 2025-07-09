'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Interfaces basadas en las APIs existentes
interface CompetitionDetails {
  id: number;
  creador_id: number;
  nombre: string;
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  meta_objetivo: number;
  valor: number;
  fecha_creacion: string;
  creator_name: string;
  is_creator: boolean;
  is_participant: boolean;
  can_join: boolean;
}

interface LeaderboardEntry {
  position: number;
  user_id: number;
  user_name: string;
  user_photo: string | null;
  score: number;
  join_date: string;
  is_current_user: boolean;
}

interface LeaderboardData {
  competition: CompetitionDetails;
  leaderboard: LeaderboardEntry[];
  user_stats?: {
    current_score: number;
    position: number;
    total_participants: number;
  };
}

const CompetitionDetailPage: React.FC = () => {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const competitionId = params?.id as string;
  
  const [competitionData, setCompetitionData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (competitionId) {
      fetchCompetitionDetails();
    }
  }, [competitionId]);

  const fetchCompetitionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/competitions/${competitionId}`);
      if (!response.ok) {
        throw new Error('Error al cargar los detalles de la competencia');
      }
      const data = await response.json();
      // Crear estructura compatible con LeaderboardData
      const competitionData = {
        competition: data.competition,
        leaderboard: [],
        user_stats: undefined
      };
      setCompetitionData(competitionData);
      await fetchLeaderboard();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar los detalles de la competencia');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/leaderboard`);
      if (!response.ok) {
        throw new Error('Error al cargar el leaderboard');
      }
      const data = await response.json();
      // Combinar datos de competencia existentes con leaderboard
      setCompetitionData(prevData => ({
        competition: prevData?.competition || data.competition,
        leaderboard: data.leaderboard,
        user_stats: data.user_stats
      }));
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar el leaderboard');
    }
  };

  const handleJoinCompetition = async () => {
    try {
      setJoining(true);
      const response = await fetch(`/api/competitions/${competitionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Recargar datos después de unirse
        await fetchLeaderboard();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al unirse a la competencia');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al unirse a la competencia');
    } finally {
      setJoining(false);
    }
  };

  const getCompetitionTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'MAX_HABITOS_DIA': return 'Máximo hábitos por día';
      case 'MAX_RACHA': return 'Racha más larga';
      case 'TOTAL_COMPLETADOS': return 'Total completados';
      default: return tipo;
    }
  };

  const getStatusBadge = (estado: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (estado) {
      case 'activa':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'finalizada':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case 'cancelada':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemaining = (fechaFin: string) => {
    const today = new Date();
    const endDate = new Date(fechaFin);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {position}
          </div>
        );
    }
  };

  if (!session) {
    return (
      <MainLayout pageTitle="Competencia">
        <div className="flex items-center justify-center h-64 animate-fade-in">
          <div className="text-center p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-300 text-lg font-medium">Debes iniciar sesión para ver esta competencia.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout pageTitle="Cargando...">
        <div className="flex items-center justify-center h-64 animate-fade-in">
          <div className="text-center p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-spin">
                <div className="absolute inset-1 bg-gray-900 rounded-full"></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-pulse opacity-75"></div>
            </div>
            <p className="text-gray-300 text-lg font-medium">Cargando competencia...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !competitionData) {
    return (
      <MainLayout pageTitle="Error">
        <div className="text-center py-12 animate-fade-in">
          <div className="max-w-md mx-auto p-8 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-2xl border border-red-700/50 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link
              href="/competitions"
              className="relative inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-indigo-500/25 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="relative">Volver a Competencias</span>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { competition, leaderboard, user_stats } = competitionData;
  const daysRemaining = getDaysRemaining(competition.fecha_fin);
  const isActive = competition.estado === 'activa';

  return (
    <MainLayout pageTitle={competition.nombre}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden group">
            {/* Efectos de fondo */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-50"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-2xl"></div>
            
            <div className="relative flex items-center gap-4 mb-4">
              <Link
                href="/competitions"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    {competition.nombre}
                  </h1>
                  <span className={`${getStatusBadge(competition.estado)} shadow-lg transform hover:scale-105 transition-transform duration-200`}>
                    {competition.estado}
                  </span>
                </div>
                <p className="text-gray-300">{competition.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
          </div>

          {/* Información de la competencia */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center text-sm text-gray-400 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Tipo de Meta
              </div>
              <p className="relative text-white font-medium">{getCompetitionTypeLabel(competition.tipo_meta)}</p>
            </div>

            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm hover:border-green-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center text-sm text-gray-400 mb-2">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Duración
              </div>
              <p className="relative text-white font-medium text-sm">
                {formatDate(competition.fecha_inicio)} - {formatDate(competition.fecha_fin)}
              </p>
            </div>

            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center text-sm text-gray-400 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Creador
              </div>
              <p className="relative text-white font-medium">{competition.creator_name}</p>
            </div>

            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center text-sm text-gray-400 mb-2">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {isActive ? 'Tiempo Restante' : 'Estado'}
              </div>
              <p className="relative text-white font-medium">
                {isActive ? (
                  daysRemaining > 0 ? `${daysRemaining} días` : 'Último día'
                ) : (
                  competition.estado === 'finalizada' ? 'Finalizada' : 'Cancelada'
                )}
              </p>
            </div>
          </div>

          {/* Estadísticas del usuario */}
          {user_stats && (
            <div className="relative bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-indigo-700/50 backdrop-blur-sm mb-6 overflow-hidden group">
              {/* Efectos de fondo */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-50"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
              
              <div className="relative">
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Tu Rendimiento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group/stat relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 transform hover:scale-105 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center mb-2">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg group-hover/stat:scale-110 transition-transform duration-300">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent mb-1">{user_stats.current_score}</p>
                    <p className="text-sm text-gray-400 font-medium">Puntuación Actual</p>
                  </div>
                  
                  <div className="group/stat relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300 transform hover:scale-105 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center mb-2">
                      <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg group-hover/stat:scale-110 transition-transform duration-300">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent mb-1">#{user_stats.position}</p>
                    <p className="text-sm text-gray-400 font-medium">Posición</p>
                  </div>
                  
                  <div className="group/stat relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center mb-2">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover/stat:scale-110 transition-transform duration-300">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent mb-1">{user_stats.total_participants}</p>
                    <p className="text-sm text-gray-400 font-medium">Total Participantes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botón de unirse */}
          {competition.can_join && !competition.is_participant && (
            <div className="mb-6">
              <button
                onClick={handleJoinCompetition}
                disabled={joining}
                className="relative group bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:shadow-gray-500/25 flex items-center gap-3 overflow-hidden"
              >
                {/* Efecto de brillo */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                
                {joining ? (
                  <>
                    <div className="relative w-5 h-5">
                      <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="relative">Uniéndose...</span>
                  </>
                ) : (
                  <>
                    <div className="relative p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-300">
                      <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="relative text-lg">Unirse a la Competencia</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden">
          {/* Efectos de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5 opacity-50"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-orange-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              Tabla de Clasificación
            </h2>
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Sin participantes</h3>
              <p className="text-sm text-gray-400">¡Sé el primero en unirte a esta competencia!</p>
            </div>
          ) : (
            <div className="space-y-3 p-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`group relative flex items-center justify-between p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
                    entry.position === 1
                      ? 'bg-gradient-to-r from-yellow-500/20 via-yellow-400/15 to-yellow-500/20 border border-yellow-500/30 shadow-lg shadow-yellow-500/10'
                      : entry.position === 2
                      ? 'bg-gradient-to-r from-gray-400/20 via-gray-300/15 to-gray-400/20 border border-gray-400/30 shadow-lg shadow-gray-400/10'
                      : entry.position === 3
                      ? 'bg-gradient-to-r from-orange-500/20 via-orange-400/15 to-orange-500/20 border border-orange-500/30 shadow-lg shadow-orange-500/10'
                      : entry.is_current_user
                      ? 'bg-gradient-to-r from-indigo-900/50 via-indigo-800/30 to-indigo-900/50 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                      : 'bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/30 hover:border-gray-500/50'
                  }`}
                >
                  {/* Efecto de brillo en hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-xl"></div>
                  
                  <div className="relative flex items-center gap-4">
                    <div className="relative">
                      {getPositionIcon(entry.position)}
                      {entry.position <= 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs">
                          {entry.position === 1 ? '👑' : entry.position === 2 ? '⭐' : '🔥'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Avatar del usuario */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center ring-2 ring-gray-500/30 group-hover:ring-gray-400/50 transition-all duration-300">
                        {entry.user_photo ? (
                          <img
                            src={entry.user_photo}
                            alt={entry.user_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                        {entry.is_current_user && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold text-lg ${
                          entry.is_current_user 
                            ? 'bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent' 
                            : entry.position <= 3
                            ? 'bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent'
                            : 'text-white'
                        }`}>
                          {entry.user_name}
                          {entry.is_current_user && (
                            <span className="ml-2 text-xs bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-2 py-1 rounded-full shadow-lg">
                              Tú
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400 font-medium">
                          Unido: {new Date(entry.join_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-6">
                    {/* Medalla separada */}
                    {entry.position <= 3 && (
                      <div className="text-3xl animate-pulse">
                        {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'}
                      </div>
                    )}
                    {/* Puntuación */}
                    <div className="text-right">
                      <p className={`text-2xl font-bold mb-1 ${
                        entry.is_current_user 
                          ? 'bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent'
                          : entry.position === 1
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent'
                          : entry.position === 2
                          ? 'bg-gradient-to-r from-gray-300 to-gray-200 bg-clip-text text-transparent'
                          : entry.position === 3
                          ? 'bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent'
                          : 'text-white'
                      }`}>
                        {entry.score}
                      </p>
                      <p className="text-sm text-gray-400 font-medium">puntos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reglas de la competencia */}
        <div className="relative mt-8 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden">
          {/* Efectos de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-blue-500/5 opacity-50"></div>
          <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative p-6 border-b border-gray-700/50">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Reglas de la Competencia
            </h3>
          </div>
          <div className="relative p-6">
            <div className="space-y-4 text-gray-300">
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-700/30 to-gray-800/30 border border-gray-600/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mt-2 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"></div>
                <p className="leading-relaxed"><strong className="text-blue-400">Tipo de Meta:</strong> {getCompetitionTypeLabel(competition.tipo_meta)}</p>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-700/30 to-gray-800/30 border border-gray-600/30 hover:border-indigo-500/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-3 h-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full mt-2 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"></div>
                <p className="leading-relaxed"><strong className="text-indigo-400">Objetivo:</strong> {competition.meta_objetivo} {competition.tipo_meta === 'MAX_HABITOS_DIA' ? 'hábitos por día' : competition.tipo_meta === 'MAX_RACHA' ? 'días consecutivos' : 'hábitos completados'}</p>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-700/30 to-gray-800/30 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mt-2 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"></div>
                <p className="leading-relaxed"><strong className="text-purple-400">Valor por punto:</strong> {competition.valor}</p>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-700/30 to-gray-800/30 border border-gray-600/30 hover:border-green-500/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full mt-2 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"></div>
                <p className="leading-relaxed"><strong className="text-green-400">Duración:</strong> Del {formatDate(competition.fecha_inicio)} al {formatDate(competition.fecha_fin)}</p>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-700/30 to-gray-800/30 border border-gray-600/30 hover:border-yellow-500/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full mt-2 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"></div>
                <p className="leading-relaxed"><strong className="text-yellow-400">Puntuación:</strong> Se actualiza automáticamente basada en el progreso de tus hábitos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CompetitionDetailPage;