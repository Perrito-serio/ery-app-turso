'use client';

import { useEffect, useState, useCallback, FormEvent, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// Estilos CSS personalizados
const customStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// --- Iconos Mejorados ---
interface IconProps {
  className?: string;
}

const PlusIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>;
const LeafIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>;
const NoSmokingIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;
const CheckIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>;
const ChartBarIcon: React.FC<IconProps> = ({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v9.375c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75zM6 13.125c-1.035 0-1.875.84-1.875 1.875v4.875c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V15c0-1.035-.84-1.875-1.875-1.875H6z" /></svg>;
const TrashIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg>;
const SparklesIcon: React.FC<IconProps> = ({ className = "w-5 h-5 text-yellow-300 animate-pulse" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" /></svg>;

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
    return (
      <MainLayout pageTitle="Mis Hábitos">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">Cargando tus hábitos</h3>
            <p className="text-gray-400 animate-pulse">Preparando tu panel de seguimiento...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Mis Hábitos y Adicciones">
      {/* Estilos CSS personalizados */}
      <style jsx>{customStyles}</style>
      {/* Header mejorado con gradiente */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-xl"></div>
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Mi Panel de Seguimiento
              </h1>
              <p className="text-gray-400 text-lg">Construye hábitos positivos y supera las adicciones</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <LeafIcon className="w-4 h-4 text-emerald-400" />
                  {goodHabits.length} hábitos positivos
                </span>
                <span className="flex items-center gap-1">
                  <NoSmokingIcon className="w-4 h-4 text-red-400" />
                  {badHabits.length} adicciones
                </span>
              </div>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="group relative px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <PlusIcon />
                Crear Hábito
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de selección compacta con efectos */}
      <div className="mb-8">
        <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 border border-gray-700/30 shadow-lg">
          {/* Indicador deslizante animado */}
          <div 
            className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r rounded-lg transition-all duration-300 ease-out shadow-lg ${
              activeView === 'good' 
                ? 'left-1 from-emerald-500/80 to-emerald-600/80 shadow-emerald-500/25' 
                : 'left-1/2 from-red-500/80 to-red-600/80 shadow-red-500/25'
            }`}
          ></div>
          
          <div className="relative flex">
            <button
              onClick={() => setActiveView('good')}
              className={`relative flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 z-10 ${
                activeView === 'good'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-emerald-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <LeafIcon className="w-4 h-4" />
                <span>Hábitos Positivos</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeView === 'good' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {goodHabits.length}
                </span>
              </span>
            </button>
            
            <button
              onClick={() => setActiveView('bad')}
              className={`relative flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 z-10 ${
                activeView === 'bad'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-red-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <NoSmokingIcon className="w-4 h-4" />
                <span>Adicciones</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeView === 'bad' ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'
                }`}>
                  {badHabits.length}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-xl mb-8 border border-red-500/30 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-200 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
  const isGood = title.includes('Construir');
  
  if (habits.length === 0) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/10 via-gray-500/10 to-gray-600/10 rounded-3xl blur-xl"></div>
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-3xl p-12 text-center border border-gray-700/50 backdrop-blur-sm">
          <div className="space-y-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
              isGood ? 'bg-emerald-500/20 border-2 border-emerald-500/30' : 'bg-red-500/20 border-2 border-red-500/30'
            }`}>
              {isGood ? (
                <LeafIcon className="w-10 h-10 text-emerald-400" />
              ) : (
                <NoSmokingIcon className="w-10 h-10 text-red-400" />
              )}
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white">
                No tienes {isGood ? 'hábitos positivos' : 'adicciones'} registrados
              </h3>
              <p className="text-gray-400 text-lg">
                ¡Crea tu primer {isGood ? 'hábito positivo' : 'adicción a superar'}!
              </p>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {isGood 
                  ? 'Los hábitos positivos te ayudarán a construir una rutina saludable y productiva.'
                  : 'Registra las adicciones que quieres superar para hacer un seguimiento de tu progreso.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        {isGood ? (
          <LeafIcon className="w-8 h-8 text-emerald-400" />
        ) : (
          <NoSmokingIcon className="w-8 h-8 text-red-400" />
        )}
        {title}
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isGood ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {habits.length}
        </span>
      </h3>
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {habits.map((habit, index) => (
          <div
            key={habit.id}
            className="animate-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <HabitCard habit={habit} onDeleteClick={() => onHabitDelete(habit)} />
          </div>
        ))}
      </div>
    </div>
  );
};


// --- Componente para la tarjeta de cada hábito (Lógica de registro corregida) ---
const HabitCard: React.FC<{ habit: Habit; onDeleteClick: () => void; }> = ({ habit, onDeleteClick }) => {
    const router = useRouter();
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; } | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const logProgress = async (payload: { valor_booleano?: boolean; valor_numerico?: number; }) => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderAction = () => {
        switch (habit.tipo) {
            case 'SI_NO':
                return (
                    <button 
                        onClick={() => logProgress({ valor_booleano: true })} 
                        disabled={isLoading}
                        className="group/btn relative overflow-hidden w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                        <span className="flex items-center justify-center gap-2 relative z-10">
                            <CheckIcon className="w-4 h-4" />
                            Marcar como Hecho
                        </span>
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-300"></div>
                    </button>
                );
            case 'MEDIBLE_NUMERICO':
                const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const value = parseFloat(e.currentTarget.valor.value);
                    if (!isNaN(value)) logProgress({ valor_numerico: value });
                };
                return (
                    <div className="space-y-3 mt-4">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="relative">
                                <input 
                                    type="number" 
                                    name="valor" 
                                    step="any" 
                                    placeholder={`Meta: ${habit.meta_objetivo ?? 'N/A'}`} 
                                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 backdrop-blur-sm"
                                    disabled={isLoading}
                                />
                                {habit.meta_objetivo && (
                                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                                        / {habit.meta_objetivo}
                                    </span>
                                )}
                            </div>
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="group/btn relative overflow-hidden w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                            >
                                <span className="flex items-center justify-center gap-2 relative z-10">
                                    <ChartBarIcon className="w-4 h-4" />
                                    Registrar Progreso
                                </span>
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-300"></div>
                            </button>
                        </form>
                    </div>
                );
            case 'MAL_HABITO':
                return (
                    <button 
                        onClick={() => logProgress({})} 
                        disabled={isLoading}
                        className="group/btn relative overflow-hidden w-full mt-4 py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                        <span className="flex items-center justify-center gap-2 relative z-10">
                            😞 Registrar Recaída Hoy
                        </span>
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-300"></div>
                    </button>
                );
            default: return null;
        }
    };

    const isGoodHabit = habit.tipo !== 'MAL_HABITO';

    return (
        <div 
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Glow effect */}
            <div className={`absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300 ${isGoodHabit 
                ? 'bg-gradient-to-r from-emerald-600/20 via-green-600/20 to-emerald-600/20'
                : 'bg-gradient-to-r from-red-600/20 via-rose-600/20 to-red-600/20'
            } ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
            
            {/* Main card */}
            <div className={`relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-4 sm:p-6 shadow-xl border transition-all duration-300 transform group-hover:scale-[1.02] ${isGoodHabit 
                ? 'border-emerald-500/30 hover:border-emerald-400/50'
                : 'border-red-500/30 hover:border-red-400/50'
            } backdrop-blur-sm overflow-hidden`}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4 gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isGoodHabit 
                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                            : 'bg-red-500/20 border border-red-500/30'
                        }`}>
                            {isGoodHabit ? (
                                <LeafIcon className="w-5 h-5 text-emerald-400" />
                            ) : (
                                <NoSmokingIcon className="w-5 h-5 text-red-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">{habit.nombre}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                                    habit.tipo === 'SI_NO' ? 'bg-blue-500/20 text-blue-300' :
                                    habit.tipo === 'MEDIBLE_NUMERICO' ? 'bg-purple-500/20 text-purple-300' :
                                    'bg-orange-500/20 text-orange-300'
                                }`}>
                                    {habit.tipo === 'SI_NO' ? 'Sí/No' :
                                     habit.tipo === 'MEDIBLE_NUMERICO' ? 'Numérico' : 'Adicción'}
                                </span>
                                {habit.meta_objetivo && (
                                    <span className="text-xs text-gray-400 truncate">(Meta: {habit.meta_objetivo})</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => router.push(`/habits/${habit.id}`)}
                            className="group/stats p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-200 flex-shrink-0"
                            title="Ver estadísticas"
                        >
                            <ChartBarIcon className="w-4 h-4 text-indigo-400 group-hover/stats:text-indigo-300" />
                        </button>
                        <button
                            onClick={onDeleteClick}
                            disabled={isLoading}
                            className="group/delete p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                            aria-label={`Eliminar hábito ${habit.nombre}`}
                        >
                            <TrashIcon className="w-4 h-4 text-red-400 group-hover/delete:text-red-300" />
                        </button>
                    </div>
                </div>
                
                {/* Description */}
                {habit.descripcion && (
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed line-clamp-2 break-words">{habit.descripcion}</p>
                )}

                {/* Progress section */}
                <div>
                    <p className="text-sm text-gray-400 mb-3">Registrar progreso para hoy ({localToday.toLocaleDateString()}):</p>
                    {renderAction()}
                    
                    {/* Notification */}
                    {notification && (
                        <div className={`mt-4 p-3 text-sm text-center rounded-xl border animate-in slide-in-from-top-2 duration-300 ${
                            notification.type === 'success' 
                                ? 'bg-emerald-800/50 text-emerald-200 border-emerald-500/30' 
                                : 'bg-red-800/50 text-red-200 border-red-500/30'
                        }`}>
                            <div className="flex items-center justify-center gap-2">
                                {notification.type === 'success' ? (
                                    <CheckIcon className="w-4 h-4" />
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {notification.message}
                            </div>
                        </div>
                    )}
                </div>

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                        <div className="relative">
                            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <SparklesIcon className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Componente Modal para crear un nuevo hábito (Mejorado) ---
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-xl"></div>
              
              {/* Modal content */}
              <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-700/50 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <SparklesIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                              Crear Nuevo Hábito
                          </h2>
                          <p className="text-gray-400 text-sm">Define un nuevo hábito para seguir tu progreso</p>
                      </div>
                  </div>
                  
                  {error && (
                      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-xl mb-6 border border-red-500/30 shadow-lg animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">{error}</span>
                              <button
                                  onClick={() => setError('')}
                                  className="ml-auto text-red-200 hover:text-white transition-colors"
                              >
                                  ×
                              </button>
                          </div>
                      </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Nombre */}
                      <div className="space-y-2">
                          <label htmlFor="nombre" className="block text-sm font-semibold text-gray-300">Nombre del hábito</label>
                          <input 
                              type="text" 
                              id="nombre" 
                              value={newHabit.nombre} 
                              onChange={(e) => setNewHabit({...newHabit, nombre: e.target.value})} 
                              className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-xl border border-gray-600/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 backdrop-blur-sm"
                              placeholder="ej: Leer 30 minutos, Hacer ejercicio..."
                              required 
                              disabled={isSubmitting}
                          />
                      </div>
                      
                      {/* Descripción */}
                      <div className="space-y-2">
                          <label htmlFor="descripcion" className="block text-sm font-semibold text-gray-300">Descripción <span className="text-gray-500">(opcional)</span></label>
                          <textarea 
                              id="descripcion" 
                              value={newHabit.descripcion || ''} 
                              onChange={(e) => setNewHabit({...newHabit, descripcion: e.target.value})} 
                              className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-xl border border-gray-600/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 backdrop-blur-sm resize-none"
                              rows={3}
                              placeholder="Describe tu hábito y por qué es importante para ti..."
                              disabled={isSubmitting}
                          />
                      </div>
                      
                      {/* Tipo */}
                      <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-300">Tipo de seguimiento</label>
                          <div className="grid grid-cols-1 gap-3">
                              {[
                                  { value: 'SI_NO', label: 'Sí/No', desc: 'Hábito que se hace o no se hace', icon: CheckIcon, color: 'emerald' },
                                  { value: 'MEDIBLE_NUMERICO', label: 'Numérico', desc: 'Hábito con cantidad medible', icon: ChartBarIcon, color: 'purple' },
                                  { value: 'MAL_HABITO', label: 'Adicción', desc: 'Hábito que quieres superar', icon: NoSmokingIcon, color: 'red' }
                              ].map((option) => {
                                  const Icon = option.icon;
                                  const isSelected = newHabit.tipo === option.value;
                                  return (
                                      <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => setNewHabit({...newHabit, tipo: option.value as NewHabit['tipo']})}
                                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                                              isSelected
                                                  ? `border-${option.color}-500 bg-${option.color}-500/10`
                                                  : 'border-gray-600/50 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                                          }`}
                                          disabled={isSubmitting}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                  isSelected
                                                      ? `bg-${option.color}-500/20 border border-${option.color}-500/30`
                                                      : 'bg-gray-600/30 border border-gray-600/50'
                                              }`}>
                                                  <Icon className={`w-5 h-5 ${
                                                      isSelected ? `text-${option.color}-400` : 'text-gray-400'
                                                  }`} />
                                              </div>
                                              <div className="flex-1">
                                                  <h4 className={`font-semibold ${
                                                      isSelected ? 'text-white' : 'text-gray-300'
                                                  }`}>{option.label}</h4>
                                                  <p className="text-sm text-gray-400">{option.desc}</p>
                                              </div>
                                              {isSelected && (
                                                  <div className={`w-6 h-6 rounded-full bg-${option.color}-500 flex items-center justify-center`}>
                                                      <CheckIcon className="w-4 h-4 text-white" />
                                                  </div>
                                              )}
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                      
                      {/* Campo adicional para tipo numérico */}
                      {newHabit.tipo === 'MEDIBLE_NUMERICO' && (
                          <div className="space-y-2 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                              <label htmlFor="meta_objetivo" className="block text-sm font-semibold text-gray-300">Meta diaria <span className="text-gray-500">(opcional)</span></label>
                              <input 
                                  type="number" 
                                  id="meta_objetivo" 
                                  value={newHabit.meta_objetivo || ''} 
                                  onChange={(e) => setNewHabit({...newHabit, meta_objetivo: parseFloat(e.target.value)})} 
                                  className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-xl border border-gray-600/50 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 backdrop-blur-sm"
                                  placeholder="ej: 30, 10, 8..."
                                  disabled={isSubmitting}
                              />
                          </div>
                      )}
                      
                      {/* Botones */}
                      <div className="flex gap-4 pt-6">
                          <button 
                              type="button" 
                              onClick={onClose} 
                              className="flex-1 px-6 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 hover:text-white rounded-xl font-semibold transition-all duration-200 border border-gray-600/50 hover:border-gray-500"
                              disabled={isSubmitting}
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit" 
                              disabled={isSubmitting || !newHabit.nombre.trim()}
                              className="group relative flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none overflow-hidden"
                          >
                              <span className="flex items-center justify-center gap-2 relative z-10">
                                  {isSubmitting ? (
                                      <>
                                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                          Creando...
                                      </>
                                  ) : (
                                      <>
                                          <PlusIcon />
                                          Crear Hábito
                                      </>
                                  )}
                              </span>
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>
  );
};
