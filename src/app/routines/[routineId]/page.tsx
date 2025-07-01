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
    return <MainLayout pageTitle="Cargando Rutina..."><div className="text-center">Cargando...</div></MainLayout>;
  }

  if (error) {
    return <MainLayout pageTitle="Error"><div className="text-center text-red-500">{error}</div></MainLayout>;
  }

  if (!routine) {
    return <MainLayout pageTitle="Rutina no encontrada"><div className="text-center">No se encontró la rutina.</div></MainLayout>;
  }

  // Filtrar los hábitos que ya están en la rutina para no mostrarlos en el modal de añadir
  const availableHabitsToAdd = allUserHabits.filter(
    (userHabit) => !routine.habits.some((routineHabit) => routineHabit.id === userHabit.id)
  );

  return (
    <MainLayout pageTitle={`Detalle de: ${routine.nombre}`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <h1 className="text-3xl font-bold text-white">{routine.nombre}</h1>
          <p className="text-gray-400 mt-2">{routine.descripcion || 'Esta rutina no tiene descripción.'}</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Hábitos en esta Rutina</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-lg"
          >
            + Añadir Hábito
          </button>
        </div>

        <div className="space-y-4">
          {routine.habits.length > 0 ? (
            routine.habits.map(habit => (
              <div key={habit.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{habit.nombre}</p>
                  <p className="text-sm text-gray-400">{habit.tipo}</p>
                </div>
                <button 
                  onClick={() => handleRemoveHabit(habit.id)}
                  className="text-red-400 hover:text-red-300 font-semibold"
                >
                  Quitar
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 bg-gray-800 p-8 rounded-lg">
              <p>Esta rutina aún no tiene hábitos.</p>
              <p>¡Añade uno para empezar!</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center">
            <Link href="/routines" className="text-indigo-400 hover:underline">
                &larr; Volver a todas las rutinas
            </Link>
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Añadir Hábito a la Rutina</h2>
        {availableHabits.length > 0 ? (
          <form onSubmit={handleSubmit}>
            <select
              value={selectedHabit}
              onChange={(e) => setSelectedHabit(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Selecciona un hábito...</option>
              {availableHabits.map(habit => (
                <option key={habit.id} value={habit.id}>{habit.nombre}</option>
              ))}
            </select>
            <div className="flex justify-end gap-4 pt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Cancelar</button>
              <button type="submit" disabled={!selectedHabit} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold disabled:opacity-50">Añadir</button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-gray-400">No tienes más hábitos disponibles para añadir a esta rutina.</p>
             <div className="flex justify-end gap-4 pt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
