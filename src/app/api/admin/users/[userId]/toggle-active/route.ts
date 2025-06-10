// src/app/api/admin/users/[userId]/toggle-active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils'; // 1. Usar la nueva utilidad de NextAuth.js
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface ToggleActiveRequestBody {
  activo: boolean; // El nuevo estado deseado para 'activo'
}

interface RouteContext {
  params: {
    userId: string;
  };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  // 2. Proteger la ruta con la nueva función. Ya no se pasa 'request'.
  const { session, errorResponse: authError } = await verifyApiAuth(['administrador']);

  if (authError) {
    return authError;
  }

  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  // 3. Usar el ID del admin desde la sesión para la comprobación
  if (session?.user?.id === numericUserId) {
    return NextResponse.json({ message: 'Un administrador no puede cambiar su propio estado activo a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as ToggleActiveRequestBody;
    const { activo } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json({ message: 'El campo "activo" debe ser un valor booleano.' }, { status: 400 });
    }

    const result = await query<ResultSetHeader>(
      'UPDATE usuarios SET activo = ? WHERE id = ?',
      [activo, numericUserId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }

    return NextResponse.json(
      { message: `Estado del usuario ID ${numericUserId} actualizado a ${activo ? 'activo' : 'inactivo'}.` },
      { status: 200 }
    );

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error(`Error al actualizar estado activo del usuario ID ${numericUserId}:`, typedError);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Cuerpo de la solicitud JSON malformado.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el estado del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
