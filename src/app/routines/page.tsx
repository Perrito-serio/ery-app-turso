// src/app/routines/page.tsx
'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// --- Interfaces ---
interface Routine {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: string;
}

interface NewRoutine {
  nombre: string;
  descripcion?: string;
}

/**
 * Componente principal para la página de gestión de Rutinas.
 */
export default function RoutinesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // Función para obtener las rutinas del usuario desde la API
  const fetchRoutines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/routines');
      if (!response.ok) {
        throw new Error('No se pudieron cargar las rutinas.');
      }
      const data = await response.json();
      setRoutines(data.routines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efecto para cargar los datos al montar el componente
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRoutines();
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchRoutines]);

  if (status === 'loading' || isLoading) {
    return <MainLayout pageTitle="Mis Rutinas"><div className="text-center">Cargando...</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle="Mis Rutinas">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Mejorado */}
        <div className="flex justify-between items-center mb-8 animate-in slide-in-from-top duration-700">
          <div>
            <h2 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Mis Planes y Rutinas
            </h2>
            <p className="text-gray-400 text-lg">Organiza y gestiona tus hábitos con rutinas personalizadas</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/25 flex items-center gap-2 group"
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Crear Rutina
          </button>
        </div>

        {/* Error Message Mejorado */}
        {error && (
          <div className="bg-gradient-to-r from-red-800 to-red-900 border border-red-600/50 text-white p-4 rounded-xl mb-6 shadow-lg animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Grid de Rutinas Mejorado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {routines.length > 0 ? (
            routines.map((routine, index) => (
              <div 
                key={routine.id} 
                className="animate-in slide-in-from-bottom duration-700"
                style={{animationDelay: `${index * 100}ms`}}
              >
                <RoutineCard routine={routine} />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-12 rounded-2xl border border-gray-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom duration-700">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">📋</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Aún no tienes rutinas
              </h3>
              <p className="text-gray-400 text-lg mb-6">¡Crea tu primera rutina para organizar tus hábitos!</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
              >
                Crear mi primera rutina
              </button>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateRoutineModal
          onClose={() => setCreateModalOpen(false)}
          onRoutineCreated={(newRoutine) => {
            // Añade la nueva rutina al estado para que se muestre inmediatamente
            setRoutines(prev => [newRoutine, ...prev]);
            setCreateModalOpen(false);
          }}
        />
      )}
    </MainLayout>
  );
}

/**
 * Componente para mostrar una tarjeta de Rutina individual.
 */
const RoutineCard: React.FC<{ routine: Routine }> = ({ routine }) => {
  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 rounded-2xl shadow-2xl flex flex-col justify-between border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/10 group relative overflow-hidden">
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors duration-300 line-clamp-2">
              {routine.nombre}
            </h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed h-12 overflow-hidden group-hover:text-gray-300 transition-colors duration-300">
              {routine.descripcion || 'Sin descripción'}
            </p>
          </div>
          <div className="ml-4 w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <span className="text-2xl">📋</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">
              {new Date(routine.fecha_creacion).toLocaleDateString('es-ES')}
            </span>
          </div>
          <Link 
            href={`/routines/${routine.id}`} 
            className="px-4 py-2 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 group/link"
          >
            <span>Ver y Editar</span>
            <svg className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente Modal para crear una nueva Rutina.
 */
const CreateRoutineModal: React.FC<{ onClose: () => void; onRoutineCreated: (routine: Routine) => void; }> = ({ onClose, onRoutineCreated }) => {
  const [newRoutine, setNewRoutine] = useState<NewRoutine>({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newRoutine.nombre.trim()) {
      setError("El nombre de la rutina no puede estar vacío.");
      return;
    }
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoutine),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la rutina.');
      }
      onRoutineCreated(data.routine);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700/50 relative overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Efecto de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5"></div>
        
        <div className="relative">
          {/* Header del Modal */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Crear Nueva Rutina
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-gradient-to-r from-red-800 to-red-900 border border-red-600/50 text-white p-4 rounded-xl mb-6 shadow-lg animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-sm">{error}</span>
              </div>
            </div>
          )}
          
          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nombre" className="block text-sm font-semibold text-gray-300 mb-2">
                Nombre de la Rutina
              </label>
              <input 
                type="text" 
                id="nombre" 
                value={newRoutine.nombre} 
                onChange={(e) => setNewRoutine({ ...newRoutine, nombre: e.target.value })} 
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300" 
                placeholder="Ej: Rutina matutina, Rutina de ejercicios..."
                required 
              />
            </div>
            <div>
              <label htmlFor="descripcion" className="block text-sm font-semibold text-gray-300 mb-2">
                Descripción (Opcional)
              </label>
              <textarea 
                id="descripcion" 
                value={newRoutine.descripcion} 
                onChange={(e) => setNewRoutine({ ...newRoutine, descripcion: e.target.value })} 
                rows={4}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-none" 
                placeholder="Describe el propósito de esta rutina..."
              />
            </div>
            
            {/* Botones */}
            <div className="flex justify-end gap-4 pt-6">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 bg-gray-600/50 hover:bg-gray-500/50 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Crear Rutina
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
