// src/app/api/admin/test-protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    // Verificar autorización
    const roleError = requireRoles(authResult.user, ['administrador']);
    if (roleError) {
      return createAuthErrorResponse(roleError);
    }

    return NextResponse.json({
      message: 'Acceso autorizado al endpoint protegido',
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        role: authResult.user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Podrías añadir POST, PUT, DELETE, etc., y protegerlos de la misma manera.
