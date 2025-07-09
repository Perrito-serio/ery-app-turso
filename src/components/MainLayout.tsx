// src/components/MainLayout.tsx
'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

// Inyectar animaciones CSS
const injectSidebarAnimations = () => {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.5); }
        50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6); }
      }
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: 200px 0; }
      }
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes backgroundPulse {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      .animate-slideInLeft { animation: slideInLeft 0.6s ease-out; }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
      .animate-pulse-custom { animation: pulse 2s infinite; }
      .animate-glow { animation: glow 2s infinite; }
      .animate-shimmer { animation: shimmer 2s infinite; }
      .animate-bounceIn { animation: bounceIn 0.8s ease-out; }
      .animate-background-pulse { animation: backgroundPulse 3s ease-in-out infinite; }
      .sidebar-gradient {
        background: linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%);
        position: relative;
      }
      .sidebar-gradient::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 100%);
        pointer-events: none;
      }
      .nav-link-hover {
        position: relative;
        overflow: hidden;
      }
      .nav-link-hover::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
        transition: left 0.5s;
      }
      .nav-link-hover:hover::before {
        left: 100%;
      }
      .logo-glow {
        text-shadow: 0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3);
        transition: all 0.3s ease;
      }
      .logo-glow:hover {
        text-shadow: 0 0 15px rgba(99, 102, 241, 0.8), 0 0 25px rgba(99, 102, 241, 0.5), 0 0 35px rgba(99, 102, 241, 0.3);
        transform: scale(1.05);
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

// --- Iconos ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0l8.954 8.955M2.25 12l8.954 8.955A1.5 1.5 0 0012.63 21V15.75A2.25 2.25 0 0114.88 13.5h0A2.25 2.25 0 0117.13 15.75V21a1.5 1.5 0 001.426-.955L21.75 12M2.25 12h19.5" /></svg>;
const MyDashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0v-1.5m0 1.5v-1.5m0 1.5v3.75m0-3.75h1.5m-1.5 0h-1.5m-1.5 0v3.75m0-3.75h1.5m0 0h1.5m-1.5 0v-1.5m0 1.5v-1.5m-3.75-3v-1.5m0 1.5v-1.5" /></svg>;
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25-2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const HabitsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>;
const RoutinesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 01-9-9.75V5.625a1.875 1.875 0 011.875-1.875h16.25a1.875 1.875 0 011.875 1.875v3.375a9.75 9.75 0 01-9 9.75z" /></svg>;
const CompetitionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a9 9 0 01-9 0m9 0v-2.25a4.5 4.5 0 00-9 0v2.25m0-9a9 9 0 019 0v2.25" /></svg>;
const FriendsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>;


interface MainLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pageTitle = "Ery App" }) => {
  const { data: session } = useSession();
  const user = session?.user;
  const userRoles = session?.user?.roles || [];

  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Inyectar animaciones al montar el componente
  useEffect(() => {
    const cleanup = injectSidebarAnimations();
    setIsLoaded(true);
    return cleanup;
  }, []);

  // Cargar invitaciones pendientes
  useEffect(() => {
    const fetchPendingInvitations = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/friends/invitations');
        if (response.ok) {
            const data = await response.json();
            const received = data.received_invitations?.filter(
              (inv: any) => inv.estado === 'pendiente'
            ) || [];
            setPendingInvitations(received.length);
        }
      } catch (error) {
        // Silenciar errores para no afectar la UI
      }
    };

    fetchPendingInvitations();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchPendingInvitations, 30000);
    return () => clearInterval(interval);
  }, [user]);
  
  // --- MODIFICACIÓN ---: Se añade el enlace para "Gestionar Logros".
  const navLinks = [
    // Enlaces Generales
    { href: '/', text: 'Inicio', icon: <HomeIcon />, roles: ['administrador', 'usuario_estandar', 'moderador_contenido'] },
    { href: '/my-dashboard', text: 'Mi Dashboard', icon: <MyDashboardIcon />, roles: ['administrador', 'usuario_estandar', 'moderador_contenido'] },
    { href: '/profile', text: 'Mi Perfil', icon: <ProfileIcon />, roles: ['administrador', 'usuario_estandar', 'moderador_contenido'] },
    { href: '/habits', text: 'Mis Hábitos', icon: <HabitsIcon />, roles: ['usuario_estandar', 'administrador', 'moderador_contenido'] },
    { href: '/routines', text: 'Mis Rutinas', icon: <RoutinesIcon />, roles: ['usuario_estandar', 'administrador', 'moderador_contenido'] },
    { href: '/competitions', text: 'Competencias', icon: <CompetitionsIcon />, roles: ['usuario_estandar', 'administrador', 'moderador_contenido'] },
    { href: '/friends', text: 'Amigos', icon: <FriendsIcon />, roles: ['usuario_estandar', 'administrador', 'moderador_contenido'], hasNotification: true },
    
    // Paneles de Control Específicos
    { href: '/dashboard', text: 'Dashboard Admin', icon: <DashboardIcon />, roles: ['administrador'] },
    { href: '/moderate', text: 'Panel Moderación', icon: <ShieldIcon />, roles: ['moderador_contenido'] },
    
    // Herramientas de Gestión (Agrupadas)
    { href: '/admin/users', text: 'Gestión Usuarios', icon: <UsersIcon />, roles: ['administrador'] },
    { href: '/control/users', text: 'Moderar Usuarios', icon: <UsersIcon />, roles: ['moderador_contenido'] },
    { href: '/admin/achievements', text: 'Gestionar Logros', icon: <TrophyIcon />, roles: ['administrador', 'moderador_contenido'] },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Overlay para móviles */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 lg:w-64 md:w-56 sidebar-gradient shadow-2xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-500 ease-in-out lg:relative lg:translate-x-0 lg:block ${isLoaded ? 'animate-slideInLeft' : ''} backdrop-blur-sm border-r border-gray-700/50`}>
        <div className="p-4 lg:p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm animate-fadeInUp">
          <Link href="/" className="text-2xl lg:text-3xl font-bold text-white logo-glow hover:text-indigo-400 transition-all duration-300 block text-center">
            Ery
          </Link>
          <div className="mt-2 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-shimmer" style={{backgroundSize: '200px 100%'}}></div>
        </div>
        <nav className="mt-4 lg:mt-6 flex-1 px-2 lg:px-3 pb-20 lg:pb-0">
          {user && navLinks.map((link, index) => {
            const hasAccess = link.roles.some(role => userRoles.includes(role));
            if (!hasAccess) {
              return null;
            }
            return (
              <Link
                key={link.text}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center justify-between mx-1 lg:mx-2 my-1 px-3 lg:px-4 py-2.5 lg:py-3 text-gray-300 rounded-xl transition-all duration-300 transform hover:scale-105 nav-link-hover animate-fadeInUp ${
                  isActive(link.href) 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg animate-glow border border-indigo-400/50' 
                    : 'hover:bg-gradient-to-r hover:from-gray-700/80 hover:to-gray-600/80 hover:text-white hover:shadow-md'
                }`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="flex items-center relative z-10">
                  <div className={`transition-all duration-300 ${isActive(link.href) ? 'animate-pulse-custom' : 'group-hover:scale-110'}`}>
                    {link.icon}
                  </div>
                  <span className="font-medium text-sm lg:text-base">{link.text}</span>
                </div>
                {link.hasNotification && pendingInvitations > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full animate-bounceIn shadow-lg">
                    {pendingInvitations > 9 ? '9+' : pendingInvitations}
                  </div>
                )}
                {isActive(link.href) && (
                  <div className="absolute right-2 w-2 h-2 bg-white rounded-full animate-pulse-custom"></div>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-gray-700/50 p-3 lg:p-4 bg-gradient-to-t from-gray-900/90 to-transparent backdrop-blur-sm animate-fadeInUp">
          {user && (
            <div className="flex items-center mb-3 lg:mb-4 p-2.5 lg:p-3 bg-gradient-to-r from-gray-800/60 via-indigo-900/30 to-gray-700/60 rounded-xl border border-gray-600/30 backdrop-blur-sm animate-bounceIn animate-background-pulse" style={{backgroundSize: '200% 200%'}}>
              <div className="relative">
                <img 
                  src={user.image || `https://ui-avatars.com/api/?name=${user.name || user.email}&background=random`} 
                  alt="Avatar" 
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full mr-2.5 lg:mr-3 border-2 border-indigo-400/50 shadow-lg transition-all duration-300 hover:scale-110 hover:border-indigo-400" 
                />
                <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse-custom shadow-lg"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs lg:text-sm font-semibold text-white truncate">{user.name || user.email}</p>
                <p className="text-xs text-indigo-300 font-medium truncate">{userRoles.join(', ')}</p>
              </div>
            </div>
          )}
          {user && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center justify-center px-3 lg:px-4 py-2.5 lg:py-3 text-xs lg:text-sm font-semibold text-red-300 hover:text-white bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-300 border border-red-500/50 hover:border-red-400 transform hover:scale-105 hover:shadow-lg group"
            >
              <div className="transition-transform duration-300 group-hover:rotate-12">
                <LogoutIcon />
              </div>
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gradient-to-r from-gray-800 via-gray-850 to-gray-900 shadow-xl border-b border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-gray-300 hover:text-white focus:outline-none lg:hidden transition-all duration-300 transform hover:scale-110 hover:rotate-180 p-2 rounded-lg hover:bg-gray-700/50"
              aria-label="Abrir menú"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg lg:text-xl font-bold text-white bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent animate-fadeInUp truncate">{pageTitle}</h1>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-custom"></div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
