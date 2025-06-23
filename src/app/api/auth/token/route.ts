import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

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

    // --- CORRECCIÓN: Limpiar los datos de entrada ---
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Usamos las variables limpias para la consulta
    const rs = await query({
      sql: 'SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?',
      args: [trimmedEmail],
    });

    if (rs.rows.length === 0) {
      return NextResponse.json({ message: 'Credenciales incorrectas' }, { status: 401 });
    }

    const user = rs.rows[0] as unknown as AppUser;

    if (!user.activo) {
      return NextResponse.json({ message: 'La cuenta está desactivada' }, { status: 403 });
    }

    // Usamos la variable limpia para la comparación
    const isPasswordMatch = await bcrypt.compare(trimmedPassword, user.password_hash);
    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales incorrectas' }, { status: 401 });
    }

    const rolesRs = await query({
      sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
      args: [user.id],
    });
    const userRoles = rolesRs.rows.map(r => (r as unknown as UserRole).nombre_rol);

    const tokenPayload = {
      id: String(user.id),
      name: user.nombre,
      email: user.email,
      roles: userRoles,
      role: userRoles.length > 0 ? userRoles[0] : 'usuario_estandar',
    };
    
    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET!, {
      expiresIn: '30d',
    });

    return NextResponse.json({
      success: true,
      token: token,
      user: {
        id: String(user.id),
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
