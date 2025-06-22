// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';

// --- Interfaces (limpiadas de dependencias de mysql2) ---
interface UserListData {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date;
  roles: string; // Se devolverán los roles como un string concatenado: "rol1,rol2"
}

export async function GET(request: NextRequest) {
  // Verificar autenticación
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }

  // Verificar autorización
  const roleError = requireRoles(authResult.user, ['administrador', 'moderador_contenido']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  const requesterRoles = authResult.user.roles || [authResult.user.role];
   const isRequesterAdmin = requesterRoles.includes('administrador');

   console.log(`Usuario ${authResult.user.email} (Roles: ${requesterRoles.join(', ')}) está solicitando la lista de usuarios.`);

  try {
    let usersQuery: string;
    let queryParams: (string | number)[] = [];

    // La lógica SQL para diferenciar entre admin y moderador se mantiene,
    // ya que GROUP_CONCAT y las subconsultas son compatibles con SQLite.
    if (isRequesterAdmin) {
      usersQuery = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.activo, u.fecha_creacion, 
               GROUP_CONCAT(r.nombre_rol, ', ') as roles
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        GROUP BY u.id
        ORDER BY u.fecha_creacion DESC
      `;
    } else {
      usersQuery = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.activo, u.fecha_creacion, 'usuario_estandar' as roles
        FROM usuarios u
        WHERE u.id NOT IN (
          SELECT ur.usuario_id 
          FROM usuario_roles ur
          JOIN roles r ON ur.rol_id = r.id
          WHERE r.nombre_rol IN ('administrador', 'moderador_contenido')
        )
        ORDER BY u.fecha_creacion DESC
      `;
    }

    const usersRs = await query({
        sql: usersQuery,
        args: queryParams
    });

    // Procesamos el resultado para convertir el booleano numérico a un booleano real.
    const users = (usersRs.rows as unknown as UserListData[]).map(user => ({
        ...user,
        activo: Boolean(user.activo)
    }));

    return NextResponse.json({ users }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error('Error al obtener la lista de usuarios:', typedError);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de usuarios.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
