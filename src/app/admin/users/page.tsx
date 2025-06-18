// src/app/admin/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

interface UserFromApi {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean | number;
  fecha_creacion: string;
  roles: string[];
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [sortColumn, setSortColumn] = useState<keyof UserFromApi | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10; // Puedes ajustar este valor
  const totalPages = Math.ceil(users.length / usersPerPage);

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
      setUsers(data.users.map(u => ({ ...u, activo: Boolean(u.activo) })) || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setFetchError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      if (session?.user?.roles?.includes('administrador')) {
        fetchUsers();
      } else {
        setPageLoading(false);
      }
    }
  }, [status, session, router, fetchUsers]);

  const handleToggleActive = async (userId: number, currentIsActive: boolean) => {
    if (session?.user?.id === userId) {
      alert("Un administrador no puede cambiar su propio estado activo.");
      return;
    }
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    setFetchError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !currentIsActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, activo: !currentIsActive } : u)
      );
      alert(`Usuario ${userId} ha sido ${!currentIsActive ? 'activado' : 'desactivado'}.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error.';
      setFetchError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleSort = (column: keyof UserFromApi) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = useMemo(() => {
    if (!sortColumn) return users;

    return [...users].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortDirection === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  // PAGINACIÓN
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    return sortedUsers.slice(start, end);
  }, [sortedUsers, currentPage, usersPerPage]);

  if (status === 'loading' || pageLoading) {
    return (
      <MainLayout pageTitle="Gestión de Usuarios">
        <div className="flex justify-center items-center h-full">
          <h1 className="text-3xl font-bold">Cargando...</h1>
        </div>
      </MainLayout>
    );
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="text-center text-red-500">
          <h1 className="text-4xl font-bold">Acceso Denegado</h1>
          <p>No tienes permisos.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Gestión de Usuarios">
      <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Administrar Usuarios</h2>
        {fetchError && (
          <div className="bg-red-700 text-white p-3 rounded mb-4">{fetchError}</div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded">
            <thead className="bg-gray-600">
              <tr>
                {['id', 'nombre', 'apellido', 'email', 'activo', 'fecha_creacion'].map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col as keyof UserFromApi)}
                    className="cursor-pointer px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hover:text-white"
                  >
                    {col.toUpperCase()} {sortColumn === col ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(userItem => (
                  <tr key={userItem.id} className="hover:bg-gray-600">
                    <td className="px-3 py-4 text-sm text-gray-200">{userItem.id}</td>
                    <td className="px-3 py-4 text-sm text-gray-200">{userItem.nombre}</td>
                    <td className="px-3 py-4 text-sm text-gray-200">{userItem.apellido || '-'}</td>
                    <td className="px-3 py-4 text-sm text-gray-200">{userItem.email}</td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${userItem.activo ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                        {userItem.activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-400">{new Date(userItem.fecha_creacion).toLocaleDateString()}</td>
                    <td className="px-3 py-4 text-sm">
                      <button
                        onClick={() => handleToggleActive(userItem.id, Boolean(userItem.activo))}
                        disabled={actionLoading[userItem.id] || session?.user?.id === userItem.id}
                        className={`px-3 py-1 text-xs rounded ${userItem.activo ? 'bg-yellow-600' : 'bg-green-600'} text-white hover:opacity-80 disabled:opacity-50 mr-2`}
                      >
                        {actionLoading[userItem.id] ? '...' : userItem.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <Link href={`/admin/users/${userItem.id}/edit`} className="text-indigo-400 hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Controles de paginación */}
        <div className="flex justify-center items-center mt-4 gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-600 text-white disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-200">Página {currentPage} de {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-600 text-white disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
