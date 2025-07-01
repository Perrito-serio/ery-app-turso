// src/app/admin/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-yellow-500 text-black rounded-sm px-1">{part}</span>
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
    <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center">
        <span>{title}</span>
        {isSorted && <span className="ml-2">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>}
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
  const USERS_PER_PAGE = 10;

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
    return <MainLayout pageTitle="Gestión de Usuarios"><div className="text-center">Cargando...</div></MainLayout>;
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return <MainLayout pageTitle="Acceso Denegado"><div className="text-center text-red-500">No tienes permisos de administrador.</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle="Gestión de Usuarios">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Administrar Usuarios</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input type="text" placeholder="Buscar por nombre, email o ID..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full sm:w-1/2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="w-full sm:w-auto px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="baneado">Baneado</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} className="w-full sm:w-auto px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
            <option value="all">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="moderador_contenido">Moderador</option>
            <option value="usuario_estandar">Usuario Estándar</option>
          </select>
        </div>

        {fetchError && <div className="bg-red-700 text-white p-3 rounded mb-4">{fetchError}</div>}
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-md">
            <thead className="bg-gray-600">
              <tr>
                <SortableHeader title="ID" sortKey="id" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader title="Nombre" sortKey="nombre" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader title="Email" sortKey="email" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase">Estado</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase">Roles</th>
                <th className="px-3 py-3 text-center text-xs sm:text-sm font-medium text-gray-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(userItem => (
                  <tr key={userItem.id} className="hover:bg-gray-600/50">
                    <td className="px-3 py-4 text-sm text-gray-400"><Highlight text={String(userItem.id)} highlight={searchTerm} /></td>
                    <td className="px-3 py-4 text-sm"><Highlight text={`${userItem.nombre} ${userItem.apellido || ''}`} highlight={searchTerm} /></td>
                    <td className="px-3 py-4 text-sm"><Highlight text={userItem.email} highlight={searchTerm} /></td>
                    <td className="px-3 py-4 text-sm"><StatusBadge user={userItem} /></td>
                    <td className="px-3 py-4 text-sm text-gray-400">{userItem.roles || 'N/A'}</td>
                    <td className="px-3 py-4 text-sm text-center">
                      <div className="relative inline-block text-left" ref={actionMenuOpen === userItem.id ? menuRef : null}>
                        <button onClick={() => setActionMenuOpen(actionMenuOpen === userItem.id ? null : userItem.id)} className="px-3 py-1 text-xs rounded bg-gray-500 hover:bg-gray-400 text-white">Acciones</button>
                        {actionMenuOpen === userItem.id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <Link href={`/admin/users/${userItem.id}/edit`} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Editar</Link>
                              {userItem.estado !== 'suspendido' && <button onClick={() => setUserToSuspend(userItem)} className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700">Suspender</button>}
                              {userItem.estado !== 'baneado' && <button onClick={() => handleUpdateStatus(userItem.id, 'baneado')} className="block w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-gray-700">Banear</button>}
                              {userItem.estado !== 'activo' && <button onClick={() => handleUpdateStatus(userItem.id, 'activo')} className="block w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700">Reactivar</button>}
                              <div className="border-t border-gray-700 my-1"></div>
                              <button onClick={() => setUserToDelete(userItem)} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700">Eliminar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">No se encontraron usuarios con los filtros actuales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-400">Página {currentPage} de {totalPages} ({processedUsers.length} usuarios)</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">Siguiente</button>
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
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm"><h3 className="text-lg font-semibold text-white">Suspender a {user.nombre}</h3><p className="text-sm text-gray-400 mt-2 mb-4">Selecciona la fecha en que terminará la suspensión.</p><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" /><div className="flex justify-end gap-4 mt-6"><button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancelar</button><button onClick={() => onConfirm(user.id, 'suspendido', new Date(date).toISOString())} disabled={!date} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md disabled:opacity-50">Suspender</button></div></div></div>
  );
};

const ConfirmationModal: React.FC<{ user: UserFromApi; onClose: () => void; onConfirm: () => void; }> = ({ user, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm"><h3 className="text-lg font-semibold text-white">¿Estás seguro?</h3><p className="text-sm text-gray-400 mt-2 mb-4">Estás a punto de eliminar permanentemente a <span className="font-bold">{user.nombre}</span>. Esta acción no se puede deshacer.</p><div className="flex justify-end gap-4 mt-6"><button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancelar</button><button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md">Sí, eliminar</button></div></div></div>
  );
};
