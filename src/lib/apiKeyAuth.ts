// src/lib/apiKeyAuth.ts
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createHash } from 'crypto';

interface AuthResult {
  success: boolean;
  error?: string;
  status?: number;
}

/**
 * Verifica una clave de API (API Key) proporcionada en la cabecera Authorization.
 * @param request The NextRequest object.
 * @returns Promise with authentication result.
 */
export async function verifyApiKey(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No se encontró la clave de API en la cabecera Authorization.',
        status: 401,
      };
    }

    const apiKey = authHeader.substring(7); // Quita el prefijo "Bearer "
    if (!apiKey) {
      return { success: false, error: 'La clave de API no puede estar vacía.', status: 401 };
    }

    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const keyResult = await query({
      sql: 'SELECT id, ultimo_uso, revokada FROM api_keys WHERE key_hash = ?',
      args: [apiKeyHash],
    });

    if (keyResult.rows.length === 0) {
      return { success: false, error: 'Clave de API inválida.', status: 401 };
    }

    const keyData = keyResult.rows[0] as unknown as { id: number; ultimo_uso: string | null; revokada: number };

    if (keyData.revokada) {
      return { success: false, error: 'La clave de API ha sido revocada.', status: 403 };
    }

    // Actualizar la fecha de último uso (sin esperar a que termine)
    query({
      sql: 'UPDATE api_keys SET ultimo_uso = CURRENT_TIMESTAMP WHERE id = ?',
      args: [keyData.id],
    }).catch(console.error);

    return { success: true };

  } catch (error) {
    console.error('Error en la verificación de API Key:', error);
    return {
      success: false,
      error: 'Fallo en la autenticación de la clave de API.',
      status: 500,
    };
  }
}