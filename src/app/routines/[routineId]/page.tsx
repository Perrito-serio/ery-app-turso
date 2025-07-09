// src/app/routines/[routineId]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// --- Interfaces ---
interface Habit {
  id: number;
  nombre: string;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

interface RoutineDetails {
  id: number;
  nombre: string;
  descripcion: string | null;
  habits: Habit[];
}

// --- Componente Principal ---
export default function RoutineDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  // En Next.js 15, no podemos usar React.use en componentes cliente
  // Usamos el valor directamente, ya que useParams ya es seguro en componentes cliente
  const routineId = params.routineId as string;

  const [routine, setRoutine] = useState<RoutineDetails | null>(null);
  const [allUserHabits, setAllUserHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función para obtener los detalles de la rutina y todos los hábitos del usuario
  const fetchData = useCallback(async () => {
    if (!routineId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Hacemos dos peticiones en paralelo para ser más eficientes
      const [routineRes, habitsRes] = await Promise.all([
        fetch(`/api/routines/${routineId}`),
        fetch('/api/habits')
      ]);

      if (!routineRes.ok) {
        throw new Error('No se pudo cargar la rutina. Puede que no exista o no tengas permiso.');
      }
      if (!habitsRes.ok) {
        throw new Error('No se pudieron cargar tus hábitos.');
      }

      const routineData: RoutineDetails = await routineRes.json();
      const habitsData: { habits: Habit[] } = await habitsRes.json();
      
      setRoutine(routineData);
      setAllUserHabits(habitsData.habits || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, [routineId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchData]);

  // Función para eliminar un hábito de la rutina
  const handleRemoveHabit = async (habitId: number) => {
    if (!routine) return;
    try {
      const response = await fetch(`/api/routines/${routine.id}/habits`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al eliminar el hábito.');
      }
      // Actualizar el estado local para reflejar el cambio inmediatamente
      setRoutine(prev => prev ? ({
        ...prev,
        habits: prev.habits.filter(h => h.id !== habitId)
      }) : null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  // Función para añadir un hábito a la rutina
  const handleAddHabit = async (habitId: number) => {
    if (!routine) return;
     try {
      const response = await fetch(`/api/routines/${routine.id}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId }),
      });
       const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al añadir el hábito.');
      }
      // Volver a cargar los datos para obtener la lista actualizada
      fetchData(); 
      setIsModalOpen(false); // Cerrar el modal
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (isLoading) {
    return (
      <MainLayout pageTitle="Cargando Rutina...">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center animate-in fade-in duration-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-white text-lg font-medium">Cargando detalles de la rutina...</div>
            <div className="text-gray-400 text-sm mt-2">Obteniendo información</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout pageTitle="Error">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-2xl mb-6 shadow-2xl border border-red-500/30 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Error al cargar la rutina</h2>
            </div>
            <p className="text-red-100 mb-6">{error}</p>
            <button
              onClick={() => router.push('/routines')}
              className="px-6 py-3 bg-red-500 hover:bg-red-400 rounded-lg transition-all duration-300 font-semibold hover:scale-105 transform shadow-lg"
            >
              Volver a Rutinas
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!routine) {
    return (
      <MainLayout pageTitle="Rutina no encontrada">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 animate-in slide-in-from-bottom duration-700">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Rutina no encontrada</h2>
            <p className="text-gray-400 mb-6">La rutina que buscas no existe o no tienes permisos para verla.</p>
            <button
              onClick={() => router.push('/routines')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg transition-all duration-300 text-white font-semibold hover:scale-105 transform shadow-lg"
            >
              Volver a Rutinas
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Filtrar los hábitos que ya están en la rutina para no mostrarlos en el modal de añadir
  const availableHabitsToAdd = allUserHabits.filter(
    (userHabit) => !routine.habits.some((routineHabit) => routineHabit.id === userHabit.id)
  );

  return (
    <MainLayout pageTitle={`Detalle de: ${routine.nombre}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Botón de regreso mejorado */}
        <div className="mb-8 animate-in slide-in-from-top duration-700">
          <button
            onClick={() => router.push('/routines')}
            className="mb-6 text-indigo-400 hover:text-indigo-300 transition-all duration-300 flex items-center gap-2 hover:translate-x-1 transform group"
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Volver a Rutinas</span>
          </button>
          
          {/* Encabezado mejorado */}
          <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden relative">
            {/* Efecto de fondo animado */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 opacity-50"></div>
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {routine.nombre}
                  </h1>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {routine.descripcion || 'Esta rutina no tiene descripción.'}
                  </p>
                </div>
                
                {/* Icono decorativo */}
                <div className="hidden lg:block ml-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">📋</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header de sección de hábitos mejorado */}
        <div className="flex justify-between items-center mb-8 animate-in slide-in-from-left duration-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Hábitos en esta Rutina
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-green-500/25 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Añadir Hábito
          </button>
        </div>

        {/* Lista de hábitos mejorada */}
        <div className="space-y-4 animate-in slide-in-from-bottom duration-700">
          {routine.habits.length > 0 ? (
            routine.habits.map((habit, index) => (
              <div 
                key={habit.id} 
                className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group animate-in fade-in slide-in-from-left duration-500"
                style={{animationDelay: `${index * 100}ms`}}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl">
                        {habit.tipo === 'SI_NO' ? '✅' : habit.tipo === 'MEDIBLE_NUMERICO' ? '📊' : '🚫'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors duration-300">
                        {habit.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          habit.tipo === 'SI_NO' ? 'bg-green-600/20 text-green-400 border border-green-500/30' :
                          habit.tipo === 'MEDIBLE_NUMERICO' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' :
                          'bg-red-600/20 text-red-400 border border-red-500/30'
                        }`}>
                          {habit.tipo === 'SI_NO' ? 'Sí/No' : habit.tipo === 'MEDIBLE_NUMERICO' ? 'Medible' : 'Mal Hábito'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveHabit(habit.id)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-semibold rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Quitar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-12 rounded-2xl border border-gray-700/50 animate-in zoom-in-95 duration-700">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Esta rutina aún no tiene hábitos</h3>
              <p className="text-gray-400 mb-6">¡Añade algunos hábitos para empezar a construir tu rutina perfecta!</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Añadir tu primer hábito
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <AddHabitModal
          availableHabits={availableHabitsToAdd}
          onClose={() => setIsModalOpen(false)}
          onAddHabit={handleAddHabit}
        />
      )}
    </MainLayout>
  );
}

// --- Componente Modal para Añadir Hábitos ---
interface AddHabitModalProps {
  availableHabits: Habit[];
  onClose: () => void;
  onAddHabit: (habitId: number) => void;
}

const AddHabitModal: React.FC<AddHabitModalProps> = ({ availableHabits, onClose, onAddHabit }) => {
  const [selectedHabit, setSelectedHabit] = useState<string>('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedHabit) {
      onAddHabit(parseInt(selectedHabit, 10));
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
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Añadir Hábito a la Rutina
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
          
          {availableHabits.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Selecciona un hábito para añadir
                </label>
                <select
                  value={selectedHabit}
                  onChange={(e) => setSelectedHabit(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                >
                  <option value="" disabled>Selecciona un hábito...</option>
                  {availableHabits.map(habit => (
                    <option key={habit.id} value={habit.id}>
                      {habit.nombre} ({habit.tipo === 'SI_NO' ? 'Sí/No' : habit.tipo === 'MEDIBLE_NUMERICO' ? 'Medible' : 'Mal Hábito'})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Lista visual de hábitos disponibles */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                <p className="text-sm font-semibold text-gray-300 mb-2">Hábitos disponibles:</p>
                {availableHabits.map(habit => (
                  <div 
                    key={habit.id}
                    onClick={() => setSelectedHabit(habit.id.toString())}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                      selectedHabit === habit.id.toString()
                        ? 'bg-green-600/20 border-green-500/50 text-green-300'
                        : 'bg-gray-700/30 border-gray-600/30 text-gray-300 hover:bg-gray-600/30 hover:border-gray-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {habit.tipo === 'SI_NO' ? '✅' : habit.tipo === 'MEDIBLE_NUMERICO' ? '📊' : '🚫'}
                      </span>
                      <div>
                        <p className="font-medium">{habit.nombre}</p>
                        <p className="text-xs opacity-75">
                          {habit.tipo === 'SI_NO' ? 'Sí/No' : habit.tipo === 'MEDIBLE_NUMERICO' ? 'Medible' : 'Mal Hábito'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
                  disabled={!selectedHabit} 
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Añadir Hábito
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😔</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No hay hábitos disponibles</h3>
              <p className="text-gray-400 mb-6">No tienes más hábitos disponibles para añadir a esta rutina.</p>
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 bg-gray-600/50 hover:bg-gray-500/50 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
