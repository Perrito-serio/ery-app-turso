// src/app/profile/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { EditProfileModal } from '@/components/EditProfileModal'; // Importar el modal

// Iconos para la sección de logros
const MedalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.052A9.75 9.75 0 0118.635 8.25H17.25a.75.75 0 000 1.5h3a.75.75 0 00.75-.75V6a.75.75 0 00-1.5 0v1.127a11.252 11.252 0 00-9.865-6.872.75.75 0 00-.61 1.031Zm-2.033 18.428a.75.75 0 001.071-1.052A9.75 9.75 0 015.365 15.75H6.75a.75.75 0 000-1.5h-3a.75.75 0 00-.75.75V18a.75.75 0 001.5 0v-1.127a11.252 11.252 0 009.865 6.872.75.75 0 00.61-1.031Z" clipRule="evenodd" /></svg>;

export default function ProfilePage() {
  const { data: session, status, update } = useSession(); // 'update' es la función para refrescar la sesión
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
        <MainLayout pageTitle="Mi Perfil">
            <div className="text-center">Cargando Perfil...</div>
        </MainLayout>
    );
  }

  if (!session?.user) {
    // Esto previene un flash de la página vacía mientras redirige
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
          onProfileUpdate={update} // Pasar la función 'update' de NextAuth al modal para refrescar los datos
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

          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Logros y Medallas</h3>
            <ul className="space-y-4">
              {/* Placeholders para logros */}
              <li className="flex items-center space-x-3 opacity-50">
                <MedalIcon />
                <div>
                  <h4 className="font-semibold text-gray-200">Madrugador</h4>
                  <p className="text-sm text-gray-400">Completa un hábito antes de las 8 AM.</p>
                </div>
              </li>
              <li className="flex items-center space-x-3 opacity-50">
                <MedalIcon />
                <div>
                  <h4 className="font-semibold text-gray-200">Racha de 7 Días</h4>
                  <p className="text-sm text-gray-400">Mantén una racha de 7 días en cualquier hábito.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Columna Derecha: Clasificación */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Clasificación (Ranking)</h3>
          {/* Placeholder para los tabs de ranking */}
          <div className="flex border-b border-gray-700 mb-4">
            <button className="px-4 py-2 text-indigo-400 border-b-2 border-indigo-400 font-semibold">Perú</button>
            <button className="px-4 py-2 text-gray-400 hover:text-white">Global</button>
          </div>
          <ul className="space-y-3">
            {/* Usuarios de ejemplo en el ranking */}
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
