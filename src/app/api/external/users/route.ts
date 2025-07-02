// src/app/api/external/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/apiKeyAuth';

interface ExternalUser {
  id: number;
  nombre: string;
  email: string;
  estado: string;
  fecha_creacion: string;
}

/**
 * GET /api/external/users
 * Endpoint para obtener lista de usuarios activos.
 * Este endpoint está protegido por API Key y está diseñado para ser consumido por n8n.
 */
export async function GET(request: NextRequest) {
  try {
    // Validar API Key
    const apiKeyValidation = await verifyApiKey(request);
    if (!apiKeyValidation.success) {
      return NextResponse.json(
        { error: apiKeyValidation.error || 'API Key inválida o faltante' },
        { status: apiKeyValidation.status || 401 }
      );
    }

    // Obtener parámetros opcionales
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'activo'; // Por defecto solo usuarios activos
    const limit = parseInt(searchParams.get('limit') || '0', 10); // 0 = sin límite

    // Construir consulta SQL
    let sql = `
      SELECT 
        id,
        nombre,
        email,
        estado,
        fecha_creacion
      FROM usuarios 
      WHERE estado = ?
      ORDER BY fecha_creacion DESC
    `;
    
    const args: (string | number)[] = [estado];
    
    // Agregar límite si se especifica
    if (limit > 0) {
      sql += ' LIMIT ?';
      args.push(limit);
    }

    // Ejecutar consulta
    const usersResult = await query({
      sql,
      args
    });

    const users = usersResult.rows as unknown as ExternalUser[];

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
      filters: {
        estado,
        limit: limit > 0 ? limit : 'sin_limite'
      }
    });

  } catch (error) {
    console.error('Error al obtener usuarios externos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}