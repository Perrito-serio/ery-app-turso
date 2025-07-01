// src/app/api/locations/cities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

// Esquema para validar que el countryId sea un número válido.
const schema = z.object({
  countryId: z.coerce.number().int().positive(),
});

/**
 * GET /api/locations/cities?countryId=X
 * Obtiene una lista de ciudades para un país específico.
 * No requiere autenticación.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const validation = schema.safeParse({
    countryId: searchParams.get('countryId'),
  });

  if (!validation.success) {
    return NextResponse.json({ message: 'Se requiere un ID de país válido.' }, { status: 400 });
  }

  const { countryId } = validation.data;

  try {
    const citiesResult = await query({
      sql: 'SELECT id, nombre FROM ciudades WHERE pais_id = ? ORDER BY nombre ASC',
      args: [countryId],
    });

    return NextResponse.json({ cities: citiesResult.rows });

  } catch (error) {
    console.error(`Error al obtener las ciudades para el país ID ${countryId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
