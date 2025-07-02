// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';

// GET /api/admin/stats - Obtiene estadísticas generales del sistema
export async function GET(request: NextRequest) {
  // 1. Autenticación y Autorización
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }

  // 2. Verificar que el usuario tenga rol de administrador
  const roleError = requireRoles(authResult.user, ['administrador']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  try {
    // Obtener total de hábitos creados en el sistema
    const totalHabitsResult = await query({
      sql: 'SELECT COUNT(*) as total FROM habitos',
      args: []
    });
    const totalHabits = (totalHabitsResult.rows[0]?.total as number) || 0;

    // Obtener total de usuarios
    const totalUsersResult = await query({
      sql: 'SELECT COUNT(*) as total FROM usuarios',
      args: []
    });
    const totalUsers = (totalUsersResult.rows[0]?.total as number) || 0;

    // Obtener usuarios activos
    const activeUsersResult = await query({
      sql: "SELECT COUNT(*) as total FROM usuarios WHERE estado = 'activo'",
      args: []
    });
    const activeUsers = (activeUsersResult.rows[0]?.total as number) || 0;

    // Obtener total de logros otorgados
    const totalAchievementsResult = await query({
      sql: 'SELECT COUNT(*) as total FROM usuario_logros',
      args: []
    });
    const totalAchievements = (totalAchievementsResult.rows[0]?.total as number) || 0;

    return NextResponse.json({
      total_habits: totalHabits,
      total_users: totalUsers,
      active_users: activeUsers,
      total_achievements: totalAchievements
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del sistema:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener estadísticas' },
      { status: 500 }
    );
  }
}