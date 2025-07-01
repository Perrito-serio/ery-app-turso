// src/app/api/admin/users/[userId]/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, getDbClient } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';

// --- INTERFAZ ACTUALIZADA ---
// Ahora espera un solo roleId, no un array.
interface UpdateUserRoleRequestBody {
  roleId: number;
}

interface RouteContext {
  params: {
    userId: string;
  };
}

interface RoleCheck {
  id: number;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  // Verificar autenticación y autorización
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const roleError = requireRoles(authResult.user, ['administrador']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  const { userId } = params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  // Prevenir que un admin se modifique a sí mismo
  if (authResult.user.id === userId) {
    return NextResponse.json({ message: 'Un administrador no puede modificar sus propios roles a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as UpdateUserRoleRequestBody;
    const { roleId } = body;

    // --- VALIDACIÓN ACTUALIZADA ---
    // Validar que se reciba un solo número para roleId.
    if (typeof roleId !== 'number' || !Number.isInteger(roleId)) {
      return NextResponse.json({ message: 'El campo "roleId" debe ser un número entero.' }, { status: 400 });
    }

    // Verificar que tanto el usuario como el rol existan
    const [userExistsRs, roleExistsRs] = await Promise.all([
        query({ sql: 'SELECT id FROM usuarios WHERE id = ?', args: [numericUserId] }),
        query({ sql: 'SELECT id FROM roles WHERE id = ?', args: [roleId] })
    ]);

    if (userExistsRs.rows.length === 0) {
        return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }
    if (roleExistsRs.rows.length === 0) {
        return NextResponse.json({ message: `El rol con ID ${roleId} no es válido o no existe.` }, { status: 400 });
    }

    // --- LÓGICA DE TRANSACCIÓN ACTUALIZADA ---
    // Se elimina el rol anterior y se inserta el nuevo.
    const dbClient = getDbClient();
    const tx = await dbClient.transaction('write');
    try {
        // 1. Eliminar todas las asignaciones de roles existentes para este usuario.
        await tx.execute({
            sql: 'DELETE FROM usuario_roles WHERE usuario_id = ?',
            args: [numericUserId]
        });

        // 2. Insertar la nueva y única asignación de rol.
        await tx.execute({
            sql: 'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)',
            args: [numericUserId, roleId]
        });

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err; 
    }

    return NextResponse.json(
      { message: `Rol del usuario ID ${numericUserId} actualizado correctamente.` },
      { status: 200 }
    );

  } catch (error) {
    const typedError = error as { message?: string; code?: string; };
    console.error(`Error al actualizar rol del usuario ID ${numericUserId}:`, typedError);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Cuerpo de la solicitud JSON malformado.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el rol del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
