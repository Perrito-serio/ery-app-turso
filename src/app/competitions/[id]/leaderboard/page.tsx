'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Interfaces
interface CompetitionDetails {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  estado: 'activa' | 'finalizada' | 'cancelada';
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

const CompetitionLeaderboardPage: React.FC = () => {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const competitionId = params?.id as string;
  
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES');
  };

  useEffect(() => {
    if (competitionId) {
      fetchLeaderboard();
    }
  }, [competitionId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/competitions/${competitionId}/leaderboard`);
      if (!response.ok) {
        throw new Error('Error al cargar el leaderboard');
      }
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar el leaderboard');
    } finally {
      setLoading(false);
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

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {position}
          </div>
        );
    }
  };

  if (!session) {
    return (
      <MainLayout pageTitle="Leaderboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Debes iniciar sesión para ver esta página.</p>
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

  if (error || !leaderboardData) {
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
              href={`/competitions/${competitionId}`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Volver a la Competencia
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { competition, leaderboard, user_stats } = leaderboardData;

  return (
    <MainLayout pageTitle={`Leaderboard - ${competition.nombre}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/competitions/${competition.id}`}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Tabla de Clasificación</h1>
              <p className="text-gray-400">{competition.nombre} - {getCompetitionTypeLabel(competition.tipo_meta)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas del usuario */}
        {user_stats && (
          <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-6 border border-indigo-700 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Tu Rendimiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Tu Puntuación</p>
                    <p className="text-3xl font-bold text-indigo-400">{user_stats.current_score}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Tu Posición</p>
                    <p className="text-3xl font-bold text-indigo-400">#{user_stats.position}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Participantes</p>
                    <p className="text-3xl font-bold text-indigo-400">{user_stats.total_participants}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">Sin participantes</h3>
            <p className="mt-1 text-sm text-gray-400">Aún no hay participantes en esta competencia.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-750 border-b border-gray-700 grid grid-cols-12 gap-4 text-sm font-medium text-gray-400">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-7">Participante</div>
              <div className="col-span-2 text-center">Puntuación</div>
              <div className="col-span-2 text-center">Detalles</div>
            </div>
            <div className="divide-y divide-gray-700">
              {leaderboard.map((entry) => (
                <div
                  key={entry.user_id}
                  className={`p-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-750 transition-colors duration-200 ${
                    entry.is_current_user ? 'bg-indigo-900 bg-opacity-30 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="col-span-1 flex justify-center">
                    {getPositionIcon(entry.position)}
                  </div>
                  <div className="col-span-7">
                    <div className="flex items-center gap-3">
                      <img
                        src={entry.user_photo || `https://ui-avatars.com/api/?name=${entry.user_name}&background=random`}
                        alt={entry.user_name}
                        className="w-10 h-10 rounded-full"
                      />
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
                        <p className="text-sm text-gray-400">Unido: {formatDate(entry.join_date)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className={`text-xl font-bold ${
                      entry.is_current_user ? 'text-indigo-400' : 'text-white'
                    }`}>
                      {entry.score}
                    </p>
                  </div>
                  <div className="col-span-2 flex justify-center gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Puntuación</p>
                      <p className="font-bold text-blue-400">{entry.score}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`bg-gray-800 rounded-lg border overflow-hidden ${
                  entry.is_current_user ? 'border-indigo-500' : 'border-gray-700'
                }`}
              >
                <div className={`p-4 text-center ${
                  entry.position === 1 ? 'bg-yellow-500 bg-opacity-20' :
                  entry.position === 2 ? 'bg-gray-400 bg-opacity-20' :
                  entry.position === 3 ? 'bg-orange-600 bg-opacity-20' :
                  'bg-gray-700'
                }`}>
                  <div className="flex justify-center mb-2">
                    {getPositionIcon(entry.position)}
                  </div>
                  <p className="text-lg font-bold text-white">
                    {entry.position === 1 ? '🏆 Primer Lugar' :
                     entry.position === 2 ? '🥈 Segundo Lugar' :
                     entry.position === 3 ? '🥉 Tercer Lugar' :
                     `Posición #${entry.position}`}
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col items-center mb-4">
                    <img
                      src={entry.user_photo || `https://ui-avatars.com/api/?name=${entry.user_name}&background=random`}
                      alt={entry.user_name}
                      className="w-16 h-16 rounded-full mb-2"
                    />
                    <p className={`font-medium text-lg ${
                      entry.is_current_user ? 'text-indigo-400' : 'text-white'
                    }`}>
                      {entry.user_name}
                      {entry.is_current_user && (
                        <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                          Tú
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">Unido: {formatDate(entry.join_date)}</p>
                  </div>
                  
                  <div className="bg-gray-750 rounded-lg p-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Puntuación</p>
                      <p className={`text-3xl font-bold ${
                        entry.is_current_user ? 'text-indigo-400' : 'text-white'
                      }`}>
                        {entry.score}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-750 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-400">Fecha de Unión</p>
                    <p className="text-lg font-bold text-blue-400">{formatDate(entry.join_date)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CompetitionLeaderboardPage;