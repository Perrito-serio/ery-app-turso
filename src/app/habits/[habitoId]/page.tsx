'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';

// --- INTERFACES ---
interface HabitStats {
  racha_actual: number;
  mejor_racha: number;
  total_completados: number;
  tasa_exito_ultimo_mes: string;
}

interface HabitRecord {
  fecha_registro: string;
  valor_booleano: number | null;
  valor_numerico: number | null;
}

interface HabitDetail {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: string;
  stats: HabitStats;
  registros: HabitRecord[];
}

// --- COMPONENTE PRINCIPAL ---
export default function HabitDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const habitoId = params.habitoId as string;

  const [habit, setHabit] = useState<HabitDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redireccionar si no está autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Obtener datos del hábito
  useEffect(() => {
    const fetchHabitDetail = async () => {
      if (!habitoId || status !== 'authenticated') return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/habits/${habitoId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al cargar el hábito');
        }

        setHabit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabitDetail();
  }, [habitoId, status]);

  // Mostrar loading
  if (status === 'loading' || isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-white text-lg">Cargando...</div>
        </div>
      </MainLayout>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-700 text-white p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push('/habits')}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md transition-colors"
            >
              Volver a Hábitos
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Mostrar si no hay hábito
  if (!habit) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <h2 className="text-xl font-semibold mb-2">Hábito no encontrado</h2>
            <button
              onClick={() => router.push('/habits')}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors text-white"
            >
              Volver a Hábitos
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Función para obtener el color del tipo de hábito
  const getHabitTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'SI_NO':
        return 'bg-green-600';
      case 'MEDIBLE_NUMERICO':
        return 'bg-blue-600';
      case 'MAL_HABITO':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Función para obtener el texto del tipo de hábito
  const getHabitTypeText = (tipo: string) => {
    switch (tipo) {
      case 'SI_NO':
        return 'Hábito Sí/No';
      case 'MEDIBLE_NUMERICO':
        return 'Hábito Medible';
      case 'MAL_HABITO':
        return 'Mal Hábito';
      default:
        return tipo;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/habits')}
            className="mb-4 text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Hábitos
          </button>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{habit.nombre}</h1>
                {habit.descripcion && (
                  <p className="text-gray-300 mb-4">{habit.descripcion}</p>
                )}
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getHabitTypeColor(habit.tipo)}`}>
                    {getHabitTypeText(habit.tipo)}
                  </span>
                  {habit.meta_objetivo && (
                    <span className="text-gray-400 text-sm">
                      Meta: {habit.meta_objetivo}
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">
                    Creado: {new Date(habit.fecha_creacion).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Racha Actual"
            value={habit.stats.racha_actual}
            suffix={habit.tipo === 'MAL_HABITO' ? 'días sin recaer' : 'días consecutivos'}
            color="text-green-400"
            icon="🔥"
          />
          <StatCard
            title="Mejor Racha"
            value={habit.stats.mejor_racha}
            suffix={habit.tipo === 'MAL_HABITO' ? 'días sin recaer' : 'días consecutivos'}
            color="text-yellow-400"
            icon="🏆"
          />
          <StatCard
            title="Total Completados"
            value={habit.stats.total_completados}
            suffix="registros"
            color="text-blue-400"
            icon="📊"
          />
          <StatCard
            title="Éxito Último Mes"
            value={habit.stats.tasa_exito_ultimo_mes}
            suffix=""
            color="text-purple-400"
            icon="📈"
          />
        </div>

        {/* Actividad Reciente */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Actividad Reciente</h2>
          {habit.registros.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {habit.registros.slice(0, 20).map((registro, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">
                    {new Date(registro.fecha_registro).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {registro.valor_numerico !== null && (
                      <span className="text-blue-400 font-medium">
                        {registro.valor_numerico}
                      </span>
                    )}
                    <span className="text-green-400">✓</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p>No hay registros todavía.</p>
              <p className="text-sm mt-2">¡Empieza a registrar tu progreso desde la página principal!</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// --- COMPONENTE PARA TARJETAS DE ESTADÍSTICAS ---
interface StatCardProps {
  title: string;
  value: number | string;
  suffix: string;
  color: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, suffix, color, icon }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color} mb-1`}>
        {value}
      </div>
      <div className="text-gray-500 text-sm">{suffix}</div>
    </div>
  );
};