// src/app/api/competitions/[id]/route.ts
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
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  fecha_creacion: string;
}

interface CompetitionDetails {
  id: number;
  creador_id: number;
  nombre: string;
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  fecha_creacion: string;
  creador_nombre: string;
  participantes_count: number;
  is_participant: boolean;
  is_creator: boolean;
}

interface RouteContext {
  params: {
    id: string;
  };
}

// --- Schema de validación ---
const updateCompetitionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo').optional(),
  descripcion: z.string().max(500, 'La descripción es muy larga').optional(),
  estado: z.enum(['activa', 'finalizada', 'cancelada']).optional()
});

// --- Funciones auxiliares ---
async function getCompetitionById(competitionId: number, userId: number): Promise<CompetitionDetails | null> {
  const result = await query({
    sql: `SELECT 
            c.*,
            u.nombre as creador_nombre,
            COUNT(cp.usuario_id) as participantes_count,
            CASE WHEN cp_user.usuario_id IS NOT NULL THEN 1 ELSE 0 END as is_participant,
            CASE WHEN c.creador_id = ? THEN 1 ELSE 0 END as is_creator
          FROM competencias c
          JOIN usuarios u ON c.creador_id = u.id
          LEFT JOIN competencia_participantes cp ON c.id = cp.competencia_id
          LEFT JOIN competencia_participantes cp_user ON c.id = cp_user.competencia_id AND cp_user.usuario_id = ?
          WHERE c.id = ?
          GROUP BY c.id, u.nombre, cp_user.usuario_id`,
    args: [userId, userId, competitionId]
  });

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as number,
    creador_id: row.creador_id as number,
    nombre: row.nombre as string,
    descripcion: row.descripcion as string | null,
    tipo_meta: row.tipo_meta as 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS',
    fecha_inicio: row.fecha_inicio as string,
    fecha_fin: row.fecha_fin as string,
    estado: row.estado as 'activa' | 'finalizada' | 'cancelada',
    fecha_creacion: row.fecha_creacion as string,
    creador_nombre: row.creador_nombre as string,
    participantes_count: row.participantes_count as number,
    is_participant: Boolean(row.is_participant),
    is_creator: Boolean(row.is_creator)
  };
}

async function checkCompetitionOwnership(competitionId: number, userId: number): Promise<boolean> {
  const result = await query({
    sql: 'SELECT creador_id FROM competencias WHERE id = ?',
    args: [competitionId]
  });

  if (result.rows.length === 0) return false;
  
  const row = result.rows[0];
  return row.creador_id === userId;
}

// --- Endpoints ---

/**
 * GET /api/competitions/[id]
 * Obtener detalles de una competencia específica
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

    // Obtener detalles de la competencia
    const competition = await getCompetitionById(competitionId, userId);

    if (!competition) {
      return NextResponse.json({
        message: 'Competencia no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({ competition });

  } catch (error) {
    console.error('Error al obtener competencia:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * PUT /api/competitions/[id]
 * Actualizar una competencia (solo el creador)
 */
export async function PUT(
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

    // Verificar que el usuario es el propietario de la competencia
    const isOwner = await checkCompetitionOwnership(competitionId, userId);
    if (!isOwner) {
      return NextResponse.json({
        message: 'No tienes permisos para modificar esta competencia'
      }, { status: 403 });
    }

    // Validar datos de entrada
    const body = await request.json();
    const validationResult = updateCompetitionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        message: 'Datos inválidos',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const updateData = validationResult.data;
    
    // Construir query dinámico
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updateData.nombre !== undefined) {
      updateFields.push('nombre = ?');
      updateValues.push(updateData.nombre);
    }
    if (updateData.descripcion !== undefined) {
      updateFields.push('descripcion = ?');
      updateValues.push(updateData.descripcion);
    }
    if (updateData.estado !== undefined) {
      updateFields.push('estado = ?');
      updateValues.push(updateData.estado);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        message: 'No hay campos para actualizar'
      }, { status: 400 });
    }

    // Actualizar la competencia
    updateValues.push(competitionId);
    await query({
      sql: `UPDATE competencias SET ${updateFields.join(', ')} WHERE id = ?`,
      args: updateValues
    });

    // Obtener la competencia actualizada
    const updatedCompetition = await getCompetitionById(competitionId, userId);

    return NextResponse.json({
      message: 'Competencia actualizada exitosamente',
      competition: updatedCompetition
    });

  } catch (error) {
    console.error('Error al actualizar competencia:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/competitions/[id]
 * Eliminar una competencia (solo el creador)
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

    // Verificar que el usuario sea el creador
    const isOwner = await checkCompetitionOwnership(competitionId, userId);
    if (!isOwner) {
      return NextResponse.json({
        message: 'No tienes permisos para eliminar esta competencia'
      }, { status: 403 });
    }

    // Eliminar la competencia (CASCADE eliminará participantes automáticamente)
    await query({
      sql: 'DELETE FROM competencias WHERE id = ?',
      args: [competitionId]
    });

    return NextResponse.json({
      message: 'Competencia eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar competencia:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}