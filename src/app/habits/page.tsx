'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';

// --- Interfaces (sin cambios) ---
interface Habit {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: string;
}

interface NewHabit {
  nombre: string;
  descripcion?: string;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo?: number;
}

// 1. CORRECCIÓN DE LA GESTIÓN DE FECHAS
// Obtenemos la fecha local del usuario una sola vez.
const localToday = new Date(); 

// Helper para formatear la fecha a YYYY-MM-DD para la API, respetando la zona horaria local.
function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const todayStringForAPI = getLocalDateString(localToday);

export default function HabitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchHabits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/habits');
      if (!response.ok) throw new Error('No se pudieron cargar los hábitos.');
      const data = await response.json();
      setHabits(data.habits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchHabits();
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchHabits]);
  
  if (status === 'loading' || isLoading) {
    return <MainLayout pageTitle="Mis Hábitos"><div className="text-center">Cargando...</div></MainLayout>;
  }

  if (status === 'unauthenticated') {
    return <MainLayout pageTitle="Redirigiendo"><div className="text-center">Redirigiendo a inicio de sesión...</div></MainLayout>;
  }
  
  return (
    <MainLayout pageTitle="Mis Hábitos y Adicciones">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-white">Mi Panel de Hábitos</h2>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg"
        >
          + Crear Hábito
        </button>
      </div>

      {error && <div className="bg-red-700 text-white p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.length > 0 ? (
          habits.map(habit => <HabitCard key={habit.id} habit={habit} />)
        ) : (
          <div className="col-span-full text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
            <p>Aún no has creado ningún hábito.</p>
            <p>¡Haz clic en "Crear Hábito" para empezar tu camino!</p>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateHabitModal
          onClose={() => setCreateModalOpen(false)}
          onHabitCreated={(newHabit) => {
            setHabits(prev => [newHabit, ...prev]);
            setCreateModalOpen(false);
          }}
        />
      )}
    </MainLayout>
  );
}

// --- Componente para la tarjeta de cada hábito ---
type Notification = {
    message: string;
    type: 'success' | 'error';
};

const HabitCard: React.FC<{ habit: Habit }> = ({ habit }) => {
    const [notification, setNotification] = useState<Notification | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const logProgress = async (payload: { valor_booleano?: boolean; valor_numerico?: number; es_recaida?: boolean; }) => {
        setNotification(null);
        try {
            const body = {
                habito_id: habit.id,
                fecha_registro: todayStringForAPI, // 2. Usamos la cadena formateada para la API
                ...payload
            };
            
            const response = await fetch('/api/habits/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Error al registrar el progreso.");
            }
            showNotification(data.message || `Progreso para "${habit.nombre}" registrado.`, 'success');
        } catch (error) {
            showNotification(error instanceof Error ? error.message : "Error desconocido.", 'error');
        }
    };
    
    const renderAction = () => {
        switch (habit.tipo) {
            case 'SI_NO':
                return (
                    <button onClick={() => logProgress({ valor_booleano: true })} className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold">
                        Marcar como Hecho
                    </button>
                );
            case 'MEDIBLE_NUMERICO':
                const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const value = parseFloat(e.currentTarget.valor.value);
                    if (!isNaN(value)) logProgress({ valor_numerico: value });
                };
                return (
                    <form onSubmit={handleSubmit} className="flex items-center mt-4 gap-2">
                        <input type="number" name="valor" step="any" placeholder={`Meta: ${habit.meta_objetivo ?? 'N/A'}`} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"/>
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold">OK</button>
                    </form>
                );
            case 'MAL_HABITO':
                return (
                    <button onClick={() => logProgress({ es_recaida: true })} className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold">
                        Registrar Recaída Hoy
                    </button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-bold text-white">{habit.nombre}</h3>
                <p className="text-sm text-gray-400 mt-1">{habit.descripcion || 'Sin descripción'}</p>
                <p className="text-xs text-indigo-400 mt-2 font-mono">Tipo: {habit.tipo}</p>
            </div>
            <div className="mt-4">
                {/* 3. Usamos el objeto Date local para mostrar la fecha */}
                <p className="text-sm text-gray-400">Registrar progreso para hoy ({localToday.toLocaleDateString()}):</p>
                {renderAction()}
                {notification && (
                    <div className={`mt-3 p-2 text-sm text-center rounded-md ${notification.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                        {notification.message}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Componente Modal para crear un nuevo hábito (sin cambios) ---
const CreateHabitModal: React.FC<{ onClose: () => void; onHabitCreated: (habit: Habit) => void; }> = ({ onClose, onHabitCreated }) => {
  const [newHabit, setNewHabit] = useState<NewHabit>({ nombre: '', tipo: 'SI_NO' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');
      try {
          const response = await fetch('/api/habits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newHabit),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Error al crear el hábito.');
          
          onHabitCreated(data.habit);

      } catch (err) {
          setError(err instanceof Error ? err.message : 'Error desconocido.');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-2xl font-semibold text-white mb-4">Crear Nuevo Hábito</h2>
              {error && <div className="bg-red-700 text-white p-3 rounded mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre del Hábito</label>
                      <input type="text" id="nombre" value={newHabit.nombre} onChange={(e) => setNewHabit({...newHabit, nombre: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" required />
                  </div>
                  <div>
                      <label htmlFor="descripcion" className="block text-sm font-medium text-gray-300">Descripción (opcional)</label>
                      <textarea id="descripcion" value={newHabit.descripcion} onChange={(e) => setNewHabit({...newHabit, descripcion: e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                  </div>
                  <div>
                      <label htmlFor="tipo" className="block text-sm font-medium text-gray-300">Tipo de Hábito</label>
                      <select id="tipo" value={newHabit.tipo} onChange={(e) => setNewHabit({...newHabit, tipo: e.target.value as NewHabit['tipo']})} className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md">
                          <option value="SI_NO">Sí / No (ej. Meditar)</option>
                          <option value="MEDIBLE_NUMERICO">Medible (ej. Leer páginas)</option>
                          <option value="MAL_HABITO">Dejar un Mal Hábito (ej. Dejar de fumar)</option>
                      </select>
                  </div>
                  {newHabit.tipo === 'MEDIBLE_NUMERICO' && (
                       <div>
                          <label htmlFor="meta_objetivo" className="block text-sm font-medium text-gray-300">Meta Numérica (ej. 30 para 30 páginas)</label>
                          <input type="number" id="meta_objetivo" value={newHabit.meta_objetivo || ''} onChange={(e) => setNewHabit({...newHabit, meta_objetivo: parseFloat(e.target.value)})} className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" required />
                       </div>
                  )}
                  <div className="flex justify-end gap-4 pt-4">
                      <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancelar</button>
                      <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white disabled:opacity-50">
                          {isSubmitting ? 'Creando...' : 'Crear Hábito'}
                      </button>
                  </div>
              </form>
          </div>
      </div>
  );
};
