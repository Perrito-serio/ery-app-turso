// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError, requireRoles as requireApiTokenRoles } from '@/lib/apiTokenAuth';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError, requireRoles as requireWebRoles } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';

// --- Interfaz (limpiada de dependencias de mysql2) ---
interface RoleData extends Row {
  id: number;
  nombre_rol: string;
  descripcion: string | null;
}

export async function GET(request: NextRequest) {
  // Verificar autenticación (dual: web session o API token)
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

  // Verificar autorización
  const roleError = request.headers.has('Authorization')
    ? requireApiTokenRoles(authResult.user, ['administrador'])
    : requireWebRoles(authResult.user, ['administrador']);
  if (roleError) {
    const errorResponse = request.headers.has('Authorization')
      ? createApiTokenError(roleError)
      : createWebAuthError(roleError);
    return errorResponse;
  }

  console.log(`Administrador ${authResult.user?.email} (ID: ${authResult.user?.id}) está solicitando la lista de todos los roles.`);

  try {
    const rolesRs = await query({
      sql: `SELECT id, nombre_rol, descripcion FROM roles ORDER BY nombre_rol ASC`
    });

    const roles = rolesRs.rows as unknown as RoleData[];

    return NextResponse.json({ roles }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error('Error al obtener la lista de roles:', typedError);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de roles.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
