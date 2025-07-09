'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// Estilos CSS para animaciones
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

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
      // Convertir acción al formato esperado por el backend
      const backendAction = action === 'aceptar' ? 'accept' : 'reject';
      
      const response = await fetch(`/api/friends/invitations/${invitationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: backendAction })
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin">
                <div className="absolute inset-2 bg-gray-900 rounded-full flex items-center justify-center">
                  <UsersIcon />
                </div>
              </div>
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-ping opacity-20"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cargando Amigos
              </h3>
              <p className="text-gray-400 animate-pulse">Conectando con tu red social...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Amigos">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Gestión de Amigos
                </h2>
                <p className="text-gray-400">Conecta, invita y gestiona tu red social</p>
              </div>
              {receivedInvitations.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur animate-pulse"></div>
                  <div className="relative flex items-center bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                    <BellIcon />
                    <span className="ml-2">{receivedInvitations.length} solicitud{receivedInvitations.length !== 1 ? 'es' : ''} pendiente{receivedInvitations.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notificación */}
        {notification && (
          <div className={`mb-6 relative overflow-hidden rounded-xl border backdrop-blur-sm animate-in slide-in-from-top-2 duration-300 ${
            notification.type === 'success' 
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-100' 
              : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-100'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-r opacity-5 ${
              notification.type === 'success' ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500'
            }`}></div>
            <div className="relative p-4 flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                notification.type === 'success' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div 
            className="mb-6 relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-sm cursor-pointer hover:from-red-500/20 hover:to-pink-500/20 transition-all duration-300 animate-in slide-in-from-top-2" 
            onClick={() => setError(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-5"></div>
            <div className="relative p-4 flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
              <span className="text-red-100 font-medium flex-1">{error}</span>
              <span className="text-red-300 text-sm">Click para cerrar</span>
            </div>
          </div>
        )}

        {/* Pestañas */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800/30 to-gray-900/30 rounded-xl blur-sm"></div>
          <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2">
            <nav className="flex space-x-2" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('friends')}
                className={`relative whitespace-nowrap py-3 px-4 font-medium text-sm flex items-center rounded-lg transition-all duration-300 ${
                  activeTab === 'friends'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {activeTab === 'friends' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-50 animate-pulse"></div>
                )}
                <div className="relative flex items-center">
                  <UsersIcon />
                  <span className="ml-2">Mis Amigos ({friends.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`relative whitespace-nowrap py-3 px-4 font-medium text-sm flex items-center rounded-lg transition-all duration-300 ${
                  activeTab === 'invitations'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {activeTab === 'invitations' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-50 animate-pulse"></div>
                )}
                <div className="relative flex items-center">
                  <BellIcon />
                  <span className="ml-2">Solicitudes ({receivedInvitations.length})</span>
                  {receivedInvitations.length > 0 && (
                    <span className="ml-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-2 py-1 animate-bounce shadow-lg">
                      {receivedInvitations.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`relative whitespace-nowrap py-3 px-4 font-medium text-sm flex items-center rounded-lg transition-all duration-300 ${
                  activeTab === 'search'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {activeTab === 'search' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-50 animate-pulse"></div>
                )}
                <div className="relative flex items-center">
                  <SearchIcon />
                  <span className="ml-2">Buscar Usuarios</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        {activeTab === 'friends' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Mis Amigos</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></div>
            </div>
            {friends.length === 0 ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-xl"></div>
                <div className="relative text-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-12 rounded-2xl">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <UsersIcon />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-ping opacity-10"></div>
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">No tienes amigos todavía</h4>
                  <p className="text-gray-400 text-lg">¡Busca usuarios y envía solicitudes de amistad para empezar a conectar!</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveTab('search')}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25"
                    >
                      <SearchIcon />
                      <span className="ml-2">Buscar Usuarios</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friends.map(friend => (
                  <div key={friend.id} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-2xl hover:border-indigo-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-500/10">
                      <div className="flex items-start justify-between mb-4">
                        <div 
                          className="flex items-center flex-1 cursor-pointer group/profile"
                          onClick={() => router.push(`/profile/${friend.id}`)}
                          title="Ver perfil de amigo"
                        >
                          <div className="relative">
                            <img
                              src={`https://ui-avatars.com/api/?name=${friend.nombre}&background=random`}
                              alt={friend.nombre}
                              className="w-14 h-14 rounded-full border-2 border-gray-600 group-hover/profile:border-indigo-400 transition-colors duration-300"
                            />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover/profile:opacity-20 transition-opacity duration-300"></div>
                          </div>
                          <div className="ml-4 flex-1">
                            <h4 className="font-bold text-white group-hover/profile:text-indigo-300 transition-colors duration-300 text-lg">{friend.nombre}</h4>
                            <p className="text-sm text-gray-400 group-hover/profile:text-gray-300 transition-colors duration-300">{friend.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Amigos desde: {new Date(friend.fecha_inicio_amistad).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => router.push(`/profile/${friend.id}`)}
                          className="p-3 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25"
                          title="Ver perfil"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setFriendToDelete(friend)}
                          className="p-3 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25"
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
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-pink-500 rounded-full"></div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">Solicitudes de Amistad</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></div>
            </div>
            {receivedInvitations.length === 0 ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-pink-500/5 to-purple-500/5 rounded-2xl blur-xl"></div>
                <div className="relative text-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-12 rounded-2xl">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 flex items-center justify-center">
                      <BellIcon />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-500 to-pink-500 animate-ping opacity-10"></div>
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">No tienes solicitudes pendientes</h4>
                  <p className="text-gray-400 text-lg">Cuando alguien te envíe una solicitud de amistad, aparecerá aquí.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {receivedInvitations.map(invitation => (
                  <div key={invitation.id} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-2xl hover:border-red-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-red-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="relative">
                            <img
                              src={`https://ui-avatars.com/api/?name=${invitation.solicitante_nombre}&background=random`}
                              alt={invitation.solicitante_nombre}
                              className="w-16 h-16 rounded-full border-2 border-gray-600 group-hover:border-red-400 transition-colors duration-300"
                            />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                          </div>
                          <div className="ml-4 flex-1">
                            <h4 className="font-bold text-white text-lg group-hover:text-red-300 transition-colors duration-300">{invitation.solicitante_nombre}</h4>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{invitation.solicitante_email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Enviada: {new Date(invitation.fecha_envio).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => respondToInvitation(invitation.id, 'aceptar')}
                            disabled={isProcessingInvitation === invitation.id}
                            className="relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/25"
                          >
                            {isProcessingInvitation === invitation.id && (
                              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl animate-pulse"></div>
                            )}
                            <span className="relative">
                              {isProcessingInvitation === invitation.id ? 'Procesando...' : 'Aceptar'}
                            </span>
                          </button>
                          <button
                            onClick={() => respondToInvitation(invitation.id, 'rechazar')}
                            disabled={isProcessingInvitation === invitation.id}
                            className="relative px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25"
                          >
                            {isProcessingInvitation === invitation.id && (
                              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl animate-pulse"></div>
                            )}
                            <span className="relative">
                              {isProcessingInvitation === invitation.id ? 'Procesando...' : 'Rechazar'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Buscar Usuarios</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></div>
            </div>
            
            {/* Campo de búsqueda */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-blue-500/5 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email (mínimo 2 caracteres)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="w-full px-6 py-4 pl-14 bg-gray-800/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <div className="p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">
                      <SearchIcon />
                    </div>
                  </div>
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500/30 border-t-green-500"></div>
                        <div className="absolute inset-0 animate-ping rounded-full h-6 w-6 border-2 border-green-500/20"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resultados de búsqueda */}
            {searchQuery.length >= 2 && (
              <div className="space-y-6">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-gray-600/20 to-slate-600/20 rounded-full flex items-center justify-center">
                        <SearchIcon />
                      </div>
                      <div className="text-xl font-semibold text-gray-300 mb-2">No se encontraron usuarios</div>
                      <div className="text-gray-500">Intenta con otros términos de búsqueda</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map(user => {
                      const isAlreadyFriend = friends.some(f => f.id === user.id);
                      const hasPendingInvitation = invitations.some(
                        inv => (inv.solicitante_id === user.id || inv.solicitado_id === user.id) && inv.estado === 'pendiente'
                      );
                      
                      return (
                        <div key={user.id} className="group relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                          <div className="relative bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-green-500/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="relative">
                                  <img
                                    src={`https://ui-avatars.com/api/?name=${user.nombre}&background=random`}
                                    alt={user.nombre}
                                    className="w-14 h-14 rounded-full border-2 border-gray-600 group-hover:border-green-400 transition-colors duration-300 shadow-lg"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-white text-lg group-hover:text-green-300 transition-colors duration-300">{user.nombre}</h4>
                                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">ID: {user.id}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Miembro desde: {new Date(user.fecha_creacion).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                {isAlreadyFriend ? (
                                  <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                      <span className="text-sm font-medium">✓ Ya son amigos</span>
                                    </div>
                                  </div>
                                ) : hasPendingInvitation ? (
                                  <div className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl shadow-lg">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                      <span className="text-sm font-medium">Invitación pendiente</span>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => sendFriendInvitation(user.id)}
                                    disabled={isSendingInvitation === user.id}
                                    className="relative px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/25 hover:scale-105"
                                  >
                                    {isSendingInvitation === user.id && (
                                      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl animate-pulse"></div>
                                    )}
                                    <div className="relative flex items-center space-x-2">
                                      <UserPlusIcon />
                                      <span>
                                        {isSendingInvitation === user.id ? 'Enviando...' : 'Agregar'}
                                      </span>
                                    </div>
                                  </button>
                                )}
                              </div>
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
      {friendToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="relative max-w-md w-full mx-4">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 rounded-3xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8 shadow-2xl animate-slideUp">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  Confirmar Eliminación de Amistad
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  ¿Estás seguro de que quieres eliminar la amistad con <span className="font-semibold text-white">{friendToDelete.nombre}</span>? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setFriendToDelete(null)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteFriend}
                  disabled={isDeleting}
                  className="relative px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium rounded-xl disabled:opacity-50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-red-500/25"
                >
                  {isDeleting && (
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl animate-pulse"></div>
                  )}
                  <div className="relative flex items-center space-x-2">
                    {isDeleting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    )}
                    <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}