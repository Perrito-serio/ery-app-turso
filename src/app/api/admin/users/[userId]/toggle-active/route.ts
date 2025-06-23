// src/app/api/admin/users/[userId]/toggle-active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';

// --- Interfaces (sin cambios) ---
interface ToggleActiveRequestBody {
  activo: boolean; // El nuevo estado deseado para 'activo'
}

interface RouteContext {
  params: {
    userId: string;
  };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  // Verificar autenticación
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }

  // Verificar autorización
  const roleError = requireRoles(authResult.user, ['administrador']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  if (authResult.user.id === userId) {
    return NextResponse.json({ message: 'Un administrador no puede cambiar su propio estado activo a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as ToggleActiveRequestBody;
    const { activo } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json({ message: 'El campo "activo" debe ser un valor booleano.' }, { status: 400 });
    }

    const result = await query({
      sql: 'UPDATE usuarios SET activo = ? WHERE id = ?',
      // SQLite usa 1 para true y 0 para false
      args: [activo ? 1 : 0, numericUserId]
    });

    if (result.rowsAffected === 0) {
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
