// src/app/control/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { z } from 'zod';

// --- INTERFAZ SIMPLIFICADA ---
// Solo necesitamos los datos que se van a mostrar y editar.
interface UserToEdit {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
}
type FormDataType = Omit<UserToEdit, 'id'> & { password?: string };

// --- Esquema de validación (sin cambios) ---
const editUserSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, "El nombre solo puede contener letras y espacios."),
  apellido: z.string().regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/, "El apellido solo puede contener letras y espacios.").optional(),
  email: z.string().email("Formato de correo electrónico inválido."),
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
});


export default function EditUserDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [formData, setFormData] = useState<FormDataType>({ nombre: '', apellido: '', email: '', password: '' });
  const [pageLoading, setPageLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    const canAccess = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
    if (!canAccess) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setPageLoading(true);
      try {
        // --- LLAMADA A LA API CORREGIDA ---
        // Usamos el endpoint que devuelve los detalles del usuario.
        const response = await fetch(`/api/admin/users/${userId}/details`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "No se pudo cargar la información del usuario.");
        }
        const data: { user: UserToEdit } = await response.json();
        setFormData({
          nombre: data.user.nombre,
          apellido: data.user.apellido || '',
          email: data.user.email,
          password: ''
        });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [userId, status, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const validation = editUserSchema.safeParse(formData);
    if (!validation.success) {
      const errorMsg = Object.values(validation.error.flatten().fieldErrors).flat().join(' ');
      setFormError(errorMsg || "Por favor, corrige los errores en el formulario.");
      setIsSubmitting(false);
      return;
    }
    
    const bodyToSend: Partial<FormDataType> = {};
    if (validation.data.nombre) bodyToSend.nombre = validation.data.nombre;
    if (validation.data.apellido !== undefined) bodyToSend.apellido = validation.data.apellido;
    if (validation.data.email) bodyToSend.email = validation.data.email;
    if (validation.data.password) bodyToSend.password = validation.data.password;

    try {
      // --- LLAMADA A LA API CORREGIDA ---
      const response = await fetch(`/api/admin/users/${userId}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Fallo al actualizar el usuario.');
      
      setFormSuccess(data.message || '¡Usuario actualizado con éxito!');
      setFormData(prev => ({...prev, password: ''}));

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // --- Renderizado Condicional ---
  if (status === 'loading' || pageLoading) {
    return <MainLayout pageTitle="Editar Usuario"><div className="text-center">Cargando...</div></MainLayout>;
  }

  const canAccess = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
  if (!canAccess) {
    return (
        <MainLayout pageTitle="Acceso Denegado">
            <div className="text-center text-red-500">No tienes permisos para acceder a esta página.</div>
        </MainLayout>
    );
  }
  
  if (formError && !formData.nombre) {
     return (
      <MainLayout pageTitle="Error">
        <div className="text-center text-red-500">{formError}</div>
        <div className="text-center mt-4">
          <Link href="/control/users" className="text-indigo-400 hover:underline">Volver al Control de Usuarios</Link>
        </div>
      </MainLayout>
     );
  }

  return (
    <MainLayout pageTitle={`Editando Usuario ID: ${userId}`}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-white">Editando Datos del Usuario</h2>
        
        {formError && <div className="mb-4 p-3 bg-red-700 text-white rounded">{formError}</div>}
        {formSuccess && <div className="mb-4 p-3 bg-green-700 text-white rounded">{formSuccess}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre</label>
            <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-300">Apellido</label>
            <input type="text" name="apellido" id="apellido" value={formData.apellido || ''} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
           <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Nueva Contraseña (opcional)</label>
            <input type="password" name="password" id="password" value={formData.password || ''} onChange={handleChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" placeholder="Dejar en blanco para no cambiar"/>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
        <Link href="/control/users" className="block text-center mt-6 text-indigo-400 hover:underline">
            Volver al Control de Usuarios
        </Link>
      </div>
    </MainLayout>
  );
}
