// src/app/api/achievements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface AchievementFromDB extends Row {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
}

interface UserAchievementFromDB extends Row {
  logro_id: number;
}

// Interfaz para la respuesta final
interface AchievementStatus {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string | null;
  unlocked: boolean; // Indica si el usuario ha desbloqueado este logro
}

// GET /api/achievements - Obtiene todos los logros y el estado de desbloqueo para el usuario actual.
export async function GET(request: NextRequest) {
  // 1. Autenticación
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const userId = authResult.user.id;

  try {
    // 2. Obtener todos los logros disponibles y los logros del usuario en paralelo
    const [allAchievementsRes, userAchievementsRes] = await Promise.all([
      query({ sql: 'SELECT id, nombre, descripcion, icono_url FROM logros ORDER BY id' }),
      query({ sql: 'SELECT logro_id FROM usuario_logros WHERE usuario_id = ?', args: [userId] })
    ]);

    const allAchievements = allAchievementsRes.rows as unknown as AchievementFromDB[];
    const userAchievements = userAchievementsRes.rows as unknown as UserAchievementFromDB[];

    // 3. Crear un Set con los IDs de los logros desbloqueados para una búsqueda rápida
    const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.logro_id));

    // 4. Mapear la lista completa de logros, añadiendo el estado 'unlocked'
    const achievementsStatus: AchievementStatus[] = allAchievements.map(achievement => ({
      ...achievement,
      unlocked: unlockedAchievementIds.has(achievement.id),
    }));

    // 5. Devolver la lista completa
    return NextResponse.json({ achievements: achievementsStatus });

  } catch (error) {
    console.error(`Error al obtener los logros para el usuario ${userId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
