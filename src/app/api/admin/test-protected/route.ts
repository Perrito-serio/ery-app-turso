// src/app/api/admin/test-protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils'; // 1. Usar la nueva utilidad de NextAuth.js

export async function GET(request: NextRequest) {
  // 2. Proteger la ruta con la nueva función. Ya no se pasa 'request'.
  const { session, errorResponse } = await verifyApiAuth(['administrador']);

  if (errorResponse) {
    return errorResponse; // Si hay error de autenticación/autorización, devolverlo
  }

  // 3. Acceder a la información del usuario a través del objeto 'session'
  return NextResponse.json({
    message: `Hola, Administrador ${session?.user?.name}! Has accedido a una ruta protegida.`,
    userId: session?.user?.id,
    userRoles: session?.user?.roles,
  });
}

// Podrías añadir POST, PUT, DELETE, etc., y protegerlos de la misma manera.
