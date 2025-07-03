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
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Debes iniciar sesión para gestionar competencias.</p>
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

  if (error || !competition) {
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

  const daysRemaining = getDaysRemaining(competition.fecha_fin);
  const isActive = competition.estado === 'activa';
  const totalParticipants = participants.length;
  const pendingInvitations = invitations.filter(inv => inv.estado === 'pendiente').length;

  return (
    <MainLayout pageTitle={`Gestionar: ${competition.nombre}`}>
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
              <h1 className="text-3xl font-bold text-white mb-2">Gestionar Competencia</h1>
              <p className="text-gray-400">{competition.nombre}</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invitar Amigos
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Participantes</p>
                <p className="text-2xl font-bold text-white">{totalParticipants}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Invitaciones Pendientes</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingInvitations}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Estado</p>
                <p className="text-lg font-bold text-white capitalize">{competition.estado}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isActive ? 'bg-green-500 bg-opacity-20' : 'bg-gray-500 bg-opacity-20'
              }`}>
                <svg className={`w-6 h-6 ${
                  isActive ? 'text-green-500' : 'text-gray-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{isActive ? 'Días Restantes' : 'Finalizada'}</p>
                <p className="text-2xl font-bold text-white">
                  {isActive ? (daysRemaining > 0 ? daysRemaining : '0') : '—'}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'Resumen', icon: '📊' },
                { key: 'participants', label: 'Participantes', icon: '👥' },
                { key: 'invitations', label: 'Invitaciones', icon: '📧' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
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
              <div className="divide-y divide-gray-700">
                {participants.map((participant) => (
                  <div key={participant.usuario_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        participant.posicion === 1 ? 'bg-yellow-500 text-white' :
                        participant.posicion === 2 ? 'bg-gray-400 text-white' :
                        participant.posicion === 3 ? 'bg-orange-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {participant.posicion}
                      </div>
                      <div>
                        <p className="font-medium text-white">{participant.nombre}</p>
                        <p className="text-sm text-gray-400">{participant.email}</p>
                        <p className="text-xs text-gray-500">Se unió el {formatDate(participant.fecha_union)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{participant.puntuacion}</p>
                      <p className="text-sm text-gray-400">puntos</p>
                    </div>
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
              <div className="divide-y divide-gray-700">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{invitation.invitado_nombre}</p>
                      <p className="text-sm text-gray-400">{invitation.invitado_email}</p>
                      <p className="text-xs text-gray-500">Invitado el {formatDate(invitation.fecha_invitacion)}</p>
                    </div>
                    <span className={getStatusBadge(invitation.estado)}>
                      {invitation.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de invitar amigos */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Invitar Amigos</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleInviteFriends}
                      disabled={selectedFriends.length === 0 || inviting}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                    >
                      {inviting ? 'Enviando...' : `Invitar (${selectedFriends.length})`}
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