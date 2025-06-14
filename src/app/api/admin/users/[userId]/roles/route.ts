// src/app/api/admin/users/[userId]/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query, getDbClient } from '@/lib/db'; // La importación ahora funcionará

// --- Interfaces ---
interface UpdateUserRolesRequestBody {
  roleIds: number[];
}

interface RouteContext {
  params: {
    userId: string;
  };
}

interface RoleCheck {
  id: number;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { session, errorResponse: authError } = await verifyApiAuth(['administrador']);

  if (authError) {
    return authError;
  }

  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  if (session?.user?.id === numericUserId) {
    return NextResponse.json({ message: 'Un administrador no puede modificar sus propios roles a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as UpdateUserRolesRequestBody;
    const { roleIds } = body;

    if (!Array.isArray(roleIds) || !roleIds.every(id => typeof id === 'number' && Number.isInteger(id))) {
      return NextResponse.json({ message: 'El campo "roleIds" debe ser un array de números enteros (IDs de roles).' }, { status: 400 });
    }

    const userExistsRs = await query({
        sql: 'SELECT id FROM usuarios WHERE id = ?',
        args: [numericUserId]
    });
    if (userExistsRs.rows.length === 0) {
        return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }

    if (roleIds.length > 0) {
      const placeholders = roleIds.map(() => '?').join(',');
      const existingRolesRs = await query({
        sql: `SELECT id FROM roles WHERE id IN (${placeholders})`,
        args: roleIds
      });
      if (existingRolesRs.rows.length !== roleIds.length) {
        const foundRoleIds = existingRolesRs.rows.map(r => (r as unknown as RoleCheck).id);
        const notFoundRoleIds = roleIds.filter(id => !foundRoleIds.includes(id));
        return NextResponse.json({ message: `Los siguientes IDs de rol no son válidos o no existen: ${notFoundRoleIds.join(', ')}.` }, { status: 400 });
      }
    }

    // Lógica de actualización de roles usando una transacción
    const dbClient = getDbClient();
    const tx = await dbClient.transaction('write');
    try {
        await tx.execute({
            sql: 'DELETE FROM usuario_roles WHERE usuario_id = ?',
            args: [numericUserId]
        });

        if (roleIds.length > 0) {
            const insertStatements = roleIds.map(roleId => ({
                sql: 'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)',
                args: [numericUserId, roleId]
            }));
            await tx.batch(insertStatements);
        }

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err; 
    }

    return NextResponse.json(
      { message: `Roles del usuario ID ${numericUserId} actualizados correctamente.` },
      { status: 200 }
    );

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error(`Error al actualizar roles del usuario ID ${numericUserId}:`, typedError);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Cuerpo de la solicitud JSON malformado.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar los roles del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
