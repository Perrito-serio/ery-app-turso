// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
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
      sql: `SELECT habito_id, fecha_registro, valor_booleano, es_recaida FROM registros_habitos WHERE habito_id IN (${placeholders}) ORDER BY fecha_registro DESC`,
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
        
        // CORRECCIÓN: Usamos la función parseDateAsLocal para evitar problemas de zona horaria.
        const fechaInicioRacha = ultimaRecaida 
            ? parseDateAsLocal(ultimaRecaida.fecha_registro) 
            : parseDateAsLocal(habit.fecha_creacion);
        
        racha_actual = calculateDaysBetween(fechaInicioRacha, new Date());

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

// --- Funciones de Ayuda ---

// FUNCIÓN NUEVA: Parsea una fecha 'YYYY-MM-DD' como fecha local para evitar errores de UTC.
function parseDateAsLocal(dateString: string): Date {
    // Si la fecha incluye hora (ej. de 'fecha_creacion'), la quitamos.
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    // Creamos la fecha usando componentes numéricos para asegurar que sea local.
    // El mes en el constructor de Date es 0-indexado (0=Enero, 1=Febrero...).
    return new Date(year, month - 1, day);
}

function calculateDaysBetween(startDate: Date, endDate: Date): number {
    // Normalizamos ambas fechas a la medianoche para una comparación precisa.
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const diffTime = end.getTime() - start.getTime();
    
    // Si la diferencia es negativa o cero, la racha es 0.
    if (diffTime <= 0) {
        return 0;
    }
    
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}


function calculateConsecutiveDays(logs: HabitLogFromDB[]): number {
  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  const logDates = new Set(logs.filter(log => log.valor_booleano === 1).map(log => {
      // Usamos la nueva función segura para parsear.
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
