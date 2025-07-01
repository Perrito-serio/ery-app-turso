// src/app/control/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { z } from 'zod';

// --- INTERFACES ---
interface UserToEdit {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  estado: 'activo' | 'suspendido' | 'baneado' | 'inactivo';
  suspension_fin: string | null;
}

// --- Esquema de validación para el cambio de estado ---
const updateUserStatusSchema = z.object({
  estado: z.enum(['activo', 'suspendido', 'baneado']),
  suspension_fin: z.string().datetime().optional().nullable(),
}).refine(data => data.estado !== 'suspendido' || !!data.suspension_fin, {
  message: "Para suspender, se debe proporcionar una fecha de fin de suspensión.",
  path: ["suspension_fin"],
});

export default function EditModeratorViewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserToEdit | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- CORRECCIÓN 1 ---: Se añade 'inactivo' a los tipos posibles del estado.
  const [newStatus, setNewStatus] = useState<'activo' | 'suspendido' | 'baneado' | 'inactivo' | ''>('');
  const [suspensionDate, setSuspensionDate] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    const canAccess = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
    if (!canAccess) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setPageLoading(true);
      try {
        // Este endpoint obtiene todos los detalles, incluido el estado.
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "No se pudo cargar la información del usuario.");
        }
        const data: { user: UserToEdit } = await response.json();
        setUser(data.user);
        setNewStatus(data.user.estado);
        if (data.user.suspension_fin) {
          // Formatear la fecha para el input type="date"
          setSuspensionDate(new Date(data.user.suspension_fin).toISOString().split('T')[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [userId, status, session, router]);

  const handleStatusSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const validation = updateUserStatusSchema.safeParse({
      estado: newStatus,
      suspension_fin: newStatus === 'suspendido' ? new Date(suspensionDate).toISOString() : null,
    });

    if (!validation.success) {
      const errorMsg = Object.values(validation.error.flatten().fieldErrors).flat().join(' ');
      setError(errorMsg || "Por favor, corrige los errores.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Fallo al actualizar el estado.');
      
      setSuccess(data.message || 'Estado actualizado con éxito.');
      // --- CORRECCIÓN 2 ---: Asegurarse de que suspension_fin nunca sea undefined.
      setUser(prev => prev ? { ...prev, estado: validation.data.estado, suspension_fin: validation.data.suspension_fin ?? null } : null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || pageLoading) {
    return <MainLayout pageTitle="Editar Usuario"><div className="text-center">Cargando...</div></MainLayout>;
  }
  
  if (error && !user) {
     return (
      <MainLayout pageTitle="Error">
        <div className="text-center text-red-500">{error}</div>
        <div className="text-center mt-4">
          <Link href="/control/users" className="text-indigo-400 hover:underline">Volver al Panel de Control</Link>
        </div>
      </MainLayout>
     );
  }

  return (
    <MainLayout pageTitle={`Moderando a: ${user?.nombre}`}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-1 text-white">Detalles del Usuario</h2>
        <p className="text-sm text-gray-400 mb-6">ID de Usuario: {user?.id}</p>
        
        <div className="space-y-4 mb-8">
            <div><strong className="text-gray-300">Nombre:</strong> <span className="text-white">{user?.nombre} {user?.apellido}</span></div>
            <div><strong className="text-gray-300">Email:</strong> <span className="text-white">{user?.email}</span></div>
        </div>

        <hr className="border-gray-700"/>

        <h3 className="text-xl font-semibold mt-6 mb-4 text-white">Cambiar Estado del Usuario</h3>
        
        {error && <div className="mb-4 p-3 bg-red-700 text-white rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-700 text-white rounded">{success}</div>}

        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label htmlFor="estado" className="block text-sm font-medium text-gray-300">Nuevo Estado</label>
            <select 
              name="estado" 
              id="estado" 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="baneado">Baneado</option>
              <option value="inactivo" disabled>Inactivo (solo lectura)</option>
            </select>
          </div>

          {newStatus === 'suspendido' && (
            <div>
              <label htmlFor="suspension_fin" className="block text-sm font-medium text-gray-300">Fecha de Fin de Suspensión</label>
              <input 
                type="date" 
                name="suspension_fin" 
                id="suspension_fin" 
                value={suspensionDate} 
                onChange={(e) => setSuspensionDate(e.target.value)} 
                className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                required
              />
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50">
              {isSubmitting ? 'Actualizando...' : 'Actualizar Estado'}
            </button>
          </div>
        </form>
        <Link href="/control/users" className="block text-center mt-6 text-indigo-400 hover:underline">
            &larr; Volver al Panel de Control
        </Link>
      </div>
    </MainLayout>
  );
}
