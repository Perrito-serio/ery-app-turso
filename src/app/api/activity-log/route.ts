// src/app/api/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { Row } from '@libsql/client';

// --- PASO 1: Importar AMBOS validadores de autenticación ---
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';


// Esquema para validar los parámetros de entrada (sin cambios)
const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// --- Interfaces (sin cambios) ---
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
    // --- PASO 2: Implementar la lógica de autenticación DUAL ---
    let authResult;
    if (request.headers.has('Authorization')) {
      // Si la cabecera existe, es una petición de API móvil (Flutter)
      authResult = await verifyApiToken(request);
    } else {
      // Si no, es una petición web con cookie de sesión
      authResult = await getAuthenticatedUser(request);
    }

    // Si la autenticación falla, por cualquier método...
    if (!authResult.success) {
      const errorResponse = request.headers.has('Authorization')
        ? createApiTokenError(authResult)
        : createWebAuthError(authResult);
      return errorResponse;
    }
    // --- FIN DE LOS CAMBIOS DE AUTENTICACIÓN ---
    
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
        const activityRs = await query({
            sql: `
                SELECT
                    r.fecha_registro,
                    CAST(SUM(CASE
                        WHEN h.tipo = 'SI_NO' AND r.valor_booleano = 1 THEN 1
                        WHEN h.tipo = 'MEDIBLE_NUMERICO' AND r.valor_numerico IS NOT NULL THEN 1
                        ELSE 0
                    END) AS INTEGER) as completados,
                    CAST(SUM(CASE WHEN h.tipo = 'MAL_HABITO' AND r.es_recaida = 1 THEN 1 ELSE 0 END) AS INTEGER) as recaidas
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