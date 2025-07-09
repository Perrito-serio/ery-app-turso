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
        <div className="flex items-center justify-center h-64 animate-fade-in">
          <div className="text-center bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-xl">
            <svg className="mx-auto h-16 w-16 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent mb-2">Acceso Requerido</h3>
            <p className="text-gray-400">Debes iniciar sesión para ver esta página.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout pageTitle="Cargando...">
        <div className="flex items-center justify-center h-64 animate-fade-in">
          <div className="text-center bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-xl">
            <div className="relative mx-auto h-16 w-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-gray-600"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-2 border-purple-500 border-b-transparent animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent mb-2">Cargando Leaderboard</h3>
            <p className="text-gray-400">Obteniendo clasificaciones...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !leaderboardData) {
    return (
      <MainLayout pageTitle="Error">
        <div className="text-center py-12 animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 shadow-xl max-w-md mx-auto">
            <div className="relative mx-auto h-16 w-16 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent mb-2">Error</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              href={`/competitions/${competitionId}`}
              className="group relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative">Volver a la Competencia</span>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { competition, leaderboard, user_stats } = leaderboardData;

  return (
    <MainLayout pageTitle={`Leaderboard - ${competition.nombre}`}>
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8 animate-slide-in-up">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/competitions/${competition.id}`}
              className="group p-2 -m-2 text-gray-400 hover:text-white transition-all duration-300 hover:bg-gray-800/50 rounded-lg"
            >
              <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Tabla de Clasificación
              </h1>
              <p className="text-gray-400 text-lg">{competition.nombre} - {getCompetitionTypeLabel(competition.tipo_meta)}</p>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-gray-800/50 via-gray-700/30 to-gray-800/50 rounded-xl p-1 backdrop-blur-sm border border-gray-700/50">
              <button
                onClick={() => setViewMode('list')}
                className={`relative p-3 rounded-lg transition-all duration-300 overflow-hidden group ${
                  viewMode === 'list' ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25' : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {viewMode === 'list' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
                <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`relative p-3 rounded-lg transition-all duration-300 overflow-hidden group ${
                  viewMode === 'grid' ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25' : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {viewMode === 'grid' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
                <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas del usuario */}
        {user_stats && (
          <div className="bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-indigo-900/60 backdrop-blur-sm rounded-2xl p-8 border border-indigo-500/30 mb-8 shadow-xl shadow-indigo-500/10 animate-slide-in-up" style={{animationDelay: '0.2s'}}>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Tu Rendimiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/10 animate-slide-in-up" style={{animationDelay: '0.3s'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-medium mb-1">Tu Puntuación</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">{user_stats?.current_score}</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </div>

              <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/10 animate-slide-in-up" style={{animationDelay: '0.4s'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-medium mb-1">Tu Posición</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">#{user_stats?.position}</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </div>

              <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 animate-slide-in-up" style={{animationDelay: '0.5s'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-medium mb-1">Total Participantes</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">{user_stats?.total_participants}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl shadow-gray-900/20 animate-slide-in-up" style={{animationDelay: '0.6s'}}>
          <div className="p-8 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent flex items-center gap-3">
                <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Tabla de Clasificación
              </h2>
            </div>
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-8 border border-gray-600/30">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">Sin participantes</h3>
                <p className="text-gray-400">Aún no hay participantes en esta competencia.</p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-gray-700/30 to-gray-800/30 border-b border-gray-700/50 grid grid-cols-12 gap-4 text-sm font-medium text-gray-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-7">Participante</div>
                <div className="col-span-2 text-center">Puntuación</div>
                <div className="col-span-2 text-center">Detalles</div>
              </div>
              <div className="divide-y divide-gray-700/30">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`p-6 grid grid-cols-12 gap-4 items-center hover:bg-gradient-to-r hover:from-gray-700/20 hover:to-gray-800/20 transition-all duration-300 group animate-slide-in-up ${
                      entry.is_current_user ? 'bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-indigo-900/40 border-l-4 border-indigo-400 shadow-lg shadow-indigo-500/10' : ''
                    }`}
                    style={{animationDelay: `${0.7 + index * 0.1}s`}}
                  >
                    <div className="col-span-1 flex justify-center">
                      <div className="group-hover:scale-110 transition-transform duration-300">
                        {getPositionIcon(entry.position)}
                      </div>
                    </div>
                    <div className="col-span-7">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={entry.user_photo || `https://ui-avatars.com/api/?name=${entry.user_name}&background=random`}
                            alt={entry.user_name}
                            className="w-12 h-12 rounded-full border-2 border-gray-600 group-hover:border-indigo-400 transition-all duration-300"
                          />
                          {entry.is_current_user && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border-2 border-gray-800"></div>
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold text-lg group-hover:text-indigo-300 transition-colors duration-300 ${
                            entry.is_current_user ? 'text-indigo-300' : 'text-white'
                          }`}>
                            {entry.user_name}
                            {entry.is_current_user && (
                              <span className="ml-3 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full font-medium shadow-lg">
                                Tú
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Unido: {formatDate(entry.join_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-3 group-hover:from-indigo-900/30 group-hover:to-purple-900/30 transition-all duration-300">
                        <p className={`text-2xl font-bold group-hover:scale-110 transition-transform duration-300 ${
                          entry.is_current_user ? 'text-indigo-300' : 'text-white'
                        }`}>
                          {entry.score}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">puntos</p>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <div className="text-center bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-lg p-3 group-hover:from-blue-900/30 group-hover:to-blue-800/30 transition-all duration-300">
                        <p className="text-sm text-gray-400 mb-1">Posición</p>
                        <p className="font-bold text-blue-300 text-lg">#{entry.position}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-2xl border overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl animate-slide-in-up ${
                      entry.is_current_user ? 'border-indigo-400 shadow-lg shadow-indigo-500/20' : 'border-gray-700/50 hover:border-indigo-500/50'
                    }`}
                    style={{animationDelay: `${0.7 + index * 0.1}s`}}
                  >
                    <div className={`p-6 text-center relative overflow-hidden ${
                      entry.position === 1 ? 'bg-gradient-to-br from-yellow-500/30 via-yellow-600/20 to-orange-500/30' :
                      entry.position === 2 ? 'bg-gradient-to-br from-gray-400/30 via-gray-500/20 to-gray-600/30' :
                      entry.position === 3 ? 'bg-gradient-to-br from-orange-500/30 via-orange-600/20 to-red-500/30' :
                      'bg-gradient-to-br from-gray-700/50 to-gray-800/50'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative">
                        <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                          {getPositionIcon(entry.position)}
                        </div>
                        <p className="text-lg font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                          {entry.position === 1 ? '🏆 Primer Lugar' :
                           entry.position === 2 ? '🥈 Segundo Lugar' :
                           entry.position === 3 ? '🥉 Tercer Lugar' :
                           `Posición #${entry.position}`}
                        </p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-4">
                          <img
                            src={entry.user_photo || `https://ui-avatars.com/api/?name=${entry.user_name}&background=random`}
                            alt={entry.user_name}
                            className="w-20 h-20 rounded-full border-4 border-gray-600 group-hover:border-indigo-400 transition-all duration-300 group-hover:scale-110"
                          />
                          {entry.is_current_user && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className={`font-semibold text-xl mb-2 text-center group-hover:text-indigo-300 transition-colors duration-300 ${
                          entry.is_current_user ? 'text-indigo-300' : 'text-white'
                        }`}>
                          {entry.user_name}
                          {entry.is_current_user && (
                            <span className="block mt-2 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full font-medium shadow-lg">
                              Tú
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Unido: {formatDate(entry.join_date)}
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-6 mb-4 group-hover:from-indigo-900/30 group-hover:to-purple-900/30 transition-all duration-300">
                        <div className="text-center">
                          <p className="text-sm text-gray-400 mb-2 flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Puntuación
                          </p>
                          <p className={`text-4xl font-bold group-hover:scale-110 transition-transform duration-300 ${
                            entry.is_current_user ? 'text-indigo-300' : 'bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent'
                          }`}>
                            {entry.score}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">puntos totales</p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-4 text-center group-hover:from-blue-900/30 group-hover:to-blue-800/30 transition-all duration-300">
                        <p className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Posición
                        </p>
                        <p className="text-xl font-bold text-blue-300">#{entry.position}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CompetitionLeaderboardPage;