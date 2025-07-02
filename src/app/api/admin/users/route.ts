// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { query } from '@/lib/db';

// --- INTERFAZ ACTUALIZADA ---
// Refleja la nueva estructura de la base de datos con 'estado' y 'suspension_fin'
// Incluye email para compatibilidad con n8n
interface UserListData {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  estado: string;
  suspension_fin: string | null;
  fecha_creacion: Date;
  roles: string; 
}

export async function GET(request: NextRequest) {
  let isRequesterAdmin = false;
  // Un moderador no puede usar API Key, así que por defecto no es admin
  let requesterRoles: string[] = [];

  // --- Lógica de Autenticación Dual ---
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKeyResult = await verifyApiKey(request);
    if (!apiKeyResult.success) {
      return NextResponse.json({ message: apiKeyResult.error }, { status: apiKeyResult.status });
    }
    // Si la clave es válida, el solicitante es un sistema con privilegios de administrador
    isRequesterAdmin = true;
    console.log('Solicitud de lista de usuarios autenticada con Clave de API.');

  } else {
    // Autenticación basada en sesión para usuarios web
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    const roleError = requireRoles(authResult.user, ['administrador', 'moderador_contenido']);
    if (roleError) {
      return createAuthErrorResponse(roleError);
    }
    requesterRoles = authResult.user.roles || [authResult.user.role];
    isRequesterAdmin = requesterRoles.includes('administrador');
    console.log(`Usuario ${authResult.user.email} (Roles: ${requesterRoles.join(', ')}) está solicitando la lista de usuarios.`);
  }

  try {
    let usersQuery: string;
    let queryParams: (string | number)[] = [];

    // --- CONSULTAS SQL ACTUALIZADAS ---
    // Ambas consultas ahora seleccionan 'estado' y 'suspension_fin' en lugar de 'activo'
    if (isRequesterAdmin) {
      usersQuery = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.estado, u.suspension_fin, u.fecha_creacion, 
               GROUP_CONCAT(r.nombre_rol, ', ') as roles
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        GROUP BY u.id
        ORDER BY u.fecha_creacion DESC
      `;
    } else {
      // Los moderadores solo ven usuarios estándar y sus estados
      usersQuery = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.estado, u.suspension_fin, u.fecha_creacion, 'usuario_estandar' as roles
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

    // El post-procesamiento de 'activo' ya no es necesario.
    // La base de datos ya devuelve los datos en el formato correcto.
    const users = usersRs.rows as unknown as UserListData[];

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
