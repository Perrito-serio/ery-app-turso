// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

// --- INTERFAZ ACTUALIZADA ---
// Refleja la nueva estructura de la tabla usuarios
interface AppUser {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  estado: 'activo' | 'suspendido' | 'baneado' | 'inactivo';
  suspension_fin: string | null;
}
interface UserRole {
  nombre_rol: string;
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
          
          // --- CONSULTA CORREGIDA ---
          // Se selecciona 'estado' y 'suspension_fin' en lugar de 'activo'
          const rs = await query({ 
            sql: 'SELECT id, email, nombre, password_hash, estado, suspension_fin FROM usuarios WHERE email = ?', 
            args: [email] 
          });

          if (rs.rows.length === 0) { return null; }
          
          const user = rs.rows[0] as unknown as AppUser;
          
          // --- LÓGICA DE ESTADO ACTUALIZADA ---
          // Verificar si la cuenta está baneada o inactiva
          if (user.estado === 'baneado' || user.estado === 'inactivo') {
            throw new Error("account_disabled");
          }

          // Verificar si la cuenta está suspendida y si la suspensión aún está vigente
          if (user.estado === 'suspendido' && user.suspension_fin) {
            if (new Date() < new Date(user.suspension_fin)) {
              throw new Error(`account_suspended:${user.suspension_fin}`);
            }
          }
          
          const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
          if (!isPasswordMatch) { return null; }
          
          const rolesRs = await query({
            sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
            args: [user.id]
          });
          const userRoles = rolesRs.rows.map(r => (r as unknown as UserRole).nombre_rol);
          
          return { 
            id: String(user.id),
            name: user.nombre, 
            email: user.email,
            role: userRoles.length > 0 ? userRoles[0] : 'usuario_estandar',
            roles: userRoles
          };
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
            user.id = String((rs.rows[0] as unknown as { id: number }).id);
            return true;
          }

          const randomPassword = crypto.randomBytes(32).toString('hex');
          const password_hash = await bcrypt.hash(randomPassword, 10);
          
          // --- INSERT CORREGIDO ---
          // Se elimina la columna 'activo' de la inserción
          const insertRs = await query({
            sql: "INSERT INTO usuarios (email, nombre, password_hash, foto_perfil_url) VALUES (?, ?, ?, ?)",
            args: [profile.email, profile.name || profile.email.split('@')[0], password_hash, (profile as any).picture || null]
          });

          if (insertRs.rowsAffected === 1 && insertRs.lastInsertRowid) {
            const newUserId = Number(insertRs.lastInsertRowid);
            user.id = String(newUserId);
            
            const roleRs = await query({sql: "SELECT id FROM roles WHERE nombre_rol = 'usuario_estandar' LIMIT 1"});
            if (roleRs.rows.length > 0) {
                const standardRoleId = (roleRs.rows[0] as unknown as { id: number }).id;
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
      if (user) {
        token.id = String(user.id);
        token.role = user.role;
        token.roles = user.roles;
      }
      if (token.id && (!token.roles || trigger === 'update')) {
          try {
            const rolesRs = await query({
                sql: `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
                args: [token.id]
            });
            const userRoles = rolesRs.rows.map(r => (r as unknown as UserRole).nombre_rol);
            token.roles = userRoles;
            token.role = userRoles.length > 0 ? userRoles[0] : 'usuario_estandar';
          } catch (error) {
            console.error("Error recargando roles para el token JWT:", error);
            token.roles = [];
            token.role = 'usuario_estandar';
          }
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id; 
        session.user.roles = token.roles;
        session.user.role = token.role;
        session.user.name = token.name;
        session.accessToken = token as any;
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
