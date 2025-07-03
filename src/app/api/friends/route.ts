// src/app/api/friends/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

interface FriendFromDB {
  id: number;
  nombre: string;
  email: string;
  fecha_creacion: string;
  fecha_inicio_amistad: string;
}

/**
 * GET /api/friends
 * Para listar todos los amigos del usuario autenticado.
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

  const userId = parseInt(authResult.user.id);

  try {
    // Obtener todos los amigos del usuario
    // Como la tabla amistades almacena la relación con usuario_id_1 < usuario_id_2,
    // necesitamos buscar en ambas columnas
    const friendsResult = await query({
      sql: `
        SELECT 
          u.id,
          u.nombre,
          u.email,
          u.fecha_creacion,
          a.fecha_inicio as fecha_inicio_amistad
        FROM amistades a
        JOIN usuarios u ON (
          CASE 
            WHEN a.usuario_id_1 = ? THEN u.id = a.usuario_id_2
            WHEN a.usuario_id_2 = ? THEN u.id = a.usuario_id_1
            ELSE 0
          END
        )
        WHERE (a.usuario_id_1 = ? OR a.usuario_id_2 = ?) AND u.estado = 'activo'
        ORDER BY a.fecha_inicio DESC
      `,
      args: [userId, userId, userId, userId]
    });

    const friends = friendsResult.rows as unknown as FriendFromDB[];

    return NextResponse.json({
      success: true,
      friends,
      total: friends.length
    });

  } catch (error) {
    console.error('Error al obtener lista de amigos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}