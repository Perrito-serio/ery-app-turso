// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

// --- Interfaces (sin cambios) ---
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
interface RoleId {
  id: number;
}

// --- Aumentación de Tipos (sin cambios) ---
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: { id?: number; roles?: string[]; } & DefaultSession["user"];
  }
  interface User { id?: number; roles?: string[]; }
}
declare module "next-auth/jwt" {
  interface JWT { id?: number; roles?: string[]; }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
        name: 'Credentials',
        credentials: { email: { label: "Email", type: "text" }, password: { label: "Password", type: "password" } },
        async authorize(credentials) {
          const parsedCredentials = loginSchema.safeParse(credentials);
          if (!parsedCredentials.success) { return null; }
          
          const { email, password } = parsedCredentials.data;
          
          const rs = await query({ 
            sql: 'SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?', 
            args: [email] 
          });

          if (rs.rows.length === 0) { return null; }
          
          const user = rs.rows[0] as unknown as AppUser;
          
          if (!user.activo) { throw new Error("account_disabled"); }
          
          const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
          if (!isPasswordMatch) { return null; }
          
          return { id: user.id, name: user.nombre, email: user.email };
        }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          const rs = await query({ sql: "SELECT id FROM usuarios WHERE email = ?", args: [profile.email] });

          if (rs.rows.length > 0) {
            user.id = (rs.rows[0] as unknown as AppUser).id;
            return true;
          }

          const randomPassword = crypto.randomBytes(32).toString('hex');
          const password_hash = await bcrypt.hash(randomPassword, 10);
          const insertRs = await query({
            sql: "INSERT INTO usuarios (email, nombre, password_hash, foto_perfil_url, activo) VALUES (?, ?, ?, ?, ?)",
            args: [profile.email, profile.name || profile.email.split('@')[0], password_hash, (profile as any).picture || null, 1]
          });

          if (insertRs.rowsAffected === 1 && insertRs.lastInsertRowid) {
            const newUserId = Number(insertRs.lastInsertRowid);
            user.id = newUserId;
            
            const roleRs = await query({sql: "SELECT id FROM roles WHERE nombre_rol = 'usuario_estandar' LIMIT 1"});
            if (roleRs.rows.length > 0) {
                const standardRoleId = (roleRs.rows[0] as unknown as RoleId).id;
                await query({
                  sql: "INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)",
                  args: [newUserId, standardRoleId]
                });
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error en callback signIn de Google:", error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user, trigger }) {
      // Si es un inicio de sesión, asignamos el ID del usuario al token
      if (user) {
        token.id = user.id;
      }

      // **CORRECCIÓN CLAVE**: Si el token tiene un ID pero no tiene roles, 
      // o si la sesión se está actualizando, forzamos la recarga de roles.
      // Esto asegura que el rol recién asignado se incluya inmediatamente.
      if (token.id && (!token.roles || trigger === 'update')) {
          try {
            const rolesRs = await query({
                sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
                args: [token.id]
            });
            token.roles = rolesRs.rows.map(r => (r as unknown as UserRole).nombre_rol);
          } catch (error) {
            console.error("Error recargando roles para el token JWT:", error);
            token.roles = []; // Dejar los roles vacíos en caso de error
          }
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
        session.user.roles = token.roles;
        session.user.name = token.name;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
