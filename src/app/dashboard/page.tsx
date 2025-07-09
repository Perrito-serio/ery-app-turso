// src/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Inyectar animaciones CSS para el dashboard
const injectDashboardAnimations = () => {
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
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: 200px 0; }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6), 0 0 30px rgba(99, 102, 241, 0.4); }
      }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
      .animate-slideInLeft { animation: slideInLeft 0.6s ease-out; }
      .animate-pulse-custom { animation: pulse 2s infinite; }
      .animate-shimmer { animation: shimmer 2s infinite; }
      .animate-glow { animation: glow 2s infinite; }
      .card-hover {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .card-hover::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s;
      }
      .card-hover:hover::before {
        left: 100%;
      }
      .gradient-text {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }
  return () => {};
};

export default function DashboardPage() { 
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const user = session?.user;

  // Inyectar animaciones al montar el componente
  useEffect(() => {
    const cleanup = injectDashboardAnimations();
    return cleanup;
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <MainLayout pageTitle="Dashboard">
        <div className="flex flex-col items-center justify-center text-center h-full animate-fadeInUp">
          <h1 className="text-3xl font-bold gradient-text mb-4">Cargando Dashboard...</h1>
          <div className="relative">
            <svg className="animate-spin h-12 w-12 text-indigo-400 animate-glow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="absolute inset-0 animate-pulse-custom">
              <div className="w-12 h-12 border-2 border-purple-400 rounded-full opacity-30"></div>
            </div>
          </div>
          <p className="text-gray-400 mt-4 animate-shimmer">Preparando tu panel de administración...</p>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout pageTitle="Acceso no Autorizado">
          <div className="flex flex-col items-center justify-center text-center h-full animate-fadeInUp">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 shadow-2xl">
                <div className="animate-pulse-custom mb-4">
                  <svg className="w-16 h-16 text-yellow-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <p className="text-xl text-gray-300 gradient-text">Redirigiendo a inicio de sesión...</p>
              </div>
          </div>
      </MainLayout>
    );
  }

  const hasAdminRole = user.roles?.includes('administrador');

  if (!hasAdminRole) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full animate-fadeInUp">
          <div className="bg-gradient-to-br from-red-900/30 to-gray-900 p-12 rounded-3xl border border-red-500/30 shadow-2xl backdrop-blur-sm animate-glow">
            <div className="animate-pulse-custom mb-6">
              <svg className="w-20 h-20 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-red-400 mb-6 animate-slideInLeft">Acceso Denegado</h1>
            <p className="text-xl text-gray-300 mb-8 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
              No tienes los permisos necesarios para ver esta página.
            </p>
            <Link href="/" className="inline-block mt-4 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fadeInUp" style={{animationDelay: '0.4s'}}>
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Volver a la Página Principal
              </span>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Dashboard de Administración">
      <div className="text-center mb-12 animate-fadeInUp">
        <div className="relative inline-block bg-gradient-to-br from-gray-800/60 via-gray-850/60 to-gray-900/60 px-12 py-8 rounded-3xl border border-gray-700/40 backdrop-blur-sm shadow-2xl">
          <h1 className="text-5xl font-bold mb-4 gradient-text animate-glow">
            Panel de Control Principal
          </h1>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-shimmer" style={{backgroundSize: '200% 100%'}}></div>
        </div>
        <p className="text-xl text-gray-300 mt-6 animate-slideInLeft" style={{animationDelay: '0.2s'}}>
          ¡Bienvenido, Administrador <span className="font-bold text-indigo-400 animate-pulse-custom">{user.name || user.email}</span>!
        </p>
        <div className="flex justify-center mt-4 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-4 py-2 rounded-full border border-green-500/30">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse-custom"></div>
            <span className="text-green-300 text-sm font-medium">Sistema Operativo</span>
          </div>
        </div>
      </div>
      
      <div className="w-full bg-gradient-to-br from-gray-800/80 via-gray-850/80 to-gray-900/80 p-8 rounded-3xl shadow-2xl border border-gray-700/50 backdrop-blur-sm animate-fadeInUp" style={{animationDelay: '0.3s'}}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <svg className="w-8 h-8 text-indigo-400 mr-3 animate-pulse-custom" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            Herramientas de Administración
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-shimmer" style={{backgroundSize: '200% 100%'}}></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-indigo-900/40 to-gray-800/60 p-8 rounded-2xl shadow-xl border border-indigo-500/30 card-hover transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slideInLeft" style={{animationDelay: '0.1s'}}>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl animate-pulse-custom">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-indigo-300 ml-4">Gestión de Usuarios</h3>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Ver, editar, cambiar roles y gestionar cuentas de usuario de manera eficiente.
              </p>
              <Link href="/admin/users" className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <span>Ir a Gestión de Usuarios</span>
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </Link>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-900/40 to-gray-800/60 p-8 rounded-2xl shadow-xl border border-yellow-500/30 card-hover transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slideInLeft" style={{animationDelay: '0.2s'}}>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl animate-pulse-custom">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-yellow-300 ml-4">Gestión de Logros</h3>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Crear y editar las insignias y condiciones de desbloqueo para motivar a los usuarios.
              </p>
              <Link href="/admin/achievements" className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <span>Ir a Gestión de Logros</span>
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </Link>
            </div>
            
            <div className="bg-gradient-to-br from-green-900/40 to-gray-800/60 p-8 rounded-2xl shadow-xl border border-green-500/30 card-hover transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slideInLeft" style={{animationDelay: '0.3s'}}>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl animate-pulse-custom">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-300 ml-4">Estadísticas Globales</h3>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Visualizar estadísticas semanales, rendimiento de usuarios y métricas de la aplicación.
              </p>
              <Link href="/admin/stats" className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <span>Ir a Estadísticas Globales</span>
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </Link>
            </div>
        </div>
        
        <div className="mt-12 p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl border border-gray-600/30 animate-fadeInUp" style={{animationDelay: '0.6s'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg animate-pulse-custom">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-white">Acceso Rápido</h4>
                <p className="text-gray-400 text-sm">Herramientas adicionales para administradores</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.open('https://vercel.com/perritoserios-projects/ery-app-turso/observability', '_blank')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Configuración
              </button>
              <button 
                onClick={() => window.open('https://vercel.com/perritoserios-projects/ery-app-turso/logs', '_blank')}
                className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Logs del Sistema
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
