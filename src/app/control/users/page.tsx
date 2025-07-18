// src/app/control/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Función para inyectar animaciones CSS
const injectAnimations = () => {
  if (typeof document !== 'undefined' && !document.getElementById('control-users-animations')) {
    const style = document.createElement('style');
    style.id = 'control-users-animations';
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
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
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
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6);
        }
      }
      
      @keyframes pulse-custom {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
      
      .animate-fadeInUp {
        animation: fadeInUp 0.6s ease-out forwards;
      }
      
      .animate-slideInLeft {
        animation: slideInLeft 0.6s ease-out forwards;
      }
      
      .animate-slideInRight {
        animation: slideInRight 0.6s ease-out forwards;
      }
      
      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      .animate-shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200px 100%;
        animation: shimmer 1.5s infinite;
      }
      
      .animate-bounceIn {
        animation: bounceIn 0.6s ease-out forwards;
      }
      
      .animate-glow {
        animation: glow 2s ease-in-out infinite;
      }
      
      .animate-pulse-custom {
        animation: pulse-custom 2s ease-in-out infinite;
      }
      
      .gradient-border {
        background: linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
        border: 1px solid;
        border-image: linear-gradient(145deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3)) 1;
      }
      
      .card-hover {
        transition: all 0.3s ease;
      }
      
      .card-hover:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
};

// Componentes de iconos SVG
const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

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
    activo: 'bg-green-700 text-green-100',
    suspendido: 'bg-yellow-700 text-yellow-100',
    baneado: 'bg-red-700 text-red-100',
    inactivo: 'bg-gray-600 text-gray-200',
  };
  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[user.estado]}`}>
      {user.estado.charAt(0).toUpperCase() + user.estado.slice(1)}
    </span>
  );
};

// --- MEJORA: Componente para resaltar texto ---
const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-yellow-500 text-black rounded-sm px-1">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

// --- MEJORA: Componente para cabeceras de tabla ordenables ---
const SortableHeader: React.FC<{
  title: string;
  sortKey: keyof UserFromApi;
  sortConfig: { key: keyof UserFromApi; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof UserFromApi) => void;
}> = ({ title, sortKey, sortConfig, requestSort }) => {
  const isSorted = sortConfig?.key === sortKey;
  return (
    <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center">
        <span>{title}</span>
        {isSorted && (
          <span className="ml-2">
            {sortConfig.direction === 'ascending' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );
};


// --- Componente Principal (Reestructurado) ---
export default function ControlUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserFromApi; direction: 'ascending' | 'descending' } | null>({ key: 'nombre', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 10;

  const fetchUsers = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fallo al obtener usuarios');
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
    if (status === 'authenticated') fetchUsers();
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router, fetchUsers]);

  useEffect(() => {
    injectAnimations();
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...allUsers];
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.nombre.toLowerCase().includes(lowercasedFilter) ||
        (user.apellido && user.apellido.toLowerCase().includes(lowercasedFilter)) ||
        user.email.toLowerCase().includes(lowercasedFilter)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.estado === statusFilter);
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
  }, [allUsers, searchTerm, statusFilter, sortConfig]);

  const requestSort = (key: keyof UserFromApi) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };
  
  const totalPages = Math.ceil(filteredAndSortedUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );
  
  useEffect(() => {
    if(currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (status === 'loading' || pageLoading) {
    return (
      <MainLayout pageTitle="Control de Usuarios">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <div className="gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-pulse-custom text-indigo-400">
                <UsersIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Cargando Control de Usuarios</h1>
            <p className="text-gray-400 mb-4">Obteniendo información de usuarios...</p>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="animate-shimmer h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const canAccessPage = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
  if (!canAccessPage) {
    return (
      <MainLayout pageTitle="Control de Usuarios">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <div className="gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-bounceIn">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-pulse-custom text-red-400">
                <ExclamationIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
            <p className="text-gray-400 mb-4">Solo administradores pueden acceder al control de usuarios.</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>Permisos requeridos:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Rol de Administrador</li>
                <li>Acceso al panel de control</li>
              </ul>
            </div>
            <button 
               onClick={() => router.push('/dashboard')}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
             >
               <HomeIcon />
               Volver al Dashboard
             </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Control de Usuarios">
      {/* Encabezado Principal */}
      <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl shadow-2xl mb-8 animate-slideInLeft">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-indigo-400">
            <UsersIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Control de Usuarios</h1>
            <p className="text-gray-400">Gestiona usuarios, roles y permisos del sistema</p>
          </div>
        </div>
        
        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-700 p-4 rounded-lg animate-fadeInUp" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center gap-3">
              <div className="text-blue-400 animate-pulse-custom">
                <UsersIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{allUsers.length}</p>
                <p className="text-gray-400 text-sm">Usuarios Totales</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center gap-3">
              <div className="text-green-400 animate-pulse-custom">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{allUsers.filter(u => u.estado === 'activo').length}</p>
                <p className="text-gray-400 text-sm">Usuarios Activos</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg animate-fadeInUp" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center gap-3">
              <div className="text-purple-400 animate-pulse-custom">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{allUsers.filter(u => u.roles && u.roles.includes('administrador')).length}</p>
                <p className="text-gray-400 text-sm">Administradores</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Panel de Control */}
      <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl shadow-2xl mb-8 animate-slideInRight">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-indigo-400">
            <SearchIcon />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Panel de Control de Usuarios</h2>
            <p className="text-gray-400">Busca, filtra y gestiona los usuarios de la plataforma</p>
          </div>
        </div>

        {/* Controles de búsqueda y filtros */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative animate-fadeInUp" style={{animationDelay: '0.1s'}}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar usuarios por nombre, email o ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FilterIcon />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="pl-10 pr-8 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="baneado">Baneado</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">

        {fetchError && (
          <div className="bg-red-700 text-white p-4 rounded-lg mb-6 animate-bounceIn">
            <div className="flex items-center gap-3">
              <ExclamationIcon />
              <span>{fetchError}</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-600">
              <tr>
                <SortableHeader title="Nombre" sortKey="nombre" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader title="Email" sortKey="email" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((userItem, index) => (
                  <tr key={userItem.id} className="hover:bg-gray-600 transition-all duration-200 animate-fadeInUp" style={{animationDelay: `${0.1 * (index + 1)}s`}}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg animate-pulse-custom">
                            {userItem.nombre?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            <Highlight text={`${userItem.nombre} ${userItem.apellido || ''}`} highlight={searchTerm} />
                          </div>
                          <div className="text-sm text-gray-400">ID: {userItem.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <Highlight text={userItem.email} highlight={searchTerm} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full animate-pulse-custom ${
                        userItem.estado === 'activo' ? 'bg-green-100 text-green-800' :
                        userItem.estado === 'suspendido' ? 'bg-yellow-100 text-yellow-800' :
                        userItem.estado === 'baneado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          userItem.estado === 'activo' ? 'bg-green-500' :
                          userItem.estado === 'suspendido' ? 'bg-yellow-500' :
                          userItem.estado === 'baneado' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        {userItem.estado || 'inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {userItem.roles?.split(',').map((role, roleIndex) => (
                          <span key={roleIndex} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                            {role.trim()}
                          </span>
                        )) || <span className="text-gray-400 text-sm">Sin roles</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/control/users/${userItem.id}/edit`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-all duration-200 flex items-center gap-2 animate-glow"
                          title="Ver/Editar usuario"
                        >
                          <EyeIcon />
                          <span className="hidden sm:inline">Ver</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-400">
                    No se encontraron usuarios con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="gradient-border card-hover bg-gray-800 p-4 rounded-xl shadow-2xl mt-8 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400">
                Mostrando <span className="text-white font-semibold">{((currentPage - 1) * USERS_PER_PAGE) + 1}</span> a <span className="text-white font-semibold">{Math.min(currentPage * USERS_PER_PAGE, filteredAndSortedUsers.length)}</span> de <span className="text-white font-semibold">{filteredAndSortedUsers.length}</span> usuarios
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </button>
                <div className="flex items-center gap-2">
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
                        className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white animate-pulse-custom'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
                >
                  Siguiente
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
