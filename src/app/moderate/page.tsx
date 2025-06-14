// src/app/moderate/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

export default function ModeratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const user = session?.user;

  // Roles que tienen acceso a esta página
  const allowedRoles = ['administrador', 'moderador_contenido'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <MainLayout pageTitle="Moderación">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-3xl font-bold">Cargando...</h1>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout pageTitle="Acceso no Autorizado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <p>Redirigiendo a inicio de sesión...</p>
        </div>
      </MainLayout>
    );
  }

  // Verificar si el usuario tiene alguno de los roles permitidos
  const canAccessPage = allowedRoles.some(role => user.roles?.includes(role));

  if (!canAccessPage) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos de moderador o administrador para ver esta sección.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow"
          >
            Volver a la Página Principal
          </button>
        </div>
      </MainLayout>
    );
  }

  // Si el usuario tiene el rol permitido, mostrar el contenido de la página de moderación
  return (
    <MainLayout pageTitle="Panel de Moderación">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Herramientas de Moderación</h2>
        <div className="text-gray-300">
          <p>
            Esta área está reservada para la gestión y moderación de contenido.
            (Funcionalidad a implementar).
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
