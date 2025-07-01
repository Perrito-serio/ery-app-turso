// src/app/api/admin/achievements/criteria/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';

// GET /api/admin/achievements/criteria - Obtiene todos los criterios de logros disponibles
export async function GET(request: NextRequest) {
  // 1. Autenticación y Autorización
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const roleError = requireRoles(authResult.user, ['administrador', 'moderador_contenido']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  try {
    // 2. Consulta a la base de datos
    const criteriaResult = await query({
      sql: 'SELECT id, criterio_codigo, descripcion FROM logros_criterios ORDER BY id',
    });

    // 3. Devolver los criterios
    return NextResponse.json({ criteria: criteriaResult.rows });

  } catch (error) {
    console.error("Error al obtener los criterios de logros:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
