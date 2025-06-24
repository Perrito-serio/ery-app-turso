// src/lib/apiTokenAuth.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

// Reutilizamos las mismas interfaces para mantener la consistencia
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
 * Obtiene el usuario autenticado desde un token Bearer JWT.
 * Específicamente para las peticiones de la API móvil (Flutter).
 * @param request - The NextRequest object
 * @returns Promise with user data or error
 */
export async function verifyApiToken(
  request: NextRequest
): Promise<AuthResponse> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: "No se encontró el token de autenticación.",
        status: 401,
      };
    }

    const token = authHeader.substring(7); // Quita el prefijo "Bearer "
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    const tokenPayload = decoded as AuthenticatedUser;

    if (!tokenPayload.id) {
      return {
        success: false,
        error: "Token inválido: falta el ID del usuario.",
        status: 401,
      };
    }
    
    return {
        success: true,
        user: tokenPayload,
      };

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: "Token expirado.", status: 401 };
    }
    if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: "Token inválido.", status: 401 };
    }
    
    console.error("API Token Authentication error:", error);
    return {
      success: false,
      error: "Fallo en la autenticación del token.",
      status: 500,
    };
  }
}

// Puedes copiar y pegar las funciones requireRoles y createAuthErrorResponse aquí también
// si quieres mantener este archivo totalmente independiente, o importarlas desde mobileAuthUtils.

export function requireRoles(
  user: AuthenticatedUser,
  requiredRoles: string[]
): AuthError | null {
  const userRoles = user.roles || [];
  const hasAccess = requiredRoles.some(role => userRoles.includes(role));

  if (!hasAccess) {
    return {
      success: false,
      error: `Access denied. Required roles: ${requiredRoles.join(", ")}`,
      status: 403,
    };
  }
  return null;
}

export function createAuthErrorResponse(error: AuthError): Response {
  return new Response(
    JSON.stringify({ error: error.error }),
    {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    }
  );
}