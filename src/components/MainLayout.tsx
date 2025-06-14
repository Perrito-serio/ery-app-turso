// src/components/MainLayout.tsx
'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

// --- Iconos ---
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0l8.954 8.955M2.25 12l8.954 8.955A1.5 1.5 0 0012.63 21V15.75A2.25 2.25 0 0114.88 13.5h0A2.25 2.25 0 0117.13 15.75V21a1.5 1.5 0 001.426-.955L21.75 12M2.25 12h19.5" />
  </svg>
);
// NUEVO: Ícono para el Dashboard del Usuario
const MyDashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0v-1.5m0 1.5v-1.5m0 1.5v3.75m0-3.75h1.5m-1.5 0h-1.5m-1.5 0v3.75m0-3.75h1.5m0 0h1.5m-1.5 0v-1.5m0 1.5v-1.5m-3.75-3v-1.5m0 1.5v-1.5" />
    </svg>
);
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const HabitsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);
const ProfileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);
// ---

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
  
  // Array de enlaces de navegación actualizado
  const navLinks = [
    // Enlaces para todos los roles
    { href: '/', text: 'Inicio', icon: <HomeIcon />, roles: ['administrador', 'usuario_estandar', 'moderador_contenido'] },
    { href: '/my-dashboard', text: 'Mi Dashboard', icon: <MyDashboardIcon />, roles: ['administrador', 'usuario_estandar', 'moderador_contenido'] },
    { href: '/profile', text: 'Mi Perfil', icon: <ProfileIcon />, roles: ['administrador', 'usuario_estandar', 'moderador_contenido'] },
    
    // Enlace para Usuario Estándar (y Administrador)
    { href: '/habits', text: 'Mis Hábitos', icon: <HabitsIcon />, roles: ['usuario_estandar', 'administrador'] },
    
    // Enlaces solo para Administrador
    { href: '/dashboard', text: 'Dashboard Admin', icon: <DashboardIcon />, roles: ['administrador'] },
    { href: '/admin/users', text: 'Gestión Usuarios', icon: <UsersIcon />, roles: ['administrador'] },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
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
                className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ${isActive(link.href) ? 'bg-gray-700 text-white border-l-4 border-indigo-500' : ''}`}
              >
                {link.icon}
                {link.text}
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

      {/* Contenido Principal (sin cambios) */}
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
