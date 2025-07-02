// src/app/api/external/achievements/award/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { z } from 'zod';

// Esquema de validación para asignar logros
const awardAchievementSchema = z.object({
  user_id: z.number().int().positive(),
  achievement_id: z.number().int().positive(),
  reason: z.string().optional() // Razón opcional para el otorgamiento
});

interface AwardAchievementResponse {
  success: boolean;
  message: string;
  user_id: number;
  achievement_id: number;
  achievement_name?: string;
  already_awarded?: boolean;
}

/**
 * POST /api/external/achievements/award
 * Asigna un logro específico a un usuario.
 * Protegido con API Key para uso con n8n.
 */
export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    const apiKeyValidation = await verifyApiKey(request);
    if (!apiKeyValidation.success) {
      return NextResponse.json(
        { error: apiKeyValidation.error || 'API Key inválida o faltante' },
        { status: apiKeyValidation.status || 401 }
      );
    }

    // Obtener y validar datos del body
    const body = await request.json();
    const validation = awardAchievementSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { user_id, achievement_id, reason } = validation.data;

    // Verificar que el usuario existe y está activo
    const userResult = await query({
      sql: 'SELECT id, nombre, email FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [user_id]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Usuario no encontrado o inactivo',
          user_id,
          achievement_id
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0] as any;

    // Verificar que el logro existe
    const achievementResult = await query({
      sql: 'SELECT id, nombre, descripcion FROM logros WHERE id = ?',
      args: [achievement_id]
    });

    if (achievementResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Logro no encontrado',
          user_id,
          achievement_id
        },
        { status: 404 }
      );
    }

    const achievement = achievementResult.rows[0] as any;

    // Verificar si el usuario ya tiene este logro
    const existingAwardResult = await query({
      sql: 'SELECT id FROM usuario_logros WHERE usuario_id = ? AND logro_id = ?',
      args: [user_id, achievement_id]
    });

    if (existingAwardResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: `El usuario ${user.nombre} ya tiene el logro "${achievement.nombre}"`,
        user_id,
        achievement_id,
        achievement_name: achievement.nombre,
        already_awarded: true
      });
    }

    // Asignar el logro al usuario
    await query({
      sql: 'INSERT INTO usuario_logros (usuario_id, logro_id, fecha_obtencion) VALUES (?, ?, datetime("now"))',
      args: [user_id, achievement_id]
    });

    // Log del evento para auditoría
    console.log(`Logro asignado automáticamente: Usuario ${user.nombre} (ID: ${user_id}) obtuvo "${achievement.nombre}" (ID: ${achievement_id})${reason ? ` - Razón: ${reason}` : ''}`);

    const response: AwardAchievementResponse = {
      success: true,
      message: `Logro "${achievement.nombre}" asignado exitosamente a ${user.nombre}`,
      user_id,
      achievement_id,
      achievement_name: achievement.nombre,
      already_awarded: false
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al asignar logro:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/external/achievements/award
 * Obtiene información sobre los logros disponibles.
 * Útil para n8n para conocer qué logros se pueden asignar.
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

    // Obtener todos los logros disponibles
    const achievementsResult = await query({
      sql: `SELECT 
              l.id,
              l.nombre,
              l.descripcion,
              l.icono_url,
              lc.criterio_codigo,
              lc.descripcion as criterio_descripcion
            FROM logros l
            JOIN logros_criterios lc ON l.criterio_id = lc.id
            ORDER BY l.id`
    });

    const achievements = achievementsResult.rows;

    return NextResponse.json({
      achievements,
      total: achievements.length
    });

  } catch (error) {
    console.error('Error al obtener logros disponibles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}