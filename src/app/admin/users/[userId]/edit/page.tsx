// src/app/admin/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { z } from 'zod';

// --- INTERFACES ---
interface UserToEdit {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  roles: string[];
  estado: string;
  suspension_fin: string | null;
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

// --- Esquema de validación ---
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
  // En Next.js 15, no podemos usar React.use en componentes cliente
  // Usamos el valor directamente, ya que useParams ya es seguro en componentes cliente
  const userId = params.userId as string;

  // --- Estados ---
  const [userToEdit, setUserToEdit] = useState<UserToEdit | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({ nombre: '', apellido: '', email: '', password: '' });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [detailsSubmitting, setDetailsSubmitting] = useState(false);
  const [rolesSubmitting, setRolesSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Obtención de datos ---
  useEffect(() => {
    if (status === 'loading') return;
    // Solo los administradores pueden acceder a esta página
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
        
        setDetailsFormData({
          nombre: userData.user.nombre,
          apellido: userData.user.apellido || '',
          email: userData.user.email,
          password: ''
        });

        const primaryUserRoleName = userData.user.roles[0];
        const primaryRoleObj = rolesData.roles.find(r => r.nombre_rol === primaryUserRoleName);
        if (primaryRoleObj) {
            setSelectedRoleId(primaryRoleObj.id);
        }

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
  
  const handleRoleChange = (roleId: number) => {
    setSelectedRoleId(roleId);
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
      setSuccess("Datos del usuario actualizados con éxito.");
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

    if (!selectedRoleId) {
        setError("Debes seleccionar un rol para el usuario.");
        setRolesSubmitting(false);
        return;
    }

    if (session?.user?.id === userId) {
      const adminRole = availableRoles.find(r => r.nombre_rol === 'administrador');
      if (adminRole && selectedRoleId !== adminRole.id) {
        alert("Un administrador no puede quitarse a sí mismo el rol de 'administrador'.");
        setRolesSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Fallo al actualizar roles.');
      setSuccess("Rol del usuario actualizado con éxito.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar roles.');
    } finally {
      setRolesSubmitting(false);
    }
  };

  // --- Renderizado ---
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
        
        {/* Formulario para Editar Detalles del Usuario */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-white">Editar Datos de <span className="text-indigo-400">{userToEdit.email}</span></h2>
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            {/* ... campos del formulario de detalles ... */}
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
              <input type="email" name="email" id="email" value={detailsFormData.email} onChange={handleDetailsChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Nueva Contraseña (opcional)</label>
              <input type="password" name="password" id="password" value={detailsFormData.password || ''} onChange={handleDetailsChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" placeholder="Dejar en blanco para no cambiar"/>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={detailsSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition-colors disabled:opacity-50">
                {detailsSubmitting ? 'Guardando Datos...' : 'Guardar Datos'}
              </button>
            </div>
          </form>
        </div>

        {/* --- Formulario para Gestionar Roles (Solo para Administradores) --- */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-white">Gestionar Rol del Usuario</h2>
          <form onSubmit={handleRolesSubmit}>
            <fieldset>
              <legend className="sr-only">Roles de usuario</legend>
              <div className="space-y-2">
                {availableRoles.map(role => (
                  <label key={role.id} className="flex items-center p-3 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="roleSelection"
                      className="h-5 w-5 text-indigo-500 bg-gray-600 border-gray-500 focus:ring-indigo-400 focus:ring-offset-gray-800"
                      checked={selectedRoleId === role.id}
                      onChange={() => handleRoleChange(role.id)}
                      disabled={session?.user?.id === String(userToEdit.id) && role.nombre_rol === 'administrador'}
                    />
                    <span className="ml-3 text-sm text-gray-300">{role.nombre_rol}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="pt-6">
              <button type="submit" disabled={rolesSubmitting} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md transition-colors disabled:opacity-50">
                {rolesSubmitting ? 'Guardando Rol...' : 'Guardar Rol'}
              </button>
            </div>
          </form>
        </div>

        {/* Mensajes de Éxito/Error y Navegación */}
        {(error || success) && (
            <div className={`mt-4 p-3 rounded text-center ${error ? 'bg-red-700 text-white' : 'bg-green-700 text-white'}`}>
                {error || success}
            </div>
        )}
        <Link href="/admin/users" className="block text-center mt-4 text-indigo-400 hover:underline">
            Volver a la lista de usuarios
        </Link>
      </div>
    </MainLayout>
  );
}