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

  const canAccessPage = allowedRoles.some(role => user.roles?.includes(role));

  if (!canAccessPage) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos necesarios para ver esta sección.
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

  return (
    <MainLayout pageTitle="Panel de Moderación">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-2 text-white">¡Bienvenido, Moderador!</h2>
        <p className="text-gray-400 mb-6">Desde aquí puedes acceder a las herramientas para mantener la comunidad segura y ordenada.</p>
        
        {/* --- MODIFICACIÓN ---: Contenido actualizado con enlace a logros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-indigo-400 mb-2">Gestión de Usuarios</h3>
              <p className="text-gray-300">
                Ver, suspender o banear cuentas de usuarios estándar.
              </p>
              <Link href="/control/users" className="text-indigo-400 hover:underline mt-4 inline-block font-semibold">
                Ir a Gestión de Usuarios &rarr;
              </Link>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-yellow-400 mb-2">Gestión de Logros</h3>
              <p className="text-gray-300">
                Crear y editar las insignias que los usuarios pueden ganar.
              </p>
              <Link href="/admin/achievements" className="text-yellow-400 hover:underline mt-4 inline-block font-semibold">
                Ir a Gestión de Logros &rarr;
              </Link>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg shadow-md opacity-50">
              <h3 className="text-lg font-medium text-green-400 mb-2">Moderación de Contenido</h3>
              <p className="text-gray-300">
                Revisar y eliminar contenido inapropiado. (Próximamente)
              </p>
            </div>
        </div>
      </div>
    </MainLayout>
  );
}
