// src/app/api/activity-log/route.ts
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const validation = schema.safeParse({
        year: searchParams.get('year'),
        month: searchParams.get('month'),
    });

    if (!validation.success) {
        return NextResponse.json({ message: 'Año y mes son requeridos y deben ser válidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { year, month } = validation.data;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate}`;

    try {
        // --- CONSULTA SQL CORREGIDA ---
        // Se elimina la referencia a 'es_recaida'. Un registro para un MAL_HABITO es una recaída.
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
            args: [userId, startDate, endDateStr]
        });

        const activityData = activityRs.rows as unknown as ActivityLogFromDB[];

        const activityMap: Record<string, DailyActivity> = {};
        for (const row of activityData) {
            activityMap[row.fecha_registro] = {
                completions: row.completados,
                hasRelapse: row.recaidas > 0
            };
        }
        
        return NextResponse.json(activityMap);

    } catch (error) {
        console.error("Error al obtener el registro de actividad:", error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
