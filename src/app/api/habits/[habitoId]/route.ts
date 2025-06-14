// src/app/api/habits/[habitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { z } from 'zod';

// Esquema de Zod (sin cambios)
const updateHabitSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido.").max(255).optional(),
  descripcion: z.string().optional().nullable(),
  meta_objetivo: z.number().optional().nullable(),
}).partial().refine(data => Object.keys(data).length > 0, {
  message: "Se debe proporcionar al menos un campo para actualizar."
});

interface RouteContext {
  params: {
    habitoId: string;
  };
}

// --- PUT /api/habits/[habitoId] ---
// Permite a un usuario editar uno de sus propios hábitos.
export async function PUT(request: NextRequest, context: RouteContext) {
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) { return errorResponse; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  const { habitoId } = context.params;
  const numericHabitoId = parseInt(habitoId, 10);
  if (isNaN(numericHabitoId)) {
    return NextResponse.json({ message: 'ID de hábito inválido.' }, { status: 400 });
  }

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = updateHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombre, descripcion, meta_objetivo } = validation.data;

  try {
    const habitCheckRs = await query({
        sql: 'SELECT usuario_id FROM habitos WHERE id = ?',
        args: [numericHabitoId]
    });
    if (habitCheckRs.rows.length === 0) {
      return NextResponse.json({ message: `Hábito con ID ${numericHabitoId} no encontrado.` }, { status: 404 });
    }
    if ((habitCheckRs.rows[0] as any).usuario_id !== userId) {
      return NextResponse.json({ message: 'Acceso denegado. No tienes permiso para editar este hábito.' }, { status: 403 });
    }

    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (descripcion !== undefined) { updateFields.push('descripcion = ?'); updateValues.push(descripcion); }
    if (meta_objetivo !== undefined) { updateFields.push('meta_objetivo = ?'); updateValues.push(meta_objetivo); }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    const sqlSetClause = updateFields.join(', ');
    updateValues.push(numericHabitoId);

    await query({
        sql: `UPDATE habitos SET ${sqlSetClause} WHERE id = ?`,
        args: updateValues
    });

    return NextResponse.json({ message: "Hábito actualizado exitosamente." });

  } catch (error) {
    console.error(`Error al actualizar el hábito ID ${numericHabitoId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}


// --- DELETE /api/habits/[habitoId] ---
// Permite a un usuario eliminar uno de sus propios hábitos.
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) { return errorResponse; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  const { habitoId } = context.params;
  const numericHabitoId = parseInt(habitoId, 10);
  if (isNaN(numericHabitoId)) {
    return NextResponse.json({ message: 'ID de hábito inválido.' }, { status: 400 });
  }

  console.log(`Usuario ID: ${userId} está intentando eliminar el hábito ID: ${numericHabitoId}`);

  try {
    const deleteRs = await query({
        sql: 'DELETE FROM habitos WHERE id = ? AND usuario_id = ?',
        args: [numericHabitoId, userId]
    });
    
    if (deleteRs.rowsAffected === 0) {
      return NextResponse.json({ message: `Hábito con ID ${numericHabitoId} no encontrado o no tienes permiso para eliminarlo.` }, { status: 404 });
    }

    return NextResponse.json({ message: "Hábito eliminado exitosamente." }, { status: 200 });

  } catch (error) {
    console.error(`Error al eliminar el hábito ID ${numericHabitoId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
