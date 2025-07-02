// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

// --- Interfaces (sin cambios) ---
interface HabitFromDB extends Row {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: string;
}

interface HabitLogFromDB extends Row {
  habito_id: number;
  fecha_registro: string;
  valor_booleano: number | null;
  valor_numerico: number | null;
}

interface HabitWithStats extends HabitFromDB {
  racha_actual: number;
}

// --- Helpers de Fecha (con nueva función) ---
function parseDateAsLocal(dateString: string): Date {
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// --- INICIO DE LA MODIFICACIÓN 1: NUEVA FUNCIÓN HELPER ---
/**
 * Obtiene la fecha actual al inicio del día (medianoche) en UTC.
 * Esto evita problemas de zona horaria en el servidor.
 */
function getTodayAtUTCMidnight(): Date {
    const today = new Date();
    // Crea una nueva fecha usando los componentes UTC de la fecha actual
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}
// --- FIN DE LA MODIFICACIÓN 1 ---

function calculateConsecutiveDays(logs: HabitLogFromDB[]): number {
    let streak = 0;
    // --- MODIFICACIÓN 2: Usar la nueva función para consistencia ---
    let today = getTodayAtUTCMidnight();
    // --- FIN DE LA MODIFICACIÓN 2 ---

    const logDates = new Set(logs.filter(log => log.valor_booleano === 1 || log.valor_numerico != null).map(log => {
        return parseDateAsLocal(log.fecha_registro).getTime();
    }));

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

// --- Endpoint GET (Lógica de racha corregida) ---
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  
  if (!authResult.success) {
    const errorResponse = request.headers.has('Authorization')
        ? createApiTokenError(authResult)
        : createWebAuthError(authResult);
    return errorResponse;
  }

  const userId = authResult.user.id;

  try {
    // ... (el código para obtener hábitos y registros no cambia) ...
    const habitsRs = await query({
      sql: `SELECT * FROM habitos WHERE usuario_id = ?`,
      args: [userId]
    });
    const habits = habitsRs.rows as unknown as HabitFromDB[];

    if (habits.length === 0) {
      return NextResponse.json({ habits_con_estadisticas: [] });
    }

    const habitIds = habits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');

    const logsRs = await query({
      sql: `SELECT habito_id, fecha_registro, valor_booleano, valor_numerico FROM registros_habitos WHERE habito_id IN (${placeholders}) ORDER BY fecha_registro DESC`,
      args: habitIds
    });
    const logs = logsRs.rows as unknown as HabitLogFromDB[];
    
    const logsByHabitId = new Map<number, HabitLogFromDB[]>();
    for (const log of logs) {
      if (!logsByHabitId.has(log.habito_id)) {
        logsByHabitId.set(log.habito_id, []);
      }
      logsByHabitId.get(log.habito_id)!.push(log);
    }

    const habits_con_estadisticas: HabitWithStats[] = habits.map(habit => {
      const habitLogs = logsByHabitId.get(habit.id) || [];
      let racha_actual = 0;

      if (habit.tipo === 'MAL_HABITO') {
        // --- INICIO DE LA MODIFICACIÓN 3: Usar la nueva función de fecha ---
        const hoy = getTodayAtUTCMidnight();
        // --- FIN DE LA MODIFICACIÓN 3 ---

        const ultimaRecaidaLog = habitLogs[0];

        const fechaReferencia = ultimaRecaidaLog
            ? parseDateAsLocal(ultimaRecaidaLog.fecha_registro)
            : parseDateAsLocal(habit.fecha_creacion);

        if (fechaReferencia.getTime() >= hoy.getTime()) {
            racha_actual = 0;
        } else {
            const diffTime = hoy.getTime() - fechaReferencia.getTime();
            racha_actual = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

      } else {
        racha_actual = calculateConsecutiveDays(habitLogs);
      }
      
      return { ...habit, racha_actual };
    });

    return NextResponse.json({ habits_con_estadisticas });

  } catch (error) {
    console.error("Error al obtener los datos del dashboard:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
