// src/app/control/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

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
    return <MainLayout pageTitle="Control de Usuarios"><div className="text-center">Cargando...</div></MainLayout>;
  }
  
  const canAccessPage = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
  if (!canAccessPage) {
    return <MainLayout pageTitle="Acceso Denegado"><div className="text-center text-red-500">No tienes permisos.</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle="Control de Usuarios">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-white">Panel de Control de Usuarios</h2>
        <p className="text-sm text-gray-400 mb-6">Busca, filtra y gestiona los usuarios de la plataforma.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-auto px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="baneado">Baneado</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        {fetchError && <div className="bg-red-700 text-white p-3 rounded mb-4">{fetchError}</div>}
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-md">
            <thead className="bg-gray-600">
              <tr>
                <SortableHeader title="Nombre" sortKey="nombre" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader title="Email" sortKey="email" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-600/50 transition-colors duration-150">
                    <td className="px-3 py-4 text-sm text-gray-200">
                      <Highlight text={`${userItem.nombre} ${userItem.apellido || ''}`} highlight={searchTerm} />
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-200">
                      <Highlight text={userItem.email} highlight={searchTerm} />
                    </td>
                    <td className="px-3 py-4 text-sm"><StatusBadge user={userItem} /></td>
                    <td className="px-3 py-4 text-sm font-medium">
                      <Link href={`/control/users/${userItem.id}/edit`} className="text-indigo-400 hover:text-indigo-300 hover:underline">Ver Detalles</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-400">
                    No se encontraron usuarios con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 transition-colors">Anterior</button>
            <span className="text-sm text-gray-400">Página {currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 transition-colors">Siguiente</button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
