// src/app/control/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { z } from 'zod';

// Función para inyectar animaciones CSS
const injectAnimations = () => {
  if (typeof document !== 'undefined' && !document.getElementById('edit-user-animations')) {
    const style = document.createElement('style');
    style.id = 'edit-user-animations';
    style.textContent = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.5); }
        50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8); }
      }
      @keyframes pulse-custom {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
      
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
      .animate-slideInLeft { animation: slideInLeft 0.6s ease-out forwards; }
      .animate-slideInRight { animation: slideInRight 0.6s ease-out forwards; }
      .animate-pulse { animation: pulse 2s infinite; }
      .animate-shimmer { animation: shimmer 2s infinite; }
      .animate-bounceIn { animation: bounceIn 0.6s ease-out forwards; }
      .animate-glow { animation: glow 2s infinite; }
      .animate-pulse-custom { animation: pulse-custom 2s infinite; }
      
      .gradient-border {
        background: linear-gradient(145deg, #374151, #4B5563);
        border: 1px solid #6366F1;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.1);
      }
      
      .card-hover {
        transition: all 0.3s ease;
      }
      .card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
      }
    `;
    document.head.appendChild(style);
  }
};

// Iconos SVG
const UserIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const StatusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

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
    injectAnimations();
  }, []);

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
    return (
      <MainLayout pageTitle="Editar Usuario">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <div className="gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-pulse-custom text-indigo-400">
                <UserIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Cargando Usuario</h1>
            <p className="text-gray-400 mb-4">Obteniendo información del usuario...</p>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="animate-shimmer h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (error && !user) {
    return (
      <MainLayout pageTitle="Error">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <div className="gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-bounceIn">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-pulse-custom text-red-400">
                <ExclamationIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Error al Cargar</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>No se pudo obtener la información del usuario solicitado.</p>
            </div>
            <Link 
              href="/control/users"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
            >
              <ArrowLeftIcon />
              Volver al Panel de Control
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle={`Editando Usuario: ${user?.nombre}`}>
      {/* Encabezado Principal */}
      <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl shadow-2xl mb-8 animate-slideInLeft">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-indigo-400">
            <UserIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Editar Usuario</h1>
            <p className="text-gray-400">Gestiona el estado y permisos del usuario</p>
          </div>
        </div>
        
        {/* Información del Usuario */}
        <div className="bg-gray-700 p-4 rounded-lg mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl animate-pulse-custom">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.nombre} {user?.apellido}</h2>
              <p className="text-gray-400">ID: {user?.id}</p>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>
          
          {/* Estado Actual */}
          <div className="flex items-center gap-3">
            <span className="text-gray-300">Estado actual:</span>
            <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full animate-pulse-custom ${
              user?.estado === 'activo' ? 'bg-green-100 text-green-800' :
              user?.estado === 'suspendido' ? 'bg-yellow-100 text-yellow-800' :
              user?.estado === 'baneado' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                user?.estado === 'activo' ? 'bg-green-500' :
                user?.estado === 'suspendido' ? 'bg-yellow-500' :
                user?.estado === 'baneado' ? 'bg-red-500' :
                'bg-gray-500'
              }`}></div>
              {user?.estado || 'inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Formulario de Edición */}
      <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl shadow-2xl animate-slideInRight">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-indigo-400">
            <EditIcon />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Cambiar Estado del Usuario</h2>
            <p className="text-gray-400">Modifica el estado y configuraciones del usuario</p>
          </div>
        </div>
        
        {/* Mensajes de Error y Éxito */}
        {error && (
          <div className="mb-6 p-4 bg-red-700 text-white rounded-lg animate-bounceIn flex items-center gap-3">
            <ExclamationIcon />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-700 text-white rounded-lg animate-bounceIn flex items-center gap-3">
            <StatusIcon />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleStatusSubmit} className="space-y-6">
          {/* Selector de Estado */}
          <div className="animate-fadeInUp" style={{animationDelay: '0.1s'}}>
            <label htmlFor="estado" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <StatusIcon />
              Nuevo Estado
            </label>
            <select 
              name="estado" 
              id="estado" 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            >
              <option value="activo">🟢 Activo</option>
              <option value="suspendido">🟡 Suspendido</option>
              <option value="baneado">🔴 Baneado</option>
              <option value="inactivo" disabled>⚫ Inactivo (solo lectura)</option>
            </select>
          </div>

          {/* Campo de Fecha de Suspensión */}
          {newStatus === 'suspendido' && (
            <div className="animate-fadeInUp" style={{animationDelay: '0.2s'}}>
              <label htmlFor="suspension_fin" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <CalendarIcon />
                Fecha de Fin de Suspensión
              </label>
              <input 
                type="date" 
                name="suspension_fin" 
                id="suspension_fin" 
                value={suspensionDate} 
                onChange={(e) => setSuspensionDate(e.target.value)} 
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                required
              />
              <p className="text-sm text-gray-400 mt-1">Selecciona hasta cuándo estará suspendido el usuario</p>
            </div>
          )}

          {/* Botón de Envío */}
          <div className="pt-4 animate-fadeInUp" style={{animationDelay: '0.3s'}}>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-all duration-200 animate-glow flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-pulse w-5 h-5 bg-white rounded-full"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <StatusIcon />
                  Actualizar Estado
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Botón de Volver */}
        <div className="mt-8 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <Link 
            href="/control/users" 
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto max-w-xs"
          >
            <ArrowLeftIcon />
            Volver al Panel de Control
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
