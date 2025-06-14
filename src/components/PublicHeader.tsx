// src/components/PublicHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';

const PublicHeader: React.FC = () => {
  return (
    <header className="absolute top-0 left-0 w-full z-10">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="text-2xl font-bold text-white">
          <Link href="/" className="hover:text-indigo-400 transition-colors">
            Ery
          </Link>
        </div>

        {/* Botones de Navegación */}
        <nav className="flex items-center space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-lg transition-colors"
          >
            Registrarse
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;

