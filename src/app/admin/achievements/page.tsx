// src/app/admin/achievements/page.tsx
'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

// --- Interfaces ---
interface Achievement {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  criterio_id: number;
  valor_criterio: number;
  criterio_codigo: string;
  criterio_descripcion: string;
}

interface AchievementCriterion {
  id: number;
  criterio_codigo: string;
  descripcion: string;
}

interface NewAchievement {
  nombre: string;
  descripcion: string;
  icono_url: string;
  criterio_id: string; // Se maneja como string desde el select del form
  valor_criterio: string; // Se maneja como string desde el input del form
}

// --- Componente Principal ---
export default function ManageAchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [criteria, setCriteria] = useState<AchievementCriterion[]>([]);
  const [newAchievement, setNewAchievement] = useState<NewAchievement>({
    nombre: '',
    descripcion: '',
    icono_url: '',
    criterio_id: '',
    valor_criterio: '',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar datos iniciales (logros y criterios)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [achievementsRes, criteriaRes] = await Promise.all([
        fetch('/api/admin/achievements'),
        fetch('/api/admin/achievements/criteria'),
      ]);

      if (!achievementsRes.ok || !criteriaRes.ok) {
        throw new Error('No se pudieron cargar los datos necesarios.');
      }

      const achievementsData = await achievementsRes.json();
      const criteriaData = await criteriaRes.json();

      setAchievements(achievementsData.achievements || []);
      setCriteria(criteriaData.criteria || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAchievement(prev => ({ ...prev, [name]: value }));
  };

  // Manejador para crear un nuevo logro
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const body = {
        ...newAchievement,
        criterio_id: parseInt(newAchievement.criterio_id, 10),
        valor_criterio: parseInt(newAchievement.valor_criterio, 10),
      };

      const response = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.errors ? Object.values(data.errors).flat().join(' ') : data.message;
        throw new Error(errorMessage || 'Error al crear el logro.');
      }
      
      setSuccess('¡Logro creado exitosamente!');
      fetchData(); // Recargar la lista de logros
      // Resetear el formulario
      setNewAchievement({ nombre: '', descripcion: '', icono_url: '', criterio_id: '', valor_criterio: '' });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <MainLayout pageTitle="Gestionar Logros"><div className="text-center">Cargando...</div></MainLayout>;
  }

  return (
    <MainLayout pageTitle="Gestionar Logros">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna del Formulario */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-white">Crear Nuevo Logro</h2>
            {error && <div className="p-3 bg-red-700 text-white rounded mb-4">{error}</div>}
            {success && <div className="p-3 bg-green-700 text-white rounded mb-4">{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre del Logro</label>
                <input type="text" name="nombre" value={newAchievement.nombre} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" required />
              </div>
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-300">Descripción</label>
                <textarea name="descripcion" value={newAchievement.descripcion} onChange={handleInputChange} rows={3} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" required />
              </div>
              <div>
                <label htmlFor="icono_url" className="block text-sm font-medium text-gray-300">URL del Ícono</label>
                <input type="url" name="icono_url" value={newAchievement.icono_url} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
              </div>
              <div>
                <label htmlFor="criterio_id" className="block text-sm font-medium text-gray-300">Criterio de Desbloqueo</label>
                <select name="criterio_id" value={newAchievement.criterio_id} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" required>
                  <option value="" disabled>Selecciona un criterio...</option>
                  {criteria.map(c => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="valor_criterio" className="block text-sm font-medium text-gray-300">Valor a Alcanzar</label>
                <input type="number" name="valor_criterio" value={newAchievement.valor_criterio} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" required />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md disabled:opacity-50">
                  {isSubmitting ? 'Creando...' : 'Crear Logro'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Columna de la Tabla */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-white">Logros Existentes</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Nombre</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Criterio</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {achievements.map(ach => (
                    <tr key={ach.id}>
                      <td className="px-4 py-3 text-sm text-white">{ach.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{ach.criterio_descripcion}</td>
                      <td className="px-4 py-3 text-sm text-white">{ach.valor_criterio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
