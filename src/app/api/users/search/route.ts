// src/app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

interface UserSearchResult {
  id: number;
  nombre: string;
  email: string;
  fecha_creacion: string;
}

/**
 * GET /api/users/search?q={query}
 * Endpoint para buscar otros usuarios por nombre o email.
 * Requiere autenticación de usuario.
 */
export async function GET(request: NextRequest) {
  // Verificar autenticación
  let authResult;
  if (request.headers.has('Authorization')) {
    authResult = await verifyApiToken(request);
  } else {
    authResult = await getAuthenticatedUser(request);
  }
  
  if (!authResult.success) {
    const errorResponse = request.headers.has('Authorization') 
        ? createApiTokenError(authResult) 
        : createWebAuthError(authResult);
    return errorResponse;
  }

  const currentUserId = authResult.user.id;

  try {
    // Obtener parámetro de búsqueda
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q');

    if (!searchQuery || searchQuery.trim().length < 2) {
      return NextResponse.json(
        { error: 'El término de búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    const searchTerm = `%${searchQuery.trim()}%`;

    // Buscar usuarios por nombre o email, excluyendo al usuario actual
    const usersResult = await query({
      sql: `
        SELECT 
          id,
          nombre,
          email,
          fecha_creacion
        FROM usuarios 
        WHERE 
          (nombre LIKE ? OR email LIKE ?) 
          AND id != ? 
          AND estado = 'activo'
        ORDER BY nombre ASC
        LIMIT 20
      `,
      args: [searchTerm, searchTerm, currentUserId]
    });

    const users = usersResult.rows as unknown as UserSearchResult[];

    return NextResponse.json({
      success: true,
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}