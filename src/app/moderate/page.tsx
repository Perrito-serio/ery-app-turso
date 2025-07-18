// src/app/moderate/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// Función para inyectar animaciones CSS
const injectAnimations = () => {
  if (typeof document !== 'undefined' && !document.getElementById('moderate-animations')) {
    const style = document.createElement('style');
    style.id = 'moderate-animations';
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      @keyframes shimmer {
        0% {
          background-position: -200px 0;
        }
        100% {
          background-position: calc(200px + 100%) 0;
        }
      }
      
      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6);
        }
      }
      
      @keyframes pulse-custom {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
      
      .animate-fadeInUp {
        animation: fadeInUp 0.6s ease-out forwards;
      }
      
      .animate-slideInLeft {
        animation: slideInLeft 0.6s ease-out forwards;
      }
      
      .animate-slideInRight {
        animation: slideInRight 0.6s ease-out forwards;
      }
      
      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      .animate-shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200px 100%;
        animation: shimmer 1.5s infinite;
      }
      
      .animate-bounceIn {
        animation: bounceIn 0.6s ease-out forwards;
      }
      
      .animate-glow {
        animation: glow 2s ease-in-out infinite;
      }
      
      .animate-pulse-custom {
        animation: pulse-custom 2s ease-in-out infinite;
      }
      
      .gradient-border {
        background: linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
        border: 1px solid;
        border-image: linear-gradient(145deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3)) 1;
      }
      
      .card-hover {
        transition: all 0.3s ease;
      }
      
      .card-hover:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
};

// Componentes de iconos SVG
const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

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

  useEffect(() => {
    injectAnimations();
  }, []);

  if (isLoading) {
    return (
      <MainLayout pageTitle="Moderación">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <div className="gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-pulse-custom text-indigo-400">
                <ShieldIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Cargando Panel de Moderación</h1>
            <p className="text-gray-400 mb-4">Preparando herramientas de moderación...</p>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="animate-shimmer h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            </div>
          </div>
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
          <div className="animate-bounceIn gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-center mb-6">
              <div className="text-red-400 animate-pulse-custom">
                <ExclamationIcon />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-red-400 mb-4">Acceso Denegado</h1>
            <p className="text-lg text-gray-300 mb-6">
              No tienes los permisos necesarios para acceder al panel de moderación.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              Se requieren permisos de <span className="text-indigo-400 font-semibold">administrador</span> o <span className="text-purple-400 font-semibold">moderador de contenido</span>.
            </p>
            <button
              onClick={() => router.push('/')}
              className="group relative px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <span className="flex items-center gap-2">
                <HomeIcon />
                Volver al Inicio
              </span>
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Panel de Moderación">
      {/* Encabezado Principal */}
      <div className="animate-slideInLeft gradient-border card-hover bg-gray-800 p-8 rounded-xl shadow-2xl mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-indigo-400 animate-glow">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Moderación</h1>
            <p className="text-indigo-400 font-medium">¡Bienvenido, {user?.name || 'Moderador'}!</p>
          </div>
        </div>
        <p className="text-gray-300 text-lg leading-relaxed">
          Desde aquí puedes acceder a las herramientas para mantener la comunidad segura y ordenada. 
          Gestiona usuarios, supervisa contenido y mantén un ambiente positivo para todos.
        </p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="animate-fadeInUp grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" style={{animationDelay: '0.2s'}}>
        <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-blue-400">
              <UsersIcon />
            </div>
            <h3 className="text-lg font-semibold text-white">Usuarios Activos</h3>
          </div>
          <p className="text-2xl font-bold text-blue-400">1,247</p>
          <p className="text-sm text-gray-400">En las últimas 24h</p>
        </div>
        
        <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-yellow-400">
              <TrophyIcon />
            </div>
            <h3 className="text-lg font-semibold text-white">Logros Otorgados</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-400">89</p>
          <p className="text-sm text-gray-400">Esta semana</p>
        </div>
        
        <div className="gradient-border card-hover bg-gray-800 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-green-400">
              <DocumentIcon />
            </div>
            <h3 className="text-lg font-semibold text-white">Reportes Pendientes</h3>
          </div>
          <p className="text-2xl font-bold text-green-400">3</p>
          <p className="text-sm text-gray-400">Requieren atención</p>
        </div>
      </div>

      {/* Herramientas de Moderación */}
      <div className="animate-slideInRight" style={{animationDelay: '0.4s'}}>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="text-purple-400">
            <ShieldIcon />
          </div>
          Herramientas de Moderación
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Gestión de Usuarios */}
           <div className="animate-fadeInUp gradient-border card-hover bg-gray-800 p-6 rounded-xl group" style={{animationDelay: '0.6s'}}>
             <div className="flex items-center gap-3 mb-4">
               <div className="text-indigo-400 group-hover:animate-pulse-custom transition-all duration-300">
                 <UsersIcon />
               </div>
               <h3 className="text-xl font-bold text-indigo-400">Gestión de Usuarios</h3>
             </div>
             <p className="text-gray-300 mb-6 leading-relaxed">
               Administra cuentas de usuarios, revisa perfiles, gestiona suspensiones y mantén la seguridad de la comunidad.
             </p>
             <div className="flex items-center justify-between">
               <div className="text-sm text-gray-400">
                 <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></span>
                 Sistema activo
               </div>
               <Link 
                 href="/control/users" 
                 className="group/link px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
               >
                 <span className="flex items-center gap-2">
                   Acceder
                   <svg className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </span>
               </Link>
             </div>
           </div>

           {/* Gestión de Logros */}
           <div className="animate-fadeInUp gradient-border card-hover bg-gray-800 p-6 rounded-xl group" style={{animationDelay: '0.8s'}}>
             <div className="flex items-center gap-3 mb-4">
               <div className="text-yellow-400 group-hover:animate-pulse-custom transition-all duration-300">
                 <TrophyIcon />
               </div>
               <h3 className="text-xl font-bold text-yellow-400">Gestión de Logros</h3>
             </div>
             <p className="text-gray-300 mb-6 leading-relaxed">
               Crea, edita y administra las insignias y logros que los usuarios pueden obtener por sus actividades.
             </p>
             <div className="flex items-center justify-between">
               <div className="text-sm text-gray-400">
                 <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></span>
                 89 logros activos
               </div>
               <Link 
                 href="/admin/achievements" 
                 className="group/link px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
               >
                 <span className="flex items-center gap-2">
                   Acceder
                   <svg className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </span>
               </Link>
             </div>
           </div>

           {/* Moderación de Contenido */}
           <div className="animate-fadeInUp gradient-border bg-gray-800 p-6 rounded-xl opacity-75 group" style={{animationDelay: '1s'}}>
             <div className="flex items-center gap-3 mb-4">
               <div className="text-green-400 opacity-60">
                 <DocumentIcon />
               </div>
               <h3 className="text-xl font-bold text-green-400 opacity-60">Moderación de Contenido</h3>
             </div>
             <p className="text-gray-400 mb-6 leading-relaxed">
               Herramientas para revisar, aprobar o eliminar contenido inapropiado reportado por la comunidad.
             </p>
             <div className="flex items-center justify-between">
               <div className="text-sm text-gray-500">
                 <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                 Próximamente
               </div>
               <div className="px-4 py-2 bg-gray-700 text-gray-400 font-semibold rounded-lg cursor-not-allowed">
                 En desarrollo
               </div>
             </div>
           </div>
         </div>
       </div>
    </MainLayout>
  );
}
