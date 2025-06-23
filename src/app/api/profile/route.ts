// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Esquema de validación con Zod (sin cambios)
const updateProfileSchema = z.object({
  nombre: z.string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, { message: "El nombre solo puede contener letras y espacios." })
    .optional(),
  contraseñaActual: z.string().optional(),
  nuevaContraseña: z.string()
    .min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." })
    .optional()
    .or(z.literal('')),
  confirmarNuevaContraseña: z.string().optional(),
})
.partial()
.refine(data => {
    if (data.nuevaContraseña && !data.contraseñaActual) {
        return false;
    }
    return true;
}, {
    message: "Se requiere la contraseña actual para establecer una nueva.",
    path: ["contraseñaActual"],
})
.refine(data => {
    if (data.nuevaContraseña && data.nuevaContraseña !== data.confirmarNuevaContraseña) {
        return false;
    }
    return true;
}, {
    message: "La nueva contraseña y su confirmación no coinciden.",
    path: ["confirmarNuevaContraseña"],
})
.refine(data => {
    return !!data.nombre || !!data.nuevaContraseña;
}, {
    message: "Se debe proporcionar un nombre o una nueva contraseña para actualizar.",
});


export async function PUT(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }

  const userId = authResult.user.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }
  
  const { nombre, contraseñaActual, nuevaContraseña } = validation.data;

  try {
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    // Lógica para cambio de contraseña
    if (nuevaContraseña && contraseñaActual) {
      const userRs = await query({
        sql: 'SELECT password_hash FROM usuarios WHERE id = ?',
        args: [parseInt(userId, 10)]
      });
      if (userRs.rows.length === 0) {
        return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
      }
      const currentPasswordHash = (userRs.rows[0] as any).password_hash;
      
      const isPasswordMatch = await bcrypt.compare(contraseñaActual, currentPasswordHash);
      if (!isPasswordMatch) {
        return NextResponse.json({ message: 'La contraseña actual es incorrecta.' }, { status: 403 });
      }

      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(nuevaContraseña, salt);
      updateFields.push('password_hash = ?');
      updateValues.push(newPasswordHash);
    }

    // Lógica para cambio de nombre
    if (nombre) {
      updateFields.push('nombre = ?');
      updateValues.push(nombre);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No se proporcionaron campos válidos para actualizar.' }, { status: 400 });
    }

    const sqlSetClause = updateFields.join(', ');
    updateValues.push(parseInt(userId, 10));

    await query({
      sql: `UPDATE usuarios SET ${sqlSetClause} WHERE id = ?`,
      args: updateValues
    });

    return NextResponse.json({ message: "Tu perfil ha sido actualizado exitosamente." });

  } catch (error) {
    console.error(`Error al actualizar el perfil del usuario ID ${userId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al actualizar el perfil.' }, { status: 500 });
  }
}
