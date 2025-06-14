// src/app/admin/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { z } from 'zod';

// --- Interfaces ---
interface UserToEdit {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  roles: string[];
}
interface AvailableRole {
  id: number;
  nombre_rol: string;
}
type DetailsFormData = {
  nombre: string;
  apellido: string;
  email: string;
  password?: string;
};

// --- Esquema de validación con Zod para el formulario de detalles ---
const editDetailsSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, "El nombre solo puede contener letras y espacios."),
  apellido: z.string().regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/, "El apellido solo puede contener letras y espacios.").optional(),
  email: z.string().email("Formato de correo electrónico inválido."),
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
});


export default function AdminEditUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  // --- Estados ---
  const [userToEdit, setUserToEdit] = useState<UserToEdit | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  
  // Estado para el formulario de detalles
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({ nombre: '', apellido: '', email: '', password: '' });
  
  // Estado para el formulario de roles
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());

  // Estados de carga y mensajes para cada formulario
  const [pageLoading, setPageLoading] = useState(true);
  const [detailsSubmitting, setDetailsSubmitting] = useState(false);
  const [rolesSubmitting, setRolesSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  // --- Efecto para obtener todos los datos iniciales ---
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session?.user?.roles?.includes('administrador')) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setPageLoading(true);
      try {
        const [userResponse, rolesResponse] = await Promise.all([
          fetch(`/api/admin/users/${userId}`),
          fetch('/api/roles')
        ]);

        if (!userResponse.ok) throw new Error('No se pudo cargar la información del usuario.');
        if (!rolesResponse.ok) throw new Error('No se pudo cargar la lista de roles.');

        const userData: { user: UserToEdit } = await userResponse.json();
        const rolesData: { roles: AvailableRole[] } = await rolesResponse.json();
        
        setUserToEdit(userData.user);
        setAvailableRoles(rolesData.roles || []);
        
        // Inicializar los formularios con los datos obtenidos
        setDetailsFormData({
          nombre: userData.user.nombre,
          apellido: userData.user.apellido || '',
          email: userData.user.email,
          password: ''
        });

        const currentUserRoleIds = new Set<number>();
        userData.user.roles.forEach(userRoleName => {
          const roleObj = rolesData.roles.find(r => r.nombre_rol === userRoleName);
          if (roleObj) currentUserRoleIds.add(roleObj.id);
        });
        setSelectedRoleIds(currentUserRoleIds);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [userId, status, session, router]);

  // --- Manejadores de Formularios ---
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDetailsFormData({ ...detailsFormData, [e.target.name]: e.target.value });
  };
  
  const handleRoleChange = (roleId: number, isChecked: boolean) => {
    setSelectedRoleIds(prev => {
      const newSelected = new Set(prev);
      if (isChecked) newSelected.add(roleId);
      else newSelected.delete(roleId);
      return newSelected;
    });
  };

  const handleDetailsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDetailsSubmitting(true);
    setError(null);
    setSuccess(null);

    const validation = editDetailsSchema.safeParse(detailsFormData);
    if (!validation.success) {
      const errorMsg = Object.values(validation.error.flatten().fieldErrors).flat().join(' ');
      setError(errorMsg || "Por favor, corrige los errores.");
      setDetailsSubmitting(false);
      return;
    }

    const bodyToSend: Partial<DetailsFormData> = {};
    if (validation.data.nombre) bodyToSend.nombre = validation.data.nombre;
    if (validation.data.apellido !== undefined) bodyToSend.apellido = validation.data.apellido;
    if (validation.data.email) bodyToSend.email = validation.data.email;
    if (validation.data.password) bodyToSend.password = validation.data.password;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Fallo al actualizar los datos.');
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setDetailsSubmitting(false);
    }
  };

  const handleRolesSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRolesSubmitting(true);
    setError(null);
    setSuccess(null);

    if (session?.user?.id === parseInt(userId)) {
      const adminRole = availableRoles.find(r => r.nombre_rol === 'administrador');
      if (adminRole && !selectedRoleIds.has(adminRole.id)) {
        alert("Un administrador no puede quitarse a sí mismo el rol de 'administrador'.");
        setRolesSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: Array.from(selectedRoleIds) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Fallo al actualizar roles.');
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar roles.');
    } finally {
      setRolesSubmitting(false);
    }
  };

  // --- Renderizado Condicional ---
  if (status === 'loading' || pageLoading) {
    return <MainLayout pageTitle="Editar Usuario"><div className="text-center">Cargando...</div></MainLayout>;
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return <MainLayout pageTitle="Acceso Denegado"><div className="text-center text-red-500">No tienes permisos para acceder aquí.</div></MainLayout>;
  }
  
  if (!userToEdit) {
     return <MainLayout pageTitle="Error"><div className="text-center text-red-500">{error || "No se pudo cargar el usuario."}</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle={`Editando Usuario: ${userToEdit.nombre}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* --- Formulario para Editar Detalles del Usuario --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-white">Editar Datos de <span className="text-indigo-400">{userToEdit.email}</span></h2>
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre</label>
                <input type="text" name="nombre" id="nombre" value={detailsFormData.nombre} onChange={handleDetailsChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
              <div>
                <label htmlFor="apellido" className="block text-sm font-medium text-gray-300">Apellido</label>
                <input type="text" name="apellido" id="apellido" value={detailsFormData.apellido || ''} onChange={handleDetailsChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
            </div>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
              <input type="email" name="email" id="email" value={detailsFormData.email} onChange={handleDetailsChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Nueva Contraseña (opcional)</label>
              <input type="password" name="password" id="password" value={detailsFormData.password || ''} onChange={handleDetailsChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" placeholder="Dejar en blanco para no cambiar"/>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={detailsSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md ...">
                {detailsSubmitting ? 'Guardando Datos...' : 'Guardar Datos'}
              </button>
            </div>
          </form>
        </div>

        {/* --- Formulario para Gestionar Roles --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-white">Gestionar Roles</h2>
          <form onSubmit={handleRolesSubmit}>
            <fieldset>
              <div className="space-y-2">
                {availableRoles.map(role => (
                  <label key={role.id} className="flex items-center p-3 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-indigo-500 bg-gray-600 border-gray-500 rounded focus:ring-indigo-400 focus:ring-offset-gray-800"
                      checked={selectedRoleIds.has(role.id)}
                      onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                      disabled={session?.user?.id === userToEdit.id && role.nombre_rol === 'administrador'}
                    />
                    <span className="ml-3 text-sm text-gray-300">{role.nombre_rol}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="pt-6">
              <button type="submit" disabled={rolesSubmitting} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md ...">
                {rolesSubmitting ? 'Guardando Roles...' : 'Guardar Roles'}
              </button>
            </div>
          </form>
        </div>

        {/* Mensajes de Éxito/Error y Navegación */}
        {error && <div className="mt-4 p-3 bg-red-700 text-white rounded text-center">{error}</div>}
        {success && <div className="mt-4 p-3 bg-green-700 text-white rounded text-center">{success}</div>}
        <Link href="/admin/users" className="block text-center mt-4 text-indigo-400 hover:underline">
            Volver a la lista de usuarios
        </Link>
      </div>
    </MainLayout>
  );
}
