'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Interfaces
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
}

interface Participant {
  usuario_id: number;
  nombre: string;
  email: string;
  puntuacion: number;
  fecha_union: string;
  posicion: number;
}

interface Friend {
  id: number;
  nombre: string;
  email: string;
  imagen?: string;
}

interface CompetitionInvitation {
  id: number;
  competencia_id: number;
  invitado_id: number;
  invitado_email: string;
  invitado_nombre: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fecha_invitacion: string;
}

const ManageCompetitionPage: React.FC = () => {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const competitionId = params?.id as string;
  
  const [competition, setCompetition] = useState<CompetitionDetails | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitations, setInvitations] = useState<CompetitionInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'invitations'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (competitionId) {
      fetchCompetitionData();
    }
  }, [competitionId]);

  const fetchCompetitionData = async () => {
    try {
      setLoading(true);
      
      // Obtener detalles de la competencia
      const competitionResponse = await fetch(`/api/competitions/${competitionId}`);
      if (!competitionResponse.ok) {
        throw new Error('Error al cargar la competencia');
      }
      const competitionData = await competitionResponse.json();
      
      if (!competitionData.competition.is_creator) {
        router.push(`/competitions/${competitionId}`);
        return;
      }
      
      setCompetition(competitionData.competition);
      
      // Obtener participantes
      const leaderboardResponse = await fetch(`/api/competitions/${competitionId}/leaderboard`);
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setParticipants(leaderboardData.leaderboard || []);
      }
      
      // Obtener amigos para invitar
      const friendsResponse = await fetch('/api/friends');
      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriends(friendsData.friends || []);
      }
      
      // Obtener invitaciones
      const invitationsResponse = await fetch(`/api/competitions/invitations`);
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        // Filtrar invitaciones para esta competencia específica
        const competitionInvitations = invitationsData.invitations?.filter(
          (inv: any) => inv.competencia_id === parseInt(competitionId)
        ) || [];
        setInvitations(competitionInvitations);
      }
      
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar los datos de la competencia');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriends = async () => {
    if (selectedFriends.length === 0) return;
    
    try {
      setInviting(true);
      
      const response = await fetch(`/api/competitions/${competitionId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friend_ids: selectedFriends
        }),
      });

      if (response.ok) {
        setShowInviteModal(false);
        setSelectedFriends([]);
        // Recargar invitaciones
        const invitationsResponse = await fetch(`/api/competitions/invitations`);
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          // Filtrar invitaciones para esta competencia específica
          const competitionInvitations = invitationsData.invitations?.filter(
            (inv: any) => inv.competencia_id === parseInt(competitionId)
          ) || [];
          setInvitations(competitionInvitations);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al enviar invitaciones');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al enviar invitaciones');
    } finally {
      setInviting(false);
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
      case 'pendiente':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'aceptada':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'rechazada':
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
      month: 'short',
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

  if (!session) {
    return (
      <MainLayout pageTitle="Gestionar Competencia">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Acceso Requerido</h3>
            <p className="text-gray-400 mb-6">Debes iniciar sesión para gestionar competencias.</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout pageTitle="Cargando...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-gray-900 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Cargando Gestión</h3>
            <p className="text-gray-400">Obteniendo datos de la competencia...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !competition) {
    return (
      <MainLayout pageTitle="Error">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-orange-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-red-500/30">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Error de Carga</h3>
            <p className="text-gray-400 mb-6">{error || 'No se pudo cargar la competencia'}</p>
            <Link
              href="/competitions"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Competencias
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const daysRemaining = getDaysRemaining(competition.fecha_fin);
  const isActive = competition.estado === 'activa';
  const totalParticipants = participants.length;
  const pendingInvitations = invitations.filter(inv => inv.estado === 'pendiente').length;

  return (
    <MainLayout pageTitle={`Gestionar: ${competition.nombre}`}>
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gestionar Competencia
              </h1>
              <p className="text-gray-400 text-lg">{competition.nombre}</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="group relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invitar Amigos
              </span>
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 animate-slide-in-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-1">Participantes</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">{totalParticipants}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </div>

          <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/10 animate-slide-in-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-1">Invitaciones Pendientes</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">{pendingInvitations}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </div>

          <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/10 animate-slide-in-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-1">Estado</p>
                <p className="text-lg font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent capitalize">{competition.estado}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                isActive ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </div>

          <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/10 animate-slide-in-up" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-1">{isActive ? 'Días Restantes' : 'Finalizada'}</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">
                  {isActive ? (daysRemaining > 0 ? daysRemaining : '0') : '—'}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="mb-8 animate-slide-in-up" style={{animationDelay: '0.5s'}}>
          <div className="bg-gradient-to-r from-gray-800/50 via-gray-700/30 to-gray-800/50 rounded-xl p-1 backdrop-blur-sm border border-gray-700/50">
            <nav className="flex space-x-1">
              {[
                { key: 'overview', label: 'Resumen', icon: '📊' },
                { key: 'participants', label: 'Participantes', icon: '👥' },
                { key: 'invitations', label: 'Invitaciones', icon: '📧' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`relative flex-1 py-3 px-6 font-medium text-sm transition-all duration-300 rounded-lg overflow-hidden group ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {activeTab === tab.key && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    <span>{tab.icon}</span>
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Información de la competencia */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Información de la Competencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Tipo de Meta</p>
                  <p className="text-white">{getCompetitionTypeLabel(competition.tipo_meta)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Objetivo</p>
                  <p className="text-white">{competition.meta_objetivo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Valor por Punto</p>
                  <p className="text-white">{competition.valor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Fecha de Creación</p>
                  <p className="text-white">{formatDate(competition.fecha_creacion)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Fecha de Inicio</p>
                  <p className="text-white">{formatDate(competition.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Fecha de Fin</p>
                  <p className="text-white">{formatDate(competition.fecha_fin)}</p>
                </div>
              </div>
              {competition.descripcion && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-1">Descripción</p>
                  <p className="text-white">{competition.descripcion}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Participantes ({totalParticipants})</h3>
            </div>
            {participants.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h4 className="mt-2 text-sm font-medium text-gray-300">Sin participantes</h4>
                <p className="mt-1 text-sm text-gray-400">Invita a tus amigos para que se unan a la competencia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {participants.map((participant, index) => (
                  <div key={participant.usuario_id} className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/10 animate-slide-in-up" style={{animationDelay: `${0.1 * (index + 1)}s`}}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                          participant.posicion === 1 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                          participant.posicion === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          participant.posicion === 3 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                          'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }`}>
                          <span className="text-white font-bold text-lg">
                            {participant.posicion}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-lg group-hover:text-indigo-200 transition-colors duration-300">{participant.nombre}</h3>
                          <p className="text-sm text-gray-400">{participant.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{participant.puntuacion}</p>
                        <p className="text-sm text-gray-400">puntos</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 bg-gray-900/30 rounded-lg p-3 border border-gray-700/30">
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Se unió el {formatDate(participant.fecha_union)}
                      </p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Invitaciones ({invitations.length})</h3>
            </div>
            {invitations.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h4 className="mt-2 text-sm font-medium text-gray-300">Sin invitaciones</h4>
                <p className="mt-1 text-sm text-gray-400">Aún no has enviado invitaciones para esta competencia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {invitations.map((invitation, index) => (
                  <div key={invitation.id} className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 animate-slide-in-up" style={{animationDelay: `${0.1 * (index + 1)}s`}}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <span className="text-white font-bold text-lg">
                            {invitation.invitado_nombre.charAt(0).toUpperCase()}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-lg group-hover:text-purple-200 transition-colors duration-300">{invitation.invitado_nombre}</h3>
                          <p className="text-sm text-gray-400">{invitation.invitado_email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400 bg-gray-900/30 rounded-lg p-3 border border-gray-700/30 flex-1 mr-4">
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Invitado el {formatDate(invitation.fecha_invitacion)}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border transition-all duration-300 ${
                        invitation.estado === 'pendiente'
                          ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 border-yellow-500/30 text-yellow-400'
                          : invitation.estado === 'aceptada'
                          ? 'bg-gradient-to-r from-green-500/20 to-green-400/20 border-green-500/30 text-green-400'
                          : 'bg-gradient-to-r from-red-500/20 to-red-400/20 border-red-500/30 text-red-400'
                      }`}>
                        {invitation.estado === 'pendiente' && '⏳ '}
                        {invitation.estado === 'aceptada' && '✅ '}
                        {invitation.estado === 'rechazada' && '❌ '}
                        {invitation.estado.charAt(0).toUpperCase() + invitation.estado.slice(1)}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de invitar amigos */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md max-h-[80vh] overflow-y-auto border border-gray-700/50 shadow-2xl animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent flex items-center gap-3">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Invitar Amigos
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="group p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300"
                >
                  <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No tienes amigos para invitar.</p>
                  <Link
                    href="/friends"
                    className="text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
                  >
                    Agregar amigos
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {friends.map((friend) => {
                      const isAlreadyInvited = invitations.some(inv => inv.invitado_id === friend.id);
                      const isParticipant = participants.some(p => p.usuario_id === friend.id);
                      const isDisabled = isAlreadyInvited || isParticipant;
                      
                      return (
                        <label
                          key={friend.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors duration-200 ${
                            isDisabled
                              ? 'border-gray-600 bg-gray-700 opacity-50 cursor-not-allowed'
                              : selectedFriends.includes(friend.id)
                              ? 'border-indigo-500 bg-indigo-900 bg-opacity-30'
                              : 'border-gray-600 hover:border-gray-500 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={selectedFriends.includes(friend.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFriends([...selectedFriends, friend.id]);
                              } else {
                                setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                              }
                            }}
                            className="rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <p className="text-white font-medium">{friend.nombre}</p>
                            <p className="text-sm text-gray-400">{friend.email}</p>
                            {isParticipant && (
                              <p className="text-xs text-green-400">Ya participa</p>
                            )}
                            {isAlreadyInvited && !isParticipant && (
                              <p className="text-xs text-yellow-400">Ya invitado</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-4 pt-6">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 border border-gray-600/50 hover:border-gray-500/50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleInviteFriends}
                      disabled={selectedFriends.length === 0 || inviting}
                      className="group relative flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        {inviting ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Invitar ({selectedFriends.length})
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ManageCompetitionPage;