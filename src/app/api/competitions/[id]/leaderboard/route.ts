// src/app/api/competitions/[id]/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface Competition extends Row {
  id: number;
  creador_id: number;
  nombre: string;
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
}

interface Participant extends Row {
  usuario_id: number;
  nombre: string;
  foto_perfil_url: string | null;
  puntuacion: number;
  fecha_union: string;
}

interface LeaderboardEntry {
  position: number;
  user_id: number;
  user_name: string;
  user_photo: string | null;
  score: number;
  join_date: string;
  is_current_user: boolean;
}

interface RouteContext {
  params: {
    id: string;
  };
}

// --- Funciones auxiliares ---
async function getCompetitionDetails(competitionId: number): Promise<Competition | null> {
  const result = await query({
    sql: 'SELECT * FROM competencias WHERE id = ?',
    args: [competitionId]
  });

  return result.rows[0] as Competition || null;
}

async function getParticipants(competitionId: number): Promise<Participant[]> {
  const result = await query({
    sql: `SELECT 
            cp.usuario_id,
            u.nombre,
            u.foto_perfil_url,
            cp.puntuacion,
            cp.fecha_union
          FROM competencia_participantes cp
          JOIN usuarios u ON cp.usuario_id = u.id
          WHERE cp.competencia_id = ?
          ORDER BY cp.puntuacion DESC, cp.fecha_union ASC`,
    args: [competitionId]
  });

  return result.rows as Participant[];
}

async function updateParticipantScores(competition: Competition): Promise<void> {
  const { id: competitionId, tipo_meta, fecha_inicio, fecha_fin } = competition;
  
  // Obtener todos los participantes
  const participants = await getParticipants(competitionId);
  
  for (const participant of participants) {
    let score = 0;
    
    switch (tipo_meta) {
      case 'MAX_HABITOS_DIA':
        score = await calculateMaxHabitsPerDay(participant.usuario_id, fecha_inicio, fecha_fin);
        break;
      case 'MAX_RACHA':
        score = await calculateMaxStreak(participant.usuario_id, fecha_inicio, fecha_fin);
        break;
      case 'TOTAL_COMPLETADOS':
        score = await calculateTotalCompleted(participant.usuario_id, fecha_inicio, fecha_fin);
        break;
    }
    
    // Actualizar puntuación
    await query({
      sql: 'UPDATE competencia_participantes SET puntuacion = ? WHERE competencia_id = ? AND usuario_id = ?',
      args: [score, competitionId, participant.usuario_id]
    });
  }
}

async function calculateMaxHabitsPerDay(userId: number, fechaInicio: string, fechaFin: string): Promise<number> {
  const result = await query({
    sql: `SELECT MAX(daily_count) as max_habits
          FROM (
            SELECT DATE(rh.fecha_registro) as fecha, COUNT(*) as daily_count
            FROM registros_habitos rh
            JOIN habitos h ON rh.habito_id = h.id
            WHERE h.usuario_id = ?
              AND DATE(rh.fecha_registro) >= DATE(?)
              AND DATE(rh.fecha_registro) <= DATE(?)
              AND (
                (h.tipo = 'SI_NO' AND rh.valor_booleano = 1) OR
                (h.tipo = 'MEDIBLE_NUMERICO' AND rh.valor_numerico > 0) OR
                (h.tipo = 'MAL_HABITO' AND rh.valor_booleano = 0)
              )
            GROUP BY DATE(rh.fecha_registro)
          ) daily_stats`,
    args: [userId, fechaInicio, fechaFin]
  });

  return (result.rows[0]?.max_habits as number) || 0;
}

async function calculateMaxStreak(userId: number, fechaInicio: string, fechaFin: string): Promise<number> {
  // Obtener todos los registros exitosos del usuario en el período
  const result = await query({
    sql: `SELECT DATE(rh.fecha_registro) as fecha
          FROM registros_habitos rh
          JOIN habitos h ON rh.habito_id = h.id
          WHERE h.usuario_id = ?
            AND DATE(rh.fecha_registro) >= DATE(?)
            AND DATE(rh.fecha_registro) <= DATE(?)
            AND (
              (h.tipo = 'SI_NO' AND rh.valor_booleano = 1) OR
              (h.tipo = 'MEDIBLE_NUMERICO' AND rh.valor_numerico > 0) OR
              (h.tipo = 'MAL_HABITO' AND rh.valor_booleano = 0)
            )
          GROUP BY DATE(rh.fecha_registro)
          ORDER BY DATE(rh.fecha_registro)`,
    args: [userId, fechaInicio, fechaFin]
  });

  const dates = result.rows.map(row => new Date(row.fecha as string));
  
  if (dates.length === 0) return 0;
  
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currentDate = dates[i];
    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return maxStreak;
}

async function calculateTotalCompleted(userId: number, fechaInicio: string, fechaFin: string): Promise<number> {
  const result = await query({
    sql: `SELECT COUNT(*) as total
          FROM registros_habitos rh
          JOIN habitos h ON rh.habito_id = h.id
          WHERE h.usuario_id = ?
            AND DATE(rh.fecha_registro) >= DATE(?)
            AND DATE(rh.fecha_registro) <= DATE(?)
            AND (
              (h.tipo = 'SI_NO' AND rh.valor_booleano = 1) OR
              (h.tipo = 'MEDIBLE_NUMERICO' AND rh.valor_numerico > 0) OR
              (h.tipo = 'MAL_HABITO' AND rh.valor_booleano = 0)
            )`,
    args: [userId, fechaInicio, fechaFin]
  });

  return (result.rows[0]?.total as number) || 0;
}

async function isUserParticipant(competitionId: number, userId: number): Promise<boolean> {
  const result = await query({
    sql: 'SELECT 1 FROM competencia_participantes WHERE competencia_id = ? AND usuario_id = ?',
    args: [competitionId, userId]
  });

  return result.rows.length > 0;
}

// --- Endpoints ---

/**
 * GET /api/competitions/[id]/leaderboard
 * Obtener el leaderboard de una competencia
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
    const competition = await getCompetitionDetails(competitionId);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Verificar que el usuario sea participante (opcional, dependiendo de si quieres que sea público)
    const isParticipant = await isUserParticipant(competitionId, userId);
    if (!isParticipant) {
      return NextResponse.json({
        message: 'Solo los participantes pueden ver el leaderboard'
      }, { status: 403 });
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const forceUpdate = searchParams.get('update') === 'true';
    
    // Actualizar puntuaciones si se solicita o si la competencia está activa
    if (forceUpdate || competition.estado === 'activa') {
      await updateParticipantScores(competition);
    }

    // Obtener participantes actualizados
    const participants = await getParticipants(competitionId);
    
    // Formatear leaderboard
    const leaderboard: LeaderboardEntry[] = participants.map((participant, index) => ({
      position: index + 1,
      user_id: participant.usuario_id,
      user_name: participant.nombre,
      user_photo: participant.foto_perfil_url,
      score: participant.puntuacion,
      join_date: participant.fecha_union,
      is_current_user: participant.usuario_id === userId
    }));

    // Encontrar posición del usuario actual
    const currentUserEntry = leaderboard.find(entry => entry.is_current_user);
    
    return NextResponse.json({
      competition: {
        id: competition.id,
        nombre: competition.nombre,
        descripcion: competition.descripcion,
        tipo_meta: competition.tipo_meta,
        estado: competition.estado,
        fecha_inicio: competition.fecha_inicio,
        fecha_fin: competition.fecha_fin
      },
      leaderboard,
      user_stats: {
        current_score: currentUserEntry?.score || 0,
        position: currentUserEntry?.position || null,
        total_participants: participants.length
      },
      current_user_position: currentUserEntry?.position || null,
      total_participants: participants.length,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener leaderboard:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * POST /api/competitions/[id]/leaderboard
 * Forzar actualización del leaderboard
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

    // Verificar que la competencia existe
    const competition = await getCompetitionDetails(competitionId);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Verificar que el usuario sea participante (opcional para forzar actualización)
    const isParticipant = await isUserParticipant(competitionId, userId);
    if (!isParticipant) {
      return NextResponse.json({
        message: 'Solo los participantes pueden actualizar el leaderboard'
      }, { status: 403 });
    }

    // Actualizar puntuaciones
    await updateParticipantScores(competition);

    return NextResponse.json({
      message: 'Leaderboard actualizado exitosamente',
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al actualizar leaderboard:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}