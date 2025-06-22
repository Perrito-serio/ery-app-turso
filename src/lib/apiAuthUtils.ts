// src/lib/apiAuthUtils.ts
import { getServerSession, Session } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Se ajusta la interfaz para que coincida con la estructura que definimos en [...nextauth]
// CORRECCIÓN: La propiedad `user` no debe ser opcional, ya que la Session base la requiere.
// Las propiedades *dentro* de user sí pueden ser opcionales.
interface AppSession extends Session {
  user: {
    id: number;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
    role: string;
  };
}

interface AuthResult {
  session: AppSession | null;
  errorResponse: NextResponse | null;
}

/**
 * Verifica la sesión de NextAuth.js y la autorización del usuario para una API Route.
 * @param requiredRoles Un array opcional de roles requeridos para acceder al recurso.
 * @returns Un objeto AuthResult con la sesión del usuario o una respuesta de error.
 */
export async function verifyApiAuth(
  requiredRoles: string[] = []
): Promise<AuthResult> {
  // Usamos getServerSession con las authOptions para obtener la sesión del lado del servidor.
  const session = (await getServerSession(authOptions)) as AppSession | null;

  // 1. Verificar si hay una sesión activa y si el objeto user existe
  if (!session || !session.user) {
    return {
      session: null,
      errorResponse: NextResponse.json({ message: 'No autenticado.' }, { status: 401 }),
    };
  }

  // 2. CORRECCIÓN CLAVE: Verificar explícitamente que el ID del usuario exista en la sesión.
  // Este es el origen del error "No se pudo identificar al usuario".
  if (!session.user.id) {
    return {
      session: null,
      errorResponse: NextResponse.json({ message: 'No se pudo identificar al usuario en la sesión.' }, { status: 401 }),
    };
  }

  // 3. Verificar si se requieren roles específicos
  if (requiredRoles.length > 0) {
    const userRoles = session.user.roles || [];
    const userHasRequiredRole = userRoles.some(role => requiredRoles.includes(role));

    if (!userHasRequiredRole) {
      return {
        session: null,
        errorResponse: NextResponse.json(
          { message: `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}.` },
          { status: 403 }
        ),
      };
    }
  }

  // Si todas las verificaciones pasan, la autenticación y autorización son exitosas
  return { session, errorResponse: null };
}
