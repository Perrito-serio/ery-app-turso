'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// --- Interfaces ---
interface User {
  id: number;
  nombre: string;
  fecha_creacion: string;
}

interface Friend extends User {
  email: string;
  fecha_inicio_amistad: string;
}

interface FriendInvitation {
  id: number;
  solicitante_id: number;
  solicitado_id: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fecha_envio: string;
  solicitante_nombre?: string;
  solicitante_email?: string;
  solicitado_nombre?: string;
  solicitado_email?: string;
}

// --- Iconos ---
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const UserPlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.674-1.334c.343.061.672.133.985.227.58.17 1.018.745 1.018 1.416v.109c0 .718-.616 1.33-1.334 1.33H4.334A1.334 1.334 0 014 19.235z" />
  </svg>
);

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Estados principales
  const [activeTab, setActiveTab] = useState<'friends' | 'invitations' | 'search'>('friends');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados para amigos
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para invitaciones
  const [invitations, setInvitations] = useState<FriendInvitation[]>([]);
  const [isProcessingInvitation, setIsProcessingInvitation] = useState<number | null>(null);

  // Estados para búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState<number | null>(null);

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Cargar amigos
  const fetchFriends = useCallback(async () => {
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) throw new Error('Error al cargar amigos');
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, []);

  // Cargar invitaciones
  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/friends/invitations');
      if (!response.ok) throw new Error('Error al cargar invitaciones');
      const data = await response.json();
      // Combinar invitaciones recibidas y enviadas
      const allInvitations = [...(data.received_invitations || []), ...(data.sent_invitations || [])];
      setInvitations(allInvitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, []);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchFriends(), fetchInvitations()]);
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFriends, fetchInvitations]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, loadData]);

  // Buscar usuarios
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Error en la búsqueda');
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (err) {
      showNotification('Error al buscar usuarios', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Enviar invitación de amistad
  const sendFriendInvitation = async (userId: number) => {
    setIsSendingInvitation(userId);
    try {
      const response = await fetch('/api/friends/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitado_id: userId })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al enviar invitación');
      
      showNotification('Invitación enviada correctamente', 'success');
      await fetchInvitations(); // Recargar invitaciones
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error al enviar invitación', 'error');
    } finally {
      setIsSendingInvitation(null);
    }
  };

  // Responder a invitación
  const respondToInvitation = async (invitationId: number, action: 'aceptar' | 'rechazar') => {
    setIsProcessingInvitation(invitationId);
    try {
      const response = await fetch(`/api/friends/invitations/${invitationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: action })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al procesar invitación');
      
      showNotification(
        action === 'aceptar' ? 'Invitación aceptada' : 'Invitación rechazada',
        'success'
      );
      
      await Promise.all([fetchInvitations(), fetchFriends()]); // Recargar ambos
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error al procesar invitación', 'error');
    } finally {
      setIsProcessingInvitation(null);
    }
  };

  // Eliminar amistad
  const handleConfirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/friends/${friendToDelete.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar amistad');
      
      showNotification('Amistad eliminada', 'success');
      setFriends(prev => prev.filter(f => f.id !== friendToDelete.id));
      setFriendToDelete(null);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error al eliminar amistad', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Obtener invitaciones recibidas pendientes
  const receivedInvitations = invitations.filter(
    inv => inv.solicitado_id === parseInt(session?.user?.id || '0') && inv.estado === 'pendiente'
  );

  if (status === 'loading' || isLoading) {
    return (
      <MainLayout pageTitle="Amigos">
        <div className="text-center">Cargando...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Amigos">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Gestión de Amigos</h2>
          {receivedInvitations.length > 0 && (
            <div className="flex items-center bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">
              <BellIcon />
              <span className="ml-1">{receivedInvitations.length} solicitud{receivedInvitations.length !== 1 ? 'es' : ''} pendiente{receivedInvitations.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Notificación */}
        {notification && (
          <div className={`mb-4 p-3 rounded-md ${notification.type === 'success' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
            {notification.message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-700 text-white p-3 rounded mb-4 cursor-pointer" onClick={() => setError(null)}>
            {error}
          </div>
        )}

        {/* Pestañas */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('friends')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'friends'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <UsersIcon />
              <span className="ml-2">Mis Amigos ({friends.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'invitations'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <BellIcon />
              <span className="ml-2">Solicitudes ({receivedInvitations.length})</span>
              {receivedInvitations.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {receivedInvitations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'search'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <SearchIcon />
              <span className="ml-2">Buscar Usuarios</span>
            </button>
          </nav>
        </div>

        {/* Contenido de las pestañas */}
        {activeTab === 'friends' && (
          <div>
            <h3 className="text-xl font-semibold text-gray-300 mb-4">Mis Amigos</h3>
            {friends.length === 0 ? (
              <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
                <UsersIcon />
                <h4 className="text-lg font-semibold text-white mb-2">No tienes amigos todavía</h4>
                <p>¡Busca usuarios y envía solicitudes de amistad para empezar a conectar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map(friend => (
                  <div key={friend.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center flex-1 cursor-pointer"
                        onClick={() => router.push(`/profile/${friend.id}`)}
                        title="Ver perfil de amigo"
                      >
                        <img
                          src={`https://ui-avatars.com/api/?name=${friend.nombre}&background=random`}
                          alt={friend.nombre}
                          className="w-12 h-12 rounded-full mr-3"
                        />
                        <div>
                          <h4 className="font-semibold text-white hover:text-indigo-300 transition-colors">{friend.nombre}</h4>
                          <p className="text-sm text-gray-400">{friend.email}</p>
                          <p className="text-xs text-gray-500">
                            Amigos desde: {new Date(friend.fecha_inicio_amistad).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/profile/${friend.id}`)}
                          className="text-indigo-400 hover:text-indigo-300 p-2 rounded-md hover:bg-indigo-900/20"
                          title="Ver perfil"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setFriendToDelete(friend)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-md hover:bg-red-900/20"
                          title="Eliminar amistad"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div>
            <h3 className="text-xl font-semibold text-gray-300 mb-4">Solicitudes de Amistad</h3>
            {receivedInvitations.length === 0 ? (
              <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
                <BellIcon />
                <h4 className="text-lg font-semibold text-white mb-2">No tienes solicitudes pendientes</h4>
                <p>Cuando alguien te envíe una solicitud de amistad, aparecerá aquí.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedInvitations.map(invitation => (
                  <div key={invitation.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img
                          src={`https://ui-avatars.com/api/?name=${invitation.solicitante_nombre}&background=random`}
                          alt={invitation.solicitante_nombre}
                          className="w-12 h-12 rounded-full mr-3"
                        />
                        <div>
                          <h4 className="font-semibold text-white">{invitation.solicitante_nombre}</h4>
                          <p className="text-sm text-gray-400">{invitation.solicitante_email}</p>
                          <p className="text-xs text-gray-500">
                            Enviada: {new Date(invitation.fecha_envio).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => respondToInvitation(invitation.id, 'aceptar')}
                          disabled={isProcessingInvitation === invitation.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
                        >
                          {isProcessingInvitation === invitation.id ? 'Procesando...' : 'Aceptar'}
                        </button>
                        <button
                          onClick={() => respondToInvitation(invitation.id, 'rechazar')}
                          disabled={isProcessingInvitation === invitation.id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
                        >
                          {isProcessingInvitation === invitation.id ? 'Procesando...' : 'Rechazar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <h3 className="text-xl font-semibold text-gray-300 mb-4">Buscar Usuarios</h3>
            
            {/* Campo de búsqueda */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email (mínimo 2 caracteres)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados de búsqueda */}
            {searchQuery.length >= 2 && (
              <div>
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-center text-gray-400 bg-gray-800 p-6 rounded-lg">
                    <p>No se encontraron usuarios con ese criterio de búsqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(user => {
                      const isAlreadyFriend = friends.some(f => f.id === user.id);
                      const hasPendingInvitation = invitations.some(
                        inv => (inv.solicitante_id === user.id || inv.solicitado_id === user.id) && inv.estado === 'pendiente'
                      );
                      
                      return (
                        <div key={user.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img
                                src={`https://ui-avatars.com/api/?name=${user.nombre}&background=random`}
                                alt={user.nombre}
                                className="w-12 h-12 rounded-full mr-3"
                              />
                              <div>
                                <h4 className="font-semibold text-white">{user.nombre}</h4>
                                <p className="text-sm text-gray-400">ID: {user.id}</p>
                                <p className="text-xs text-gray-500">
                                  Miembro desde: {new Date(user.fecha_creacion).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div>
                              {isAlreadyFriend ? (
                                <span className="text-green-400 text-sm font-medium">Ya son amigos</span>
                              ) : hasPendingInvitation ? (
                                <span className="text-yellow-400 text-sm font-medium">Invitación pendiente</span>
                              ) : (
                                <button
                                  onClick={() => sendFriendInvitation(user.id)}
                                  disabled={isSendingInvitation === user.id}
                                  className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
                                >
                                  <UserPlusIcon />
                                  <span className="ml-1">
                                    {isSendingInvitation === user.id ? 'Enviando...' : 'Agregar'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <div className="text-center text-gray-400 bg-gray-800 p-6 rounded-lg">
                <p>Escribe al menos 2 caracteres para buscar usuarios.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminar amistad */}
      <ConfirmationModal
        isOpen={!!friendToDelete}
        onClose={() => setFriendToDelete(null)}
        onConfirm={handleConfirmDeleteFriend}
        title="Confirmar Eliminación de Amistad"
        message={`¿Estás seguro de que quieres eliminar la amistad con "${friendToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmButtonText="Sí, eliminar"
        isConfirming={isDeleting}
      />
    </MainLayout>
  );
}