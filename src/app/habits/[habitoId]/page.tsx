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
          <div className="text-center animate-in fade-in duration-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-white text-lg font-medium">Cargando detalles del hábito...</div>
            <div className="text-gray-400 text-sm mt-2">Obteniendo tu progreso</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-2xl mb-6 shadow-2xl border border-red-500/30 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Error al cargar el hábito</h2>
            </div>
            <p className="text-red-100 mb-6">{error}</p>
            <button
              onClick={() => router.push('/habits')}
              className="px-6 py-3 bg-red-500 hover:bg-red-400 rounded-lg transition-all duration-300 font-semibold hover:scale-105 transform shadow-lg"
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
          <div className="text-center text-gray-400 animate-in slide-in-from-bottom duration-700">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Hábito no encontrado</h2>
            <p className="text-gray-400 mb-6">El hábito que buscas no existe o no tienes permisos para verlo.</p>
            <button
              onClick={() => router.push('/habits')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg transition-all duration-300 text-white font-semibold hover:scale-105 transform shadow-lg"
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
        {/* Header Mejorado */}
        <div className="mb-8 animate-in slide-in-from-top duration-700">
          <button
            onClick={() => router.push('/habits')}
            className="mb-6 text-indigo-400 hover:text-indigo-300 transition-all duration-300 flex items-center gap-2 hover:translate-x-1 transform group"
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Volver a Hábitos</span>
          </button>
          
          <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden relative">
            {/* Efecto de fondo animado */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 opacity-50"></div>
            
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {habit.nombre}
                  </h1>
                  {habit.descripcion && (
                    <p className="text-gray-300 mb-6 text-lg leading-relaxed">{habit.descripcion}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={`px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg ${getHabitTypeColor(habit.tipo)} hover:scale-105 transition-transform duration-300`}>
                      {getHabitTypeText(habit.tipo)}
                    </span>
                    {habit.meta_objetivo && (
                      <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-full">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300 text-sm font-medium">
                          Meta: <span className="text-yellow-400 font-semibold">{habit.meta_objetivo}</span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-full">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300 text-sm font-medium">
                        Creado: <span className="text-blue-400 font-semibold">{new Date(habit.fecha_creacion).toLocaleDateString('es-ES')}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Icono decorativo */}
                <div className="hidden lg:block ml-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">
                      {habit.tipo === 'SI_NO' ? '✅' : habit.tipo === 'MEDIBLE_NUMERICO' ? '📊' : '🚫'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas Mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="animate-in slide-in-from-left duration-700" style={{animationDelay: '100ms'}}>
            <StatCard
              title="Racha Actual"
              value={habit.stats.racha_actual}
              suffix={habit.tipo === 'MAL_HABITO' ? 'días sin recaer' : 'días consecutivos'}
              color="text-green-400"
              icon="🔥"
            />
          </div>
          <div className="animate-in slide-in-from-left duration-700" style={{animationDelay: '200ms'}}>
            <StatCard
              title="Mejor Racha"
              value={habit.stats.mejor_racha}
              suffix={habit.tipo === 'MAL_HABITO' ? 'días sin recaer' : 'días consecutivos'}
              color="text-yellow-400"
              icon="🏆"
            />
          </div>
          <div className="animate-in slide-in-from-left duration-700" style={{animationDelay: '300ms'}}>
            <StatCard
              title="Total Completados"
              value={habit.stats.total_completados}
              suffix="registros"
              color="text-blue-400"
              icon="📊"
            />
          </div>
          <div className="animate-in slide-in-from-left duration-700" style={{animationDelay: '400ms'}}>
            <StatCard
              title="Éxito Último Mes"
              value={habit.stats.tasa_exito_ultimo_mes}
              suffix=""
              color="text-purple-400"
              icon="📈"
            />
          </div>
        </div>

        {/* Actividad Reciente Mejorada */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom duration-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Actividad Reciente
            </h2>
          </div>
          
          {habit.registros.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {habit.registros.slice(0, 20).map((registro, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-xl border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group animate-in fade-in slide-in-from-left duration-500"
                  style={{animationDelay: `${index * 50}ms`}}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <span className="text-3xl transform group-hover:scale-110 transition-transform duration-300">
                        ✅
                      </span>
                      <div className="absolute -inset-1 bg-green-400/20 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg group-hover:text-indigo-300 transition-colors duration-300">
                        {new Date(registro.fecha_registro).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {registro.valor_numerico !== null && (
                      <div className="bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
                        <span className="text-indigo-400 font-bold text-lg">
                          {registro.valor_numerico}
                        </span>
                      </div>
                    )}
                    <div className="text-gray-500 text-sm font-medium">
                      {new Date(registro.fecha_registro).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">No hay registros todavía.</p>
              <p className="text-gray-500 text-sm mt-2">¡Empieza a registrar tu progreso desde la página principal!</p>
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
    <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl group relative overflow-hidden">
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-400 text-sm font-semibold tracking-wide uppercase">{title}</h3>
          <div className="text-2xl transform group-hover:scale-110 transition-transform duration-300 group-hover:rotate-12">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${color} group-hover:text-white transition-colors duration-300`}>
            {value}
          </span>
          {suffix && (
            <span className="text-gray-500 text-sm font-medium group-hover:text-gray-400 transition-colors duration-300">
              {suffix}
            </span>
          )}
        </div>
        

      </div>
    </div>
  );
};