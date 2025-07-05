// src/app/api/routines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { z } from 'zod';
import { Row } from '@libsql/client';

// Esquema de validación con Zod para crear una nueva rutina
const createRoutineSchema = z.object({
  nombre: z.string().min(1, "El nombre de la rutina es requerido.").max(255),
  descripcion: z.string().optional().nullable(),
});

// Interfaz para tipar los datos que vienen de la base de datos
interface Routine extends Row {
  id: number;
  usuario_id: number;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: string;
}

/**
 * GET /api/routines
 * Obtiene todas las rutinas del usuario autenticado.
 */
export async function GET(request: NextRequest) {
  // 1. Verificar que el usuario esté autenticado (dual: web session o API token)
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
    // 2. Consultar la base de datos para obtener las rutinas del usuario
    const routinesResult = await query({
      sql: 'SELECT * FROM rutinas WHERE usuario_id = ? ORDER BY fecha_creacion DESC',
      args: [userId],
    });

    // 3. Devolver las rutinas encontradas
    return NextResponse.json({ routines: routinesResult.rows });

  } catch (error) {
    console.error("Error al obtener las rutinas:", error);
    return NextResponse.json({ message: "Error interno del servidor al obtener las rutinas." }, { status: 500 });
  }
}

/**
 * POST /api/routines
 * Crea una nueva rutina para el usuario autenticado.
 */
export async function POST(request: NextRequest) {
  // 1. Verificar que el usuario esté autenticado (dual: web session o API token)
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

  // 2. Obtener y validar el cuerpo de la solicitud
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  const validation = createRoutineSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      message: "Datos de entrada inválidos para crear la rutina.",
      errors: validation.error.flatten().fieldErrors
    }, { status: 400 });
  }

  const { nombre, descripcion } = validation.data;

  try {
    // 3. Insertar la nueva rutina en la base de datos
    const result = await query({
      sql: 'INSERT INTO rutinas (usuario_id, nombre, descripcion) VALUES (?, ?, ?)',
      args: [userId, nombre, descripcion || null],
    });

    // 4. Devolver la rutina recién creada para actualizar el estado en el frontend
    if (result.lastInsertRowid) {
      const newRoutineId = Number(result.lastInsertRowid);
      const newRoutineResult = await query({
        sql: 'SELECT * FROM rutinas WHERE id = ?',
        args: [newRoutineId],
      });
      const newRoutine = newRoutineResult.rows[0] as Routine;
      
      return NextResponse.json({
        message: "Rutina creada exitosamente.",
        routine: newRoutine
      }, { status: 201 });
    }

    return NextResponse.json({ message: "No se pudo crear la rutina." }, { status: 500 });

  } catch (error) {
    console.error("Error al crear la rutina:", error);
    return NextResponse.json({ message: "Error interno del servidor al crear la rutina." }, { status: 500 });
  }
}
