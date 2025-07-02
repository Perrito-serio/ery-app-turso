// src/app/api/external/habits/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { z } from 'zod';

// Schema de validación para los parámetros de búsqueda
const searchSchema = z.object({
  email: z.string().email('Email inválido'),
  hashtag: z.string().min(1, 'Hashtag requerido').regex(/^#?\w+$/, 'Formato de hashtag inválido')
});

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

    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const hashtag = searchParams.get('hashtag');

    // Validar parámetros
    const validation = searchSchema.safeParse({ email, hashtag });
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { email: validEmail, hashtag: validHashtag } = validation.data;

    // Limpiar hashtag (remover # si existe)
    const cleanHashtag = validHashtag.replace(/^#/, '').toLowerCase();

    // Buscar usuario por email
    const userResult = await query({
      sql: 'SELECT id, nombre, email FROM usuarios WHERE email = ? AND estado = ?',
      args: [validEmail, 'activo']
    });
    
    const user = userResult.rows[0] as any;

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Buscar hábitos del usuario que coincidan con el hashtag
    // Buscamos en el nombre del hábito (case insensitive)
    const habitsResult = await query({
      sql: `SELECT id, nombre, descripcion, tipo, activo 
            FROM habitos 
            WHERE usuario_id = ? AND activo = 1 AND LOWER(nombre) LIKE ?
            ORDER BY nombre`,
      args: [user.id, `%${cleanHashtag}%`]
    });
    
    const habits = habitsResult.rows;

    if (habits.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se encontraron hábitos activos que coincidan con el hashtag',
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email
          },
          searched_hashtag: cleanHashtag
        },
        { status: 404 }
      );
    }

    // Retornar resultados
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email
      },
      searched_hashtag: cleanHashtag,
      habits: habits.map((habit: any) => ({
        id: habit.id,
        nombre: habit.nombre,
        descripcion: habit.descripcion,
        tipo: habit.tipo
      })),
      total_found: habits.length
    });

  } catch (error) {
    console.error('Error en búsqueda de hábitos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}