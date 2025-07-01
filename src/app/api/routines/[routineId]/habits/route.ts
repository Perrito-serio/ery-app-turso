// src/app/api/routines/[routineId]/habits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { z } from 'zod';

// Esquema para validar el ID del hábito en el cuerpo de la solicitud
const habitAssociationSchema = z.object({
  habitId: z.number().int().positive("Se requiere un ID de hábito válido."),
});

interface RouteContext {
  params: {
    routineId: string;
  };
}

// Interfaz para verificar la propiedad de las entidades
interface OwnershipCheck {
    usuario_id: number;
}

/**
 * Función de ayuda para verificar si el usuario es propietario de la rutina
 */
async function verifyRoutineOwnership(routineId: number, userId: string): Promise<boolean> {
    const result = await query({
        sql: 'SELECT usuario_id FROM rutinas WHERE id = ?',
        args: [routineId],
    });
    if (result.rows.length === 0) return false;
    const owner = result.rows[0] as unknown as OwnershipCheck;
    return String(owner.usuario_id) === userId;
}

/**
 * POST /api/routines/[routineId]/habits
 * Asocia un hábito existente a una rutina.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const userId = authResult.user.id;
  const routineId = parseInt(params.routineId, 10);

  // Validar el cuerpo de la solicitud
  const body = await request.json();
  const validation = habitAssociationSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }
  const { habitId } = validation.data;

  try {
    // 1. Verificar que el usuario sea dueño de la rutina
    const isOwner = await verifyRoutineOwnership(routineId, userId);
    if (!isOwner) {
      return NextResponse.json({ message: "Rutina no encontrada o no tienes permiso." }, { status: 404 });
    }

    // 2. Verificar que el hábito que se quiere añadir también pertenece al usuario
    const habitOwnerResult = await query({
        sql: 'SELECT usuario_id FROM habitos WHERE id = ?',
        args: [habitId],
    });
    if (habitOwnerResult.rows.length === 0) {
        return NextResponse.json({ message: `El hábito con ID ${habitId} no existe.` }, { status: 404 });
    }
    const habitOwner = habitOwnerResult.rows[0] as unknown as OwnershipCheck;
    if (String(habitOwner.usuario_id) !== userId) {
        return NextResponse.json({ message: "No puedes añadir un hábito que no te pertenece." }, { status: 403 });
    }

    // 3. Insertar la asociación en la tabla pivote
    await query({
      sql: 'INSERT INTO rutina_habitos (rutina_id, habito_id) VALUES (?, ?)',
      args: [routineId, habitId],
    });

    return NextResponse.json({ message: "Hábito añadido a la rutina exitosamente." }, { status: 201 });

  } catch (error: any) {
    // Manejar el caso de que la asociación ya exista (violación de PRIMARY KEY)
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return NextResponse.json({ message: "Este hábito ya se encuentra en la rutina." }, { status: 409 });
    }
    console.error(`Error al añadir hábito a la rutina ${routineId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}


/**
 * DELETE /api/routines/[routineId]/habits
 * Elimina la asociación de un hábito de una rutina.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
        return createAuthErrorResponse(authResult);
    }
    const userId = authResult.user.id;
    const routineId = parseInt(params.routineId, 10);

    // Para DELETE, el ID del hábito vendrá en el cuerpo de la solicitud
    const body = await request.json();
    const validation = habitAssociationSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: "Se requiere un ID de hábito válido en el cuerpo de la solicitud.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { habitId } = validation.data;

    try {
        // 1. Verificar que el usuario sea dueño de la rutina (esto es suficiente para autorizar la eliminación)
        const isOwner = await verifyRoutineOwnership(routineId, userId);
        if (!isOwner) {
            return NextResponse.json({ message: "Rutina no encontrada o no tienes permiso." }, { status: 404 });
        }

        // 2. Eliminar la fila específica de la tabla pivote
        const result = await query({
            sql: 'DELETE FROM rutina_habitos WHERE rutina_id = ? AND habito_id = ?',
            args: [routineId, habitId],
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ message: "El hábito no se encontraba en esta rutina." }, { status: 404 });
        }

        return NextResponse.json({ message: "Hábito eliminado de la rutina exitosamente." });

    } catch (error) {
        console.error(`Error al eliminar hábito de la rutina ${routineId}:`, error);
        return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
    }
}
