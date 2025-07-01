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
  suspension_fin: z.string().datetime({ message: "La fecha de fin de suspensión debe ser una fecha válida." }).optional().nullable(),
}).refine(data => {
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

interface TargetUserRole {
    nombre_rol: string;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  // 1. Autenticación y Autorización
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  
  // Ahora permite el acceso a administradores Y moderadores
  const roleError = requireRoles(authResult.user, ['administrador', 'moderador_contenido']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  const { userId: targetUserIdString } = params;
  const targetUserId = parseInt(targetUserIdString, 10);

  // Un administrador o moderador no puede cambiar su propio estado
  if (authResult.user.id === targetUserIdString) {
    return NextResponse.json({ message: 'No puedes cambiar tu propio estado.' }, { status: 403 });
  }

  const requesterRoles = authResult.user.roles || [];
  const isRequesterAdmin = requesterRoles.includes('administrador');

  // 2. Verificación de permisos adicionales para Moderadores
  if (!isRequesterAdmin) {
      try {
          const targetUserRolesRs = await query({
              sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
              args: [targetUserId]
          });
          // CORRECCIÓN: Se añade 'as unknown' para la conversión de tipos segura.
          const targetRoles = targetUserRolesRs.rows.map(r => (r as unknown as TargetUserRole).nombre_rol);

          // Un moderador no puede actuar sobre otro moderador o un administrador
          if (targetRoles.includes('administrador') || targetRoles.includes('moderador_contenido')) {
              return NextResponse.json({ message: 'Acceso denegado: Un moderador no puede cambiar el estado de otros usuarios privilegiados.' }, { status: 403 });
          }
      } catch (error) {
          return NextResponse.json({ message: 'Error al verificar los permisos sobre el usuario objetivo.' }, { status: 500 });
      }
  }


  // 3. Validación del cuerpo de la solicitud
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
    // 4. Preparar y ejecutar la consulta SQL
    let sql = 'UPDATE usuarios SET estado = ?';
    const args: (string | number | null)[] = [estado];

    if (estado === 'suspendido') {
        if (typeof suspension_fin !== 'string') {
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
