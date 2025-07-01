// src/lib/achievements.ts
import { query } from './db';
import { Row } from '@libsql/client';

// --- Interfaces ---

// Representa un logro tal como se define en la base de datos, uniendo logros y criterios.
interface AchievementToVerify extends Row {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  criterio_id: number;
  valor_criterio: number;
  criterio_codigo: string;
}

// Representa las estadísticas de un usuario que se usarán para verificar los logros.
interface UserStats {
  totalHabitsCreated: number;
  // Añadiremos más estadísticas aquí en el futuro (ej. rachas, total de completados)
}

// --- Funciones de Cálculo de Estadísticas ---

/**
 * Calcula varias estadísticas clave para un usuario.
 * @param userId - El ID del usuario.
 * @returns Un objeto con las estadísticas del usuario.
 */
async function calculateUserStats(userId: string | number): Promise<UserStats> {
  // Por ahora, solo calculamos el total de hábitos creados.
  // En el futuro, esta función crecerá para calcular rachas, totales, etc.
  const habitsCreatedResult = await query({
    sql: 'SELECT COUNT(*) as total FROM habitos WHERE usuario_id = ?',
    args: [userId],
  });
  const totalHabitsCreated = (habitsCreatedResult.rows[0]?.total as number) || 0;

  return {
    totalHabitsCreated,
  };
}

// --- Lógica Principal de Desbloqueo ---

/**
 * Verifica y otorga logros a un usuario basado en un evento disparador.
 * Esta es la función principal del sistema de logros.
 * @param userId - El ID del usuario a verificar.
 * @param trigger - El código del evento que disparó la verificación (ej. 'PRIMER_HABITO_CREADO').
 */
export async function checkAndAwardAchievements(userId: string | number, trigger: string) {
  try {
    console.log(`Verificando logros para el usuario ${userId} por el evento: ${trigger}`);

    // 1. Obtener todos los logros asociados al criterio del evento disparador que el usuario AÚN NO TIENE.
    const achievementsToVerifyResult = await query({
      sql: `
        SELECT
          l.id, l.nombre, l.descripcion, l.icono_url, l.criterio_id, l.valor_criterio, lc.criterio_codigo
        FROM logros l
        JOIN logros_criterios lc ON l.criterio_id = lc.id
        WHERE
          lc.criterio_codigo = ? AND
          l.id NOT IN (SELECT logro_id FROM usuario_logros WHERE usuario_id = ?)
      `,
      args: [trigger, userId],
    });

    const achievementsToVerify = achievementsToVerifyResult.rows as unknown as AchievementToVerify[];

    if (achievementsToVerify.length === 0) {
      // No hay logros nuevos que verificar para este evento, lo cual es normal.
      return;
    }

    // 2. Calcular las estadísticas relevantes del usuario.
    const userStats = await calculateUserStats(userId);

    // 3. Iterar sobre los logros pendientes y verificar si se cumplen las condiciones.
    for (const achievement of achievementsToVerify) {
      let conditionMet = false;
      
      // Usamos un switch para manejar diferentes tipos de criterios de desbloqueo.
      switch (achievement.criterio_codigo) {
        case 'PRIMER_HABITO_CREADO':
          if (userStats.totalHabitsCreated >= achievement.valor_criterio) {
            conditionMet = true;
          }
          break;
        
        // --- FUTURA EXPANSIÓN ---
        // Aquí añadiríamos más casos para otros criterios. Por ejemplo:
        // case 'RACHA_CONSECUTIVA':
        //   if (userStats.maxPositiveStreak >= achievement.valor_criterio) {
        //     conditionMet = true;
        //   }
        //   break;
      }

      // 4. Si la condición se cumple, otorgar el logro al usuario.
      if (conditionMet) {
        await query({
          sql: 'INSERT INTO usuario_logros (usuario_id, logro_id) VALUES (?, ?)',
          args: [userId, achievement.id],
        });
        console.log(`¡Logro desbloqueado para el usuario ${userId}! -> "${achievement.nombre}"`);
        // En el futuro, aquí se podría enviar una notificación al frontend.
      }
    }
  } catch (error) {
    console.error(`Error crítico al verificar o otorgar logros para el usuario ${userId}:`, error);
  }
}
