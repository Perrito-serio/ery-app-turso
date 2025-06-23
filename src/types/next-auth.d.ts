import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// Extiende los tipos por defecto de NextAuth para incluir nuestras propiedades custom.
declare module "next-auth" {
  /**
   * Extiende el objeto Session por defecto para incluir `id`, `roles`, y `role`.
   */
  interface Session extends DefaultSession {
    accessToken?: string; // Para el token de móvil
    user: {
      id: string; // ID de usuario unificado a string
      role: string;
      roles?: string[];
    } & DefaultSession["user"]; // Mantiene las propiedades por defecto (name, email, image)
  }

  /**
   * Extiende el objeto User por defecto.
   */
  interface User extends DefaultUser {
    id: string; // ID de usuario unificado a string
    role: string;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extiende el token JWT para incluir nuestro `id`, `roles` y `role`.
   */
  interface JWT {
    id: string; // ID de usuario unificado a string
    role: string;
    roles?: string[];
  }
}