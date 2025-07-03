// src/app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

interface UserBasicInfo {
  id: number;
  nombre: string;
  email: string;
  fecha_creacion: string;
}

/**
 * GET /api/users/{userId}
 * Obtiene información básica de un usuario.
 * Requiere verificación de amistad para proteger la privacidad.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

  const requesterId = parseInt(authResult.user.id);
  const targetUserId = parseInt(params.userId);

  // Validar que userId sea un número válido
  if (isNaN(targetUserId)) {
    return NextResponse.json(
      { error: 'ID de usuario inválido' },
      { status: 400 }
    );
  }

  // Si es el mismo usuario, permitir acceso
  if (requesterId === targetUserId) {
    try {
      const userResult = await query({
        sql: 'SELECT id, nombre, email, fecha_creacion FROM usuarios WHERE id = ? AND estado = "activo"',
        args: [targetUserId]
      });

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const user = userResult.rows[0] as unknown as UserBasicInfo;
      return NextResponse.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }

  try {
    // Verificar que existe una amistad entre los usuarios
    const friendshipResult = await query({
      sql: `
        SELECT 1 FROM amistades 
        WHERE (usuario_id_1 = ? AND usuario_id_2 = ?) 
           OR (usuario_id_1 = ? AND usuario_id_2 = ?)
      `,
      args: [Math.min(requesterId, targetUserId), Math.max(requesterId, targetUserId), Math.min(requesterId, targetUserId), Math.max(requesterId, targetUserId)]
    });

    if (friendshipResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No tienes una amistad con este usuario' },
        { status: 403 }
      );
    }

    // Obtener información básica del usuario
    const userResult = await query({
      sql: 'SELECT id, nombre, email, fecha_creacion FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0] as unknown as UserBasicInfo;
    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}