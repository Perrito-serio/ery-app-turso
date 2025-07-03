// src/app/api/competitions/[id]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { z } from 'zod';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface Competition extends Row {
  id: number;
  creador_id: number;
  nombre: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  fecha_inicio: string;
  fecha_fin: string;
  meta_objetivo: number;
  valor: number;
}

interface Friend extends Row {
  usuario_id_1: number;
  usuario_id_2: number;
}

interface User extends Row {
  id: number;
  nombre: string;
  email: string;
}

interface RouteContext {
  params: {
    id: string;
  };
}

// --- Schema de validación ---
const inviteSchema = z.object({
  friend_ids: z.array(z.number().positive('ID de usuario inválido')).min(1, 'Debes invitar al menos a un amigo').max(10, 'Máximo 10 invitaciones por vez')
});

// --- Funciones auxiliares ---
async function getCompetitionForInvite(competitionId: number): Promise<Competition | null> {
  const result = await query({
    sql: 'SELECT id, creador_id, nombre, estado, fecha_inicio, fecha_fin FROM competencias WHERE id = ?',
    args: [competitionId]
  });

  return result.rows[0] as Competition || null;
}

async function areFriends(userId1: number, userId2: number): Promise<boolean> {
  const result = await query({
    sql: `SELECT 1 FROM amistades 
          WHERE ((usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?))
            AND estado = 'aceptada'`,
    args: [userId1, userId2, userId2, userId1]
  });

  return result.rows.length > 0;
}

async function isUserParticipant(competitionId: number, userId: number): Promise<boolean> {
  const result = await query({
    sql: 'SELECT 1 FROM competencia_participantes WHERE competencia_id = ? AND usuario_id = ?',
    args: [competitionId, userId]
  });

  return result.rows.length > 0;
}

async function getUsersByIds(userIds: number[]): Promise<User[]> {
  if (userIds.length === 0) return [];
  
  const placeholders = userIds.map(() => '?').join(',');
  const result = await query({
    sql: `SELECT id, nombre, email FROM usuarios WHERE id IN (${placeholders}) AND estado = 'activo'`,
    args: userIds
  });

  return result.rows as User[];
}

async function canInviteToCompetition(competition: Competition): Promise<{ canInvite: boolean; reason?: string }> {
  // Verificar que la competencia esté activa
  if (competition.estado !== 'activa') {
    return { canInvite: false, reason: 'La competencia no está activa' };
  }

  // Verificar que no haya comenzado aún
  const now = new Date();
  const startDate = new Date(competition.fecha_inicio);
  
  if (now >= startDate) {
    return { canInvite: false, reason: 'La competencia ya ha comenzado' };
  }

  return { canInvite: true };
}

// --- Endpoints ---

/**
 * POST /api/competitions/[id]/invite
 * Invitar amigos a una competencia
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar autenticación
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    const userId = parseInt(authResult.user.id, 10);

    const { id } = await params;
    const competitionId = parseInt(id, 10);

    if (isNaN(competitionId)) {
      return NextResponse.json({
        message: 'ID de competencia inválido'
      }, { status: 400 });
    }

    // Validar datos de entrada
    const body = await request.json();
    const validationResult = inviteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        message: 'Datos inválidos',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const { friend_ids } = validationResult.data;

    // Verificar que la competencia existe
    const competition = await getCompetitionForInvite(competitionId);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Verificar que el usuario sea participante de la competencia
    const isParticipant = await isUserParticipant(competitionId, userId);
    if (!isParticipant) {
      return NextResponse.json({
        message: 'Solo los participantes pueden invitar a otros usuarios'
      }, { status: 403 });
    }

    // Verificar que se pueda invitar a la competencia
    const { canInvite, reason } = await canInviteToCompetition(competition);
    if (!canInvite) {
      return NextResponse.json({
        message: reason
      }, { status: 400 });
    }

    // Verificar que los usuarios existen
    const users = await getUsersByIds(friend_ids);
    const existingUserIds = users.map(u => u.id);
    const nonExistentIds = friend_ids.filter(id => !existingUserIds.includes(id));
    
    if (nonExistentIds.length > 0) {
      return NextResponse.json({
        message: `Usuarios no encontrados: ${nonExistentIds.join(', ')}`
      }, { status: 400 });
    }

    // Verificar relaciones de amistad y estado de participación
    const inviteResults = [];
    
    for (const friendId of friend_ids) {
      // No puede invitarse a sí mismo
      if (friendId === userId) {
        inviteResults.push({
          user_id: friendId,
          status: 'error',
          message: 'No puedes invitarte a ti mismo'
        });
        continue;
      }

      // Verificar amistad
      const isFriend = await areFriends(userId, friendId);
      if (!isFriend) {
        inviteResults.push({
          user_id: friendId,
          status: 'error',
          message: 'No son amigos'
        });
        continue;
      }

      // Verificar si ya es participante
      const isAlreadyParticipant = await isUserParticipant(competitionId, friendId);
      if (isAlreadyParticipant) {
        inviteResults.push({
          user_id: friendId,
          status: 'already_participant',
          message: 'Ya es participante de la competencia'
        });
        continue;
      }

      // Agregar a la competencia automáticamente (invitación directa)
      try {
        await query({
          sql: 'INSERT INTO competencia_participantes (competencia_id, usuario_id) VALUES (?, ?)',
          args: [competitionId, friendId]
        });
        
        const user = users.find(u => u.id === friendId);
        inviteResults.push({
          user_id: friendId,
          user_name: user?.nombre,
          status: 'invited',
          message: 'Invitado exitosamente'
        });
      } catch (error) {
        inviteResults.push({
          user_id: friendId,
          status: 'error',
          message: 'Error al procesar invitación'
        });
      }
    }

    const successfulInvites = inviteResults.filter(r => r.status === 'invited').length;
    
    return NextResponse.json({
      message: `Proceso de invitación completado. ${successfulInvites} invitaciones exitosas.`,
      competition_name: competition.nombre,
      results: inviteResults
    });

  } catch (error) {
    console.error('Error al invitar a competencia:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * GET /api/competitions/[id]/invite
 * Obtener lista de amigos que pueden ser invitados
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar autenticación
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    const userId = parseInt(authResult.user.id, 10);

    const { id } = await params;
    const competitionId = parseInt(id, 10);

    if (isNaN(competitionId)) {
      return NextResponse.json({
        message: 'ID de competencia inválido'
      }, { status: 400 });
    }

    // Verificar que la competencia existe
    const competition = await getCompetitionForInvite(competitionId);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Obtener amigos que no son participantes de la competencia
    const result = await query({
      sql: `SELECT DISTINCT
              CASE 
                WHEN a.usuario_id_1 = ? THEN u2.id
                ELSE u1.id
              END as friend_id,
              CASE 
                WHEN a.usuario_id_1 = ? THEN u2.nombre
                ELSE u1.nombre
              END as friend_name,
              CASE 
                WHEN a.usuario_id_1 = ? THEN u2.foto_perfil_url
                ELSE u1.foto_perfil_url
              END as friend_photo
            FROM amistades a
            JOIN usuarios u1 ON a.usuario_id_1 = u1.id
            JOIN usuarios u2 ON a.usuario_id_2 = u2.id
            WHERE (a.usuario_id_1 = ? OR a.usuario_id_2 = ?)
              AND a.estado = 'aceptada'
              AND u1.estado = 'activo' AND u2.estado = 'activo'
              AND NOT EXISTS (
                SELECT 1 FROM competencia_participantes cp 
                WHERE cp.competencia_id = ? 
                  AND cp.usuario_id = CASE 
                    WHEN a.usuario_id_1 = ? THEN u2.id
                    ELSE u1.id
                  END
              )
            ORDER BY friend_name`,
      args: [userId, userId, userId, userId, userId, competitionId, userId]
    });

    const availableFriends = result.rows.map(row => ({
      id: row.friend_id,
      name: row.friend_name,
      photo_url: row.friend_photo
    }));

    return NextResponse.json({
      competition_name: competition.nombre,
      available_friends: availableFriends
    });

  } catch (error) {
    console.error('Error al obtener amigos disponibles:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}