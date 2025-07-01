// src/app/api/habits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { Row } from '@libsql/client';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
// --- MODIFICACIÓN ---: Importar la función de verificación de logros.
import { checkAndAwardAchievements } from '@/lib/achievements';

// Esquema de Zod (sin cambios)
const createHabitSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido.").max(255),
  descripcion: z.string().optional().nullable(),
  tipo: z.enum(['SI_NO', 'MEDIBLE_NUMERICO', 'MAL_HABITO']),
  meta_objetivo: z.number().optional().nullable(),
}).refine(data => {
    if (data.tipo === 'MEDIBLE_NUMERICO') {
        return data.meta_objetivo != null && data.meta_objetivo > 0;
    }
    return true;
}, {
    message: "Para un hábito medible, se requiere una meta objetivo mayor a 0.",
    path: ["meta_objetivo"],
});

interface Habit extends Row {
  id: number;
  usuario_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: string;
}

// GET /api/habits (sin cambios)
export async function GET(request: NextRequest) {
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
  const userId = authResult.user.id;

  try {
    const habitsRs = await query({
      sql: `SELECT * FROM habitos WHERE usuario_id = ? ORDER BY fecha_creacion DESC`,
      args: [userId]
    });
    return NextResponse.json({ habits: habitsRs.rows });
  } catch (error) {
    console.error("Error al obtener la lista de hábitos:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}

// POST /api/habits (modificado para activar logros)
export async function POST(request: NextRequest) {
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
  const userId = authResult.user.id;
  
  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = createHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombre, descripcion, tipo, meta_objetivo } = validation.data;

  try {
    const result = await query({
        sql: `
            INSERT INTO habitos (usuario_id, nombre, descripcion, tipo, meta_objetivo)
            VALUES (?, ?, ?, ?, ?)
        `,
        args: [userId, nombre, descripcion || null, tipo, meta_objetivo || null]
    });

    if (result.rowsAffected === 1 && result.lastInsertRowid) {
      const newHabitId = Number(result.lastInsertRowid);
      
      // --- MODIFICACIÓN ---: Llamar a la función de verificación de logros.
      // Se ejecuta en segundo plano y no bloquea la respuesta al usuario.
      await checkAndAwardAchievements(userId, 'PRIMER_HABITO_CREADO');

      const newHabitRs = await query({
        sql: "SELECT * FROM habitos WHERE id = ?",
        args: [newHabitId]
      });
      const newHabit = newHabitRs.rows[0];
      
      return NextResponse.json({ message: "Hábito creado exitosamente.", habit: newHabit }, { status: 201 });
    }

    return NextResponse.json({ message: "No se pudo crear el hábito." }, { status: 500 });
  } catch (error) {
    console.error("Error al crear el hábito:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
