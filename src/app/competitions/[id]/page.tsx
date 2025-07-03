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
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Debes iniciar sesión para ver esta competencia.</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout pageTitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !competitionData) {
    return (
      <MainLayout pageTitle="Error">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-300">Error</h3>
          <p className="mt-1 text-sm text-gray-400">{error}</p>
          <div className="mt-6">
            <Link
              href="/competitions"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Volver a Competencias
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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/competitions"
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{competition.nombre}</h1>
                <span className={getStatusBadge(competition.estado)}>
                  {competition.estado}
                </span>
              </div>
              <p className="text-gray-400">{competition.descripcion || 'Sin descripción'}</p>
            </div>
          </div>

          {/* Información de la competencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Tipo de Meta
              </div>
              <p className="text-white font-medium">{getCompetitionTypeLabel(competition.tipo_meta)}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Duración
              </div>
              <p className="text-white font-medium">
                {formatDate(competition.fecha_inicio)} - {formatDate(competition.fecha_fin)}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Creador
              </div>
              <p className="text-white font-medium">{competition.creator_name}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isActive ? 'Tiempo Restante' : 'Estado'}
              </div>
              <p className="text-white font-medium">
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
            <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-4 border border-indigo-700 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Tu Rendimiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-400">{user_stats.current_score}</p>
                  <p className="text-sm text-gray-300">Puntuación Actual</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-400">#{user_stats.position}</p>
                  <p className="text-sm text-gray-300">Posición</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-400">{user_stats.total_participants}</p>
                  <p className="text-sm text-gray-300">Total Participantes</p>
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
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                {joining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uniéndose...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Unirse a la Competencia
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Tabla de Clasificación
            </h2>
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-300">Sin participantes</h3>
              <p className="mt-1 text-sm text-gray-400">Aún no hay participantes en esta competencia.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`p-4 flex items-center justify-between hover:bg-gray-750 transition-colors duration-200 ${
                    entry.is_current_user ? 'bg-indigo-900 bg-opacity-30 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {getPositionIcon(entry.position)}
                    <div className="flex items-center gap-3">
                      {/* Avatar del usuario */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                        {entry.user_photo ? (
                          <img
                            src={entry.user_photo}
                            alt={entry.user_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          entry.is_current_user ? 'text-indigo-400' : 'text-white'
                        }`}>
                          {entry.user_name}
                          {entry.is_current_user && (
                            <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                              Tú
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400">Unido: {new Date(entry.join_date).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      entry.is_current_user ? 'text-indigo-400' : 'text-white'
                    }`}>
                      {entry.score}
                    </p>
                    <p className="text-sm text-gray-400">puntos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reglas de la competencia */}
        <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reglas de la Competencia
          </h3>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Tipo de Meta:</strong> {getCompetitionTypeLabel(competition.tipo_meta)}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Objetivo:</strong> {competition.meta_objetivo} {competition.tipo_meta === 'MAX_HABITOS_DIA' ? 'hábitos por día' : competition.tipo_meta === 'MAX_RACHA' ? 'días consecutivos' : 'hábitos completados'}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Valor por punto:</strong> {competition.valor}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Duración:</strong> Del {formatDate(competition.fecha_inicio)} al {formatDate(competition.fecha_fin)}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Puntuación:</strong> Se actualiza automáticamente basada en el progreso de tus hábitos</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CompetitionDetailPage;