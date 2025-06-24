// src/lib/mobileAuthUtils.ts
import { NextRequest } from "next/server";
import jwt from 'jsonwebtoken'; // ¡Importa jsonwebtoken!

interface AuthenticatedUser {
  id: string;
  role: string;
  roles?: string[];
  email?: string;
  name?: string;
}

interface AuthResult {
  success: true;
  user: AuthenticatedUser;
}

interface AuthError {
  success: false;
  error: string;
  status: number;
}

type AuthResponse = AuthResult | AuthError;

/**
 * Get authenticated user from JWT token
 * @param request - The NextRequest object
 * @returns Promise with user data or error
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthResponse> {
  try {
    // 1. Extraer el token de la cabecera 'Authorization'
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: "No se encontró el token de autenticación.",
        status: 401,
      };
    }

    const token = authHeader.substring(7); // Quita el prefijo "Bearer "

    // 2. Verificar el token usando jsonwebtoken y el mismo secret
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);

    const tokenPayload = decoded as AuthenticatedUser;

    if (!tokenPayload.id) {
      return {
        success: false,
        error: "Token inválido: falta el ID del usuario.",
        status: 401,
      };
    }
    
    // 3. Devolver los datos del usuario si el token es válido
    return {
        success: true,
        user: {
          id: tokenPayload.id,
          role: tokenPayload.role,
          roles: tokenPayload.roles,
          email: tokenPayload.email,
          name: tokenPayload.name,
        },
      };

  } catch (error) {
    console.error("Authentication error:", error);
    // Manejar errores específicos de JWT (expirado, inválido)
    if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: "Token expirado.", status: 401 };
    }
    if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: "Token inválido.", status: 401 };
    }
    
    return {
      success: false,
      error: "Fallo en la autenticación.",
      status: 500,
    };
  }
}

/**
 * Require specific roles for access
 * @param user - The authenticated user
 * @param requiredRoles - Array of required roles
 * @returns AuthError if user doesn't have required roles, null if authorized
 */
export function requireRoles(
  user: AuthenticatedUser,
  requiredRoles: string[]
): AuthError | null {
  if (!user.roles || !requiredRoles.some(role => user.roles!.includes(role))) {
    return {
      success: false,
      error: `Acceso denegado. Rol requerido: ${requiredRoles.join(", ")}`,
      status: 403,
    };
  }
  return null;
}

/**
 * Helper function to create error responses
 * @param error - The auth error object
 * @returns Response object
 */
export function createAuthErrorResponse(error: AuthError): Response {
  return new Response(
    JSON.stringify({ error: error.error }),
    {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    }
  );
}