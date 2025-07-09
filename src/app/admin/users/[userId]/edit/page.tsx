// src/app/admin/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { z } from 'zod';

// Inyección de animaciones CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse-custom {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.5); }
      50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6); }
    }
    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.3); }
      50% { opacity: 1; transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
    .animate-slideInLeft { animation: slideInLeft 0.6s ease-out; }
    .animate-pulse-custom { animation: pulse-custom 2s infinite; }
    .animate-shimmer { animation: shimmer 2s infinite linear; }
    .animate-glow { animation: glow 2s infinite; }
    .animate-bounceIn { animation: bounceIn 0.6s ease-out; }
    .form-focus:focus { border-color: rgb(99 102 241 / 0.5); box-shadow: 0 0 0 3px rgb(99 102 241 / 0.1); }
    .input-glow:focus { animation: glow 2s infinite; }
  `;
  document.head.appendChild(style);
}

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
    return (
      <MainLayout pageTitle="Editar Usuario">
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-fadeInUp">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-300 animate-pulse-custom">Cargando información del usuario...</p>
        </div>
      </MainLayout>
    );
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-bounceIn">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse-custom">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent mb-2">Acceso Denegado</h2>
          <p className="text-gray-400 text-center">No tienes permisos para acceder a esta página.</p>
        </div>
      </MainLayout>
    );
  }
  
  if (!userToEdit) {
    return (
      <MainLayout pageTitle="Error">
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-bounceIn">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse-custom">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent mb-2">Error</h2>
          <p className="text-gray-400 text-center">{error || "No se pudo cargar el usuario."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle={`Editando Usuario: ${userToEdit.nombre}`}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeInUp">
        
        {/* Header con información del usuario */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm animate-slideInLeft">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse-custom">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ✏️ Editando Usuario
              </h1>
              <p className="text-gray-400 mt-1">Modificando información de <span className="text-indigo-400 font-semibold">{userToEdit.email}</span></p>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full w-32 animate-shimmer" style={{backgroundSize: '200px 100%'}}></div>
        </div>
        
        {/* Formulario para Editar Detalles del Usuario */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm animate-fadeInUp" style={{animationDelay: '0.2s'}}>
          <div className="mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2 flex items-center gap-2">
              📝 Información Personal
            </h2>
            <p className="text-gray-400">Actualiza los datos básicos del usuario</p>
          </div>
          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            {/* ... campos del formulario de detalles ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="nombre" className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <span className="text-blue-400">👤</span>
                  Nombre
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="nombre" 
                    id="nombre" 
                    value={detailsFormData.nombre} 
                    onChange={handleDetailsChange} 
                    className="w-full px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-750 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 transition-all duration-300 form-focus input-glow hover:border-blue-500/50 focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ingresa el nombre"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 pointer-events-none hover:opacity-100"></div>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="apellido" className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <span className="text-green-400">📝</span>
                  Apellido
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="apellido" 
                    id="apellido" 
                    value={detailsFormData.apellido || ''} 
                    onChange={handleDetailsChange} 
                    className="w-full px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-750 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 transition-all duration-300 form-focus input-glow hover:border-green-500/50 focus:bg-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="Ingresa el apellido"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 transition-opacity duration-300 pointer-events-none hover:opacity-100"></div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                <span className="text-purple-400">📧</span>
                Correo Electrónico
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  value={detailsFormData.email} 
                  onChange={handleDetailsChange} 
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-750 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 transition-all duration-300 form-focus input-glow hover:border-purple-500/50 focus:bg-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="usuario@ejemplo.com"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 transition-opacity duration-300 pointer-events-none hover:opacity-100"></div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                <span className="text-yellow-400">🔒</span>
                Nueva Contraseña
                <span className="text-xs text-gray-500 ml-2">(opcional)</span>
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  name="password" 
                  id="password" 
                  value={detailsFormData.password || ''} 
                  onChange={handleDetailsChange} 
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-750 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 transition-all duration-300 form-focus input-glow hover:border-yellow-500/50 focus:bg-gray-700 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                  placeholder="Dejar en blanco para no cambiar"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 transition-opacity duration-300 pointer-events-none hover:opacity-100"></div>
              </div>
            </div>
            <div className="pt-6 flex gap-4">
              <button 
                type="submit" 
                disabled={detailsSubmitting} 
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 animate-glow"
              >
                <span className="flex items-center justify-center gap-2">
                  {detailsSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Guardando Datos...
                    </>
                  ) : (
                    <>
                      💾 Guardar Datos
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* --- Formulario para Gestionar Roles (Solo para Administradores) --- */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <div className="mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2 flex items-center gap-2">
              🎭 Gestión de Roles
            </h2>
            <p className="text-gray-400">Asigna el rol apropiado para este usuario</p>
          </div>
          <form onSubmit={handleRolesSubmit} className="space-y-6">
            <fieldset>
              <legend className="sr-only">Roles de usuario</legend>
              <div className="space-y-3">
                {availableRoles.map((role, index) => {
                  const isSelected = selectedRoleId === role.id;
                  const isDisabled = session?.user?.id === String(userToEdit.id) && role.nombre_rol === 'administrador';
                  const roleIcons = {
                    'administrador': '👑',
                    'moderador_contenido': '🛡️',
                    'usuario_estandar': '👤'
                  };
                  const roleIcon = roleIcons[role.nombre_rol as keyof typeof roleIcons] || '🔹';
                  
                  return (
                    <label 
                      key={role.id} 
                      className={`relative flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-102 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border-2 border-indigo-500/50 shadow-lg animate-glow' 
                          : 'bg-gradient-to-r from-gray-700/50 to-gray-750/50 border border-gray-600/30 hover:border-indigo-500/30 hover:bg-gradient-to-r hover:from-gray-700/70 hover:to-gray-750/70'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{animationDelay: `${0.1 * index}s`}}
                    >
                      <div className="flex items-center w-full">
                        <div className="relative">
                          <input
                            type="radio"
                            name="roleSelection"
                            className="h-5 w-5 text-indigo-500 bg-gray-600 border-gray-500 focus:ring-indigo-400 focus:ring-offset-gray-800 transition-all duration-200"
                            checked={isSelected}
                            onChange={() => handleRoleChange(role.id)}
                            disabled={isDisabled}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse-custom"></div>
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-3 flex-1">
                          <span className="text-2xl">{roleIcon}</span>
                          <div>
                            <span className={`text-lg font-semibold ${
                              isSelected ? 'text-white' : 'text-gray-300'
                            }`}>
                              {role.nombre_rol.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {isDisabled && (
                              <p className="text-xs text-yellow-400 mt-1">⚠️ No puedes cambiar tu propio rol de administrador</p>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-indigo-400 animate-pulse-custom">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 pointer-events-none ${
                        !isDisabled ? 'group-hover:opacity-100' : ''
                      }`}></div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="pt-6 flex gap-4">
              <button 
                type="submit" 
                disabled={rolesSubmitting} 
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 animate-glow"
              >
                <span className="flex items-center justify-center gap-2">
                  {rolesSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Guardando Rol...
                    </>
                  ) : (
                    <>
                      🎭 Guardar Rol
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Mensajes de Éxito/Error */}
        {(error || success) && (
          <div className={`p-6 rounded-2xl border backdrop-blur-sm animate-bounceIn ${
            error 
              ? 'bg-gradient-to-r from-red-900/50 to-red-800/50 border-red-500/50 text-red-100' 
              : 'bg-gradient-to-r from-green-900/50 to-green-800/50 border-green-500/50 text-green-100'
          }`}>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">
                {error ? '❌' : '✅'}
              </span>
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-1">
                  {error ? 'Error' : '¡Éxito!'}
                </h3>
                <p className="text-sm opacity-90">
                  {error || success}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Navegación */}
        <div className="flex justify-center animate-fadeInUp" style={{animationDelay: '0.6s'}}>
          <Link 
            href="/admin/users" 
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-gray-600/50 hover:border-gray-500/50"
          >
            <span className="text-xl group-hover:animate-pulse-custom">🔙</span>
            <span>Volver a la lista de usuarios</span>
            <div className="w-0 group-hover:w-2 h-2 bg-indigo-400 rounded-full transition-all duration-300"></div>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}