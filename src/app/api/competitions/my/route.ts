// src/app/api/competitions/my/route.ts
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
  created_at: string;
}

interface UserCompetition {
  id: number;
  name: string;
  description: string | null;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  is_creator: boolean;
  participant_count: number;
  my_score: number;
  my_position: number | null;
  join_date?: string;
}

// --- Funciones auxiliares ---
async function getUserCompetitions(userId: number, status?: string): Promise<Competition[]> {
  let sql = `
    SELECT DISTINCT c.*
    FROM competencias c
    LEFT JOIN competencia_participantes cp ON c.id = cp.competencia_id
    WHERE (c.creador_id = ? OR cp.usuario_id = ?)
  `;
  
  const args: any[] = [userId, userId];
  
  if (status && ['activa', 'finalizada', 'cancelada'].includes(status)) {
    sql += ' AND c.estado = ?';
    args.push(status);
  }
  
  sql += ' ORDER BY c.fecha_creacion DESC';
  
  const result = await query({
    sql,
    args
  });

  return result.rows as Competition[];
}

async function getParticipantCount(competitionId: number): Promise<number> {
  const result = await query({
    sql: 'SELECT COUNT(*) as count FROM competencia_participantes WHERE competencia_id = ?',
    args: [competitionId]
  });

  const row = result.rows[0];
  return row ? Number(row.count) : 0;
}

async function getUserCompetitionData(competitionId: number, userId: number): Promise<{
  score: number;
  position: number | null;
  joinDate?: string;
}> {
  // Obtener datos del participante
  const participantResult = await query({
    sql: 'SELECT puntuacion, fecha_union FROM competencia_participantes WHERE competencia_id = ? AND usuario_id = ?',
    args: [competitionId, userId]
  });

  if (participantResult.rows.length === 0) {
    return { score: 0, position: null };
  }

  const participantData = participantResult.rows[0];
  const score = participantData.puntuacion as number;
  const joinDate = participantData.fecha_union as string;

  // Calcular posición
  const positionResult = await query({
    sql: `
      SELECT COUNT(*) + 1 as position
      FROM competencia_participantes
      WHERE competencia_id = ? 
        AND (puntuacion > ? OR (puntuacion = ? AND fecha_union < ?))
    `,
    args: [competitionId, score, score, joinDate]
  });

  const position = (positionResult.rows[0]?.position as number) || null;

  return {
    score,
    position,
    joinDate
  };
}

function getTypeDisplayName(tipo: string): string {
  switch (tipo) {
    case 'MAX_HABITOS_DIA':
      return 'Máximo hábitos por día';
    case 'MAX_RACHA':
      return 'Racha más larga';
    case 'TOTAL_COMPLETADOS':
      return 'Total completados';
    default:
      return tipo;
  }
}

function getStatusDisplayName(estado: string): string {
  switch (estado) {
    case 'activa':
      return 'Activa';
    case 'finalizada':
      return 'Finalizada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
}

// --- Endpoints ---

/**
 * GET /api/competitions/my
 * Obtener las competencias del usuario (donde participa o ha creado)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    const userId = parseInt(authResult.user.id, 10);

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'activa', 'finalizada', 'cancelada'
    const includeStats = searchParams.get('include_stats') === 'true';

    // Obtener competencias del usuario
    const competitions = await getUserCompetitions(userId, status ?? undefined);

    if (competitions.length === 0) {
      return NextResponse.json({
        competitions: [],
        total: 0,
        message: 'No tienes competencias'
      });
    }

    // Procesar cada competencia para obtener datos adicionales
    const userCompetitions: UserCompetition[] = [];

    for (const competition of competitions) {
      const competitionId = competition.id as number;
      const participantCount = await getParticipantCount(competitionId);
      const isCreator = competition.creador_id === userId;
      
      let userData: { score: number; position: number | null; joinDate?: string } = { score: 0, position: null, joinDate: undefined };
      
      if (includeStats) {
        userData = await getUserCompetitionData(competitionId, userId);
      }

      userCompetitions.push({
        id: competitionId,
        name: competition.nombre,
        description: competition.descripcion,
        type: getTypeDisplayName(competition.tipo_meta),
        start_date: competition.fecha_inicio,
        end_date: competition.fecha_fin,
        status: getStatusDisplayName(competition.estado),
        created_at: competition.fecha_creacion as string,
        is_creator: isCreator,
        participant_count: participantCount,
        my_score: userData.score,
        my_position: userData.position,
        join_date: userData.joinDate
      });
    }

    // Calcular estadísticas generales
    const stats = {
      total_competitions: userCompetitions.length,
      created_by_me: userCompetitions.filter(c => c.is_creator).length,
      participating_in: userCompetitions.filter(c => !c.is_creator).length,
      active: userCompetitions.filter(c => c.status === 'Activa').length,
      finished: userCompetitions.filter(c => c.status === 'Finalizada').length,
      cancelled: userCompetitions.filter(c => c.status === 'Cancelada').length
    };

    return NextResponse.json({
      competitions: userCompetitions,
      stats,
      total: userCompetitions.length
    });

  } catch (error) {
    console.error('Error al obtener competencias del usuario:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}