// src/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// --- Interfaces (limpiadas de dependencias de mysql2) ---
interface UserDetailsData {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date;
  roles: string[];
}
interface UserFromDB {
    id: number;
    nombre: string;
    apellido: string | null;
    email: string;
    activo: number | boolean;
    fecha_creacion: string | Date;
}
interface UserRoleFromDB {
  nombre_rol: string;
}
interface RouteContext {
  params: {
    userId: string;
  };
}

// --- Zod Schema para PUT (sin cambios) ---
const adminUpdateUserSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, "El nombre solo puede contener letras y espacios.").optional(),
  apellido: z.string().regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/, "El apellido solo puede contener letras y espacios.").optional(),
  email: z.string().email("Formato de correo electrónico inválido.").optional(),
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
}).partial().refine(data => Object.keys(data).length > 0, {
  message: "Se debe proporcionar al menos un campo para actualizar."
});


// --- GET: Obtener detalles y roles de un usuario ---
export async function GET(request: NextRequest, context: RouteContext) {
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

  try {
    const userRs = await query({
        sql: 'SELECT id, nombre, apellido, email, activo, fecha_creacion FROM usuarios WHERE id = ?',
        args: [numericUserId]
    });
    if (userRs.rows.length === 0) {
      return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }
    const rawUserData = userRs.rows[0] as unknown as UserFromDB;

    const rolesRs = await query({
        sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
        args: [numericUserId]
    });
    const roles = rolesRs.rows.map(role => (role as unknown as UserRoleFromDB).nombre_rol);

    const userDetails: UserDetailsData = {
      id: rawUserData.id,
      nombre: rawUserData.nombre,
      apellido: rawUserData.apellido,
      email: rawUserData.email,
      activo: Boolean(rawUserData.activo),
      fecha_creacion: new Date(rawUserData.fecha_creacion),
      roles: roles,
    };
    return NextResponse.json({ user: userDetails });
  } catch (error) {
    console.error(`Error al obtener detalles del usuario ID ${numericUserId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}


// --- PUT: Actualizar detalles de un usuario por un administrador ---
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

  const { userId: targetUserIdString } = context.params;
  const targetUserId = parseInt(targetUserIdString, 10);
  if (isNaN(targetUserId)) {
    return NextResponse.json({ message: 'ID de usuario a editar es inválido.' }, { status: 400 });
  }

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = adminUpdateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombre, apellido, email, password } = validation.data;

  try {
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (apellido !== undefined) { updateFields.push('apellido = ?'); updateValues.push(apellido || null); }
    if (email) {
      const emailExistsRs = await query({
          sql: 'SELECT id FROM usuarios WHERE email = ? AND id != ?',
          args: [email, targetUserId]
      });
      if (emailExistsRs.rows.length > 0) {
        return NextResponse.json({ message: 'El nuevo correo electrónico ya está en uso por otro usuario.' }, { status: 409 });
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updateFields.push('password_hash = ?');
      updateValues.push(password_hash);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    const sqlSetClause = updateFields.join(', ');
    updateValues.push(targetUserId);

    const resultRs = await query({
      sql: `UPDATE usuarios SET ${sqlSetClause} WHERE id = ?`,
      args: updateValues
    });

    if (resultRs.rowsAffected === 0) {
      return NextResponse.json({ message: `Usuario con ID ${targetUserId} no encontrado.` }, { status: 404 });
    }

    return NextResponse.json({ message: `Los detalles del usuario ID ${targetUserId} han sido actualizados por el administrador.` });

  } catch (error) {
    const typedError = error as { code?: string };
    console.error(`Error al actualizar detalles del usuario ID ${targetUserId}:`, error);
    if (typedError.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ message: 'El correo electrónico ya está en uso.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
