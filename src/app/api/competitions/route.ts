// src/app/api/competitions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
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
  meta_objetivo: number;
  valor: number;
}

interface CompetitionWithCreator extends Competition {
  creador_nombre: string;
  participantes_count: number;
}

// --- Schemas de validación ---
const createCompetitionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  descripcion: z.string().max(500, 'La descripción es muy larga').optional(),
  tipo_meta: z.enum(['MAX_HABITOS_DIA', 'MAX_RACHA', 'TOTAL_COMPLETADOS'], {
    errorMap: () => ({ message: 'Tipo de meta inválido' })
  }),
  fecha_inicio: z.string().refine((date) => {
    const startDate = new Date(date);
    return !isNaN(startDate.getTime());
  }, 'Fecha de inicio inválida'),
  fecha_fin: z.string().refine((date) => {
    const endDate = new Date(date);
    return !isNaN(endDate.getTime());
  }, 'Fecha de fin inválida'),
  meta_objetivo: z.number().min(1, 'El objetivo debe ser mayor a 0'),
  valor: z.number().min(0.1, 'El valor debe ser mayor a 0'),
  invitados: z.array(z.string()).optional()
});

const updateCompetitionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo').optional(),
  descripcion: z.string().max(500, 'La descripción es muy larga').optional(),
  estado: z.enum(['activa', 'finalizada', 'cancelada']).optional()
});

// --- Funciones auxiliares ---
function validateDateRange(fecha_inicio: string, fecha_fin: string): boolean {
  const startDate = new Date(fecha_inicio);
  const endDate = new Date(fecha_fin);
  return endDate > startDate;
}

// --- Endpoints ---

/**
 * POST /api/competitions
 * Crear una nueva competencia
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (dual: web session o API token)
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
    const userId = authResult.user.id;

    // Validar datos de entrada
    const body = await request.json();
    const validationResult = createCompetitionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        message: 'Datos inválidos',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const { nombre, descripcion, tipo_meta, fecha_inicio, fecha_fin, meta_objetivo, valor } = validationResult.data;

    // Validar rango de fechas
    if (!validateDateRange(fecha_inicio, fecha_fin)) {
      return NextResponse.json({
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      }, { status: 400 });
    }

    // Crear la competencia
    const result = await query({
      sql: `INSERT INTO competencias (creador_id, nombre, descripcion, tipo_meta, fecha_inicio, fecha_fin, meta_objetivo, valor)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id`,
      args: [userId, nombre, descripcion || null, tipo_meta, fecha_inicio, fecha_fin, meta_objetivo, valor]
    });

    const competitionId = result.rows[0]?.id as number;

    // Agregar al creador como participante automáticamente
    await query({
      sql: `INSERT INTO competencia_participantes (competencia_id, usuario_id, puntuacion, fecha_union)
             VALUES (?, ?, ?, datetime('now'))`,
      args: [competitionId, userId, 0]
    });

    return NextResponse.json({
      message: 'Competencia creada exitosamente',
      competition_id: competitionId
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear competencia:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * GET /api/competitions
 * Obtener lista de competencias (activas y del usuario)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación (dual: web session o API token)
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
    const userId = authResult.user.id;

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'active', 'my_competitions', 'participating'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = '';
    let args: any[] = [];

    switch (filter) {
      case 'active':
        whereClause = 'WHERE c.estado = ?';
        args = ['activa'];
        break;
      case 'my_competitions':
        whereClause = 'WHERE c.creador_id = ?';
        args = [userId];
        break;
      case 'participating':
        whereClause = `WHERE EXISTS (
          SELECT 1 FROM competencia_participantes cp 
          WHERE cp.competencia_id = c.id AND cp.usuario_id = ?
        )`;
        args = [userId];
        break;
    }

    const result = await query({
      sql: `SELECT 
              c.*,
              u.nombre as creador_nombre,
              COUNT(cp.usuario_id) as participantes_count
            FROM competencias c
            JOIN usuarios u ON c.creador_id = u.id
            LEFT JOIN competencia_participantes cp ON c.id = cp.competencia_id
            ${whereClause}
            GROUP BY c.id, u.nombre
            ORDER BY c.fecha_creacion DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset]
    });

    const competitions = result.rows as CompetitionWithCreator[];

    return NextResponse.json({
      competitions,
      pagination: {
        limit,
        offset,
        total: competitions.length
      }
    });

  } catch (error) {
    console.error('Error al obtener competencias:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}