// src/app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';

// Esquema de validación para el cuerpo de la petición
const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'El idToken de Google es requerido.'),
});

// Interfaces
interface AppUser {
  id: number;
  nombre: string;
  email: string;
}
interface UserRole {
  nombre_rol: string;
}

const client = new OAuth2Client();

export async function POST(request: NextRequest) {
  // Verificación de variables de entorno críticas
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_ID_ANDROID || !process.env.NEXTAUTH_SECRET) {
    console.error("Faltan variables de entorno críticas para la autenticación de Google.");
    return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validation = googleLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'El idToken es requerido.' }, { status: 400 });
    }

    const { idToken } = validation.data;

    // Verificar el idToken, aceptando el ID de la web Y el de android
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_CLIENT_ID, // El que ya existía para la web
          process.env.GOOGLE_CLIENT_ID_ANDROID // El nuevo para Flutter
        ],
      });
    } catch (error) {
      console.error('Error al verificar el idToken de Google:', error);
      return NextResponse.json({ message: 'El token de Google no es válido o ha expirado.' }, { status: 401 });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      return NextResponse.json({ message: 'No se pudo obtener la información del usuario desde Google.' }, { status: 400 });
    }

    const { email, name, picture } = payload;

    // Lógica para buscar o crear usuario (sin cambios)
    const userResult = await query({
      sql: 'SELECT id, nombre, email FROM usuarios WHERE email = ?',
      args: [email],
    });

    let user: AppUser;
    let isNewUser = false;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0] as unknown as AppUser;
    } else {
      isNewUser = true;
      const randomPassword = Math.random().toString(36).slice(-16);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const insertResult = await query({
        sql: 'INSERT INTO usuarios (nombre, email, password_hash, foto_perfil_url, estado) VALUES (?, ?, ?, ?, ?)',
        args: [name, email, passwordHash, picture ?? null, 'activo'],
      });
      if (!insertResult.lastInsertRowid) throw new Error('No se pudo crear el usuario.');
      const newUserId = Number(insertResult.lastInsertRowid);
      user = { id: newUserId, nombre: name, email: email };
      
      const roleResult = await query({ sql: 'SELECT id FROM roles WHERE nombre_rol = ?', args: ['usuario_estandar'] });
      if (roleResult.rows.length > 0) {
        const standardRoleId = (roleResult.rows[0] as any).id;
        await query({ sql: 'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)', args: [newUserId, standardRoleId] });
      }
    }

    // Lógica para generar el token JWT (sin cambios)
    const userRolesResult = await query({
      sql: 'SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?',
      args: [user.id],
    });
    const roles = userRolesResult.rows.map(r => (r as unknown as UserRole).nombre_rol);
    if (isNewUser && roles.length === 0) roles.push('usuario_estandar');

    const tokenPayload = {
      id: String(user.id),
      name: user.nombre,
      email: user.email,
      roles: roles,
      role: roles.length > 0 ? roles[0] : 'usuario_estandar',
    };
    const jwtToken = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      token: jwtToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        roles: roles,
      },
    });

  } catch (error) {
    console.error('Error en /api/auth/google:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}