// src/app/api/admin/users/[userId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { z } from 'zod';

// Esquema para validar los datos de entrada al cambiar el estado de un usuario
const updateUserStatusSchema = z.object({
  estado: z.enum(['activo', 'suspendido', 'baneado'], {
    errorMap: () => ({ message: "El estado debe ser 'activo', 'suspendido' o 'baneado'." })
  }),
  // suspension_fin es opcional, pero debe ser una fecha válida en formato ISO si se proporciona
  suspension_fin: z.string().datetime({ message: "La fecha de fin de suspensión debe ser una fecha válida." }).optional().nullable(),
}).refine(data => {
    // Si el estado es 'suspendido', la fecha de fin es obligatoria.
    if (data.estado === 'suspendido') {
        return data.suspension_fin != null;
    }
    return true;
}, {
    message: "Para suspender un usuario, se debe proporcionar una fecha de fin de suspensión.",
    path: ["suspension_fin"],
});

interface RouteContext {
  params: {
    userId: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  // 1. Autenticación y Autorización del administrador
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const roleError = requireRoles(authResult.user, ['administrador']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  const { userId: targetUserIdString } = params;
  const targetUserId = parseInt(targetUserIdString, 10);

  // Un administrador no puede cambiar su propio estado
  if (authResult.user.id === targetUserIdString) {
    return NextResponse.json({ message: 'Un administrador no puede cambiar su propio estado.' }, { status: 403 });
  }

  // 2. Validación del cuerpo de la solicitud
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  const validation = updateUserStatusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { estado, suspension_fin } = validation.data;

  try {
    // 3. Preparar y ejecutar la consulta SQL
    let sql = 'UPDATE usuarios SET estado = ?';
    const args: (string | number | null)[] = [estado];

    // Si el estado es 'suspendido', añadimos la fecha. Si no, nos aseguramos de que sea NULL.
    if (estado === 'suspendido') {
        // CORRECCIÓN: Añadimos una comprobación de tipo para satisfacer a TypeScript.
        // La validación de Zod ya asegura que esta condición se cumplirá.
        if (typeof suspension_fin !== 'string') {
            // Este bloque no debería ejecutarse nunca si la validación de Zod es correcta.
            return NextResponse.json({ message: "Error interno: La fecha de suspensión es requerida para el estado 'suspendido'." }, { status: 500 });
        }
        sql += ', suspension_fin = ?';
        args.push(suspension_fin);
    } else {
        sql += ', suspension_fin = NULL';
    }

    sql += ' WHERE id = ?';
    args.push(targetUserId);

    const result = await query({ sql, args });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ message: `Usuario con ID ${targetUserId} no encontrado.` }, { status: 404 });
    }

    return NextResponse.json({ message: `El estado del usuario ha sido actualizado a '${estado}'.` });

  } catch (error) {
    console.error(`Error al actualizar estado del usuario ID ${targetUserId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al actualizar el estado.' }, { status: 500 });
  }
}
