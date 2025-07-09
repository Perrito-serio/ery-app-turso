// src/app/profile/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { EditProfileModal } from '@/components/EditProfileModal';

// Inyectar animaciones CSS
const injectAnimations = () => {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
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
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 10px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6), 0 0 30px rgba(99, 102, 241, 0.4); }
      }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
      .animate-slideInLeft { animation: slideInLeft 0.6s ease-out; }
      .animate-slideInRight { animation: slideInRight 0.6s ease-out; }
      .animate-pulse-custom { animation: pulse 2s infinite; }
      .animate-shimmer { animation: shimmer 2s infinite; }
      .animate-glow { animation: glow 2s infinite; }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }
};

// --- Interfaces ---
interface AchievementStatus {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  unlocked: boolean;
}

// --- MODIFICACIÓN ---: Nueva interfaz para los datos del ranking.
interface RankingEntry {
  usuario_id: number;
  nombre: string;
  foto_perfil_url: string | null;
  valor: number;
}

// --- Componentes de UI ---
const AchievementCard: React.FC<{ achievement: AchievementStatus; index: number }> = ({ achievement, index }) => (
  <li className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 transform hover:scale-105 animate-fadeInUp ${
    achievement.unlocked 
      ? 'bg-gray-700 border border-yellow-400 shadow-lg hover:shadow-xl hover:bg-gray-600' 
      : 'bg-gray-900 border border-gray-600 opacity-60 grayscale hover:opacity-80'
  }`} style={{animationDelay: `${index * 0.1}s`}}>
    <div className="relative">
      <img 
        src={achievement.icono_url || 'https://cdn-icons-png.flaticon.com/512/1611/1611388.png'} 
        alt={achievement.nombre} 
        className={`w-14 h-14 rounded-xl shadow-md transition-all duration-300 ${
          achievement.unlocked ? 'animate-glow' : ''
        }`} 
      />
      {achievement.unlocked && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-pulse-custom">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
    </div>
    <div className="flex-1">
      <h4 className={`font-bold text-lg mb-1 ${
        achievement.unlocked ? 'text-yellow-400' : 'text-gray-500'
      }`}>{achievement.nombre}</h4>
      <p className={`text-sm leading-relaxed ${
        achievement.unlocked ? 'text-gray-300' : 'text-gray-400'
      }`}>{achievement.descripcion}</p>
    </div>
  </li>
);

// --- MODIFICACIÓN ---: Nuevo componente para mostrar la lista de rankings.
const RankingList: React.FC<{ rankings: RankingEntry[]; currentUserId: string; isLoading: boolean }> = ({ rankings, currentUserId, isLoading }) => {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-indigo-400 mb-4"></div>
        <p className="text-gray-400 font-medium">Cargando ranking...</p>
      </div>
    );
  }
  if (rankings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">🏆</span>
        </div>
        <p className="text-gray-400 font-medium">No hay datos de ranking disponibles.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {rankings.map((player, index) => {
        const isCurrentUser = String(player.usuario_id) === currentUserId;
        const isTopThree = index < 3;
        const rankColors = {
          0: 'from-yellow-400 to-amber-500', // Oro
          1: 'from-gray-300 to-gray-400',   // Plata
          2: 'from-orange-400 to-orange-500' // Bronce
        };
        
        return (
          <li key={player.usuario_id} className={`flex justify-between items-center p-4 rounded-xl transition-all duration-300 transform hover:scale-102 animate-fadeInUp ${
            isCurrentUser 
              ? 'bg-indigo-900/70 border-2 border-indigo-400 shadow-lg animate-glow' 
              : 'bg-gray-700 border border-gray-600 hover:shadow-lg hover:bg-gray-600'
          }`} style={{animationDelay: `${index * 0.05}s`}}>
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${
                isTopThree 
                  ? `bg-gradient-to-br ${rankColors[index as keyof typeof rankColors]} animate-pulse-custom`
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }`}>
                {index + 1}
              </div>
              <div className="relative">
                <img 
                  src={player.foto_perfil_url || `https://ui-avatars.com/api/?name=${player.nombre}&background=random`} 
                  alt={player.nombre} 
                  className="w-12 h-12 rounded-full shadow-md border-2 border-gray-600" 
                />
                {isCurrentUser && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">★</span>
                  </div>
                )}
              </div>
              <div>
                <span className={`font-bold text-lg ${
                  isCurrentUser ? 'text-indigo-300' : 'text-white'
                }`}>{player.nombre}</span>
                {isCurrentUser && (
                  <p className="text-sm text-indigo-400 font-medium">¡Eres tú!</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className={`font-bold text-xl ${
                isTopThree ? 'text-orange-400' : 'text-gray-300'
              }`}>{player.valor}</span>
              <p className="text-sm text-gray-400 font-medium">días</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};


export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  // Inyectar animaciones al montar el componente
  useEffect(() => {
    const cleanup = injectAnimations();
    return cleanup;
  }, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  // --- MODIFICACIÓN ---: Nuevos estados para los rankings.
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(true);
  const [activeRankingScope, setActiveRankingScope] = useState<'global' | 'country'>('country');

  // Cargar todos los datos del perfil (logros y rankings)
  const fetchProfileData = useCallback(async () => {
    setIsLoadingAchievements(true);
    setIsLoadingRankings(true);
    try {
      // Usamos Promise.all para cargar ambos recursos en paralelo
      const [achievementsRes, rankingsRes] = await Promise.all([
        fetch('/api/achievements'),
        fetch(`/api/rankings?scope=${activeRankingScope}&countryCode=PE`) // Asumimos Perú para el scope de país
      ]);

      if (!achievementsRes.ok) throw new Error('No se pudieron cargar los logros.');
      if (!rankingsRes.ok) throw new Error('No se pudo cargar el ranking.');

      const achievementsData = await achievementsRes.json();
      const rankingsData = await rankingsRes.json();

      setAchievements(achievementsData.achievements || []);
      setRankings(rankingsData.rankings || []);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingAchievements(false);
      setIsLoadingRankings(false);
    }
  }, [activeRankingScope]); // Se vuelve a ejecutar si cambia el scope del ranking

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchProfileData();
    }
  }, [status, router, fetchProfileData]);

  if (status === 'loading') {
    return (
      <MainLayout pageTitle="Mi Perfil">
        <div className="text-center py-20 animate-fadeInUp">
          <div className="relative mb-6 inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-400 border-t-transparent absolute top-0 left-0 animate-glow"></div>
          </div>
          <div className="bg-gray-800 rounded-xl px-8 py-4 shadow-lg inline-block">
            <p className="text-white font-medium text-lg mb-2">Cargando perfil...</p>
            <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-shimmer" style={{backgroundSize: '200px 100%'}}></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!session?.user) {
    return (
      <MainLayout pageTitle="Acceso no Autorizado">
        <div className="text-center py-20 animate-fadeInUp">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-custom">
            <span className="text-white text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Acceso no autorizado</h2>
          <p className="text-gray-300 mb-6">Redirigiendo a inicio de sesión...</p>
        </div>
      </MainLayout>
    );
  }
  
  const user = session.user;

  return (
    <MainLayout pageTitle="Mi Perfil">
      {isModalOpen && <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onProfileUpdate={update} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Perfil y Logros */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center animate-slideInLeft">
            <div className="relative inline-block mb-6">
              <img 
                src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                alt="Avatar de usuario" 
                className="w-28 h-28 rounded-full border-4 border-indigo-400 shadow-lg animate-glow" 
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-gray-800 flex items-center justify-center animate-pulse-custom">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{user.name}</h2>
            <p className="text-lg text-gray-300 mb-1">{user.email}</p>
            <p className="text-sm text-gray-400 mb-6 px-3 py-1 bg-gray-700 rounded-full inline-block">ID: {user.id}</p>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              ✏️ Editar Perfil
            </button>
          </div>
          
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl animate-slideInLeft" style={{animationDelay: '0.2s'}}>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-sm">🏆</span>
              Logros y Medallas
            </h3>
            {isLoadingAchievements ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-indigo-400 mb-4"></div>
                <p className="text-gray-400 font-medium">Cargando logros...</p>
              </div>
            ) : (
              <ul className="space-y-4 max-h-96 overflow-y-auto">
                {achievements.length > 0 ? (
                  achievements.map((ach, index) => <AchievementCard key={ach.id} achievement={ach} index={index} />)
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-gray-400 text-2xl">🏆</span>
                    </div>
                    <p className="text-gray-400 font-medium">Aún no hay logros disponibles.</p>
                  </div>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Columna Derecha: Clasificación (Ranking) */}
        <div className="lg:col-span-2 bg-gray-800 p-8 rounded-2xl shadow-2xl animate-slideInRight">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-sm">🏅</span>
            Clasificación de Rachas
          </h3>
          
          {/* Pestañas mejoradas */}
          <div className="flex border-b border-gray-700 mb-6">
            <button 
              onClick={() => setActiveRankingScope('country')} 
              className={`px-6 py-3 font-bold text-sm transition-all duration-300 ${
                activeRankingScope === 'country' 
                  ? 'border-b-2 border-indigo-400 text-indigo-400 transform scale-105' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🇵🇪 Perú
            </button>
            <button 
              onClick={() => setActiveRankingScope('global')} 
              className={`px-6 py-3 font-bold text-sm transition-all duration-300 ${
                activeRankingScope === 'global' 
                  ? 'border-b-2 border-indigo-400 text-indigo-400 transform scale-105' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🌍 Global
            </button>
          </div>
          
          <RankingList rankings={rankings} currentUserId={user.id} isLoading={isLoadingRankings} />
        </div>
      </div>
    </MainLayout>
  );
}
