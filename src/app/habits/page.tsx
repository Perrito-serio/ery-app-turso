'use client';

import { useEffect, useState, useCallback, FormEvent, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// --- Interfaces ---
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

// --- Helpers de Fecha ---
const localToday = new Date();
function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
const todayStringForAPI = getLocalDateString(localToday);

// --- Componente Principal (Reestructurado) ---
export default function HabitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado para controlar la vista activa: hábitos buenos o malos.
  const [activeView, setActiveView] = useState<'good' | 'bad'>('good');

  const fetchHabits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/habits');
      if (!response.ok) throw new Error('No se pudieron cargar los hábitos.');
      const data = await response.json();
      setAllHabits(data.habits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchHabits();
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router, fetchHabits]);

  // Usamos useMemo para filtrar los hábitos sin recalcular en cada render.
  const { goodHabits, badHabits } = useMemo(() => {
    const good = allHabits.filter(h => h.tipo !== 'MAL_HABITO');
    const bad = allHabits.filter(h => h.tipo === 'MAL_HABITO');
    return { goodHabits: good, badHabits: bad };
  }, [allHabits]);

  const handleConfirmDelete = async () => {
    if (!habitToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/habits/${habitToDelete.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al eliminar.');
      setAllHabits(prev => prev.filter(h => h.id !== habitToDelete.id));
      setHabitToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <MainLayout pageTitle="Mis Hábitos"><div className="text-center">Cargando...</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle="Mis Hábitos y Adicciones">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-white">Mi Panel de Seguimiento</h2>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg"
        >
          + Crear Hábito
        </button>
      </div>

      {/* Pestañas para cambiar de vista */}
      <div className="mb-6 border-b border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveView('good')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'good' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
          >
            Mis Hábitos (Buenos)
          </button>
          <button
            onClick={() => setActiveView('bad')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'bad' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
          >
            Mis Adicciones (A superar)
          </button>
        </nav>
      </div>

      {error && <div className="bg-red-700 text-white p-3 rounded mb-4" onClick={() => setError(null)}>{error}</div>}

      {/* Renderizado condicional de la lista de hábitos */}
      {activeView === 'good' && (
        <HabitList habits={goodHabits} onHabitDelete={setHabitToDelete} title="Hábitos a Construir" />
      )}
      {activeView === 'bad' && (
        <HabitList habits={badHabits} onHabitDelete={setHabitToDelete} title="Hábitos a Superar" />
      )}

      {isCreateModalOpen && (
        <CreateHabitModal
          onClose={() => setCreateModalOpen(false)}
          onHabitCreated={(newHabit) => {
            setAllHabits(prev => [newHabit, ...prev]);
            setCreateModalOpen(false);
          }}
        />
      )}
      <ConfirmationModal
        isOpen={!!habitToDelete}
        onClose={() => setHabitToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar el hábito "${habitToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmButtonText="Sí, eliminar"
        isConfirming={isDeleting}
      />
    </MainLayout>
  );
}

// --- Componente para renderizar la lista de hábitos ---
const HabitList: React.FC<{ habits: Habit[]; onHabitDelete: (habit: Habit) => void; title: string; }> = ({ habits, onHabitDelete, title }) => {
  if (habits.length === 0) {
    return (
      <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
        <h3 className="text-xl font-semibold text-white mb-2">No hay nada aquí todavía.</h3>
        <p>¡Crea un nuevo hábito para empezar a seguir tu progreso!</p>
      </div>
    );
  }
  return (
    <>
      <h3 className="text-xl font-semibold text-gray-300 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map(habit => <HabitCard key={habit.id} habit={habit} onDeleteClick={() => onHabitDelete(habit)} />)}
      </div>
    </>
  );
};


// --- Componente para la tarjeta de cada hábito (Lógica de registro corregida) ---
const HabitCard: React.FC<{ habit: Habit; onDeleteClick: () => void; }> = ({ habit, onDeleteClick }) => {
    const router = useRouter();
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const logProgress = async (payload: { valor_booleano?: boolean; valor_numerico?: number; }) => {
        setNotification(null);
        try {
            const body = { habito_id: habit.id, fecha_registro: todayStringForAPI, ...payload };
            const response = await fetch('/api/habits/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Error al registrar.");
            showNotification(data.message || "Progreso registrado.", 'success');
        } catch (error) {
            showNotification(error instanceof Error ? error.message : "Error desconocido.", 'error');
        }
    };
    
    const renderAction = () => {
        switch (habit.tipo) {
            case 'SI_NO':
                return <button onClick={() => logProgress({ valor_booleano: true })} className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold">Marcar como Hecho</button>;
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
                // Para un mal hábito, la API ahora sabe que un registro simple es una recaída.
                return <button onClick={() => logProgress({})} className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold">Registrar Recaída Hoy</button>;
            default: return null;
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between relative">
            <button onClick={onDeleteClick} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors p-1 rounded-full" aria-label={`Eliminar hábito ${habit.nombre}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
            </button>
            <div>
                <h3 className="text-lg font-bold text-white pr-8">{habit.nombre}</h3>
                <p className="text-sm text-gray-400 mt-1">{habit.descripcion || 'Sin descripción'}</p>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-indigo-400 font-mono">{habit.tipo.replace('_', ' ')}</p>
                    <button
                        onClick={() => router.push(`/habits/${habit.id}`)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Ver estadísticas
                    </button>
                </div>
            </div>
            <div className="mt-4">
                <p className="text-sm text-gray-400">Registrar progreso para hoy ({localToday.toLocaleDateString()}):</p>
                {renderAction()}
                {notification && (
                    <div className={`mt-3 p-2 text-sm text-center rounded-md ${notification.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>{notification.message}</div>
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
                          <option value="SI_NO">Hábito de Sí / No (ej. Meditar)</option>
                          <option value="MEDIBLE_NUMERICO">Hábito Medible (ej. Leer páginas)</option>
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
