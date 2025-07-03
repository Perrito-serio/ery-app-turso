// src/app/api/friends/[friendId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

/**
 * DELETE /api/friends/{friendId}
 * Para eliminar a un amigo.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { friendId: string } }
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

  const userId = parseInt(authResult.user.id);
  const friendId = parseInt(params.friendId);

  try {
    // Verificar que el friendId es válido
    if (isNaN(friendId) || friendId <= 0) {
      return NextResponse.json(
        { error: 'ID de amigo inválido' },
        { status: 400 }
      );
    }

    // Verificar que no se esté intentando eliminar a sí mismo
    if (userId === friendId) {
      return NextResponse.json(
        { error: 'No puedes eliminarte a ti mismo como amigo' },
        { status: 400 }
      );
    }

    // Verificar que existe la amistad
    const friendshipResult = await query({
      sql: `
        SELECT 1 FROM amistades 
        WHERE 
          (usuario_id_1 = ? AND usuario_id_2 = ?) OR 
          (usuario_id_1 = ? AND usuario_id_2 = ?)
      `,
      args: [
        Math.min(userId, friendId),
        Math.max(userId, friendId),
        Math.min(userId, friendId),
        Math.max(userId, friendId)
      ]
    });

    if (friendshipResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No existe una amistad con este usuario' },
        { status: 404 }
      );
    }

    // Eliminar la amistad
    await query({
      sql: `
        DELETE FROM amistades 
        WHERE 
          (usuario_id_1 = ? AND usuario_id_2 = ?) OR 
          (usuario_id_1 = ? AND usuario_id_2 = ?)
      `,
      args: [
        Math.min(userId, friendId),
        Math.max(userId, friendId),
        Math.min(userId, friendId),
        Math.max(userId, friendId)
      ]
    });

    // También eliminar cualquier invitación pendiente entre estos usuarios
    await query({
      sql: `
        DELETE FROM invitaciones_amistad 
        WHERE 
          (solicitante_id = ? AND solicitado_id = ?) OR 
          (solicitante_id = ? AND solicitado_id = ?)
      `,
      args: [userId, friendId, friendId, userId]
    });

    return NextResponse.json({
      success: true,
      message: 'Amistad eliminada correctamente',
      removed_friend_id: friendId
    });

  } catch (error) {
    console.error('Error al eliminar amistad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}