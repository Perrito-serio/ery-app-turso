// src/app/api/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { z } from 'zod';
import { Row } from '@libsql/client';

// Esquema para validar los parámetros de entrada (mes y año)
const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// --- Interfaces para los datos de la base de datos ---
interface ActivityLogFromDB extends Row {
    fecha_registro: string;
    completados: number; // CAST a number ya que COUNT devuelve BigInt
    recaidas: number; // CAST a number
}

// Interfaz para la respuesta final de la API
interface DailyActivity {
    completions: number;
    hasRelapse: boolean;
}

export async function GET(request: NextRequest) {
    const { session, errorResponse } = await verifyApiAuth();
    if (errorResponse) { return errorResponse; }
    
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ message: 'Usuario no autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const validation = schema.safeParse({
        year: searchParams.get('year'),
        month: searchParams.get('month'),
    });

    if (!validation.success) {
        return NextResponse.json({ message: 'Año y mes son requeridos y deben ser válidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { year, month } = validation.data;

    // Formatear las fechas de inicio y fin del mes para la consulta SQL
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate(); // Obtiene el último día del mes
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate}`;

    try {
        // Consulta SQL optimizada que agrupa por día
        const activityRs = await query({
            sql: `
                SELECT
                    r.fecha_registro,
                    CAST(SUM(CASE WHEN h.tipo != 'MAL_HABITO' AND r.valor_booleano = 1 THEN 1 ELSE 0 END) AS INTEGER) as completados,
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

        // Mapeamos los resultados a un formato más útil para el frontend
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
