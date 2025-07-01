// src/app/profile/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { EditProfileModal } from '@/components/EditProfileModal';

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
const AchievementCard: React.FC<{ achievement: AchievementStatus }> = ({ achievement }) => (
  <li className={`flex items-center space-x-4 p-3 rounded-lg transition-all duration-300 ${achievement.unlocked ? 'bg-gray-700' : 'bg-gray-800 opacity-50 grayscale'}`}>
    <img src={achievement.icono_url || 'https://cdn-icons-png.flaticon.com/512/1611/1611388.png'} alt={achievement.nombre} className="w-12 h-12 rounded-md" />
    <div>
      <h4 className={`font-semibold ${achievement.unlocked ? 'text-yellow-400' : 'text-gray-400'}`}>{achievement.nombre}</h4>
      <p className="text-sm text-gray-400">{achievement.descripcion}</p>
    </div>
  </li>
);

// --- MODIFICACIÓN ---: Nuevo componente para mostrar la lista de rankings.
const RankingList: React.FC<{ rankings: RankingEntry[]; currentUserId: string; isLoading: boolean }> = ({ rankings, currentUserId, isLoading }) => {
  if (isLoading) {
    return <p className="text-center text-gray-400">Cargando ranking...</p>;
  }
  if (rankings.length === 0) {
    return <p className="text-center text-gray-400">No hay datos de ranking disponibles.</p>;
  }
  return (
    <ul className="space-y-3">
      {rankings.map((player, index) => (
        <li key={player.usuario_id} className={`flex justify-between items-center p-3 rounded-lg transition-colors ${String(player.usuario_id) === currentUserId ? 'bg-indigo-900/70' : 'hover:bg-gray-700'}`}>
          <div className="flex items-center">
            <span className="text-lg font-bold w-8 text-center">{index + 1}</span>
            <img src={player.foto_perfil_url || `https://ui-avatars.com/api/?name=${player.nombre}&background=random`} alt={player.nombre} className="w-10 h-10 rounded-full ml-2 mr-4" />
            <span className="font-medium text-white">{player.nombre}</span>
          </div>
          <span className="font-semibold text-lg text-orange-400">{player.valor} días</span>
        </li>
      ))}
    </ul>
  );
};


export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
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
    return <MainLayout pageTitle="Mi Perfil"><div className="text-center">Cargando Perfil...</div></MainLayout>;
  }

  if (!session?.user) {
    return <MainLayout pageTitle="Acceso no Autorizado"><div className="text-center">Redirigiendo a inicio de sesión...</div></MainLayout>;
  }
  
  const user = session.user;

  return (
    <MainLayout pageTitle="Mi Perfil">
      {isModalOpen && <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onProfileUpdate={update} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Perfil y Logros */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center">
            <img src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt="Avatar de usuario" className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-indigo-400" />
            <h2 className="text-2xl font-bold text-white">{user.name}</h2>
            <p className="text-md text-gray-400">{user.email}</p>
            <p className="text-sm text-gray-500 mt-2">ID: {user.id}</p>
            <button onClick={() => setIsModalOpen(true)} className="mt-6 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-transform hover:scale-105">
              Editar Perfil
            </button>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Logros y Medallas</h3>
            {isLoadingAchievements ? (
              <p className="text-gray-400">Cargando logros...</p>
            ) : (
              <ul className="space-y-4">
                {achievements.length > 0 ? (
                  achievements.map(ach => <AchievementCard key={ach.id} achievement={ach} />)
                ) : (
                  <p className="text-gray-400">Aún no hay logros disponibles.</p>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Columna Derecha: Clasificación (Ranking) */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Clasificación de Rachas</h3>
          {/* --- MODIFICACIÓN ---: Pestañas funcionales para el ranking. */}
          <div className="flex border-b border-gray-700 mb-4">
            <button onClick={() => setActiveRankingScope('country')} className={`px-4 py-2 font-semibold text-sm transition-colors ${activeRankingScope === 'country' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-white'}`}>
              Perú
            </button>
            <button onClick={() => setActiveRankingScope('global')} className={`px-4 py-2 font-semibold text-sm transition-colors ${activeRankingScope === 'global' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-white'}`}>
              Global
            </button>
          </div>
          <RankingList rankings={rankings} currentUserId={user.id} isLoading={isLoadingRankings} />
        </div>
      </div>
    </MainLayout>
  );
}
