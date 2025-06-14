// src/components/AuthStatus.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react'; // Importar de next-auth/react

export default function AuthStatus() {
  // Usamos el hook de NextAuth.js para obtener la sesión
  const { data: session, status } = useSession(); 
  // 'status' puede ser: "loading" | "authenticated" | "unauthenticated"
  const user = session?.user;

  if (status === "loading") {
    return (
      <div className="p-4 text-center text-gray-400">
        Cargando sesión...
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 shadow-md rounded-lg text-center">
      {user ? (
        // Si hay un usuario en la sesión de NextAuth.js
        <div className="space-y-3">
          <p className="text-lg text-white">
            Bienvenido, <span className="font-semibold">{user.name || user.email}</span>!
          </p>
          <img src={user.image || ''} alt="Foto de perfil" className="w-16 h-16 rounded-full mx-auto" />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })} // Usar signOut de NextAuth.js y redirigir a /login
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
          >
            Cerrar Sesión
          </button>
        </div>
      ) : (
        // Si no hay un usuario autenticado
        <div className="space-y-3">
          <p className="text-lg text-gray-300 mb-3">No has iniciado sesión.</p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full sm:w-auto px-4 py-2 bg-white text-gray-700 font-semibold rounded-md shadow flex items-center justify-center hover:bg-gray-200"
            >
              <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l0.007-0.007l6.19,5.238C39.902,36.068,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              Iniciar Sesión con Google
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow"
            >
              Login con Email
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
