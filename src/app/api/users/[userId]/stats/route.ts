// src/app/api/users/[userId]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

// --- Funciones auxiliares para manejo de fechas ---
function parseDateAsLocal(dateString: string): Date {
  const dateOnly = dateString.split(' ')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface UserStatsResponse {
  user_id: number;
  total_habits_completed: number;
  longest_streak: number;
  current_streak: number;
  total_achievements: number;
  join_date: string;
}

/**
 * GET /api/users/[userId]/stats
 * Obtiene estadísticas completas de un usuario específico.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verificar autenticación
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

    const resolvedParams = await params;
    const requestingUserId = parseInt(authResult.user.id, 10);
    const targetUserId = parseInt(resolvedParams.userId, 10);

    // Verificar que el usuario existe
    const userResult = await query({
      sql: 'SELECT id, nombre, email, fecha_creacion FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0] as any;

    // Verificar permisos: solo el propio usuario o sus amigos pueden ver las estadísticas
    if (requestingUserId !== targetUserId) {
      const friendshipResult = await query({
        sql: `SELECT 1 FROM amistades 
              WHERE usuario_id_1 = ? AND usuario_id_2 = ?`,
        args: [
          Math.min(requestingUserId, targetUserId),
          Math.max(requestingUserId, targetUserId)
        ]
      });

      if (friendshipResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No tienes permiso para ver las estadísticas de este usuario' },
          { status: 403 }
        );
      }
    }

    // Obtener todos los hábitos del usuario
    const habitsResult = await query({
      sql: `SELECT id, nombre, tipo, fecha_creacion FROM habitos 
            WHERE usuario_id = ?`,
      args: [targetUserId]
    });

    const habits = habitsResult.rows as any[];

    if (habits.length === 0) {
      // Obtener logros
      const achievementsResult = await query({
        sql: 'SELECT COUNT(*) as total FROM usuario_logros WHERE usuario_id = ?',
        args: [targetUserId]
      });
      const totalAchievements = (achievementsResult.rows[0] as any)?.total || 0;

      return NextResponse.json({
        user_id: targetUserId,
        total_habits_completed: 0,
        longest_streak: 0,
        current_streak: 0,
        total_achievements: totalAchievements,
        join_date: user.fecha_creacion
      });
    }

    // Obtener todos los registros para calcular estadísticas
    const habitIds = habits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');
    
    const allLogsResult = await query({
      sql: `SELECT 
              rh.habito_id,
              rh.fecha_registro,
              rh.valor_booleano,
              rh.valor_numerico,
              h.tipo,
              h.fecha_creacion as habit_creation_date
            FROM registros_habitos rh
            JOIN habitos h ON rh.habito_id = h.id
            WHERE rh.habito_id IN (${placeholders})
            ORDER BY rh.habito_id, rh.fecha_registro DESC`,
      args: habitIds
    });

    const allLogs = allLogsResult.rows as any[];

    // Calcular estadísticas por hábito
    let totalHabitsCompleted = 0;
    let longestStreak = 0;
    let currentStreakSum = 0;

    habits.forEach(habit => {
      const habitLogs = allLogs.filter(log => log.habito_id === habit.id);
      
      // Contar completaciones totales
      let habitCompletions = 0;
      if (habit.tipo === 'MAL_HABITO') {
        // Para malos hábitos, contar días sin recaídas desde la creación
        const habitCreationDate = parseDateAsLocal(habit.fecha_creacion);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calcular días totales desde la creación
        const totalDays = Math.floor((today.getTime() - habitCreationDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Restar días con recaídas
        const relapseDays = habitLogs.length;
        habitCompletions = Math.max(0, totalDays - relapseDays);
      } else {
        // Para hábitos positivos, contar registros exitosos
        if (habit.tipo === 'SI_NO') {
          habitCompletions = habitLogs.filter(log => log.valor_booleano === 1).length;
        } else if (habit.tipo === 'MEDIBLE_NUMERICO') {
          habitCompletions = habitLogs.filter(log => log.valor_numerico !== null && log.valor_numerico > 0).length;
        }
      }
      
      totalHabitsCompleted += habitCompletions;

      // Calcular racha actual y máxima para este hábito
      let currentStreak = 0;
      let maxStreakForHabit = 0;
      
      if (habit.tipo === 'MAL_HABITO') {
        // Para malos hábitos, calcular días sin recaídas
        const lastRelapse = habitLogs[0]; // Los logs están ordenados por fecha DESC
        if (lastRelapse) {
          const lastRelapseDate = parseDateAsLocal(lastRelapse.fecha_registro);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - lastRelapseDate.getTime();
          currentStreak = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // No hay recaídas registradas
          const habitCreationDate = parseDateAsLocal(habit.fecha_creacion);
          const today = new Date();
          const diffTime = today.getTime() - habitCreationDate.getTime();
          currentStreak = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
        maxStreakForHabit = currentStreak; // Para malos hábitos, la racha actual es la máxima
      } else {
        // Para hábitos positivos, calcular rachas consecutivas
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filtrar fechas completadas según el tipo de hábito
        let completedLogs;
        if (habit.tipo === 'SI_NO') {
          completedLogs = habitLogs.filter(log => log.valor_booleano === 1);
        } else if (habit.tipo === 'MEDIBLE_NUMERICO') {
          completedLogs = habitLogs.filter(log => log.valor_numerico !== null && log.valor_numerico > 0);
        } else {
          completedLogs = [];
        }
        
        const completedDates = new Set(
          completedLogs.map(log => parseDateAsLocal(log.fecha_registro).getTime())
        );

        // Calcular racha actual
        let currentDate = new Date(today);
        
        // Si no se completó hoy, empezar desde ayer
        if (!completedDates.has(currentDate.getTime())) {
          currentDate.setDate(currentDate.getDate() - 1);
        }

        while (completedDates.has(currentDate.getTime())) {
          currentStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        }

        // Calcular racha máxima histórica
        const sortedDates = Array.from(completedDates).sort((a, b) => a - b);
        let tempStreak = 0;
        let previousDate = null;
        
        for (const dateTime of sortedDates) {
          const currentDateObj = new Date(dateTime);
          
          if (previousDate === null) {
            tempStreak = 1;
          } else {
            const daysDiff = Math.floor((dateTime - previousDate) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
              tempStreak++;
            } else {
              tempStreak = 1;
            }
          }
          
          maxStreakForHabit = Math.max(maxStreakForHabit, tempStreak);
          previousDate = dateTime;
        }
      }
      
      currentStreakSum += currentStreak;
      longestStreak = Math.max(longestStreak, maxStreakForHabit);
    });

    // Obtener logros
    const achievementsResult = await query({
      sql: 'SELECT COUNT(*) as total FROM usuario_logros WHERE usuario_id = ?',
      args: [targetUserId]
    });
    const totalAchievements = (achievementsResult.rows[0] as any)?.total || 0;

    // Calcular racha actual promedio (o usar la máxima racha actual)
    const averageCurrentStreak = habits.length > 0 ? Math.round(currentStreakSum / habits.length) : 0;

    const response: UserStatsResponse = {
      user_id: targetUserId,
      total_habits_completed: totalHabitsCompleted,
      longest_streak: longestStreak,
      current_streak: averageCurrentStreak,
      total_achievements: totalAchievements,
      join_date: user.fecha_creacion
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}