// src/app/api/friends/[friendId]/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { Row } from '@libsql/client';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

interface ActivityLogFromDB extends Row {
    fecha_registro: string;
    completados: number;
    recaidas: number;
}

interface DailyActivity {
    completions: number;
    hasRelapse: boolean;
}

/**
 * GET /api/friends/{friendId}/activity
 * Obtiene la actividad de un amigo específico.
 * Requiere verificación de amistad para proteger la privacidad.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
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

  const resolvedParams = await params;
  const userId = parseInt(authResult.user.id);
  const friendId = parseInt(resolvedParams.friendId);

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
      { error: 'No puedes ver tu propia actividad a través de este endpoint' },
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
      sql: 'SELECT id FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [friendId]
    });

    if (friendResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Validar parámetros de fecha
    const { searchParams } = new URL(request.url);
    const validation = schema.safeParse({
        year: searchParams.get('year'),
        month: searchParams.get('month'),
    });

    if (!validation.success) {
        return NextResponse.json({ 
          message: 'Año y mes son requeridos y deben ser válidos.', 
          errors: validation.error.flatten().fieldErrors 
        }, { status: 400 });
    }

    const { year, month } = validation.data;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate}`;

    // Obtener la actividad del amigo
    const activityRs = await query({
        sql: `
            SELECT
                r.fecha_registro,
                CAST(SUM(CASE
                    WHEN h.tipo IN ('SI_NO', 'MEDIBLE_NUMERICO') AND (r.valor_booleano = 1 OR r.valor_numerico IS NOT NULL) THEN 1
                    ELSE 0
                END) AS INTEGER) as completados,
                CAST(SUM(CASE WHEN h.tipo = 'MAL_HABITO' THEN 1 ELSE 0 END) AS INTEGER) as recaidas
            FROM registros_habitos r
            JOIN habitos h ON r.habito_id = h.id
            WHERE
                h.usuario_id = ? AND
                r.fecha_registro BETWEEN ? AND ?
            GROUP BY
                r.fecha_registro
        `,
        args: [friendId, startDate, endDateStr]
    });

    const activityData = activityRs.rows as unknown as ActivityLogFromDB[];

    const activityMap: Record<string, DailyActivity> = {};
    for (const row of activityData) {
        activityMap[row.fecha_registro] = {
            completions: row.completados,
            hasRelapse: row.recaidas > 0
        };
    }
    
    return NextResponse.json({
      success: true,
      activity: activityMap,
      friendId,
      year,
      month
    });

  } catch (error) {
    console.error('Error al obtener actividad del amigo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}