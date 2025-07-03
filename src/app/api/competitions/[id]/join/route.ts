// src/app/api/competitions/[id]/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface Competition extends Row {
  id: number;
  creador_id: number;
  estado: 'activa' | 'finalizada' | 'cancelada';
  fecha_inicio: string;
  fecha_fin: string;
}

interface RouteContext {
  params: {
    id: string;
  };
}

// --- Funciones auxiliares ---
async function getCompetitionStatus(competitionId: number): Promise<Competition | null> {
  const result = await query({
    sql: 'SELECT id, creador_id, estado, fecha_inicio, fecha_fin FROM competencias WHERE id = ?',
    args: [competitionId]
  });

  return result.rows[0] as Competition || null;
}

async function isUserParticipant(competitionId: number, userId: number): Promise<boolean> {
  const result = await query({
    sql: 'SELECT 1 FROM competencia_participantes WHERE competencia_id = ? AND usuario_id = ?',
    args: [competitionId, userId]
  });

  return result.rows.length > 0;
}

async function canJoinCompetition(competition: Competition): Promise<{ canJoin: boolean; reason?: string }> {
  // Verificar que la competencia esté activa
  if (competition.estado !== 'activa') {
    return { canJoin: false, reason: 'La competencia no está activa' };
  }

  // Verificar que no haya comenzado aún
  const now = new Date();
  const startDate = new Date(competition.fecha_inicio);
  
  if (now >= startDate) {
    return { canJoin: false, reason: 'La competencia ya ha comenzado' };
  }

  return { canJoin: true };
}

// --- Endpoints ---

/**
 * POST /api/competitions/[id]/join
 * Unirse a una competencia
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
    const competition = await getCompetitionStatus(competitionId);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Verificar que el usuario no sea ya participante
    const isAlreadyParticipant = await isUserParticipant(competitionId, userId);
    if (isAlreadyParticipant) {
      return NextResponse.json({
        message: 'Ya eres participante de esta competencia'
      }, { status: 400 });
    }

    // Verificar que se pueda unir a la competencia
    const { canJoin, reason } = await canJoinCompetition(competition);
    if (!canJoin) {
      return NextResponse.json({
        message: reason
      }, { status: 400 });
    }

    // Unirse a la competencia
    await query({
      sql: 'INSERT INTO competencia_participantes (competencia_id, usuario_id) VALUES (?, ?)',
      args: [competitionId, userId]
    });

    return NextResponse.json({
      message: 'Te has unido exitosamente a la competencia'
    }, { status: 201 });

  } catch (error) {
    console.error('Error al unirse a competencia:', error);
    
    // Manejar error de duplicado (por si acaso)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({
        message: 'Ya eres participante de esta competencia'
      }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/competitions/[id]/join
 * Salirse de una competencia
 */
export async function DELETE(
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
    const competition = await getCompetitionStatus(competitionId);
    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    // Verificar que el usuario no sea el creador
    if (competition.creador_id === userId) {
      return NextResponse.json({
        message: 'El creador no puede salirse de su propia competencia'
      }, { status: 400 });
    }

    // Verificar que el usuario sea participante
    const isParticipant = await isUserParticipant(competitionId, userId);
    if (!isParticipant) {
      return NextResponse.json({
        message: 'No eres participante de esta competencia'
      }, { status: 400 });
    }

    // Verificar que la competencia no haya comenzado
    const now = new Date();
    const startDate = new Date(competition.fecha_inicio);
    
    if (now >= startDate) {
      return NextResponse.json({
        message: 'No puedes salirte de una competencia que ya ha comenzado'
      }, { status: 400 });
    }

    // Salirse de la competencia
    await query({
      sql: 'DELETE FROM competencia_participantes WHERE competencia_id = ? AND usuario_id = ?',
      args: [competitionId, userId]
    });

    return NextResponse.json({
      message: 'Te has salido exitosamente de la competencia'
    });

  } catch (error) {
    console.error('Error al salirse de competencia:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}