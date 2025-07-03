'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Interfaces basadas en las APIs existentes
interface Competition {
  id: number;
  creador_id: number;
  nombre: string;
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  fecha_creacion: string;
  participantes_count?: number;
  is_creator?: boolean;
  is_participant?: boolean;
}

interface CreateCompetitionForm {
  nombre: string;
  descripcion: string;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  meta_objetivo: number;
  valor: number;
  invitados: string[];
}

const CompetitionsPage: React.FC = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Estado del formulario de creación
  const [createForm, setCreateForm] = useState<CreateCompetitionForm>({
    nombre: '',
    descripcion: '',
    tipo_meta: 'MAX_HABITOS_DIA',
    fecha_inicio: '',
    fecha_fin: '',
    meta_objetivo: 1,
    valor: 1,
    invitados: []
  });

  // Cargar competencias del usuario
  useEffect(() => {
    fetchCompetitions();
  }, [filter]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const statusParam = filter === 'active' ? 'activa' : filter === 'finished' ? 'finalizada' : '';
      const url = `/api/competitions/my${statusParam ? `?status=${statusParam}&include_stats=true` : '?include_stats=true'}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Datos recibidos de la API:', data);
        
        // Mapear los datos de la API al formato esperado por el frontend
        const mappedCompetitions = (data.competitions || []).map((comp: any) => {
          console.log('Mapeando competencia:', comp);
          return {
            id: comp.id,
            creador_id: comp.is_creator ? parseInt(session?.user?.id || '0') : 0,
            nombre: comp.name,
            descripcion: comp.description,
            tipo_meta: comp.type === 'Máximo hábitos por día' ? 'MAX_HABITOS_DIA' : 
                       comp.type === 'Racha más larga' ? 'MAX_RACHA' : 'TOTAL_COMPLETADOS',
            fecha_inicio: comp.start_date,
            fecha_fin: comp.end_date,
            estado: comp.status === 'Activa' ? 'activa' : 
                    comp.status === 'Finalizada' ? 'finalizada' : 'cancelada',
            fecha_creacion: comp.created_at,
            participantes_count: comp.participant_count,
            is_creator: comp.is_creator,
            is_participant: !comp.is_creator
          };
        });
        
        console.log('Competencias mapeadas:', mappedCompetitions);
        setCompetitions(mappedCompetitions);
      }
    } catch (error) {
      console.error('Error al cargar competencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Iniciando creación de competencia:', createForm);
    
    try {
      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Competencia creada exitosamente:', data);
        
        setShowCreateForm(false);
        setCreateForm({
          nombre: '',
          descripcion: '',
          tipo_meta: 'MAX_HABITOS_DIA',
          fecha_inicio: '',
          fecha_fin: '',
          invitados: [],
          meta_objetivo: 1,
          valor: 1
        });
        
        // Recargar competencias
        await fetchCompetitions();
        
        // Cambiar a la pestaña de dashboard para ver la nueva competencia
        setActiveTab('dashboard');
      } else {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        alert(`Error al crear la competencia: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al crear competencia:', error);
      alert('Error de conexión al crear la competencia. Por favor, intenta de nuevo.');
    }
  };

  const getCompetitionTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'MAX_HABITOS_DIA': return 'Máximo hábitos por día';
      case 'MAX_RACHA': return 'Racha más larga';
      case 'TOTAL_COMPLETADOS': return 'Total completados';
      default: return tipo;
    }
  };

  const getStatusBadge = (estado: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (estado) {
      case 'activa':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'finalizada':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case 'cancelada':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Fecha no disponible';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', dateString, error);
      return 'Fecha inválida';
    }
  };

  const getDaysRemaining = (fechaFin: string) => {
    if (!fechaFin) return 0;
    
    try {
      const today = new Date();
      const endDate = new Date(fechaFin);
      
      if (isNaN(endDate.getTime())) {
        return 0;
      }
      
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Error al calcular días restantes:', fechaFin, error);
      return 0;
    }
  };

  if (!session) {
    return (
      <MainLayout pageTitle="Competencias">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Debes iniciar sesión para ver las competencias.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Competencias">
      <div className="max-w-7xl mx-auto">
        {/* Header con navegación */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Competencias</h1>
              <p className="text-gray-400 mt-1">Compite con tus amigos y mejora tus hábitos</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Competencia
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'active', label: 'Activas' },
              { key: 'finished', label: 'Finalizadas' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  filter === filterOption.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de competencias */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">No hay competencias</h3>
            <p className="mt-1 text-sm text-gray-400">
              {filter === 'all' ? 'Aún no has participado en ninguna competencia.' : 
               filter === 'active' ? 'No tienes competencias activas.' : 
               'No tienes competencias finalizadas.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Crear tu primera competencia
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {competitions.map((competition) => {
              const daysRemaining = getDaysRemaining(competition.fecha_fin);
              const isActive = competition.estado === 'activa';
              
              return (
                <div key={competition.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{competition.nombre}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{competition.descripcion || 'Sin descripción'}</p>
                    </div>
                    <span className={getStatusBadge(competition.estado)}>
                      {competition.estado}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-300">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {getCompetitionTypeLabel(competition.tipo_meta)}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-300">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(competition.fecha_inicio)} - {formatDate(competition.fecha_fin)}
                    </div>
                    
                    {isActive && (
                      <div className="flex items-center text-sm text-green-400">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Último día'}
                      </div>
                    )}
                    
                    {competition.participantes_count && (
                      <div className="flex items-center text-sm text-gray-300">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        {competition.participantes_count} participantes
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      href={`/competitions/${competition.id}`}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                    >
                      Ver Detalles
                    </Link>
                    {competition.is_creator && (
                      <Link
                        href={`/competitions/${competition.id}/manage`}
                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                      >
                        Gestionar
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de crear competencia */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Nueva Competencia</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateCompetition} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Nombre de la competencia"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                  <textarea
                    value={createForm.descripcion}
                    onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Descripción opcional"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Meta</label>
                  <select
                    value={createForm.tipo_meta}
                    onChange={(e) => setCreateForm({ ...createForm, tipo_meta: e.target.value as any })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MAX_HABITOS_DIA">Máximo hábitos por día</option>
                    <option value="MAX_RACHA">Racha más larga</option>
                    <option value="TOTAL_COMPLETADOS">Total completados</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Inicio</label>
                    <input
                      type="date"
                      required
                      value={createForm.fecha_inicio}
                      onChange={(e) => setCreateForm({ ...createForm, fecha_inicio: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Fin</label>
                    <input
                      type="date"
                      required
                      value={createForm.fecha_fin}
                      onChange={(e) => setCreateForm({ ...createForm, fecha_fin: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Meta Objetivo</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    value={createForm.meta_objetivo}
                    onChange={(e) => setCreateForm({ ...createForm, meta_objetivo: parseInt(e.target.value) || 1 })}
                    placeholder="Ej: 5 hábitos por día, 30 días de racha, 100 hábitos totales"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {createForm.tipo_meta === 'MAX_HABITOS_DIA' && 'Número máximo de hábitos por día'}
                    {createForm.tipo_meta === 'MAX_RACHA' && 'Días consecutivos de racha objetivo'}
                    {createForm.tipo_meta === 'TOTAL_COMPLETADOS' && 'Total de hábitos a completar'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Valor por Punto</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    value={createForm.valor}
                    onChange={(e) => setCreateForm({ ...createForm, valor: parseFloat(e.target.value) || 1 })}
                    placeholder="Ej: 1.0, 2.5, 10.0"
                  />
                  <p className="text-xs text-gray-400 mt-1">Puntos otorgados por cada logro conseguido</p>
                </div>

                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CompetitionsPage;