// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';

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
  es_recaida: number | null;
  valor_numerico: number | null; // Añadido para la lógica de racha
}

interface HabitWithStats extends HabitFromDB {
  racha_actual: number;
}

// --- Helper de Fecha (para corregir bug de zona horaria) ---
function parseDateAsLocal(dateString: string): Date {
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// --- Función Principal del Endpoint ---
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
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

    // Se añade `valor_numerico` a la consulta para usarlo en el cálculo de racha.
    const logsRs = await query({
      sql: `SELECT habito_id, fecha_registro, valor_booleano, valor_numerico, es_recaida FROM registros_habitos WHERE habito_id IN (${placeholders}) ORDER BY fecha_registro DESC`,
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
        const ultimaRecaida = habitLogs.find(log => log.es_recaida === 1);
        const fechaInicioRacha = ultimaRecaida 
            ? parseDateAsLocal(ultimaRecaida.fecha_registro) 
            : parseDateAsLocal(habit.fecha_creacion);
        
        const end = new Date();
        const start = fechaInicioRacha;
        // Si la recaída es hoy, la diferencia debe ser 0.
        if (end.getFullYear() === start.getFullYear() && end.getMonth() === start.getMonth() && end.getDate() === start.getDate()) {
            racha_actual = 0;
        } else {
            const diffTime = Math.abs(end.getTime() - start.getTime());
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

// --- Función de Ayuda para Rachas (Corregida) ---
function calculateConsecutiveDays(logs: HabitLogFromDB[]): number {
  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. CORRECCIÓN LÓGICA: Se filtra por valor_booleano O valor_numerico
  // Esto asegura que ambos tipos de hábitos positivos se cuenten.
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
