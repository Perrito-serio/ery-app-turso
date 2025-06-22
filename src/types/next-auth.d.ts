import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
      roles?: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string;
    role: string;
    roles?: string[];
  }
}