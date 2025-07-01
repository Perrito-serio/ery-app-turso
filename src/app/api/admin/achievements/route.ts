// src/app/api/admin/achievements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse, requireRoles } from '@/lib/mobileAuthUtils';
import { z } from 'zod';

// Esquema de Zod para validar los datos de un nuevo logro.
const createAchievementSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  icono_url: z.string().url("Debe ser una URL válida.").optional().nullable(),
  criterio_id: z.number().int().positive("Se debe seleccionar un criterio válido."),
  valor_criterio: z.number().int().positive("El valor del criterio debe ser un número positivo."),
});

// GET /api/admin/achievements - Obtener todos los logros para el panel de gestión
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
    const achievementsResult = await query({
      sql: `
        SELECT l.*, lc.criterio_codigo, lc.descripcion as criterio_descripcion
        FROM logros l
        JOIN logros_criterios lc ON l.criterio_id = lc.id
        ORDER BY l.id DESC
      `,
    });

    // 3. Devolver los logros
    return NextResponse.json({ achievements: achievementsResult.rows });

  } catch (error) {
    console.error("Error al obtener los logros:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}


// POST /api/admin/achievements - Crear un nuevo logro
export async function POST(request: NextRequest) {
  // 1. Autenticación y Autorización
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }
  const roleError = requireRoles(authResult.user, ['administrador', 'moderador_contenido']);
  if (roleError) {
    return createAuthErrorResponse(roleError);
  }

  // 2. Validación del cuerpo de la solicitud
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  const validation = createAchievementSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      message: "Datos de entrada inválidos.",
      errors: validation.error.flatten().fieldErrors
    }, { status: 400 });
  }

  const { nombre, descripcion, icono_url, criterio_id, valor_criterio } = validation.data;

  try {
    // 3. Inserción en la base de datos
    const result = await query({
      sql: `
        INSERT INTO logros (nombre, descripcion, icono_url, criterio_id, valor_criterio)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [nombre, descripcion, icono_url || null, criterio_id, valor_criterio],
    });

    if (result.rowsAffected === 1 && result.lastInsertRowid) {
      const newAchievementId = Number(result.lastInsertRowid);
      
      // Devolver el logro recién creado para actualizar la UI si es necesario
      const newAchievementResult = await query({
        sql: "SELECT * FROM logros WHERE id = ?",
        args: [newAchievementId]
      });
      
      return NextResponse.json({
        message: "Logro creado exitosamente.",
        achievement: newAchievementResult.rows[0]
      }, { status: 201 });
    }

    return NextResponse.json({ message: "No se pudo crear el logro." }, { status: 500 });

  } catch (error) {
    console.error("Error al crear el logro:", error);
    // Manejar errores de restricción única si, por ejemplo, el nombre del logro debe ser único
    const typedError = error as { code?: string };
    if (typedError.code === 'SQLITE_CONSTRAINT') {
        return NextResponse.json({ message: 'Ya existe un logro con características similares.' }, { status: 409 });
    }
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
