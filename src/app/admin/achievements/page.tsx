// src/app/admin/achievements/page.tsx
'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

// --- Función para inyectar animaciones CSS ---
const injectAnimations = () => {
  if (typeof document !== 'undefined' && !document.getElementById('achievements-animations')) {
    const style = document.createElement('style');
    style.id = 'achievements-animations';
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
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.5); }
        50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6); }
      }
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes pulse-custom {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
      .animate-slideInLeft { animation: slideInLeft 0.6s ease-out; }
      .animate-slideInRight { animation: slideInRight 0.6s ease-out; }
      .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      .animate-shimmer {
        background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
        background-size: 200px 100%;
        animation: shimmer 2s infinite;
      }
      .animate-glow { animation: glow 2s ease-in-out infinite; }
      .animate-bounceIn { animation: bounceIn 0.6s ease-out; }
      .animate-pulse-custom { animation: pulse-custom 2s ease-in-out infinite; }
      .gradient-border {
        background: linear-gradient(145deg, #1f2937, #374151);
        border: 1px solid transparent;
        background-clip: padding-box;
        position: relative;
      }
      .gradient-border::before {
        content: '';
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: -1;
        margin: -1px;
        border-radius: inherit;
        background: linear-gradient(145deg, #6366f1, #8b5cf6, #06b6d4);
      }
      .card-hover {
        transition: all 0.3s ease;
      }
      .card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
  }
};

// --- Iconos SVG ---
const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2L13 8l6 .75-4.12 4.62L16 19l-6-3-6 3 1.12-5.63L1 8.75 7 8l3-6z" clipRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const AchievementIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const CriteriaIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

// --- Interfaces ---
interface Achievement {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  criterio_id: number;
  valor_criterio: number;
  criterio_codigo: string;
  criterio_descripcion: string;
}

interface AchievementCriterion {
  id: number;
  criterio_codigo: string;
  descripcion: string;
}

interface NewAchievement {
  nombre: string;
  descripcion: string;
  icono_url: string;
  criterio_id: string; // Se maneja como string desde el select del form
  valor_criterio: string; // Se maneja como string desde el input del form
}

// --- Componente Principal ---
export default function ManageAchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [criteria, setCriteria] = useState<AchievementCriterion[]>([]);
  const [newAchievement, setNewAchievement] = useState<NewAchievement>({
    nombre: '',
    descripcion: '',
    icono_url: '',
    criterio_id: '',
    valor_criterio: '',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar datos iniciales (logros y criterios)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [achievementsRes, criteriaRes] = await Promise.all([
        fetch('/api/admin/achievements'),
        fetch('/api/admin/achievements/criteria'),
      ]);

      if (!achievementsRes.ok || !criteriaRes.ok) {
        throw new Error('No se pudieron cargar los datos necesarios.');
      }

      const achievementsData = await achievementsRes.json();
      const criteriaData = await criteriaRes.json();

      setAchievements(achievementsData.achievements || []);
      setCriteria(criteriaData.criteria || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    injectAnimations();
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAchievement(prev => ({ ...prev, [name]: value }));
  };

  // Manejador para crear un nuevo logro
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const body = {
        ...newAchievement,
        criterio_id: parseInt(newAchievement.criterio_id, 10),
        valor_criterio: parseInt(newAchievement.valor_criterio, 10),
      };

      const response = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.errors ? Object.values(data.errors).flat().join(' ') : data.message;
        throw new Error(errorMessage || 'Error al crear el logro.');
      }
      
      setSuccess('¡Logro creado exitosamente!');
      fetchData(); // Recargar la lista de logros
      // Resetear el formulario
      setNewAchievement({ nombre: '', descripcion: '', icono_url: '', criterio_id: '', valor_criterio: '' });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout pageTitle="Gestionar Logros">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="gradient-border card-hover p-8 rounded-xl animate-bounceIn">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3">
                <LoadingIcon />
                <AchievementIcon />
              </div>
              <h3 className="text-xl font-semibold text-white animate-pulse-custom">
                Cargando Logros
              </h3>
              <p className="text-gray-400 text-center">
                Obteniendo información de logros y criterios...
              </p>
              <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full animate-shimmer rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Gestionar Logros">
      {/* Encabezado Principal */}
      <div className="mb-8 animate-fadeInUp">
        <div className="gradient-border card-hover p-6 rounded-xl">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg animate-glow">
              <TrophyIcon />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Gestión de Logros
              </h1>
              <p className="text-gray-400">
                Administra los logros del sistema y define criterios de desbloqueo
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna del Formulario */}
        <div className="lg:col-span-1 animate-slideInLeft">
          <div className="gradient-border card-hover p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                <PlusIcon />
              </div>
              <h2 className="text-2xl font-semibold text-white">Crear Nuevo Logro</h2>
            </div>
            {error && (
              <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg mb-4 animate-bounceIn">
                <div className="flex items-center space-x-2">
                  <ExclamationIcon />
                  <span>{error}</span>
                </div>
              </div>
            )}
            {success && (
              <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg mb-4 animate-bounceIn">
                <div className="flex items-center space-x-2">
                  <AchievementIcon />
                  <span>{success}</span>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp">
              <div className="space-y-2">
                <label htmlFor="nombre" className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <TrophyIcon />
                  <span>Nombre del Logro</span>
                </label>
                <input 
                  type="text" 
                  name="nombre" 
                  value={newAchievement.nombre} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600" 
                  placeholder="Ej: Primer Logro"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="descripcion" className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <span>Descripción</span>
                </label>
                <textarea 
                  name="descripcion" 
                  value={newAchievement.descripcion} 
                  onChange={handleInputChange} 
                  rows={3} 
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600 resize-none" 
                  placeholder="Describe el logro y cómo obtenerlo..."
                  required 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="icono_url" className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>URL del Ícono</span>
                </label>
                <input 
                  type="url" 
                  name="icono_url" 
                  value={newAchievement.icono_url} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600" 
                  placeholder="https://ejemplo.com/icono.png"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="criterio_id" className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <CriteriaIcon />
                  <span>Criterio de Desbloqueo</span>
                </label>
                <select 
                  name="criterio_id" 
                  value={newAchievement.criterio_id} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600" 
                  required
                >
                  <option value="" disabled>Selecciona un criterio...</option>
                  {criteria.map(c => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="valor_criterio" className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span>Valor a Alcanzar</span>
                </label>
                <input 
                  type="number" 
                  name="valor_criterio" 
                  value={newAchievement.valor_criterio} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600" 
                  placeholder="Ej: 10"
                  min="1"
                  required 
                />
              </div>
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 animate-glow"
                >
                  <div className="flex items-center justify-center space-x-2">
                    {isSubmitting ? (
                      <>
                        <LoadingIcon />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon />
                        <span>Crear Logro</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Columna de la Tabla */}
        <div className="lg:col-span-2 animate-slideInRight">
          <div className="gradient-border card-hover p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <TrophyIcon />
              </div>
              <h2 className="text-2xl font-semibold text-white">Logros Existentes</h2>
              <div className="ml-auto px-3 py-1 bg-indigo-600 text-white text-sm rounded-full">
                {achievements.length} logros
              </div>
            </div>
            
            {achievements.length === 0 ? (
              <div className="text-center py-12 animate-fadeInUp">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-gray-700 rounded-full">
                    <TrophyIcon />
                  </div>
                  <h3 className="text-lg font-medium text-gray-400">
                    No hay logros creados
                  </h3>
                  <p className="text-gray-500">
                    Crea tu primer logro usando el formulario de la izquierda
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto animate-fadeInUp">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <TrophyIcon />
                          <span>Logro</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <CriteriaIcon />
                          <span>Criterio</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span>Valor</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Ícono
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {achievements.map((ach, index) => (
                      <tr 
                        key={ach.id} 
                        className="hover:bg-gray-700 transition-colors duration-200 animate-fadeInUp"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-white">
                              {ach.nombre}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {ach.descripcion}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span className="text-sm text-gray-300">
                              {ach.criterio_descripcion}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-green-600 to-green-700 text-white">
                            {ach.valor_criterio}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {ach.icono_url ? (
                            <img 
                              src={ach.icono_url} 
                              alt={`Ícono de ${ach.nombre}`}
                              className="w-8 h-8 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                              <TrophyIcon />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
