// src/app/api/friends/[friendId]/achievements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface AchievementFromDB extends Row {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
}

interface UserAchievementFromDB extends Row {
  logro_id: number;
  fecha_obtencion: string;
}

// Interfaz para la respuesta final
interface FriendAchievement {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  fecha_obtencion: string;
}

/**
 * GET /api/friends/{friendId}/achievements
 * Obtiene los logros obtenidos por un amigo específico.
 * Requiere verificación de amistad para proteger la privacidad.
 */
export async function GET(
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

  // Validar que friendId sea un número válido
  if (isNaN(friendId)) {
    return NextResponse.json(
      { error: 'ID de amigo inválido' },
      { status: 400 }
    );
  }

  // Validar que no sea el mismo usuario
  if (userId === friendId) {
    return NextResponse.json(
      { error: 'No puedes ver tus propios logros a través de este endpoint' },
      { status: 400 }
    );
  }

  try {
    // Verificar que existe una amistad entre los usuarios
    const friendshipResult = await query({
      sql: `
        SELECT 1 FROM amistades 
        WHERE (usuario_id_1 = ? AND usuario_id_2 = ?) 
           OR (usuario_id_1 = ? AND usuario_id_2 = ?)
      `,
      args: [Math.min(userId, friendId), Math.max(userId, friendId), Math.min(userId, friendId), Math.max(userId, friendId)]
    });

    if (friendshipResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No tienes una amistad con este usuario' },
        { status: 403 }
      );
    }

    // Verificar que el amigo existe y está activo
    const friendResult = await query({
      sql: 'SELECT id, nombre FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [friendId]
    });

    if (friendResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const friendInfo = friendResult.rows[0] as unknown as { id: number; nombre: string };

    // Obtener los logros del amigo con información completa
    const achievementsResult = await query({
      sql: `
        SELECT 
          l.id,
          l.nombre,
          l.descripcion,
          l.icono_url,
          ul.fecha_obtencion
        FROM usuario_logros ul
        JOIN logros l ON ul.logro_id = l.id
        WHERE ul.usuario_id = ?
        ORDER BY ul.fecha_obtencion DESC
      `,
      args: [friendId]
    });

    const achievements = achievementsResult.rows as unknown as FriendAchievement[];

    return NextResponse.json({
      success: true,
      achievements,
      friendId,
      friendName: friendInfo.nombre,
      total: achievements.length
    });

  } catch (error) {
    console.error('Error al obtener logros del amigo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}