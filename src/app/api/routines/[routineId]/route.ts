// src/app/api/routines/[routineId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { z } from 'zod';
import { Row } from '@libsql/client';

// --- INTERFACES ---

// Interfaz para un Hábito individual dentro de una rutina
interface Habit {
  id: number;
  nombre: string;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

// Interfaz para la fila de la rutina tal como viene de la BD
interface RoutineFromDB extends Row {
  id: number;
  nombre: string;
  descripcion: string | null;
}

// Interfaz para la respuesta final del GET, no extiende Row
interface RoutineDetails {
  id: number;
  nombre: string;
  descripcion: string | null;
  habits: Habit[];
}

// Esquema para validar la actualización de una rutina
const updateRoutineSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido.").max(255).optional(),
  descripcion: z.string().optional().nullable(),
}).partial().refine(data => Object.keys(data).length > 0, {
  message: "Se debe proporcionar al menos un campo para actualizar."
});

interface RouteContext {
  params: {
    routineId: string;
  };
}

/**
 * GET /api/routines/[routineId]
 * Obtiene los detalles de una rutina específica, incluyendo sus hábitos.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  // Autenticación (dual: web session o API token)
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
  const { routineId } = params;

  try {
    const routineResult = await query({
      sql: 'SELECT id, nombre, descripcion FROM rutinas WHERE id = ? AND usuario_id = ?',
      args: [routineId, userId],
    });

    if (routineResult.rows.length === 0) {
      return NextResponse.json({ message: "Rutina no encontrada o no tienes permiso para verla." }, { status: 404 });
    }
    const routineDetailsFromDB = routineResult.rows[0] as RoutineFromDB;

    const habitsResult = await query({
      sql: `
        SELECT h.id, h.nombre, h.tipo 
        FROM habitos h
        JOIN rutina_habitos rh ON h.id = rh.habito_id
        WHERE rh.rutina_id = ?
      `,
      args: [routineId],
    });

    // Construimos la respuesta final
    const response: RoutineDetails = {
      id: routineDetailsFromDB.id,
      nombre: routineDetailsFromDB.nombre,
      descripcion: routineDetailsFromDB.descripcion,
      // CORRECCIÓN: Usar 'as unknown as' para la conversión de tipos
      habits: habitsResult.rows as unknown as Habit[],
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error al obtener la rutina ${routineId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}

/**
 * PUT /api/routines/[routineId]
 * Actualiza el nombre o la descripción de una rutina.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
    // Autenticación (dual: web session o API token)
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
    const { routineId } = params;

    const body = await request.json();
    const validation = updateRoutineSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: "Datos inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { nombre, descripcion } = validation.data;

    try {
        const updateFields: string[] = [];
        const updateValues: (string | null)[] = [];

        if (nombre) {
            updateFields.push('nombre = ?');
            updateValues.push(nombre);
        }
        if (descripcion !== undefined) {
            updateFields.push('descripcion = ?');
            updateValues.push(descripcion);
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ message: "No se proporcionaron campos para actualizar." }, { status: 400 });
        }

        const sqlSetClause = updateFields.join(', ');
        const finalArgs = [...updateValues, routineId, userId];

        const result = await query({
            sql: `UPDATE rutinas SET ${sqlSetClause} WHERE id = ? AND usuario_id = ?`,
            args: finalArgs,
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ message: "Rutina no encontrada o no tienes permiso para editarla." }, { status: 404 });
        }

        return NextResponse.json({ message: "Rutina actualizada exitosamente." });
    } catch (error) {
        console.error(`Error al actualizar la rutina ${routineId}:`, error);
        return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
    }
}


/**
 * DELETE /api/routines/[routineId]
 * Elimina una rutina.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    // Autenticación (dual: web session o API token)
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
    const { routineId } = params;

    try {
        const result = await query({
            sql: 'DELETE FROM rutinas WHERE id = ? AND usuario_id = ?',
            args: [routineId, userId],
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ message: "Rutina no encontrada o no tienes permiso para eliminarla." }, { status: 404 });
        }

        return NextResponse.json({ message: "Rutina eliminada exitosamente." }, { status: 200 });
    } catch (error) {
        console.error(`Error al eliminar la rutina ${routineId}:`, error);
        return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
    }
}
