// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  nombre: z.string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .max(100, { message: "El nombre no puede exceder los 100 caracteres." })
    .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, { message: "El nombre solo puede contener letras y espacios." }),
  apellido: z.string()
    .max(100)
    .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/, { message: "El apellido solo puede contener letras y espacios." })
    .optional()
    .or(z.literal('')),
  email: z.string().email({ message: "Formato de correo electrónico inválido." }),
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
  fecha_nacimiento: z.string().optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  direccion: z.string().max(255).optional().or(z.literal('')),
  ciudad: z.string().max(100).optional().or(z.literal('')),
  pais: z.string().max(100).optional().or(z.literal('')),
});

interface ExistingUser {
  id: number;
}
interface RoleId {
    id: number;
}

export async function POST(request: NextRequest) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  const validation = registerSchema.safeParse(requestBody);

  if (!validation.success) {
    return NextResponse.json(
      { 
        message: "Datos de entrada inválidos.",
        errors: validation.error.flatten().fieldErrors 
      }, 
      { status: 400 }
    );
  }

  const { nombre, apellido, email, password, fecha_nacimiento, telefono, direccion, ciudad, pais } = validation.data;
  const trimmedNombre = nombre.trim();
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  try {
    const existingUserRs = await query({
        sql: 'SELECT id FROM usuarios WHERE email = ?',
        args: [trimmedEmail]
    });
    if (existingUserRs.rows.length > 0) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(trimmedPassword, salt);

    // --- CONSULTA CORREGIDA ---
    // Se ha eliminado la columna 'activo' de la sentencia INSERT.
    // La columna 'estado' tomará su valor por defecto ('activo').
    const result = await query({
        sql: `
          INSERT INTO usuarios (nombre, apellido, email, password_hash, fecha_nacimiento, telefono, direccion, ciudad, pais)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
            trimmedNombre, 
            apellido || null, 
            trimmedEmail, 
            password_hash, 
            fecha_nacimiento || null, 
            telefono || null, 
            direccion || null, 
            ciudad || null, 
            pais || null,
        ]
    });

    if (result.rowsAffected === 1 && result.lastInsertRowid) {
      const newUserId = Number(result.lastInsertRowid);
      console.log(`Nuevo usuario creado con Email. ID: ${newUserId}`);

      try {
        const roleRs = await query({sql: "SELECT id FROM roles WHERE nombre_rol = 'usuario_estandar' LIMIT 1"});
        
        if (roleRs.rows.length > 0) {
          const standardRoleId = (roleRs.rows[0] as unknown as RoleId).id;
          await query({
              sql: "INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)",
              args: [newUserId, standardRoleId]
            });
          console.log(`Rol 'usuario_estandar' asignado al nuevo usuario ID: ${newUserId}`);
        } else {
          console.warn("ADVERTENCIA: No se encontró el rol 'usuario_estandar'. El nuevo usuario no tendrá roles por defecto.");
        }
      } catch (roleError) {
        console.error(`Error al asignar rol por defecto al usuario ID ${newUserId}:`, roleError);
      }

      const newUser = {
        id: String(newUserId),
        nombre: trimmedNombre,
        email: trimmedEmail,
      };
      return NextResponse.json({ message: 'Usuario registrado exitosamente.', user: newUser }, { status: 201 });
    } else {
      console.error('Fallo al insertar usuario, resultado:', result);
      return NextResponse.json({ message: 'Error al registrar el usuario.' }, { status: 500 });
    }

  } catch (error) {
    const typedError = error as { message?: string; code?: string; };
    console.error('Error en /api/auth/register:', error);
    if (typedError.code === 'SQLITE_CONSTRAINT') {
        return NextResponse.json({ message: 'El correo electrónico ya está registrado (error de BD).' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: typedError.message }, { status: 500 });
  }
}
