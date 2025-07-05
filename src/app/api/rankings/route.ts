// src/app/api/rankings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface User extends Row {
  id: number;
  nombre: string;
  foto_perfil_url: string | null;
  pais_codigo: string | null;
}
interface Habit extends Row {
    id: number;
    usuario_id: number;
    tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
    fecha_creacion: string;
}
interface HabitLog extends Row {
    habito_id: number;
    fecha_registro: string;
    valor_booleano: number | null;
}
interface RankingEntry {
  usuario_id: number;
  nombre: string;
  foto_perfil_url: string | null;
  pais_codigo: string | null;
  valor: number;
}

// --- LÓGICA DE CÁLCULO DE RACHAS (REUTILIZADA DEL DASHBOARD) ---
// Estas funciones auxiliares garantizan que el cálculo sea idéntico al del dashboard.
function parseDateAsLocal(dateString: string): Date {
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function calculatePositiveStreak(logs: HabitLog[]): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logDates = new Set(logs.filter(log => log.valor_booleano === 1).map(log => parseDateAsLocal(log.fecha_registro).getTime()));

  let currentDate = new Date(today);
  if (!logDates.has(currentDate.getTime())) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (logDates.has(currentDate.getTime())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return streak;
}

function calculateNegativeStreak(logs: HabitLog[], creationDate: string): number {
    const ultimaRecaidaLog = logs[0]; // Logs vienen ordenados por fecha DESC
    const fechaInicioRacha = ultimaRecaidaLog 
        ? parseDateAsLocal(ultimaRecaidaLog.fecha_registro) 
        : parseDateAsLocal(creationDate);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (hoy.getTime() === fechaInicioRacha.getTime()) return 0;

    const diffTime = Math.abs(hoy.getTime() - fechaInicioRacha.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}


// --- ENDPOINT GET (LÓGICA REFACTORIZADA) ---
export async function GET(request: NextRequest) {
  // Autenticación (dual: web session o API token)
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

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'global';
  const countryCode = searchParams.get('countryCode');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    // 1. Obtener la lista de usuarios a clasificar
    let usersQuery = `
        SELECT u.id, u.nombre, u.foto_perfil_url, p.codigo as pais_codigo
        FROM usuarios u
        LEFT JOIN paises p ON u.pais_id = p.id
    `;
    const queryParams: (string | number)[] = [];

    if (scope === 'country' && countryCode) {
        usersQuery += ' WHERE p.codigo = ?';
        queryParams.push(countryCode);
    }
    
    const usersResult = await query({ sql: usersQuery, args: queryParams });
    const users = usersResult.rows as unknown as User[];

    if (users.length === 0) {
        return NextResponse.json({ rankings: [] });
    }

    // 2. Obtener TODOS los hábitos y registros relevantes de una sola vez para optimizar
    const userIds = users.map(u => u.id);
    const placeholders = userIds.map(() => '?').join(',');

    const habitsResult = await query({ sql: `SELECT id, usuario_id, tipo, fecha_creacion FROM habitos WHERE usuario_id IN (${placeholders})`, args: userIds });
    const allHabits = habitsResult.rows as unknown as Habit[];

    const habitIds = allHabits.map(h => h.id);
    let allLogs: HabitLog[] = [];
    if (habitIds.length > 0) {
        const logsResult = await query({ sql: `SELECT habito_id, fecha_registro, valor_booleano FROM registros_habitos WHERE habito_id IN (${habitIds.map(() => '?').join(',')}) ORDER BY fecha_registro DESC`, args: habitIds });
        allLogs = logsResult.rows as unknown as HabitLog[];
    }

    // 3. Procesar los datos en JavaScript para calcular la mejor racha de cada usuario
    const rankings: RankingEntry[] = users.map(user => {
        const userHabits = allHabits.filter(h => h.usuario_id === user.id);
        let bestStreak = 0;

        for (const habit of userHabits) {
            const habitLogs = allLogs.filter(l => l.habito_id === habit.id);
            let currentHabitStreak = 0;

            if (habit.tipo === 'MAL_HABITO') {
                currentHabitStreak = calculateNegativeStreak(habitLogs, habit.fecha_creacion);
            } else {
                currentHabitStreak = calculatePositiveStreak(habitLogs);
            }

            if (currentHabitStreak > bestStreak) {
                bestStreak = currentHabitStreak;
            }
        }

        return {
            usuario_id: user.id,
            nombre: user.nombre,
            foto_perfil_url: user.foto_perfil_url,
            pais_codigo: user.pais_codigo,
            valor: bestStreak,
        };
    });

    // 4. Ordenar y limitar los resultados
    const sortedRankings = rankings.sort((a, b) => b.valor - a.valor).slice(0, limit);

    return NextResponse.json({ rankings: sortedRankings });

  } catch (error) {
    console.error("Error al calcular los rankings:", error);
    return NextResponse.json({ message: "Error interno del servidor al calcular los rankings." }, { status: 500 });
  }
}
