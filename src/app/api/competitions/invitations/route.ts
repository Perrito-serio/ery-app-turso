// src/app/api/competitions/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { Row } from '@libsql/client';
import { z } from 'zod';

// --- Interfaces ---
interface CompetitionInvitation extends Row {
  competition_id: number;
  competition_name: string;
  competition_description: string | null;
  competition_type: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  start_date: string;
  end_date: string;
  status: 'activa' | 'finalizada' | 'cancelada';
  creator_id: number;
  creator_name: string;
  creator_photo: string | null;
  participant_count: number;
  invited_at: string;
}

interface InvitationResponse {
  id: number;
  name: string;
  description: string | null;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  creator: {
    id: number;
    name: string;
    photo: string | null;
  };
  participant_count: number;
  invited_at: string;
  can_join: boolean;
  join_deadline: string | null;
}

// --- Esquemas de validación ---
const respondInvitationSchema = z.object({
  competition_id: z.number().int().positive(),
  action: z.enum(['accept', 'decline'])
});

// --- Funciones auxiliares ---
async function getPendingInvitations(userId: number): Promise<CompetitionInvitation[]> {
  const result = await query({
    sql: `
      SELECT 
        c.id as competition_id,
        c.nombre as competition_name,
        c.descripcion as competition_description,
        c.tipo_meta as competition_type,
        c.fecha_inicio as start_date,
        c.fecha_fin as end_date,
        c.estado as status,
        c.creador_id as creator_id,
        u.nombre as creator_name,
        u.foto_perfil_url as creator_photo,
        COUNT(cp.usuario_id) as participant_count,
        c.fecha_creacion as invited_at
      FROM competencias c
      JOIN usuarios u ON c.creador_id = u.id
      LEFT JOIN competencia_participantes cp ON c.id = cp.competencia_id
      WHERE c.id IN (
        SELECT DISTINCT c2.id
        FROM competencias c2
        JOIN amistades a ON (a.usuario_id_1 = c2.creador_id OR a.usuario_id_2 = c2.creador_id)
        WHERE (a.usuario_id_1 = ? OR a.usuario_id_2 = ?)
          AND c2.estado = 'activa'
          AND DATE(c2.fecha_inicio) > DATE('now')
          AND c2.id NOT IN (
            SELECT competencia_id 
            FROM competencia_participantes 
            WHERE usuario_id = ?
          )
      )
      GROUP BY c.id, c.nombre, c.descripcion, c.tipo_meta, c.fecha_inicio, 
               c.fecha_fin, c.estado, c.creador_id, u.nombre, u.foto_perfil_url, c.fecha_creacion
      ORDER BY c.fecha_creacion DESC
    `,
    args: [userId, userId, userId]
  });

  return result.rows as CompetitionInvitation[];
}

async function isUserFriendOfCreator(userId: number, creatorId: number): Promise<boolean> {
  const result = await query({
    sql: `
      SELECT 1 FROM amistades 
      WHERE (usuario_id_1 = ? AND usuario_id_2 = ?) OR (usuario_id_1 = ? AND usuario_id_2 = ?)
    `,
    args: [Math.min(userId, creatorId), Math.max(userId, creatorId), Math.min(userId, creatorId), Math.max(userId, creatorId)]
  });

  return result.rows.length > 0;
}

async function isUserAlreadyParticipant(userId: number, competitionId: number): Promise<boolean> {
  const result = await query({
    sql: 'SELECT 1 FROM competencia_participantes WHERE usuario_id = ? AND competencia_id = ?',
    args: [userId, competitionId]
  });

  return result.rows.length > 0;
}

async function getCompetitionDetails(competitionId: number): Promise<any> {
  const result = await query({
    sql: 'SELECT * FROM competencias WHERE id = ?',
    args: [competitionId]
  });

  return result.rows[0] || null;
}

async function joinCompetition(userId: number, competitionId: number): Promise<void> {
  await query({
    sql: 'INSERT INTO competencia_participantes (competencia_id, usuario_id, puntuacion, fecha_union) VALUES (?, ?, 0, datetime("now"))',
    args: [competitionId, userId]
  });
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

function canJoinCompetition(startDate: string): boolean {
  const start = new Date(startDate);
  const now = new Date();
  return start > now;
}

function getJoinDeadline(startDate: string): string | null {
  const start = new Date(startDate);
  const now = new Date();
  
  if (start <= now) {
    return null; // Ya no se puede unir
  }
  
  return startDate; // Se puede unir hasta la fecha de inicio
}

// --- Endpoints ---

/**
 * GET /api/competitions/invitations
 * Obtener invitaciones pendientes de competencias
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    const userId = parseInt(authResult.user.id, 10);

    // Obtener invitaciones pendientes
    const invitations = await getPendingInvitations(userId);

    if (invitations.length === 0) {
      return NextResponse.json({
        invitations: [],
        total: 0,
        message: 'No tienes invitaciones pendientes'
      });
    }

    // Formatear invitaciones
    const formattedInvitations: InvitationResponse[] = invitations.map(invitation => ({
      id: invitation.competition_id,
      name: invitation.competition_name,
      description: invitation.competition_description,
      type: getTypeDisplayName(invitation.competition_type),
      start_date: invitation.start_date,
      end_date: invitation.end_date,
      status: getStatusDisplayName(invitation.status),
      creator: {
        id: invitation.creator_id,
        name: invitation.creator_name,
        photo: invitation.creator_photo
      },
      participant_count: invitation.participant_count,
      invited_at: invitation.invited_at,
      can_join: canJoinCompetition(invitation.start_date),
      join_deadline: getJoinDeadline(invitation.start_date)
    }));

    return NextResponse.json({
      invitations: formattedInvitations,
      total: formattedInvitations.length
    });

  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * POST /api/competitions/invitations
 * Responder a una invitación de competencia (aceptar o rechazar)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    const userId = parseInt(authResult.user.id, 10);

    // Validar datos de entrada
    const body = await request.json();
    const validatedData = respondInvitationSchema.parse(body);
    const { competition_id, action } = validatedData;

    // Verificar que la competencia existe
    const competition = await getCompetitionDetails(competition_id);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Verificar que la competencia está activa
    if (competition.estado !== 'activa') {
      return NextResponse.json({
        message: 'La competencia no está activa'
      }, { status: 400 });
    }

    // Verificar que aún no ha comenzado
    if (!canJoinCompetition(competition.fecha_inicio)) {
      return NextResponse.json({
        message: 'Ya no es posible unirse a esta competencia'
      }, { status: 400 });
    }

    // Verificar que el usuario no es el creador
    if (competition.creador_id === userId) {
      return NextResponse.json({
        message: 'No puedes responder a tu propia competencia'
      }, { status: 400 });
    }

    // Verificar que el usuario es amigo del creador
    const isFriend = await isUserFriendOfCreator(userId, competition.creador_id);
    if (!isFriend) {
      return NextResponse.json({
        message: 'Solo los amigos pueden unirse a competencias'
      }, { status: 403 });
    }

    // Verificar que el usuario no está ya participando
    const isAlreadyParticipant = await isUserAlreadyParticipant(userId, competition_id);
    if (isAlreadyParticipant) {
      return NextResponse.json({
        message: 'Ya estás participando en esta competencia'
      }, { status: 400 });
    }

    if (action === 'accept') {
      // Unirse a la competencia
      await joinCompetition(userId, competition_id);
      
      return NextResponse.json({
        message: 'Te has unido exitosamente a la competencia',
        competition: {
          id: competition.id,
          name: competition.nombre,
          start_date: competition.fecha_inicio,
          end_date: competition.fecha_fin
        }
      });
    } else {
      // Rechazar invitación (no necesitamos hacer nada en la BD)
      return NextResponse.json({
        message: 'Invitación rechazada'
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        message: 'Datos de entrada inválidos',
        errors: error.errors
      }, { status: 400 });
    }

    console.error('Error al responder invitación:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}