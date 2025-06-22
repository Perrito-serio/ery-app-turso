import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Necesitamos jsonwebtoken para firmar el token
import { z } from 'zod';

// Reutilizamos el esquema de validación y las interfaces de tu archivo de next-auth
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface AppUser {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  activo: boolean | number;
}
interface UserRole {
  nombre_rol: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedCredentials = loginSchema.safeParse(body);

    if (!parsedCredentials.success) {
      return NextResponse.json({ message: 'Email o contraseña inválidos' }, { status: 400 });
    }

    const { email, password } = parsedCredentials.data;

    // --- Lógica de validación copiada de tu función 'authorize' ---
    const rs = await query({
      sql: 'SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?',
      args: [email],
    });

    if (rs.rows.length === 0) {
      return NextResponse.json({ message: 'Credenciales incorrectas' }, { status: 401 });
    }

    const user = rs.rows[0] as unknown as AppUser;

    if (!user.activo) {
      return NextResponse.json({ message: 'La cuenta está desactivada' }, { status: 403 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales incorrectas' }, { status: 401 });
    }

    const rolesRs = await query({
      sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
      args: [user.id],
    });
    const userRoles = rolesRs.rows.map(r => (r as unknown as UserRole).nombre_rol);
    // --- Fin de la lógica de validación ---

    // Crear el payload del token (lo que irá dentro del JWT)
    const tokenPayload = {
      id: user.id,
      name: user.nombre,
      email: user.email,
      roles: userRoles,
      role: userRoles.length > 0 ? userRoles[0] : 'usuario_estandar',
    };
    
    // Firmar el token con el mismo secreto que usa next-auth
    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET!, {
      expiresIn: '30d', // Puedes ajustar la expiración
    });

    // Devolver una respuesta JSON clara con el token y los datos del usuario
    return NextResponse.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.nombre,
        email: user.email,
        roles: userRoles,
      },
    });

  } catch (error) {
    console.error('Error en /api/auth/token:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
