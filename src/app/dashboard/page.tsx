// src/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // 1. Importar useSession de NextAuth
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

export default function DashboardPage() { 
  // 2. Usar useSession en lugar de useAuth
  const { data: session, status } = useSession();
  const router = useRouter();

  // El estado 'status' puede ser "loading", "authenticated", o "unauthenticated"
  const isLoading = status === 'loading';
  const user = session?.user;

  // 3. Adaptar el useEffect para que funcione con el estado de NextAuth
  useEffect(() => {
    // Si la sesión ha terminado de cargar y no está autenticada, redirigir a login
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 4. Adaptar la lógica de renderizado condicional

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

  // Si después de cargar, el usuario no está autenticado, useEffect lo redirigirá.
  // Mientras tanto, podemos mostrar un mensaje.
  if (!user) {
    return (
      <MainLayout pageTitle="Acceso no Autorizado">
          <div className="flex flex-col items-center justify-center text-center h-full">
              <p>Redirigiendo a inicio de sesión...</p>
          </div>
      </MainLayout>
    );
  }

  // Verificar si el usuario tiene el rol de administrador
  // Accedemos a los roles desde session.user.roles, que hemos configurado en el callback de NextAuth
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

  // Si el usuario está autenticado Y es administrador, mostrar el contenido del Dashboard
  return (
    <MainLayout pageTitle="Dashboard de Administración">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Control Principal</h1>
        <p className="text-lg text-gray-400">
          ¡Bienvenido, Administrador <span className="font-semibold">{user.name || user.email}</span>!
        </p>
      </div>
      <div className="w-full bg-gray-800 p-6 rounded-lg shadow-xl">
        {/* ... (Contenido del dashboard como lo teníamos antes) ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 p-4 rounded-md shadow">
              <h3 className="text-lg font-medium text-indigo-400 mb-2">Gestión de Usuarios</h3>
              <p className="text-gray-300">
                Ver, editar y gestionar cuentas de usuario.
              </p>
              <Link href="/admin/users" className="text-indigo-400 hover:underline mt-2 inline-block">Ir a Gestión de Usuarios</Link>
            </div>
            <div className="bg-gray-700 p-4 rounded-md shadow">
              <h3 className="text-lg font-medium text-green-400 mb-2">Estadísticas Globales</h3>
              <p className="text-gray-300">
                Visualizar estadísticas de uso de la aplicación. (Próximamente)
              </p>
            </div>
        </div>
      </div>
    </MainLayout>
  );
}
