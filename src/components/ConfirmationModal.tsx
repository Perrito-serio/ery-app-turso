// src/components/ConfirmationModal.tsx
'use client';

import React from 'react';

// Icono de advertencia SVG
const WarningIcon = () => (
  <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

// Icono de carga SVG
const LoadingIcon = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isConfirming?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-600/50 transform transition-all duration-300 scale-100 hover:scale-[1.02]">
        {/* Icono de advertencia */}
        <div className="text-center">
          <WarningIcon />
        </div>
        
        {/* Título */}
        <h3 className="text-2xl font-bold text-white text-center mb-3 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
          {title}
        </h3>
        
        {/* Mensaje */}
        <p className="text-gray-300 text-center mb-8 leading-relaxed px-2">
          {message}
        </p>
        
        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-6 py-3 bg-gray-600/80 hover:bg-gray-500/80 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-500/30 hover:border-gray-400/50 hover:shadow-lg"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25 border border-red-500/30 flex items-center justify-center"
          >
            {isConfirming && <LoadingIcon />}
            {isConfirming ? 'Eliminando...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
