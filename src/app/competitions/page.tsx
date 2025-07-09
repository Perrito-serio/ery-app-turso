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
        <div className="flex items-center justify-center h-64 animate-fade-in">
          <div className="text-center p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-300 text-lg font-medium">Debes iniciar sesión para ver las competencias</p>
            <p className="text-gray-400 text-sm mt-2">Accede a tu cuenta para competir con tus amigos</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Competencias">
      <div className="max-w-7xl mx-auto">
        {/* Header con navegación */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-2xl border border-gray-700/50 backdrop-blur-sm shadow-2xl">
            <div className="animate-slide-in-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse-slow">
                  <svg className="w-6 h-6 text-white animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Competencias</h1>
              </div>
              <p className="text-gray-400 ml-13">Compite con tus amigos y mejora tus hábitos</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="group relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-indigo-500/25 hover:scale-105 animate-slide-in-right overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Competencia
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 animate-slide-in-up">
          <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            {[
              { key: 'all', label: 'Todas', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { key: 'active', label: 'Activas', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { key: 'finished', label: 'Finalizadas', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
            ].map((filterOption, index) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`group relative px-5 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 animate-fade-in ${
                  filter === filterOption.key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:text-white border border-gray-600/50 hover:border-gray-500'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={filterOption.icon} />
                </svg>
                {filterOption.label}
                {filter === filterOption.key && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-xl animate-shimmer"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de competencias */}
        {loading ? (
          <div className="flex items-center justify-center h-64 animate-fade-in">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-indigo-500 border-r-purple-500 absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-gray-400 font-medium">Cargando competencias...</p>
            </div>
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="max-w-md mx-auto p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                <svg className="w-10 h-10 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No hay competencias</h3>
              <p className="text-gray-400 mb-6">
                {filter === 'all' ? 'Aún no has participado en ninguna competencia.' : 
                 filter === 'active' ? 'No tienes competencias activas.' : 
                 'No tienes competencias finalizadas.'}
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear tu primera competencia
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {competitions.map((competition, index) => {
              const daysRemaining = getDaysRemaining(competition.fecha_fin);
              const isActive = competition.estado === 'activa';
              
              return (
                <div 
                  key={competition.id} 
                  className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-6 border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-sm animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  {/* Icono decorativo */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                    <svg className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-12">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2 group-hover:from-indigo-200 group-hover:to-purple-200 transition-all duration-300">{competition.nombre}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 group-hover:text-gray-300 transition-colors duration-300">{competition.descripcion || 'Sin descripción'}</p>
                    </div>
                    <span className={`${getStatusBadge(competition.estado)} group-hover:scale-110 transition-transform duration-300`}>
                      {competition.estado}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 p-2 rounded-lg bg-gray-700/30 group-hover:bg-gray-600/30">
                      <div className="w-6 h-6 mr-3 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="font-medium">{getCompetitionTypeLabel(competition.tipo_meta)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 p-2 rounded-lg bg-gray-700/30 group-hover:bg-gray-600/30">
                      <div className="w-6 h-6 mr-3 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-medium">{formatDate(competition.fecha_inicio)} - {formatDate(competition.fecha_fin)}</span>
                    </div>
                    
                    {isActive && (
                      <div className="flex items-center text-sm text-green-400 group-hover:text-green-300 transition-colors duration-300 p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 border border-green-500/20">
                        <div className="w-6 h-6 mr-3 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="font-medium">{daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Último día'}</span>
                      </div>
                    )}
                    
                    {competition.participantes_count && (
                      <div className="flex items-center text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 p-2 rounded-lg bg-gray-700/30 group-hover:bg-gray-600/30">
                        <div className="w-6 h-6 mr-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                        </div>
                        <span className="font-medium">{competition.participantes_count} participantes</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      href={`/competitions/${competition.id}`}
                      className="group flex-1 relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-center py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Detalles
                      </span>
                    </Link>
                    {competition.is_creator && (
                      <Link
                        href={`/competitions/${competition.id}/manage`}
                        className="group relative bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-gray-500/25 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <span className="relative flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Gestionar
                        </span>
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
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 backdrop-blur-md animate-fade-in">
            <div className="relative bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-700/50 shadow-2xl backdrop-blur-sm animate-scale-in">
              {/* Fondo decorativo */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 rounded-2xl"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Nueva Competencia</h2>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="group p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-110"
                  >
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              
                <form onSubmit={handleCreateCompetition} className="space-y-5">
                  <div className="animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.nombre}
                      onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                      className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 backdrop-blur-sm"
                      placeholder="Nombre de la competencia"
                    />
                  </div>
                  
                  <div className="animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      Descripción
                    </label>
                    <textarea
                      value={createForm.descripcion}
                      onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                      className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 backdrop-blur-sm resize-none"
                      placeholder="Descripción opcional"
                      rows={3}
                    />
                  </div>
                  
                  <div className="animate-slide-in-up" style={{ animationDelay: '300ms' }}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Tipo de Meta
                    </label>
                    <select
                      value={createForm.tipo_meta}
                      onChange={(e) => setCreateForm({ ...createForm, tipo_meta: e.target.value as any })}
                      className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 backdrop-blur-sm"
                    >
                      <option value="MAX_HABITOS_DIA">Máximo hábitos por día</option>
                      <option value="MAX_RACHA">Racha más larga</option>
                      <option value="TOTAL_COMPLETADOS">Total completados</option>
                    </select>
                  </div>
                
                  <div className="grid grid-cols-2 gap-4 animate-slide-in-up" style={{ animationDelay: '400ms' }}>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        required
                        value={createForm.fecha_inicio}
                        onChange={(e) => setCreateForm({ ...createForm, fecha_inicio: e.target.value })}
                        className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 backdrop-blur-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        required
                        value={createForm.fecha_fin}
                        onChange={(e) => setCreateForm({ ...createForm, fecha_fin: e.target.value })}
                        className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-300 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                
                  <div className="animate-slide-in-up" style={{ animationDelay: '500ms' }}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Meta Objetivo
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-300 backdrop-blur-sm"
                      value={createForm.meta_objetivo}
                      onChange={(e) => setCreateForm({ ...createForm, meta_objetivo: parseInt(e.target.value) || 1 })}
                      placeholder="Ej: 5 hábitos por día, 30 días de racha, 100 hábitos totales"
                    />
                    <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-700/30 rounded-lg border border-gray-600/30">
                      {createForm.tipo_meta === 'MAX_HABITOS_DIA' && '🎯 Número máximo de hábitos por día'}
                      {createForm.tipo_meta === 'MAX_RACHA' && '🔥 Días consecutivos de racha objetivo'}
                      {createForm.tipo_meta === 'TOTAL_COMPLETADOS' && '📊 Total de hábitos a completar'}
                    </p>
                  </div>
                  
                  <div className="animate-slide-in-up" style={{ animationDelay: '600ms' }}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Valor por Punto
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 backdrop-blur-sm"
                      value={createForm.valor}
                      onChange={(e) => setCreateForm({ ...createForm, valor: parseFloat(e.target.value) || 1 })}
                      placeholder="Ej: 1.0, 2.5, 10.0"
                    />
                    <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-700/30 rounded-lg border border-gray-600/30">💎 Puntos otorgados por cada logro conseguido</p>
                  </div>

                  
                  <div className="flex gap-3 pt-6 animate-slide-in-up" style={{ animationDelay: '700ms' }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="group flex-1 relative bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-gray-500/25 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </span>
                    </button>
                    <button
                      type="submit"
                      className="group flex-1 relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Crear Competencia
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CompetitionsPage;