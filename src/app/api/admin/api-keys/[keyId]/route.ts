// src/app/api/admin/api-keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';

interface RouteContext {
  params: {
    keyId: string;
  };
}

/**
 * DELETE /api/admin/api-keys/[keyId]
 * Revoca (desactiva) una clave de API.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  // 1. Autenticación y Autorización (Solo Admins)
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const roleError = requireRoles(authResult.user, ['administrador']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  // 2. Validar el ID de la clave
  const { keyId } = params;
  const numericKeyId = parseInt(keyId, 10);
  if (isNaN(numericKeyId)) {
    return NextResponse.json({ message: 'ID de clave de API inválido.' }, { status: 400 });
  }

  try {
    // 3. Actualizar la Base de Datos para revocar la clave
    const result = await query({
      sql: 'UPDATE api_keys SET revokada = 1 WHERE id = ?',
      args: [numericKeyId],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ message: `Clave de API con ID ${numericKeyId} no encontrada.` }, { status: 404 });
    }

    // 4. Respuesta Exitosa
    return NextResponse.json({ message: `La clave de API con ID ${numericKeyId} ha sido revocada.` });

  } catch (error) {
    console.error(`Error al revocar la clave de API ID ${numericKeyId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al revocar la clave.' }, { status: 500 });
  }
}