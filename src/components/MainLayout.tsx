// src/components/MainLayout.tsx
'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

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
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:block`}>
        <div className="p-5 border-b border-gray-700">
          <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400">
            Ery
          </Link>
        </div>
        <nav className="mt-6 flex-1">
          {user && navLinks.map((link) => {
            const hasAccess = link.roles.some(role => userRoles.includes(role));
            if (!hasAccess) {
              return null;
            }
            return (
              <Link
                key={link.text}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ${isActive(link.href) ? 'bg-gray-700 text-white border-l-4 border-indigo-500' : ''}`}
              >
                <div className="flex items-center">
                  {link.icon}
                  {link.text}
                </div>
                {link.hasNotification && pendingInvitations > 0 && (
                  <div className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {pendingInvitations > 9 ? '9+' : pendingInvitations}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-gray-700 p-4">
          {user && (
            <div className="flex items-center mb-3">
              <img src={user.image || `https://ui-avatars.com/api/?name=${user.name || user.email}&background=random`} alt="Avatar" className="w-10 h-10 rounded-full mr-3" />
              <div>
                <p className="text-sm font-medium">{user.name || user.email}</p>
                <p className="text-xs text-gray-400">{userRoles.join(', ')}</p>
              </div>
            </div>
          )}
          {user && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600 hover:text-white rounded-md transition-colors duration-200 border border-red-500 hover:border-red-600"
            >
              <LogoutIcon />
              Cerrar Sesión
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-800 shadow-md md:shadow-none">
          <div className="flex items-center justify-between px-6 py-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-gray-300 focus:outline-none md:hidden"
              aria-label="Abrir menú"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-white">{pageTitle}</h1>
            <div className="flex items-center"></div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
