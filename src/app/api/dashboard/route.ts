// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils'; 
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth'; 

// --- Interfaces ---
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

// --- Helpers de Fecha ---
function parseDateAsLocal(dateString: string): Date {
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function calculateConsecutiveDays(logs: HabitLogFromDB[]): number {
  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  const logDates = new Set(logs.filter(log => log.valor_booleano === 1 || log.valor_numerico != null).map(log => {
      return parseDateAsLocal(log.fecha_registro).getTime();
  }));

  let currentDate = new Date(today);
  
  // Si no se completó hoy, la racha empieza desde ayer.
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

  try {
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

      // --- LÓGICA DE RACHA CORREGIDA ---
      if (habit.tipo === 'MAL_HABITO') {
        // La racha es el número de días desde la última recaída.
        // Un registro en la tabla para un MAL_HABITO *es* una recaída.
        const ultimaRecaidaLog = habitLogs[0]; // Los logs ya vienen ordenados por fecha DESC.
        
        const fechaInicioRacha = ultimaRecaidaLog 
            ? parseDateAsLocal(ultimaRecaidaLog.fecha_registro) 
            : parseDateAsLocal(habit.fecha_creacion);
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Si la última recaída fue hoy o es una fecha futura (lo cual no debería ocurrir),
        // la racha es 0.
        if (fechaInicioRacha >= hoy) {
            racha_actual = 0;
        } else {
            // Calculamos la diferencia de días entre hoy y la última recaída.
            const diffTime = Math.abs(hoy.getTime() - fechaInicioRacha.getTime());
            racha_actual = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

      } else { // Para SI_NO y MEDIBLE_NUMERICO
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
