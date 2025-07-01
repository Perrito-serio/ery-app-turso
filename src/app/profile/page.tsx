// src/app/profile/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { EditProfileModal } from '@/components/EditProfileModal';

// --- MODIFICACIÓN ---: Nueva interfaz para el estado de los logros.
interface AchievementStatus {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  unlocked: boolean;
}

// --- Componente para mostrar un único logro ---
const AchievementCard: React.FC<{ achievement: AchievementStatus }> = ({ achievement }) => (
  <li className={`flex items-center space-x-4 p-3 rounded-lg transition-all duration-300 ${achievement.unlocked ? 'bg-gray-700' : 'bg-gray-800 opacity-50 grayscale'}`}>
    <img
      src={achievement.icono_url || 'https://cdn-icons-png.flaticon.com/512/1611/1611388.png'}
      alt={achievement.nombre}
      className="w-12 h-12 rounded-md"
    />
    <div>
      <h4 className={`font-semibold ${achievement.unlocked ? 'text-yellow-400' : 'text-gray-400'}`}>
        {achievement.nombre}
      </h4>
      <p className="text-sm text-gray-400">{achievement.descripcion}</p>
    </div>
  </li>
);


export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  // --- MODIFICACIÓN ---: Estados para manejar los logros.
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  // --- MODIFICACIÓN ---: Cargar los datos de los logros desde la API.
  const fetchAchievements = useCallback(async () => {
    setIsLoadingAchievements(true);
    try {
      const response = await fetch('/api/achievements');
      if (!response.ok) {
        throw new Error('No se pudieron cargar los logros.');
      }
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error(error);
      // Opcional: mostrar un error al usuario.
    } finally {
      setIsLoadingAchievements(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchAchievements();
    }
  }, [status, router, fetchAchievements]);

  if (status === 'loading') {
    return (
        <MainLayout pageTitle="Mi Perfil">
            <div className="text-center">Cargando Perfil...</div>
        </MainLayout>
    );
  }

  if (!session?.user) {
    return (
        <MainLayout pageTitle="Acceso no Autorizado">
            <div className="text-center">Redirigiendo a inicio de sesión...</div>
        </MainLayout>
    );
  }
  
  const user = session.user;

  return (
    <MainLayout pageTitle="Mi Perfil">
      {isModalOpen && (
        <EditProfileModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onProfileUpdate={update}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Perfil y Logros */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center">
            <img
              src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
              alt="Avatar de usuario"
              className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-indigo-400"
            />
            <h2 className="text-2xl font-bold text-white">{user.name}</h2>
            <p className="text-md text-gray-400">{user.email}</p>
            <p className="text-sm text-gray-500 mt-2">ID: {user.id}</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-transform hover:scale-105"
            >
              Editar Perfil
            </button>
          </div>

          {/* --- MODIFICACIÓN ---: Sección de logros dinámica. */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Logros y Medallas</h3>
            {isLoadingAchievements ? (
              <p className="text-gray-400">Cargando logros...</p>
            ) : (
              <ul className="space-y-4">
                {achievements.length > 0 ? (
                  achievements.map(ach => <AchievementCard key={ach.id} achievement={ach} />)
                ) : (
                  <p className="text-gray-400">Aún no hay logros disponibles. ¡Sigue esforzándote!</p>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Columna Derecha: Clasificación */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Clasificación (Ranking)</h3>
          <div className="flex border-b border-gray-700 mb-4">
            <button className="px-4 py-2 text-indigo-400 border-b-2 border-indigo-400 font-semibold">Perú</button>
            <button className="px-4 py-2 text-gray-400 hover:text-white">Global</button>
          </div>
          <ul className="space-y-3">
            <li className="flex justify-between items-center p-2 rounded"><span>1. Ana</span><span>15,200 pts</span></li>
            <li className="flex justify-between items-center p-2 rounded"><span>2. Luis</span><span>14,800 pts</span></li>
            <li className="flex justify-between items-center p-2 rounded"><span>3. Carla</span><span>13,900 pts</span></li>
            <li className="flex justify-between items-center p-2 rounded bg-indigo-900/50"><span>4. {user.name}</span><span>12,500 pts</span></li>
            <li className="flex justify-between items-center p-2 rounded"><span>5. Sofia</span><span>11,000 pts</span></li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
