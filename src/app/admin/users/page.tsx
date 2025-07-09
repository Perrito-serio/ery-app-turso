// src/app/admin/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Inyectar animaciones CSS
const injectAnimations = () => {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      @keyframes shimmer {
        0% {
          background-position: -200px 0;
        }
        100% {
          background-position: calc(200px + 100%) 0;
        }
      }
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6);
        }
      }
      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      .animate-fadeInUp {
        animation: fadeInUp 0.6s ease-out;
      }
      .animate-slideInLeft {
        animation: slideInLeft 0.5s ease-out;
      }
      .animate-pulse-custom {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      .animate-shimmer {
        animation: shimmer 2s linear infinite;
      }
      .animate-glow {
        animation: glow 2s ease-in-out infinite;
      }
      .animate-bounceIn {
        animation: bounceIn 0.6s ease-out;
      }
      .table-row-hover {
        transition: all 0.3s ease;
      }
      .table-row-hover:hover {
        background: linear-gradient(135deg, rgba(55, 65, 81, 0.8), rgba(75, 85, 99, 0.6));
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .status-badge-glow {
        box-shadow: 0 0 10px currentColor;
      }
      .search-focus {
        transition: all 0.3s ease;
      }
      .search-focus:focus {
        transform: scale(1.02);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }
  return () => {};
};

// --- Interfaces y Componentes de UI ---
interface UserFromApi {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  estado: 'activo' | 'suspendido' | 'baneado' | 'inactivo';
  suspension_fin: string | null;
  fecha_creacion: string;
  roles: string;
}

const StatusBadge: React.FC<{ user: UserFromApi }> = ({ user }) => {
  const statusStyles = {
    activo: 'bg-gradient-to-r from-green-600 to-green-700 text-green-100 shadow-lg shadow-green-500/30',
    suspendido: 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-yellow-100 shadow-lg shadow-yellow-500/30',
    baneado: 'bg-gradient-to-r from-red-600 to-red-700 text-red-100 shadow-lg shadow-red-500/30',
    inactivo: 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 shadow-lg shadow-gray-500/30',
  };
  
  const statusIcons = {
    activo: '✓',
    suspendido: '⏸',
    baneado: '⛔',
    inactivo: '○',
  };
  
  return (
    <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full transition-all duration-300 hover:scale-105 animate-bounceIn ${statusStyles[user.estado]}`}>
      <span className="animate-pulse-custom">{statusIcons[user.estado]}</span>
      {user.estado.charAt(0).toUpperCase() + user.estado.slice(1)}
    </span>
  );
};

const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <span className="text-gray-300">{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="text-gray-300">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-md px-2 py-0.5 font-bold shadow-lg animate-glow">{part}</span>
        ) : ( part )
      )}
    </span>
  );
};

const SortableHeader: React.FC<{
  title: string;
  sortKey: keyof UserFromApi;
  sortConfig: { key: keyof UserFromApi; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof UserFromApi) => void;
}> = ({ title, sortKey, sortConfig, requestSort }) => {
  const isSorted = sortConfig?.key === sortKey;
  return (
    <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider cursor-pointer transition-all duration-300 hover:bg-gray-600/50 hover:text-white group" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center gap-2">
        <span className="group-hover:text-indigo-400 transition-colors duration-300">{title}</span>
        <div className="flex flex-col">
          <span className={`text-xs transition-all duration-300 ${
            isSorted && sortConfig.direction === 'ascending' 
              ? 'text-indigo-400 animate-pulse-custom' 
              : 'text-gray-500 group-hover:text-gray-400'
          }`}>▲</span>
          <span className={`text-xs transition-all duration-300 ${
            isSorted && sortConfig.direction === 'descending' 
              ? 'text-indigo-400 animate-pulse-custom' 
              : 'text-gray-500 group-hover:text-gray-400'
          }`}>▼</span>
        </div>
      </div>
    </th>
  );
};

// --- Componente Principal ---
export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserFromApi | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserFromApi | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Estados para la interactividad
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserFromApi; direction: 'ascending' | 'descending' } | null>({ key: 'id', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const USERS_PER_PAGE = 10;

  // Inyectar animaciones al montar el componente
  useEffect(() => {
    const cleanup = injectAnimations();
    setIsLoaded(true);
    return cleanup;
  }, []);

  const fetchUsers = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Fallo al obtener usuarios.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const data: { users: UserFromApi[] } = await response.json();
      setAllUsers(data.users || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.roles?.includes('administrador')) {
      fetchUsers();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
        setPageLoading(false);
    }
  }, [status, session, router, fetchUsers]);

  const processedUsers = useMemo(() => {
    let filtered = [...allUsers];
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.nombre.toLowerCase().includes(lowercasedFilter) ||
        (user.apellido && user.apellido.toLowerCase().includes(lowercasedFilter)) ||
        user.email.toLowerCase().includes(lowercasedFilter) ||
        user.id.toString().includes(lowercasedFilter)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.estado === statusFilter);
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roles && user.roles.includes(roleFilter));
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allUsers, searchTerm, statusFilter, roleFilter, sortConfig]);

  const requestSort = (key: keyof UserFromApi) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(processedUsers.length / USERS_PER_PAGE);
  const paginatedUsers = processedUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const handleUpdateStatus = async (userId: number, estado: 'activo' | 'suspendido' | 'baneado', suspension_fin: string | null = null) => {
    setActionMenuOpen(null);
    setUserToSuspend(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, suspension_fin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al actualizar el estado.');
      fetchUsers();
      alert(data.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const userId = userToDelete.id;
    setUserToDelete(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al eliminar el usuario.');
      fetchUsers();
      alert(data.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === 'loading' || pageLoading) {
    return (
      <MainLayout pageTitle="Gestión de Usuarios">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center animate-fadeInUp">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
            <p className="text-lg text-gray-300 animate-pulse-custom">Cargando usuarios...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center animate-bounceIn">
            <div className="text-6xl mb-4 animate-pulse-custom">🚫</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Acceso Denegado</h2>
            <p className="text-gray-400">No tienes permisos de administrador para acceder a esta página.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Gestión de Usuarios">
      <div className={`bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm ${isLoaded ? 'animate-fadeInUp' : ''}`}>
        {/* Header con gradiente */}
        <div className="mb-8 animate-slideInLeft">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            👥 Administrar Usuarios
          </h2>
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full w-32 animate-shimmer" style={{backgroundSize: '200px 100%'}}></div>
          <p className="text-gray-400 mt-3">Gestiona y supervisa todos los usuarios del sistema</p>
        </div>
        
        {/* Filtros mejorados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o ID..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              className="w-full pl-10 pr-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 search-focus backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50" 
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">📊</span>
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
              className="w-full pl-10 pr-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white search-focus backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="activo">✅ Activo</option>
              <option value="suspendido">⏸ Suspendido</option>
              <option value="baneado">⛔ Baneado</option>
              <option value="inactivo">○ Inactivo</option>
            </select>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">👤</span>
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} 
              className="w-full pl-10 pr-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white search-focus backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="all">Todos los roles</option>
              <option value="administrador">🛡️ Administrador</option>
              <option value="moderador_contenido">⚖️ Moderador</option>
              <option value="usuario_estandar">👤 Usuario Estándar</option>
            </select>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-slideInLeft" style={{animationDelay: '0.3s'}}>
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 p-4 rounded-xl border border-blue-500/30">
            <div className="text-blue-400 text-sm font-medium">Total Usuarios</div>
            <div className="text-2xl font-bold text-white">{allUsers.length}</div>
          </div>
          <div className="bg-gradient-to-r from-green-600/20 to-green-700/20 p-4 rounded-xl border border-green-500/30">
            <div className="text-green-400 text-sm font-medium">Activos</div>
            <div className="text-2xl font-bold text-white">{allUsers.filter(u => u.estado === 'activo').length}</div>
          </div>
          <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 p-4 rounded-xl border border-yellow-500/30">
            <div className="text-yellow-400 text-sm font-medium">Suspendidos</div>
            <div className="text-2xl font-bold text-white">{allUsers.filter(u => u.estado === 'suspendido').length}</div>
          </div>
          <div className="bg-gradient-to-r from-red-600/20 to-red-700/20 p-4 rounded-xl border border-red-500/30">
            <div className="text-red-400 text-sm font-medium">Baneados</div>
            <div className="text-2xl font-bold text-white">{allUsers.filter(u => u.estado === 'baneado').length}</div>
          </div>
        </div>

        {fetchError && (
          <div className="bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 animate-bounceIn">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="font-medium">Error:</span>
              {fetchError}
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <div className="bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-xl p-1 backdrop-blur-sm overflow-visible">
            <table className="min-w-full bg-gray-700/50 rounded-xl backdrop-blur-sm overflow-visible">
              <thead className="bg-gradient-to-r from-gray-600/80 to-gray-700/80 backdrop-blur-sm">
                <tr className="border-b border-gray-600/50">
                  <SortableHeader title="🆔 ID" sortKey="id" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader title="👤 Nombre" sortKey="nombre" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader title="📧 Email" sortKey="email" sortConfig={sortConfig} requestSort={requestSort} />
                  <th className="px-3 py-4 text-left text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider">📊 Estado</th>
                  <th className="px-3 py-4 text-left text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider">🎭 Roles</th>
                  <th className="px-3 py-4 text-center text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider">⚙️ Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600/30 overflow-visible">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((userItem, index) => (
                  <tr key={userItem.id} className="table-row-hover animate-fadeInUp overflow-visible" style={{animationDelay: `${0.1 * index}s`}}>
                    <td className="px-3 py-4 text-sm font-medium"><Highlight text={String(userItem.id)} highlight={searchTerm} /></td>
                    <td className="px-3 py-4 text-sm font-medium"><Highlight text={`${userItem.nombre} ${userItem.apellido || ''}`} highlight={searchTerm} /></td>
                    <td className="px-3 py-4 text-sm"><Highlight text={userItem.email} highlight={searchTerm} /></td>
                    <td className="px-3 py-4 text-sm"><StatusBadge user={userItem} /></td>
                    <td className="px-3 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                        {userItem.roles || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-center overflow-visible">
                      <div className="relative inline-block text-left" ref={actionMenuOpen === userItem.id ? menuRef : null}>
                        <button 
                          onClick={() => setActionMenuOpen(actionMenuOpen === userItem.id ? null : userItem.id)} 
                          className="px-4 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 hover:scale-105 animate-glow"
                        >
                          ⚙️ Acciones
                        </button>
                        {actionMenuOpen === userItem.id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-52 rounded-xl shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900 ring-1 ring-gray-600/50 z-[9999] backdrop-blur-sm animate-bounceIn">
                            <div className="py-2" role="menu" aria-orientation="vertical">
                              <Link href={`/admin/users/${userItem.id}/edit`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg mx-2">✏️ Editar</Link>
                              {userItem.estado !== 'suspendido' && <button onClick={() => setUserToSuspend(userItem)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg mx-2">⏸ Suspender</button>}
                              {userItem.estado !== 'baneado' && <button onClick={() => handleUpdateStatus(userItem.id, 'baneado')} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg mx-2">⛔ Banear</button>}
                              {userItem.estado !== 'activo' && <button onClick={() => handleUpdateStatus(userItem.id, 'activo')} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg mx-2">✅ Reactivar</button>}
                              <div className="border-t border-gray-700/50 my-2 mx-2"></div>
                              <button onClick={() => setUserToDelete(userItem)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg mx-2">🗑️ Eliminar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center animate-bounceIn">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-4xl animate-pulse-custom">🔍</div>
                      <p className="text-lg text-gray-400 font-medium">No se encontraron usuarios</p>
                      <p className="text-sm text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación mejorada */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-6 animate-fadeInUp" style={{animationDelay: '0.5s'}}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">📊 Mostrando</span>
              <span className="font-semibold text-indigo-400">{((currentPage - 1) * USERS_PER_PAGE) + 1}</span>
              <span className="text-gray-400">a</span>
              <span className="font-semibold text-indigo-400">{Math.min(currentPage * USERS_PER_PAGE, processedUsers.length)}</span>
              <span className="text-gray-400">de</span>
              <span className="font-semibold text-purple-400">{processedUsers.length}</span>
              <span className="text-gray-400">usuarios</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg"
              >
                ⬅️ Anterior
              </button>
              
              <div className="flex items-center gap-2">
                {/* Números de página */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 text-sm font-medium rounded-lg transition-all duration-300 hover:scale-110 ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg animate-pulse-custom'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg"
              >
                Siguiente ➡️
              </button>
            </div>
          </div>
        )}
      </div>
      {userToSuspend && <SuspensionModal user={userToSuspend} onClose={() => setUserToSuspend(null)} onConfirm={handleUpdateStatus} />}
      {userToDelete && <ConfirmationModal user={userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleDeleteUser} />}
    </MainLayout>
  );
}

// --- Componentes Auxiliares para Modales ---
const SuspensionModal: React.FC<{ user: UserFromApi; onClose: () => void; onConfirm: (userId: number, estado: 'suspendido', suspension_fin: string) => void; }> = ({ user, onClose, onConfirm }) => {
  const [date, setDate] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeInUp">
      <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-600/50 animate-bounceIn">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-custom">
            <span className="text-2xl">⏸</span>
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
            Suspender Usuario
          </h3>
          <p className="text-gray-300">¿Estás seguro de que quieres suspender a <span className="font-semibold text-yellow-400">{user.nombre}</span>?</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <span>📅</span> Fecha de fin de suspensión:
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white backdrop-blur-sm transition-all duration-300 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20" 
          />
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
          >
            ❌ Cancelar
          </button>
          <button 
            onClick={() => onConfirm(user.id, 'suspendido', new Date(date).toISOString())} 
            disabled={!date} 
            className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg animate-glow disabled:opacity-50"
          >
            ⏸ Suspender
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal: React.FC<{ user: UserFromApi; onClose: () => void; onConfirm: () => void; }> = ({ user, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeInUp">
      <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-600/50 animate-bounceIn">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-custom">
            <span className="text-2xl">🗑️</span>
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent mb-2">
            ¿Estás seguro?
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Estás a punto de eliminar permanentemente a <span className="font-bold text-red-400">{user.nombre}</span>.
          </p>
          <p className="text-red-400 text-sm mt-2 font-semibold">
            ⚠️ Esta acción no se puede deshacer.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
          >
            ❌ Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg animate-glow"
          >
            🗑️ Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
