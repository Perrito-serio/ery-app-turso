// src/components/EditProfileModal.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import { z } from 'zod';
import { useSession } from 'next-auth/react';

// Esquema de validación con Zod, actualizado para solo validar la contraseña
const editProfileSchema = z.object({
  contraseñaActual: z.string().min(1, "Se requiere la contraseña actual."),
  nuevaContraseña: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
  confirmarNuevaContraseña: z.string(),
})
.refine(data => {
    return data.nuevaContraseña === data.confirmarNuevaContraseña;
}, { message: "Las contraseñas no coinciden.", path: ["confirmarNuevaContraseña"] });


interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onProfileUpdate }) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    // El nombre se mantiene para mostrarlo, pero no se podrá cambiar
    nombre: session?.user?.name || '',
    contraseñaActual: '',
    nuevaContraseña: '',
    confirmarNuevaContraseña: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Si no se está intentando cambiar la contraseña, no hacer nada.
    if (!formData.contraseñaActual && !formData.nuevaContraseña && !formData.confirmarNuevaContraseña) {
        setError("No se han proporcionado datos para actualizar la contraseña.");
        return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Validar solo los campos de contraseña
      const validation = editProfileSchema.safeParse(formData);
      if (!validation.success) {
        const errorMsg = Object.values(validation.error.flatten().fieldErrors).flat().join(' ');
        throw new Error(errorMsg || 'Datos inválidos.');
      }

      // Enviar solo los datos de la contraseña a la API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al actualizar el perfil.');
      
      setSuccess(result.message);
      onProfileUpdate(); // Refrescar la sesión
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">&times;</button>
        <h2 className="text-2xl font-bold text-white mb-6">Editar Perfil</h2>
        
        {error && <div className="p-3 bg-red-700 text-white rounded mb-4">{error}</div>}
        {success && <div className="p-3 bg-green-700 text-white rounded mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre de Usuario</label>
            {/* CAMBIO: Campo deshabilitado */}
            <input 
              type="text" 
              name="nombre" 
              id="nombre" 
              value={formData.nombre} 
              className="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-400 cursor-not-allowed" 
              disabled 
            />
          </div>
          <div>
            <label htmlFor="contraseñaActual" className="block text-sm font-medium text-gray-300">Contraseña Actual</label>
            <input type="password" name="contraseñaActual" id="contraseñaActual" value={formData.contraseñaActual} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500" placeholder="Requerida para cambiar contraseña"/>
          </div>
          <div>
            <label htmlFor="nuevaContraseña" className="block text-sm font-medium text-gray-300">Nueva Contraseña</label>
            <input type="password" name="nuevaContraseña" id="nuevaContraseña" value={formData.nuevaContraseña} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" placeholder="Mínimo 8 caracteres"/>
          </div>
          <div>
            <label htmlFor="confirmarNuevaContraseña" className="block text-sm font-medium text-gray-300">Confirmar Nueva Contraseña</label>
            <input type="password" name="confirmarNuevaContraseña" id="confirmarNuevaContraseña" value={formData.confirmarNuevaContraseña} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"/>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
