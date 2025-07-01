// src/app/register/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

// --- MODIFICACIÓN ---: Interfaces actualizadas para el estado del formulario y los datos de la API.
interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  confirmPassword: string;
  fecha_nacimiento: string;
  telefono: string;
  direccion: string;
  pais_id: string; // Se usará para el ID del país seleccionado
  ciudad_id: string; // Se usará para el ID de la ciudad seleccionada
}

interface Country {
  id: number;
  nombre: string;
}

interface City {
  id: number;
  nombre: string;
}

interface FormErrors {
  nombre?: string | string[];
  apellido?: string | string[];
  email?: string | string[];
  password?: string | string[];
  confirmPassword?: string | string[];
  api?: string;
  // ... otros campos si se requiere validación
  fecha_nacimiento?: string | string[];
  telefono?: string | string[];
  direccion?: string | string[];
}

// --- Componente FormField (modificado para aceptar `disabled`) ---
interface FormFieldProps {
  label: string;
  name: keyof RegisterFormData | 'confirmPassword' | 'pais' | 'ciudad'; // Nombres antiguos para compatibilidad
  type?: string;
  value: string;
  error?: string | string[];
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ label, name, value, error, onChange, children, disabled = false }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <div className={`${disabled ? 'opacity-50' : ''}`}>
        {children || (
        <input
            type="text" id={name} name={name} value={value} onChange={onChange} disabled={disabled}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        )}
    </div>
    {error && <p className="mt-1 text-xs text-red-400">{Array.isArray(error) ? error.join(', ') : error}</p>}
  </div>
);

// --- Componente Principal (Actualizado) ---
export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    fecha_nacimiento: '',
    telefono: '',
    direccion: '',
    pais_id: '', // Valor inicial vacío
    ciudad_id: '', // Valor inicial vacío
  });

  // --- MODIFICACIÓN ---: Nuevos estados para almacenar países y ciudades.
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar la lista de países al montar el componente.
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/locations/countries');
        const data = await response.json();
        if (response.ok) {
          setCountries(data.countries || []);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);

  // Cargar las ciudades cuando se selecciona un país.
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.pais_id) {
        setCities([]);
        setFormData(prev => ({ ...prev, ciudad_id: '' })); // Resetear ciudad si el país cambia
        return;
      }
      setIsLoadingCities(true);
      try {
        const response = await fetch(`/api/locations/cities?countryId=${formData.pais_id}`);
        const data = await response.json();
        if (response.ok) {
          setCities(data.cities || []);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [formData.pais_id]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiMessage(null);
    setErrors({});
    
    // Validación local para los campos obligatorios.
    const newErrors: FormErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido.";
    if (!formData.email.trim()) newErrors.email = "El email es requerido.";
    if (!formData.password) newErrors.password = "La contraseña es requerida.";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden.";
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    setIsLoading(true);

    // Preparar los datos para enviar a la API, incluyendo los nuevos IDs.
    const dataToSend: { [key: string]: any } = {
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
    };
    if (formData.apellido) dataToSend.apellido = formData.apellido;
    if (formData.fecha_nacimiento) dataToSend.fecha_nacimiento = formData.fecha_nacimiento;
    if (formData.telefono) dataToSend.telefono = formData.telefono;
    if (formData.direccion) dataToSend.direccion = formData.direccion;
    // Convertir a número solo si hay un valor seleccionado
    if (formData.pais_id) dataToSend.pais_id = parseInt(formData.pais_id, 10);
    if (formData.ciudad_id) dataToSend.ciudad_id = parseInt(formData.ciudad_id, 10);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      
      const data = await response.json();

      if (response.ok) {
        setApiMessage({ type: 'success', text: data.message || '¡Registro exitoso!' });
        setFormData({
            nombre: '', apellido: '', email: '', password: '', confirmPassword: '',
            fecha_nacimiento: '', telefono: '', direccion: '', pais_id: '', ciudad_id: '',
        });
      } else {
        if (data.errors) setErrors(data.errors);
        setApiMessage({ type: 'error', text: data.message || 'Ocurrió un error.' });
      }
    } catch (error) {
      setApiMessage({ type: 'error', text: 'No se pudo conectar al servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => signIn('google', { callbackUrl: '/' }); 
  
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">Crear una nueva cuenta</h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">Inicia sesión aquí</Link>
        </p>
      </div>
      <div className="mt-8 sm:mx-auto w-full sm:max-w-2xl">
        <div className="bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <div className="mb-6"><button type="button" onClick={handleGoogleSignIn} className="w-full flex justify-center items-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600"><svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l0.007-0.007l6.19,5.238C39.902,36.068,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>Registrarse con Google</button></div>
          <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600" /></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-400">O continuar con</span></div></div>
          {apiMessage?.type === 'error' && <div className="p-3 rounded-md mb-4 bg-red-600 text-white text-sm"><p>{apiMessage.text}</p></div>}
          {apiMessage?.type === 'success' && <div className="p-3 rounded-md mb-4 bg-green-600 text-white text-sm"><p>{apiMessage.text}</p></div>}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Nombre *" name="nombre" value={formData.nombre} error={errors.nombre} onChange={handleChange} />
                <FormField label="Apellido" name="apellido" value={formData.apellido} onChange={handleChange} />
            </div>
            <FormField label="Correo Electrónico *" name="email" type="email" value={formData.email} error={errors.email} onChange={handleChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Contraseña *" name="password" type="password" value={formData.password} error={errors.password} onChange={handleChange} />
                <FormField label="Confirmar Contraseña *" name="confirmPassword" type="password" value={formData.confirmPassword} error={errors.confirmPassword} onChange={handleChange} />
            </div>
            <hr className="border-gray-600 my-6" />
            <p className="text-sm text-gray-400">Información Adicional (Opcional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={handleChange} />
                <FormField label="Teléfono" name="telefono" type="tel" value={formData.telefono} onChange={handleChange} />
            </div>
            <FormField label="Dirección" name="direccion" value={formData.direccion} onChange={handleChange} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="País" name="pais_id" value={formData.pais_id} onChange={handleChange}>
                    <select id="pais_id" name="pais_id" value={formData.pais_id} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecciona un país...</option>
                        {countries.map(country => (
                            <option key={country.id} value={String(country.id)}>{country.nombre}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Ciudad" name="ciudad_id" value={formData.ciudad_id} onChange={handleChange} disabled={!formData.pais_id || isLoadingCities}>
                    <select id="ciudad_id" name="ciudad_id" value={formData.ciudad_id} onChange={handleChange} disabled={!formData.pais_id || isLoadingCities} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                        <option value="">{isLoadingCities ? 'Cargando...' : 'Selecciona una ciudad...'}</option>
                        {cities.map(city => (
                            <option key={city.id} value={String(city.id)}>{city.nombre}</option>
                        ))}
                    </select>
                </FormField>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {isLoading ? ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( 'Crear Cuenta con Email' )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
