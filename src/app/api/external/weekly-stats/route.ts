// src/app/api/external/weekly-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { z } from 'zod';

// --- Funciones auxiliares para manejo de fechas ---
function parseDateAsLocal(dateString: string): Date {
  const dateOnly = dateString.split(' ')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Esquema de validación para los parámetros
const weeklyStatsSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD')
});

interface WeeklyStatsResponse {
  user_id: number;
  week_start: string;
  week_end: string;
  total_habits: number;
  completed_habits: number;
  success_percentage: number;
  total_relapses: number;
  best_streak: number;
  habits_with_activity: {
    habit_id: number;
    habit_name: string;
    habit_type: string;
    days_completed: number;
    current_streak: number;
    had_relapse: boolean;
  }[];
}

/**
 * GET /api/external/weekly-stats
 * Obtiene estadísticas semanales de hábitos para un usuario específico.
 * Protegido con API Key para uso con n8n.
 */
export async function GET(request: NextRequest) {
  try {
    // Validar API Key
    const apiKeyValidation = await verifyApiKey(request);
    if (!apiKeyValidation.success) {
      return NextResponse.json(
        { error: apiKeyValidation.error || 'API Key inválida o faltante' },
        { status: apiKeyValidation.status || 401 }
      );
    }

    // Obtener y validar parámetros
    const { searchParams } = new URL(request.url);
    const validation = weeklyStatsSchema.safeParse({
      user_id: searchParams.get('user_id'),
      week_start: searchParams.get('week_start')
    });

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { user_id, week_start } = validation.data;

    // Calcular fecha de fin de semana
    const startDate = new Date(week_start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const week_end = endDate.toISOString().split('T')[0];

    // Verificar que el usuario existe
    const userResult = await query({
      sql: 'SELECT id, nombre, email FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [user_id]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Obtener todos los hábitos del usuario
    const habitsResult = await query({
      sql: `SELECT id, nombre, tipo, fecha_creacion FROM habitos 
            WHERE usuario_id = ?`,
      args: [user_id]
    });

    const habits = habitsResult.rows as any[];

    if (habits.length === 0) {
      return NextResponse.json({
        user_id,
        week_start,
        week_end,
        total_habits: 0,
        completed_habits: 0,
        success_percentage: 0,
        total_relapses: 0,
        best_streak: 0,
        habits_with_activity: []
      });
    }

    // Obtener registros de la semana
    const habitIds = habits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');
    
    const weeklyLogsResult = await query({
      sql: `SELECT 
              rh.habito_id,
              rh.fecha_registro,
              rh.valor_booleano,
              rh.valor_numerico,
              h.nombre as habit_name,
              h.tipo as habit_type
            FROM registros_habitos rh
            JOIN habitos h ON rh.habito_id = h.id
            WHERE rh.habito_id IN (${placeholders})
              AND rh.fecha_registro BETWEEN ? AND ?
            ORDER BY rh.habito_id, rh.fecha_registro`,
      args: [...habitIds, week_start, week_end]
    });

    const weeklyLogs = weeklyLogsResult.rows as any[];

    // Obtener todos los registros para calcular rachas actuales
    const allLogsResult = await query({
      sql: `SELECT 
              rh.habito_id,
              rh.fecha_registro,
              rh.valor_booleano,
              rh.valor_numerico,
              h.tipo
            FROM registros_habitos rh
            JOIN habitos h ON rh.habito_id = h.id
            WHERE rh.habito_id IN (${placeholders})
            ORDER BY rh.habito_id, rh.fecha_registro DESC`,
      args: habitIds
    });

    const allLogs = allLogsResult.rows as any[];

    // Procesar estadísticas por hábito
    const habitsWithActivity = habits.map(habit => {
      const habitWeeklyLogs = weeklyLogs.filter(log => log.habito_id === habit.id);
      const habitAllLogs = allLogs.filter(log => log.habito_id === habit.id);
      
      let daysCompleted = 0;
      let hadRelapse = false;

      // Contar días completados y recaídas en la semana
      habitWeeklyLogs.forEach(log => {
        if (habit.tipo === 'MAL_HABITO') {
          // Para malos hábitos, cualquier registro es una recaída
          hadRelapse = true;
        } else if (habit.tipo === 'SI_NO') {
          // Para hábitos SI_NO, usar valor_booleano
          if (log.valor_booleano === 1) {
            daysCompleted++;
          }
        } else if (habit.tipo === 'MEDIBLE_NUMERICO') {
          // Para hábitos numéricos, verificar que tenga valor
          if (log.valor_numerico !== null && log.valor_numerico > 0) {
            daysCompleted++;
          }
        }
      });

      // Calcular racha actual
      let currentStreak = 0;
      if (habit.tipo === 'MAL_HABITO') {
        // Para malos hábitos, calcular días sin recaídas
        const lastRelapse = habitAllLogs.find(log => log.fecha_registro);
        if (lastRelapse) {
          const lastRelapseDate = parseDateAsLocal(lastRelapse.fecha_registro);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - lastRelapseDate.getTime();
          currentStreak = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // No hay recaídas registradas
          const habitCreationDate = new Date(habit.fecha_creacion || new Date());
          const today = new Date();
          const diffTime = today.getTime() - habitCreationDate.getTime();
          currentStreak = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      } else {
        // Para hábitos positivos, calcular días consecutivos
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filtrar fechas completadas según el tipo de hábito
        let completedLogs;
        if (habit.tipo === 'SI_NO') {
          completedLogs = habitAllLogs.filter(log => log.valor_booleano === 1);
        } else if (habit.tipo === 'MEDIBLE_NUMERICO') {
          completedLogs = habitAllLogs.filter(log => log.valor_numerico !== null && log.valor_numerico > 0);
        } else {
          completedLogs = [];
        }
        
        const completedDates = new Set(
          completedLogs.map(log => parseDateAsLocal(log.fecha_registro).getTime())
        );

        let currentDate = new Date(today);
        
        // Si no se completó hoy, empezar desde ayer
        if (!completedDates.has(currentDate.getTime())) {
          currentDate.setDate(currentDate.getDate() - 1);
        }

        while (completedDates.has(currentDate.getTime())) {
          currentStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        }
      }

      return {
        habit_id: habit.id,
        habit_name: habit.nombre,
        habit_type: habit.tipo,
        days_completed: daysCompleted,
        current_streak: currentStreak,
        had_relapse: hadRelapse
      };
    });

    // Calcular estadísticas generales
    const totalHabits = habits.length;
    const habitsWithPositiveActivity = habitsWithActivity.filter(h => 
      h.habit_type !== 'MAL_HABITO' ? h.days_completed > 0 : !h.had_relapse
    );
    const completedHabits = habitsWithPositiveActivity.length;
    const successPercentage = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
    const totalRelapses = habitsWithActivity.filter(h => h.had_relapse).length;
    const bestStreak = Math.max(...habitsWithActivity.map(h => h.current_streak), 0);

    const response: WeeklyStatsResponse = {
      user_id,
      week_start,
      week_end,
      total_habits: totalHabits,
      completed_habits: completedHabits,
      success_percentage: successPercentage,
      total_relapses: totalRelapses,
      best_streak: bestStreak,
      habits_with_activity: habitsWithActivity
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener estadísticas semanales:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}