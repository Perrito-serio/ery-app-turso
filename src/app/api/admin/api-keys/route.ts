// src/app/api/admin/api-keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { verifyApiToken } from '@/lib/apiTokenAuth';
import { query } from '@/lib/db';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

interface ApiKeyInfo {
  id: number;
  nombre: string;
  fecha_creacion: string;
  ultimo_uso: string | null;
}

/**
 * GET /api/admin/api-keys
 * Obtiene una lista de todas las claves de API (solo metadatos).
 */
export async function GET(request: NextRequest) {
  // 1. Autenticación Dual (API Key o JWT Token)
  const authHeader = request.headers.get('Authorization');
  let isAuthenticated = false;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Primero intentar con API Key
    const apiKeyResult = await verifyApiKey(request);
    if (apiKeyResult.success) {
      isAuthenticated = true;
      console.log('Solicitud autenticada con API Key.');
    } else {
      // Si falla API Key, intentar con JWT Token
      const jwtResult = await verifyApiToken(request);
      if (jwtResult.success) {
        // Verificar que el usuario tenga rol de administrador
        if (!jwtResult.user.roles?.includes('administrador') && jwtResult.user.role !== 'administrador') {
          return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de administrador.' }, { status: 403 });
        }
        isAuthenticated = true;
        console.log(`Usuario ${jwtResult.user.email} autenticado con JWT Token.`);
      }
    }
  }
  
  if (!isAuthenticated) {
    // Fallback a autenticación de sesión NextAuth
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    
    const roleError = requireRoles(authResult.user, ['administrador']);
    if (roleError) {
      return createAuthErrorResponse(roleError);
    }
  }

  try {
    // 2. Consulta a la Base de Datos
    const keysResult = await query({
      sql: 'SELECT id, nombre, fecha_creacion, ultimo_uso FROM api_keys WHERE revokada = 0 ORDER BY fecha_creacion DESC',
      args: [],
    });

    const apiKeys = keysResult.rows as unknown as ApiKeyInfo[];

    // 3. Respuesta Exitosa
    return NextResponse.json({ apiKeys });

  } catch (error) {
    console.error("Error al obtener las claves de API:", error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener las claves de API.' }, { status: 500 });
  }
}

const createApiKeySchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(50, "El nombre no puede exceder los 50 caracteres."),
});

/**
 * POST /api/admin/api-keys
 * Crea una nueva clave de API para un administrador.
 */
export async function POST(request: NextRequest) {
  // 1. Autenticación Dual (API Key o JWT Token)
  const authHeader = request.headers.get('Authorization');
  let isAuthenticated = false;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Primero intentar con API Key
    const apiKeyResult = await verifyApiKey(request);
    if (apiKeyResult.success) {
      isAuthenticated = true;
      console.log('Solicitud autenticada con API Key.');
    } else {
      // Si falla API Key, intentar con JWT Token
      const jwtResult = await verifyApiToken(request);
      if (jwtResult.success) {
        // Verificar que el usuario tenga rol de administrador
        if (!jwtResult.user.roles?.includes('administrador') && jwtResult.user.role !== 'administrador') {
          return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de administrador.' }, { status: 403 });
        }
        isAuthenticated = true;
        console.log(`Usuario ${jwtResult.user.email} autenticado con JWT Token.`);
      }
    }
  }
  
  if (!isAuthenticated) {
    // Fallback a autenticación de sesión NextAuth
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }
    
    const roleError = requireRoles(authResult.user, ['administrador']);
    if (roleError) {
      return createAuthErrorResponse(roleError);
    }
  }
   
   // Obtener el ID del usuario administrador (puede venir de JWT o sesión)
   let adminUserId: string;
   if (authHeader && authHeader.startsWith('Bearer ')) {
     const jwtResult = await verifyApiToken(request);
     if (jwtResult.success) {
       adminUserId = jwtResult.user.id;
     } else {
       // Si llegamos aquí, fue autenticado con API Key, usar un ID genérico
       adminUserId = 'system';
     }
   } else {
     // Autenticación de sesión
     const authResult = await getAuthenticatedUser(request);
     adminUserId = authResult.success ? authResult.user.id : 'unknown';
   }

  // 2. Validación del Body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  const validation = createApiKeySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ 
      message: "Datos de entrada inválidos.", 
      errors: validation.error.flatten().fieldErrors 
    }, { status: 400 });
  }
  const { nombre } = validation.data;

  // 3. Generación de la Clave y Hash
  const apiKey = randomBytes(24).toString('hex'); // Genera una clave segura de 48 caracteres
  const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

  try {
    // 4. Inserción en la Base de Datos
    await query({
      sql: 'INSERT INTO api_keys (key_hash, nombre, usuario_id) VALUES (?, ?, ?)',
      args: [apiKeyHash, nombre, adminUserId],
    });

    // 5. Respuesta Exitosa
    // IMPORTANTE: Esta es la única vez que se muestra la clave en texto plano.
    return NextResponse.json({
      message: `Clave de API '${nombre}' creada exitosamente. Guárdala en un lugar seguro, no podrás verla de nuevo.`,
      apiKey: apiKey, // Devolver la clave para que el admin la copie
    }, { status: 201 });

  } catch (error) {
    const typedError = error as { code?: string };
    console.error("Error al crear la clave de API:", error);
    // Manejar posible colisión de hash (extremadamente improbable)
    if (typedError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return NextResponse.json({ message: 'Error al generar la clave, por favor inténtalo de nuevo.' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al crear la clave de API.' }, { status: 500 });
  }
}