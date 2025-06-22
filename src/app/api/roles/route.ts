// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';

// --- Interfaz (limpiada de dependencias de mysql2) ---
interface RoleData extends Row {
  id: number;
  nombre_rol: string;
  descripcion: string | null;
}

export async function GET(request: NextRequest) {
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
