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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-white">Mis Planes y Rutinas</h2>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-transform hover:scale-105"
        >
          + Crear Rutina
        </button>
      </div>

      {error && <div className="bg-red-700 text-white p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routines.length > 0 ? (
          routines.map(routine => <RoutineCard key={routine.id} routine={routine} />)
        ) : (
          <div className="col-span-full text-center text-gray-400 bg-gray-800 p-10 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-2">Aún no tienes rutinas.</h3>
            <p>¡Crea tu primera rutina para organizar tus hábitos!</p>
          </div>
        )}
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
    <div className="bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col justify-between border border-gray-700 hover:border-indigo-500 transition-all duration-300">
      <div>
        <h3 className="text-lg font-bold text-white truncate">{routine.nombre}</h3>
        <p className="text-sm text-gray-400 mt-1 h-10 overflow-hidden">{routine.descripcion || 'Sin descripción'}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Creada: {new Date(routine.fecha_creacion).toLocaleDateString()}
        </span>
        {/* Este Link llevará a la página de detalles de la rutina, que crearemos más adelante */}
        <Link href={`/routines/${routine.id}`} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
          Ver y Editar
        </Link>
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">Crear Nueva Rutina</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        {error && <div className="bg-red-800 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre de la Rutina</label>
            <input 
              type="text" 
              id="nombre" 
              value={newRoutine.nombre} 
              onChange={(e) => setNewRoutine({ ...newRoutine, nombre: e.target.value })} 
              className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500" 
              required 
            />
          </div>
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-300">Descripción (Opcional)</label>
            <textarea 
              id="descripcion" 
              value={newRoutine.descripcion} 
              onChange={(e) => setNewRoutine({ ...newRoutine, descripcion: e.target.value })} 
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold disabled:opacity-50">
              {isSubmitting ? 'Creando...' : 'Crear Rutina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
