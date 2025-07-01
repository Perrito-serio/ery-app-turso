// src/app/control/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// --- INTERFAZ ACTUALIZADA ---
interface UserFromApi {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  estado: 'activo' | 'suspendido' | 'baneado' | 'inactivo'; // Nuevo campo de estado
  suspension_fin: string | null; // Nuevo campo
  fecha_creacion: string;
  roles: string;
}

// --- COMPONENTE DE INSIGNIA DE ESTADO (REUTILIZABLE) ---
const StatusBadge: React.FC<{ user: UserFromApi }> = ({ user }) => {
  const statusStyles = {
    activo: 'bg-green-700 text-green-100',
    suspendido: 'bg-yellow-700 text-yellow-100',
    baneado: 'bg-red-700 text-red-100',
    inactivo: 'bg-gray-600 text-gray-200',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[user.estado]}`}>
      {user.estado.charAt(0).toUpperCase() + user.estado.slice(1)}
      {user.estado === 'suspendido' && user.suspension_fin && ` (hasta ${new Date(user.suspension_fin).toLocaleDateString()})`}
    </span>
  );
};


// --- COMPONENTE PRINCIPAL ---
export default function ControlUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const fetchUsers = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);
    try {
      // Este endpoint ya está preparado para devolver la lista correcta de usuarios
      // para moderadores (sin administradores ni otros moderadores).
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: Fallo al obtener usuarios`);
      }
      const data: { users: UserFromApi[] } = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    const canAccess = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
    if (canAccess) {
      fetchUsers();
    } else {
      setPageLoading(false);
    }
  }, [status, session, router, fetchUsers]);


  const canAccessPage = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');

  if (status === 'loading' || pageLoading) {
    return (
      <MainLayout pageTitle="Control de Usuarios">
        <div className="text-center">Cargando...</div>
      </MainLayout>
    );
  }
  
  if (!canAccessPage) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">No tienes los permisos necesarios para acceder a esta sección.</p>
          <button onClick={() => router.push('/')} className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow">
            Volver a Inicio
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Control de Usuarios">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white">Panel de Control de Usuarios</h2>
        <p className="text-sm text-gray-400 mb-6">Esta es una vista limitada para moderadores. Solo se muestran usuarios estándar.</p>
        
        {fetchError && <div className="bg-red-700 text-white p-3 rounded mb-4"><strong>Error:</strong> {fetchError}</div>}
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-md">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {users.length > 0 ? (
                users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-600 transition-colors duration-150">
                    <td className="px-3 py-4 text-xs sm:text-sm text-gray-200">{userItem.nombre} {userItem.apellido}</td>
                    <td className="px-3 py-4 text-xs sm:text-sm text-gray-200">{userItem.email}</td>
                    <td className="px-3 py-4 text-xs sm:text-sm">
                      <StatusBadge user={userItem} />
                    </td>
                    <td className="px-3 py-4 text-xs sm:text-sm font-medium">
                      <Link href={`/control/users/${userItem.id}/edit`} className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        Ver Detalles
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-400">
                    {pageLoading && !fetchError ? 'Cargando usuarios...' : 'No hay usuarios para controlar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
