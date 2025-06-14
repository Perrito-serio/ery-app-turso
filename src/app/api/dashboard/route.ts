// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';

// --- Interfaces adaptadas para Turso/SQLite ---
interface HabitFromDB extends Row {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: string; // SQLite devuelve fechas como strings
}

interface HabitLogFromDB extends Row {
  habito_id: number;
  fecha_registro: string;
  valor_booleano: number | null; // SQLite devuelve 0 o 1 para booleanos
}

interface HabitWithStats extends HabitFromDB {
  racha_actual: number;
}

// --- Función Principal del Endpoint ---
export async function GET(request: NextRequest) {
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) { return errorResponse; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario.' }, { status: 401 });
  }

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
      sql: `SELECT habito_id, fecha_registro, valor_booleano FROM registros_habitos WHERE habito_id IN (${placeholders}) ORDER BY fecha_registro DESC`,
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
        let lastRelapseDate: Date | null = null;
        for (const log of habitLogs) {
            lastRelapseDate = new Date(log.fecha_registro);
            break;
        }
        const startDate = lastRelapseDate ? lastRelapseDate : new Date(habit.fecha_creacion);
        racha_actual = calculateDaysBetween(startDate, new Date());
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

// --- Funciones de Ayuda (sin cambios) ---
function calculateDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function calculateConsecutiveDays(logs: HabitLogFromDB[]): number {
  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  const logDates = new Set(logs.filter(log => log.valor_booleano === 1).map(log => {
      const d = new Date(log.fecha_registro);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
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
