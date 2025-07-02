// src/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

export default function DashboardPage() { 
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const user = session?.user;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <MainLayout pageTitle="Dashboard">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-3xl font-bold">Cargando...</h1>
          <svg className="animate-spin h-8 w-8 text-white mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
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

  const hasAdminRole = user.roles?.includes('administrador');

  if (!hasAdminRole) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos necesarios para ver esta página.
          </p>
          <Link href="/" className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow">
            Volver a la Página Principal
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Dashboard de Administración">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Control Principal</h1>
        <p className="text-lg text-gray-400">
          ¡Bienvenido, Administrador <span className="font-semibold">{user.name || user.email}</span>!
        </p>
      </div>
      <div className="w-full bg-gray-800 p-6 rounded-lg shadow-xl">
        {/* --- MODIFICACIÓN ---: Contenido actualizado con enlace a logros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-indigo-400 mb-2">Gestión de Usuarios</h3>
              <p className="text-gray-300">
                Ver, editar, cambiar roles y gestionar cuentas de usuario.
              </p>
              <Link href="/admin/users" className="text-indigo-400 hover:underline mt-4 inline-block font-semibold">Ir a Gestión de Usuarios &rarr;</Link>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-yellow-400 mb-2">Gestión de Logros</h3>
              <p className="text-gray-300">
                Crear y editar las insignias y condiciones de desbloqueo.
              </p>
              <Link href="/admin/achievements" className="text-yellow-400 hover:underline mt-4 inline-block font-semibold">Ir a Gestión de Logros &rarr;</Link>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-green-400 mb-2">Estadísticas Globales</h3>
              <p className="text-gray-300">
                Visualizar estadísticas semanales, rendimiento de usuarios y métricas de la aplicación.
              </p>
              <Link href="/admin/stats" className="text-green-400 hover:underline mt-4 inline-block font-semibold">Ir a Estadísticas Globales &rarr;</Link>
            </div>
        </div>
      </div>
    </MainLayout>
  );
}
