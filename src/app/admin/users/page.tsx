// src/app/admin/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// --- INTERFAZ ACTUALIZADA ---
// Refleja la nueva estructura de datos de la API con 'estado' y 'suspension_fin'
interface UserFromApi {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  estado: 'activo' | 'suspendido' | 'baneado' | 'inactivo';
  suspension_fin: string | null;
  fecha_creacion: string;
  roles: string[];
}

// --- COMPONENTE PRINCIPAL ---
export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // --- ESTADOS ---
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Estados para los modales y menús
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null); // ID del usuario cuyo menú está abierto
  const [userToSuspend, setUserToSuspend] = useState<UserFromApi | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserFromApi | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // --- OBTENCIÓN DE DATOS ---
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
      setUsers(data.users || []);
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
    if (status === 'authenticated' && session?.user?.roles?.includes('administrador')) {
      fetchUsers();
    } else {
      setPageLoading(false);
    }
  }, [status, session, router, fetchUsers]);

  // --- MANEJADORES DE ACCIONES ---

  // Función genérica para cambiar el estado de un usuario
  const handleUpdateStatus = async (userId: number, estado: 'activo' | 'suspendido' | 'baneado', suspension_fin: string | null = null) => {
    setActionMenuOpen(null); // Cerrar menú
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, suspension_fin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al actualizar el estado.');
      
      // Actualizar la lista de usuarios localmente para reflejar el cambio
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, estado, suspension_fin } : u
      ));
      alert(data.message);

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    }
  };

  // Función para eliminar un usuario
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const userId = userToDelete.id;
    setUserToDelete(null); // Cerrar modal de confirmación
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al eliminar el usuario.');
      
      // Eliminar el usuario de la lista local
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      alert(data.message);

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    }
  };

  // Cerrar menú de acciones si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // --- RENDERIZADO ---
  if (status === 'loading' || pageLoading) {
    return <MainLayout pageTitle="Gestión de Usuarios"><div className="text-center">Cargando...</div></MainLayout>;
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return <MainLayout pageTitle="Acceso Denegado"><div className="text-center text-red-500">No tienes permisos.</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle="Gestión de Usuarios">
      <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Administrar Usuarios</h2>
        {fetchError && <div className="bg-red-700 text-white p-3 rounded mb-4">{fetchError}</div>}
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Usuario</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Roles</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-600">
                  <td className="px-3 py-4 text-sm text-gray-200">{user.nombre}</td>
                  <td className="px-3 py-4 text-sm text-gray-200">{user.email}</td>
                  <td className="px-3 py-4 text-sm"><StatusBadge user={user} /></td>
                  <td className="px-3 py-4 text-sm text-gray-400">{user.roles.join(', ')}</td>
                  <td className="px-3 py-4 text-sm text-center">
                    <div className="relative inline-block text-left" ref={actionMenuOpen === user.id ? menuRef : null}>
                      <button onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)} className="px-3 py-1 text-xs rounded bg-gray-500 hover:bg-gray-400 text-white">
                        Acciones
                      </button>
                      {actionMenuOpen === user.id && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <Link href={`/admin/users/${user.id}/edit`} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Editar</Link>
                            {user.estado !== 'suspendido' && <button onClick={() => setUserToSuspend(user)} className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700">Suspender</button>}
                            {user.estado !== 'baneado' && <button onClick={() => handleUpdateStatus(user.id, 'baneado')} className="block w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-gray-700">Banear</button>}
                            {user.estado !== 'activo' && <button onClick={() => handleUpdateStatus(user.id, 'activo')} className="block w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700">Reactivar</button>}
                            <div className="border-t border-gray-700 my-1"></div>
                            <button onClick={() => setUserToDelete(user)} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700">Eliminar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {userToSuspend && <SuspensionModal user={userToSuspend} onClose={() => setUserToSuspend(null)} onConfirm={handleUpdateStatus} />}
      {userToDelete && <ConfirmationModal user={userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleDeleteUser} />}
    </MainLayout>
  );
}

// --- COMPONENTES AUXILIARES ---

// Insignia de estado con colores
const StatusBadge: React.FC<{ user: UserFromApi }> = ({ user }) => {
  const statusStyles = {
    activo: 'bg-green-700 text-green-100',
    suspendido: 'bg-yellow-700 text-yellow-100',
    baneado: 'bg-red-700 text-red-100',
    inactivo: 'bg-gray-600 text-gray-200',
  };
  return (
    <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${statusStyles[user.estado]}`}>
      {user.estado.charAt(0).toUpperCase() + user.estado.slice(1)}
      {user.estado === 'suspendido' && user.suspension_fin && ` (hasta ${new Date(user.suspension_fin).toLocaleDateString()})`}
    </span>
  );
};

// Modal para confirmar la suspensión
const SuspensionModal: React.FC<{ user: UserFromApi; onClose: () => void; onConfirm: (userId: number, estado: 'suspendido', suspension_fin: string) => void; }> = ({ user, onClose, onConfirm }) => {
  const [date, setDate] = useState('');
  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-lg font-semibold text-white">Suspender a {user.nombre}</h3>
        <p className="text-sm text-gray-400 mt-2 mb-4">Selecciona la fecha en que terminará la suspensión.</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancelar</button>
          <button onClick={() => onConfirm(user.id, 'suspendido', new Date(date).toISOString())} disabled={!date} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md disabled:opacity-50">Suspender</button>
        </div>
      </div>
    </div>
  );
};

// Modal genérico para confirmación de eliminación
const ConfirmationModal: React.FC<{ user: UserFromApi; onClose: () => void; onConfirm: () => void; }> = ({ user, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-lg font-semibold text-white">¿Estás seguro?</h3>
        <p className="text-sm text-gray-400 mt-2 mb-4">Estás a punto de eliminar permanentemente a <span className="font-bold">{user.nombre}</span>. Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md">Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
};
