// src/app/api/rankings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface RankingEntry extends Row {
  usuario_id: number;
  nombre: string;
  foto_perfil_url: string | null;
  pais_codigo: string | null;
  valor: number; // El valor del ranking (ej. días de racha)
}

/**
 * GET /api/rankings
 * Calcula y devuelve los rankings de usuarios.
 * Por ahora, se enfoca en el ranking global de rachas de "malos hábitos".
 * * Parámetros de Query:
 * - scope=global (default) | country
 * - countryCode=PE (requerido si scope=country)
 * - limit=10 (default)
 */
export async function GET(request: NextRequest) {
  // Autenticación: cualquier usuario logueado puede ver los rankings.
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'global';
  const countryCode = searchParams.get('countryCode');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    let rankingQuery: string;
    const queryParams: (string | number)[] = [];

    // --- Lógica de Ranking para Malos Hábitos (Días sin Recaídas) ---
    // Esta consulta es compleja. Calcula los días desde la última recaída de cada usuario.
    const baseQuery = `
        SELECT
            u.id as usuario_id,
            u.nombre,
            u.foto_perfil_url,
            p.codigo as pais_codigo,
            -- Calcula los días desde la última recaída o desde la creación del hábito
            CAST(JULIANDAY('now') - JULIANDAY(
                COALESCE(
                    (SELECT MAX(rh.fecha_registro) FROM registros_habitos rh WHERE rh.habito_id = h.id),
                    h.fecha_creacion
                )
            ) AS INTEGER) AS valor
        FROM usuarios u
        JOIN habitos h ON h.usuario_id = u.id
        LEFT JOIN paises p ON u.pais_id = p.id
        WHERE h.tipo = 'MAL_HABITO'
    `;

    if (scope === 'country' && countryCode) {
      rankingQuery = `${baseQuery} AND p.codigo = ? ORDER BY valor DESC LIMIT ?`;
      queryParams.push(countryCode, limit);
    } else {
      rankingQuery = `${baseQuery} ORDER BY valor DESC LIMIT ?`;
      queryParams.push(limit);
    }
    
    const rankingResult = await query({
      sql: rankingQuery,
      args: queryParams,
    });

    const rankings = rankingResult.rows as unknown as RankingEntry[];

    return NextResponse.json({ rankings });

  } catch (error) {
    console.error("Error al calcular los rankings:", error);
    return NextResponse.json({ message: "Error interno del servidor al calcular los rankings." }, { status: 500 });
  }
}
